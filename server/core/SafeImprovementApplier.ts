import { ImprovementCandidate } from './SelfImprovementManager';
import { SelfLearningEngine } from './learning/SelfLearningEngine';
import { MemoryEngine } from './memory/MemoryEngine';

// ── 許可リスト型 ──────────────────────────────────────────────────────────

/**
 * 安全な変更対象のカテゴリ
 *
 * - 'config'   : 自己改善用の設定値（数値・文字列パラメータ）
 * - 'rule'     : 自己改善ルール（フィルタ条件・しきい値）
 * - 'prompt'   : プロンプト設定（テキスト定義）
 * - 'param'    : その他、明示的に許可登録されたパラメータ
 */
export type TargetCategory = 'config' | 'rule' | 'prompt' | 'param';

/**
 * SafeImprovementTarget — 許可された変更対象の定義
 */
export interface SafeImprovementTarget {
  /** 一意キー（例: "self_improvement.threshold" ） */
  key: string;
  category: TargetCategory;
  description: string;
  /** 現在の値 */
  currentValue: unknown;
  /** 許可される値の型 */
  allowedType: 'number' | 'string' | 'boolean';
  /** 数値の場合の最小値 */
  minValue?: number;
  /** 数値の場合の最大値 */
  maxValue?: number;
  /** 文字列の場合の最大長 */
  maxLength?: number;
}

// ── 適用結果型 ────────────────────────────────────────────────────────────

/**
 * 実際の変更適用ステータス
 *
 * - 'applied'      : 変更が確定された
 * - 'rolled_back'  : テスト失敗により元の値に戻した
 * - 'rejected'     : 許可リスト未登録 or バリデーション失敗で実行しなかった
 * - 'rollback_failed' : ロールバック自体が失敗した（安全記録のみ行う）
 */
export type ApplyStatus = 'applied' | 'rolled_back' | 'rejected' | 'rollback_failed';

/**
 * 一変更の適用結果
 */
export interface ApplyResult {
  targetKey: string;
  candidateId: string;
  userId: string;
  status: ApplyStatus;
  previousValue: unknown;
  newValue: unknown;
  /** 失敗・拒否理由 */
  reason?: string;
  durationMs: number;
  appliedAt: number;
}

/**
 * バッチ適用サマリー
 */
export interface ApplyBatchSummary {
  userId: string;
  total: number;
  applied: number;
  rolledBack: number;
  rejected: number;
  rollbackFailed: number;
  results: ApplyResult[];
  executedAt: number;
}

// ── SafeImprovementApplier ────────────────────────────────────────────────

/**
 * SafeImprovementApplier
 *
 * 許可リストに登録されたパラメータのみを実際に変更する。
 * ImprovementExecutor のシミュレーション機能とは独立した「実変更」レイヤー。
 *
 * ## 分離の原則
 * | クラス                  | 役割                                      |
 * |-------------------------|-------------------------------------------|
 * | ImprovementExecutor     | シミュレーション（パラメータ評価のみ）    |
 * | SafeImprovementApplier  | 許可リスト内パラメータの実変更 + rollback |
 *
 * ## 禁止事項（コード上で保証）
 * - 任意コードの実行
 * - ファイルへの書き込み
 * - シェルコマンド実行
 * - 外部API 呼び出し
 * - 許可リスト外のキー変更
 */
export class SafeImprovementApplier {
  private static instance: SafeImprovementApplier;

  /** 許可リスト: key → SafeImprovementTarget */
  private allowlist: Map<string, SafeImprovementTarget>;
  /** 適用履歴 */
  private applyHistory: ApplyResult[];
  /** 依存エンジン */
  private memoryEngine: MemoryEngine;
  private learningEngine: SelfLearningEngine;

  private constructor() {
    this.allowlist = new Map();
    this.applyHistory = [];
    this.memoryEngine = MemoryEngine.getInstance();
    this.learningEngine = SelfLearningEngine.getInstance();
    this.registerDefaults();
  }

  public static getInstance(): SafeImprovementApplier {
    if (!SafeImprovementApplier.instance) {
      SafeImprovementApplier.instance = new SafeImprovementApplier();
    }
    return SafeImprovementApplier.instance;
  }

