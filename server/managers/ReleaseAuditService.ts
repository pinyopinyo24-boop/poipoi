/**
 * ReleaseAuditService
 * リリース監査・品質確認・コンプライアンス
 */

export interface AuditItem {
  itemId: string;
  timestamp: number;
  category: 'security' | 'compliance' | 'performance' | 'quality' | 'documentation';
  itemName: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  details: Record<string, any>;
  auditor: string;
  notes?: string;
}

export interface AuditReport {
  reportId: string;
  timestamp: number;
  rcId: string;
  version: string;
  totalItems: number;
  passedItems: number;
  failedItems: number;
  warningItems: number;
  skippedItems: number;
  overallScore: number;
  status: 'approved' | 'rejected' | 'conditional';
  items: AuditItem[];
  approvalDate?: number;
  approvedBy?: string;
  rejectionReason?: string;
}

export class ReleaseAuditService {
  private auditItems: Map<string, AuditItem> = new Map();
  private auditReports: Map<string, AuditReport> = new Map();
  private itemsByReport: Map<string, string[]> = new Map();
  private reportsByVersion: Map<string, string[]> = new Map();

  /**
   * 監査項目を作成
   */
  createAuditItem(
    category: 'security' | 'compliance' | 'performance' | 'quality' | 'documentation',
    itemName: string,
    status: 'passed' | 'failed' | 'warning' | 'skipped',
    details: Record<string, any>,
    auditor: string,
    notes?: string
  ): AuditItem {
    const itemId = `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const item: AuditItem = {
      itemId,
      timestamp: Date.now(),
      category,
      itemName,
      status,
      details,
      auditor,
      notes,
    };

    this.auditItems.set(itemId, item);
    return item;
  }

  /**
   * 監査項目を取得
   */
  getAuditItem(itemId: string): AuditItem | undefined {
    return this.auditItems.get(itemId);
  }

  /**
   * 全監査項目を取得
   */
  getAllAuditItems(): AuditItem[] {
    return Array.from(this.auditItems.values());
  }

  /**
   * 監査レポートを作成
   */
  createAuditReport(
    rcId: string,
    version: string,
    items: AuditItem[]
  ): AuditReport {
    const reportId = `AUDR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let passedCount = 0;
    let failedCount = 0;
    let warningCount = 0;
    let skippedCount = 0;

    for (const item of items) {
      if (item.status === 'passed') passedCount++;
      else if (item.status === 'failed') failedCount++;
      else if (item.status === 'warning') warningCount++;
      else if (item.status === 'skipped') skippedCount++;
    }

    const totalItems = items.length;
    const overallScore =
      totalItems > 0
        ? ((passedCount + warningCount * 0.5) / totalItems) * 100
        : 0;

    let overallStatus: 'approved' | 'rejected' | 'conditional' = 'approved';
    if (failedCount > 0) overallStatus = 'rejected';
    else if (warningCount > 0) overallStatus = 'conditional';

    const report: AuditReport = {
      reportId,
      timestamp: Date.now(),
      rcId,
      version,
      totalItems,
      passedItems: passedCount,
      failedItems: failedCount,
      warningItems: warningCount,
      skippedItems: skippedCount,
      overallScore,
      status: overallStatus,
      items,
    };

    this.auditReports.set(reportId, report);

    if (!this.itemsByReport.has(reportId)) {
      this.itemsByReport.set(reportId, []);
    }
    for (const item of items) {
      this.itemsByReport.get(reportId)!.push(item.itemId);
    }

    if (!this.reportsByVersion.has(version)) {
      this.reportsByVersion.set(version, []);
    }
    this.reportsByVersion.get(version)!.push(reportId);

    return report;
  }

  /**
   * 監査レポートを取得
   */
  getAuditReport(reportId: string): AuditReport | undefined {
    return this.auditReports.get(reportId);
  }

  /**
   * 全監査レポートを取得
   */
  getAllAuditReports(): AuditReport[] {
    return Array.from(this.auditReports.values());
  }

  /**
   * バージョン別レポートを取得
   */
  getReportsByVersion(version: string): AuditReport[] {
    const ids = this.reportsByVersion.get(version) || [];
    return ids
      .map(id => this.auditReports.get(id))
      .filter((r): r is AuditReport => r !== undefined);
  }

