/**
 * HealthManager - ヘルス管理
 * 
 * 機能:
 * - マネージャーの生存確認
 * - AI API状態監視
 * - データベース状態監視
 * - ヘルスレポート生成
 */

export interface ComponentHealth {
  componentName: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: number;
  responseTime: number;
  errorCount: number;
  successRate: number;
}

export interface HealthReport {
  reportId: string;
  timestamp: number;
  overallHealth: 'healthy' | 'warning' | 'critical';
  componentStatuses: ComponentHealth[];
  issues: string[];
  recommendations: string[];
}

export class HealthManager {
  private static instance: HealthManager;
  private componentStatuses: Map<string, ComponentHealth> = new Map();
  private healthReports: HealthReport[] = [];
  private reportCounter: number = 0;

  private constructor() {
    this.initializeComponents();
  }

  static getInstance(): HealthManager {
    if (!HealthManager.instance) {
      HealthManager.instance = new HealthManager();
    }
    return HealthManager.instance;
  }

  /**
   * コンポーネント初期化
   */
  private initializeComponents(): void {
    const components = [
      'AccountManager',
      'SecurityAIManager',
      'GovernanceAIManager',
      'ComplianceAIManager',
      'SubscriptionManager',
      'ManufacturingIntelligenceAIManager',
      'EvolutionAIManager',
      'VoiceAIManager',
      'Database',
      'Cache',
    ];

    components.forEach((component: string) => {
      this.componentStatuses.set(component, {
        componentName: component,
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: 0,
        errorCount: 0,
        successRate: 100,
      });
    });
  }

  /**
   * コンポーネント状態更新
   */
  updateComponentHealth(
    componentName: string,
    status: 'healthy' | 'degraded' | 'down',
    responseTime: number,
    errorCount: number,
    successRate: number
  ): ComponentHealth {
    const health: ComponentHealth = {
      componentName,
      status,
      lastCheck: Date.now(),
      responseTime,
      errorCount,
      successRate,
    };

    this.componentStatuses.set(componentName, health);
    return health;
  }

  /**
   * コンポーネント状態取得
   */
  getComponentHealth(componentName: string): ComponentHealth | null {
    return this.componentStatuses.get(componentName) || null;
  }

  /**
   * すべてのコンポーネント状態取得
   */
  getAllComponentStatuses(): ComponentHealth[] {
    return Array.from(this.componentStatuses.values());
  }

  /**
   * ヘルスレポート生成
   */
  generateHealthReport(): HealthReport {
    const reportId = `health_${++this.reportCounter}_${Date.now()}`;
    const componentStatuses = this.getAllComponentStatuses();

    const issues: string[] = [];
    const recommendations: string[] = [];

    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    const downCount = componentStatuses.filter((c: ComponentHealth) => c.status === 'down').length;
    const degradedCount = componentStatuses.filter((c: ComponentHealth) => c.status === 'degraded').length;

    if (downCount > 0) {
      overallHealth = 'critical';
      const downComponents = componentStatuses
        .filter((c: ComponentHealth) => c.status === 'down')
        .map((c: ComponentHealth) => c.componentName);
      issues.push(`以下のコンポーネントがダウンしています: ${downComponents.join(', ')}`);
      recommendations.push('ダウンしたコンポーネントを再起動してください');
    }

    if (degradedCount > 0) {
      overallHealth = 'warning';
      const degradedComponents = componentStatuses
        .filter((c: ComponentHealth) => c.status === 'degraded')
        .map((c: ComponentHealth) => c.componentName);
      issues.push(`以下のコンポーネントが低下しています: ${degradedComponents.join(', ')}`);
      recommendations.push('パフォーマンスの低下を調査してください');
    }

    const avgResponseTime =
      componentStatuses.length > 0
        ? componentStatuses.reduce((sum: number, c: ComponentHealth) => sum + c.responseTime, 0) / componentStatuses.length
        : 0;

    if (avgResponseTime > 500) {
      recommendations.push('平均応答時間が高いため、パフォーマンス最適化を検討してください');
    }

    const report: HealthReport = {
      reportId,
      timestamp: Date.now(),
      overallHealth,
      componentStatuses,
      issues,
      recommendations,
    };

    this.healthReports.push(report);

    // 最新100件のみ保持
    if (this.healthReports.length > 100) {
      this.healthReports.shift();
    }

    return report;
  }

  /**
   * ヘルスレポート取得
   */
  getHealthReport(reportId: string): HealthReport | null {
    return this.healthReports.find((r: HealthReport) => r.reportId === reportId) || null;
  }

  /**
   * 最新ヘルスレポート取得
   */
  getLatestHealthReport(): HealthReport | null {
    return this.healthReports.length > 0 ? this.healthReports[this.healthReports.length - 1] : null;
  }

  /**
   * ヘルスレポート履歴取得
   */
  getHealthReportHistory(limit: number = 50): HealthReport[] {
    const start = Math.max(0, this.healthReports.length - limit);
    return this.healthReports.slice(start);
  }

  /**
   * ヘルス統計取得
   */
  getHealthStatistics(): {
    totalComponents: number;
    healthyComponents: number;
    degradedComponents: number;
    downComponents: number;
    averageSuccessRate: number;
    averageResponseTime: number;
  } {
    const statuses = this.getAllComponentStatuses();
    const healthyCount = statuses.filter((c: ComponentHealth) => c.status === 'healthy').length;
    const degradedCount = statuses.filter((c: ComponentHealth) => c.status === 'degraded').length;
    const downCount = statuses.filter((c: ComponentHealth) => c.status === 'down').length;

    const avgSuccessRate =
      statuses.length > 0 ? statuses.reduce((sum: number, c: ComponentHealth) => sum + c.successRate, 0) / statuses.length : 0;
    const avgResponseTime =
      statuses.length > 0 ? statuses.reduce((sum: number, c: ComponentHealth) => sum + c.responseTime, 0) / statuses.length : 0;

    return {
      totalComponents: statuses.length,
      healthyComponents: healthyCount,
      degradedComponents: degradedCount,
      downComponents: downCount,
      averageSuccessRate: avgSuccessRate,
      averageResponseTime: avgResponseTime,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.componentStatuses.clear();
    this.healthReports = [];
  }
}

export const healthManager = HealthManager.getInstance();
export default healthManager;