  // ── 許可リスト管理 ───────────────────────────────────────────────────────

  /**
   * 対象を許可リストに登録する
   */
  public registerTarget(target: SafeImprovementTarget): void {
    this.allowlist.set(target.key, { ...target });
  }

  /**
   * 許可リストから対象を削除する
   */
  public unregisterTarget(key: string): void {
    this.allowlist.delete(key);
  }

  /**
   * 許可リストを取得する（読み取り専用コピー）
   */
  public getAllowlist(): SafeImprovementTarget[] {
    return Array.from(this.allowlist.values()).map((t) => ({ ...t }));
  }

  /**
   * 対象が許可リストに存在するか確認する
   */
  public isAllowed(key: string): boolean {
    return this.allowlist.has(key);
  }

  /**
   * 対象の現在値を取得する
   */
  public getCurrentValue(key: string): unknown {
    return this.allowlist.get(key)?.currentValue;
  }

  // ── 実変更 API ───────────────────────────────────────────────────────────

  /**
   * 改善候補から対象キーを特定し、値を実際に変更する
   *
   * @param userId     操作ユーザー
   * @param candidate  SelfImprovementManager が生成した改善候補
   * @param targetKey  変更対象のキー（許可リストに登録済みであること）
   * @param newValue   適用する新しい値
   * @param validator  オプション: 変更後に呼ばれる検証関数（テスト代わり）
   */
  public async apply(
    userId: string,
    candidate: ImprovementCandidate,
    targetKey: string,
    newValue: unknown,
    validator?: () => boolean | Promise<boolean>
  ): Promise<ApplyResult> {
    const startedAt = Date.now();

    // Step 1: 許可リスト確認
    const target = this.allowlist.get(targetKey);
    if (!target) {
      const result = this.buildResult(
        targetKey,
        candidate.id,
        userId,
        'rejected',
        undefined,
        newValue,
        `Target key "${targetKey}" is not in the allowlist`,
        Date.now() - startedAt,
        startedAt
      );
      this.applyHistory.push(result);
      return result;
    }

    // Step 2: バリデーション
    const validationError = this.validate(target, newValue);
    if (validationError) {
      const result = this.buildResult(
        targetKey,
        candidate.id,
        userId,
        'rejected',
        target.currentValue,
        newValue,
        validationError,
        Date.now() - startedAt,
        startedAt
      );
      this.applyHistory.push(result);
      return result;
    }

    // Step 3: 変更前の値を保存
    const previousValue = target.currentValue;
    this.saveBackup(userId, targetKey, previousValue);

    // Step 4: 実際に値を変更
    target.currentValue = newValue;

    // Step 5: バリデーター（テスト）を実行
    let testPassed = true;
    try {
      if (validator) {
        testPassed = await validator();
      }
    } catch {
      testPassed = false;
    }

    if (testPassed) {
      // Step 6: 成功 → 変更を確定
      const result = this.buildResult(
        targetKey,
        candidate.id,
        userId,
        'applied',
        previousValue,
        newValue,
        undefined,
        Date.now() - startedAt,
        startedAt
      );
      await this.saveResult(userId, candidate, result);
      this.applyHistory.push(result);
      return result;
    } else {
      // Step 7: 失敗 → ロールバック
      let status: ApplyStatus = 'rolled_back';
      let reason = 'Validator returned false after applying change';

      try {
        target.currentValue = previousValue;
        this.restoreBackup(userId, targetKey);
      } catch (rbErr) {
        // ロールバック自体が失敗した場合: 安全記録のみ
        status = 'rollback_failed';
        reason =
          `Validator failed AND rollback failed: ` +
          (rbErr instanceof Error ? rbErr.message : String(rbErr));
        // ロールバック失敗を MemoryEngine に記録（安全処理）
        this.memoryEngine.setMemory(userId, `rollback_failure_${targetKey}_${startedAt}`, {
          targetKey,
          candidateId: candidate.id,
          failedAt: Date.now(),
          reason,
        });
      }

      const result = this.buildResult(
        targetKey,
        candidate.id,
        userId,
        status,
        previousValue,
        newValue,
        reason,
        Date.now() - startedAt,
        startedAt
      );
      await this.saveResult(userId, candidate, result);
      this.applyHistory.push(result);
      return result;
    }
  }

