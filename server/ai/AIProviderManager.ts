/**
 * AI Provider Manager
 * 隍・焚AI繝励Ο繝舌う繝繝ｼ邂｡逅・
 */

export type AIProvider = 'openai' | 'claude' | 'local';

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
   * 繝・ヵ繧ｩ繝ｫ繝医・繝ｭ繝舌う繝繝ｼ繧貞・譛溷喧
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
        provider: 'local',
        apiKey: 'local',
        apiUrl: process.env.LOCAL_AI_URL || 'http://localhost:11434',
        model: 'qwen2.5-coder:7b',
        maxTokens: 2048,
        temperature: 0.7,
        enabled: true,
        priority: 1,
        timeout: 60000,
        retryCount: 1,
      },
    ];

    for (const provider of defaultProviders) {
      this.providers.set(provider.provider, provider);
    }
  }

  /**
   * 繝励Ο繝舌う繝繝ｼ繧堤匳骭ｲ
   */
  registerProvider(config: ProviderConfig): void {
    this.providers.set(config.provider, config);
  }

  /**
   * 繝励Ο繝舌う繝繝ｼ繧貞叙蠕・
   */
  getProvider(provider: AIProvider): ProviderConfig | undefined {
    return this.providers.get(provider);
  }

  /**
   * 譛牙柑縺ｪ繝励Ο繝舌う繝繝ｼ繧貞叙蠕・
   */
  getEnabledProviders(): ProviderConfig[] {
    return Array.from(this.providers.values())
      .filter(p => p.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * 繝励Ο繝舌う繝繝ｼ繧呈怏蜉ｹ蛹・
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
   * 繝励Ο繝舌う繝繝ｼ繧堤┌蜉ｹ蛹・
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
   * 繝励Ο繝舌う繝繝ｼ險ｭ螳壹ｒ譖ｴ譁ｰ
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
   * 繝ｪ繧ｯ繧ｨ繧ｹ繝医ｒ菴懈・
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
   * 繝ｬ繧ｹ繝昴Φ繧ｹ繧剃ｽ懈・
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
   * 繝ｪ繧ｯ繧ｨ繧ｹ繝亥ｱ･豁ｴ繧貞叙蠕・
   */
  getRequestHistory(limit: number = 100): AIRequest[] {
    return this.requestHistory.slice(-limit);
  }

  /**
   * 繝ｬ繧ｹ繝昴Φ繧ｹ螻･豁ｴ繧貞叙蠕・
   */
  getResponseHistory(limit: number = 100): AIResponse[] {
    return this.responseHistory.slice(-limit);
  }

  /**
   * 繝励Ο繝舌う繝繝ｼ蛻･邨ｱ險医ｒ蜿門ｾ・
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
   * 譛驕ｩ縺ｪ繝励Ο繝舌う繝繝ｼ繧帝∈謚・
   */
  selectBestProvider(): ProviderConfig | undefined {
    const enabledProviders = this.getEnabledProviders();

    if (enabledProviders.length === 0) {
      return undefined;
    }

    const localProvider = enabledProviders.find(
      provider => provider.provider === "local"
    );

    if (localProvider) {
      return localProvider;
    }

    return enabledProviders[0];
  }

  /**
   * 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ繝励Ο繝舌う繝繝ｼ繧帝∈謚・
   */
  selectFallbackProvider(excludeProvider?: AIProvider): ProviderConfig | undefined {
    const enabledProviders = this.getEnabledProviders();
    const filtered = excludeProvider
      ? enabledProviders.filter(p => p.provider !== excludeProvider)
      : enabledProviders;

    return filtered.length > 0 ? filtered[0] : undefined;
  }

  /**
   * 繝励Ο繝舌う繝繝ｼ縺ｮ蛛･蜈ｨ諤ｧ繧偵メ繧ｧ繝・け
   */
  async checkProviderHealth(provider: AIProvider): Promise<{ healthy: boolean; error?: string }> {
    const config = this.providers.get(provider);
    if (!config) {
      return { healthy: false, error: 'Provider not found' };
    }

    if (!config.enabled) {
      return { healthy: false, error: 'Provider disabled' };
    }

    if (provider === 'local') {
      try {
        const { LocalAIProvider } = await import("../_core/ai/providers/LocalAIProvider");
        const status = await new LocalAIProvider(config.apiUrl).getStatus();
        return status.isAvailable
          ? { healthy: true }
          : { healthy: false, error: status.errorMessage || 'Local AI unavailable' };
      } catch (error) {
        return {
          healthy: false,
          error: error instanceof Error ? error.message : 'Local AI health check failed',
        };
      }
    }

    if (!config.apiKey) {
      return { healthy: false, error: 'API key not configured' };
    }

    try {
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
   * 縺吶∋縺ｦ縺ｮ繝励Ο繝舌う繝繝ｼ縺ｮ蛛･蜈ｨ諤ｧ繧偵メ繧ｧ繝・け
   */
  async checkAllProvidersHealth(): Promise<Record<AIProvider, { healthy: boolean; error?: string }>> {
    const results: Record<AIProvider, any> = {
      openai: { healthy: false },
      claude: { healthy: false },
      local: { healthy: false },
    };

    const providers: AIProvider[] = Array.from(this.providers.keys());
    for (const provider of providers) {
      results[provider] = await this.checkProviderHealth(provider);
    }

    return results;
  }

  /**
   * 繝励Ο繝舌う繝繝ｼ蜆ｪ蜈亥ｺｦ繧呈峩譁ｰ
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
   * 縺吶∋縺ｦ縺ｮ繝励Ο繝舌う繝繝ｼ繧貞叙蠕・
   */
  getAllProviders(): ProviderConfig[] {
    return Array.from(this.providers.values());
  }

  /**
   * 繝励Ο繝舌う繝繝ｼ縺ｮ邨ｱ險域ュ蝣ｱ繧貞叙蠕・
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

  /**
   * Execute an AI request through the selected provider.
   */
  async invoke(messages: unknown[]): Promise<string> {
    const config = this.selectBestProvider();

    if (!config) {
      throw new Error("利用可能なAI Providerがありません");
    }

    if (config.provider === "local") {
      const { LocalAIProvider } = await import("../_core/ai/providers/LocalAIProvider");
      const provider = new LocalAIProvider(config.apiUrl);

      const response = await provider.invoke(messages as any[], {
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      });

      if (!response?.content?.trim()) {
        throw new Error("Local AIから空の応答が返されました");
      }

      return response.content;
    }

    throw new Error(
      `Provider ${config.provider} のinvoke実装はまだ接続されていません`
    );
  }
}

/**
 * 繧ｰ繝ｭ繝ｼ繝舌ΝAI繝励Ο繝舌う繝繝ｼ繝槭ロ繝ｼ繧ｸ繝｣繝ｼ繧､繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ
 */
export const aiProviderManager = new AIProviderManager();






