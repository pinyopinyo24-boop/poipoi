/**
 * Evolution Scheduler Router
 *
 * HeartbeatConnector / EvolutionScheduler を tRPC から操作するエンドポイント群。
 *
 * ## エンドポイント一覧
 *
 * | procedure                     | 種別      | 説明                                         |
 * |-------------------------------|-----------|----------------------------------------------|
 * | `heartbeatCallback`           | mutation  | Heartbeat コールバック受信 → 自己進化サイクル実行 |
 * | `triggerOnce`                 | mutation  | 手動で1サイクル実行                           |
 * | `getStatus`                   | query     | スケジューラ状態・統計取得                    |
 * | `getRunHistory`               | query     | 実行履歴取得                                  |
 * | `getCallbackHistory`          | query     | Heartbeat コールバック履歴取得                |
 * | `configure`                   | mutation  | スケジューラ設定更新                          |
 * | `getJobDescriptor`            | query     | HeartbeatJob 定義取得                         |
 *
 * ## Heartbeat との連携
 * Heartbeat (server/_core/heartbeat.ts) は本番環境では HTTP コールバックを送信する。
 * `heartbeatCallback` エンドポイントのパスが `/api/trpc/evolutionScheduler.heartbeatCallback`
 * に相当するが、Heartbeat の callbackPath は `/api/scheduled/self-evolution` に設定されている。
 * Express 側でBearer秘密鍵を検証してから
 * `HeartbeatConnector.onHeartbeatCallback()` を呼び出す。tRPC管理操作は管理者認証が必要。
 * （tRPC mutation は JSON-RPC 形式のため、Heartbeat POST との橋渡し役として
 *  `heartbeatCallback` mutation と Express ルートを共存させる）
 */

import { router, adminProcedure } from '../_core/trpc';
import { z } from 'zod';
import { HeartbeatConnector } from '../core/HeartbeatConnector';
import { EvolutionScheduler } from '../core/EvolutionScheduler';
import { SafeImprovementApplier } from '../core/SafeImprovementApplier';

const connector = HeartbeatConnector.getInstance();
const scheduler = EvolutionScheduler.getInstance();

export const evolutionSchedulerRouter = router({
  /**
   * Heartbeat コールバックを受信し、自己進化サイクルを実行する。
   *
   * Heartbeat の callbackPath `/api/scheduled/self-evolution` から
   * Express ルート経由で呼び出される（管理者による直接 tRPC 呼び出しも可）。
   */
  heartbeatCallback: adminProcedure
    .input(
      z.object({
        userId: z.string().optional().default('system'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await connector.onHeartbeatCallback(input.userId);
        return {
          success: true,
          runId: result.runResult.runId,
          outcome: result.runResult.outcome,
          changesApplied: result.runResult.changesApplied,
          rollbacks: result.runResult.rollbacks,
          triggeredAt: result.triggeredAt,
          schedulerStatus: scheduler.getStatus(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),

  /**
   * 手動で1サイクル実行する（テスト・管理用）。
   * 既存の triggerOnce API を破壊しない。
   */
  triggerOnce: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await connector.triggerManually(input.userId);
        return {
          success: true,
          runResult: {
            runId: result.runResult.runId,
            userId: result.runResult.userId,
            outcome: result.runResult.outcome,
            changesApplied: result.runResult.changesApplied,
            rollbacks: result.runResult.rollbacks,
            startedAt: result.runResult.startedAt,
            completedAt: result.runResult.completedAt,
            error: result.runResult.error,
            hasApplyResult: result.runResult.applyResult !== undefined,
          },
          schedulerStatus: scheduler.getStatus(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),

  /**
   * スケジューラ状態・統計を取得する。
   */
  getStatus: adminProcedure.query(() => {
    return connector.getSchedulerStatus();
  }),

  /**
   * 実行履歴を取得する。
   */
  getRunHistory: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
      })
    )
    .query(({ input }) => {
      return {
        history: scheduler.getRunHistory(input.limit),
      };
    }),

  /**
   * Heartbeat コールバック受信履歴を取得する。
   */
  getCallbackHistory: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).optional().default(20),
      })
    )
    .query(({ input }) => {
      return {
        history: connector.getCallbackHistory(input.limit),
      };
    }),

  /**
   * スケジューラ設定を更新する。
   * enable_auto_cycle などのパラメータは SafeImprovementApplier 経由で変更する。
   */
  configure: adminProcedure
    .input(
      z.object({
        intervalMs: z.number().int().min(60_000).max(2_147_483_647).optional(),
        maxChangesPerCycle: z.number().int().min(0).max(20).optional(),
        maxConsecutiveFailures: z.number().int().min(1).max(10).optional(),
        failureRateThreshold: z.number().min(0).max(1).optional(),
      })
    )
    .mutation(({ input }) => {
      try {
        scheduler.configure(input);
        return {
          success: true,
          config: scheduler.getConfig(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),

  /**
   * Heartbeat ジョブ定義を取得する（登録用）。
   */
  getJobDescriptor: adminProcedure.query(() => {
    return connector.getJobDescriptor();
  }),

  /**
   * enable_auto_cycle を SafeImprovementApplier 経由で切り替える。
   * allowlist 対象キーのみ変更するため安全。
   */
  setAutoCycle: adminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const applier = SafeImprovementApplier.getInstance();
        const candidate = {
          id: `set-auto-cycle-${Date.now()}`,
          source: 'diagnosis' as const,
          title: 'Set auto cycle',
          description: 'Enable or disable automatic evolution cycle',
          priority: 'low' as const,
          estimatedImpact: 0,
          createdAt: Date.now(),
        };
        const result = await applier.apply(
          input.userId,
          candidate,
          'self_improvement.enable_auto_cycle',
          input.enabled
        );
        return {
          success: result.status === 'applied',
          status: result.status,
          currentValue: applier.getCurrentValue('self_improvement.enable_auto_cycle'),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),
});
