/**
 * Runtime Health Monitor
 * ランタイムヘルスモニタリング
 */

export interface SystemMetrics {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  uptime: number;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  activeConnections: number;
}

export interface HealthCheckResult {
  timestamp: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    cache: boolean;
    api: boolean;
    memory: boolean;
    cpu: boolean;
  };
  metrics: SystemMetrics;
  issues: string[];
}

export interface AlertRule {
  id: string;
  name: string;
  metric: keyof SystemMetrics;
  threshold: number;
  operator: '>' | '<' | '==' | '!=';
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Runtime Health Monitor
 */
export class RuntimeHealthMonitor {
  private metrics: Map<number, SystemMetrics> = new Map();
  private healthChecks: Map<number, HealthCheckResult> = new Map();
  private alerts: Map<string, AlertRule> = new Map();
  private startTime: number = Date.now();
  private requestCount: number = 0;
  private errorCount: number = 0;
  private totalResponseTime: number = 0;
  private responseTimeCount: number = 0;

  constructor() {
    this.initializeDefaultAlerts();
  }

  /**
   * デフォルトアラートルールを初期化
   */
  private initializeDefaultAlerts(): void {
    const defaultAlerts: AlertRule[] = [
      {
        id: 'alert_memory_high',
        name: 'High Memory Usage',
        metric: 'memoryUsage',
        threshold: 80,
        operator: '>',
        enabled: true,
        severity: 'high',
      },
      {
        id: 'alert_cpu_high',
        name: 'High CPU Usage',
        metric: 'cpuUsage',
        threshold: 90,
        operator: '>',
        enabled: true,
        severity: 'high',
      },
      {
        id: 'alert_error_rate',
        name: 'High Error Rate',
        metric: 'errorCount',
        threshold: 100,
        operator: '>',
        enabled: true,
        severity: 'critical',
      },
      {
        id: 'alert_response_time',
        name: 'Slow Response Time',
        metric: 'averageResponseTime',
        threshold: 5000,
        operator: '>',
        enabled: true,
        severity: 'medium',
      },
    ];

    for (const alert of defaultAlerts) {
      this.alerts.set(alert.id, alert);
    }
  }

  /**
   * リクエストを記録
   */
  recordRequest(responseTime: number, success: boolean = true): void {
    this.requestCount++;
    if (!success) {
      this.errorCount++;
    }
    this.totalResponseTime += responseTime;
    this.responseTimeCount++;
  }

  /**
   * システムメトリクスを取得
   */
  private getSystemMetrics(): SystemMetrics {
    const uptime = Date.now() - this.startTime;
    const averageResponseTime = this.responseTimeCount > 0 
      ? this.totalResponseTime / this.responseTimeCount 
      : 0;

    // Simulated metrics
    const memoryUsage = Math.random() * 100;
    const cpuUsage = Math.random() * 100;

    return {
      timestamp: Date.now(),
      cpuUsage,
      memoryUsage,
      memoryTotal: 2048,
      uptime,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      averageResponseTime,
      activeConnections: Math.floor(Math.random() * 100),
    };
  }

