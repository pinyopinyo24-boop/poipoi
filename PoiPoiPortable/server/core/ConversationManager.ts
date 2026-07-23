/**
 * ConversationManager - 会話メモリ統合マネージャー
 * 過去会話の理解と継続会話を実現
 */

import { ChatMessage, ChatSession } from './ChatCoreManager';
import { MemoryIntelligenceAIManager } from './MemoryIntelligenceAIManager';

export interface ShortTermMemory {
  sessionId: string;
  messages: ChatMessage[];
  context: string;
  timestamp: number;
  importance: number;
}

export interface LongTermMemory {
  id: string;
  userId: string;
  content: string;
  category: string;
  importance: number;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  tags: string[];
  relatedTopics: string[];
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  recentMessages: ChatMessage[];
  relevantMemories: LongTermMemory[];
  conversationTopic: string;
  userPreferences: Record<string, any>;
  contextSummary: string;
}

export interface SearchResult {
  memories: LongTermMemory[];
  messages: ChatMessage[];
  relevanceScore: number;
  timestamp: number;
}

export class ConversationManager {
  private shortTermMemories: Map<string, ShortTermMemory> = new Map();
  private longTermMemories: Map<string, LongTermMemory> = new Map();
  private sessionContexts: Map<string, ConversationContext> = new Map();
  private memoryIndex: Map<string, string[]> = new Map(); // keyword -> memory IDs

  constructor(
    private memoryManager: MemoryIntelligenceAIManager
  ) {}

  /**
   * セッション開始時に会話コンテキストを初期化
   */
  async initializeSessionContext(
    sessionId: string,
    userId: string,
    topic: string
  ): Promise<ConversationContext> {
    // ユーザーの過去会話から関連メモリを取得
    const relevantMemories = await this.retrieveRelevantMemories(userId, topic);

    // 最近のメッセージを取得
    const recentMessages = await this.getRecentMessages(sessionId, 5);

    // ユーザーの好みを取得
    const userPreferences = await this.getUserPreferences(userId);

    // コンテキスト要約を生成
    const contextSummary = this.generateContextSummary(
      recentMessages,
      relevantMemories,
      topic
    );

    const context: ConversationContext = {
      sessionId,
      userId,
      recentMessages,
      relevantMemories,
      conversationTopic: topic,
      userPreferences,
      contextSummary,
    };

    this.sessionContexts.set(sessionId, context);

    // 監査ログ (placeholder)
    console.log(`[ConversationManager] Context initialized for session ${sessionId}`);

    return context;
  }

  /**
   * 短期記憶にメッセージを保存
   */
  async saveToShortTermMemory(
    sessionId: string,
    messages: ChatMessage[],
    context: string
  ): Promise<void> {
    const memory: ShortTermMemory = {
      sessionId,
      messages,
      context,
      timestamp: Date.now(),
      importance: this.calculateImportance(messages),
    };

    this.shortTermMemories.set(sessionId, memory);

    // 重要度が高い場合は長期記憶へ昇格
    if (memory.importance > 0.7) {
      await this.promoteToLongTermMemory(sessionId, messages, context);
    }
  }

