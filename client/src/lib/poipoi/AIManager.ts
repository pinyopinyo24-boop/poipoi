/**
 * AI Manager - PoiPoi AI Core
 * AI プロバイダー管理
 */

export interface AIProvider {
  id: string;
  name: string;
  chat: (message: string) => Promise<string>;
}

class AIManager {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProvider: string | null = null;

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

  setDefault(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error("AIが見つかりません");
    }

    this.defaultProvider = id;
  }

  get(id?: string): AIProvider | undefined {
    const providerId = id || this.defaultProvider;
    return this.providers.get(providerId || "");
  }

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
      console.log(`✅ AI応答受信`);
      return response;
    } catch (error) {
      console.error(`❌ AI通信エラー:`, error);
      throw error;
    }
  }

  getProviderCount(): number {
    return this.providers.size;
  }

  hasProvider(id: string): boolean {
    return this.providers.has(id);
  }
}

export default AIManager;
