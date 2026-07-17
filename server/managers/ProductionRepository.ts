/**
 * ProductionRepository
 * 本番環境データ永続化・バージョン管理
 */

export interface ProductionDeployment {
  deploymentId: string;
  version: string;
  timestamp: number;
  status: 'pending' | 'deployed' | 'rolled_back' | 'failed';
  deployedBy: string;
  deployedAt?: number;
  rollbackReason?: string;
  metrics: {
    deploymentTime: number;
    errorRate: number;
    responseTime: number;
    uptime: number;
  };
  changes: string[];
}

export interface ProductionMetrics {
  metricsId: string;
  deploymentId: string;
  timestamp: number;
  activeUsers: number;
  requestsPerSecond: number;
  errorRate: number;
  averageResponseTime: number;
  cpuUsage: number;
  memoryUsage: number;
  databaseConnections: number;
  cacheHitRate: number;
}

export interface VersionHistory {
  historyId: string;
  version: string;
  releaseDate: number;
  features: string[];
  bugFixes: string[];
  improvements: string[];
  knownIssues: string[];
  deprecations: string[];
}

export class ProductionRepository {
  private deployments: Map<string, ProductionDeployment> = new Map();
  private metrics: Map<string, ProductionMetrics> = new Map();
  private history: Map<string, VersionHistory> = new Map();
  private deploymentsByVersion: Map<string, string[]> = new Map();
  private metricsByDeployment: Map<string, string[]> = new Map();
  private deploymentsByStatus: Map<string, string[]> = new Map();

  /**
   * デプロイを記録
   */
  recordDeployment(
    version: string,
    deployedBy: string,
    changes: string[],
    metrics: ProductionDeployment['metrics']
  ): ProductionDeployment {
    const deploymentId = `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const deployment: ProductionDeployment = {
      deploymentId,
      version,
      timestamp: Date.now(),
      status: 'pending',
      deployedBy,
      metrics,
      changes,
    };

    this.deployments.set(deploymentId, deployment);

    if (!this.deploymentsByVersion.has(version)) {
      this.deploymentsByVersion.set(version, []);
    }
    this.deploymentsByVersion.get(version)!.push(deploymentId);

    if (!this.deploymentsByStatus.has('pending')) {
      this.deploymentsByStatus.set('pending', []);
    }
    this.deploymentsByStatus.get('pending')!.push(deploymentId);

    return deployment;
  }

  /**
   * デプロイを取得
   */
  getDeployment(deploymentId: string): ProductionDeployment | undefined {
    return this.deployments.get(deploymentId);
  }

  /**
   * バージョン別デプロイを取得
   */
  getDeploymentsByVersion(version: string): ProductionDeployment[] {
    const ids = this.deploymentsByVersion.get(version) || [];
    return ids
      .map(id => this.deployments.get(id))
      .filter((d): d is ProductionDeployment => d !== undefined);
  }

  /**
   * ステータス別デプロイを取得
   */
  getDeploymentsByStatus(status: ProductionDeployment['status']): ProductionDeployment[] {
    const ids = this.deploymentsByStatus.get(status) || [];
    return ids
      .map(id => this.deployments.get(id))
      .filter((d): d is ProductionDeployment => d !== undefined);
  }

  /**
   * デプロイを承認
   */
  approveDeployment(deploymentId: string): boolean {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return false;

    // ステータスを更新
    const oldIds = this.deploymentsByStatus.get(deployment.status) || [];
    const index = oldIds.indexOf(deploymentId);
    if (index > -1) {
      oldIds.splice(index, 1);
    }

    deployment.status = 'deployed';
    deployment.deployedAt = Date.now();

    if (!this.deploymentsByStatus.has('deployed')) {
      this.deploymentsByStatus.set('deployed', []);
    }
    this.deploymentsByStatus.get('deployed')!.push(deploymentId);

    return true;
  }

  /**
   * デプロイをロールバック
   */
  rollbackDeployment(deploymentId: string, reason: string): boolean {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return false;

    // ステータスを更新
    const oldIds = this.deploymentsByStatus.get(deployment.status) || [];
    const index = oldIds.indexOf(deploymentId);
    if (index > -1) {
      oldIds.splice(index, 1);
    }

    deployment.status = 'rolled_back';
    deployment.rollbackReason = reason;

    if (!this.deploymentsByStatus.has('rolled_back')) {
      this.deploymentsByStatus.set('rolled_back', []);
    }
    this.deploymentsByStatus.get('rolled_back')!.push(deploymentId);

    return true;
  }

  /**
   * メトリクスを記録
   */
  recordMetrics(
    deploymentId: string,
    activeUsers: number,
    requestsPerSecond: number,
    errorRate: number,
    averageResponseTime: number,
    cpuUsage: number,
    memoryUsage: number,
    databaseConnections: number,
    cacheHitRate: number
  ): ProductionMetrics {
    const metricsId = `MET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const metrics: ProductionMetrics = {
      metricsId,
      deploymentId,
      timestamp: Date.now(),
      activeUsers,
      requestsPerSecond,
      errorRate,
      averageResponseTime,
      cpuUsage,
      memoryUsage,
      databaseConnections,
      cacheHitRate,
    };

    this.metrics.set(metricsId, metrics);

    if (!this.metricsByDeployment.has(deploymentId)) {
      this.metricsByDeployment.set(deploymentId, []);
    }
    this.metricsByDeployment.get(deploymentId)!.push(metricsId);

    return metrics;
  }

  /**
   * メトリクスを取得
   */
  getMetrics(metricsId: string): ProductionMetrics | undefined {
    return this.metrics.get(metricsId);
  }

