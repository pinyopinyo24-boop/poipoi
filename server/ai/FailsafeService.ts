/**
 * Failsafe Service
 * エラーハンドリングとフォールバック機能
 */

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  provider: string;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export interface FailsafeMetrics {
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  circuitBreakerTrips: number;
  fallbackUsageCount: number;
  lastFailure?: number;
  lastSuccess?: number;
}

export interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
}

/**
 * Circuit Breaker
 */
class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * リクエストを実行
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.isResetTimeout()) {
        this.state = 'half-open';
      } else {
        throw new Error(`Circuit breaker is open for ${this.config.provider}`);
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.config.timeout)
        ),
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 成功時の処理
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.lastSuccessTime = Date.now();

    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'closed';
        this.successCount = 0;
      }
    }
  }

  /**
   * 失敗時の処理
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  /**
   * リセットタイムアウトをチェック
   */
  private isResetTimeout(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime >= this.config.resetTimeout;
  }

  /**
   * 状態を取得
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * メトリクスを取得
   */
  getMetrics(): { failureCount: number; successCount: number; state: CircuitBreakerState } {
    return {
      failureCount: this.failureCount,
      successCount: this.successCount,
      state: this.state,
    };
  }

  /**
   * リセット
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
  }
}

/**
 * Failsafe Service
 */
export class FailsafeService {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private metrics: Map<string, FailsafeMetrics> = new Map();
  private retryPolicies: Map<string, RetryPolicy> = new Map();
  private fallbackProviders: Map<string, string[]> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  /**
   * デフォルト設定を初期化
   */
  private initializeDefaultConfigs(): void {
    const defaultConfigs: CircuitBreakerConfig[] = [
      {
        provider: 'openai',
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 30000,
        resetTimeout: 60000,
      },
      {
        provider: 'claude',
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 30000,
        resetTimeout: 60000,
      },
      {
        provider: 'gemini',
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 30000,
        resetTimeout: 60000,
      },
      {
        provider: 'local',
        failureThreshold: 3,
        successThreshold: 1,
        timeout: 60000,
        resetTimeout: 30000,
      },
    ];

    for (const config of defaultConfigs) {
      this.circuitBreakers.set(config.provider, new CircuitBreaker(config));
      this.metrics.set(config.provider, {
        provider: config.provider,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        circuitBreakerTrips: 0,
        fallbackUsageCount: 0,
      });
    }

    // Set default retry policies
    const defaultRetryPolicy: RetryPolicy = {
      maxAttempts: 3,
      initialDelayMs: 100,
      maxDelayMs: 5000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
    };

    for (const config of defaultConfigs) {
      this.retryPolicies.set(config.provider, defaultRetryPolicy);
    }

    // Set fallback providers
    this.fallbackProviders.set('openai', ['claude', 'gemini', 'local']);
    this.fallbackProviders.set('claude', ['openai', 'gemini', 'local']);
    this.fallbackProviders.set('gemini', ['openai', 'claude', 'local']);
    this.fallbackProviders.set('local', ['openai', 'claude', 'gemini']);
  }

  /**
   * リクエストを実行（リトライとサーキットブレーカー付き）
   */
  async executeWithFailsafe<T>(
    provider: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const circuitBreaker = this.circuitBreakers.get(provider);
    const retryPolicy = this.retryPolicies.get(provider);
    const metrics = this.metrics.get(provider);

    if (!circuitBreaker || !retryPolicy || !metrics) {
      throw new Error(`Provider ${provider} not configured`);
    }

    metrics.totalRequests++;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retryPolicy.maxAttempts; attempt++) {
      try {
        const result = await circuitBreaker.execute(fn);
        metrics.successfulRequests++;
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retryPolicy.maxAttempts - 1) {
          const delay = this.calculateBackoffDelay(attempt, retryPolicy);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    metrics.failedRequests++;
    throw lastError || new Error(`All retry attempts failed for ${provider}`);
  }

  /**
   * バックオフ遅延を計算
   */
  private calculateBackoffDelay(attempt: number, policy: RetryPolicy): number {
    const exponentialDelay = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attempt);
    const jitter = exponentialDelay * policy.jitterFactor * Math.random();
    const delay = exponentialDelay + jitter;

    return Math.min(delay, policy.maxDelayMs);
  }

