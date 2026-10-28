import { recordLearningFeedback } from "./LearningContextIntegration";
import { LearningContextIntegration } from "./LearningContextIntegration";
import { enrichPromptWithLearning } from "./LearningContextIntegration";
import { PoipoiCodeAgent } from "./PoipoiCodeAgent";
/**
 * ChatCoreManager - 郢晄亢縺・ｹ晄亢縺・I 郢昶・ﾎ慕ｹ昴・繝ｨ郢ｧ・ｳ郢ｧ・｢
 * AI邵ｺ謔滂ｽｮ貊・怙邵ｺ・ｫ闔ｨ螟奇ｽｩ・ｱ陷ｿ・ｯ髢ｭ・ｽ邵ｺ・ｫ邵ｺ蜷ｶ・狗ｹｧ・ｳ郢ｧ・｢陞ｳ貅ｯ・｣繝ｻ
 */

import { MemoryIntelligenceAIManager } from './MemoryIntelligenceAIManager';
import { ReasoningAIManager } from './ReasoningAIManager';
import { ManufacturingIntelligenceAIManager } from './ManufacturingIntelligenceAIManager';
import { ChatService } from '../services/ChatService';
import { MessageProcessingService } from '../services/MessageProcessingService';
import { ContextAwarenessService } from '../services/ContextAwarenessService';
import { ChatRepository , getSharedChatRepository } from '../repositories/ChatRepository';
import { getAICore, initializeAICore } from '../_core/ai/AICore';

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    managerUsed?: string[];
    reasoning?: string;
    confidence?: number;
    manufacturingContext?: boolean;
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export interface ChatResponse {
  message: ChatMessage;
  session: ChatSession;
  relatedMemories?: string[];
  reasoning?: string;
}

export class ChatCoreManager {
  private isCodeImplementationRequest(message: string): boolean {
    return /菫ｮ豁｣|謾ｹ蝟л螟画峩|菴懈・|繧ｳ繝ｼ繝・/.test(message);
  }

  private async executeCodeImplementationRequest(message: string): Promise<string> {
    const result = await PoipoiCodeAgent.getInstance().execute(message);
    if (!result.success) {
      return `郢ｧ・ｳ郢晢ｽｼ郢晉甥・ｮ貅ｯ・｣繝ｻ竊楢棔・ｱ隰ｨ蜉ｱ・邵ｺ・ｾ邵ｺ蜉ｱ笳・ ${result.error ?? "闕ｳ閧ｴ繝ｻ邵ｺ・ｪ郢ｧ・ｨ郢晢ｽｩ郢晢ｽｼ"}`;
    }
    return JSON.stringify(result, null, 2);
  }

  private chatService: ChatService;
  private messageProcessingService: MessageProcessingService;
  private contextAwarenessService: ContextAwarenessService;
  private chatRepository: ChatRepository;

  constructor(
    private memoryManager: MemoryIntelligenceAIManager,
    private reasoningManager: ReasoningAIManager,
    private agentManager: any,
    private manufacturingManager: ManufacturingIntelligenceAIManager,
    private auditManager: any,
    private approvalManager: any
  ) {
    this.chatService = new ChatService();
    this.messageProcessingService = new MessageProcessingService(
      this.reasoningManager,
      this.agentManager
    );
    this.contextAwarenessService = new ContextAwarenessService(
      this.memoryManager
    );
    this.chatRepository = getSharedChatRepository();
  }

