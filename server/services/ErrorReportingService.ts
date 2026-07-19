/**
 * Error Reporting Service
 * エラーレポートとクラッシュ追跡
 */

export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ErrorCategory = 'api' | 'network' | 'validation' | 'crash' | 'unknown';

export interface ErrorReport {
  id: string;
  userId: string;
  timestamp: number;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userAgent?: string;
  url?: string;
  resolved: boolean;
  resolutionNotes?: string;
}

export interface ErrorStats {
  totalErrors: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  unresolvedCount: number;
  categoryBreakdown: Map<ErrorCategory, number>;
}

export class ErrorReportingService {
  private reports: Map<string, ErrorReport[]> = new Map();
  private maxReportsPerUser = 5000;

  /**
   * エラーレポートを記録
   */
  reportError(report: Omit<ErrorReport, 'id' | 'resolved'>): ErrorReport {
    const errorReport: ErrorReport = {
      id: `error-${Date.now()}-${Math.random()}`,
      ...report,
      resolved: false,
    };

    if (!this.reports.has(report.userId)) {
      this.reports.set(report.userId, []);
    }

    const userReports = this.reports.get(report.userId)!;
    userReports.push(errorReport);

    // 古いレポートを削除
    if (userReports.length > this.maxReportsPerUser) {
      userReports.shift();
    }

    return errorReport;
  }

  /**
   * ユーザーのエラーレポートを取得
   */
  getUserErrors(userId: string, limit: number = 100): ErrorReport[] {
    const reports = this.reports.get(userId) || [];
    return reports.slice(-limit);
  }

  /**
   * 未解決のエラーを取得
   */
  getUnresolvedErrors(userId: string): ErrorReport[] {
    const reports = this.reports.get(userId) || [];
    return reports.filter(report => !report.resolved);
  }

  /**
   * 特定のカテゴリのエラーを取得
   */
  getErrorsByCategory(userId: string, category: ErrorCategory): ErrorReport[] {
    const reports = this.reports.get(userId) || [];
    return reports.filter(report => report.category === category);
  }

  /**
   * 特定の重大度のエラーを取得
   */
  getErrorsBySeverity(userId: string, severity: ErrorSeverity): ErrorReport[] {
    const reports = this.reports.get(userId) || [];
    return reports.filter(report => report.severity === severity);
  }

  /**
   * エラーを解決済みにマーク
   */
  resolveError(userId: string, errorId: string, notes?: string): ErrorReport | null {
    const reports = this.reports.get(userId);
    if (!reports) return null;

    const report = reports.find(r => r.id === errorId);
    if (report) {
      report.resolved = true;
      report.resolutionNotes = notes;
    }

    return report || null;
  }

  /**
   * 統計情報を取得
   */
  getStats(userId: string): ErrorStats {
    const reports = this.reports.get(userId) || [];

    const stats: ErrorStats = {
      totalErrors: reports.length,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      unresolvedCount: 0,
      categoryBreakdown: new Map(),
    };

    reports.forEach(report => {
      if (!report.resolved) {
        stats.unresolvedCount++;
      }

      switch (report.severity) {
        case 'critical':
          stats.criticalCount++;
          break;
        case 'high':
          stats.highCount++;
          break;
        case 'medium':
          stats.mediumCount++;
          break;
        case 'low':
          stats.lowCount++;
          break;
      }

      const categoryCount = stats.categoryBreakdown.get(report.category) || 0;
      stats.categoryBreakdown.set(report.category, categoryCount + 1);
    });

    return stats;
  }

