/**
 * ProductionOperationsManager
 * 本番環境運用管理・監視・改善
 */

export interface OperationMetric {
  metricId: string;
  timestamp: number;
  uptime: number;
  responseTime: number;
  aiQualityScore: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  activeUsers: number;
}

export interface OperationAlert {
  alertId: string;
  timestamp: number;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  status: 'active' | 'resolved';
  resolvedAt?: number;
}

export interface OperationIncident {
  incidentId: string;
  timestamp: number;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved';
  rootCause?: string;
  resolution?: string;
  resolvedAt?: number;
}

export class ProductionOperationsManager {
  private metrics: Map<string, OperationMetric> = new Map();
  private alerts: Map<string, OperationAlert> = new Map();
  private incidents: Map<string, OperationIncident> = new Map();
  private metricsByTimestamp: Map<number, string[]> = new Map();
  private alertsByStatus: Map<string, string[]> = new Map();
  private incidentsByStatus: Map<string, string[]> = new Map();

  /**
   * メトリクスを記録
   */
  recordMetric(
    uptime: number,
    responseTime: number,
    aiQualityScore: number,
    errorRate: number,
    cpuUsage: number,
    memoryUsage: number,
    activeUsers: number
  ): OperationMetric {
    const metricId = `MET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    const metric: OperationMetric = {
      metricId,
      timestamp,
      uptime,
      responseTime,
      aiQualityScore,
      errorRate,
      cpuUsage,
      memoryUsage,
      activeUsers,
    };

    this.metrics.set(metricId, metric);

    if (!this.metricsByTimestamp.has(timestamp)) {
      this.metricsByTimestamp.set(timestamp, []);
    }
    this.metricsByTimestamp.get(timestamp)!.push(metricId);

    return metric;
  }

  /**
   * メトリクスを取得
   */
  getMetric(metricId: string): OperationMetric | undefined {
    return this.metrics.get(metricId);
  }

  /**
   * 最新メトリクスを取得
   */
  getLatestMetric(): OperationMetric | undefined {
    const allMetrics = Array.from(this.metrics.values());
    if (allMetrics.length === 0) return undefined;

    return allMetrics.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );
  }

  /**
   * アラートを作成
   */
  createAlert(
    severity: 'critical' | 'warning' | 'info',
    type: string,
    message: string
  ): OperationAlert {
    const alertId = `ALT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const alert: OperationAlert = {
      alertId,
      timestamp: Date.now(),
      severity,
      type,
      message,
      status: 'active',
    };

    this.alerts.set(alertId, alert);

    if (!this.alertsByStatus.has('active')) {
      this.alertsByStatus.set('active', []);
    }
    this.alertsByStatus.get('active')!.push(alertId);

    return alert;
  }

  /**
   * アラートを取得
   */
  getAlert(alertId: string): OperationAlert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * ステータス別アラートを取得
   */
  getAlertsByStatus(status: 'active' | 'resolved'): OperationAlert[] {
    const ids = this.alertsByStatus.get(status) || [];
    return ids
      .map(id => this.alerts.get(id))
      .filter((a): a is OperationAlert => a !== undefined);
  }

  /**
   * アラートを解決
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    const activeIds = this.alertsByStatus.get('active') || [];
    const index = activeIds.indexOf(alertId);
    if (index > -1) {
      activeIds.splice(index, 1);
    }

    alert.status = 'resolved';
    alert.resolvedAt = Date.now();

    if (!this.alertsByStatus.has('resolved')) {
      this.alertsByStatus.set('resolved', []);
    }
    this.alertsByStatus.get('resolved')!.push(alertId);

    return true;
  }

  /**
   * インシデントを作成
   */
  createIncident(
    title: string,
    description: string,
    severity: 'critical' | 'high' | 'medium' | 'low'
  ): OperationIncident {
    const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const incident: OperationIncident = {
      incidentId,
      timestamp: Date.now(),
      title,
      description,
      severity,
      status: 'open',
    };

    this.incidents.set(incidentId, incident);

    if (!this.incidentsByStatus.has('open')) {
      this.incidentsByStatus.set('open', []);
    }
    this.incidentsByStatus.get('open')!.push(incidentId);

    return incident;
  }

  /**
   * インシデントを取得
   */
  getIncident(incidentId: string): OperationIncident | undefined {
    return this.incidents.get(incidentId);
  }