  /**
   * 郢昶・ﾎ慕ｹ昴・繝ｨ郢晢ｽ｡郢昴・縺晉ｹ晢ｽｼ郢ｧ・ｸ郢ｧ雋槭・騾・・・邵ｺ・ｦ陟｢諛・ｽｭ譁撰ｽ帝墓ｻ薙・
   */
  async processMessage(
    userId: string,
    sessionId: string,
    userMessage: string
  ): Promise<ChatResponse> {
    const storedSession = await this.chatRepository.getSession(sessionId);
    if (!storedSession || storedSession.userId !== userId) {
      throw new Error('Chat session not found');
    }
    // 1. 郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼ郢晢ｽ｡郢昴・縺晉ｹ晢ｽｼ郢ｧ・ｸ郢ｧ蜑・ｽｿ譎擾ｽｭ繝ｻ
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_user`,
      userId,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };

    await this.chatRepository.saveMessage(userMsg, sessionId);

    // 2. 郢ｧ・ｳ郢晢ｽｳ郢昴・縺冗ｹｧ・ｹ郢昜ｺ･蜿呵墓圜・ｼ蛹ｻﾎ鍋ｹ晢ｽ｢郢晢ｽｪ邵ｺ荵晢ｽ蛾ｫ｢・｢鬨ｾ・｣隲繝ｻ・ｰ・ｱ郢ｧ雋槫徐陟墓圜・ｼ繝ｻ
    const context = await this.contextAwarenessService.getContext(
      userId,
      userMessage
    );

    // 3. 郢晢ｽ｡郢昴・縺晉ｹ晢ｽｼ郢ｧ・ｸ陷・ｽｦ騾・・・ｼ蝓溯ｳ髫ｲ謔ｶ繝ｻ郢ｧ・ｨ郢晢ｽｼ郢ｧ・ｸ郢ｧ・ｧ郢晢ｽｳ郢晏沺・ｴ・ｻ騾包ｽｨ繝ｻ繝ｻ
    /* STEP8_FEEDBACK */
    const correction = userMessage.match(/正しくは[、,：:\s]*([\s\S]+)/u);
    if (correction?.[1]?.trim()) {
      const previousAssistant = [...(context?.messages ?? [])]
        .reverse()
        .find((m: any) => m.role === "assistant");

      const previousUser = [...(context?.messages ?? [])]
        .reverse()
        .find((m: any) => m.role === "user");

      if (previousAssistant && previousUser) {
        try {
          await recordLearningFeedback(
            previousUser.content,
            previousAssistant.content,
            false,
            correction[1].trim()
          );
        } catch (error) {
          console.warn("[PoiPoi Learning] Feedback skipped:", error);
        }
      }
    }

    const processedResult = await this.messageProcessingService.processMessage(
      userMessage,
      context
    );

    // 4. 陟｢諛・ｽｭ逧ｮ蜃ｽ隰後・
    const responseContent = await this.generateResponse(
      userMessage,
      processedResult,
      context,
      sessionId
    );

    // 5. 陟｢諛・ｽｭ譁石鍋ｹ昴・縺晉ｹ晢ｽｼ郢ｧ・ｸ郢ｧ蜑・ｽｽ諛医・
    /* STEP6: explicit feedback only */
    const assistantMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_assistant`,
      userId,
      role: 'assistant',
      content: responseContent,
      timestamp: Date.now(),
      metadata: {
        managerUsed: processedResult.managersUsed,
        reasoning: processedResult.reasoning,
        confidence: processedResult.confidence,
        manufacturingContext: processedResult.isManufacturingRelated,
      },
    };

    await this.chatRepository.saveMessage(assistantMsg, sessionId);

    // 6. 郢晢ｽ｡郢晢ｽ｢郢晢ｽｪ邵ｺ・ｫ闔ｨ螟奇ｽｩ・ｱ郢ｧ蜑・ｽｿ譎擾ｽｭ繝ｻ
    if (this.memoryManager && typeof (this.memoryManager as any).saveConversation === 'function') {
      try {
        await (this.memoryManager as any).saveConversation(userId, [userMsg, assistantMsg]);
      } catch (error) {
        console.warn('[PoiPoi] Conversation memory save failed:', error);
      }
    }

