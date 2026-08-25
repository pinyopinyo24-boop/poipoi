import { PoipoiCodeAgent } from "./PoipoiCodeAgent";
/**

import { PoipoiCodeAgent } from "./PoipoiCodeAgent";
 * ChatCoreManager - 繝昴う繝昴うAI 繝√Ε繝・ヨ繧ｳ繧｢
 * AI縺悟ｮ滄圀縺ｫ莨夊ｩｱ蜿ｯ閭ｽ縺ｫ縺吶ｋ繧ｳ繧｢螳溯｣・
 */

import { MemoryIntelligenceAIManager } from './MemoryIntelligenceAIManager';
import { ReasoningAIManager } from './ReasoningAIManager';
import { ManufacturingIntelligenceAIManager } from './ManufacturingIntelligenceAIManager';
import { ChatService } from '../services/ChatService';
import { MessageProcessingService } from '../services/MessageProcessingService';
import { ContextAwarenessService } from '../services/ContextAwarenessService';
import { ChatRepository } from '../repositories/ChatRepository';
import { invokeLLM } from '../_core/llm';

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
    return /修正|改善|変更|作成|コード/.test(message);
  }

  private async executeCodeImplementationRequest(message: string): Promise<string> {
    const result = await PoipoiCodeAgent.getInstance().execute(message);
    if (!result.success) {
      return `繧ｳ繝ｼ繝牙ｮ溯｣・↓螟ｱ謨励＠縺ｾ縺励◆: ${result.error ?? "荳肴・縺ｪ繧ｨ繝ｩ繝ｼ"}`;
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
    this.chatRepository = new ChatRepository();
  }

  /**
   * 繝√Ε繝・ヨ繝｡繝・そ繝ｼ繧ｸ繧貞・逅・＠縺ｦ蠢懃ｭ斐ｒ逕滓・
   */
  async processMessage(
    userId: string,
    sessionId: string,
    userMessage: string
  ): Promise<ChatResponse> {
    // 1. 繝ｦ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧剃ｿ晏ｭ・
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_user`,
      userId,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };

    await this.chatRepository.saveMessage(userMsg, sessionId);

    // 2. 繧ｳ繝ｳ繝・く繧ｹ繝亥叙蠕暦ｼ医Γ繝｢繝ｪ縺九ｉ髢｢騾｣諠・ｱ繧貞叙蠕暦ｼ・
    const context = await this.contextAwarenessService.getContext(
      userId,
      userMessage
    );

    // 3. 繝｡繝・そ繝ｼ繧ｸ蜃ｦ逅・ｼ域耳隲悶・繧ｨ繝ｼ繧ｸ繧ｧ繝ｳ繝域ｴｻ逕ｨ・・
    const processedResult = await this.messageProcessingService.processMessage(
      userMessage,
      context
    );

    // 4. 蠢懃ｭ皮函謌・
    const responseContent = await this.generateResponse(
      userMessage,
      processedResult,
      context
    );

    // 5. 蠢懃ｭ斐Γ繝・そ繝ｼ繧ｸ繧剃ｽ懈・
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

    // 6. 繝｡繝｢繝ｪ縺ｫ莨夊ｩｱ繧剃ｿ晏ｭ・
    if (this.memoryManager && typeof (this.memoryManager as any).saveConversation === 'function') {
      await (this.memoryManager as any).saveConversation(userId, [userMsg, assistantMsg]);
    }

    // 7. 逶｣譟ｻ繝ｭ繧ｰ
    await this.auditManager.log({
      action: 'chat_message_processed',
      userId,
      sessionId,
      details: {
        messageLength: userMessage.length,
        managersUsed: processedResult.managersUsed,
      },
    });

    // 8. 繧ｻ繝・す繝ｧ繝ｳ諠・ｱ繧貞叙蠕・
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
   * 蠢懃ｭ斐ｒ逕滓・
   */
  private async generateResponse(
    userMessage: string,
    processedResult: any,
    context: any
  ): Promise<string> {
    try {
      // LLM API繧貞他縺ｳ蜃ｺ縺・
      if (processedResult.isManufacturingRelated) {
        const manufacturingAnalysis = await this.manufacturingManager.analyzeProduction(processedResult.manufacturingData || {});
        return this.formatManufacturingResponse(userMessage, manufacturingAnalysis);
      }

      const llmResult = await invokeLLM({
        messages: [
          {
            role: "user",
            content: userMessage
          }
        ]
      });

      const aiMessage = llmResult.choices[0]?.message?.content || "LLM応答なし";
      return aiMessage;
    } catch (error) {
      console.error("[ChatCoreManager][LLM ERROR]", error);
      
      // 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ: 蠕捺擂縺ｮ蠢懃ｭ皮函謌・
      // 陬ｽ騾讌ｭ髢｢騾｣縺ｮ雉ｪ蝠上・蝣ｴ蜷・
      if (processedResult.isManufacturingRelated) {
        const manufacturingAnalysis =
          await this.manufacturingManager.analyzeProduction(
            processedResult.manufacturingData || {}
          );
        return this.formatManufacturingResponse(
          userMessage,
          manufacturingAnalysis
        );
      }

      // 謗ｨ隲悶′蠢・ｦ√↑蝣ｴ蜷・
      if (processedResult.requiresReasoning) {
        return processedResult.reasoning;
      }

      // 騾壼ｸｸ縺ｮ蠢懃ｭ・
      return this.formatStandardResponse(userMessage, processedResult, context);
    }
  }

  /**
   * 陬ｽ騾讌ｭ髢｢騾｣縺ｮ蠢懃ｭ斐ｒ繝輔か繝ｼ繝槭ャ繝・
   */
  private formatManufacturingResponse(
    userMessage: string,
    analysis: any
  ): string {
    return `陬ｽ騾讌ｭ蛻・梵邨先棡:\n${JSON.stringify(analysis, null, 2)}`;
  }

  /**
   * 讓呎ｺ也噪縺ｪ蠢懃ｭ斐ｒ繝輔か繝ｼ繝槭ャ繝・
   */
  private formatStandardResponse(
    userMessage: string,
    processedResult: any,
    context: any
  ): string {
    return `お問い合わせありがとうございます。\n\n${processedResult.response || "回答を生成できませんでした。"}`;
  }

  /**
   * 繝√Ε繝・ヨ繧ｻ繝・す繝ｧ繝ｳ繧剃ｽ懈・
   */
  async getSession(userId: string, sessionId: string): Promise<any> {
    return this.chatRepository.getSession(sessionId);
  }

  async getMessages(userId: string, sessionId: string): Promise<any[]> {
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

    // 逶｣譟ｻ繝ｭ繧ｰ
    await this.auditManager.log({
      action: 'chat_session_created',
      userId,
      details: { sessionId: session.id, title },
    });

    return session;
  }

  /**
   * 繝√Ε繝・ヨ螻･豁ｴ繧貞叙蠕・
   */
  async getChatHistory(
    userId: string,
    sessionId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    return await this.chatRepository.getMessages(sessionId, limit);
  }

  /**
   * 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ繧ｻ繝・す繝ｧ繝ｳ荳隕ｧ繧貞叙蠕・
   */
  async getUserSessions(userId: string): Promise<ChatSession[]> {
    return await this.chatRepository.getUserSessions(userId);
  }

  /**
   * 繧ｻ繝・す繝ｧ繝ｳ繧貞炎髯､
   */
  async deleteSession(userId: string, sessionId: string): Promise<{ success: boolean }> {
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











