import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { ChatCoreManager } from './core/ChatCoreManager';
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
      requestApproval: async (data: any) => ({ approved: false }),
    };

    const memoryManager = {
      saveConversation: async (userId: string, messages: Array<{ id: string; role: string; content: string }>) => {
        const { syncUserPoiPoiUnifiedState } = await import('./core/PoiPoiUnifiedStateStore');
        const records = messages.map(message => ({
          id: 'conversation-' + message.id,
          category: 'memory' as const,
          origin: 'pc' as const,
          updatedAt: Date.now(),
          value: JSON.stringify({ role: message.role, content: message.content.slice(0, 2000) }),
        }));
        if (records.length) await syncUserPoiPoiUnifiedState(userId, { version: 1, records });
      },
      getRelatedMemories: async (userId: string, query: string) => {
        const { searchUserPoiPoiMemories } = await import('./core/PoiPoiUnifiedStateStore');
        return (await searchUserPoiPoiMemories(userId, query, 8)).map(record => record.value);
      },
      searchMemories: async (userId: string, query: string) => {
        const { searchUserPoiPoiMemories } = await import('./core/PoiPoiUnifiedStateStore');
        return (await searchUserPoiPoiMemories(userId, query, 8)).map(record => record.value);
      },
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
        // All explicit tools share the authenticated unified router.
        const command = input.message.trim();
        const codeRequest = /^(?:PoiPoiコードエージェント|コードエージェント)[：:\s]+(?:実装|修正|変更|作成|追加|改修)/u.test(command);
        const explicitToolRequest = command.match(/^PoiPoiツール[：:\s]+(分析|原価|製造記録|製造一覧|資料作成|コード確認|コード適用|Excel|PDF|資料分析|複数資料|PPT出力|製造分析)[：:\s]+([\s\S]+)$/u);
        // Natural-language read-only discovery uses the same authenticated tool API.
        // Mutating operations remain explicit and require their existing approvals.
        const naturalManufacturingList = /^(?:製造(?:記録|履歴|データ)?|生産(?:記録|履歴|データ)?)(?:の)?(?:一覧|リスト)(?:を)?(?:見せて|表示して|教えて|確認したい|出して)[。！!]?$/u.test(command);
        // Extract explicitly labeled amounts in any order; never infer missing values.
        const costIntent = /(?:原価|差異)/u.test(command) && /(?:計算|比較|分析|差異)/u.test(command);
        const estimatedMatch = command.match(/(?:見積(?:もり)?(?:単価|原価)?|予定原価)[：:=\s]*(\d+(?:\.\d+)?)\s*円?/u);
        const actualMatch = command.match(/(?:実際(?:単価|原価)?|実績原価)[：:=\s]*(\d+(?:\.\d+)?)\s*円?/u);
        const quantityMatch = command.match(/(?:数量|個数|生産数)[：:=\s]*(\d+(?:\.\d+)?)\s*個?/u);
        const naturalCostArgs = costIntent && estimatedMatch && actualMatch && quantityMatch
          ? {
              estimated: Number(estimatedMatch[1]),
              actual: Number(actualMatch[1]),
              quantity: Number(quantityMatch[1]),
            }
          : null;
        // Read-only natural-language tool routing. Mutations still require explicit commands.
        const readOnlyIntent = /(?:見せて|表示して|一覧|リスト|確認したい|教えて|調べて|探して|どれ|ある[？?]?)/u.test(command);
        const naturalTool = !explicitToolRequest && !codeRequest && readOnlyIntent
          ? /(?:Excel|エクセル|PDF|資料|ファイル|文書)(?:の)?(?:一覧|リスト|どれ|ある)/iu.test(command)
            ? '資料一覧'
            : /(?:PowerPoint|パワーポイント|PPT|プレゼン)(?:の)?(?:一覧|リスト|どれ|ある)/iu.test(command)
              ? 'PPT一覧'
              : /(?:在庫|棚卸|発注|欠品)/u.test(command) && /(?:一覧|リスト|確認|見せて|表示|教えて)/u.test(command)
                ? '在庫一覧'
                : null
          : null;
        const toolRequest = explicitToolRequest ?? (naturalManufacturingList
          ? ['製造一覧', '製造一覧', ''] as RegExpMatchArray
          : naturalCostArgs ? ['原価', '原価', JSON.stringify(naturalCostArgs)] as RegExpMatchArray : null);
        if (codeRequest || toolRequest || naturalTool || /^PoiPoiツール[：:\s]+製造一覧\s*$/u.test(command)) {
          if (!ctx.user) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'ツール利用にはログインが必要です' });
          }
          const userId = String(ctx.user.id);
          const repository = (await import('./repositories/ChatRepository')).getSharedChatRepository();
          const session = await repository.getSession(input.sessionId);
          if (!session || session.userId !== userId) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'チャットセッションが見つかりません' });
          }
          const { unifiedToolsRouter } = await import('./routers/unifiedTools');
          const caller = unifiedToolsRouter.createCaller(ctx);
          let result: unknown;
          if (naturalTool === '資料一覧') {
            result = await caller.listOfficeDocuments();
          } else if (naturalTool === 'PPT一覧') {
            result = await caller.listOfficePresentations();
          } else if (naturalTool === '在庫一覧') {
            const records = await caller.listManufacturingRecords();
            result = records.map(record => ({ itemId: record.itemId, stockQuantity: record.stockQuantity ?? null, reorderLevel: record.reorderLevel ?? null, reorderRequired: record.reorderRequired, updatedAt: record.updatedAt }));
          } else if (toolRequest?.[1] === 'コード適用') {
            if (ctx.user.role !== 'admin') {
              throw new TRPCError({ code: 'FORBIDDEN', message: 'コード変更機能は管理者のみ利用できます' });
            }
            const args = z.object({
              previewId: z.string().uuid(),
              confirm: z.literal('APPLY_AND_VERIFY'),
            }).parse(JSON.parse(toolRequest[2]));
            result = await caller.applyCodePreview(args);
          } else if (codeRequest || toolRequest?.[1] === 'コード確認') {
            if (ctx.user.role !== 'admin') {
              throw new TRPCError({ code: 'FORBIDDEN', message: 'コード変更機能は管理者のみ利用できます' });
            }
            result = await caller.codePreview({ request: codeRequest ? command : toolRequest![2] });
          } else if (toolRequest?.[1] === '分析') {
            result = await caller.reason({ prompt: toolRequest[2] });
          } else if (toolRequest?.[1] === 'Excel') {
            result = await caller.excel({ file: toolRequest[2].trim() });
          } else if (toolRequest?.[1] === 'PDF') {
            result = await caller.pdf({ file: toolRequest[2].trim() });
          } else if (toolRequest?.[1] === '資料分析') {
            const args = z.object({
              file: z.string().min(1), type: z.enum(['xlsx', 'pdf']), question: z.string().min(1),
            }).parse(JSON.parse(toolRequest[2]));
            result = await caller.analyzeDocument(args);
          } else if (toolRequest?.[1] === '複数資料') {
            const args = z.object({
              files: z.array(z.object({ file: z.string().min(1), type: z.enum(['xlsx', 'pdf']) })).min(2).max(6),
              question: z.string().min(1),
            }).parse(JSON.parse(toolRequest[2]));
            result = await caller.analyzeMultipleDocuments(args);
          } else if (toolRequest?.[1] === 'PPT出力') {
            result = await caller.exportPresentation({ id: toolRequest[2].trim() });
          } else if (toolRequest?.[1] === '製造分析') {
            const args = z.object({
              estimatedUnitCost: z.number().nonnegative(), actualUnitCost: z.number().nonnegative(),
              quantity: z.number().positive(), producedUnits: z.number().nonnegative().optional(),
              plannedUnits: z.number().positive().optional(), stockQuantity: z.number().nonnegative().optional(),
              reorderLevel: z.number().nonnegative().optional(), unitPrice: z.number().nonnegative().optional(),
            }).parse(JSON.parse(toolRequest[2]));
            result = await caller.analyzeManufacturing(args);
          } else if (toolRequest?.[1] === '原価') {
            const args = z.object({ estimated: z.number().finite(), actual: z.number().finite(), quantity: z.number().positive().finite() }).parse(JSON.parse(toolRequest![2]));
            result = await caller.analyzeCost(args);
          } else if (toolRequest?.[1] === '製造記録') {
            const args = z.object({
              itemId: z.string().min(1).max(120), estimatedUnitCost: z.number().nonnegative(),
              actualUnitCost: z.number().nonnegative(), quantity: z.number().positive(),
              stockQuantity: z.number().nonnegative().optional(), reorderLevel: z.number().nonnegative().optional(),
            }).parse(JSON.parse(toolRequest![2]));
            result = await caller.saveManufacturingRecord(args);
          } else if (toolRequest?.[1] === '製造一覧' || /^PoiPoiツール[：:\s]+製造一覧\s*$/u.test(command)) {
            result = await caller.listManufacturingRecords();
          } else if (toolRequest?.[1] === '資料作成') {
            const args = z.object({ title: z.string().min(1), analysis: z.string().min(1) }).parse(JSON.parse(toolRequest![2]));
            result = await caller.createPresentationFromAnalysis(args);
          } else {
            throw new TRPCError({ code: 'BAD_REQUEST', message: '未対応のツールです' });
          }
          const timestamp = Date.now();
          const toolUserId = uuidv4();
          await repository.saveMessage({ id: toolUserId, userId, role: 'user', content: command, timestamp }, input.sessionId);
          const message = {
            id: uuidv4(), userId, role: 'assistant' as const,
            content: toolRequest?.[1] === 'PPT出力'
              ? JSON.stringify({ status: 'generated', format: 'pptx', note: 'Retrieve the file via unifiedTools.exportPresentation; binary data is not stored in chat.' })
              : (codeRequest || toolRequest?.[1] === 'コード確認')
                ? JSON.stringify({
                    previewId: (result as { previewId?: string }).previewId,
                    expiresInSeconds: (result as { expiresInSeconds?: number }).expiresInSeconds,
                    changes: (result as { changes?: Array<{ path: string; baseHash?: string; proposedHash?: string }> }).changes?.map(
                      change => ({ path: change.path, baseHash: change.baseHash, proposedHash: change.proposedHash })
                    ),
                    applied: false,
                    tested: false,
                    note: 'Review the full preview via unifiedTools.codePreview before approval.',
                  })
                : toolRequest?.[1] === 'コード適用'
                  ? JSON.stringify({
                      success: (result as { success?: boolean }).success === true,
                      tested: (result as { tested?: boolean }).tested === true,
                      error: (result as { error?: string }).error,
                    })
                  : JSON.stringify(result, null, 2).slice(0, 20000),
            timestamp: Date.now(),
          };
          await repository.saveMessage(message, input.sessionId);
          // Store a bounded, user-scoped tool outcome for subsequent AI reasoning.
          try {
            const { syncUserPoiPoiUnifiedState } = await import('./core/PoiPoiUnifiedStateStore');
            await syncUserPoiPoiUnifiedState(userId, {
              version: 1,
              records: [{
                id: 'tool-' + message.id,
                category: 'memory',
                origin: 'pc',
                updatedAt: Date.now(),
                value: JSON.stringify({
                  command: command.slice(0, 800),
                  outcome: codeRequest || toolRequest?.[1] === 'コード確認'
                    ? 'Code preview generated; not applied'
                    : toolRequest?.[1] === 'コード適用'
                      ? message.content.slice(0, 1500)
                    : toolRequest?.[1] === 'PPT出力'
                      ? 'PowerPoint export generated'
                      : message.content.slice(0, 1500),
                }).slice(0, 3000),
              }],
            });
          } catch (error) {
            console.warn('[PoiPoi] Tool outcome memory sync skipped:', error);
          }
          return { message, session, relatedMemories: [], reasoning: 'Unified tools execution' };
        }

        // Mobile chat can use its own session without a login.
        // Explicit tools above retain their existing authorization checks.
        const userId = ctx.user ? String(ctx.user.id) : input.userId;
        if (!ctx.user && userId !== 'mobile') {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'このセッションは利用できません' });
        }
        const manager = getChatCoreManager();
        const repository = (await import("./repositories/ChatRepository")).getSharedChatRepository();
        const existingSession = await repository.getSession(input.sessionId);
        if (!existingSession || existingSession.userId !== userId) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'チャットセッションが見つかりません' });
        }

        const { PoiPoiIdentity } = await import("./core/PoiPoiIdentity");

        const originalMessage = input.message.trim();
        // AI and user identity are distinct, including corrections.
        const userRename = originalMessage.match(/^(?:私の名前は|わたしの名前は|僕の名前は|俺の名前は|私の名前を|私を)[「『"]?(.{1,40}?)[」』"]?(?:です|だよ|にして|と呼んで|にしてください)?[。！!]*$/u);
        const aiRename = originalMessage.match(/^(?:あなたの名前|AIの名前|AZの呼び名)(?:を|は)[ \\t]*[「『"]?(.{1,40}?)[」』"]?[ \\t]*(?:にして|に変更して|に変えて|です|だよ|と呼んで|にしてください)[。！!]*$/u);
        // Reconcile the Android identity record without overwriting a newer PC identity.
        if (ctx.user) {
          const { getUserPoiPoiUnifiedState } = await import('./core/PoiPoiUnifiedStateStore');
          const syncedName = (await getUserPoiPoiUnifiedState(userId)).records.find(
            record => record.id === 'az:user-name' && record.category === 'memory'
          );
          if (syncedName?.value && !PoiPoiIdentity.getUserName(userId)) {
            PoiPoiIdentity.setUserName(userId, syncedName.value);
          }
          const syncedAI = (await getUserPoiPoiUnifiedState(userId)).records.find(
            record => record.id === 'az:ai-name' && record.category === 'memory'
          );
          // Unified state is authoritative after Android/PC synchronization.
          // Refresh even when an older per-user name is cached on this PC.
          if (syncedAI?.value && PoiPoiIdentity.getAIName(userId) !== syncedAI.value) {
            PoiPoiIdentity.setAIName(userId, syncedAI.value);
          }
        }
        let directAnswer: string | undefined;
        if (/^(?:これからは|今後は)?名前は[「『"]?.{1,40}?(?:です|だよ|にして)[。！!]*$/u.test(originalMessage)) {
          directAnswer = '変更するのは、あなたの名前ですか？ それともAIの名前ですか？';
        } else if (/^(?:私|わたし|僕|俺)の名前(?:は|って)?[？?]$/u.test(originalMessage)) {
          const name = PoiPoiIdentity.getUserName(userId);
          directAnswer = name ? `あなたの名前は「${name}」です。` : 'あなたの名前はまだ登録されていません。何とお呼びすればよいですか？';
        } else if (/^(?:あなた|AI|AZ)の名前(?:は|って)?[？?]$/u.test(originalMessage) || /^名前は[？?]$/u.test(originalMessage)) {
          directAnswer = `私の名前は「${PoiPoiIdentity.getAIName(userId)}」です。`;
        } else if (userRename) {
          const name = PoiPoiIdentity.setUserName(userId, userRename[1].trim());
          if (ctx.user) {
            const { syncUserPoiPoiUnifiedState } = await import('./core/PoiPoiUnifiedStateStore');
            await syncUserPoiPoiUnifiedState(userId, {
              version: 1,
              records: [{ id: 'az:user-name', category: 'memory', value: name, updatedAt: Date.now(), origin: 'pc' }],
            });
          }
          directAnswer = `あなたの名前を「${name}」として覚えました。`;
        } else if (aiRename) {
          const aiName = PoiPoiIdentity.setAIName(userId, aiRename[1].trim());
          if (ctx.user) {
            const { syncUserPoiPoiUnifiedState } = await import('./core/PoiPoiUnifiedStateStore');
            await syncUserPoiPoiUnifiedState(userId, {
              version: 1,
              records: [{ id: 'az:ai-name', category: 'memory', value: aiName, updatedAt: Date.now(), origin: 'pc' }],
            });
          }
          directAnswer = `AIの名前を「${aiName}」に変更しました。`;
        }
        if (directAnswer !== undefined) {
          await repository.saveMessage({ id: uuidv4(), userId, role: 'user', content: originalMessage, timestamp: Date.now() }, input.sessionId);
          const message = { id: uuidv4(), userId, role: 'assistant' as const, content: directAnswer, timestamp: Date.now() };
          await repository.saveMessage(message, input.sessionId);
          return { message, session: existingSession, relatedMemories: [], reasoning: 'AZ identity memory' };
        }

        const mobileHistory = (input.context?.poipoiConversation ?? [])
          .filter(turn => (turn.role === 'user' || turn.role === 'assistant') && typeof turn.content === 'string')
          .slice(-12)
          .map(turn => ({ role: turn.role, content: turn.content.slice(0, 1000) }));
        const response = await manager.processMessage(
          userId,
          input.sessionId,
          originalMessage,
          mobileHistory
        );

        // Persist a bounded, per-user conversation summary for tool and agent context.
        if (ctx.user) {
          try {
            const { syncUserPoiPoiUnifiedState } = await import('./core/PoiPoiUnifiedStateStore');
            await syncUserPoiPoiUnifiedState(userId, {
              version: 1,
              records: [{
                id: 'chat-' + response.message.id,
                category: 'memory',
                origin: 'pc',
                updatedAt: Date.now(),
                value: JSON.stringify({ request: originalMessage.slice(0, 1200), answer: response.message.content.slice(0, 1200) }),
              }],
            });
          } catch (error) {
            console.warn('[PoiPoi] Unified memory sync skipped:', error);
          }
        }

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
        if (existing && existing.userId !== userId) {
          console.warn('[PoiPoi] Ignored mobile history sync for a session owned by another user');
          continue;
        }
        const previous = existing ? await repository.getMessages(conversation.id, 100000) : [];
        const known = new Set(previous.map(m => m.id));
        const existingTurns = previous.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp }));
        await repository.saveSession({
          id: conversation.id,
          userId,
          title: existing?.title ?? conversation.title,
          createdAt: existing?.createdAt ?? Date.now(),
          updatedAt: Math.max(existing?.updatedAt ?? 0, Math.min(Date.parse(conversation.updatedAt) || Date.now(), Date.now())),
          messageCount: previous.length,
        });
        for (const message of conversation.messages) {
          if (!message.id.trim() || !message.content.trim() || known.has(message.id)) continue;
          const parsedTime = Date.parse(message.timestamp);
          const timestamp = Number.isFinite(parsedTime) ? Math.min(parsedTime, Date.now()) : Date.now();
          if (existingTurns.some(turn => turn.role === message.role && turn.content === message.content && Math.abs(turn.timestamp - timestamp) < 120000)) {
            known.add(message.id);
            continue;
          }
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

  // Deterministic offline retrieval benchmark; no model calls or training are triggered.
  evaluateLearning: publicProcedure
    .input(z.object({
      examples: z.array(z.object({
        question: z.string().min(1).max(1000),
        expectedAnswer: z.string().min(1).max(3000),
      })).min(1).max(100),
    }))
    .mutation(async ({ input }) => {
      const { LearningContextIntegration } = await import('./core/LearningContextIntegration');
      return new LearningContextIntegration(process.cwd()).evaluateKnowledge(input.examples);
    }),

  // Shared feedback endpoint for desktop and Android chat clients.
  submitLearningFeedback: publicProcedure
    .input(z.object({
      sessionId: z.string().min(1),
      messageId: z.string().min(1),
      accepted: z.boolean(),
      correction: z.string().trim().min(1).max(3000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = String(ctx.user?.id ?? "mobile");
      const repository = (await import('./repositories/ChatRepository')).getSharedChatRepository();
      const session = await repository.getSession(input.sessionId);
      if (!session || session.userId !== userId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'チャットセッションが見つかりません' });
      }
      const messages = await repository.getMessages(input.sessionId, 100000);
      const index = messages.findIndex(item => item.id === input.messageId);
      const answer = messages[index];
      if (!answer || answer.userId !== userId || answer.role !== 'assistant') {
        throw new TRPCError({ code: 'NOT_FOUND', message: '対象のAI回答が見つかりません' });
      }
      const question = messages.slice(0, index).reverse().find(item => item.role === 'user');
      if (!question || question.userId !== userId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '対応する質問が見つかりません' });
      }
      const { recordLearningFeedback } = await import('./core/LearningContextIntegration');
      await recordLearningFeedback(question.content, answer.content, input.accepted, input.correction, userId);
      if (!input.accepted && input.correction) {
        const { syncUserPoiPoiUnifiedState } = await import('./core/PoiPoiUnifiedStateStore');
        await syncUserPoiPoiUnifiedState(userId, {
          version: 1,
          records: [{
            id: 'correction-' + input.messageId,
            category: 'learning',
            origin: 'pc',
            updatedAt: Date.now(),
            value: JSON.stringify({
              question: question.content.slice(0, 1200),
              correction: input.correction.slice(0, 2000),
              priority: 'explicit_user_correction',
            }),
          }],
        });
      }
      return { success: true, learned: true };
    }),

  reportResponseIssue: publicProcedure
    .input(
      z.object({
        sessionId: z.string().min(1),
        messageId: z.string().min(1),
        issueType: z.enum(['irrelevant', 'unclear', 'unhelpful']),
        correction: z.string().trim().min(1).max(3000).optional(),
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
        userId: typeof ctx.user?.id === "number" ? ctx.user.id : null,
        status: 'new',
      });

      // Negative feedback must reach the same learning store used by local AI recall.
      const previous = messages
        .filter(item => item.timestamp < message.timestamp && item.role === 'user')
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      if (previous?.content && message.content) {
        try {
          const { recordLearningFeedback } = await import('./core/LearningContextIntegration');
          await recordLearningFeedback(previous.content, message.content, false, input.correction, userId);
        } catch (error) {
          console.warn('[PoiPoi Learning] Response issue not recorded:', error);
        }
      }
      return chatQualityService.reportChatIssue(
        input.messageId,
        input.issueType,
        description
      );
    }),
});







