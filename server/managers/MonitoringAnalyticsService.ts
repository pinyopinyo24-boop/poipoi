/**
 * MonitoringAnalyticsService
 * 監視分析・トレンド分析・異常検知
 */

export interface MetricTrend {
  trendId: string;
  metricName: string;
  startTime: number;
  endTime: number;
  dataPoints: number[];
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercentage: number;
}

export interface AnomalyDetection {
  anomalyId: string;
  timestamp: number;
  metricName: string;
  value: number;
  expectedRange: { min: number; max: number };
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface HealthCheck {
  checkId: string;
  timestamp: number;
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorCount: number;
}

export class MonitoringAnalyticsService {
  private trends: Map<string, MetricTrend> = new Map();
  private anomalies: Map<string, AnomalyDetection> = new Map();
  private healthChecks: Map<string, HealthCheck> = new Map();
  private trendsByMetric: Map<string, string[]> = new Map();
  private anomaliesByComponent: Map<string, string[]> = new Map();
  private healthChecksByComponent: Map<string, string[]> = new Map();

  /**
   * トレンドを分析
   */
  analyzeTrend(
    metricName: string,
    startTime: number,
    endTime: number,
    dataPoints: number[]
  ): MetricTrend {
    const trendId = `TRD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    let changePercentage = 0;

    if (dataPoints.length >= 2) {
      const firstValue = dataPoints[0];
      const lastValue = dataPoints[dataPoints.length - 1];
      changePercentage = ((lastValue - firstValue) / firstValue) * 100;

      if (changePercentage > 5) {
        trend = 'increasing';
      } else if (changePercentage < -5) {
        trend = 'decreasing';
      }
    }

    const metricTrend: MetricTrend = {
      trendId,
      metricName,
      startTime,
      endTime,
      dataPoints,
      trend,
      changePercentage,
    };

    this.trends.set(trendId, metricTrend);

    if (!this.trendsByMetric.has(metricName)) {
      this.trendsByMetric.set(metricName, []);
    }
    this.trendsByMetric.get(metricName)!.push(trendId);

    return metricTrend;
  }

  /**
   * トレンドを取得
   */
  getTrend(trendId: string): MetricTrend | undefined {
    return this.trends.get(trendId);
  }

  /**
   * メトリクス別トレンドを取得
   */
  getTrendsByMetric(metricName: string): MetricTrend[] {
    const ids = this.trendsByMetric.get(metricName) || [];
    return ids
      .map(id => this.trends.get(id))
      .filter((t): t is MetricTrend => t !== undefined);
  }

  /**
   * 異常を検知
   */
  detectAnomaly(
    metricName: string,
    value: number,
    expectedMin: number,
    expectedMax: number,
    component: string
  ): AnomalyDetection | undefined {
    if (value >= expectedMin && value <= expectedMax) {
      return undefined;
    }

    const anomalyId = `ANO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let severity: 'low' | 'medium' | 'high' = 'low';
    if (value < expectedMin * 0.5 || value > expectedMax * 1.5) {
      severity = 'high';
    } else if (value < expectedMin * 0.75 || value > expectedMax * 1.25) {
      severity = 'medium';
    }

    const description = `${metricName} value ${value} is outside expected range [${expectedMin}, ${expectedMax}]`;

    const anomaly: AnomalyDetection = {
      anomalyId,
      timestamp: Date.now(),
      metricName,
      value,
      expectedRange: { min: expectedMin, max: expectedMax },
      severity,
      description,
    };

    this.anomalies.set(anomalyId, anomaly);

    if (!this.anomaliesByComponent.has(component)) {
      this.anomaliesByComponent.set(component, []);
    }
    this.anomaliesByComponent.get(component)!.push(anomalyId);

    return anomaly;
  }

  /**
   * 異常を取得
   */
  getAnomaly(anomalyId: string): AnomalyDetection | undefined {
    return this.anomalies.get(anomalyId);
  }

  /**
   * コンポーネント別異常を取得
   */
  getAnomaliesByComponent(component: string): AnomalyDetection[] {
    const ids = this.anomaliesByComponent.get(component) || [];
    return ids
      .map(id => this.anomalies.get(id))
      .filter((a): a is AnomalyDetection => a !== undefined);
  }

