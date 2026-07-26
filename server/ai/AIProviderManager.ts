/**
 * AI Provider Manager
 * 複数AIプロバイダー管理
 */

export type AIProvider = 'openai' | 'claude' | 'gemini' | 'local';

export interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  apiUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
  priority: number;
  timeout: number;
  retryCount: number;
}

export interface AIRequest {
  id: string;
  provider: AIProvider;
  model: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
  timestamp: number;
}

export interface AIResponse {
  id: string;
  requestId: string;
  provider: AIProvider;
  model: string;
  content: string;
  tokens: number;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

/**
 * AI Provider Manager
 */
export class AIProviderManager {
  private providers: Map<AIProvider, ProviderConfig> = new Map();
  private requests: Map<string, AIRequest> = new Map();
  private responses: Map<string, AIResponse> = new Map();
  private requestHistory: AIRequest[] = [];
  private responseHistory: AIResponse[] = [];

  constructor() {
    this.initializeDefaultProviders();
  }

  /**
   * デフォルトプロバイダーを初期化
   */
  private initializeDefaultProviders(): void {
    const defaultProviders: ProviderConfig[] = [
      {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        apiUrl: process.env.OPENAI_API_URL || 'https://api.openai.com/v1',
        model: 'gpt-4',
        maxTokens: 4096,
        temperature: 0.7,
        enabled: !!process.env.OPENAI_API_KEY,
        priority: 1,
        timeout: 30000,
        retryCount: 3,
      },
      {
        provider: 'claude',
        apiKey: process.env.CLAUDE_API_KEY || '',
        apiUrl: process.env.CLAUDE_API_URL || 'https://api.anthropic.com',
        model: 'claude-3-opus',
        maxTokens: 4096,
        temperature: 0.7,
        enabled: !!process.env.CLAUDE_API_KEY,
        priority: 2,
        timeout: 30000,
        retryCount: 3,
      },
      {
        provider: 'gemini',
        apiKey: process.env.GEMINI_API_KEY || '',
        apiUrl: process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com',
        model: 'gemini-pro',
        maxTokens: 4096,
        temperature: 0.7,
        enabled: !!process.env.GEMINI_API_KEY,
        priority: 3,
        timeout: 30000,
        retryCount: 3,
      },
      {
        provider: 'local',
        apiKey: 'local',
        apiUrl: process.env.LOCAL_AI_URL || 'http://localhost:11434',
        model: process.env.LOCAL_AI_MODEL || 'qwen2.5:7b',
        maxTokens: 2048,
        temperature: 0.7,
        enabled: true,
        priority: 4,
        timeout: 60000,
        retryCount: 1,
      },
    ];

    for (const provider of defaultProviders) {
      this.providers.set(provider.provider, provider);
    }
  }

  /**
   * プロバイダーを登録
   */
  registerProvider(config: ProviderConfig): void {
    this.providers.set(config.provider, config);
  }

  /**
   * プロバイダーを取得
   */
  getProvider(provider: AIProvider): ProviderConfig | undefined {
    return this.providers.get(provider);
  }

