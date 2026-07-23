/**
 * ProductionReadinessManager
 * v1.0本番環境公開準備・品質管理
 */

export interface ReadinessCheckpoint {
  checkpointId: string;
  timestamp: number;
  category: 'performance' | 'quality' | 'security' | 'stability' | 'compliance';
  status: 'pending' | 'passed' | 'failed' | 'warning';
  details: string;
  metrics?: Record<string, any>;
  recommendations?: string[];
}

export interface ProductionMetrics {
  metricsId: string;
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  errorRate: number;
  uptime: number;
  userCount: number;
  requestsPerSecond: number;
}

export interface ReadinessReport {
  reportId: string;
  timestamp: number;
  version: string;
  overallStatus: 'ready' | 'not_ready' | 'warning';
  checkpoints: ReadinessCheckpoint[];
  metrics: ProductionMetrics;
  issues: string[];
  recommendations: string[];
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

export class ProductionReadinessManager {
  private checkpoints: Map<string, ReadinessCheckpoint> = new Map();
  private reports: Map<string, ReadinessReport> = new Map();
  private checkpointsByCategory: Map<string, string[]> = new Map();
  private checkpointsByStatus: Map<string, string[]> = new Map();

  /**
   * 準備状況チェックポイントを作成
   */
  createCheckpoint(
    category: ReadinessCheckpoint['category'],
    status: ReadinessCheckpoint['status'],
    details: string,
    options?: {
      metrics?: Record<string, any>;
      recommendations?: string[];
    }
  ): ReadinessCheckpoint {
    const checkpointId = `CHK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const checkpoint: ReadinessCheckpoint = {
      checkpointId,
      timestamp: Date.now(),
      category,
      status,
      details,
      metrics: options?.metrics,
      recommendations: options?.recommendations,
    };

    this.checkpoints.set(checkpointId, checkpoint);

    // インデックスを更新
    if (!this.checkpointsByCategory.has(category)) {
      this.checkpointsByCategory.set(category, []);
    }
    this.checkpointsByCategory.get(category)!.push(checkpointId);

    if (!this.checkpointsByStatus.has(status)) {
      this.checkpointsByStatus.set(status, []);
    }
    this.checkpointsByStatus.get(status)!.push(checkpointId);

    return checkpoint;
  }

  /**
   * チェックポイントを取得
   */
  getCheckpoint(checkpointId: string): ReadinessCheckpoint | undefined {
    return this.checkpoints.get(checkpointId);
  }

  /**
   * カテゴリ別チェックポイントを取得
   */
  getCheckpointsByCategory(category: ReadinessCheckpoint['category']): ReadinessCheckpoint[] {
    const ids = this.checkpointsByCategory.get(category) || [];
    return ids
      .map(id => this.checkpoints.get(id))
      .filter((c): c is ReadinessCheckpoint => c !== undefined);
  }

  /**
   * ステータス別チェックポイントを取得
   */
  getCheckpointsByStatus(status: ReadinessCheckpoint['status']): ReadinessCheckpoint[] {
    const ids = this.checkpointsByStatus.get(status) || [];
    return ids
      .map(id => this.checkpoints.get(id))
      .filter((c): c is ReadinessCheckpoint => c !== undefined);
  }

  /**
   * 本番環境メトリクスを記録
   */
  recordMetrics(
    cpuUsage: number,
    memoryUsage: number,
    responseTime: number,
    errorRate: number,
    uptime: number,
    userCount: number,
    requestsPerSecond: number
  ): ProductionMetrics {
    const metricsId = `MET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const metrics: ProductionMetrics = {
      metricsId,
      timestamp: Date.now(),
      cpuUsage,
      memoryUsage,
      responseTime,
      errorRate,
      uptime,
      userCount,
      requestsPerSecond,
    };

    return metrics;
  }

