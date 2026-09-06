import { PoipoiCodeAgent } from "./PoipoiCodeAgent";
/**

import { PoipoiCodeAgent } from "./PoipoiCodeAgent";
 * ChatCoreManager - 鬯ｩ蟷｢・ｽ・｢髫ｴ蠑ｱ繝ｻ繝ｻ・ｺ繝ｻ・｢鬩搾ｽｵ繝ｻ・ｺ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｹ髫ｴ蠑ｱ繝ｻ繝ｻ・ｺ繝ｻ・｢鬩搾ｽｵ繝ｻ・ｺ驛｢譎｢・ｽ・ｻI 鬯ｩ蟷｢・ｽ・｢髫ｴ謫ｾ・ｽ・ｶ驛｢譎｢・ｽ・ｻ郢晢ｽｻ陷ｿ謔ｶ繝ｻ郢晢ｽｻ繝ｻ・ｹ髫ｴ謫ｾ・ｽ・ｴ驛｢譎｢・ｽ・ｻ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｨ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｳ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・｢
 * AI鬯ｩ謳ｾ・ｽ・ｵ郢晢ｽｻ繝ｻ・ｺ鬮ｫ・ｰ騾搾ｽｲ繝ｻ・ｻ郢ｧ謇假ｽｽ・ｽ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｮ鬮ｮ迢暦ｽｿ・ｫ郢晢ｽｻ髫ｲ・､陷･蠑ｱ・郢晢ｽｻ繝ｻ・ｺ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｫ鬯ｮ・｣髮具ｽｻ繝ｻ・ｽ繝ｻ・ｨ鬮ｯ讓奇ｽｺ・ｷ繝ｻ・･郢晢ｽｻ繝ｻ・ｽ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｩ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｱ鬯ｮ・ｯ繝ｻ・ｷ郢晢ｽｻ繝ｻ・ｿ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｯ鬯ｯ・ｮ繝ｻ・｢郢晢ｽｻ繝ｻ・ｭ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ鬯ｩ謳ｾ・ｽ・ｵ郢晢ｽｻ繝ｻ・ｺ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｫ鬯ｩ謳ｾ・ｽ・ｵ郢晢ｽｻ繝ｻ・ｺ鬮ｯ・ｷ繝ｻ・ｷ郢晢ｽｻ繝ｻ・ｶ驛｢譎｢・ｽ・ｻ髴托ｽ｢隴会ｽｦ繝ｻ・ｽ繝ｻ・ｹ郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｳ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・｢鬯ｮ・ｯ隶厄ｽｸ繝ｻ・ｽ繝ｻ・ｳ鬮ｮ荵昴・繝ｻ・ｽ繝ｻ・ｯ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・｣鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｻ
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
    return /鬮｣蜴・ｽｽ・ｫ郢晢ｽｻ繝ｻ・ｮ鬮ｮ蠑ｱ繝ｻ繝ｻ・ｽ繝ｻ・｣|鬮ｫ・ｰ繝ｻ・ｾ郢晢ｽｻ繝ｻ・ｹ鬮ｯ諛茨ｽｸ蜻ｻ・ｽ・ｻ鬮ｯ讓奇ｽｺ・ｽ陋ｻ・､髯晢ｽｲ繝ｻ・ｩ|鬮｣蜴・ｽｽ・ｴ髫ｲ蟶帷樟郢晢ｽｻ|鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｳ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｼ鬩幢ｽ｢隴擾ｽｴ郢晢ｽｻ/.test(message);
  }

  private async executeCodeImplementationRequest(message: string): Promise<string> {
    const result = await PoipoiCodeAgent.getInstance().execute(message);
    if (!result.success) {
      return `鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｳ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｼ鬯ｩ蟷｢・ｽ・｢髫ｴ謇九・隶夲ｽｨ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｮ鬮ｮ荵昴・繝ｻ・ｽ繝ｻ・ｯ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・｣鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｻ鬩包ｽｶ鬯・汚・ｽ・･繝ｻ・｢髫ｴ・ｽ隴∬・繝ｻ郢晢ｽｻ繝ｻ・ｱ鬯ｮ・ｫ繝ｻ・ｰ郢晢ｽｻ繝ｻ・ｨ鬮ｯ・ｷ闔ｨ螟ｲ・ｽ・ｽ繝ｻ・ｱ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｰ鬯ｩ謳ｾ・ｽ・ｵ郢晢ｽｻ繝ｻ・ｺ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｾ鬯ｩ謳ｾ・ｽ・ｵ郢晢ｽｻ繝ｻ・ｺ鬮ｯ・ｷ闔ｨ螟ｲ・ｽ・ｽ繝ｻ・ｱ鬮ｫ・ｨ繝ｻ・ｳ驛｢譎｢・ｽ・ｻ ${result.error ?? "鬯ｮ・｣陋ｹ繝ｻ・ｽ・ｽ繝ｻ・ｳ鬯ｮ・｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｴ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｻ鬯ｩ謳ｾ・ｽ・ｵ郢晢ｽｻ繝ｻ・ｺ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｪ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｨ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｩ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｼ"}`;
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
   * 鬯ｩ蟷｢・ｽ・｢髫ｴ謫ｾ・ｽ・ｶ驛｢譎｢・ｽ・ｻ郢晢ｽｻ陷ｿ謔ｶ繝ｻ郢晢ｽｻ繝ｻ・ｹ髫ｴ謫ｾ・ｽ・ｴ驛｢譎｢・ｽ・ｻ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｨ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・｡鬯ｩ蟷｢・ｽ・｢髫ｴ謫ｾ・ｽ・ｴ驛｢譎｢・ｽ・ｻ鬩搾ｽｵ繝ｻ・ｺ髫ｴ諠ｹ・ｼ螟ｲ・ｽ・ｽ繝ｻ・ｹ髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｼ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｸ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ鬯ｮ・ｮ陋ｹ・ｺ繝ｻ・ｧ繝ｻ・ｭ驛｢譎｢・ｽ・ｻ鬯ｯ・ｨ繝ｻ・ｾ驛｢譎｢・ｽ・ｻ驛｢譎｢・ｽ・ｻ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｰ鬯ｩ謳ｾ・ｽ・ｵ郢晢ｽｻ繝ｻ・ｺ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｦ鬯ｮ・ｯ雋翫ｑ・ｽ・ｽ繝ｻ・｢鬮ｫ・ｲ陝ｶ蜷ｶ繝ｻ郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｭ鬮ｫ・ｴ遶擾ｽｵ髢ｻ・ｸ郢晢ｽｻ繝ｻ・ｽ髯晢ｽｶ隰ｨ魑ｴﾂ髯溘・螻ｮ繝ｻ・ｽ繝ｻ・ｻ鬮ｦ・ｮ陷ｷ・ｶ郢晢ｽｻ
   */
  async processMessage(
    userId: string,
    sessionId: string,
    userMessage: string
  ): Promise<ChatResponse> {
    // 1. 鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｦ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｼ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｶ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｼ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・｡鬯ｩ蟷｢・ｽ・｢髫ｴ謫ｾ・ｽ・ｴ驛｢譎｢・ｽ・ｻ鬩搾ｽｵ繝ｻ・ｺ髫ｴ諠ｹ・ｼ螟ｲ・ｽ・ｽ繝ｻ・ｹ髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｼ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｸ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ鬮ｯ・ｷ闔会ｽ｣郢晢ｽｻ郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｿ鬮ｫ・ｴ陷ｿ髢・ｾ蜉ｱ繝ｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｭ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｻ
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_user`,
      userId,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };

    await this.chatRepository.saveMessage(userMsg, sessionId);

    // 2. 鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｳ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｳ鬯ｩ蟷｢・ｽ・｢髫ｴ謫ｾ・ｽ・ｴ驛｢譎｢・ｽ・ｻ鬩搾ｽｵ繝ｻ・ｺ髯ｷﾂ隴会ｽｦ繝ｻ・ｽ繝ｻ・ｹ郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｹ鬯ｩ蟷｢・ｽ・｢髫ｴ荵励・繝ｻ・ｽ繝ｻ・ｺ郢晢ｽｻ繝ｻ・･鬮ｯ・ｷ繝ｻ・ｿ髯ｷ・ｻ繝ｻ・ｵ郢晢ｽｻ繝ｻ・ｰ髯溘・ﾂｧ隲・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｼ鬮ｯ蜈ｷ・ｽ・ｹ郢晢ｽｻ繝ｻ・ｻ郢晢ｽｻ隴幢ｽｱ髮趣ｽｪ郢晢ｽｻ繝ｻ・ｹ髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・｢鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｪ鬯ｩ謳ｾ・ｽ・ｵ郢晢ｽｻ繝ｻ・ｺ鬮｣蛹・ｽｽ・ｵ髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ鬮ｯ蜈ｷ・ｽ・ｾ郢晢ｽｻ繝ｻ・ｫ郢晢ｽｻ繝ｻ・｢驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・｢鬯ｯ・ｯ繝ｻ・ｨ郢晢ｽｻ繝ｻ・ｾ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・｣鬯ｮ・ｫ繝ｻ・ｲ郢晢ｽｻ繝ｻ・ｰ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｻ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｰ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｱ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ鬯ｮ・ｮ陋ｹ・ｺ繝ｻ・ｧ繝ｻ・ｫ髯溷供・ｮ・｣髴趣ｽｧ髯溘・ﾂｧ隲・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｼ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｻ
    const context = await this.contextAwarenessService.getContext(
      userId,
      userMessage
    );

    // 3. 鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・｡鬯ｩ蟷｢・ｽ・｢髫ｴ謫ｾ・ｽ・ｴ驛｢譎｢・ｽ・ｻ鬩搾ｽｵ繝ｻ・ｺ髫ｴ諠ｹ・ｼ螟ｲ・ｽ・ｽ繝ｻ・ｹ髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｼ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｸ鬯ｮ・ｯ繝ｻ・ｷ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｦ鬯ｯ・ｨ繝ｻ・ｾ驛｢譎｢・ｽ・ｻ驛｢譎｢・ｽ・ｻ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｼ鬮ｯ諛育袖繝ｻ・ｺ繝ｻ・ｯ繝ｻ縺､ﾂ郢晢ｽｻ繝ｻ・ｳ鬯ｯ・ｮ繝ｻ・ｫ郢晢ｽｻ繝ｻ・ｲ鬮ｫ・ｰ髮具ｽｻ繝ｻ・ｽ繝ｻ・ｶ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｻ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｨ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｼ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｸ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｧ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｳ鬯ｩ蟷｢・ｽ・｢髫ｴ諠ｹ・ｹ證ｦ・ｽ・ｲ繝ｻ・ｺ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｴ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｻ鬯ｯ・ｨ繝ｻ・ｾ髯具ｽｹ郢晢ｽｻ繝ｻ・ｽ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｨ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｻ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｻ
    const processedResult = await this.messageProcessingService.processMessage(
      userMessage,
      context
    );

    // 4. 鬯ｮ・ｯ雋翫ｑ・ｽ・ｽ繝ｻ・｢鬮ｫ・ｲ陝ｶ蜷ｶ繝ｻ郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｭ鬯ｨ・ｾ繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｮ鬮ｯ・ｷ郢晢ｽｻ繝ｻ・ｽ繝ｻ・ｽ鬯ｮ・ｫ繝ｻ・ｰ髯溷供・ｾ蠕後・
    const responseContent = await this.generateResponse(
      userMessage,
      processedResult,
      context
    );

    // 5. 鬯ｮ・ｯ雋翫ｑ・ｽ・ｽ繝ｻ・｢鬮ｫ・ｲ陝ｶ蜷ｶ繝ｻ郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｭ鬮ｫ・ｴ遶擾ｽｫ雎ｬ・ｹ鬯ｪ・ｰ陷茨ｽｷ繝ｻ・ｽ繝ｻ・ｹ髫ｴ謫ｾ・ｽ・ｴ驛｢譎｢・ｽ・ｻ鬩搾ｽｵ繝ｻ・ｺ髫ｴ諠ｹ・ｼ螟ｲ・ｽ・ｽ繝ｻ・ｹ髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｼ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｸ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ鬮ｯ・ｷ闔会ｽ｣郢晢ｽｻ郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｽ鬮ｫ・ｲ陝ｶ蟶ｷ讓滄Δ譎｢・ｽ・ｻ
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

    // 6. 鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・｡鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・｢鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｪ鬯ｩ謳ｾ・ｽ・ｵ郢晢ｽｻ繝ｻ・ｺ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｫ鬯ｮ・｣髮具ｽｻ繝ｻ・ｽ繝ｻ・ｨ鬮ｯ讓奇ｽｺ・ｷ繝ｻ・･郢晢ｽｻ繝ｻ・ｽ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｩ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｱ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ鬮ｯ・ｷ闔会ｽ｣郢晢ｽｻ郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｿ鬮ｫ・ｴ陷ｿ髢・ｾ蜉ｱ繝ｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｭ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｻ
    if (this.memoryManager && typeof (this.memoryManager as any).saveConversation === 'function') {
      await (this.memoryManager as any).saveConversation(userId, [userMsg, assistantMsg]);
    }

    // 7. 鬯ｯ・ｨ繝ｻ・ｾ郢晢ｽｻ繝ｻ・ｶ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・｣鬯ｮ・ｫ繝ｻ・ｴ髮狗ｿｫ・代・・ｽ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｻ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｭ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｰ
    await this.auditManager.log({
      action: 'chat_message_processed',
      userId,
      sessionId,
      details: {
        messageLength: userMessage.length,
        managersUsed: processedResult.managersUsed,
      },
    });

    // 8. 鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｻ鬯ｩ蟷｢・ｽ・｢髫ｴ謫ｾ・ｽ・ｴ驛｢譎｢・ｽ・ｻ鬩搾ｽｵ繝ｻ・ｺ髯ｷ・･隰ｫ・ｾ繝ｻ・ｽ繝ｻ・ｹ髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｧ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｳ鬯ｮ・ｫ繝ｻ・ｲ郢晢ｽｻ繝ｻ・ｰ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｻ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｰ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｱ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ鬯ｮ・ｮ陋ｹ・ｺ繝ｻ・ｧ繝ｻ・ｫ髯溷供・ｮ・｣髴趣ｽｧ鬮ｴ蝓滄ｱ堤ｹ晢ｽｻ
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
   * 鬯ｮ・ｯ雋翫ｑ・ｽ・ｽ繝ｻ・｢鬮ｫ・ｲ陝ｶ蜷ｶ繝ｻ郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｭ鬮ｫ・ｴ遶擾ｽｵ髢ｻ・ｸ郢晢ｽｻ繝ｻ・ｽ髯晢ｽｶ隰ｨ魑ｴﾂ髯溘・螻ｮ繝ｻ・ｽ繝ｻ・ｻ鬮ｦ・ｮ陷ｷ・ｶ郢晢ｽｻ
   */
  private async generateResponse(
    userMessage: string,
    processedResult: any,
    context: any
  ): Promise<string> {
    try {
      // LLM API鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ鬯ｮ・ｮ陋ｹ・ｺ繝ｻ・ｨ髮具ｽｻ繝ｻ・ｽ繝ｻ・ｻ髣包ｽｵ雋翫ｑ・ｽ・ｽ繝ｻ・ｸ郢晢ｽｻ繝ｻ・ｺ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｳ鬯ｮ・ｯ繝ｻ・ｷ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｺ鬯ｩ謳ｾ・ｽ・ｵ郢晢ｽｻ繝ｻ・ｺ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｻ
      if (processedResult.isManufacturingRelated) {
        const manufacturingAnalysis = await this.manufacturingManager.analyzeProduction(processedResult.manufacturingData || {});
        return this.formatManufacturingResponse(userMessage, manufacturingAnalysis);
      }

      const aiMessage = await aiProviderManager.invoke([
        {
          role: "system",
          content: "縺ゅ↑縺溘・繝昴う繝昴う縺ｮ繝ｭ繝ｼ繧ｫ繝ｫAI縺ｧ縺吶よ律譛ｬ隱槭〒蝗樒ｭ斐＠縺ｦ縺上□縺輔＞縲・,
        },
        {
          role: "user",
          content: userMessage,
        },
      ]);
      
      // 鬯ｩ蟷｢・ｽ・｢髫ｴ蠑ｱ繝ｻ繝ｻ・ｽ繝ｻ・ｼ髫ｴ繝ｻ謳ｨ繝ｻ・ｰ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｼ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｫ鬯ｩ蟷｢・ｽ・｢髫ｴ蟇ゅ・郢晢ｽｻ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・｣鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｯ: 鬯ｮ・ｯ雋・ｽｷ繝ｻ・｢鬪ｰ邇厄ｽ｢螟懷梭繝ｻ・ｫ驛｢・ｧ闔ｨ螟ｲ・ｽ・ｽ繝ｻ・ｸ郢晢ｽｻ繝ｻ・ｺ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｮ鬯ｮ・ｯ雋翫ｑ・ｽ・ｽ繝ｻ・｢鬮ｫ・ｲ陝ｶ蜷ｶ繝ｻ郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｭ鬯ｨ・ｾ繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｮ鬮ｯ・ｷ郢晢ｽｻ繝ｻ・ｽ繝ｻ・ｽ鬯ｮ・ｫ繝ｻ・ｰ髯溷供・ｾ蠕後・
      // 鬯ｯ・ｮ繝ｻ・ｯ郢晢ｽｻ繝ｻ・ｬ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ鬯ｯ・ｯ繝ｻ・ｨ郢晢ｽｻ繝ｻ・ｾ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｰ鬯ｮ・ｫ繝ｻ・ｶ鬯ｲ繝ｻ・ｼ螟ｲ・ｽ・ｽ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｭ鬯ｯ・ｯ繝ｻ・ｮ郢晢ｽｻ繝ｻ・｢驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・｢鬯ｯ・ｯ繝ｻ・ｨ郢晢ｽｻ繝ｻ・ｾ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・｣鬯ｩ謳ｾ・ｽ・ｵ郢晢ｽｻ繝ｻ・ｺ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｮ鬯ｯ・ｮ繝ｻ・ｮ髣費ｽｨ陞滂ｽｲ繝ｻ・ｽ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｪ鬯ｮ・ｯ隲幢ｽｶ繝ｻ・｣繝ｻ・ｰ鬮｣蛹・ｽｽ・ｳ鬩怜遜・ｽ・ｫ驛｢譎｢・ｽ・ｻ鬯ｮ・ｯ隲幢ｽｶ繝ｻ・ｽ繝ｻ・｣驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｴ鬯ｮ・ｯ繝ｻ・ｷ郢晢ｽｻ繝ｻ・ｷ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｻ
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

      // 鬯ｮ・ｫ繝ｻ・ｰ髫ｴ莨夲ｽｽ・ｦ郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｨ鬯ｯ・ｮ繝ｻ・ｫ郢晢ｽｻ繝ｻ・ｲ鬮ｫ・ｰ髮具ｽｻ繝ｻ・ｽ繝ｻ・ｶ鬩包ｽｯ繝ｻ・ｶ郢晢ｽｻ繝ｻ・ｲ鬯ｮ・ｯ雋翫ｑ・ｽ・ｽ繝ｻ・｢鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｻ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｦ鬩包ｽｶ闕ｳ讖ｸ・ｽ・｣繝ｻ・ｺ驛｢譎｢・ｽ・ｻ鬯ｮ・ｯ隲幢ｽｶ繝ｻ・ｽ繝ｻ・｣驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｴ鬯ｮ・ｯ繝ｻ・ｷ郢晢ｽｻ繝ｻ・ｷ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｻ
      if (processedResult.requiresReasoning) {
        return processedResult.reasoning;
      }

      // 鬯ｯ・ｯ繝ｻ・ｨ郢晢ｽｻ繝ｻ・ｾ鬮ｯ讖ｸ・ｽ・｢郢晢ｽｻ繝ｻ・ｼ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｸ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｸ鬯ｩ謳ｾ・ｽ・ｵ郢晢ｽｻ繝ｻ・ｺ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｮ鬯ｮ・ｯ雋翫ｑ・ｽ・ｽ繝ｻ・｢鬮ｫ・ｲ陝ｶ蜷ｶ繝ｻ郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｭ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｻ
  /**
   * 鬯ｯ・ｮ繝ｻ・ｯ郢晢ｽｻ繝ｻ・ｬ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ鬯ｯ・ｯ繝ｻ・ｨ郢晢ｽｻ繝ｻ・ｾ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｰ鬯ｮ・ｫ繝ｻ・ｶ鬯ｲ繝ｻ・ｼ螟ｲ・ｽ・ｽ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｭ鬯ｯ・ｯ繝ｻ・ｮ郢晢ｽｻ繝ｻ・｢驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・｢鬯ｯ・ｯ繝ｻ・ｨ郢晢ｽｻ繝ｻ・ｾ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・｣鬯ｩ謳ｾ・ｽ・ｵ郢晢ｽｻ繝ｻ・ｺ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｮ鬯ｮ・ｯ雋翫ｑ・ｽ・ｽ繝ｻ・｢鬮ｫ・ｲ陝ｶ蜷ｶ繝ｻ郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｭ鬮ｫ・ｴ遶擾ｽｵ髢ｻ・ｸ郢晢ｽｻ繝ｻ・ｽ髯懶ｽ｣繝ｻ・､郢晢ｽｻ繝ｻ・ｹ髫ｴ蠑ｱ繝ｻ繝ｻ・ｽ繝ｻ・ｼ髫ｴ繝ｻ謳ｨ繝ｻ・ｰ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｼ鬯ｩ蟷｢・ｽ・｢髫ｴ蠑ｱ繝ｻ繝ｻ・ｽ繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｭ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・｣鬯ｩ蟷｢・ｽ・｢髫ｴ謫ｾ・ｽ・ｴ驛｢譎｢・ｽ・ｻ
   */
  private formatManufacturingResponse(
    userMessage: string,
    analysis: any
  ): string {
    return `鬯ｯ・ｮ繝ｻ・ｯ郢晢ｽｻ繝ｻ・ｬ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｽ鬯ｯ・ｯ繝ｻ・ｨ郢晢ｽｻ繝ｻ・ｾ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｰ鬯ｮ・ｫ繝ｻ・ｶ鬯ｲ繝ｻ・ｼ螟ｲ・ｽ・ｽ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｭ鬯ｮ・ｯ陷茨ｽｷ繝ｻ・ｽ繝ｻ・ｻ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｻ鬮ｫ・ｴ繝ｻ・ｴ郢晢ｽｻ繝ｻ・ｵ鬯ｯ・ｩ隰ｳ・ｾ繝ｻ・ｽ繝ｻ・ｨ鬮ｯ・ｷ闔・･雎撰ｽｺ郢晢ｽｻ繝ｻ・｣郢晢ｽｻ繝ｻ・｡:\n${JSON.stringify(analysis, null, 2)}`;
  }

  /**
   * 鬯ｮ・ｫ繝ｻ・ｶ髴難ｽ｣陋滂ｽ｡繝ｻ・ｶ隲帷ｿｫ繝ｻ郢晢ｽｻ繝ｻ・ｺ鬮｣蛹・ｽｽ・ｵ髮九・・ｽ・ｷ鬯ｯ貊ゑｽｽ・ｭ鬯ｩ謳ｾ・ｽ・ｵ郢晢ｽｻ繝ｻ・ｺ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｪ鬯ｮ・ｯ雋翫ｑ・ｽ・ｽ繝ｻ・｢鬮ｫ・ｲ陝ｶ蜷ｶ繝ｻ郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｭ鬮ｫ・ｴ遶擾ｽｵ髢ｻ・ｸ郢晢ｽｻ繝ｻ・ｽ髯懶ｽ｣繝ｻ・､郢晢ｽｻ繝ｻ・ｹ髫ｴ蠑ｱ繝ｻ繝ｻ・ｽ繝ｻ・ｼ髫ｴ繝ｻ謳ｨ繝ｻ・ｰ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｼ鬯ｩ蟷｢・ｽ・｢髫ｴ蠑ｱ繝ｻ繝ｻ・ｽ繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｭ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・｣鬯ｩ蟷｢・ｽ・｢髫ｴ謫ｾ・ｽ・ｴ驛｢譎｢・ｽ・ｻ
   */
  private formatStandardResponse(
    userMessage: string,
    processedResult: any,
    context: any
  ): string {
    return `驍ｵ・ｺ鬮ｮ竏ｵ迚帝し・ｺ郢晢ｽｻ驍顔距・ｹ・ｧ闕ｳ蟯ｩ髮ｷ驍ｵ・ｺ郢ｧ繝ｻ・ｽ鬘費ｽｸ・ｺ陟募ｨｯ繝ｻ驍ｵ・ｺ郢晢ｽｻ繝ｻ繝ｻ・ｸ・ｺ隰費ｽｶ繝ｻ讓抵ｽｸ・ｺ繝ｻ・ｾ驍ｵ・ｺ陷ｷ・ｶ・つ郢晢ｽｻn\n${processedResult.response || "髯懃軸・ｨ謚ｵ・ｽ・ｭ隴∵腸・ｽ蟶敖蠅難ｽｻ阮吶・驍ｵ・ｺ繝ｻ・ｧ驍ｵ・ｺ鬮ｦ・ｪ遶擾ｽｪ驍ｵ・ｺ陝ｶ蜻ｻ・ｽ骰具ｽｸ・ｺ繝ｻ・ｧ驍ｵ・ｺ陷会ｽｱ隨ｳ繝ｻ・ｸ・ｲ郢晢ｽｻ}`;
  }

  /**
   * 鬯ｩ蟷｢・ｽ・｢髫ｴ謫ｾ・ｽ・ｶ驛｢譎｢・ｽ・ｻ郢晢ｽｻ陷ｿ謔ｶ繝ｻ郢晢ｽｻ繝ｻ・ｹ髫ｴ謫ｾ・ｽ・ｴ驛｢譎｢・ｽ・ｻ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｨ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｻ鬯ｩ蟷｢・ｽ・｢髫ｴ謫ｾ・ｽ・ｴ驛｢譎｢・ｽ・ｻ鬩搾ｽｵ繝ｻ・ｺ髯ｷ・･隰ｫ・ｾ繝ｻ・ｽ繝ｻ・ｹ髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｧ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｳ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ鬮ｯ・ｷ闔会ｽ｣郢晢ｽｻ郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｽ鬮ｫ・ｲ陝ｶ蟶ｷ讓滄Δ譎｢・ｽ・ｻ
   */
  async getSession(userId: string, sessionId: string): Promise<any> {
    const session = await this.chatRepository.getSession(sessionId);
    const messages = await this.chatRepository.getMessages(sessionId, 50);

    return {
      ...(session || {
        id: sessionId,
        userId,
        title: '鬩幢ｽ｢隴擾ｽｶ郢晢ｽｻ繝ｻ蜿悶・繝ｻ・ｹ隴擾ｽｴ郢晢ｽｻ驛｢譎｢・ｽ・ｨ鬩幢ｽ｢繝ｻ・ｧ郢晢ｽｻ繝ｻ・ｻ鬩幢ｽ｢隴擾ｽｴ郢晢ｽｻ驍ｵ・ｺ陷･謫ｾ・ｽ・ｹ隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｧ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｳ',
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

    // 鬯ｯ・ｨ繝ｻ・ｾ郢晢ｽｻ繝ｻ・ｶ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・｣鬯ｮ・ｫ繝ｻ・ｴ髮狗ｿｫ・代・・ｽ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｻ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｭ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｰ
    await this.auditManager.log({
      action: 'chat_session_created',
      userId,
      details: { sessionId: session.id, title },
    });

    return session;
  }

  /**
   * 鬯ｩ蟷｢・ｽ・｢髫ｴ謫ｾ・ｽ・ｶ驛｢譎｢・ｽ・ｻ郢晢ｽｻ陷ｿ謔ｶ繝ｻ郢晢ｽｻ繝ｻ・ｹ髫ｴ謫ｾ・ｽ・ｴ驛｢譎｢・ｽ・ｻ鬩幢ｽ｢隴趣ｽ｢繝ｻ・ｽ繝ｻ・ｨ鬯ｮ・ｯ隶厄ｽｸ繝ｻ・ｽ繝ｻ・ｻ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・･鬯ｮ・ｮ陟托ｽｱ郢晢ｽｻ郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｴ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ鬯ｮ・ｮ陋ｹ・ｺ繝ｻ・ｧ繝ｻ・ｫ髯溷供・ｮ・｣髴趣ｽｧ鬮ｴ蝓滄ｱ堤ｹ晢ｽｻ
   */
  async getChatHistory(
    userId: string,
    sessionId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    return await this.chatRepository.getMessages(sessionId, limit);
  }

  /**
   * 鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｦ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｼ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｶ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｼ鬯ｩ謳ｾ・ｽ・ｵ郢晢ｽｻ繝ｻ・ｺ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｮ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｻ鬯ｩ蟷｢・ｽ・｢髫ｴ謫ｾ・ｽ・ｴ驛｢譎｢・ｽ・ｻ鬩搾ｽｵ繝ｻ・ｺ髯ｷ・･隰ｫ・ｾ繝ｻ・ｽ繝ｻ・ｹ髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｧ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｳ鬯ｮ・｣陋ｹ繝ｻ・ｽ・ｽ繝ｻ・ｳ郢晢ｽｻ邵ｺ・､・つ鬯ｯ・ｮ繝ｻ・ｫ髯具ｽｹ郢晢ｽｻ繝ｻ・ｽ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｧ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ鬯ｮ・ｮ陋ｹ・ｺ繝ｻ・ｧ繝ｻ・ｫ髯溷供・ｮ・｣髴趣ｽｧ鬮ｴ蝓滄ｱ堤ｹ晢ｽｻ
   */
  async getUserSessions(userId: string): Promise<ChatSession[]> {
    return await this.chatRepository.getUserSessions(userId);
  }

  /**
   * 鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・ｻ鬯ｩ蟷｢・ｽ・｢髫ｴ謫ｾ・ｽ・ｴ驛｢譎｢・ｽ・ｻ鬩搾ｽｵ繝ｻ・ｺ髯ｷ・･隰ｫ・ｾ繝ｻ・ｽ繝ｻ・ｹ髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｧ鬯ｩ蟷｢・ｽ・｢髫ｴ雜｣・ｽ・｢郢晢ｽｻ繝ｻ・ｽ郢晢ｽｻ繝ｻ・ｳ鬯ｩ蟷｢・ｽ・｢郢晢ｽｻ繝ｻ・ｧ鬯ｮ・ｮ陋ｹ・ｺ繝ｻ・ｨ隰夲ｽｵ繝ｻ・ｽ隴幢ｽｱ繝ｻ・ｬ繝ｻ・ｮ郢晢ｽｻ繝ｻ・ｯ驛｢譎｢・ｽ・ｻ郢晢ｽｻ繝ｻ・､
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