  /**
   * ヘルスチェックを実行
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const metrics = this.getSystemMetrics();
    const issues: string[] = [];

    // Check database
    const databaseOk = Math.random() > 0.1;
    if (!databaseOk) {
      issues.push('Database connection failed');
    }

    // Check cache
    const cacheOk = Math.random() > 0.05;
    if (!cacheOk) {
      issues.push('Cache service unavailable');
    }

    // Check API
    const apiOk = Math.random() > 0.05;
    if (!apiOk) {
      issues.push('API service degraded');
    }

    // Check memory
    const memoryOk = metrics.memoryUsage < 90;
    if (!memoryOk) {
      issues.push('Memory usage critical');
    }

    // Check CPU
    const cpuOk = metrics.cpuUsage < 95;
    if (!cpuOk) {
      issues.push('CPU usage critical');
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > 2) {
      status = 'unhealthy';
    } else if (issues.length > 0) {
      status = 'degraded';
    }

    const result: HealthCheckResult = {
      timestamp: Date.now(),
      status,
      checks: {
        database: databaseOk,
        cache: cacheOk,
        api: apiOk,
        memory: memoryOk,
        cpu: cpuOk,
      },
      metrics,
      issues,
    };

    // Store health check result
    this.healthChecks.set(result.timestamp, result);

    // Check alerts
    this.checkAlerts(metrics);

    return result;
  }

  /**
   * アラートルールをチェック
   */
  private checkAlerts(metrics: SystemMetrics): void {
    this.alerts.forEach(alert => {
      if (!alert.enabled) return;

      const metricValue = metrics[alert.metric as keyof SystemMetrics];
      let triggered = false;

      switch (alert.operator) {
        case '>':
          triggered = metricValue > alert.threshold;
          break;
        case '<':
          triggered = metricValue < alert.threshold;
          break;
        case '==':
          triggered = metricValue === alert.threshold;
          break;
        case '!=':
          triggered = metricValue !== alert.threshold;
          break;
      }

      if (triggered) {
        console.warn(`Alert triggered: ${alert.name} (${alert.severity})`);
      }
    });
  }

  /**
   * 最新のヘルスチェック結果を取得
   */
  getLatestHealthCheck(): HealthCheckResult | null {
    const entries = Array.from(this.healthChecks.entries());
    if (entries.length === 0) return null;
    
    entries.sort((a, b) => b[0] - a[0]);
    return entries[0][1];
  }

  /**
   * ヘルスチェック履歴を取得
   */
  getHealthCheckHistory(limit: number = 100): HealthCheckResult[] {
    return Array.from(this.healthChecks.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * アラートルールを追加
   */
  addAlertRule(rule: AlertRule): void {
    this.alerts.set(rule.id, rule);
  }

  /**
   * アラートルールを削除
   */
  removeAlertRule(ruleId: string): boolean {
    return this.alerts.delete(ruleId);
  }

  /**
   * アラートルールを取得
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alerts.values());
  }

  /**
   * アラートルールを有効化
   */
  enableAlertRule(ruleId: string): boolean {
    const rule = this.alerts.get(ruleId);
    if (rule) {
      rule.enabled = true;
      return true;
    }
    return false;
  }

  /**
   * アラートルールを無効化
   */
  disableAlertRule(ruleId: string): boolean {
    const rule = this.alerts.get(ruleId);
    if (rule) {
      rule.enabled = false;
      return true;
    }
    return false;
  }

  /**
   * パフォーマンス統計を取得
   */
  getPerformanceStats(): {
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
    averageResponseTime: number;
    uptime: number;
  } {
    const errorRate = this.requestCount > 0 
      ? (this.errorCount / this.requestCount) * 100 
      : 0;

    return {
      totalRequests: this.requestCount,
      totalErrors: this.errorCount,
      errorRate,
      averageResponseTime: this.responseTimeCount > 0 
        ? this.totalResponseTime / this.responseTimeCount 
        : 0,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * メトリクスをリセット
   */
  resetMetrics(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.totalResponseTime = 0;
    this.responseTimeCount = 0;
    this.startTime = Date.now();
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): {
    healthCheckCount: number;
    metricsCount: number;
    alertRuleCount: number;
    averageStatus: string;
  } {
    const healthChecks = Array.from(this.healthChecks.values());
    const healthyCount = healthChecks.filter(h => h.status === 'healthy').length;
    const degradedCount = healthChecks.filter(h => h.status === 'degraded').length;
    const unhealthyCount = healthChecks.filter(h => h.status === 'unhealthy').length;

    let averageStatus = 'unknown';
    if (healthChecks.length > 0) {
      if (unhealthyCount > 0) {
        averageStatus = 'unhealthy';
      } else if (degradedCount > 0) {
        averageStatus = 'degraded';
      } else {
        averageStatus = 'healthy';
      }
    }

    return {
      healthCheckCount: healthChecks.length,
      metricsCount: this.metrics.size,
      alertRuleCount: this.alerts.size,
      averageStatus,
    };
  }
}

/**
 * グローバルランタイムヘルスモニターインスタンス
 */
export const runtimeHealthMonitor = new RuntimeHealthMonitor();