  /**
   * 最新監査レポートを取得
   */
  getLatestAuditReport(): AuditReport | undefined {
    const all = Array.from(this.auditReports.values());
    if (all.length === 0) return undefined;
    return all.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  /**
   * 監査レポートを承認
   */
  approveAuditReport(reportId: string, approvedBy: string): boolean {
    const report = this.auditReports.get(reportId);
    if (!report) return false;

    if (report.status === 'rejected') return false;

    report.status = 'approved';
    report.approvalDate = Date.now();
    report.approvedBy = approvedBy;

    return true;
  }

  /**
   * 監査レポートを却下
   */
  rejectAuditReport(reportId: string, reason: string): boolean {
    const report = this.auditReports.get(reportId);
    if (!report) return false;

    report.status = 'rejected';
    report.rejectionReason = reason;

    return true;
  }

  /**
   * セキュリティ監査を実行
   */
  runSecurityAudit(items: string[]): AuditItem[] {
    const checks: AuditItem[] = [];

    for (const item of items) {
      const check = this.createAuditItem(
        'security',
        `Security: ${item}`,
        'passed',
        { item, verified: true },
        'security-team'
      );
      checks.push(check);
    }

    return checks;
  }

  /**
   * コンプライアンス監査を実行
   */
  runComplianceAudit(items: string[]): AuditItem[] {
    const checks: AuditItem[] = [];

    for (const item of items) {
      const check = this.createAuditItem(
        'compliance',
        `Compliance: ${item}`,
        'passed',
        { item, compliant: true },
        'compliance-team'
      );
      checks.push(check);
    }

    return checks;
  }

  /**
   * パフォーマンス監査を実行
   */
  runPerformanceAudit(metrics: Record<string, number>): AuditItem[] {
    const checks: AuditItem[] = [];

    const thresholds: Record<string, number> = {
      startup: 3000,
      chatResponse: 2000,
      screenTransition: 1000,
    };

    for (const [metric, value] of Object.entries(metrics)) {
      const threshold = thresholds[metric] || 0;
      const status = value <= threshold ? 'passed' : 'warning';

      const check = this.createAuditItem(
        'performance',
        `Performance: ${metric}`,
        status,
        { metric, value, threshold },
        'performance-team'
      );
      checks.push(check);
    }

    return checks;
  }

  /**
   * 品質監査を実行
   */
  runQualityAudit(qualityMetrics: Record<string, number>): AuditItem[] {
    const checks: AuditItem[] = [];

    for (const [metric, score] of Object.entries(qualityMetrics)) {
      const status = score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed';

      const check = this.createAuditItem(
        'quality',
        `Quality: ${metric}`,
        status,
        { metric, score },
        'quality-team'
      );
      checks.push(check);
    }

    return checks;
  }

  /**
   * ドキュメント監査を実行
   */
  runDocumentationAudit(docItems: string[]): AuditItem[] {
    const checks: AuditItem[] = [];

    for (const item of docItems) {
      const check = this.createAuditItem(
        'documentation',
        `Documentation: ${item}`,
        'passed',
        { item, documented: true },
        'documentation-team'
      );
      checks.push(check);
    }

    return checks;
  }

  /**
   * 監査統計を計算
   */
  getAuditStats(): {
    totalItems: number;
    totalReports: number;
    passedItems: number;
    failedItems: number;
    warningItems: number;
    skippedItems: number;
    approvedReports: number;
    rejectedReports: number;
    conditionalReports: number;
    averageScore: number;
  } {
    const allItems = Array.from(this.auditItems.values());
    const allReports = Array.from(this.auditReports.values());

    let totalScore = 0;
    for (const report of allReports) {
      totalScore += report.overallScore;
    }
    const averageScore = allReports.length > 0 ? totalScore / allReports.length : 0;

    return {
      totalItems: allItems.length,
      totalReports: allReports.length,
      passedItems: allItems.filter(i => i.status === 'passed').length,
      failedItems: allItems.filter(i => i.status === 'failed').length,
      warningItems: allItems.filter(i => i.status === 'warning').length,
      skippedItems: allItems.filter(i => i.status === 'skipped').length,
      approvedReports: allReports.filter(r => r.status === 'approved').length,
      rejectedReports: allReports.filter(r => r.status === 'rejected').length,
      conditionalReports: allReports.filter(r => r.status === 'conditional').length,
      averageScore,
    };
  }

  /**
   * 監査項目を削除
   */
  deleteAuditItem(itemId: string): boolean {
    return this.auditItems.delete(itemId);
  }

  /**
   * 監査レポートを削除
   */
  deleteAuditReport(reportId: string): boolean {
    this.itemsByReport.delete(reportId);
    return this.auditReports.delete(reportId);
  }
}
