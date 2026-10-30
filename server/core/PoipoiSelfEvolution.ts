import type { CodeTaskResult } from './PoipoiCodeAgent';
import type { TrpcContext } from '../_core/context';

export interface SelfEvolutionRun {
  task: string;
  startedAt: string;
  finishedAt: string;
  phase: 'awaiting_approval' | 'applied' | 'failed';
  previewId?: string;
  result: CodeTaskResult;
}

/** Compatibility entry point: all source changes use the same owned preview and
 * approval service as PC chat. Calling run(task) never silently grants permission. */
export class PoipoiSelfEvolution {
  async run(task: string, context?: TrpcContext,
    approval?: { previewId: string; confirm: 'APPLY_ONLY' | 'APPLY_AND_VERIFY' }): Promise<SelfEvolutionRun> {
    const startedAt = new Date().toISOString();
    try {
      if (!context?.user || context.user.role !== 'admin') throw new Error('管理者としてログインし、変更案を確認して適用を承認してください。');
      const { unifiedToolsRouter } = await import('../routers/unifiedTools');
      const caller = unifiedToolsRouter.createCaller(context);
      if (approval) {
        const result = await caller.applyCodePreview(approval);
        return { task, startedAt, finishedAt: new Date().toISOString(), previewId: approval.previewId,
          phase: result.success ? 'applied' : 'failed', result };
      }
      const preview = await caller.codePreview({ request: task });
      return { task, startedAt, finishedAt: new Date().toISOString(), phase: 'awaiting_approval',
        previewId: preview.previewId, result: { success: false, changes: preview.changes, tested: false } };
    } catch (error) {
      return { task, startedAt, finishedAt: new Date().toISOString(), phase: 'failed',
        result: { success: false, changes: [], tested: false, error: error instanceof Error ? error.message : String(error) } };
    }
  }
}

export const poipoiSelfEvolution = new PoipoiSelfEvolution();
