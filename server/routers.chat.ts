/**
 * Chat Router - 繝昴う繝昴うAI 繝√Ε繝・ヨ繝ｫ繝ｼ繧ｿ繝ｼ
 * ChatCore v1.0縺ｨ縺ｮtRPC邨ｱ蜷・
 */

import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { ChatCoreManager } from './core/ChatCoreManager';
import { PoipoiCodeAgent } from './core/PoipoiCodeAgent';

// 繧ｷ繝ｳ繧ｰ繝ｫ繝医Φ繧､繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ
let chatCoreManager: ChatCoreManager | null = null;

function getChatCoreManager(): ChatCoreManager {
  if (!chatCoreManager) {
    // Create mock managers for dependencies
    const mockAuditManager = {
      log: async (data: any) => {
        console.log('[Audit]', data);
      },
    };

    const mockApprovalManager = {
      requestApproval: async (data: any) => {
        return { approved: true };
      },
    };

    // Initialize managers with mock dependencies
    const memoryManager = {
      saveConversation: async (userId: string, messages: any[]) => {
        console.log(`[Memory] Saved ${messages.length} messages for user ${userId}`);
      },
      getRelatedMemories: async (userId: string, query: string) => {
        return [];
      },
      searchMemories: async (userId: string, query: string) => {
        return [];
      },
    } as any;

    const reasoningManager = {
      analyzeContext: async (input: string) => {
        return { reasoning: 'Context analyzed', confidence: 0.8 };
      },
    } as any;

    const manufacturingManager = {
      isManufacturingRelated: async (input: string) => {
        return false;
      },
    } as any;

    chatCoreManager = new ChatCoreManager(
      memoryManager,
      reasoningManager,
      null, // agentManager
      manufacturingManager,
      mockAuditManager,
      mockApprovalManager
    );
  }
  return chatCoreManager;
}

export const chatRouter = router({
  /**
   * 繝｡繝・そ繝ｼ繧ｸ繧貞・逅・
   * publicProcedure: 繝ｭ繧ｰ繧､繝ｳ縺ｪ縺励〒繧ゆｽｿ逕ｨ蜿ｯ閭ｽ (繝｢繝舌う繝ｫ繧｢繝励Μ蟇ｾ蠢・
   */
  processMessage: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        sessionId: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const manager = getChatCoreManager();
      const codeRequest =
        /(?:実装|追加|修正|変更|作成|開発|コード).*(?:して|してください|したい|お願い)/.test(
          input.message
        );

      if (codeRequest) {
        const result = await PoipoiCodeAgent.getInstance().execute(input.message);

        return {
          message: result.success
            ? result.changes?.map((c: any) => 実装完了: ).join("\n") ||
              "コード実装が完了しました。"
            : コード実装に失敗しました: ,
          session: null,
          relatedMemories: [],
          reasoning: null,
        };
      }

      try {
        const response = await manager.processMessage(
          input.userId,
          input.sessionId,
          input.message
        );

        return {
          message: response.message,
          session: response.session,
          relatedMemories: response.relatedMemories,
          reasoning: response.reasoning,
        };
      } catch (error) {
        console.error('Chat processing error:', error);
        throw error;
      }
    }),

  /**
   * 繧ｻ繝・す繝ｧ繝ｳ諠・ｱ繧貞叙蠕・
   */
  getSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const manager = getChatCoreManager();

      try {
        const messages = await manager.getChatHistory(input.userId, input.sessionId);

        return {
          messages,
        };
      } catch (error) {
        console.error('Session fetch error:', error);
        throw error;
      }
    }),

  /**
   * 繧ｻ繝・す繝ｧ繝ｳ繝｡繝・そ繝ｼ繧ｸ繧貞叙蠕・
   */
  getMessages: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.string(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const manager = getChatCoreManager();

      try {
        const messages = await manager.getChatHistory(
          input.userId,
          input.sessionId,
          input.limit
        );

        return messages;
      } catch (error) {
        console.error('Messages fetch error:', error);
        throw error;
      }
    }),

  /**
   * 繧ｻ繝・す繝ｧ繝ｳ繧剃ｽ懈・
   */
  createSession: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const manager = getChatCoreManager();

      try {
        const session = await manager.createSession(
          input.userId,
          input.title || '繝√Ε繝・ヨ繧ｻ繝・す繝ｧ繝ｳ'
        );

        return session;
      } catch (error) {
        console.error('Session creation error:', error);
        throw error;
      }
    }),

  /**
   * 繧ｻ繝・す繝ｧ繝ｳ繧貞炎髯､
   */
  deleteSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const manager = getChatCoreManager();

      try {
        await manager.deleteSession(input.userId, input.sessionId);
        return { success: true };
      } catch (error) {
        console.error('Session deletion error:', error);
        throw error;
      }
    }),

  /**
   * 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ繧ｻ繝・す繝ｧ繝ｳ荳隕ｧ繧貞叙蠕・
   */
  getUserSessions: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const manager = getChatCoreManager();

      try {
        const sessions = await manager.getUserSessions(input.userId);

        return sessions;
      } catch (error) {
        console.error('User sessions fetch error:', error);
        throw error;
      }
    }),

  /**
   * 繝√Ε繝・ヨ邨ｱ險医ｒ蜿門ｾ・
   */
  getStatistics: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const manager = getChatCoreManager();

      try {
        const stats = await manager.getChatStatistics(input.userId);
        return stats;
      } catch (error) {
        console.error('Statistics fetch error:', error);
        throw error;
      }
    }),
});