  /**
   * 短期記憶から長期記憶へ昇格
   */
  async promoteToLongTermMemory(
    sessionId: string,
    messages: ChatMessage[],
    context: string
  ): Promise<void> {
    const userId = messages[0]?.userId || 'unknown';
    const memoryId = `ltm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // メモリ内容を要約
    const summary = await this.summarizeMessages(messages);

    // タグを抽出
    const tags = this.extractTags(messages);

    // 関連トピックを抽出
    const relatedTopics = this.extractRelatedTopics(messages);

    const longTermMemory: LongTermMemory = {
      id: memoryId,
      userId,
      content: summary,
      category: context,
      importance: this.calculateImportance(messages),
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
      tags,
      relatedTopics,
    };

    this.longTermMemories.set(memoryId, longTermMemory);

    // インデックスを更新
    tags.forEach((tag) => {
      if (!this.memoryIndex.has(tag)) {
        this.memoryIndex.set(tag, []);
      }
      this.memoryIndex.get(tag)!.push(memoryId);
    });

    // MemoryAIManagerに保存
    // Note: saveMemory is called on the actual MemoryManager instance
    // This is a placeholder for integration
    /*
    await this.memoryManager.saveMemory(userId, {
      id: memoryId,
      type: 'conversation',
      content: summary,
      metadata: {
        sessionId,
        tags,
        relatedTopics,
        importance: longTermMemory.importance,
      },
    });
    */

    // 監査ログ (placeholder)
    console.log(`[ConversationManager] Memory promoted to long-term: ${memoryId}`);
  }

  /**
   * 関連メモリを取得
   */
  async retrieveRelevantMemories(userId: string, topic: string): Promise<LongTermMemory[]> {
    const memories: LongTermMemory[] = [];

    // MemoryAIManagerから関連メモリを検索
    const searchResults: any[] = []; // Placeholder: integrate with actual MemoryAIManager

    searchResults.forEach((result: any) => {
      const memory = this.longTermMemories.get(result.id || result);
      if (memory) {
        memories.push(memory);
        // アクセス情報を更新
        memory.lastAccessedAt = Date.now();
        memory.accessCount++;
      }
    });

    // 重要度でソート
    memories.sort((a, b) => b.importance - a.importance);

    return memories.slice(0, 5); // 上位5件を返す
  }

  /**
   * 会話を検索
   */
  async searchConversations(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<SearchResult> {
    const memories: LongTermMemory[] = [];
    const messages: ChatMessage[] = [];
    let relevanceScore = 0;

    // キーワード検索
    const keywords = query.toLowerCase().split(/\s+/);
    const matchedMemoryIds = new Set<string>();

    keywords.forEach((keyword) => {
      const ids = this.memoryIndex.get(keyword) || [];
      ids.forEach((id) => matchedMemoryIds.add(id));
    });

    // マッチしたメモリを取得
    matchedMemoryIds.forEach((id) => {
      const memory = this.longTermMemories.get(id);
      if (memory && memory.userId === userId) {
        memories.push(memory);
      }
    });

    // MemoryAIManagerから意味的検索結果を取得
    const semanticResults: any[] = []; // Placeholder: integrate with actual MemoryAIManager
    semanticResults.forEach((result: any) => {
      const memory = this.longTermMemories.get((result as any).id || result);
      if (memory && !matchedMemoryIds.has(result.id)) {
        memories.push(memory);
      }
    });

    // 関連性スコアを計算
    relevanceScore = Math.min(memories.length / 10, 1.0);

    // 監査ログ (placeholder)
    console.log(`[ConversationManager] Search executed: ${query}`);

    return {
      memories: memories.slice(0, limit),
      messages,
      relevanceScore,
      timestamp: Date.now(),
    };
  }

  /**
   * 過去の質問を参照
   */
  async referencePastQuestions(
    userId: string,
    topic: string,
    limit: number = 5
  ): Promise<ChatMessage[]> {
    const pastQuestions: ChatMessage[] = [];

    // 全メモリから該当トピックのメモリを検索
    this.longTermMemories.forEach((memory) => {
      if (memory.userId === userId && memory.category === topic) {
        // メモリの内容から質問を抽出（簡易版）
        pastQuestions.push({
          id: `ref_${memory.id}`,
          userId,
          role: 'user',
        content: memory.content,
        timestamp: memory.createdAt,
        metadata: {
          managerUsed: ['ConversationManager'],
          reasoning: `Referenced from past memory: ${memory.id}`,
          confidence: memory.importance,
        },
        });
      }
    });

    // 最新順でソート
    pastQuestions.sort((a, b) => b.timestamp - a.timestamp);

    return pastQuestions.slice(0, limit);
  }

  /**
   * セッションコンテキストを取得
   */
  async getSessionContext(sessionId: string): Promise<ConversationContext | null> {
    return this.sessionContexts.get(sessionId) || null;
  }

  /**
   * コンテキストを更新
   */
  async updateSessionContext(
    sessionId: string,
    newMessages: ChatMessage[]
  ): Promise<ConversationContext | null> {
    const context = this.sessionContexts.get(sessionId);
    if (!context) return null;

    // 最近のメッセージを更新
    context.recentMessages = [
      ...context.recentMessages,
      ...newMessages,
    ].slice(-5);

    // コンテキスト要約を再生成
    context.contextSummary = this.generateContextSummary(
      context.recentMessages,
      context.relevantMemories,
      context.conversationTopic
    );

    return context;
  }

  /**
   * 最近のメッセージを取得
   */
  private async getRecentMessages(
    sessionId: string,
    limit: number
  ): Promise<ChatMessage[]> {
    const memory = this.shortTermMemories.get(sessionId);
    return memory ? memory.messages.slice(-limit) : [];
  }

  /**
   * ユーザーの好みを取得
   */
  private async getUserPreferences(userId: string): Promise<Record<string, any>> {
    // デフォルトを返す
    return {
      responseLength: 'medium',
      detailLevel: 'standard',
      preferredContext: 'general',
    };
  }

  /**
   * 重要度を計算
   */
  private calculateImportance(messages: ChatMessage[]): number {
    if (messages.length === 0) return 0;

    let score = 0;

    // メッセージ数
    score += Math.min(messages.length / 10, 0.3);

    // メッセージの長さ
    const avgLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
    score += Math.min((avgLength / 200) * 0.3, 0.3);

    // メタデータの有無
    const withMetadata = messages.filter((m) => m.metadata).length;
    score += (withMetadata / messages.length) * 0.4;

    return Math.min(score, 1.0);
  }

  /**
   * メッセージを要約
   */
  private async summarizeMessages(messages: ChatMessage[]): Promise<string> {
    if (messages.length === 0) return '';

    const userMessages = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join(' ');

    return userMessages.substring(0, 500);
  }

  /**
   * タグを抽出
   */
  private extractTags(messages: ChatMessage[]): string[] {
    const tags: Set<string> = new Set();

    messages.forEach((msg) => {
      if (msg.metadata && 'context' in msg.metadata && msg.metadata.context) {
        tags.add(msg.metadata.context as string);
      }
      // メッセージから主要なキーワードを抽出
      const words = msg.content.split(/\s+/).slice(0, 3);
      words.forEach((word) => {
        if (word.length > 3) {
          tags.add(word.toLowerCase());
        }
      });
    });

    return Array.from(tags).slice(0, 5);
  }

  /**
   * 関連トピックを抽出
   */
  private extractRelatedTopics(messages: ChatMessage[]): string[] {
    const topics: Set<string> = new Set();

    messages.forEach((msg) => {
      if (msg.metadata && 'context' in msg.metadata && msg.metadata.context) {
        topics.add(msg.metadata.context as string);
      }
    });

    return Array.from(topics);
  }

  /**
   * コンテキスト要約を生成
   */
  private generateContextSummary(
    recentMessages: ChatMessage[],
    memories: LongTermMemory[],
    topic: string
  ): string {
    let summary = `トピック: ${topic}\n`;
    summary += `最近のメッセージ数: ${recentMessages.length}\n`;
    summary += `関連メモリ数: ${memories.length}\n`;

    if (memories.length > 0) {
      summary += `主要メモリ: ${memories[0].content.substring(0, 100)}...`;
    }

    return summary;
  }

  /**
   * メモリをクリア
   */
  async clearMemories(sessionId: string): Promise<void> {
    this.shortTermMemories.delete(sessionId);
    this.sessionContexts.delete(sessionId);

    console.log(`[ConversationManager] Memories cleared for session: ${sessionId}`);
  }

  /**
   * メモリ統計を取得
   */
  getMemoryStatistics(): Record<string, any> {
    return {
      shortTermMemoriesCount: this.shortTermMemories.size,
      longTermMemoriesCount: this.longTermMemories.size,
      indexedKeywordsCount: this.memoryIndex.size,
      sessionContextsCount: this.sessionContexts.size,
      totalMemoriesSize: this.longTermMemories.size,
    };
  }
}
