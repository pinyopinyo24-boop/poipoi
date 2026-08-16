/**
 * HeartbeatConnector
 *
 * `server/_core/heartbeat.ts` の HeartbeatJob 型と連携し、
 * EvolutionScheduler を Heartbeat ベースの自動実行システムとして公開する。
 *
 * ## 設計
 * - Heartbeat API はローカル環境ではスタブ（HTTP コールバック前提）。
 * - 本コネクタは以下の2つのパスを統一的に扱う:
 *     A) **Heartbeat 経由** — `/api/scheduled/self-evolution` を Heartbeat に登録し、
 *        コールバックを受信した際に `EvolutionScheduler.triggerOnce()` を呼ぶ。
 *     B) **手動実行** — tRPC ルーターから直接 `triggerOnce()` を呼べる。
 * - 二重スケジューラ（setInterval との競合）は起こさない:
 *     Heartbeat コールバックは Heartbeat 側がタイムトリガーを管理するため、
 *     本コネクタはタイマーを持たない。
 *
 * ## 安全条件（EvolutionScheduler 側で実施済みのものは委譲）
 * - enable_auto_cycle OFF → EvolutionScheduler.triggerOnce() 内でスキップ
 * - 同時実行 → EvolutionScheduler 内の cycleRunning フラグで排他制御
 * - 失敗率/連続失敗/rollback_failed → EvolutionScheduler が auto_stop
 */

import { HeartbeatJob } from '../_core/heartbeat';
import { EvolutionScheduler, ScheduledRunResult } from './EvolutionScheduler';
import { MemoryEngine } from './memory/MemoryEngine';
import { SelfLearningEngine } from './learning/SelfLearningEngine';

// ── 型定義 ──────────────────────────────────────────────────────────────

export interface HeartbeatCallbackResult {
  /** Heartbeat から受け取った userId（ない場合は 'system'） */
  userId: string;
  /** EvolutionScheduler によるサイクル結果 */
  runResult: ScheduledRunResult;
  /** 実行日時 */
  triggeredAt: number;
}

// ── HeartbeatConnector ───────────────────────────────────────────────────

export class HeartbeatConnector {
  private static instance: HeartbeatConnector;

  private scheduler: EvolutionScheduler;
  private memoryEngine: MemoryEngine;
  private learningEngine: SelfLearningEngine;

  /** Heartbeat に登録するジョブ定義（EvolutionScheduler から取得） */
  private readonly jobDescriptor: Readonly<HeartbeatJob>;

  /** コールバック受信履歴（直近50件） */
  private callbackHistory: HeartbeatCallbackResult[];

  private constructor() {
    this.scheduler = EvolutionScheduler.getInstance();
    this.memoryEngine = MemoryEngine.getInstance();
    this.learningEngine = SelfLearningEngine.getInstance();
    this.jobDescriptor = this.scheduler.getJobDescriptor();
    this.callbackHistory = [];
  }

  public static getInstance(): HeartbeatConnector {
    if (!HeartbeatConnector.instance) {
      HeartbeatConnector.instance = new HeartbeatConnector();
    }
    return HeartbeatConnector.instance;
  }

  // ── 公開API ─────────────────────────────────────────────────────────────

  /**
   * Heartbeat が `/api/scheduled/self-evolution` をコールした際に呼び出す。
   *
   * tRPC ルーター（`/api/scheduled/self-evolution` エンドポイント）から
   * このメソッドを呼ぶことで、Heartbeat → EvolutionScheduler フローを完成させる。
   *
   * @param userId  Heartbeat ペイロードの userId（省略時は 'system'）
   */
  public async onHeartbeatCallback(userId = 'system'): Promise<HeartbeatCallbackResult> {
    const triggeredAt = Date.now();

    // EvolutionScheduler に委譲（安全条件チェック含む）
    const runResult = await this.scheduler.triggerOnce(userId);

    const callbackResult: HeartbeatCallbackResult = {
      userId,
      runResult,
      triggeredAt,
    };

    // 結果を MemoryEngine に保存
    this.memoryEngine.setMemory(
      userId,
      `heartbeat_callback_${triggeredAt}`,
      callbackResult
    );

    // SelfLearningEngine に実行結果を記録（起動済みサイクルがある場合のみ）
    await this.recordToLearningEngine(userId, callbackResult);

    // コールバック履歴に追加（最大50件）
    this.callbackHistory.push(callbackResult);
    if (this.callbackHistory.length > 50) {
      this.callbackHistory = this.callbackHistory.slice(-50);
    }

    return callbackResult;
  }

  /**
   * 手動でサイクルを1回実行する（tRPC ルーターからの直接呼び出し用）
   * Heartbeat 経由と同じフローを通る。
   */
  public async triggerManually(userId: string): Promise<HeartbeatCallbackResult> {
    return this.onHeartbeatCallback(userId);
  }

  /** Heartbeat ジョブ定義を取得する */
  public getJobDescriptor(): Readonly<HeartbeatJob> {
    return this.jobDescriptor;
  }

  /** コールバック受信履歴を取得する */
  public getCallbackHistory(limit = 20): HeartbeatCallbackResult[] {
    return this.callbackHistory.slice(-limit);
  }

  /** EvolutionScheduler の状態をそのまま公開する */
  public getSchedulerStatus() {
    return {
      status: this.scheduler.getStatus(),
      config: this.scheduler.getConfig(),
      stats: this.scheduler.getStats(),
      jobDescriptor: this.jobDescriptor,
    };
  }

  /** テスト用: コールバック履歴クリア */
  public clearCallbackHistory(): void {
    this.callbackHistory = [];
  }

  // ── プライベート ─────────────────────────────────────────────────────────

  /**
   * 実行結果を SelfLearningEngine に記録する。
   * 起動済みの学習サイクルがない場合はスキップ（try/catch で保護）。
   */
  private async recordToLearningEngine(
    userId: string,
    result: HeartbeatCallbackResult
  ): Promise<void> {
    try {
      const cycles = await this.learningEngine.getAllLearningCycles(userId);
      const activeCycle = cycles.find((c) => (c.status as string) === 'running');
      if (!activeCycle) return;

      await this.learningEngine.recordDataPoint(
        userId,
        activeCycle.id,
        {
          source: 'heartbeat_callback',
          runId: result.runResult.runId,
          outcome: result.runResult.outcome,
        },
        {
          changesApplied: result.runResult.changesApplied,
          rollbacks: result.runResult.rollbacks,
          hasApplyResult: result.runResult.applyResult !== undefined,
        },
        result.runResult.outcome === 'executed' ? 'success' : 'failure',
        result.runResult.completedAt - result.triggeredAt,
        { schedulerStatus: this.scheduler.getStatus() }
      );
    } catch {
      // 学習エンジンへの記録失敗は無視（本体実行には影響しない）
    }
  }
}
