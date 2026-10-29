import { ImprovementCandidate } from './SelfImprovementManager';
import { SelfLearningEngine } from './learning/SelfLearningEngine';
import { MemoryEngine } from './memory/MemoryEngine';

// ── 型定義 ──────────────────────────────────────────────────────────────

/**
 * 実行前スナップショット
 */
export interface ExecutionSnapshot {
  candidateId: string;
  userId: string;
  takenAt: number;
  state: Record<string, unknown>;
}

/**
 * 実行結果ステータス
 */
export type ExecutionStatus = 'success' | 'failure' | 'rolled_back' | 'skipped';

/**
 * 一候補の実行結果
 */
export interface ExecutionResult {
  candidateId: string;
  userId: string;
  status: ExecutionStatus;
  /** 実行にかかった時間 (ms) */
  durationMs: number;
  /** 失敗時の理由 */
  failureReason?: string;
  /** ロールバック済みかどうか */
  rolledBack: boolean;
  executedAt: number;
}

/**
 * バッチ実行のサマリー
 */
export interface ExecutionBatchSummary {
  userId: string;
  total: number;
  succeeded: number;
  failed: number;
  rolledBack: number;
  skipped: number;
  results: ExecutionResult[];
  executedAt: number;
}

// ── ImprovementExecutor ──────────────────────────────────────────────────

/**
 * ImprovementExecutor
 *
 * SelfImprovementManager が生成した改善候補を安全に実行する。
 *
 * 処理フロー（1候補あたり）:
 *   1. 実行前の状態を MemoryEngine にスナップショット保存
 *   2. 改善処理をシミュレーション実行（設定パラメータ調整相当）
 *   3. 成功 → 結果を MemoryEngine / SelfLearningEngine に保存
 *   4. 失敗 → スナップショットからロールバック
 *
 * 制約:
 *   - 完全ローカル動作（外部API不使用）
 *   - 危険な自動コード変更は行わない
 *   - 新規依存パッケージなし
 */
export class ImprovementExecutor {
  private static instance: ImprovementExecutor;
  private learningEngine: SelfLearningEngine;
  private memoryEngine: MemoryEngine;
  /** 実行履歴 */
  private executionHistory: ExecutionResult[];
  /** スナップショットストア */
  private snapshots: Map<string, ExecutionSnapshot>;

  private constructor() {
    this.learningEngine = SelfLearningEngine.getInstance();
    this.memoryEngine = MemoryEngine.getInstance();
    this.executionHistory = [];
    this.snapshots = new Map();
  }

  public static getInstance(): ImprovementExecutor {
    if (!ImprovementExecutor.instance) {
      ImprovementExecutor.instance = new ImprovementExecutor();
    }
    return ImprovementExecutor.instance;
  }

  // ── 公開API ─────────────────────────────────────────────────────────────

  /**
   * 単一候補を実行する
   */
  public async execute(
    userId: string,
    candidate: ImprovementCandidate
  ): Promise<ExecutionResult> {
    const startedAt = Date.now();

    // Step 1: 実行前スナップショット保存
    const snapshot = await this.takeSnapshot(userId, candidate);

    let status: ExecutionStatus = 'failure';
    let failureReason: string | undefined;
    let rolledBack = false;

    try {
      // Step 2: 改善処理のシミュレーション実行
      await this.simulateImprovement(userId, candidate);
      status = 'success';
    } catch (err) {
      // Step 3: 失敗時はロールバック
      failureReason = err instanceof Error ? err.message : String(err);
      try {
        await this.rollback(userId, candidate, snapshot);
        rolledBack = true;
        status = 'rolled_back';
      } catch (rollbackError) {
        status = 'failure';
        failureReason = `${failureReason}; rollback failed: ${String(rollbackError)}`;
      }
    }

    const result: ExecutionResult = {
      candidateId: candidate.id,
      userId,
      status,
      durationMs: Date.now() - startedAt,
      failureReason,
      rolledBack,
      executedAt: startedAt,
    };

    // Step 4: 結果を保存
    await this.saveResult(userId, candidate, result);

    this.executionHistory.push(result);
    return result;
  }

  /**
   * 複数候補をまとめて実行する（バッチ）
   */
  public async executeBatch(
    userId: string,
    candidates: ImprovementCandidate[]
  ): Promise<ExecutionBatchSummary> {
    const results: ExecutionResult[] = [];

    for (const candidate of candidates) {
      const result = await this.execute(userId, candidate);
      results.push(result);
    }

    const summary: ExecutionBatchSummary = {
      userId,
      total: results.length,
      succeeded: results.filter((r) => r.status === 'success').length,
      failed: results.filter((r) => r.status === 'failure').length,
      rolledBack: results.filter((r) => r.rolledBack).length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      results,
      executedAt: Date.now(),
    };

    // バッチサマリーをメモリに保存
    const batchKey = `execution_batch_${userId}_${summary.executedAt}`;
    this.memoryEngine.setMemory(userId, batchKey, summary);

    return summary;
  }

  /**
   * 実行履歴を取得
   */
  public getExecutionHistory(userId: string, limit = 50): ExecutionResult[] {
    const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : 50;
    if (safeLimit === 0) return [];
    return this.executionHistory
      .filter((r) => r.userId === userId)
      .slice(-safeLimit);
  }