  /**
   * 日別エラー統計を取得
   */
  getDailyStats(userId: string, days: number = 7): Record<string, ErrorStats> {
    const reports = this.reports.get(userId) || [];
    const stats: Record<string, ErrorStats> = {};

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = 0; i < days; i++) {
      const dayStart = now - (i + 1) * dayMs;
      const dayEnd = now - i * dayMs;
      const dateKey = new Date(dayStart).toISOString().split('T')[0];

      const dayReports = reports.filter(
        report => report.timestamp >= dayStart && report.timestamp < dayEnd
      );

      if (dayReports.length > 0) {
        const dayStats: ErrorStats = {
          totalErrors: dayReports.length,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          unresolvedCount: 0,
          categoryBreakdown: new Map(),
        };

        dayReports.forEach(report => {
          if (!report.resolved) {
            dayStats.unresolvedCount++;
          }

          switch (report.severity) {
            case 'critical':
              dayStats.criticalCount++;
              break;
            case 'high':
              dayStats.highCount++;
              break;
            case 'medium':
              dayStats.mediumCount++;
              break;
            case 'low':
              dayStats.lowCount++;
              break;
          }

          const categoryCount = dayStats.categoryBreakdown.get(report.category) || 0;
          dayStats.categoryBreakdown.set(report.category, categoryCount + 1);
        });

        stats[dateKey] = dayStats;
      }
    }

    return stats;
  }

  /**
   * クラッシュレポートを取得
   */
  getCrashReports(userId: string): ErrorReport[] {
    const reports = this.reports.get(userId) || [];
    return reports.filter(report => report.category === 'crash');
  }

  /**
   * 重大なエラーを取得
   */
  getCriticalErrors(userId: string): ErrorReport[] {
    const reports = this.reports.get(userId) || [];
    return reports.filter(report => report.severity === 'critical' && !report.resolved);
  }

  /**
   * エラーをクリア
   */
  clearUserErrors(userId: string): void {
    this.reports.delete(userId);
  }

  /**
   * 古いエラーレポートを削除
   */
  cleanupOldReports(daysToKeep: number = 30): number {
    let deletedCount = 0;
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    this.reports.forEach((reports, userId) => {
      const initialLength = reports.length;
      const filtered = reports.filter(report => report.timestamp > cutoffTime);
      this.reports.set(userId, filtered);
      deletedCount += initialLength - filtered.length;
    });

    return deletedCount;
  }

  /**
   * 全体統計を取得
   */
  getGlobalStats(): {
    totalUsers: number;
    totalErrors: number;
    criticalCount: number;
    unresolvedCount: number;
    averageErrorsPerUser: number;
  } {
    let totalErrors = 0;
    let criticalCount = 0;
    let unresolvedCount = 0;

    this.reports.forEach(reports => {
      totalErrors += reports.length;
      criticalCount += reports.filter(r => r.severity === 'critical').length;
      unresolvedCount += reports.filter(r => !r.resolved).length;
    });

    const userCount = this.reports.size;

    return {
      totalUsers: userCount,
      totalErrors,
      criticalCount,
      unresolvedCount,
      averageErrorsPerUser: userCount > 0 ? totalErrors / userCount : 0,
    };
  }

  /**
   * エラーレポートをエクスポート
   */
  exportReports(userId: string): string {
    const reports = this.reports.get(userId) || [];
    return JSON.stringify(reports, null, 2);
  }

  /**
   * エラーレポートをインポート
   */
  importReports(userId: string, jsonData: string): number {
    try {
      const reports = JSON.parse(jsonData) as ErrorReport[];
      this.reports.set(userId, reports);
      return reports.length;
    } catch (e) {
      throw new Error('Invalid error report data format');
    }
  }

  /**
   * エラーパターンを分析
   */
  analyzeErrorPatterns(userId: string): {
    mostCommonError: string | null;
    errorFrequency: Map<string, number>;
    topCategories: ErrorCategory[];
  } {
    const reports = this.reports.get(userId) || [];
    const errorFrequency = new Map<string, number>();
    const categoryCount = new Map<ErrorCategory, number>();

    reports.forEach(report => {
      const count = errorFrequency.get(report.message) || 0;
      errorFrequency.set(report.message, count + 1);

      const catCount = categoryCount.get(report.category) || 0;
      categoryCount.set(report.category, catCount + 1);
    });

    let mostCommonError: string | null = null;
    let maxCount = 0;

    errorFrequency.forEach((count, message) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonError = message;
      }
    });

    const topCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category);

    return {
      mostCommonError,
      errorFrequency,
      topCategories,
    };
  }
}

// Singleton instance
export const errorReportingService = new ErrorReportingService();