  /**
   * ヘルスチェックを実行
   */
  performHealthCheck(
    component: string,
    responseTime: number,
    errorCount: number
  ): HealthCheck {
    const checkId = `HLT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (errorCount > 10 || responseTime > 5000) {
      status = 'unhealthy';
    } else if (errorCount > 5 || responseTime > 2000) {
      status = 'degraded';
    }

    const healthCheck: HealthCheck = {
      checkId,
      timestamp: Date.now(),
      component,
      status,
      responseTime,
      errorCount,
    };

    this.healthChecks.set(checkId, healthCheck);

    if (!this.healthChecksByComponent.has(component)) {
      this.healthChecksByComponent.set(component, []);
    }
    this.healthChecksByComponent.get(component)!.push(checkId);

    return healthCheck;
  }

  /**
   * ヘルスチェックを取得
   */
  getHealthCheck(checkId: string): HealthCheck | undefined {
    return this.healthChecks.get(checkId);
  }

  /**
   * コンポーネント別ヘルスチェックを取得
   */
  getHealthChecksByComponent(component: string): HealthCheck[] {
    const ids = this.healthChecksByComponent.get(component) || [];
    return ids
      .map(id => this.healthChecks.get(id))
      .filter((h): h is HealthCheck => h !== undefined);
  }

  /**
   * 全トレンドを取得
   */
  getAllTrends(): MetricTrend[] {
    return Array.from(this.trends.values());
  }

  /**
   * 全異常を取得
   */
  getAllAnomalies(): AnomalyDetection[] {
    return Array.from(this.anomalies.values());
  }

  /**
   * 全ヘルスチェックを取得
   */
  getAllHealthChecks(): HealthCheck[] {
    return Array.from(this.healthChecks.values());
  }

  /**
   * 監視統計を計算
   */
  getMonitoringStats(): {
    totalTrends: number;
    increasingTrends: number;
    decreasingTrends: number;
    totalAnomalies: number;
    highSeverityAnomalies: number;
    healthyComponents: number;
    degradedComponents: number;
    unhealthyComponents: number;
  } {
    const allTrends = Array.from(this.trends.values());
    const allAnomalies = Array.from(this.anomalies.values());
    const allHealthChecks = Array.from(this.healthChecks.values());

    const componentIds = new Set(allHealthChecks.map(h => h.component));
    const componentStatus = new Map<string, 'healthy' | 'degraded' | 'unhealthy'>();

    const componentsArray = Array.from(componentIds);
    for (const component of componentsArray) {
      const checks = this.getHealthChecksByComponent(component);
      if (checks.length > 0) {
        const latestCheck = checks.reduce((latest, current) =>
          current.timestamp > latest.timestamp ? current : latest
        );
        componentStatus.set(component, latestCheck.status);
      }
    }

    return {
      totalTrends: allTrends.length,
      increasingTrends: allTrends.filter(t => t.trend === 'increasing').length,
      decreasingTrends: allTrends.filter(t => t.trend === 'decreasing').length,
      totalAnomalies: allAnomalies.length,
      highSeverityAnomalies: allAnomalies.filter(a => a.severity === 'high').length,
      healthyComponents: Array.from(componentStatus.values()).filter(s => s === 'healthy').length,
      degradedComponents: Array.from(componentStatus.values()).filter(s => s === 'degraded').length,
      unhealthyComponents: Array.from(componentStatus.values()).filter(s => s === 'unhealthy').length,
    };
  }

  /**
   * トレンドを削除
   */
  deleteTrend(trendId: string): boolean {
    const trend = this.trends.get(trendId);
    if (!trend) return false;

    const metricIds = this.trendsByMetric.get(trend.metricName) || [];
    const index = metricIds.indexOf(trendId);
    if (index > -1) {
      metricIds.splice(index, 1);
    }

    this.trends.delete(trendId);
    return true;
  }

  /**
   * 異常を削除
   */
  deleteAnomaly(anomalyId: string): boolean {
    const anomaly = this.anomalies.get(anomalyId);
    if (!anomaly) return false;

    const componentIds = this.anomaliesByComponent.get(anomaly.metricName) || [];
    const index = componentIds.indexOf(anomalyId);
    if (index > -1) {
      componentIds.splice(index, 1);
    }

    this.anomalies.delete(anomalyId);
    return true;
  }

  /**
   * ヘルスチェックを削除
   */
  deleteHealthCheck(checkId: string): boolean {
    const check = this.healthChecks.get(checkId);
    if (!check) return false;

    const componentIds = this.healthChecksByComponent.get(check.component) || [];
    const index = componentIds.indexOf(checkId);
    if (index > -1) {
      componentIds.splice(index, 1);
    }

    this.healthChecks.delete(checkId);
    return true;
  }
}
