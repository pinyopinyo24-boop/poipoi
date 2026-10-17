import { failsafeService } from '../../ai/FailsafeService';
import {
  AIInvokeOptions,
  AIMessage,
  AIModel,
  AIProviderStatus,
  AIProviderType,
  AIResponse,
  IAIProvider,
} from './providers/AIProvider';

function metricsKey(provider: AIProviderType): string {
  return provider === 'chatgpt' ? 'openai' : provider;
}

/** Retries and falls back only among provider instances configured by AICore. */
export class ResilientAIProvider implements IAIProvider {
  private readonly providersByKey: Map<string, IAIProvider>;

  constructor(private readonly primary: IAIProvider, candidates: IAIProvider[]) {
    this.providersByKey = new Map([[metricsKey(primary.getProviderType()), primary]]);
    for (const candidate of candidates) this.providersByKey.set(metricsKey(candidate.getProviderType()), candidate);

    const primaryKey = metricsKey(primary.getProviderType());
    const fallbackKeys = Array.from(this.providersByKey.keys()).filter((key) => key !== primaryKey);
    failsafeService.setFallbackProviders(primaryKey, fallbackKeys);
    for (const key of this.providersByKey.keys()) {
      failsafeService.setFallbackProviders(key, [
        ...Array.from(this.providersByKey.keys()).filter((candidate) => candidate !== key),
      ]);
      // Bound retries to one retry per provider; avoid retry storms or surprise billing spikes.
      failsafeService.setRetryPolicy(key, {
        maxAttempts: 2,
        initialDelayMs: 250,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
      });
    }
  }

  getProviderType(): AIProviderType {
    return this.primary.getProviderType();
  }

  invoke(messages: AIMessage[], options?: AIInvokeOptions): Promise<AIResponse> {
    return failsafeService.executeWithFallback(
      metricsKey(this.primary.getProviderType()),
      (key) => {
        const provider = this.providersByKey.get(key);
        if (!provider) throw new Error(`AI provider '${key}' is not configured`);
        return provider.invoke(messages, options);
      },
    );
  }

  getModels(): Promise<AIModel[]> {
    return this.primary.getModels();
  }

  getStatus(): Promise<AIProviderStatus> {
    return this.primary.getStatus();
  }

  validateConfig(): Promise<boolean> {
    return this.primary.validateConfig();
  }

  getName(): string {
    return `${this.primary.getName()} (retry/fallback enabled)`;
  }

  getApiKeyStatus(): 'configured' | 'missing' | 'invalid' {
    return this.primary.getApiKeyStatus();
  }
}
