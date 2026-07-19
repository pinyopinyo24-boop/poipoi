/**
 * Enhanced Failsafe Service with Health Check and Auto Failover
 * ヘルスチェックと自動フェイルオーバー付きフェイルセーフサービス
 */

export type ProviderHealth = 'healthy' | 'degraded' | 'unhealthy';
export type FailoverStrategy = 'round-robin' | 'priority' | 'weighted' | 'random';
export type ErrorClassification = 'transient' | 'permanent' | 'rate-limit' | 'auth' | 'unknown';

export interface ProviderHealthStatus {
  provider: string;
  status: ProviderHealth;
  lastCheckTime: number;
  responseTime: number;
  errorCount: number;
  successCount: number;
  uptime: number;
  downtime: number;
}

export interface FailoverEvent {
  id: string;
  timestamp: number;
  fromProvider: string;
  toProvider: string;
  reason: string;
  errorClassification: ErrorClassification;
  recoveryTime?: number;
  successful: boolean;
}

export interface RecoveryLog {
  id: string;
  timestamp: number;
  provider: string;
  errorType: string;
  action: string;
  result: 'success' | 'failure' | 'partial';
  details?: Record<string, any>;
}

export interface FailsafeConfig {
  healthCheckInterval: number;
  failoverThreshold: number;
  recoveryTimeout: number;
  maxRetries: number;
  strategy: FailoverStrategy;
  enableAutoFailover: boolean;
  enableLearning: boolean;
}

/**
 * Enhanced Failsafe Service
 */
export class EnhancedFailsafeService {
  private healthStatus: Map<string, ProviderHealthStatus> = new Map();
  private failoverEvents: FailoverEvent[] = [];
  private recoveryLogs: RecoveryLog[] = [];
  private config: FailsafeConfig;
  private healthCheckInterval?: NodeJS.Timeout;
  private failoverHistory: Map<string, FailoverEvent[]> = new Map();
  private errorPatterns: Map<string, ErrorClassification[]> = new Map();
  private learningData: Map<string, any> = new Map();

  constructor(config?: Partial<FailsafeConfig>) {
    this.config = {
      healthCheckInterval: 30000, // 30 seconds
      failoverThreshold: 3,
      recoveryTimeout: 60000, // 1 minute
      maxRetries: 3,
      strategy: 'priority',
      enableAutoFailover: true,
      enableLearning: true,
      ...config,
    };

    this.initializeProviders();
    this.startHealthChecks();
  }

  /**
   * プロバイダーを初期化
   */
  private initializeProviders(): void {
    const providers = ['openai', 'claude', 'gemini', 'local'];

    for (const provider of providers) {
      this.healthStatus.set(provider, {
        provider,
        status: 'healthy',
        lastCheckTime: Date.now(),
        responseTime: 0,
        errorCount: 0,
        successCount: 0,
        uptime: 100,
        downtime: 0,
      });

      this.failoverHistory.set(provider, []);
      this.errorPatterns.set(provider, []);
    }
  }

  /**
   * ヘルスチェックを開始
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  /**
   * ヘルスチェックを実行
   */
  private async performHealthChecks(): Promise<void> {
    const providers = Array.from(this.healthStatus.keys());

    for (const provider of providers) {
      try {
        const startTime = Date.now();
        await this.checkProviderHealth(provider);
        const responseTime = Date.now() - startTime;

        const status = this.healthStatus.get(provider);
        if (status) {
          status.responseTime = responseTime;
          status.successCount++;
          status.lastCheckTime = Date.now();

          // Update status based on response time and error count
          if (responseTime > 5000 || status.errorCount > 5) {
            status.status = 'degraded';
          } else if (status.errorCount > 10) {
            status.status = 'unhealthy';
          } else {
            status.status = 'healthy';
          }
        }
      } catch (error) {
        const status = this.healthStatus.get(provider);
        if (status) {
          status.errorCount++;
          status.lastCheckTime = Date.now();

          if (status.errorCount > this.config.failoverThreshold) {
            status.status = 'unhealthy';
          } else if (status.errorCount > 2) {
            status.status = 'degraded';
          }
        }
      }
    }
  }

  /**
   * プロバイダーのヘルスチェック
   */
  private async checkProviderHealth(provider: string): Promise<void> {
    // Simulate health check
    // In production, this would make actual API calls
    const random = Math.random();
    if (random < 0.1) {
      throw new Error(`Health check failed for ${provider}`);
    }
  }

