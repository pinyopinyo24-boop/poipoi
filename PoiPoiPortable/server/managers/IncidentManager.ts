/**
 * IncidentManager - インシデント管理
 * 
 * 機能:
 * - インシデント記録
 * - 原因分析
 * - 復旧履歴追跡
 * - インシデント統計
 */

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  componentName: string;
  createdAt: number;
  resolvedAt?: number;
  rootCause?: string;
  resolution?: string;
  impactedUsers: number;
  duration: number; // ミリ秒
}

export interface IncidentAnalysis {
  incidentId: string;
  analysisTime: number;
  rootCauses: string[];
  contributingFactors: string[];
  preventiveMeasures: string[];
  confidence: number; // 0-100
}

export interface RecoveryHistory {
  id: string;
  incidentId: string;
  action: string;
  timestamp: number;
  result: 'success' | 'partial' | 'failure';
  details: Record<string, any>;
}

export class IncidentManager {
  private static instance: IncidentManager;
  private incidents: Map<string, Incident> = new Map();
  private analyses: Map<string, IncidentAnalysis> = new Map();
  private recoveryHistories: RecoveryHistory[] = [];
  private incidentCounter: number = 0;
  private analysisCounter: number = 0;
  private recoveryCounter: number = 0;

  private constructor() {}

  static getInstance(): IncidentManager {
    if (!IncidentManager.instance) {
      IncidentManager.instance = new IncidentManager();
    }
    return IncidentManager.instance;
  }

  /**
   * インシデント記録
   */
  recordIncident(
    title: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    componentName: string,
    impactedUsers: number
  ): Incident {
    const id = `incident_${++this.incidentCounter}_${Date.now()}`;

    const incident: Incident = {
      id,
      title,
      description,
      severity,
      status: 'open',
      componentName,
      createdAt: Date.now(),
      impactedUsers,
      duration: 0,
    };

    this.incidents.set(id, incident);
    return incident;
  }

  /**
   * インシデント取得
   */
  getIncident(id: string): Incident | null {
    return this.incidents.get(id) || null;
  }

  /**
   * すべてのインシデント取得
   */
  getAllIncidents(): Incident[] {
    return Array.from(this.incidents.values());
  }

  /**
   * インシデント状態更新
   */
  updateIncidentStatus(
    id: string,
    status: 'open' | 'investigating' | 'resolved' | 'closed',
    rootCause?: string,
    resolution?: string
  ): Incident | null {
    const incident = this.getIncident(id);
    if (!incident) return null;

    incident.status = status;
    if (rootCause) incident.rootCause = rootCause;
    if (resolution) incident.resolution = resolution;

    if (status === 'resolved' || status === 'closed') {
      incident.resolvedAt = Date.now();
      incident.duration = incident.resolvedAt - incident.createdAt;
    }

    return incident;
  }

  /**
   * インシデント分析
   */
  analyzeIncident(
    incidentId: string,
    rootCauses: string[],
    contributingFactors: string[],
    preventiveMeasures: string[],
    confidence: number
  ): IncidentAnalysis {
    const analysisId = `analysis_${++this.analysisCounter}_${Date.now()}`;

    const analysis: IncidentAnalysis = {
      incidentId,
      analysisTime: Date.now(),
      rootCauses,
      contributingFactors,
      preventiveMeasures,
      confidence,
    };

    this.analyses.set(analysisId, analysis);
    return analysis;
  }

  /**
   * インシデント分析取得
   */
  getAnalysis(incidentId: string): IncidentAnalysis | null {
    return Array.from(this.analyses.values()).find((a: IncidentAnalysis) => a.incidentId === incidentId) || null;
  }

  /**
   * 復旧履歴記録
   */
  recordRecoveryAction(
    incidentId: string,
    action: string,
    result: 'success' | 'partial' | 'failure',
    details: Record<string, any>
  ): RecoveryHistory {
    const id = `recovery_${++this.recoveryCounter}_${Date.now()}`;

    const history: RecoveryHistory = {
      id,
      incidentId,
      action,
      timestamp: Date.now(),
      result,
      details,
    };

    this.recoveryHistories.push(history);

    // 最新10000件のみ保持
    if (this.recoveryHistories.length > 10000) {
      this.recoveryHistories.shift();
    }

    return history;
  }

  /**
   * 復旧履歴取得
   */
  getRecoveryHistory(incidentId: string): RecoveryHistory[] {
    return this.recoveryHistories.filter((h: RecoveryHistory) => h.incidentId === incidentId);
  }

  /**
   * インシデント統計取得
   */
  getIncidentStatistics(): {
    totalIncidents: number;
    openIncidents: number;
    investigatingIncidents: number;
    resolvedIncidents: number;
    closedIncidents: number;
    criticalIncidents: number;
    averageDuration: number;
    totalImpactedUsers: number;
  } {
    const incidents = this.getAllIncidents();
    const openCount = incidents.filter((i: Incident) => i.status === 'open').length;
    const investigatingCount = incidents.filter((i: Incident) => i.status === 'investigating').length;
    const resolvedCount = incidents.filter((i: Incident) => i.status === 'resolved').length;
    const closedCount = incidents.filter((i: Incident) => i.status === 'closed').length;
    const criticalCount = incidents.filter((i: Incident) => i.severity === 'critical').length;

    const avgDuration =
      resolvedCount > 0
        ? incidents
            .filter((i: Incident) => i.resolvedAt)
            .reduce((sum: number, i: Incident) => sum + (i.duration || 0), 0) / resolvedCount
        : 0;

    const totalImpactedUsers = incidents.reduce((sum: number, i: Incident) => sum + i.impactedUsers, 0);

    return {
      totalIncidents: incidents.length,
      openIncidents: openCount,
      investigatingIncidents: investigatingCount,
      resolvedIncidents: resolvedCount,
      closedIncidents: closedCount,
      criticalIncidents: criticalCount,
      averageDuration: avgDuration,
      totalImpactedUsers,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.incidents.clear();
    this.analyses.clear();
    this.recoveryHistories = [];
  }
}

export const incidentManager = IncidentManager.getInstance();
export default incidentManager;