    // 7. 騾ｶ・｣隴滂ｽｻ郢晢ｽｭ郢ｧ・ｰ
    await this.auditManager.log({
      action: 'chat_message_processed',
      userId,
      sessionId,
      details: {
        messageLength: userMessage.length,
        managersUsed: processedResult.managersUsed,
      },
    });

    // 8. 郢ｧ・ｻ郢昴・縺咏ｹ晢ｽｧ郢晢ｽｳ隲繝ｻ・ｰ・ｱ郢ｧ雋槫徐陟輔・
    const sessionData = await this.chatRepository.getSession(sessionId);
    const session = sessionData || {
      id: sessionId,
      userId,
      title: 'Chat Session',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 1,
    };

    return {
      message: assistantMsg,
      session,
      relatedMemories: context.relatedMemories,
      reasoning: processedResult.reasoning,
    };
  }

  /**
   * 陟｢諛・ｽｭ譁撰ｽ帝墓ｻ薙・
   */
  private async generateResponse(
    userMessage: string,
    processedResult: any,
    context: any,
    sessionId: string
  ): Promise<string> {
    try {
      // LLM API郢ｧ雋樔ｻ也ｸｺ・ｳ陷・ｽｺ邵ｺ繝ｻ
      // A manufacturing topic alone is not a request to run a production analysis.
      // Route ordinary questions about costs, processes and quality through the LLM.
      if (processedResult.isManufacturingRelated &&
          /(?:生産分析を実行|製造分析を実行|工程分析を実行)/.test(userMessage) &&
          typeof this.manufacturingManager?.analyzeProduction === 'function') {
        const manufacturingAnalysis = await this.manufacturingManager.analyzeProduction(processedResult.manufacturingData || {});
        return this.formatManufacturingResponse(userMessage, manufacturingAnalysis);
      }

      const learnedMessage = await enrichPromptWithLearning(
        process.cwd(),
        userMessage
      );
      // Include recent real turns so follow-up questions and corrections retain context.
      const previous = await this.chatRepository.getMessages(sessionId, 24);
      const messages = previous
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-24)
        .map((m) => ({ role: m.role, content: m.content }));
      if (messages.length && messages[messages.length - 1].role === 'user') {
        messages[messages.length - 1].content = learnedMessage;
      } else {
        messages.push({ role: 'user', content: learnedMessage });
      }
      const aiCore = getAICore() ?? await initializeAICore();
      const aiMessage = await aiCore.invoke(messages);
      if (!aiMessage?.trim()) throw new Error('AI Core returned an empty response');
      return aiMessage;
    } catch (error) {
      console.error("[ChatCoreManager][LLM ERROR]", error);
      
      // 郢晁ｼ斐°郢晢ｽｼ郢晢ｽｫ郢晁・繝｣郢ｧ・ｯ: 陟墓瑳謫らｸｺ・ｮ陟｢諛・ｽｭ逧ｮ蜃ｽ隰後・
      // 髯ｬ・ｽ鬨ｾ・ｰ隶鯉ｽｭ鬮｢・｢鬨ｾ・｣邵ｺ・ｮ髮会ｽｪ陜荳翫・陜｣・ｴ陷ｷ繝ｻ


      // Do not disguise model failures as canned, unrelated answers.
      throw new Error('AI Core response failed; check the configured model and Ollama connection');
    }
  }

  /**
   * 髯ｬ・ｽ鬨ｾ・ｰ隶鯉ｽｭ鬮｢・｢鬨ｾ・｣邵ｺ・ｮ陟｢諛・ｽｭ譁撰ｽ堤ｹ晁ｼ斐°郢晢ｽｼ郢晄ｧｭ繝｣郢昴・
   */
  private formatManufacturingResponse(
    userMessage: string,
    analysis: any
  ): string {
    return `髯ｬ・ｽ鬨ｾ・ｰ隶鯉ｽｭ陋ｻ繝ｻ譴ｵ驍ｨ蜈域｣｡:\n${JSON.stringify(analysis, null, 2)}`;
  }

  /**
   * 隶灘綜・ｺ荵溷飭邵ｺ・ｪ陟｢諛・ｽｭ譁撰ｽ堤ｹ晁ｼ斐°郢晢ｽｼ郢晄ｧｭ繝｣郢昴・
   */
  private formatStandardResponse(
    userMessage: string,
    processedResult: any,
    context: any
  ): string {
    return `お問い合わせありがとうございます。\n\n${processedResult.response || "回答を生成できませんでした。"}`;
  }

  /**
   * 郢昶・ﾎ慕ｹ昴・繝ｨ郢ｧ・ｻ郢昴・縺咏ｹ晢ｽｧ郢晢ｽｳ郢ｧ蜑・ｽｽ諛医・
   */
  async getSession(userId: string, sessionId: string): Promise<any> {
    const session = await this.chatRepository.getSession(sessionId);
    const messages = session && session.userId === userId
      ? await this.chatRepository.getMessages(sessionId, 50)
      : [];

    return {
      ...(session || {
        id: sessionId,
        userId,
        title: '繝√Ε繝・ヨ繧ｻ繝・す繝ｧ繝ｳ',
        createdAt: new Date(),
        messageCount: 0,
      }),
      messages,
    };
  }
  async getMessages(userId: string, sessionId: string): Promise<any[]> {
    const session = await this.chatRepository.getSession(sessionId);
    if (!session || session.userId !== userId) return [];
    return this.chatRepository.getMessages(sessionId);
  }

  async getStatistics(userId: string): Promise<any> {
    return this.getChatStatistics(userId);
  }
  async createSession(userId: string, title: string): Promise<ChatSession> {
    const session: ChatSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    };

    await this.chatRepository.saveSession(session);

    // 騾ｶ・｣隴滂ｽｻ郢晢ｽｭ郢ｧ・ｰ
    await this.auditManager.log({
      action: 'chat_session_created',
      userId,
      details: { sessionId: session.id, title },
    });

    return session;
  }

  /**
   * 郢昶・ﾎ慕ｹ昴・繝ｨ陞ｻ・･雎・ｽｴ郢ｧ雋槫徐陟輔・
   */
  async getChatHistory(
    userId: string,
    sessionId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    const session = await this.chatRepository.getSession(sessionId);
    if (!session || session.userId !== userId) return [];
    return await this.chatRepository.getMessages(sessionId, limit);
  }

  /**
   * 郢晢ｽｦ郢晢ｽｼ郢ｧ・ｶ郢晢ｽｼ邵ｺ・ｮ郢ｧ・ｻ郢昴・縺咏ｹ晢ｽｧ郢晢ｽｳ闕ｳﾂ髫包ｽｧ郢ｧ雋槫徐陟輔・
   */
  async getUserSessions(userId: string): Promise<ChatSession[]> {
    return await this.chatRepository.getUserSessions(userId);
  }

  /**
   * 郢ｧ・ｻ郢昴・縺咏ｹ晢ｽｧ郢晢ｽｳ郢ｧ雋樒ｎ鬮ｯ・､
   */
  async deleteSession(userId: string, sessionId: string): Promise<{ success: boolean }> {
    const storedSession = await this.chatRepository.getSession(sessionId);
    if (!storedSession || storedSession.userId !== userId) {
      throw new Error('Chat session not found');
    }
    const approval = await this.approvalManager.requestApproval({
      action: 'delete_chat_session',
      userId,
      details: { sessionId },
    });

    if (!approval.approved) {
      throw new Error('Session deletion not approved');
    }

    await this.chatRepository.deleteSession(sessionId);

    await this.auditManager.log({
      action: 'chat_session_deleted',
      userId,
      details: { sessionId },
    });

    return { success: true };
  }
  async getChatStatistics(userId: string): Promise<any> {
    return await this.chatRepository.getUserStatistics(userId);
  }
}













