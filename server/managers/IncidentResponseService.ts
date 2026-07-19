/**
 * IncidentResponseService
 * インシデント対応・エスカレーション・復旧管理
 */

export interface Incident {
  incidentId: string;
  timestamp: number;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'closed';
  assignedTo?: string;
  escalationLevel: number;
  resolvedAt?: number;
  resolution?: string;
}

export interface IncidentUpdate {
  updateId: string;
  incidentId: string;
  timestamp: number;
  author: string;
  message: string;
  status: 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'closed';
}

export interface IncidentMetrics {
  metricsId: string;
  incidentId: string;
  timestamp: number;
  responseTime: number;
  resolutionTime: number;
  affectedUsers: number;
  impactScore: number;
}

export class IncidentResponseService {
  private incidents: Map<string, Incident> = new Map();
  private updates: Map<string, IncidentUpdate> = new Map();
  private metrics: Map<string, IncidentMetrics> = new Map();
  private incidentsByStatus: Map<string, string[]> = new Map();
  private updatesByIncident: Map<string, string[]> = new Map();
  private metricsByIncident: Map<string, string[]> = new Map();

  /**
   * インシデントを作成
   */
  createIncident(
    title: string,
    description: string,
    severity: 'critical' | 'high' | 'medium' | 'low'
  ): Incident {
    const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const incident: Incident = {
      incidentId,
      timestamp: Date.now(),
      title,
      description,
      severity,
      status: 'open',
      escalationLevel: 0,
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
  getIncident(incidentId: string): Incident | undefined {
    return this.incidents.get(incidentId);
  }

  /**
   * ステータス別インシデントを取得
   */
  getIncidentsByStatus(
    status: 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'closed'
  ): Incident[] {
    const ids = this.incidentsByStatus.get(status) || [];
    return ids
      .map(id => this.incidents.get(id))
      .filter((i): i is Incident => i !== undefined);
  }

  /**
   * インシデントを確認
   */
  acknowledgeIncident(incidentId: string, assignedTo: string): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    const openIds = this.incidentsByStatus.get('open') || [];
    const index = openIds.indexOf(incidentId);
    if (index > -1) {
      openIds.splice(index, 1);
    }

    incident.status = 'acknowledged';
    incident.assignedTo = assignedTo;

    if (!this.incidentsByStatus.has('acknowledged')) {
      this.incidentsByStatus.set('acknowledged', []);
    }
    this.incidentsByStatus.get('acknowledged')!.push(incidentId);

    return true;
  }

  /**
   * インシデント調査を開始
   */
  startInvestigation(incidentId: string): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    const acknowledgedIds = this.incidentsByStatus.get('acknowledged') || [];
    const index = acknowledgedIds.indexOf(incidentId);
    if (index > -1) {
      acknowledgedIds.splice(index, 1);
    }

    incident.status = 'investigating';

    if (!this.incidentsByStatus.has('investigating')) {
      this.incidentsByStatus.set('investigating', []);
    }
    this.incidentsByStatus.get('investigating')!.push(incidentId);

    return true;
  }