  /**
   * ステータス別インシデントを取得
   */
  getIncidentsByStatus(status: 'open' | 'investigating' | 'resolved'): OperationIncident[] {
    const ids = this.incidentsByStatus.get(status) || [];
    return ids
      .map(id => this.incidents.get(id))
      .filter((i): i is OperationIncident => i !== undefined);
  }

  /**
   * インシデントを調査中に変更
   */
  investigateIncident(incidentId: string): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    const openIds = this.incidentsByStatus.get('open') || [];
    const index = openIds.indexOf(incidentId);
    if (index > -1) {
      openIds.splice(index, 1);
    }

    incident.status = 'investigating';

    if (!this.incidentsByStatus.has('investigating')) {
      this.incidentsByStatus.set('investigating', []);
    }
    this.incidentsByStatus.get('investigating')!.push(incidentId);

    return true;
  }

  /**
   * インシデントを解決
   */
  resolveIncident(
    incidentId: string,
    rootCause: string,
    resolution: string
  ): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    const investigatingIds = this.incidentsByStatus.get('investigating') || [];
    const index = investigatingIds.indexOf(incidentId);
    if (index > -1) {
      investigatingIds.splice(index, 1);
    }

    incident.status = 'resolved';
    incident.rootCause = rootCause;
    incident.resolution = resolution;
    incident.resolvedAt = Date.now();

    if (!this.incidentsByStatus.has('resolved')) {
      this.incidentsByStatus.set('resolved', []);
    }
    this.incidentsByStatus.get('resolved')!.push(incidentId);

    return true;
  }

  /**
   * 運用統計を計算
   */
  getOperationStats(): {
    totalMetrics: number;
    averageUptime: number;
    averageResponseTime: number;
    averageAiQualityScore: number;
    averageErrorRate: number;
    activeAlerts: number;
    openIncidents: number;
  } {
    const allMetrics = Array.from(this.metrics.values());
    const stats = {
      totalMetrics: allMetrics.length,
      averageUptime: 0,
      averageResponseTime: 0,
      averageAiQualityScore: 0,
      averageErrorRate: 0,
      activeAlerts: this.alertsByStatus.get('active')?.length || 0,
      openIncidents:
        (this.incidentsByStatus.get('open')?.length || 0) +
        (this.incidentsByStatus.get('investigating')?.length || 0),
    };

    if (allMetrics.length === 0) return stats;

    let totalUptime = 0;
    let totalResponseTime = 0;
    let totalAiQuality = 0;
    let totalErrorRate = 0;

    for (const metric of allMetrics) {
      totalUptime += metric.uptime;
      totalResponseTime += metric.responseTime;
      totalAiQuality += metric.aiQualityScore;
      totalErrorRate += metric.errorRate;
    }

    stats.averageUptime = totalUptime / allMetrics.length;
    stats.averageResponseTime = totalResponseTime / allMetrics.length;
    stats.averageAiQualityScore = totalAiQuality / allMetrics.length;
    stats.averageErrorRate = totalErrorRate / allMetrics.length;

    return stats;
  }

  /**
   * 全メトリクスを取得
   */
  getAllMetrics(): OperationMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * 全アラートを取得
   */
  getAllAlerts(): OperationAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * 全インシデントを取得
   */
  getAllIncidents(): OperationIncident[] {
    return Array.from(this.incidents.values());
  }

  /**
   * メトリクスを削除
   */
  deleteMetric(metricId: string): boolean {
    const metric = this.metrics.get(metricId);
    if (!metric) return false;

    const timestampIds = this.metricsByTimestamp.get(metric.timestamp) || [];
    const index = timestampIds.indexOf(metricId);
    if (index > -1) {
      timestampIds.splice(index, 1);
    }

    this.metrics.delete(metricId);
    return true;
  }

  /**
   * アラートを削除
   */
  deleteAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    const statusIds = this.alertsByStatus.get(alert.status) || [];
    const index = statusIds.indexOf(alertId);
    if (index > -1) {
      statusIds.splice(index, 1);
    }

    this.alerts.delete(alertId);
    return true;
  }

  /**
   * インシデントを削除
   */
  deleteIncident(incidentId: string): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    const statusIds = this.incidentsByStatus.get(incident.status) || [];
    const index = statusIds.indexOf(incidentId);
    if (index > -1) {
      statusIds.splice(index, 1);
    }

    this.incidents.delete(incidentId);
    return true;
  }
}