  /**
   * 複数候補に対して一括適用する
   *
   * @param tasks  各タスク: { candidate, targetKey, newValue, validator }
   */
  public async applyBatch(
    userId: string,
    tasks: Array<{
      candidate: ImprovementCandidate;
      targetKey: string;
      newValue: unknown;
      validator?: () => boolean | Promise<boolean>;
    }>
  ): Promise<ApplyBatchSummary> {
    const results: ApplyResult[] = [];

    for (const task of tasks) {
      const result = await this.apply(
        userId,
        task.candidate,
        task.targetKey,
        task.newValue,
        task.validator
      );
      results.push(result);
    }

    const summary: ApplyBatchSummary = {
      userId,
      total: results.length,
      applied: results.filter((r) => r.status === 'applied').length,
      rolledBack: results.filter((r) => r.status === 'rolled_back').length,
      rejected: results.filter((r) => r.status === 'rejected').length,
      rollbackFailed: results.filter((r) => r.status === 'rollback_failed').length,
      results,
      executedAt: Date.now(),
    };

    this.memoryEngine.setMemory(userId, `apply_batch_${userId}_${summary.executedAt}`, summary);
    return summary;
  }

  // ── 照会 API ─────────────────────────────────────────────────────────────

  /**
   * 適用履歴を取得する
   */
  public getApplyHistory(userId: string, limit = 50): ApplyResult[] {
    return this.applyHistory.filter((r) => r.userId === userId).slice(-limit);
  }

  /**
   * 統計情報
   */
  public getStats(userId: string): {
    totalApplied: number;
    totalRolledBack: number;
    totalRejected: number;
    totalRollbackFailed: number;
    successRate: number;
  } {
    const history = this.applyHistory.filter((r) => r.userId === userId);
    const applied = history.filter((r) => r.status === 'applied').length;
    const rolledBack = history.filter((r) => r.status === 'rolled_back').length;
    const rejected = history.filter((r) => r.status === 'rejected').length;
    const rollbackFailed = history.filter((r) => r.status === 'rollback_failed').length;
    const total = history.length;

    return {
      totalApplied: applied,
      totalRolledBack: rolledBack,
      totalRejected: rejected,
      totalRollbackFailed: rollbackFailed,
      successRate: total === 0 ? 0 : Math.round((applied / total) * 100),
    };
  }

  /** テスト用: 全データクリア（履歴・許可リストはデフォルトを除いて残す） */
  public clearHistory(): void {
    this.applyHistory = [];
  }

  /** テスト用: 許可リストごと完全クリアして再登録 */
  public resetToDefaults(): void {
    this.allowlist.clear();
    this.applyHistory = [];
    this.registerDefaults();
  }

  // ── プライベート ──────────────────────────────────────────────────────────

  /**
   * デフォルト許可リストを登録する
   * （自己改善システム自身の設定パラメータのみ）
   */
  private registerDefaults(): void {
    const defaults: SafeImprovementTarget[] = [
      {
        key: 'self_improvement.candidate_score_threshold',
        category: 'config',
        description: '改善候補のテスト通過最低スコア（0–100）',
        currentValue: 50,
        allowedType: 'number',
        minValue: 0,
        maxValue: 100,
      },
      {
        key: 'self_improvement.max_candidates_per_cycle',
        category: 'config',
        description: '1サイクルあたりの最大候補数',
        currentValue: 20,
        allowedType: 'number',
        minValue: 1,
        maxValue: 100,
      },
      {
        key: 'self_improvement.cycle_history_limit',
        category: 'config',
        description: '保持するサイクル履歴の上限',
        currentValue: 10,
        allowedType: 'number',
        minValue: 1,
        maxValue: 200,
      },
      {
        key: 'self_improvement.failure_rate_alert_threshold',
        category: 'rule',
        description: '失敗率アラートのしきい値（0.0–1.0）',
        currentValue: 0.3,
        allowedType: 'number',
        minValue: 0,
        maxValue: 1,
      },
      {
        key: 'self_improvement.system_prompt_suffix',
        category: 'prompt',
        description: 'システムプロンプトへの付加テキスト',
        currentValue: '',
        allowedType: 'string',
        maxLength: 500,
      },
      {
        key: 'self_improvement.enable_auto_cycle',
        category: 'param',
        description: '自動改善サイクルの有効/無効',
        currentValue: false,
        allowedType: 'boolean',
      },
    ];

    for (const t of defaults) {
      this.allowlist.set(t.key, t);
    }
  }

