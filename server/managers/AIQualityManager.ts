/**
 * AIQualityManager
 * AI回答品質・推論精度・会話自然性の継続的改善
 */

export interface QualityMetric {
  metricId: string;
  timestamp: number;
  responseId: string;
  accuracy: number; // 0-100
  naturalness: number; // 0-100
  consistency: number; // 0-100
  evidenceScore: number; // 0-100
  overallScore: number; // 0-100
}

export interface QualityAlert {
  alertId: string;
  timestamp: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'accuracy' | 'naturalness' | 'consistency' | 'evidence';
  description: string;
  affectedResponses: number;
  status: 'open' | 'acknowledged' | 'resolved';
}

export interface QualityTrend {
  trendId: string;
  timestamp: number;
  period: 'daily' | 'weekly' | 'monthly';
  averageAccuracy: number;
  averageNaturalness: number;
  averageConsistency: number;
  averageEvidenceScore: number;
  trend: 'improving' | 'stable' | 'declining';
}

export class AIQualityManager {
  private metrics: Map<string, QualityMetric> = new Map();
  private alerts: Map<string, QualityAlert> = new Map();
  private trends: Map<string, QualityTrend> = new Map();
  private metricsByResponse: Map<string, string[]> = new Map();
  private alertsByStatus: Map<string, string[]> = new Map();
  private trendsByPeriod: Map<string, string[]> = new Map();

  /**
   * 品質メトリクスを記録
   */
  recordQualityMetric(
    responseId: string,
    accuracy: number,
    naturalness: number,
    consistency: number,
    evidenceScore: number
  ): QualityMetric {
    const metricId = `QM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const overallScore = (accuracy + naturalness + consistency + evidenceScore) / 4;

    const metric: QualityMetric = {
      metricId,
      timestamp: Date.now(),
      responseId,
      accuracy,
      naturalness,
      consistency,
      evidenceScore,
      overallScore,
    };

    this.metrics.set(metricId, metric);

    if (!this.metricsByResponse.has(responseId)) {
      this.metricsByResponse.set(responseId, []);
    }
    this.metricsByResponse.get(responseId)!.push(metricId);

    return metric;
  }

  /**
   * 品質メトリクスを取得
   */
  getQualityMetric(metricId: string): QualityMetric | undefined {
    return this.metrics.get(metricId);
  }

  /**
   * レスポンス別メトリクスを取得
   */
  getMetricsByResponse(responseId: string): QualityMetric[] {
    const ids = this.metricsByResponse.get(responseId) || [];
    return ids
      .map(id => this.metrics.get(id))
      .filter((m): m is QualityMetric => m !== undefined);
  }

  /**
   * 品質アラートを作成
   */
  createQualityAlert(
    severity: 'critical' | 'high' | 'medium' | 'low',
    type: 'accuracy' | 'naturalness' | 'consistency' | 'evidence',
    description: string,
    affectedResponses: number
  ): QualityAlert {
    const alertId = `QA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const alert: QualityAlert = {
      alertId,
      timestamp: Date.now(),
      severity,
      type,
      description,
      affectedResponses,
      status: 'open',
    };

    this.alerts.set(alertId, alert);

    if (!this.alertsByStatus.has('open')) {
      this.alertsByStatus.set('open', []);
    }
    this.alertsByStatus.get('open')!.push(alertId);

    return alert;
  }

  /**
   * 品質アラートを取得
   */
  getQualityAlert(alertId: string): QualityAlert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * ステータス別アラートを取得
   */
  getAlertsByStatus(status: 'open' | 'acknowledged' | 'resolved'): QualityAlert[] {
    const ids = this.alertsByStatus.get(status) || [];
    return ids
      .map(id => this.alerts.get(id))
      .filter((a): a is QualityAlert => a !== undefined);
  }

