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
        context: z.object({
          poipoiConversation: z.array(z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string(),
          })).max(12).optional(),
          source: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Only explicit agent commands may modify code; ordinary feature questions stay in chat.
        const codeRequest = /^(?:PoiPoiコードエージェント|コードエージェント)[：:\s]+(?:実装|修正|変更|作成|追加|改修)/u.test(input.message.trim());
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

        const userId = String(ctx.user?.id ?? "mobile");
        const manager = getChatCoreManager();
        const repository = (await import("./repositories/ChatRepository")).getSharedChatRepository();
        const existingSession = await repository.getSession(input.sessionId);
        if (!existingSession || existingSession.userId !== userId) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'チャットセッションが見つかりません' });
        }

        const { PoiPoiIdentity } = await import("./core/PoiPoiIdentity");

        const originalMessage = input.message.trim();
        const rename = originalMessage.match(
          /^(?:(?:これからは|今後は|あなたの)[ \t]*)?(?:名前|呼び名)(?:を|は)[ \t]*[「『"]?(.{1,40}?)[」』"]?[ \t]*(?:にして|に変更して|に変えて|です|だよ|と呼んで|にしてください)[。！!]*$/u
        );
        if (originalMessage === '名前は？' || originalMessage === 'あなたの名前は？') {
          await repository.saveMessage({ id: `identity_user_${Date.now()}`, userId, role: 'user', content: originalMessage, timestamp: Date.now() }, input.sessionId);
          const reply = {
            message: {
              id: 'identity_' + Date.now(),
              userId,
              role: 'assistant' as const,
              content: '私の名前は「' + PoiPoiIdentity.getName() + '」です。',
              timestamp: Date.now(),
            },
            session: existingSession,
            relatedMemories: [],
            reasoning: 'Identity lookup',
          };
          await repository.saveMessage(reply.message, input.sessionId);
          return reply;
        }
        if (rename) {
          await repository.saveMessage({ id: `rename_user_${Date.now()}`, userId, role: 'user', content: originalMessage, timestamp: Date.now() }, input.sessionId);
          const newName = PoiPoiIdentity.setName(rename[1].trim());
          const reply = {
            message: {
              id: `rename_${Date.now()}`,
              userId,
              role: 'assistant' as const,
              content: `名前を「${newName}」に変更しました。`,
              timestamp: Date.now(),
            },
            session: existingSession,
            relatedMemories: [],
            reasoning: 'Identity updated',
          };
          await repository.saveMessage(reply.message, input.sessionId);
          return reply;
        }

        const response = await manager.processMessage(
          userId,
          input.sessionId,
          originalMessage
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
    .query(async ({ ctx, input }) => {
      const userId = String(ctx.user?.id ?? "mobile");
      const repository = (await import("./repositories/ChatRepository")).getSharedChatRepository();
      const stored = await repository.getSession(input.sessionId);
      if (!stored || stored.userId !== userId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'チャットセッションが見つかりません' });
      }
      const session = await getChatCoreManager().getSession(userId, input.sessionId);
      if (!session || session.userId !== userId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'チャットセッションが見つかりません' });
      }
      return { ...session, messages: session.messages.filter((message: { userId: string }) => message.userId === userId) };
    }),

  syncHistory: publicProcedure
    .input(z.object({
      conversations: z.array(z.object({
        id: z.string().trim().min(1).max(200),
        title: z.string().max(200),
        updatedAt: z.string().max(50),
        messages: z.array(z.object({
          id: z.string().trim().min(1).max(200),
          role: z.enum(["user", "assistant"]),
          content: z.string().max(100000),
          timestamp: z.string().max(50),
        })).max(200),
      })).max(10),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = String(ctx.user?.id ?? "mobile");
      const repository = (await import("./repositories/ChatRepository")).getSharedChatRepository();
      for (const conversation of input.conversations) {
        if (!conversation.id.trim() || conversation.messages.length === 0) continue;
        const existing = await repository.getSession(conversation.id);
        if (existing && existing.userId !== userId) continue;
        const previous = await repository.getMessages(conversation.id, 100000);
        const known = new Set(previous.map(m => m.id));
        const existingTurns = previous.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp }));
        await repository.saveSession({
          id: conversation.id,
          userId,
          title: conversation.title,
          createdAt: existing?.createdAt ?? Date.now(),
          updatedAt: Math.max(existing?.updatedAt ?? 0, Date.parse(conversation.updatedAt) || Date.now()),
          messageCount: previous.length,
        });
        for (const message of conversation.messages) {
          if (!message.id.trim() || !message.content.trim() || known.has(message.id)) continue;
          const timestamp = Date.parse(message.timestamp) || Date.now();
          if (existingTurns.some(turn => turn.role === message.role && turn.content === message.content && Math.abs(turn.timestamp - timestamp) < 120000)) continue;
          await repository.saveMessage({
            id: message.id,
            userId,
            role: message.role,
            content: message.content,
            timestamp,
          }, conversation.id);
          known.add(message.id);
          existingTurns.push({ role: message.role, content: message.content, timestamp });
        }
      }
      return { success: true };
    }),
  getSessions: publicProcedure
    .query(async ({ ctx }) => {
      const repository = (await import("./repositories/ChatRepository")).getSharedChatRepository();
      return repository.getUserSessions(String(ctx.user?.id ?? "mobile"));
    }),
  getMessages: publicProcedure
    .input(z.object({ userId: z.string(), sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const repository = (await import("./repositories/ChatRepository")).getSharedChatRepository();
      const session = await repository.getSession(input.sessionId);
      if (!session || session.userId !== String(ctx.user?.id ?? "mobile")) return [];
      return repository.getMessages(input.sessionId, 100000);
    }),
  createSession: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) =>
      getChatCoreManager().createSession(String(ctx.user?.id ?? "mobile"), input.title || "チャットセッション")
    ),

  deleteSession: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        sessionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = String(ctx.user?.id ?? "mobile");
      const manager = getChatCoreManager();
      const session = await (await import('./repositories/ChatRepository')).getSharedChatRepository().getSession(input.sessionId);
      if (!session || session.userId !== userId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'チャットセッションが見つかりません' });
      }
      return manager.deleteSession(userId, input.sessionId);
    }),

  getUserSessions: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ ctx }) =>
      getChatCoreManager().getUserSessions(String(ctx.user?.id ?? "mobile"))
    ),

  getStatistics: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ ctx }) =>
      getChatCoreManager().getChatStatistics(String(ctx.user?.id ?? "mobile"))
    ),

  reportResponseIssue: publicProcedure
    .input(
      z.object({
        sessionId: z.string().min(1),
        messageId: z.string().min(1),
        issueType: z.enum(['irrelevant', 'unclear', 'unhelpful']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = String(ctx.user?.id ?? "mobile");
      const repository = (await import('./repositories/ChatRepository')).getSharedChatRepository();
      const session = await repository.getSession(input.sessionId);
      if (!session || session.userId !== userId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'チャットセッションが見つかりません' });
      }
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
        userId: ctx.user?.id ?? "mobile",
        status: 'new',
      });

      return chatQualityService.reportChatIssue(
        input.messageId,
        input.issueType,
        description
      );
    }),
});







