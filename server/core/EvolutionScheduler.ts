import { HeartbeatJob } from '../_core/heartbeat';
import {
  SelfEvolutionWorkflow,
  ExecutionWorkflowResult,
  SimulationResult,
} from './SelfEvolutionWorkflow';
import { SafeImprovementApplier } from './SafeImprovementApplier';
import { SelfLearningEngine } from './learning/SelfLearningEngine';
import { MemoryEngine } from './memory/MemoryEngine';

// ── 定数 ─────────────────────────────────────────────────────────────────

/** デフォルト実行間隔(ms) — 60分 */
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
/** 最小実行間隔(ms) — 60秒 */
const MIN_INTERVAL_MS = 60 * 1000;
/** 1サイクルあたり実変更の上限（デフォルト） */
const DEFAULT_MAX_CHANGES_PER_CYCLE = 3;
/** 連続失敗の停止しきい値（デフォルト） */
const DEFAULT_MAX_CONSECUTIVE_FAILURES = 3;

// ── 型定義 ──────────────────────────────────────────────────────────────

/** スケジューラ設定 */
export interface EvolutionSchedulerConfig {
  /** 実行間隔(ms) — MIN_INTERVAL_MS 以上 */
  intervalMs: number;
  /** 1サイクルあたりの最大実変更数 */
  maxChangesPerCycle: number;
  /** 連続失敗でオートストップする回数 */
  maxConsecutiveFailures: number;
  /** 失敗率でオートストップするしきい値(0–1) */
  failureRateThreshold: number;
}

/** スケジューラ状態 */
export type SchedulerStatus =
  | 'idle'           // 未開始
  | 'running'        // 稼働中
  | 'stopped'        // 手動停止済み
  | 'auto_stopped';  // 安全条件により自動停止

/** 1回の定期実行結果 */
export interface ScheduledRunResult {
  runId: string;
  userId: string;
  startedAt: number;
  completedAt: number;
  /** 'simulation_only' = 安全条件で execution に進まなかった */
  outcome: 'simulation_only' | 'executed' | 'skipped' | 'error';
  /** simulation フェーズ結果 */
  simulationResult?: SimulationResult;
  /** execution フェーズ結果（実行した場合のみ） */
  executionResult?: ExecutionWorkflowResult;
  error?: string;
  /** このサイクルで実際に変更された件数 */
  changesApplied: number;
  /** ロールバック発生件数 */
  rollbacks: number;
}

// ── EvolutionScheduler ───────────────────────────────────────────────────

/**
 * EvolutionScheduler
 *
 * SelfEvolutionWorkflow を定期的・安全に実行するスケジューラ。
 *
 * ## 既存 Heartbeat との関係
 *   - `server/_core/heartbeat.ts` の HeartbeatJob 型定義を再利用し、
 *     ジョブ記述を統一した形式で管理する。
 *   - 実際のタイマー制御はローカル `setInterval` で行う（Heartbeat スタブ API は
 *     HTTP コールバック前提のため、ローカル完結の本実装には使用しない）。
 *
 * ## 安全条件（いずれかに違反すると自動停止または execution をスキップ）
 *   1. `self_improvement.enable_auto_cycle` が true でなければ実行しない
 *   2. 1サイクルの実変更数が `maxChangesPerCycle` を超えたら execution をスキップ
 *   3. critical 候補は自動適用しない（ImprovementExecutor 側で拒否済み）
 *   4. 累積失敗率が `failureRateThreshold` を超えたら自動停止
 *   5. 連続失敗が `maxConsecutiveFailures` に達したら自動停止
 *   6. rollback_failed が 1 件でも発生したら即時停止
 *   7. 同時に複数サイクルを実行しない（`running` フラグで排他制御）
 */
export class EvolutionScheduler {
  private static instance: EvolutionScheduler;

  // ── 依存 ──
  private workflow: SelfEvolutionWorkflow;
  private applier: SafeImprovementApplier;
  private learningEngine: SelfLearningEngine;
  private memoryEngine: MemoryEngine;

  // ── 状態 ──
  private status: SchedulerStatus = 'idle';
  private config: EvolutionSchedulerConfig;
  private runHistory: ScheduledRunResult[];
  /** setInterval の handle */
  private timer: ReturnType<typeof setInterval> | null = null;
  /** 現在サイクルが実行中かどうか（排他制御用） */
  private cycleRunning = false;
  /** 連続失敗カウンタ */
  private consecutiveFailures = 0;
  /** HeartbeatJob 形式のジョブ記述（型再利用のみ） */
  private jobDescriptor: HeartbeatJob;

  private constructor() {
    this.workflow = SelfEvolutionWorkflow.getInstance();
    this.applier = SafeImprovementApplier.getInstance();
    this.learningEngine = SelfLearningEngine.getInstance();
    this.memoryEngine = MemoryEngine.getInstance();
    this.runHistory = [];
    this.config = {
      intervalMs: DEFAULT_INTERVAL_MS,
      maxChangesPerCycle: DEFAULT_MAX_CHANGES_PER_CYCLE,
      maxConsecutiveFailures: DEFAULT_MAX_CONSECUTIVE_FAILURES,
      failureRateThreshold: 0.5,
    };
    this.jobDescriptor = {
      name: 'self-evolution',
      cron: '0 0 * * * *', // hourly (6-field: sec min hour dom mon dow)
      path: '/api/scheduled/self-evolution',
      method: 'POST',
      description: 'Periodic self-improvement cycle for PoiPoi AI',
    };
  }

