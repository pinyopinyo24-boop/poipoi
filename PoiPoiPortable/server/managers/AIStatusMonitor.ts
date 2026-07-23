/**
 * AIStatusMonitor - AI状態監視
 * 
 * 機能:
 * - AI API状態監視
 * - パフォーマンス監視
 * - ヘルスチェック
 * - 統計情報
 */

export interface AIServiceStatus {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  successRate: number;
  lastCheck: number;
  errorMessage?: string;
}

export interface AIPerformance {
  timestamp: number;
  serviceName: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
}

export interface HealthCheckResult {
  timestamp: number;
  allServicesHealthy: boolean;
  serviceStatuses: AIServiceStatus[];
  overallHealth: 'healthy' | 'warning' | 'critical';
}

export class AIStatusMonitor {
  private static instance: AIStatusMonitor;
  private serviceStatuses: Map<string, AIServiceStatus> = new Map();
  private performanceMetrics: AIPerformance[] = [];
  private healthCheckHistory: HealthCheckResult[] = [];

  private constructor() {
    this.initializeServices();
  }

  static getInstance(): AIStatusMonitor {
    if (!AIStatusMonitor.instance) {
      AIStatusMonitor.instance = new AIStatusMonitor();
    }
    return AIStatusMonitor.instance;
  }

  /**
   * サービス初期化
   */
  private initializeServices(): void {
    const services = [
      'SecurityAIManager',
      'GovernanceAIManager',
      'ManufacturingIntelligenceAIManager',
      'ConversationManager',
      'PersonalizationAIManager',
      'MemoryIntelligenceAIManager',
      'EvolutionAIManager',
      'VoiceAIManager',
    ];

    services.forEach((service: string) => {
      this.serviceStatuses.set(service, {
        serviceName: service,
        status: 'healthy',
        responseTime: 0,
        successRate: 100,
        lastCheck: Date.now(),
      });
    });
  }

  /**
   * サービス状態更新
   */
  updateServiceStatus(
    serviceName: string,
    status: 'healthy' | 'degraded' | 'down',
    responseTime: number,
    successRate: number,
    errorMessage?: string
  ): AIServiceStatus {
    const serviceStatus: AIServiceStatus = {
      serviceName,
      status,
      responseTime,
      successRate,
      lastCheck: Date.now(),
      errorMessage,
    };

    this.serviceStatuses.set(serviceName, serviceStatus);
    return serviceStatus;
  }

  /**
   * サービス状態取得
   */
  getServiceStatus(serviceName: string): AIServiceStatus | null {
    return this.serviceStatuses.get(serviceName) || null;
  }

  /**
   * すべてのサービス状態取得
   */
  getAllServiceStatuses(): AIServiceStatus[] {
    return Array.from(this.serviceStatuses.values());
  }

  /**
   * パフォーマンスメトリクス記録
   */
  recordPerformance(
    serviceName: string,
    requestCount: number,
    successCount: number,
    failureCount: number,
    averageResponseTime: number,
    maxResponseTime: number,
    minResponseTime: number
  ): AIPerformance {
    const metric: AIPerformance = {
      timestamp: Date.now(),
      serviceName,
      requestCount,
      successCount,
      failureCount,
      averageResponseTime,
      maxResponseTime,
      minResponseTime,
    };

    this.performanceMetrics.push(metric);

    // 最新1000件のみ保持
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics.shift();
    }

    return metric;
  }

  /**
   * パフォーマンスメトリクス取得
   */
  getPerformanceMetrics(serviceName: string, limit: number = 100): AIPerformance[] {
    return this.performanceMetrics
      .filter((m: AIPerformance) => m.serviceName === serviceName)
      .slice(-limit);
  }

  /**
   * ヘルスチェック実行
   */
  performHealthCheck(): HealthCheckResult {
    const serviceStatuses = this.getAllServiceStatuses();
    const allServicesHealthy = serviceStatuses.every((s: AIServiceStatus) => s.status === 'healthy');

    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    const downCount = serviceStatuses.filter((s: AIServiceStatus) => s.status === 'down').length;
    const degradedCount = serviceStatuses.filter((s: AIServiceStatus) => s.status === 'degraded').length;

    if (downCount > 0) {
      overallHealth = 'critical';
    } else if (degradedCount > 0) {
      overallHealth = 'warning';
    }

    const result: HealthCheckResult = {
      timestamp: Date.now(),
      allServicesHealthy,
      serviceStatuses,
      overallHealth,
    };

    this.healthCheckHistory.push(result);

    // 最新100件のみ保持
    if (this.healthCheckHistory.length > 100) {
      this.healthCheckHistory.shift();
    }

    return result;
  }

  /**
   * 最新ヘルスチェック結果取得
   */
  getLatestHealthCheck(): HealthCheckResult | null {
    return this.healthCheckHistory.length > 0
      ? this.healthCheckHistory[this.healthCheckHistory.length - 1]
      : null;
  }

  /**
   * ヘルスチェック履歴取得
   */
  getHealthCheckHistory(limit: number = 50): HealthCheckResult[] {
    const start = Math.max(0, this.healthCheckHistory.length - limit);
    return this.healthCheckHistory.slice(start);
  }

  /**
   * サービス統計取得
   */
  getServiceStatistics(): {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    downServices: number;
    averageResponseTime: number;
  } {
    const statuses = this.getAllServiceStatuses();
    const healthyCount = statuses.filter((s: AIServiceStatus) => s.status === 'healthy').length;
    const degradedCount = statuses.filter((s: AIServiceStatus) => s.status === 'degraded').length;
    const downCount = statuses.filter((s: AIServiceStatus) => s.status === 'down').length;

    const avgResponseTime =
      statuses.length > 0 ? statuses.reduce((sum: number, s: AIServiceStatus) => sum + s.responseTime, 0) / statuses.length : 0;

    return {
      totalServices: statuses.length,
      healthyServices: healthyCount,
      degradedServices: degradedCount,
      downServices: downCount,
      averageResponseTime: avgResponseTime,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.serviceStatuses.clear();
    this.performanceMetrics = [];
    this.healthCheckHistory = [];
  }
}

export const aiStatusMonitor = AIStatusMonitor.getInstance();
export default aiStatusMonitor;
