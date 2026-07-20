/**
 * ChatCoreManager - ポイポイAI チャットコア
 * AIが実際に会話可能にするコア実装
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
   * チャットメッセージを処理して応答を生成
   */
  async processMessage(
    userId: string,
    sessionId: string,
    userMessage: string
  ): Promise<ChatResponse> {
    // 1. ユーザーメッセージを保存
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_user`,
      userId,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };

    await this.chatRepository.saveMessage(userMsg, sessionId);

    // 2. コンテキスト取得（メモリから関連情報を取得）
    const context = await this.contextAwarenessService.getContext(
      userId,
      userMessage
    );

    // 3. メッセージ処理（推論・エージェント活用）
    const processedResult = await this.messageProcessingService.processMessage(
      userMessage,
      context
    );

    // 4. 応答生成
    const responseContent = await this.generateResponse(
      userMessage,
      processedResult,
      context
    );

    // 5. 応答メッセージを作成
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

    // 6. メモリに会話を保存
    if (this.memoryManager && typeof (this.memoryManager as any).saveConversation === 'function') {
      await (this.memoryManager as any).saveConversation(userId, [userMsg, assistantMsg]);
    }

    // 7. 監査ログ
    await this.auditManager.log({
      action: 'chat_message_processed',
      userId,
      sessionId,
      details: {
        messageLength: userMessage.length,
        managersUsed: processedResult.managersUsed,
      },
    });

    // 8. セッション情報を取得
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
   * 応答を生成
   */
  private async generateResponse(
    userMessage: string,
    processedResult: any,
    context: any
  ): Promise<string> {
    try {
      // LLM APIを呼び出し
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
      
      // フォールバック: 従来の応答生成
      // 製造業関連の質問の場合
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

      // 推論が必要な場合
      if (processedResult.requiresReasoning) {
        return processedResult.reasoning;
      }

      // 通常の応答
      return this.formatStandardResponse(userMessage, processedResult, context);
    }
  }

  /**
   * 製造業関連の応答をフォーマット
   */
  private formatManufacturingResponse(
    userMessage: string,
    analysis: any
  ): string {
    return `製造業分析結果:\n${JSON.stringify(analysis, null, 2)}`;
  }

  /**
   * 標準的な応答をフォーマット
   */
  private formatStandardResponse(
    userMessage: string,
    processedResult: any,
    context: any
  ): string {
    return `ご質問ありがとうございます。\n\n${processedResult.response || 'お答えします。'}`;
  }

  /**
   * チャットセッションを作成
   */
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

    // 監査ログ
    await this.auditManager.log({
      action: 'chat_session_created',
      userId,
      details: { sessionId: session.id, title },
    });

    return session;
  }

  /**
   * チャット履歴を取得
   */
  async getChatHistory(
    userId: string,
    sessionId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    return await this.chatRepository.getMessages(sessionId, limit);
  }

  /**
   * ユーザーのセッション一覧を取得
   */
  async getUserSessions(userId: string): Promise<ChatSession[]> {
    return await this.chatRepository.getUserSessions(userId);
  }

  /**
   * セッションを削除
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    // 承認が必要
    const approval = await this.approvalManager.requestApproval({
      action: 'delete_chat_session',
      userId,
      details: { sessionId },
    });

    if (!approval.approved) {
      throw new Error('Session deletion not approved');
    }

    await this.chatRepository.deleteSession(sessionId);

    // 監査ログ
    await this.auditManager.log({
      action: 'chat_session_deleted',
      userId,
      details: { sessionId },
    });
  }

  /**
   * チャット統計を取得
   */
  async getChatStatistics(userId: string): Promise<any> {
    return await this.chatRepository.getUserStatistics(userId);
  }
}
