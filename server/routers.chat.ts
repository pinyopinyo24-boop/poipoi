/**
 * Chat Router - ポイポイAI チャットルーター
 * ChatCore v1.0とのtRPC統合
 */

<<<<<<< HEAD
import { router, protectedProcedure } from './_core/trpc';
=======
import { router, protectedProcedure, publicProcedure } from './_core/trpc';
>>>>>>> phase13-18
import { z } from 'zod';
import { ChatCoreManager } from './core/ChatCoreManager';

// シングルトンインスタンス
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
   * メッセージを処理
<<<<<<< HEAD
   */
  processMessage: protectedProcedure
=======
   * publicProcedure: ログインなしでも使用可能 (モバイルアプリ対応)
   */
  processMessage: publicProcedure
>>>>>>> phase13-18
    .input(
      z.object({
        userId: z.string(),
        sessionId: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const manager = getChatCoreManager();

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
   * セッション情報を取得
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
   * セッションメッセージを取得
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
   * セッションを作成
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
          input.title || 'チャットセッション'
        );

        return session;
      } catch (error) {
        console.error('Session creation error:', error);
        throw error;
      }
    }),

  /**
   * セッションを削除
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
   * ユーザーのセッション一覧を取得
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
   * チャット統計を取得
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
