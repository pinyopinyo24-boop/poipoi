/**
 * Execution Logs tRPC Router
 * Provides access to AI Agent execution logs and statistics
 */

import { router, adminProcedure } from '../_core/trpc';
import { getExecutionLogger } from '../_core/ai/ExecutionLogger';

const executionLogger = getExecutionLogger();

export const executionLogsRouter = router({
  /**
   * Get all execution logs
   */
  getAllLogs: adminProcedure.query(async () => {
    return executionLogger.getAllLogs();
  }),

  /**
   * Get recent logs
   */
  getRecentLogs: adminProcedure
    .input((val: unknown) => {
      if (typeof val === 'object' && val !== null && 'limit' in val) {
        return { limit: (val as { limit: number }).limit };
      }
      return { limit: 10 };
    })
    .query(async ({ input }) => {
      return executionLogger.getRecentLogs(input.limit);
    }),

  /**
   * Get logs by mode
   */
  getLogsByMode: adminProcedure
    .input((val: unknown) => {
      if (typeof val === 'object' && val !== null && 'mode' in val) {
        return { mode: (val as { mode: 'demo' | 'real' }).mode };
      }
      return { mode: 'demo' as const };
    })
    .query(async ({ input }) => {
      return executionLogger.getLogsByMode(input.mode);
    }),

  /**
   * Get logs by provider
   */
  getLogsByProvider: adminProcedure
    .input((val: unknown) => {
      if (typeof val === 'object' && val !== null && 'provider' in val) {
        return { provider: (val as { provider: string }).provider };
      }
      return { provider: '' };
    })
    .query(async ({ input }) => {
      return executionLogger.getLogsByProvider(input.provider);
    }),

  /**
   * Get specific workflow log
   */
  getWorkflowLog: adminProcedure
    .input((val: unknown) => {
      if (typeof val === 'object' && val !== null && 'workflowId' in val) {
        return { workflowId: (val as { workflowId: string }).workflowId };
      }
      return { workflowId: '' };
    })
    .query(async ({ input }) => {
      return executionLogger.getWorkflowLog(input.workflowId);
    }),

  /**
   * Get statistics
   */
  getStatistics: adminProcedure.query(async () => {
    return executionLogger.getStatistics();
  }),

  /**
   * Clear all logs
   */
  clearLogs: adminProcedure.mutation(async () => {
    executionLogger.clearLogs();
    return { success: true };
  }),
});
