/**
 * AI Manager for PoiPoi AI
 * Manages multiple AI providers
 */

export interface AIProvider {
  id: string;
  name: string;
  chat: (message: string) => Promise<string>;
  [key: string]: any;
}

export interface ChatMessage {
  provider: string;
  message: string;
  response: string;
  timestamp: string;
}

class AIManager {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProvider: string | null = null;
  private chatHistory: ChatMessage[] = [];
  private maxHistory = 10000;

  /**
   * Register an AI provider
   */
  register(provider: AIProvider): void {
    if (!provider.id || typeof provider.chat !== "function") {
      throw new Error("無効なAIプロバイダーです");
    }

    this.providers.set(provider.id, provider);

    if (!this.defaultProvider) {
      this.defaultProvider = provider.id;
    }

    console.log(`✅ AIプロバイダー登録: ${provider.name}`);
  }

  /**
   * Set default provider
   */
  setDefault(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error("AIが見つかりません");
    }

    this.defaultProvider = id;
    console.log(`✅ デフォルトAI変更: ${id}`);
  }

  /**
   * Get a provider
   */
  get(id?: string): AIProvider | undefined {
    const providerId = id || this.defaultProvider;
    return this.providers.get(providerId || "");
  }

  /**
   * Get all providers
   */
  getAll(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Chat with AI
   */
  async chat(message: string, providerId?: string): Promise<string> {
    const id = providerId || this.defaultProvider;

    if (!id) {
      throw new Error("AIプロバイダーが設定されていません");
    }

    const provider = this.providers.get(id);

    if (!provider) {
      throw new Error(`AIが存在しません: ${id}`);
    }

    console.log(`🤖 AI送信: ${provider.name}`);

    try {
      const response = await provider.chat(message);

      const chatMessage: ChatMessage = {
        provider: provider.name,
        message,
        response,
        timestamp: new Date().toISOString(),
      };

      this.chatHistory.push(chatMessage);

      // Keep history manageable
      if (this.chatHistory.length > this.maxHistory) {
        this.chatHistory = this.chatHistory.slice(-this.maxHistory);
      }

      console.log(`✅ AI応答受信`);

      return response;
    } catch (error) {
      console.error(`❌ AI通信エラー:`, error);
      throw error;
    }
  }

  /**
   * Get chat history
   */
  getChatHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  /**
   * Get recent chat messages
   */
  getRecent(limit: number = 10): ChatMessage[] {
    return this.chatHistory.slice(-limit);
  }

  /**
   * Get chat history by provider
   */
  getHistoryByProvider(providerId: string): ChatMessage[] {
    const provider = this.providers.get(providerId);
    if (!provider) return [];

    return this.chatHistory.filter((msg) => msg.provider === provider.name);
  }

  /**
   * Clear chat history
   */
  clearHistory(): void {
    this.chatHistory = [];
    console.log("🧹 チャット履歴をクリアしました");
  }

  /**
   * Get provider count
   */
  getProviderCount(): number {
    return this.providers.size;
  }

  /**
   * Check if provider exists
   */
  hasProvider(id: string): boolean {
    return this.providers.has(id);
  }

  /**
   * Remove provider
   */
  removeProvider(id: string): boolean {
    const deleted = this.providers.delete(id);

    if (deleted) {
      if (this.defaultProvider === id) {
        this.defaultProvider = this.providers.size > 0 ? Array.from(this.providers.keys())[0] : null;
      }
      console.log(`✅ AIプロバイダー削除: ${id}`);
    }

    return deleted;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalProviders: this.providers.size,
      defaultProvider: this.defaultProvider,
      providers: Array.from(this.providers.values()).map((p) => ({
        id: p.id,
        name: p.name,
      })),
      chatCount: this.chatHistory.length,
      lastChat: this.chatHistory[this.chatHistory.length - 1],
    };
  }

  /**
   * Export chat history as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        stats: this.getStats(),
        chatHistory: this.chatHistory,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }
}

export default AIManager;
