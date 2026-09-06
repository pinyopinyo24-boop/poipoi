import { PoipoiCodeAgent } from "./PoipoiCodeAgent";
/**

import { PoipoiCodeAgent } from "./PoipoiCodeAgent";
 * ChatCoreManager - 鬩幢ｽ｢隴弱・・ｺ・｢驍ｵ・ｺ郢晢ｽｻ繝ｻ・ｹ隴弱・・ｺ・｢驍ｵ・ｺ郢晢ｽｻI 鬩幢ｽ｢隴擾ｽｶ郢晢ｽｻ繝ｻ蜿悶・繝ｻ・ｹ隴擾ｽｴ郢晢ｽｻ驛｢譎｢・ｽ・ｨ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｳ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・｢
 * AI鬩搾ｽｵ繝ｻ・ｺ髫ｰ逍ｲ・ｻ繧托ｽｽ・ｽ繝ｻ・ｮ髮狗ｿｫ繝ｻ隲､蜥弱＠繝ｻ・ｺ郢晢ｽｻ繝ｻ・ｫ鬮｣雋ｻ・ｽ・ｨ髯樊ｺｷ・･繝ｻ・ｽ・ｽ繝ｻ・ｩ郢晢ｽｻ繝ｻ・ｱ鬮ｯ・ｷ繝ｻ・ｿ郢晢ｽｻ繝ｻ・ｯ鬯ｮ・｢繝ｻ・ｭ郢晢ｽｻ繝ｻ・ｽ鬩搾ｽｵ繝ｻ・ｺ郢晢ｽｻ繝ｻ・ｫ鬩搾ｽｵ繝ｻ・ｺ髯ｷ・ｷ繝ｻ・ｶ郢晢ｽｻ霑｢證ｦ・ｽ・ｹ繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｳ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・｢鬮ｯ讖ｸ・ｽ・ｳ髮九・・ｽ・ｯ郢晢ｽｻ繝ｻ・｣驛｢譎｢・ｽ・ｻ
 */