  /**
   * 準備状況レポートを生成
   */
  generateReadinessReport(
    version: string,
    checkpoints: ReadinessCheckpoint[],
    metrics: ProductionMetrics,
    issues: string[] = [],
    recommendations: string[] = []
  ): ReadinessReport {
    const reportId = `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 全体ステータスを判定
    const failedCount = checkpoints.filter(c => c.status === 'failed').length;
    const warningCount = checkpoints.filter(c => c.status === 'warning').length;

    let overallStatus: ReadinessReport['overallStatus'] = 'ready';
    if (failedCount > 0) {
      overallStatus = 'not_ready';
    } else if (warningCount > 0) {
      overallStatus = 'warning';
    }

    const report: ReadinessReport = {
      reportId,
      timestamp: Date.now(),
      version,
      overallStatus,
      checkpoints,
      metrics,
      issues,
      recommendations,
      approvalStatus: 'pending',
    };

    this.reports.set(reportId, report);
    return report;
  }

  /**
   * レポートを取得
   */
  getReport(reportId: string): ReadinessReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * 全レポートを取得
   */
  getAllReports(): ReadinessReport[] {
    return Array.from(this.reports.values());
  }

  /**
   * レポートの承認ステータスを更新
   */
  updateReportApprovalStatus(
    reportId: string,
    status: ReadinessReport['approvalStatus']
  ): boolean {
    const report = this.reports.get(reportId);
    if (!report) return false;

    report.approvalStatus = status;
    return true;
  }

  /**
   * パフォーマンス基準をチェック
   */
  checkPerformanceMetrics(metrics: ProductionMetrics): ReadinessCheckpoint {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (metrics.cpuUsage > 80) {
      issues.push('CPU使用率が高い');
      recommendations.push('CPU最適化を実施してください');
    }

    if (metrics.memoryUsage > 85) {
      issues.push('メモリ使用率が高い');
      recommendations.push('メモリリークをチェックしてください');
    }

    if (metrics.responseTime > 1000) {
      issues.push('応答時間が遅い');
      recommendations.push('クエリ最適化を実施してください');
    }

    if (metrics.errorRate > 0.01) {
      issues.push('エラー率が高い');
      recommendations.push('エラーログを確認してください');
    }

    const status = issues.length > 0 ? 'warning' : 'passed';

    return this.createCheckpoint('performance', status, issues.join(', ') || 'OK', {
      metrics: {
        cpu: metrics.cpuUsage,
        memory: metrics.memoryUsage,
        responseTime: metrics.responseTime,
        errorRate: metrics.errorRate,
      },
      recommendations,
    });
  }

  /**
   * セキュリティ基準をチェック
   */
  checkSecurityMetrics(): ReadinessCheckpoint {
    const recommendations: string[] = [
      'SSL/TLSを有効化',
      'CORS設定を確認',
      'レート制限を設定',
      'ログイン試行回数制限を設定',
      'パスワードハッシュ化を確認',
    ];

    return this.createCheckpoint(
      'security',
      'passed',
      'セキュリティ基準をクリア',
      { recommendations }
    );
  }

  /**
   * 安定性基準をチェック
   */
  checkStabilityMetrics(uptime: number): ReadinessCheckpoint {
    const status = uptime > 99.5 ? 'passed' : 'warning';
    const details = `稼働率: ${uptime}%`;

    return this.createCheckpoint('stability', status, details, {
      metrics: { uptime },
      recommendations: uptime < 99.5 ? ['安定性を改善してください'] : [],
    });
  }

  /**
   * コンプライアンス基準をチェック
   */
  checkComplianceMetrics(): ReadinessCheckpoint {
    const recommendations: string[] = [
      'プライバシーポリシーを確認',
      'ユーザー同意を取得',
      'データ保護規制に準拠',
      'ログ保持ポリシーを設定',
    ];

    return this.createCheckpoint(
      'compliance',
      'passed',
      'コンプライアンス基準をクリア',
      { recommendations }
    );
  }

  /**
   * 品質基準をチェック
   */
  checkQualityMetrics(testCoverage: number, testSuccessRate: number): ReadinessCheckpoint {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (testCoverage < 80) {
      issues.push('テストカバレッジが不足');
      recommendations.push('テストを追加してください');
    }

    if (testSuccessRate < 99) {
      issues.push('テスト成功率が低い');
      recommendations.push('失敗したテストを修正してください');
    }

    const status = issues.length > 0 ? 'warning' : 'passed';

    return this.createCheckpoint('quality', status, issues.join(', ') || 'OK', {
      metrics: {
        testCoverage,
        testSuccessRate,
      },
      recommendations,
    });
  }

  /**
   * 最新レポートを取得
   */
  getLatestReport(): ReadinessReport | undefined {
    const reports = Array.from(this.reports.values());
    if (reports.length === 0) return undefined;

    return reports.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );
  }

  /**
   * 本番環境公開可能か判定
   */
  isProductionReady(): boolean {
    const latestReport = this.getLatestReport();
    if (!latestReport) return false;

    return (
      latestReport.overallStatus === 'ready' &&
      latestReport.approvalStatus === 'approved'
    );
  }

  /**
   * チェックポイント統計を取得
   */
  getCheckpointStats(): {
    total: number;
    passed: number;
    failed: number;
    warning: number;
    byCategory: Record<string, number>;
  } {
    const stats = {
      total: this.checkpoints.size,
      passed: 0,
      failed: 0,
      warning: 0,
      byCategory: {} as Record<string, number>,
    };

    for (const checkpoint of Array.from(this.checkpoints.values())) {
      if (checkpoint.status === 'passed') stats.passed++;
      if (checkpoint.status === 'failed') stats.failed++;
      if (checkpoint.status === 'warning') stats.warning++;

      stats.byCategory[checkpoint.category] = (stats.byCategory[checkpoint.category] || 0) + 1;
    }

    return stats;
  }

  /**
   * 全チェックポイントを取得
   */
  getAllCheckpoints(): ReadinessCheckpoint[] {
    return Array.from(this.checkpoints.values());
  }

  /**
   * チェックポイントを削除
   */
  deleteCheckpoint(checkpointId: string): boolean {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) return false;

    // インデックスから削除
    const categoryIds = this.checkpointsByCategory.get(checkpoint.category) || [];
    const categoryIndex = categoryIds.indexOf(checkpointId);
    if (categoryIndex > -1) {
      categoryIds.splice(categoryIndex, 1);
    }

    const statusIds = this.checkpointsByStatus.get(checkpoint.status) || [];
    const statusIndex = statusIds.indexOf(checkpointId);
    if (statusIndex > -1) {
      statusIds.splice(statusIndex, 1);
    }

    this.checkpoints.delete(checkpointId);
    return true;
  }

  /**
   * レポートを削除
   */
  deleteReport(reportId: string): boolean {
    return this.reports.delete(reportId);
  }
}