  /**
   * エラーを分類
   */
  classifyError(errorMessage: string, statusCode?: number): ErrorClassification {
    const message = errorMessage.toLowerCase();

    if (statusCode === 429 || message.includes('rate limit')) {
      return 'rate-limit';
    }

    if (statusCode === 401 || statusCode === 403 || message.includes('auth')) {
      return 'auth';
    }

    if (
      statusCode === 500 ||
      statusCode === 502 ||
      statusCode === 503 ||
      message.includes('timeout')
    ) {
      return 'transient';
    }

    if (statusCode === 400 || message.includes('invalid')) {
      return 'permanent';
    }

    return 'unknown';
  }

  /**
   * フェイルオーバーを実行
   */
  async executeFailover(
    currentProvider: string,
    error: Error,
    fallbackProviders: string[]
  ): Promise<{ provider: string; success: boolean }> {
    const errorClassification = this.classifyError(error.message);
    const failoverEvent: FailoverEvent = {
      id: `failover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      fromProvider: currentProvider,
      toProvider: '',
      reason: error.message,
      errorClassification,
      successful: false,
    };

    // Record error pattern
    const patterns = this.errorPatterns.get(currentProvider) || [];
    patterns.push(errorClassification);
    if (patterns.length > 100) {
      patterns.shift();
    }
    this.errorPatterns.set(currentProvider, patterns);

    // Select failover provider
    const selectedProvider = this.selectFailoverProvider(
      currentProvider,
      fallbackProviders,
      errorClassification
    );

    if (!selectedProvider) {
      this.failoverEvents.push(failoverEvent);
      return { provider: currentProvider, success: false };
    }

    failoverEvent.toProvider = selectedProvider;

    try {
      // Attempt failover
      const startTime = Date.now();
      // In production, this would attempt the operation on the new provider
      await this.testProviderConnection(selectedProvider);
      failoverEvent.recoveryTime = Date.now() - startTime;
      failoverEvent.successful = true;

      // Record recovery
      this.recordRecovery(selectedProvider, 'failover', 'success', {
        fromProvider: currentProvider,
        recoveryTime: failoverEvent.recoveryTime,
      });

      // Update learning data
      if (this.config.enableLearning) {
        this.updateLearningData(currentProvider, selectedProvider, errorClassification);
      }

      return { provider: selectedProvider, success: true };
    } catch (failoverError) {
      this.recordRecovery(selectedProvider, 'failover', 'failure', {
        fromProvider: currentProvider,
        error: failoverError instanceof Error ? failoverError.message : String(failoverError),
      });

      return { provider: currentProvider, success: false };
    } finally {
      this.failoverEvents.push(failoverEvent);
      const history = this.failoverHistory.get(currentProvider) || [];
      history.push(failoverEvent);
      if (history.length > 100) {
        history.shift();
      }
      this.failoverHistory.set(currentProvider, history);
    }
  }

  /**
   * フェイルオーバープロバイダーを選択
   */
  private selectFailoverProvider(
    currentProvider: string,
    fallbackProviders: string[],
    errorClassification: ErrorClassification
  ): string | null {
    // Filter out unhealthy providers
    const healthyProviders = fallbackProviders.filter(p => {
      const status = this.healthStatus.get(p);
      return status && status.status !== 'unhealthy';
    });

    if (healthyProviders.length === 0) {
      return fallbackProviders[0] || null;
    }

    switch (this.config.strategy) {
      case 'priority':
        return healthyProviders[0];

      case 'round-robin':
        return healthyProviders[Math.floor(Math.random() * healthyProviders.length)];

      case 'weighted':
        return this.selectWeightedProvider(healthyProviders);

      case 'random':
        return healthyProviders[Math.floor(Math.random() * healthyProviders.length)];

      default:
        return healthyProviders[0];
    }
  }

  /**
   * 重み付けプロバイダーを選択
   */
  private selectWeightedProvider(providers: string[]): string {
    const weights = providers.map(p => {
      const status = this.healthStatus.get(p);
      if (!status) return 1;

      // Weight based on uptime and response time
      const uptimeWeight = status.uptime / 100;
      const responseTimeWeight = Math.max(0, 1 - status.responseTime / 10000);

      return (uptimeWeight + responseTimeWeight) / 2;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < providers.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return providers[i];
      }
    }

    return providers[0];
  }

  /**
   * プロバイダー接続をテスト
   */
  private async testProviderConnection(provider: string): Promise<void> {
    // Simulate connection test
    // In production, this would make actual API calls
    const random = Math.random();
    if (random < 0.05) {
      throw new Error(`Connection test failed for ${provider}`);
    }
  }

  /**
   * リカバリーを記録
   */
  private recordRecovery(
    provider: string,
    action: string,
    result: 'success' | 'failure' | 'partial',
    details?: Record<string, any>
  ): void {
    const log: RecoveryLog = {
      id: `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      provider,
      errorType: action,
      action,
      result,
      details,
    };

    this.recoveryLogs.push(log);

    // Keep only last 1000 logs
    if (this.recoveryLogs.length > 1000) {
      this.recoveryLogs = this.recoveryLogs.slice(-1000);
    }
  }