  /**
   * フォールバックプロバイダーでリクエストを実行
   */
  async executeWithFallback<T>(
    primaryProvider: string,
    fn: (provider: string) => Promise<T>
  ): Promise<T> {
    const providers = [primaryProvider, ...(this.fallbackProviders.get(primaryProvider) || [])];

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        const result = await this.executeWithFailsafe(provider, () => fn(provider));

        // Record fallback usage if not primary provider
        if (provider !== primaryProvider) {
          const metrics = this.metrics.get(provider);
          if (metrics) {
            metrics.fallbackUsageCount++;
          }
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }

    throw lastError || new Error('All providers failed');
  }

  /**
   * サーキットブレーカーの状態を取得
   */
  getCircuitBreakerState(provider: string): CircuitBreakerState | null {
    return this.circuitBreakers.get(provider)?.getState() || null;
  }

  /**
   * すべてのサーキットブレーカーの状態を取得
   */
  getAllCircuitBreakerStates(): Record<string, CircuitBreakerState> {
    const states: Record<string, CircuitBreakerState> = {};

    const entries = Array.from(this.circuitBreakers.entries());
    for (const [provider, breaker] of entries) {
      states[provider] = breaker.getState();
    }

    return states;
  }

  /**
   * サーキットブレーカーをリセット
   */
  resetCircuitBreaker(provider: string): boolean {
    const breaker = this.circuitBreakers.get(provider);
    if (breaker) {
      breaker.reset();
      return true;
    }
    return false;
  }

  /**
   * すべてのサーキットブレーカーをリセット
   */
  resetAllCircuitBreakers(): void {
    const breakers = Array.from(this.circuitBreakers.values());
    for (const breaker of breakers) {
      breaker.reset();
    }
  }

  /**
   * メトリクスを取得
   */
  getMetrics(provider: string): FailsafeMetrics | null {
    return this.metrics.get(provider) || null;
  }

  /**
   * すべてのメトリクスを取得
   */
  getAllMetrics(): FailsafeMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * リトライポリシーを設定
   */
  setRetryPolicy(provider: string, policy: RetryPolicy): void {
    this.retryPolicies.set(provider, policy);
  }

  /**
   * フォールバックプロバイダーを設定
   */
  setFallbackProviders(provider: string, fallbacks: string[]): void {
    this.fallbackProviders.set(provider, fallbacks);
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<Record<string, { healthy: boolean; state: CircuitBreakerState }>> {
    const health: Record<string, any> = {};

    const entries = Array.from(this.circuitBreakers.entries());
    for (const [provider, breaker] of entries) {
      const state = breaker.getState();
      health[provider] = {
        healthy: state !== 'open',
        state,
      };
    }

    return health;
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): {
    totalRequests: number;
    totalSuccessful: number;
    totalFailed: number;
    successRate: number;
    totalFallbackUsage: number;
    openCircuitBreakers: number;
  } {
    const metrics = Array.from(this.metrics.values());
    const totalRequests = metrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const totalSuccessful = metrics.reduce((sum, m) => sum + m.successfulRequests, 0);
    const totalFailed = metrics.reduce((sum, m) => sum + m.failedRequests, 0);
    const totalFallbackUsage = metrics.reduce((sum, m) => sum + m.fallbackUsageCount, 0);

    const states = this.getAllCircuitBreakerStates();
    const openCircuitBreakers = Object.values(states).filter(s => s === 'open').length;

    return {
      totalRequests,
      totalSuccessful,
      totalFailed,
      successRate: totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 0,
      totalFallbackUsage,
      openCircuitBreakers,
    };
  }
}

/**
 * グローバルFailsafeサービスインスタンス
 */
export const failsafeService = new FailsafeService();