  /**
   * 有効なプロバイダーを取得
   */
  getEnabledProviders(): ProviderConfig[] {
    return Array.from(this.providers.values())
      .filter(p => p.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * プロバイダーを有効化
   */
  enableProvider(provider: AIProvider): boolean {
    const config = this.providers.get(provider);
    if (config) {
      config.enabled = true;
      return true;
    }
    return false;
  }

  /**
   * プロバイダーを無効化
   */
  disableProvider(provider: AIProvider): boolean {
    const config = this.providers.get(provider);
    if (config) {
      config.enabled = false;
      return true;
    }
    return false;
  }

  /**
   * プロバイダー設定を更新
   */
  updateProvider(provider: AIProvider, updates: Partial<ProviderConfig>): boolean {
    const config = this.providers.get(provider);
    if (config) {
      Object.assign(config, updates);
      return true;
    }
    return false;
  }

  /**
   * リクエストを作成
   */
  createRequest(
    provider: AIProvider,
    prompt: string,
    model?: string,
    maxTokens?: number,
    temperature?: number
  ): AIRequest {
    const config = this.providers.get(provider);
    if (!config) {
      throw new Error(`Provider ${provider} not found`);
    }

    const request: AIRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider,
      model: model || config.model,
      prompt,
      maxTokens: maxTokens || config.maxTokens,
      temperature: temperature || config.temperature,
      timestamp: Date.now(),
    };

    this.requests.set(request.id, request);
    this.requestHistory.push(request);

    return request;
  }

  /**
   * レスポンスを作成
   */
  createResponse(
    requestId: string,
    content: string,
    tokens: number,
    duration: number,
    success: boolean,
    error?: string
  ): AIResponse {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    const response: AIResponse = {
      id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requestId,
      provider: request.provider,
      model: request.model,
      content,
      tokens,
      duration,
      timestamp: Date.now(),
      success,
      error,
    };

    this.responses.set(response.id, response);
    this.responseHistory.push(response);

    return response;
  }

  /**
   * リクエスト履歴を取得
   */
  getRequestHistory(limit: number = 100): AIRequest[] {
    return this.requestHistory.slice(-limit);
  }

  /**
   * レスポンス履歴を取得
   */
  getResponseHistory(limit: number = 100): AIResponse[] {
    return this.responseHistory.slice(-limit);
  }

  /**
   * プロバイダー別統計を取得
   */
  getProviderStats(): Record<AIProvider, {
    requestCount: number;
    successCount: number;
    failureCount: number;
    averageTokens: number;
    averageDuration: number;
  }> {
    const stats: Record<AIProvider, any> = {
      openai: { requestCount: 0, successCount: 0, failureCount: 0, totalTokens: 0, totalDuration: 0 },
      claude: { requestCount: 0, successCount: 0, failureCount: 0, totalTokens: 0, totalDuration: 0 },
      gemini: { requestCount: 0, successCount: 0, failureCount: 0, totalTokens: 0, totalDuration: 0 },
      local: { requestCount: 0, successCount: 0, failureCount: 0, totalTokens: 0, totalDuration: 0 },
    };

    for (const response of this.responseHistory) {
      const provider = response.provider;
      stats[provider].requestCount++;
      if (response.success) {
        stats[provider].successCount++;
      } else {
        stats[provider].failureCount++;
      }
      stats[provider].totalTokens += response.tokens;
      stats[provider].totalDuration += response.duration;
    }

    // Calculate averages
    for (const provider in stats) {
      const stat = stats[provider as AIProvider];
      stat.averageTokens = stat.requestCount > 0 ? stat.totalTokens / stat.requestCount : 0;
      stat.averageDuration = stat.requestCount > 0 ? stat.totalDuration / stat.requestCount : 0;
      delete stat.totalTokens;
      delete stat.totalDuration;
    }

    return stats;
  }

  /**
   * 最適なプロバイダーを選択
   */
  selectBestProvider(): ProviderConfig | undefined {
    const enabledProviders = this.getEnabledProviders();
    if (enabledProviders.length === 0) {
      return undefined;
    }

    // 優先度が最も高いプロバイダーを返す
    return enabledProviders[0];
  }

  /**
   * フォールバックプロバイダーを選択
   */
  selectFallbackProvider(excludeProvider?: AIProvider): ProviderConfig | undefined {
    const enabledProviders = this.getEnabledProviders();
    const filtered = excludeProvider
      ? enabledProviders.filter(p => p.provider !== excludeProvider)
      : enabledProviders;

    return filtered.length > 0 ? filtered[0] : undefined;
  }

  /**
   * プロバイダーの健全性をチェック
   */
  async checkProviderHealth(provider: AIProvider): Promise<{ healthy: boolean; error?: string }> {
    const config = this.providers.get(provider);
    if (!config) {
      return { healthy: false, error: 'Provider not found' };
    }

    if (!config.enabled) {
      return { healthy: false, error: 'Provider disabled' };
    }

    if (!config.apiKey) {
      return { healthy: false, error: 'API key not configured' };
    }

    try {
      // Simulate health check
      await new Promise(resolve => setTimeout(resolve, 100));
      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  /**
   * すべてのプロバイダーの健全性をチェック
   */
  async checkAllProvidersHealth(): Promise<Record<AIProvider, { healthy: boolean; error?: string }>> {
    const results: Record<AIProvider, any> = {
      openai: { healthy: false },
      claude: { healthy: false },
      gemini: { healthy: false },
      local: { healthy: false },
    };

    const providers: AIProvider[] = Array.from(this.providers.keys());
    for (const provider of providers) {
      results[provider] = await this.checkProviderHealth(provider);
    }

    return results;
  }

  /**
   * プロバイダー優先度を更新
   */
  updateProviderPriority(provider: AIProvider, priority: number): boolean {
    const config = this.providers.get(provider);
    if (config) {
      config.priority = priority;
      return true;
    }
    return false;
  }

  /**
   * すべてのプロバイダーを取得
   */
  getAllProviders(): ProviderConfig[] {
    return Array.from(this.providers.values());
  }

  /**
   * プロバイダーの統計情報を取得
   */
  getStatistics(): {
    totalProviders: number;
    enabledProviders: number;
    totalRequests: number;
    totalResponses: number;
    successRate: number;
    averageTokensPerRequest: number;
    averageDurationPerRequest: number;
  } {
    const enabledCount = Array.from(this.providers.values()).filter(p => p.enabled).length;
    const successCount = this.responseHistory.filter(r => r.success).length;
    const totalTokens = this.responseHistory.reduce((sum, r) => sum + r.tokens, 0);
    const totalDuration = this.responseHistory.reduce((sum, r) => sum + r.duration, 0);

    return {
      totalProviders: this.providers.size,
      enabledProviders: enabledCount,
      totalRequests: this.requestHistory.length,
      totalResponses: this.responseHistory.length,
      successRate: this.responseHistory.length > 0
        ? (successCount / this.responseHistory.length) * 100
        : 0,
      averageTokensPerRequest: this.responseHistory.length > 0
        ? totalTokens / this.responseHistory.length
        : 0,
      averageDurationPerRequest: this.responseHistory.length > 0
        ? totalDuration / this.responseHistory.length
        : 0,
    };
  }
}

/**
 * グローバルAIプロバイダーマネージャーインスタンス
 */
export const aiProviderManager = new AIProviderManager();