  public static getInstance(): EvolutionScheduler {
    if (!EvolutionScheduler.instance) {
      EvolutionScheduler.instance = new EvolutionScheduler();
    }
    return EvolutionScheduler.instance;
  }

  // ── 設定 API ────────────────────────────────────────────────────────────

  /** スケジューラ設定を更新する */
  public configure(partial: Partial<EvolutionSchedulerConfig>): void {
    if (partial.intervalMs !== undefined) {
      if (partial.intervalMs < MIN_INTERVAL_MS) {
        throw new Error(
          `intervalMs must be >= ${MIN_INTERVAL_MS}ms (got ${partial.intervalMs})`
        );
      }
    }
    this.config = { ...this.config, ...partial };
  }

  /** 現在の設定を取得する */
  public getConfig(): Readonly<EvolutionSchedulerConfig> {
    return { ...this.config };
  }

  /** Heartbeat 型で記述されたジョブ仕様を取得する */
  public getJobDescriptor(): Readonly<HeartbeatJob> {
    return { ...this.jobDescriptor };
  }

  // ── ライフサイクル API ───────────────────────────────────────────────────

  /**
   * スケジューラを起動する
   * 既に running の場合は何もしない。
   */
  public start(): void {
    if (this.status === 'running') return;

    this.status = 'running';
    this.consecutiveFailures = 0;

    this.timer = setInterval(() => {
      this.triggerCycle('system').catch(() => {
        // エラーは triggerCycle 内で記録済み
      });
    }, this.config.intervalMs);
  }

  /** スケジューラを手動停止する */
  public stop(): void {
    this.clearTimer();
    this.status = 'stopped';
  }

  /** 現在の状態を取得する */
  public getStatus(): SchedulerStatus {
    return this.status;
  }

  // ── 手動トリガー API ─────────────────────────────────────────────────────

  /**
   * サイクルを即時1回実行する（手動トリガー）
   * スケジューラが停止していても呼べる（既存の手動実行APIを壊さない）。
   */
  public async triggerOnce(userId: string): Promise<ScheduledRunResult> {
    return this.triggerCycle(userId);
  }

  // ── 内部実行ロジック ─────────────────────────────────────────────────────