  /**
   * アラートを確認
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    const openIds = this.alertsByStatus.get('open') || [];
    const index = openIds.indexOf(alertId);
    if (index > -1) {
      openIds.splice(index, 1);
    }

    alert.status = 'acknowledged';

    if (!this.alertsByStatus.has('acknowledged')) {
      this.alertsByStatus.set('acknowledged', []);
    }
    this.alertsByStatus.get('acknowledged')!.push(alertId);

    return true;
  }

  /**
   * アラートを解決
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    const statusIds = this.alertsByStatus.get(alert.status) || [];
    const index = statusIds.indexOf(alertId);
    if (index > -1) {
      statusIds.splice(index, 1);
    }

    alert.status = 'resolved';

    if (!this.alertsByStatus.has('resolved')) {
      this.alertsByStatus.set('resolved', []);
    }
    this.alertsByStatus.get('resolved')!.push(alertId);

    return true;
  }

  /**
   * 品質トレンドを記録
   */
  recordQualityTrend(
    period: 'daily' | 'weekly' | 'monthly',
    averageAccuracy: number,
    averageNaturalness: number,
    averageConsistency: number,
    averageEvidenceScore: number
  ): QualityTrend {
    const trendId = `QT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const averageOverall = (averageAccuracy + averageNaturalness + averageConsistency + averageEvidenceScore) / 4;
    const previousTrends = this.getTrendsByPeriod(period);
    let trend: 'improving' | 'stable' | 'declining' = 'stable';

    if (previousTrends.length > 0) {
      const lastTrend = previousTrends[previousTrends.length - 1];
      const lastAverage = (lastTrend.averageAccuracy + lastTrend.averageNaturalness + lastTrend.averageConsistency + lastTrend.averageEvidenceScore) / 4;

      if (averageOverall > lastAverage + 2) {
        trend = 'improving';
      } else if (averageOverall < lastAverage - 2) {
        trend = 'declining';
      }
    }

    const qualityTrend: QualityTrend = {
      trendId,
      timestamp: Date.now(),
      period,
      averageAccuracy,
      averageNaturalness,
      averageConsistency,
      averageEvidenceScore,
      trend,
    };

    this.trends.set(trendId, qualityTrend);

    if (!this.trendsByPeriod.has(period)) {
      this.trendsByPeriod.set(period, []);
    }
    this.trendsByPeriod.get(period)!.push(trendId);

    return qualityTrend;
  }

  /**
   * トレンドを取得
   */
  getQualityTrend(trendId: string): QualityTrend | undefined {
    return this.trends.get(trendId);
  }

  /**
   * 期間別トレンドを取得
   */
  getTrendsByPeriod(period: 'daily' | 'weekly' | 'monthly'): QualityTrend[] {
    const ids = this.trendsByPeriod.get(period) || [];
    return ids
      .map(id => this.trends.get(id))
      .filter((t): t is QualityTrend => t !== undefined);
  }

  /**
   * 全メトリクスを取得
   */
  getAllMetrics(): QualityMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * 全アラートを取得
   */
  getAllAlerts(): QualityAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * 全トレンドを取得
   */
  getAllTrends(): QualityTrend[] {
    return Array.from(this.trends.values());
  }

  /**
   * 品質統計を計算
   */
  getQualityStats(): {
    totalMetrics: number;
    averageAccuracy: number;
    averageNaturalness: number;
    averageConsistency: number;
    averageEvidenceScore: number;
    totalAlerts: number;
    openAlerts: number;
    resolvedAlerts: number;
    totalTrends: number;
  } {
    const allMetrics = Array.from(this.metrics.values());
    const allAlerts = Array.from(this.alerts.values());
    const allTrends = Array.from(this.trends.values());

    let totalAccuracy = 0;
    let totalNaturalness = 0;
    let totalConsistency = 0;
    let totalEvidence = 0;

    for (const metric of allMetrics) {
      totalAccuracy += metric.accuracy;
      totalNaturalness += metric.naturalness;
      totalConsistency += metric.consistency;
      totalEvidence += metric.evidenceScore;
    }

    return {
      totalMetrics: allMetrics.length,
      averageAccuracy: allMetrics.length > 0 ? totalAccuracy / allMetrics.length : 0,
      averageNaturalness: allMetrics.length > 0 ? totalNaturalness / allMetrics.length : 0,
      averageConsistency: allMetrics.length > 0 ? totalConsistency / allMetrics.length : 0,
      averageEvidenceScore: allMetrics.length > 0 ? totalEvidence / allMetrics.length : 0,
      totalAlerts: allAlerts.length,
      openAlerts: this.alertsByStatus.get('open')?.length || 0,
      resolvedAlerts: this.alertsByStatus.get('resolved')?.length || 0,
      totalTrends: allTrends.length,
    };
  }

  /**
   * メトリクスを削除
   */
  deleteMetric(metricId: string): boolean {
    const metric = this.metrics.get(metricId);
    if (!metric) return false;

    const responseIds = this.metricsByResponse.get(metric.responseId) || [];
    const index = responseIds.indexOf(metricId);
    if (index > -1) {
      responseIds.splice(index, 1);
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
   * トレンドを削除
   */
  deleteTrend(trendId: string): boolean {
    const trend = this.trends.get(trendId);
    if (!trend) return false;

    const periodIds = this.trendsByPeriod.get(trend.period) || [];
    const index = periodIds.indexOf(trendId);
    if (index > -1) {
      periodIds.splice(index, 1);
    }

    this.trends.delete(trendId);
    return true;
  }
}
