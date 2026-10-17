import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { ChatCoreManager } from './core/ChatCoreManager';
import { PoipoiCodeAgent } from './core/PoipoiCodeAgent';
import { ChatQualityService } from './managers/ChatQualityService';
import { getDb } from './db';
import { feedback } from '../drizzle/schema';
import { v4 as uuidv4 } from 'uuid';

let chatCoreManager: ChatCoreManager | null = null;
const chatQualityService = new ChatQualityService();

function getChatCoreManager(): ChatCoreManager {
  if (!chatCoreManager) {
    const mockAuditManager = {
      log: async (data: any) => console.log('[Audit]', data),
    };

    const mockApprovalManager = {
      requestApproval: async (data: any) => ({ approved: true }),
    };

    const memoryManager = {
      saveConversation: async (userId: string, messages: any[]) => {
        console.log(`[Memory] Saved ${messages.length} messages for user ${userId}`);
      },
      getRelatedMemories: async () => [],
      searchMemories: async () => [],
    } as any;

    const reasoningManager = {
      analyzeContext: async () => ({
        reasoning: 'Context analyzed',
        confidence: 0.8,
      }),
    } as any;

    const manufacturingManager = {
      isManufacturingRelated: async () => false,
    } as any;

    chatCoreManager = new ChatCoreManager(
      memoryManager,
      reasoningManager,
      null,
      manufacturingManager,
      mockAuditManager,
      mockApprovalManager
    );
  }

  return chatCoreManager;
}

export const chatRouter = router({
  processMessage: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        sessionId: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const codeRequest =
          /(?:\u5B9F\u88C5|\u8FFD\u52A0|\u4FEE\u6B63|\u5909\u66F4|\u4F5C\u6210|\u958B\u767A|\u76F4\u3057\u3066|\u6539\u4FEE|\u6A5F\u80FD)/.test(input.message) &&
          /(?:\u30D5\u30A1\u30A4\u30EB|\u30B3\u30FC\u30C9|\u6A5F\u80FD|\u5B9A\u6570|\u95A2\u6570|\u5B9F\u88C5)/.test(input.message);
        if (codeRequest) {
          if (ctx.user?.role !== 'admin') {
            throw new TRPCError({
              code: ctx.user ? 'FORBIDDEN' : 'UNAUTHORIZED',
              message: 'コード変更機能は管理者のみ利用できます',
            });
          }

          const result = await PoipoiCodeAgent.getInstance().execute(
            input.message
          );

          let message = "Code implementation failed.";

          if (result.success) {
            if (result.changes && result.changes.length > 0) {
              message = result.changes
                .map((change) => "Implementation complete: " + change.path)
                .join("\\n");
            } else {
              message = "Code implementation completed.";
            }
          } else if (result.error) {
            message = "Code implementation failed: " + result.error;
          }

          return {
            message,
            session: null,
            relatedMemories: [],
            reasoning: null,
          };
        }

        const manager = getChatCoreManager();

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

  getSession: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        sessionId: z.string(),
      })
    )
    .query(async ({ input }) =>
      getChatCoreManager().getSession(input.userId, input.sessionId)
    ),

  getMessages: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        sessionId: z.string(),
      })
    )
    .query(async ({ input }) =>
      getChatCoreManager().getMessages(input.userId, input.sessionId)
    ),

  createSession: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ input }) =>
      getChatCoreManager().createSession(input.userId, input.title || "チャットセッション")
    ),

  deleteSession: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        sessionId: z.string(),
      })
    )
    .mutation(async ({ input }) =>
      getChatCoreManager().deleteSession(input.userId, input.sessionId)
    ),

  getUserSessions: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) =>
      getChatCoreManager().getUserSessions(input.userId)
    ),

  getStatistics: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) =>
      getChatCoreManager().getChatStatistics(input.userId)
    ),

  reportResponseIssue: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().min(1),
        messageId: z.string().min(1),
        issueType: z.enum(['irrelevant', 'unclear', 'unhelpful']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = String(ctx.user.id);
      const messages = await getChatCoreManager().getMessages(userId, input.sessionId);
      const message = messages.find((item) => item.id === input.messageId);

      if (!message || message.userId !== userId || message.role !== 'assistant') {
        throw new Error('回答が見つからないか、報告する権限がありません');
      }

      const db = await getDb();
      if (!db) {
        throw new Error('フィードバックを保存できません');
      }

      const description = `チャット回答の問題報告: ${input.issueType} (messageId: ${input.messageId})`;
      await db.insert(feedback).values({
        id: uuidv4(),
        type: 'bug',
        title: `チャット回答の報告: ${input.issueType}`,
        message: description,
        email: null,
        userId: ctx.user.id,
        status: 'new',
      });

      return chatQualityService.reportChatIssue(
        input.messageId,
        input.issueType,
        description
      );
    }),
});







