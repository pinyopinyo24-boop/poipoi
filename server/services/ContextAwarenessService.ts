/**
 * ContextAwarenessService - コンテキスト認識サービス
 */

export interface Context {
  userId: string;
  relatedMemories: string[];
  userPreferences: any;
  conversationHistory: string[];
  relevantData: any;
}

export class ContextAwarenessService {
  constructor(private memoryManager: any) {}

  /**
   * コンテキストを取得
   */
  async getContext(userId: string, message: string): Promise<Context> {
    // メモリから関連情報を取得
    let relatedMemories: string[] = [];
    try {
      const found = await this.memoryManager.searchMemories(userId, message);
      relatedMemories = Array.isArray(found) ? found.filter((entry: unknown): entry is string => typeof entry === 'string' && entry.trim().length > 0).slice(0, 5) : [];
      if (relatedMemories.length === 0) {
        const history = await this.getConversationHistory(userId);
        const words = message.toLowerCase().split(/[\s、。,.!?！？]+/).filter(word => word.length >= 2).slice(0, 20);
        relatedMemories = history.filter(entry => entry !== message && words.some(word => entry.toLowerCase().includes(word))).slice(-5);
      }
    } catch (error) {
      console.warn('[PoiPoi] Related memory search unavailable:', error);
      try {
        const history = await this.getConversationHistory(userId);
        const words = message.toLowerCase().split(/[\s、。,.!?！？]+/).filter(word => word.length >= 2).slice(0, 20);
        relatedMemories = history.filter(entry => entry !== message && words.some(word => entry.toLowerCase().includes(word))).slice(-5);
      } catch (historyError) {
        console.warn('[PoiPoi] Conversation history unavailable:', historyError);
      }
    }

    // ユーザー設定を取得
    const userPreferences = await this.getUserPreferences(userId);

    // 会話履歴を取得
    const conversationHistory = await this.getConversationHistory(userId).catch(error => {
      console.warn('[PoiPoi] Chat context history unavailable:', error);
      return [] as string[];
    });

    // 関連データを取得
    const relevantData = await this.getRelevantData(message);

    return {
      userId,
      relatedMemories,
      userPreferences,
      conversationHistory,
      relevantData,
    };
  }

  /**
   * ユーザー設定を取得
   */
  private async getUserPreferences(userId: string): Promise<any> {
    return {
      language: 'ja',
      timezone: 'Asia/Tokyo',
      responseFormat: 'detailed',
    };
  }

  /**
   * 会話履歴を取得
   */
  private async getConversationHistory(userId: string): Promise<string[]> {
    const { getSharedChatRepository } = await import('../repositories/ChatRepository');
    const repository = getSharedChatRepository();
    const sessions = (await repository.getUserSessions(userId)).slice(0, 10);
    const result: Array<{ content: string; timestamp: number }> = [];
    for (const session of sessions) {
      for (const message of await repository.getMessages(session.id, 50)) {
        if (message.userId === userId && message.role === 'user' && message.content.trim()) {
          result.push({ content: message.content, timestamp: message.timestamp });
        }
      }
    }
    return result.sort((a, b) => a.timestamp - b.timestamp)
      .slice(-50).map(entry => entry.content.slice(0, 2000));
  }

  /**
   * 関連データを取得
   */
  private async getRelevantData(message: string): Promise<any> {
    return {};
  }

  /**
   * コンテキストを更新
   */
  async updateContext(userId: string, context: Partial<Context>): Promise<void> {
    // コンテキストを更新
  }

  /**
   * コンテキストをクリア
   */
  async clearContext(userId: string): Promise<void> {
    // コンテキストをクリア
  }
}