  /**
   * スナップショットを取得
   */
  public getSnapshot(candidateId: string): ExecutionSnapshot | undefined {
    return this.snapshots.get(candidateId);
  }

  /**
   * 統計情報
   */
  public getStats(userId: string): {
    totalExecuted: number;
    successCount: number;
    failureCount: number;
    rollbackCount: number;
    successRate: number;
  } {
    const history = this.executionHistory.filter((r) => r.userId === userId);
    const successCount = history.filter((r) => r.status === 'success').length;
    const failureCount = history.filter(
      (r) => r.status === 'failure' || r.status === 'rolled_back'
    ).length;
    const rollbackCount = history.filter((r) => r.rolledBack).length;
    const total = history.length;

    return {
      totalExecuted: total,
      successCount,
      failureCount,
      rollbackCount,
      successRate: total === 0 ? 0 : Math.round((successCount / total) * 100),
    };
  }

  /** テスト用: 全データクリア */
  public clearAllData(): void {
    this.executionHistory = [];
    this.snapshots.clear();
  }

  // ── プライベート実装 ──────────────────────────────────────────────────────

  /**
   * 実行前の状態スナップショットを作成して保存
   */
  private async takeSnapshot(
    userId: string,
    candidate: ImprovementCandidate
  ): Promise<ExecutionSnapshot> {
    const snapshot: ExecutionSnapshot = {
      candidateId: candidate.id,
      userId,
      takenAt: Date.now(),
      state: {
        candidateTitle: candidate.title,
        candidatePriority: candidate.priority,
        candidateSource: candidate.source,
        estimatedImpact: candidate.estimatedImpact,
      },
    };

    this.snapshots.set(candidate.id, snapshot);
    this.memoryEngine.setMemory(userId, `snapshot_${candidate.id}`, snapshot);

    return snapshot;
  }

  /**
   * 改善処理のシミュレーション
   *
   * ポリシー:
   *   - 実際のコード書き換えは行わない（安全保証）
   *   - 優先度・ソースに応じた改善効果をパラメータとして記録する
   *   - 「critical」かつ impact>70 の組み合わせは過剰リスクとして例外を投げる
   *     （ロールバック経路のテスト用ルールとしても機能する）
   */
  private async simulateImprovement(
    userId: string,
    candidate: ImprovementCandidate
  ): Promise<void> {
    // 過剰リスク候補は実行を拒否してロールバックをトリガー
    if (candidate.priority === 'critical' && candidate.estimatedImpact > 70) {
      throw new Error(
        `Execution rejected: candidate "${candidate.id}" has critical priority ` +
          `with high impact (${candidate.estimatedImpact}). Manual review required.`
      );
    }

    // 改善パラメータを計算（設定最適化のシミュレーション）
    const improvementParams: Record<string, unknown> = {
      candidateId: candidate.id,
      source: candidate.source,
      priority: candidate.priority,
      estimatedImpact: candidate.estimatedImpact,
      appliedAt: Date.now(),
      // 優先度別の調整値（実際のコード変更なし）
      adjustmentFactor:
        candidate.priority === 'high'
          ? 1.2
          : candidate.priority === 'medium'
            ? 1.1
            : 1.0,
    };

    // 改善パラメータをメモリに記録
    this.memoryEngine.setMemory(
      userId,
      `improvement_params_${candidate.id}`,
      improvementParams
    );
  }

  /**
   * スナップショットを使ってロールバック
   */
  private async rollback(
    userId: string,
    candidate: ImprovementCandidate,
    snapshot: ExecutionSnapshot
  ): Promise<void> {
    // 適用されたパラメータを削除してスナップショット状態を復元
    this.memoryEngine.deleteMemory(userId, `improvement_params_${candidate.id}`);

    // ロールバック記録をメモリに保存
    this.memoryEngine.setMemory(userId, `rollback_${candidate.id}`, {
      candidateId: candidate.id,
      rolledBackAt: Date.now(),
      restoredFrom: snapshot.takenAt,
    });
  }

  /**
   * 実行結果を MemoryEngine と SelfLearningEngine に保存
   */
  private async saveResult(
    userId: string,
    candidate: ImprovementCandidate,
    result: ExecutionResult
  ): Promise<void> {
    // MemoryEngine に保存
    this.memoryEngine.setMemory(
      userId,
      `execution_result_${candidate.id}`,
      result
    );

    // SelfLearningEngine に学習データとして記録
    // （学習サイクルが起動済みかどうかに依存しないよう try/catch で保護）
    try {
      const cycles = await this.learningEngine.getAllLearningCycles(userId);
      const activeCycle = cycles.find((c) => c.status === 'running' as any);

      if (activeCycle) {
        await this.learningEngine.recordDataPoint(
          userId,
          activeCycle.id,
          { candidateId: candidate.id, title: candidate.title, source: candidate.source },
          { status: result.status, durationMs: result.durationMs, rolledBack: result.rolledBack },
          result.status === 'success' ? 'success' : 'failure',
          result.durationMs,
          { priority: candidate.priority, estimatedImpact: candidate.estimatedImpact }
        );
      }
    } catch {
      // 学習サイクルが存在しない場合はスキップ（実行自体は成功）
    }
  }
}