import { MemoryIntelligenceAIManager } from './MemoryIntelligenceAIManager';
import { ReasoningAIManager } from './ReasoningAIManager';
import { ManufacturingIntelligenceAIManager } from './ManufacturingIntelligenceAIManager';
import { ChatService } from '../services/ChatService';
import { MessageProcessingService } from '../services/MessageProcessingService';
import { ContextAwarenessService } from '../services/ContextAwarenessService';
import { ChatRepository } from '../repositories/ChatRepository';
import { aiProviderManager } from '../ai/AIProviderManager';

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
    return /髣厄ｽｫ繝ｻ・ｮ髮弱・・ｽ・｣|髫ｰ・ｾ繝ｻ・ｹ髯懈ｸ呻ｽｻ髯樊ｺｽ蛻､陝ｲ・ｩ|髣厄ｽｴ隲帛現繝ｻ|驛｢・ｧ繝ｻ・ｳ驛｢譎｢・ｽ・ｼ驛｢譏ｴ繝ｻ/.test(message);
  }

  private async executeCodeImplementationRequest(message: string): Promise<string> {
    const result = await PoipoiCodeAgent.getInstance().execute(message);
    if (!result.success) {
      return `鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｳ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｼ鬩幢ｽ｢隴手・讚ｨ郢晢ｽｻ繝ｻ・ｮ髮九・・ｽ・ｯ郢晢ｽｻ繝ｻ・｣驛｢譎｢・ｽ・ｻ驕ｶ鬆托ｽ･・｢隴ｽ譁舌・繝ｻ・ｱ鬮ｫ・ｰ繝ｻ・ｨ髯ｷ莨夲ｽｽ・ｱ郢晢ｽｻ繝ｻ・ｰ鬩搾ｽｵ繝ｻ・ｺ郢晢ｽｻ繝ｻ・ｾ鬩搾ｽｵ繝ｻ・ｺ髯ｷ莨夲ｽｽ・ｱ髫ｨ・ｳ郢晢ｽｻ ${result.error ?? "鬮｣蛹・ｽｽ・ｳ鬮｢・ｧ繝ｻ・ｴ驛｢譎｢・ｽ・ｻ鬩搾ｽｵ繝ｻ・ｺ郢晢ｽｻ繝ｻ・ｪ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｨ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｩ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｼ"}`;
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
   * 鬩幢ｽ｢隴擾ｽｶ郢晢ｽｻ繝ｻ蜿悶・繝ｻ・ｹ隴擾ｽｴ郢晢ｽｻ驛｢譎｢・ｽ・ｨ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・｡鬩幢ｽ｢隴擾ｽｴ郢晢ｽｻ驍ｵ・ｺ隴惹ｼ夲ｽｽ・ｹ隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｼ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｸ鬩幢ｽ｢繝ｻ・ｧ鬮ｮ蛹ｺ・ｧ・ｭ郢晢ｽｻ鬯ｨ・ｾ郢晢ｽｻ郢晢ｽｻ郢晢ｽｻ繝ｻ・ｰ鬩搾ｽｵ繝ｻ・ｺ郢晢ｽｻ繝ｻ・ｦ鬮ｯ貊ゑｽｽ・｢髫ｲ蟶吶・繝ｻ・ｽ繝ｻ・ｭ髫ｴ竏ｵ閻ｸ繝ｻ・ｽ陝ｶ謨鳴陟・屮・ｽ・ｻ髦ｮ蜷ｶ繝ｻ
   */
  async processMessage(
    userId: string,
    sessionId: string,
    userMessage: string
  ): Promise<ChatResponse> {
    // 1. 鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｦ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｼ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｶ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｼ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・｡鬩幢ｽ｢隴擾ｽｴ郢晢ｽｻ驍ｵ・ｺ隴惹ｼ夲ｽｽ・ｹ隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｼ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｸ鬩幢ｽ｢繝ｻ・ｧ髯ｷ莉｣繝ｻ繝ｻ・ｽ繝ｻ・ｿ髫ｴ蜿門ｾ励・・ｽ繝ｻ・ｭ驛｢譎｢・ｽ・ｻ
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_user`,
      userId,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };

    await this.chatRepository.saveMessage(userMsg, sessionId);

    // 2. 鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｳ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｳ鬩幢ｽ｢隴擾ｽｴ郢晢ｽｻ驍ｵ・ｺ陷證ｦ・ｽ・ｹ繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｹ鬩幢ｽ｢隴乗・・ｽ・ｺ繝ｻ・･髯ｷ・ｿ陷ｻ・ｵ繝ｻ・ｰ陟・§諠ｧ郢晢ｽｻ繝ｻ・ｼ髯具ｽｹ繝ｻ・ｻ繝ｻ譛ｱ雎ｪ繝ｻ・ｹ隴趣ｽ｢繝ｻ・ｽ繝ｻ・｢鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｪ鬩搾ｽｵ繝ｻ・ｺ髣包ｽｵ隴趣ｽ｢繝ｻ・ｽ髯具ｽｾ繝ｻ・ｫ繝ｻ・｢郢晢ｽｻ繝ｻ・｢鬯ｯ・ｨ繝ｻ・ｾ郢晢ｽｻ繝ｻ・｣鬮ｫ・ｲ繝ｻ・ｰ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｰ郢晢ｽｻ繝ｻ・ｱ鬩幢ｽ｢繝ｻ・ｧ鬮ｮ蛹ｺ・ｧ・ｫ陟募ｮ｣霎ｧ陟・§諠ｧ郢晢ｽｻ繝ｻ・ｼ驛｢譎｢・ｽ・ｻ
    const context = await this.contextAwarenessService.getContext(
      userId,
      userMessage
    );

    // 3. 鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・｡鬩幢ｽ｢隴擾ｽｴ郢晢ｽｻ驍ｵ・ｺ隴惹ｼ夲ｽｽ・ｹ隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｼ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｸ鬮ｯ・ｷ郢晢ｽｻ繝ｻ・ｽ繝ｻ・ｦ鬯ｨ・ｾ郢晢ｽｻ郢晢ｽｻ郢晢ｽｻ繝ｻ・ｼ髯懈瑳・ｺ・ｯ・つ繝ｻ・ｳ鬯ｮ・ｫ繝ｻ・ｲ髫ｰ雋ｻ・ｽ・ｶ驛｢譎｢・ｽ・ｻ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｨ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｼ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｸ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｧ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｳ鬩幢ｽ｢隴惹ｹ暦ｽｲ・ｺ郢晢ｽｻ繝ｻ・ｴ郢晢ｽｻ繝ｻ・ｻ鬯ｨ・ｾ陋ｹ繝ｻ・ｽ・ｽ繝ｻ・ｨ驛｢譎｢・ｽ・ｻ驛｢譎｢・ｽ・ｻ
    const processedResult = await this.messageProcessingService.processMessage(
      userMessage,
      context
    );

    // 4. 鬮ｯ貊ゑｽｽ・｢髫ｲ蟶吶・繝ｻ・ｽ繝ｻ・ｭ鬨ｾ・ｧ繝ｻ・ｮ髯ｷ繝ｻ・ｽ・ｽ鬮ｫ・ｰ陟募ｾ後・
    const responseContent = await this.generateResponse(
      userMessage,
      processedResult,
      context
    );

    // 5. 鬮ｯ貊ゑｽｽ・｢髫ｲ蟶吶・繝ｻ・ｽ繝ｻ・ｭ髫ｴ竏ｫ豬ｹ鬪ｰ蜈ｷ・ｽ・ｹ隴擾ｽｴ郢晢ｽｻ驍ｵ・ｺ隴惹ｼ夲ｽｽ・ｹ隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｼ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｸ鬩幢ｽ｢繝ｻ・ｧ髯ｷ莉｣繝ｻ繝ｻ・ｽ繝ｻ・ｽ髫ｲ蟶帷樟郢晢ｽｻ
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

    // 6. 鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・｡鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・｢鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｪ鬩搾ｽｵ繝ｻ・ｺ郢晢ｽｻ繝ｻ・ｫ鬮｣雋ｻ・ｽ・ｨ髯樊ｺｷ・･繝ｻ・ｽ・ｽ繝ｻ・ｩ郢晢ｽｻ繝ｻ・ｱ鬩幢ｽ｢繝ｻ・ｧ髯ｷ莉｣繝ｻ繝ｻ・ｽ繝ｻ・ｿ髫ｴ蜿門ｾ励・・ｽ繝ｻ・ｭ驛｢譎｢・ｽ・ｻ
    if (this.memoryManager && typeof (this.memoryManager as any).saveConversation === 'function') {
      await (this.memoryManager as any).saveConversation(userId, [userMsg, assistantMsg]);
    }

    // 7. 鬯ｨ・ｾ繝ｻ・ｶ郢晢ｽｻ繝ｻ・｣鬮ｫ・ｴ雋翫ｑ・ｽ・ｽ繝ｻ・ｻ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｭ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｰ
    await this.auditManager.log({
      action: 'chat_message_processed',
      userId,
      sessionId,
      details: {
        messageLength: userMessage.length,
        managersUsed: processedResult.managersUsed,
      },
    });

    // 8. 鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｻ鬩幢ｽ｢隴擾ｽｴ郢晢ｽｻ驍ｵ・ｺ陷･謫ｾ・ｽ・ｹ隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｧ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｳ鬮ｫ・ｲ繝ｻ・ｰ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｰ郢晢ｽｻ繝ｻ・ｱ鬩幢ｽ｢繝ｻ・ｧ鬮ｮ蛹ｺ・ｧ・ｫ陟募ｮ｣霎ｧ髴域鱒繝ｻ
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
   * 鬮ｯ貊ゑｽｽ・｢髫ｲ蟶吶・繝ｻ・ｽ繝ｻ・ｭ髫ｴ竏ｵ閻ｸ繝ｻ・ｽ陝ｶ謨鳴陟・屮・ｽ・ｻ髦ｮ蜷ｶ繝ｻ
   */
  private async generateResponse(
    userMessage: string,
    processedResult: any,
    context: any
  ): Promise<string> {
    try {
      // LLM API鬩幢ｽ｢繝ｻ・ｧ鬮ｮ蛹ｺ・ｨ雋ｻ・ｽ・ｻ闕ｵ貊ゑｽｽ・ｸ繝ｻ・ｺ郢晢ｽｻ繝ｻ・ｳ鬮ｯ・ｷ郢晢ｽｻ繝ｻ・ｽ繝ｻ・ｺ鬩搾ｽｵ繝ｻ・ｺ驛｢譎｢・ｽ・ｻ
      if (processedResult.isManufacturingRelated) {
        const manufacturingAnalysis = await this.manufacturingManager.analyzeProduction(processedResult.manufacturingData || {});
        return this.formatManufacturingResponse(userMessage, manufacturingAnalysis);
      }

      const aiMessage = await aiProviderManager.invoke([
        {
          role: "system",
          content: "あなたはポイポイのローカルAIです。日本語で回答してください。",
        },
        {
          role: "user",
          content: userMessage,
        },
      ]);
      
      // 鬩幢ｽ｢隴弱・・ｽ・ｼ隴・搨・ｰ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｼ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｫ鬩幢ｽ｢隴寂・繝ｻ驛｢譎｢・ｽ・｣鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｯ: 鬮ｯ貅ｷ・｢骰玖｢夜垈・ｫ郢ｧ莨夲ｽｽ・ｸ繝ｻ・ｺ郢晢ｽｻ繝ｻ・ｮ鬮ｯ貊ゑｽｽ・｢髫ｲ蟶吶・繝ｻ・ｽ繝ｻ・ｭ鬨ｾ・ｧ繝ｻ・ｮ髯ｷ繝ｻ・ｽ・ｽ鬮ｫ・ｰ陟募ｾ後・
      // 鬯ｮ・ｯ繝ｻ・ｬ郢晢ｽｻ繝ｻ・ｽ鬯ｯ・ｨ繝ｻ・ｾ郢晢ｽｻ繝ｻ・ｰ鬮ｫ・ｶ鬲・ｼ夲ｽｽ・ｽ繝ｻ・ｭ鬯ｯ・ｮ繝ｻ・｢郢晢ｽｻ繝ｻ・｢鬯ｯ・ｨ繝ｻ・ｾ郢晢ｽｻ繝ｻ・｣鬩搾ｽｵ繝ｻ・ｺ郢晢ｽｻ繝ｻ・ｮ鬯ｮ・ｮ闔ｨ螟ｲ・ｽ・ｽ繝ｻ・ｪ鬮ｯ諛ｶ・｣・ｰ髣包ｽｳ驗呻ｽｫ郢晢ｽｻ鬮ｯ諛ｶ・ｽ・｣郢晢ｽｻ繝ｻ・ｴ鬮ｯ・ｷ繝ｻ・ｷ驛｢譎｢・ｽ・ｻ
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

      // 鬮ｫ・ｰ隴会ｽｦ繝ｻ・ｽ繝ｻ・ｨ鬯ｮ・ｫ繝ｻ・ｲ髫ｰ雋ｻ・ｽ・ｶ驕ｯ・ｶ繝ｻ・ｲ鬮ｯ貊ゑｽｽ・｢驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｦ驕ｶ荳橸ｽ｣・ｺ郢晢ｽｻ鬮ｯ諛ｶ・ｽ・｣郢晢ｽｻ繝ｻ・ｴ鬮ｯ・ｷ繝ｻ・ｷ驛｢譎｢・ｽ・ｻ
      if (processedResult.requiresReasoning) {
        return processedResult.reasoning;
      }

      // 鬯ｯ・ｨ繝ｻ・ｾ髯橸ｽ｢繝ｻ・ｼ郢晢ｽｻ繝ｻ・ｸ郢晢ｽｻ繝ｻ・ｸ鬩搾ｽｵ繝ｻ・ｺ郢晢ｽｻ繝ｻ・ｮ鬮ｯ貊ゑｽｽ・｢髫ｲ蟶吶・繝ｻ・ｽ繝ｻ・ｭ驛｢譎｢・ｽ・ｻ
      return this.formatStandardResponse(userMessage, processedResult, context);
    }
  }

  /**
   * 鬯ｮ・ｯ繝ｻ・ｬ郢晢ｽｻ繝ｻ・ｽ鬯ｯ・ｨ繝ｻ・ｾ郢晢ｽｻ繝ｻ・ｰ鬮ｫ・ｶ鬲・ｼ夲ｽｽ・ｽ繝ｻ・ｭ鬯ｯ・ｮ繝ｻ・｢郢晢ｽｻ繝ｻ・｢鬯ｯ・ｨ繝ｻ・ｾ郢晢ｽｻ繝ｻ・｣鬩搾ｽｵ繝ｻ・ｺ郢晢ｽｻ繝ｻ・ｮ鬮ｯ貊ゑｽｽ・｢髫ｲ蟶吶・繝ｻ・ｽ繝ｻ・ｭ髫ｴ竏ｵ閻ｸ繝ｻ・ｽ陜｣・､繝ｻ・ｹ隴弱・・ｽ・ｼ隴・搨・ｰ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｼ鬩幢ｽ｢隴弱・・ｽ・ｧ繝ｻ・ｭ驛｢譎｢・ｽ・｣鬩幢ｽ｢隴擾ｽｴ郢晢ｽｻ
   */
  private formatManufacturingResponse(
    userMessage: string,
    analysis: any
  ): string {
    return `鬯ｮ・ｯ繝ｻ・ｬ郢晢ｽｻ繝ｻ・ｽ鬯ｯ・ｨ繝ｻ・ｾ郢晢ｽｻ繝ｻ・ｰ鬮ｫ・ｶ鬲・ｼ夲ｽｽ・ｽ繝ｻ・ｭ鬮ｯ蜈ｷ・ｽ・ｻ驛｢譎｢・ｽ・ｻ髫ｴ・ｴ繝ｻ・ｵ鬯ｩ謳ｾ・ｽ・ｨ髯ｷ莠･豐ｺ繝ｻ・｣繝ｻ・｡:\n${JSON.stringify(analysis, null, 2)}`;
  }

  /**
   * 鬮ｫ・ｶ霓｣蛟｡・ｶ諛翫・繝ｻ・ｺ髣包ｽｵ雋・ｽｷ鬯滂ｽｭ鬩搾ｽｵ繝ｻ・ｺ郢晢ｽｻ繝ｻ・ｪ鬮ｯ貊ゑｽｽ・｢髫ｲ蟶吶・繝ｻ・ｽ繝ｻ・ｭ髫ｴ竏ｵ閻ｸ繝ｻ・ｽ陜｣・､繝ｻ・ｹ隴弱・・ｽ・ｼ隴・搨・ｰ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｼ鬩幢ｽ｢隴弱・・ｽ・ｧ繝ｻ・ｭ驛｢譎｢・ｽ・｣鬩幢ｽ｢隴擾ｽｴ郢晢ｽｻ
   */
  private formatStandardResponse(
    userMessage: string,
    processedResult: any,
    context: any
  ): string {
    return `邵ｺ髮∵牒邵ｺ繝ｻ邊狗ｹｧ荳岩雷邵ｺ繧・ｽ顔ｸｺ蠕娯・邵ｺ繝ｻ・・ｸｺ謔ｶ・樒ｸｺ・ｾ邵ｺ蜷ｶﾂ繝ｻn\n${processedResult.response || "陜玲ｨ抵ｽｭ譁撰ｽ帝墓ｻ薙・邵ｺ・ｧ邵ｺ髦ｪ竏ｪ邵ｺ蟶呻ｽ鍋ｸｺ・ｧ邵ｺ蜉ｱ笳・ｸｲ繝ｻ}`;
  }

  /**
   * 鬩幢ｽ｢隴擾ｽｶ郢晢ｽｻ繝ｻ蜿悶・繝ｻ・ｹ隴擾ｽｴ郢晢ｽｻ驛｢譎｢・ｽ・ｨ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｻ鬩幢ｽ｢隴擾ｽｴ郢晢ｽｻ驍ｵ・ｺ陷･謫ｾ・ｽ・ｹ隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｧ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｳ鬩幢ｽ｢繝ｻ・ｧ髯ｷ莉｣繝ｻ繝ｻ・ｽ繝ｻ・ｽ髫ｲ蟶帷樟郢晢ｽｻ
   */
  async getSession(userId: string, sessionId: string): Promise<any> {
    const session = await this.chatRepository.getSession(sessionId);
    const messages = await this.chatRepository.getMessages(sessionId, 50);

    return {
      ...(session || {
        id: sessionId,
        userId,
        title: '驛｢譏ｶ繝ｻ・取・・ｹ譏ｴ繝ｻ郢晢ｽｨ驛｢・ｧ繝ｻ・ｻ驛｢譏ｴ繝ｻ邵ｺ蜥擾ｽｹ譎｢・ｽ・ｧ驛｢譎｢・ｽ・ｳ',
        createdAt: new Date(),
        messageCount: 0,
      }),
      messages,
    };
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

    // 鬯ｨ・ｾ繝ｻ・ｶ郢晢ｽｻ繝ｻ・｣鬮ｫ・ｴ雋翫ｑ・ｽ・ｽ繝ｻ・ｻ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｭ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｰ
    await this.auditManager.log({
      action: 'chat_session_created',
      userId,
      details: { sessionId: session.id, title },
    });

    return session;
  }

  /**
   * 鬩幢ｽ｢隴擾ｽｶ郢晢ｽｻ繝ｻ蜿悶・繝ｻ・ｹ隴擾ｽｴ郢晢ｽｻ驛｢譎｢・ｽ・ｨ鬮ｯ讖ｸ・ｽ・ｻ郢晢ｽｻ繝ｻ・･鬮ｮ蠑ｱ繝ｻ繝ｻ・ｽ繝ｻ・ｴ鬩幢ｽ｢繝ｻ・ｧ鬮ｮ蛹ｺ・ｧ・ｫ陟募ｮ｣霎ｧ髴域鱒繝ｻ
   */
  async getChatHistory(
    userId: string,
    sessionId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    return await this.chatRepository.getMessages(sessionId, limit);
  }

  /**
   * 鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｦ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｼ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｶ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｼ鬩搾ｽｵ繝ｻ・ｺ郢晢ｽｻ繝ｻ・ｮ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｻ鬩幢ｽ｢隴擾ｽｴ郢晢ｽｻ驍ｵ・ｺ陷･謫ｾ・ｽ・ｹ隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｧ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｳ鬮｣蛹・ｽｽ・ｳ繝ｻ縺､ﾂ鬯ｮ・ｫ陋ｹ繝ｻ・ｽ・ｽ繝ｻ・ｧ鬩幢ｽ｢繝ｻ・ｧ鬮ｮ蛹ｺ・ｧ・ｫ陟募ｮ｣霎ｧ髴域鱒繝ｻ
   */
  async getUserSessions(userId: string): Promise<ChatSession[]> {
    return await this.chatRepository.getUserSessions(userId);
  }

  /**
   * 鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｻ鬩幢ｽ｢隴擾ｽｴ郢晢ｽｻ驍ｵ・ｺ陷･謫ｾ・ｽ・ｹ隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｧ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｳ鬩幢ｽ｢繝ｻ・ｧ鬮ｮ蛹ｺ・ｨ謚ｵ・ｽ譛ｱ・ｬ・ｮ繝ｻ・ｯ郢晢ｽｻ繝ｻ・､
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