  /**
   * デプロイ別メトリクスを取得
   */
  getMetricsByDeployment(deploymentId: string): ProductionMetrics[] {
    const ids = this.metricsByDeployment.get(deploymentId) || [];
    return ids
      .map(id => this.metrics.get(id))
      .filter((m): m is ProductionMetrics => m !== undefined);
  }

  /**
   * バージョン履歴を記録
   */
  recordVersionHistory(
    version: string,
    features: string[],
    bugFixes: string[],
    improvements: string[],
    knownIssues: string[] = [],
    deprecations: string[] = []
  ): VersionHistory {
    const historyId = `VER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const history: VersionHistory = {
      historyId,
      version,
      releaseDate: Date.now(),
      features,
      bugFixes,
      improvements,
      knownIssues,
      deprecations,
    };

    this.history.set(historyId, history);
    return history;
  }

  /**
   * バージョン履歴を取得
   */
  getVersionHistory(historyId: string): VersionHistory | undefined {
    return this.history.get(historyId);
  }

  /**
   * バージョン別履歴を取得
   */
  getHistoryByVersion(version: string): VersionHistory | undefined {
    const histories = Array.from(this.history.values());
    return histories.find(h => h.version === version);
  }

  /**
   * 全デプロイを取得
   */
  getAllDeployments(): ProductionDeployment[] {
    return Array.from(this.deployments.values());
  }

  /**
   * 全メトリクスを取得
   */
  getAllMetrics(): ProductionMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * 全バージョン履歴を取得
   */
  getAllVersionHistories(): VersionHistory[] {
    return Array.from(this.history.values());
  }

  /**
   * 最新のデプロイを取得
   */
  getLatestDeployment(): ProductionDeployment | undefined {
    const deployments = Array.from(this.deployments.values());
    if (deployments.length === 0) return undefined;

    return deployments.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );
  }

  /**
   * 最新のメトリクスを取得
   */
  getLatestMetrics(): ProductionMetrics | undefined {
    const allMetrics = Array.from(this.metrics.values());
    if (allMetrics.length === 0) return undefined;

    return allMetrics.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );
  }

  /**
   * デプロイ統計を計算
   */
  getDeploymentStats(): {
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    rolledBackDeployments: number;
    successRate: number;
  } {
    const deployments = Array.from(this.deployments.values());
    const stats = {
      totalDeployments: deployments.length,
      successfulDeployments: 0,
      failedDeployments: 0,
      rolledBackDeployments: 0,
      successRate: 0,
    };

    for (const deployment of deployments) {
      if (deployment.status === 'deployed') {
        stats.successfulDeployments++;
      } else if (deployment.status === 'failed') {
        stats.failedDeployments++;
      } else if (deployment.status === 'rolled_back') {
        stats.rolledBackDeployments++;
      }
    }

    stats.successRate =
      deployments.length > 0
        ? (stats.successfulDeployments / deployments.length) * 100
        : 0;

    return stats;
  }

  /**
   * パフォーマンス統計を計算
   */
  getPerformanceStats(): {
    averageResponseTime: number;
    averageErrorRate: number;
    averageCPUUsage: number;
    averageMemoryUsage: number;
    averageCacheHitRate: number;
  } {
    const allMetrics = Array.from(this.metrics.values());
    const stats = {
      averageResponseTime: 0,
      averageErrorRate: 0,
      averageCPUUsage: 0,
      averageMemoryUsage: 0,
      averageCacheHitRate: 0,
    };

    if (allMetrics.length === 0) return stats;

    let totalResponseTime = 0;
    let totalErrorRate = 0;
    let totalCPU = 0;
    let totalMemory = 0;
    let totalCacheHit = 0;

    for (const metric of allMetrics) {
      totalResponseTime += metric.averageResponseTime;
      totalErrorRate += metric.errorRate;
      totalCPU += metric.cpuUsage;
      totalMemory += metric.memoryUsage;
      totalCacheHit += metric.cacheHitRate;
    }

    stats.averageResponseTime = totalResponseTime / allMetrics.length;
    stats.averageErrorRate = totalErrorRate / allMetrics.length;
    stats.averageCPUUsage = totalCPU / allMetrics.length;
    stats.averageMemoryUsage = totalMemory / allMetrics.length;
    stats.averageCacheHitRate = totalCacheHit / allMetrics.length;

    return stats;
  }

  /**
   * デプロイを削除
   */
  deleteDeployment(deploymentId: string): boolean {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return false;

    const versionIds = this.deploymentsByVersion.get(deployment.version) || [];
    const versionIndex = versionIds.indexOf(deploymentId);
    if (versionIndex > -1) {
      versionIds.splice(versionIndex, 1);
    }

    const statusIds = this.deploymentsByStatus.get(deployment.status) || [];
    const statusIndex = statusIds.indexOf(deploymentId);
    if (statusIndex > -1) {
      statusIds.splice(statusIndex, 1);
    }

    this.deployments.delete(deploymentId);
    this.metricsByDeployment.delete(deploymentId);

    return true;
  }

  /**
   * メトリクスを削除
   */
  deleteMetrics(metricsId: string): boolean {
    const metric = this.metrics.get(metricsId);
    if (!metric) return false;

    const deploymentIds = this.metricsByDeployment.get(metric.deploymentId) || [];
    const index = deploymentIds.indexOf(metricsId);
    if (index > -1) {
      deploymentIds.splice(index, 1);
    }

    this.metrics.delete(metricsId);
    return true;
  }

  /**
   * バージョン履歴を削除
   */
  deleteVersionHistory(historyId: string): boolean {
    return this.history.delete(historyId);
  }
}