  /**
   * インシデントをエスカレーション
   */
  escalateIncident(incidentId: string): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    incident.escalationLevel++;
    return true;
  }

  /**
   * インシデントを解決
   */
  resolveIncident(incidentId: string, resolution: string): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    const investigatingIds = this.incidentsByStatus.get('investigating') || [];
    const index = investigatingIds.indexOf(incidentId);
    if (index > -1) {
      investigatingIds.splice(index, 1);
    }

    incident.status = 'resolved';
    incident.resolution = resolution;
    incident.resolvedAt = Date.now();

    if (!this.incidentsByStatus.has('resolved')) {
      this.incidentsByStatus.set('resolved', []);
    }
    this.incidentsByStatus.get('resolved')!.push(incidentId);

    return true;
  }

  /**
   * インシデント更新を追加
   */
  addIncidentUpdate(incidentId: string, author: string, message: string): IncidentUpdate {
    const incident = this.incidents.get(incidentId);
    if (!incident) throw new Error('Incident not found');

    const updateId = `UPD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const update: IncidentUpdate = {
      updateId,
      incidentId,
      timestamp: Date.now(),
      author,
      message,
      status: incident.status,
    };

    this.updates.set(updateId, update);

    if (!this.updatesByIncident.has(incidentId)) {
      this.updatesByIncident.set(incidentId, []);
    }
    this.updatesByIncident.get(incidentId)!.push(updateId);

    return update;
  }

  /**
   * インシデント更新を取得
   */
  getIncidentUpdates(incidentId: string): IncidentUpdate[] {
    const ids = this.updatesByIncident.get(incidentId) || [];
    return ids
      .map(id => this.updates.get(id))
      .filter((u): u is IncidentUpdate => u !== undefined);
  }

  /**
   * インシデントメトリクスを記録
   */
  recordIncidentMetrics(
    incidentId: string,
    responseTime: number,
    resolutionTime: number,
    affectedUsers: number,
    impactScore: number
  ): IncidentMetrics {
    const metricsId = `MET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const metrics: IncidentMetrics = {
      metricsId,
      incidentId,
      timestamp: Date.now(),
      responseTime,
      resolutionTime,
      affectedUsers,
      impactScore,
    };

    this.metrics.set(metricsId, metrics);

    if (!this.metricsByIncident.has(incidentId)) {
      this.metricsByIncident.set(incidentId, []);
    }
    this.metricsByIncident.get(incidentId)!.push(metricsId);

    return metrics;
  }

  /**
   * インシデントメトリクスを取得
   */
  getIncidentMetrics(incidentId: string): IncidentMetrics[] {
    const ids = this.metricsByIncident.get(incidentId) || [];
    return ids
      .map(id => this.metrics.get(id))
      .filter((m): m is IncidentMetrics => m !== undefined);
  }

  /**
   * 全インシデントを取得
   */
  getAllIncidents(): Incident[] {
    return Array.from(this.incidents.values());
  }

  /**
   * 全インシデント更新を取得
   */
  getAllUpdates(): IncidentUpdate[] {
    return Array.from(this.updates.values());
  }

  /**
   * 全メトリクスを取得
   */
  getAllMetrics(): IncidentMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * インシデント統計を計算
   */
  getIncidentStats(): {
    totalIncidents: number;
    openIncidents: number;
    investigatingIncidents: number;
    resolvedIncidents: number;
    averageResponseTime: number;
    averageResolutionTime: number;
    averageImpactScore: number;
    criticalIncidents: number;
  } {
    const allIncidents = Array.from(this.incidents.values());
    const allMetrics = Array.from(this.metrics.values());

    let totalResponseTime = 0;
    let totalResolutionTime = 0;
    let totalImpactScore = 0;

    for (const metric of allMetrics) {
      totalResponseTime += metric.responseTime;
      totalResolutionTime += metric.resolutionTime;
      totalImpactScore += metric.impactScore;
    }

    return {
      totalIncidents: allIncidents.length,
      openIncidents: this.incidentsByStatus.get('open')?.length || 0,
      investigatingIncidents: this.incidentsByStatus.get('investigating')?.length || 0,
      resolvedIncidents: this.incidentsByStatus.get('resolved')?.length || 0,
      averageResponseTime: allMetrics.length > 0 ? totalResponseTime / allMetrics.length : 0,
      averageResolutionTime: allMetrics.length > 0 ? totalResolutionTime / allMetrics.length : 0,
      averageImpactScore: allMetrics.length > 0 ? totalImpactScore / allMetrics.length : 0,
      criticalIncidents: allIncidents.filter(i => i.severity === 'critical').length,
    };
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

  /**
   * インシデント更新を削除
   */
  deleteUpdate(updateId: string): boolean {
    const update = this.updates.get(updateId);
    if (!update) return false;

    const incidentIds = this.updatesByIncident.get(update.incidentId) || [];
    const index = incidentIds.indexOf(updateId);
    if (index > -1) {
      incidentIds.splice(index, 1);
    }

    this.updates.delete(updateId);
    return true;
  }

  /**
   * メトリクスを削除
   */
  deleteMetrics(metricsId: string): boolean {
    const metric = this.metrics.get(metricsId);
    if (!metric) return false;

    const incidentIds = this.metricsByIncident.get(metric.incidentId) || [];
    const index = incidentIds.indexOf(metricsId);
    if (index > -1) {
      incidentIds.splice(index, 1);
    }

    this.metrics.delete(metricsId);
    return true;
  }
}