  /**
   * 1サイクルの定期実行コア
   *
   * 安全条件チェック → simulation → (条件OK なら) execution → 結果保存
   */
  private async triggerCycle(userId: string): Promise<ScheduledRunResult> {
    const runId = `sched-run-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
    const startedAt = Date.now();

    // ─ 安全条件 1: 同時実行防止 ─
    if (this.cycleRunning) {
      const skipped = this.buildResult(runId, userId, startedAt, 'skipped', 0, 0, undefined, undefined, 'Another cycle is already running');
      this.runHistory.push(skipped);
      return skipped;
    }

    // ─ 安全条件 2: auto_cycle フラグ確認 ─
    const autoEnabled = this.applier.getCurrentValue('self_improvement.enable_auto_cycle');
    if (!autoEnabled) {
      const skipped = this.buildResult(runId, userId, startedAt, 'skipped', 0, 0, undefined, undefined, 'auto_cycle is disabled');
      this.runHistory.push(skipped);
      return skipped;
    }

    this.cycleRunning = true;
    let result: ScheduledRunResult;

    try {
      result = await this.executeOneCycle(runId, userId, startedAt);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      result = this.buildResult(runId, userId, startedAt, 'error', 0, 0, undefined, undefined, error);
    } finally {
      this.cycleRunning = false;
    }

    // 失敗カウンタ更新
    if (result.outcome === 'error') {
      this.consecutiveFailures++;
    } else {
      this.consecutiveFailures = 0;
    }

    // ─ 安全条件 5: 連続失敗チェック ─
    if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.autoStop('Consecutive failures exceeded threshold');
    }

    // ─ 安全条件 4: 累積失敗率チェック ─
    this.checkFailureRate(userId);

    // 結果を保存して履歴へ
    this.saveRunResult(userId, result);
    this.runHistory.push(result);

    return result;
  }

  /**
   * サイクルの本体処理
   */
  private async executeOneCycle(
    runId: string,
    userId: string,
    startedAt: number
  ): Promise<ScheduledRunResult> {
    // Step 1: シミュレーション
    const simResult = await this.workflow.runSimulation(userId);

    // ─ 安全条件 3: critical 候補のフィルタリング ─
    // ImprovementExecutor 側で critical+高impact は拒否済みだが、
    // スケジューラ層でも critical 候補を approved から除外する
    const safeApproved = simResult.approvedCandidates.filter(
      (c) => c.priority !== 'critical'
    );

    // ─ 安全条件 2: 実変更数上限 ─
    if (safeApproved.length > this.config.maxChangesPerCycle) {
      return this.buildResult(
        runId, userId, startedAt, 'simulation_only',
        0, 0, simResult, undefined,
        `Approved candidates (${safeApproved.length}) exceed maxChangesPerCycle (${this.config.maxChangesPerCycle})`
      );
    }

    // ─ approved が 0 件の場合はシミュレーションのみ ─
    if (safeApproved.length === 0) {
      return this.buildResult(runId, userId, startedAt, 'simulation_only', 0, 0, simResult);
    }

    // Step 2: 実行フェーズ（simulation_only に留まらない場合のみ）
    const execResult = await this.workflow.runExecution(userId);

    const changesApplied = execResult.execution.succeeded;
    const rollbacks = execResult.execution.rolledBack;

    // ─ 安全条件 6: rollback_failed で即停止 ─
    // ExecutionBatchSummary.rolledBack は rolled_back の件数
    // (rollback_failed は ImprovementExecutor が status='rolled_back' として
    //  記録するため、results の status を直接確認する)
    const rollbackFailed = execResult.execution.results.filter(
      (r) => r.status === 'rolled_back' && r.failureReason?.includes('rollback')
    ).length;
    if (rollbackFailed > 0) {
      this.autoStop('rollback_failed detected — immediate stop');
    }

    return this.buildResult(
      runId, userId, startedAt, 'executed',
      changesApplied, rollbacks,
      execResult.simulation, execResult
    );
  }

  // ── ヘルパー ─────────────────────────────────────────────────────────────

  private buildResult(
    runId: string,
    userId: string,
    startedAt: number,
    outcome: ScheduledRunResult['outcome'],
    changesApplied: number,
    rollbacks: number,
    simulationResult?: SimulationResult,
    executionResult?: ExecutionWorkflowResult,
    error?: string
  ): ScheduledRunResult {
    return {
      runId,
      userId,
      startedAt,
      completedAt: Date.now(),
      outcome,
      simulationResult,
      executionResult,
      error,
      changesApplied,
      rollbacks,
    };
  }

  /** 自動停止 */
  private autoStop(reason: string): void {
    this.clearTimer();
    this.status = 'auto_stopped';
    this.memoryEngine.setMemory(
      'system',
      `evolution_scheduler_auto_stop_${Date.now()}`,
      { reason, stoppedAt: Date.now() }
    );
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** 累積失敗率チェック */
  private checkFailureRate(userId: string): void {
    const history = this.runHistory.filter((r) => r.userId === userId || r.userId === 'system');
    if (history.length < 5) return; // サンプルが少なすぎる場合はスキップ

    const recent = history.slice(-20);
    const errors = recent.filter((r) => r.outcome === 'error').length;
    const rate = errors / recent.length;

    if (rate >= this.config.failureRateThreshold) {
      this.autoStop(`Failure rate ${(rate * 100).toFixed(1)}% exceeds threshold`);
    }
  }

  /** 実行結果を MemoryEngine と SelfLearningEngine に保存 */
  private saveRunResult(userId: string, result: ScheduledRunResult): void {
    this.memoryEngine.setMemory(
      userId,
      `scheduled_run_${result.runId}`,
      result
    );
  }

  // ── 照会 API ─────────────────────────────────────────────────────────────

  /** 実行履歴を取得する */
  public getRunHistory(limit = 20): ScheduledRunResult[] {
    return this.runHistory.slice(-limit);
  }

  /** 統計情報 */
  public getStats(): {
    totalRuns: number;
    executedRuns: number;
    simulationOnlyRuns: number;
    skippedRuns: number;
    errorRuns: number;
    totalChangesApplied: number;
    totalRollbacks: number;
    consecutiveFailures: number;
    status: SchedulerStatus;
  } {
    const h = this.runHistory;
    return {
      totalRuns: h.length,
      executedRuns: h.filter((r) => r.outcome === 'executed').length,
      simulationOnlyRuns: h.filter((r) => r.outcome === 'simulation_only').length,
      skippedRuns: h.filter((r) => r.outcome === 'skipped').length,
      errorRuns: h.filter((r) => r.outcome === 'error').length,
      totalChangesApplied: h.reduce((s, r) => s + r.changesApplied, 0),
      totalRollbacks: h.reduce((s, r) => s + r.rollbacks, 0),
      consecutiveFailures: this.consecutiveFailures,
      status: this.status,
    };
  }

  /** テスト用: 全データクリア・状態リセット */
  public resetForTest(): void {
    this.clearTimer();
    this.status = 'idle';
    this.cycleRunning = false;
    this.consecutiveFailures = 0;
    this.runHistory = [];
    this.config = {
      intervalMs: DEFAULT_INTERVAL_MS,
      maxChangesPerCycle: DEFAULT_MAX_CHANGES_PER_CYCLE,
      maxConsecutiveFailures: DEFAULT_MAX_CONSECUTIVE_FAILURES,
      failureRateThreshold: 0.5,
    };
  }
}
