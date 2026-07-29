/**
 * Agent Memory tRPC Router
 * メモリ・学習データへのアクセスAPI
 */

import { publicProcedure, router } from "../_core/trpc";
import { memoryIntegrationService } from "../_core/ai/MemoryIntegrationService";

export const agentMemoryRouter = router({
  /**
   * メモリ統計を取得
   */
  getMemoryStatistics: publicProcedure.query(async () => {
    try {
      const stats = memoryIntegrationService.getMemoryStatistics();
      const memoryCount = memoryIntegrationService.getMemoryCount();
      const learningCount = memoryIntegrationService.getLearningHistoryCount();

      return {
        success: true,
        data: {
          memoryCount,
          learningCount,
          agentStatistics: stats,
        },
      };
    } catch (error) {
      console.error('[agentMemory.getMemoryStatistics] Error:', error);
      return {
        success: false,
        error: 'Failed to get memory statistics',
      };
    }
  }),

  /**
   * 全メモリを取得
   */
  getAllMemories: publicProcedure.query(async () => {
    try {
      const memories = memoryIntegrationService.getAllMemories();
      return {
        success: true,
        data: memories,
      };
    } catch (error) {
      console.error('[agentMemory.getAllMemories] Error:', error);
      return {
        success: false,
        error: 'Failed to get memories',
      };
    }
  }),

  /**
   * 全学習レコードを取得
   */
  getAllLearningRecords: publicProcedure.query(async () => {
    try {
      const records = memoryIntegrationService.getAllLearningRecords();
      return {
        success: true,
        data: records,
      };
    } catch (error) {
      console.error('[agentMemory.getAllLearningRecords] Error:', error);
      return {
        success: false,
        error: 'Failed to get learning records',
      };
    }
  }),

  /**
   * Agent別の成功率を取得
   */
  getAgentSuccessRate: publicProcedure
    .input((val: unknown) => {
      if (typeof val === 'object' && val !== null && 'agentType' in val) {
        return val as { agentType: string };
      }
      throw new Error('Invalid input');
    })
    .query(async ({ input }) => {
      try {
        const successRate = memoryIntegrationService.getAgentSuccessRate(input.agentType);
        const latestLearning = memoryIntegrationService.getLatestLearning(input.agentType);

        return {
          success: true,
          data: {
            agentType: input.agentType,
            successRate,
            latestLearning,
          },
        };
      } catch (error) {
        console.error('[agentMemory.getAgentSuccessRate] Error:', error);
        return {
          success: false,
          error: 'Failed to get agent success rate',
        };
      }
    }),

  /**
   * メモリ統計サマリーを取得
   */
  getMemorySummary: publicProcedure.query(async () => {
    try {
      const stats = memoryIntegrationService.getMemoryStatistics();
      const memoryCount = memoryIntegrationService.getMemoryCount();
      const learningCount = memoryIntegrationService.getLearningHistoryCount();

      // 各Agentの成功率を計算
      const agentSuccessRates: Record<string, number> = {};
      Object.keys(stats).forEach(agentType => {
        agentSuccessRates[agentType] = stats[agentType].successRate;
      });

      return {
        success: true,
        data: {
          totalMemories: memoryCount,
          totalLearningRecords: learningCount,
          agentCount: Object.keys(stats).length,
          agentSuccessRates,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('[agentMemory.getMemorySummary] Error:', error);
      return {
        success: false,
        error: 'Failed to get memory summary',
      };
    }
  }),

  /**
   * メモリをクリア（テスト用）
   */
  clearMemories: publicProcedure.mutation(async () => {
    try {
      memoryIntegrationService.clearMemories();
      return {
        success: true,
        message: 'Memories cleared',
      };
    } catch (error) {
      console.error('[agentMemory.clearMemories] Error:', error);
      return {
        success: false,
        error: 'Failed to clear memories',
      };
    }
  }),
});
