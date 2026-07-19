/**
 * OperationsDashboardService
 * 運用ダッシュボード・可視化・レポート
 */

export interface DashboardWidget {
  widgetId: string;
  type: 'metric' | 'chart' | 'alert' | 'incident';
  title: string;
  data: Record<string, unknown>;
  refreshInterval: number;
  lastUpdated: number;
}

export interface DashboardReport {
  reportId: string;
  timestamp: number;
  period: 'daily' | 'weekly' | 'monthly';
  summary: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    errorCount: number;
    aiQualityScore: number;
  };
  topIssues: string[];
  recommendations: string[];
}

export interface KPIMetric {
  kpiId: string;
  name: string;
  currentValue: number;
  targetValue: number;
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

export class OperationsDashboardService {
  private widgets: Map<string, DashboardWidget> = new Map();
  private reports: Map<string, DashboardReport> = new Map();
  private kpis: Map<string, KPIMetric> = new Map();
  private widgetsByType: Map<string, string[]> = new Map();
  private reportsByPeriod: Map<string, string[]> = new Map();

  /**
   * ウィジェットを作成
   */
  createWidget(
    type: 'metric' | 'chart' | 'alert' | 'incident',
    title: string,
    data: Record<string, unknown>,
    refreshInterval: number
  ): DashboardWidget {
    const widgetId = `WID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const widget: DashboardWidget = {
      widgetId,
      type,
      title,
      data,
      refreshInterval,
      lastUpdated: Date.now(),
    };

    this.widgets.set(widgetId, widget);

    if (!this.widgetsByType.has(type)) {
      this.widgetsByType.set(type, []);
    }
    this.widgetsByType.get(type)!.push(widgetId);

    return widget;
  }

  /**
   * ウィジェットを取得
   */
  getWidget(widgetId: string): DashboardWidget | undefined {
    return this.widgets.get(widgetId);
  }

  /**
   * タイプ別ウィジェットを取得
   */
  getWidgetsByType(type: 'metric' | 'chart' | 'alert' | 'incident'): DashboardWidget[] {
    const ids = this.widgetsByType.get(type) || [];
    return ids
      .map(id => this.widgets.get(id))
      .filter((w): w is DashboardWidget => w !== undefined);
  }

  /**
   * ウィジェットを更新
   */
  updateWidget(widgetId: string, data: Record<string, unknown>): boolean {
    const widget = this.widgets.get(widgetId);
    if (!widget) return false;

    widget.data = data;
    widget.lastUpdated = Date.now();

    return true;
  }

  /**
   * レポートを生成
   */
  generateReport(
    period: 'daily' | 'weekly' | 'monthly',
    totalRequests: number,
    successRate: number,
    averageResponseTime: number,
    errorCount: number,
    aiQualityScore: number,
    topIssues: string[],
    recommendations: string[]
  ): DashboardReport {
    const reportId = `REP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const report: DashboardReport = {
      reportId,
      timestamp: Date.now(),
      period,
      summary: {
        totalRequests,
        successRate,
        averageResponseTime,
        errorCount,
        aiQualityScore,
      },
      topIssues,
      recommendations,
    };

    this.reports.set(reportId, report);

    if (!this.reportsByPeriod.has(period)) {
      this.reportsByPeriod.set(period, []);
    }
    this.reportsByPeriod.get(period)!.push(reportId);

    return report;
  }

  /**
   * レポートを取得
   */
  getReport(reportId: string): DashboardReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * 期間別レポートを取得
   */
  getReportsByPeriod(period: 'daily' | 'weekly' | 'monthly'): DashboardReport[] {
    const ids = this.reportsByPeriod.get(period) || [];
    return ids
      .map(id => this.reports.get(id))
      .filter((r): r is DashboardReport => r !== undefined);
  }

  /**
   * KPIを作成
   */
  createKPI(
    name: string,
    currentValue: number,
    targetValue: number,
    threshold: number
  ): KPIMetric {
    const kpiId = `KPI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (currentValue < threshold) {
      status = 'critical';
    } else if (currentValue < targetValue) {
      status = 'warning';
    }

    const kpi: KPIMetric = {
      kpiId,
      name,
      currentValue,
      targetValue,
      threshold,
      status,
      trend: 'stable',
    };

    this.kpis.set(kpiId, kpi);

    return kpi;
  }

  /**
   * KPIを取得
   */
  getKPI(kpiId: string): KPIMetric | undefined {
    return this.kpis.get(kpiId);
  }

  /**
   * KPIを更新
   */
  updateKPI(kpiId: string, currentValue: number): boolean {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) return false;

    const previousValue = kpi.currentValue;
    kpi.currentValue = currentValue;

    if (currentValue > previousValue) {
      kpi.trend = 'up';
    } else if (currentValue < previousValue) {
      kpi.trend = 'down';
    } else {
      kpi.trend = 'stable';
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (currentValue < kpi.threshold) {
      status = 'critical';
    } else if (currentValue < kpi.targetValue) {
      status = 'warning';
    }
    kpi.status = status;

    return true;
  }

  /**
   * 全ウィジェットを取得
   */
  getAllWidgets(): DashboardWidget[] {
    return Array.from(this.widgets.values());
  }

  /**
   * 全レポートを取得
   */
  getAllReports(): DashboardReport[] {
    return Array.from(this.reports.values());
  }

  /**
   * 全KPIを取得
   */
  getAllKPIs(): KPIMetric[] {
    return Array.from(this.kpis.values());
  }

  /**
   * 最新レポートを取得
   */
  getLatestReport(period: 'daily' | 'weekly' | 'monthly'): DashboardReport | undefined {
    const reports = this.getReportsByPeriod(period);
    if (reports.length === 0) return undefined;

    return reports.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );
  }

  /**
   * ダッシュボード統計を計算
   */
  getDashboardStats(): {
    totalWidgets: number;
    totalReports: number;
    totalKPIs: number;
    healthyKPIs: number;
    warningKPIs: number;
    criticalKPIs: number;
  } {
    const allKPIs = Array.from(this.kpis.values());

    return {
      totalWidgets: this.widgets.size,
      totalReports: this.reports.size,
      totalKPIs: allKPIs.length,
      healthyKPIs: allKPIs.filter(k => k.status === 'healthy').length,
      warningKPIs: allKPIs.filter(k => k.status === 'warning').length,
      criticalKPIs: allKPIs.filter(k => k.status === 'critical').length,
    };
  }

  /**
   * ウィジェットを削除
   */
  deleteWidget(widgetId: string): boolean {
    const widget = this.widgets.get(widgetId);
    if (!widget) return false;

    const typeIds = this.widgetsByType.get(widget.type) || [];
    const index = typeIds.indexOf(widgetId);
    if (index > -1) {
      typeIds.splice(index, 1);
    }

    this.widgets.delete(widgetId);
    return true;
  }

  /**
   * レポートを削除
   */
  deleteReport(reportId: string): boolean {
    const report = this.reports.get(reportId);
    if (!report) return false;

    const periodIds = this.reportsByPeriod.get(report.period) || [];
    const index = periodIds.indexOf(reportId);
    if (index > -1) {
      periodIds.splice(index, 1);
    }

    this.reports.delete(reportId);
    return true;
  }

  /**
   * KPIを削除
   */
  deleteKPI(kpiId: string): boolean {
    return this.kpis.delete(kpiId);
  }
}
