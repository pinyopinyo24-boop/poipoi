/**
 * SystemDashboard - システムダッシュボード
 * 
 * 機能:
 * - システムメトリクス表示
 * - リアルタイム監視
 * - アラート管理
 * - レポート生成
 */

export interface SystemMetrics {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  activeUsers: number;
  totalRequests: number;
  errorRate: number;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'alert' | 'log';
  data: Record<string, any>;
  refreshInterval: number;
}

export class SystemDashboard {
  private static instance: SystemDashboard;
  private metrics: SystemMetrics[] = [];
  private alerts: Map<string, Alert> = new Map();
  private widgets: Map<string, DashboardWidget> = new Map();
  private alertCounter: number = 0;
  private widgetCounter: number = 0;

  private constructor() {}

  static getInstance(): SystemDashboard {
    if (!SystemDashboard.instance) {
      SystemDashboard.instance = new SystemDashboard();
    }
    return SystemDashboard.instance;
  }

  /**
   * メトリクス記録
   */
  recordMetrics(
    cpuUsage: number,
    memoryUsage: number,
    diskUsage: number,
    networkLatency: number,
    activeUsers: number,
    totalRequests: number,
    errorRate: number
  ): SystemMetrics {
    const metric: SystemMetrics = {
      timestamp: Date.now(),
      cpuUsage,
      memoryUsage,
      diskUsage,
      networkLatency,
      activeUsers,
      totalRequests,
      errorRate,
    };

    this.metrics.push(metric);

    // 最新1000件のみ保持
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }

    // アラート生成
    this.checkAndCreateAlerts(metric);

    return metric;
  }

  /**
   * アラート生成チェック
   */
  private checkAndCreateAlerts(metric: SystemMetrics): void {
    if (metric.cpuUsage > 90) {
      this.createAlert('critical', `CPU使用率が高い: ${metric.cpuUsage}%`);
    }
    if (metric.memoryUsage > 85) {
      this.createAlert('warning', `メモリ使用率が高い: ${metric.memoryUsage}%`);
    }
    if (metric.errorRate > 5) {
      this.createAlert('error', `エラー率が高い: ${metric.errorRate}%`);
    }
  }

  /**
   * アラート作成
   */
  createAlert(severity: 'info' | 'warning' | 'error' | 'critical', message: string): Alert {
    const alertId = `alert_${++this.alertCounter}_${Date.now()}`;

    const alert: Alert = {
      id: alertId,
      severity,
      message,
      timestamp: Date.now(),
      resolved: false,
    };

    this.alerts.set(alertId, alert);
    return alert;
  }

  /**
   * アラート取得
   */
  getAlert(alertId: string): Alert | null {
    return this.alerts.get(alertId) || null;
  }

  /**
   * 未解決アラート取得
   */
  getUnresolvedAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((a: Alert) => !a.resolved);
  }

  /**
   * アラート解決
   */
  resolveAlert(alertId: string): Alert | null {
    const alert = this.getAlert(alertId);
    if (!alert) return null;

    alert.resolved = true;
    return alert;
  }

  /**
   * 最新メトリクス取得
   */
  getLatestMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * メトリクス履歴取得
   */
  getMetricsHistory(limit: number = 100): SystemMetrics[] {
    const start = Math.max(0, this.metrics.length - limit);
    return this.metrics.slice(start);
  }

  /**
   * ウィジェット追加
   */
  addWidget(
    title: string,
    type: 'metric' | 'chart' | 'alert' | 'log',
    data: Record<string, any>,
    refreshInterval: number = 5000
  ): DashboardWidget {
    const widgetId = `widget_${++this.widgetCounter}_${Date.now()}`;

    const widget: DashboardWidget = {
      id: widgetId,
      title,
      type,
      data,
      refreshInterval,
    };

    this.widgets.set(widgetId, widget);
    return widget;
  }

  /**
   * ウィジェット取得
   */
  getWidget(widgetId: string): DashboardWidget | null {
    return this.widgets.get(widgetId) || null;
  }

  /**
   * すべてのウィジェット取得
   */
  getAllWidgets(): DashboardWidget[] {
    return Array.from(this.widgets.values());
  }

  /**
   * ダッシュボードサマリー取得
   */
  getDashboardSummary(): {
    latestMetrics: SystemMetrics | null;
    unresolvedAlerts: Alert[];
    widgetCount: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
  } {
    const latestMetrics = this.getLatestMetrics();
    const unresolvedAlerts = this.getUnresolvedAlerts();

    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (latestMetrics) {
      if (latestMetrics.cpuUsage > 90 || latestMetrics.errorRate > 5) {
        systemHealth = 'critical';
      } else if (latestMetrics.cpuUsage > 70 || latestMetrics.memoryUsage > 80) {
        systemHealth = 'warning';
      }
    }

    return {
      latestMetrics,
      unresolvedAlerts,
      widgetCount: this.widgets.size,
      systemHealth,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.metrics = [];
    this.alerts.clear();
    this.widgets.clear();
  }
}

export const systemDashboard = SystemDashboard.getInstance();
export default systemDashboard;