  /**
   * 新しい値がターゲット定義に適合するかバリデーション
   * @returns エラーメッセージ（問題なければ null）
   */
  private validate(target: SafeImprovementTarget, newValue: unknown): string | null {
    // 型チェック
    if (typeof newValue !== target.allowedType) {
      return (
        `Type mismatch for "${target.key}": ` +
        `expected ${target.allowedType}, got ${typeof newValue}`
      );
    }

    // 数値範囲チェック
    if (target.allowedType === 'number') {
      const n = newValue as number;
      if (!isFinite(n)) return `Value for "${target.key}" must be a finite number`;
      if (target.minValue !== undefined && n < target.minValue) {
        return `Value ${n} is below minimum ${target.minValue} for "${target.key}"`;
      }
      if (target.maxValue !== undefined && n > target.maxValue) {
        return `Value ${n} exceeds maximum ${target.maxValue} for "${target.key}"`;
      }
    }

    // 文字列長チェック
    if (target.allowedType === 'string' && target.maxLength !== undefined) {
      const s = newValue as string;
      if (s.length > target.maxLength) {
        return (
          `String length ${s.length} exceeds maxLength ${target.maxLength} for "${target.key}"`
        );
      }
    }

    return null;
  }

  /** 変更前の値をバックアップ保存 */
  private saveBackup(userId: string, key: string, value: unknown): void {
    this.memoryEngine.setMemory(userId, `backup_${key}`, { key, value, savedAt: Date.now() });
  }

  /** バックアップから値を復元（MemoryEngine 側のクリーンアップ） */
  private restoreBackup(userId: string, key: string): void {
    this.memoryEngine.deleteMemory(userId, `backup_${key}`);
  }

  /** ApplyResult を組み立てる */
  private buildResult(
    targetKey: string,
    candidateId: string,
    userId: string,
    status: ApplyStatus,
    previousValue: unknown,
    newValue: unknown,
    reason: string | undefined,
    durationMs: number,
    appliedAt: number
  ): ApplyResult {
    return {
      targetKey,
      candidateId,
      userId,
      status,
      previousValue,
      newValue,
      reason,
      durationMs,
      appliedAt,
    };
  }

  /** 結果を MemoryEngine と SelfLearningEngine に保存 */
  private async saveResult(
    userId: string,
    candidate: ImprovementCandidate,
    result: ApplyResult
  ): Promise<void> {
    // MemoryEngine に保存
    this.memoryEngine.setMemory(
      userId,
      `apply_result_${candidate.id}_${result.appliedAt}`,
      result
    );

    // SelfLearningEngine に記録（アクティブなサイクルがあれば）
    try {
      const cycles = await this.learningEngine.getAllLearningCycles(userId);
      const activeCycle = cycles.find((c) => (c.status as string) === 'running');
      if (activeCycle) {
        await this.learningEngine.recordDataPoint(
          userId,
          activeCycle.id,
          {
            type: 'safe_apply',
            targetKey: result.targetKey,
            candidateId: candidate.id,
          },
          {
            status: result.status,
            previousValue: result.previousValue,
            newValue: result.newValue,
          },
          result.status === 'applied' ? 'success' : 'failure',
          result.durationMs,
          { category: this.allowlist.get(result.targetKey)?.category }
        );
      }
    } catch {
      // 学習サイクルなし → スキップ
    }
  }
}