  /**
   * 学習データを更新
   */
  private updateLearningData(
    failedProvider: string,
    successfulProvider: string,
    errorType: ErrorClassification
  ): void {
    const key = `${failedProvider}_to_${successfulProvider}`;
    const data = this.learningData.get(key) || {
      count: 0,
      errorTypes: {},
      averageRecoveryTime: 0,
    };

    data.count++;
    data.errorTypes[errorType] = (data.errorTypes[errorType] || 0) + 1;

    this.learningData.set(key, data);
  }

  /**
   * ヘルスステータスを取得
   */
  getHealthStatus(provider?: string): ProviderHealthStatus | ProviderHealthStatus[] | null {
    if (provider) {
      return this.healthStatus.get(provider) || null;
    }

    return Array.from(this.healthStatus.values());
  }

  /**
   * フェイルオーバーイベントを取得
   */
  getFailoverEvents(provider?: string, limit: number = 100): FailoverEvent[] {
    const events = provider
      ? this.failoverHistory.get(provider) || []
      : this.failoverEvents;

    return events.slice(-limit);
  }

  /**
   * リカバリーログを取得
   */
  getRecoveryLogs(provider?: string, limit: number = 100): RecoveryLog[] {
    const logs = provider
      ? this.recoveryLogs.filter(log => log.provider === provider)
      : this.recoveryLogs;

    return logs.slice(-limit);
  }

  /**
   * エラーパターンを取得
   */
  getErrorPatterns(provider: string): ErrorClassification[] {
    return this.errorPatterns.get(provider) || [];
  }

  /**
   * 学習データを取得
   */
  getLearningData(): Record<string, any> {
    const data: Record<string, any> = {};

    const entries = Array.from(this.learningData.entries());
    for (const [key, value] of entries) {
      data[key] = value;
    }

    return data;
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): {
    totalFailovers: number;
    successfulFailovers: number;
    failedFailovers: number;
    successRate: number;
    averageRecoveryTime: number;
    providerStats: Record<string, any>;
  } {
    const totalFailovers = this.failoverEvents.length;
    const successfulFailovers = this.failoverEvents.filter(e => e.successful).length;
    const failedFailovers = totalFailovers - successfulFailovers;

    const recoveryTimes = this.failoverEvents
      .filter(e => e.recoveryTime)
      .map(e => e.recoveryTime!);
    const averageRecoveryTime =
      recoveryTimes.length > 0
        ? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length
        : 0;

    const providerStats: Record<string, any> = {};
    const entries = Array.from(this.healthStatus.entries());
    for (const [provider, status] of entries) {
      providerStats[provider] = {
        status: status.status,
        uptime: status.uptime,
        successCount: status.successCount,
        errorCount: status.errorCount,
        responseTime: status.responseTime,
      };
    }

    return {
      totalFailovers,
      successfulFailovers,
      failedFailovers,
      successRate: totalFailovers > 0 ? (successfulFailovers / totalFailovers) * 100 : 0,
      averageRecoveryTime,
      providerStats,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  /**
   * リセット
   */
  reset(): void {
    this.failoverEvents = [];
    this.recoveryLogs = [];
    this.failoverHistory.clear();
    this.errorPatterns.clear();
    this.learningData.clear();
    this.initializeProviders();
  }
}

/**
 * グローバルEnhancedFailsafeサービスインスタンス
 */
export const enhancedFailsafeService = new EnhancedFailsafeService();
