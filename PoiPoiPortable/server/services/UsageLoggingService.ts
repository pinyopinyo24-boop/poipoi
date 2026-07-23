/**
 * Usage Logging Service
 * ユーザーの利用ログを記録・管理
 */

export interface UsageLog {
  id: string;
  userId: string;
  timestamp: number;
  userAction: string;
  feature: string;
  result: 'success' | 'failed' | 'partial';
  duration: number;
  metadata?: Record<string, any>;
  error?: string;
}

export interface UsageStats {
  totalActions: number;
  successRate: number;
  averageDuration: number;
  featureUsage: Map<string, number>;
  errorCount: number;
}

export class UsageLoggingService {
  private logs: Map<string, UsageLog[]> = new Map();
  private maxLogsPerUser = 10000;

  /**
   * ログを記録
   */
  recordLog(log: Omit<UsageLog, 'id'>): UsageLog {
    const logEntry: UsageLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      ...log,
    };

    if (!this.logs.has(log.userId)) {
      this.logs.set(log.userId, []);
    }

    const userLogs = this.logs.get(log.userId)!;
    userLogs.push(logEntry);

    // 古いログを削除
    if (userLogs.length > this.maxLogsPerUser) {
      userLogs.shift();
    }

    return logEntry;
  }

  /**
   * ユーザーのログを取得
   */
  getUserLogs(userId: string, limit: number = 100): UsageLog[] {
    const logs = this.logs.get(userId) || [];
    return logs.slice(-limit);
  }

  /**
   * 特定の機能のログを取得
   */
  getFeatureLogs(userId: string, feature: string): UsageLog[] {
    const logs = this.logs.get(userId) || [];
    return logs.filter(log => log.feature === feature);
  }

  /**
   * 統計情報を取得
   */
  getStats(userId: string): UsageStats {
    const logs = this.logs.get(userId) || [];

    if (logs.length === 0) {
      return {
        totalActions: 0,
        successRate: 0,
        averageDuration: 0,
        featureUsage: new Map(),
        errorCount: 0,
      };
    }

    const successCount = logs.filter(log => log.result === 'success').length;
    const totalDuration = logs.reduce((sum, log) => sum + log.duration, 0);
    const errorCount = logs.filter(log => log.error).length;

    const featureUsage = new Map<string, number>();
    logs.forEach(log => {
      featureUsage.set(log.feature, (featureUsage.get(log.feature) || 0) + 1);
    });

    return {
      totalActions: logs.length,
      successRate: (successCount / logs.length) * 100,
      averageDuration: totalDuration / logs.length,
      featureUsage,
      errorCount,
    };
  }

  /**
   * 日別統計を取得
   */
  getDailyStats(userId: string, days: number = 7): Record<string, UsageStats> {
    const logs = this.logs.get(userId) || [];
    const stats: Record<string, UsageStats> = {};

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = 0; i < days; i++) {
      const dayStart = now - (i + 1) * dayMs;
      const dayEnd = now - i * dayMs;
      const dateKey = new Date(dayStart).toISOString().split('T')[0];

      const dayLogs = logs.filter(log => log.timestamp >= dayStart && log.timestamp < dayEnd);

      if (dayLogs.length > 0) {
        const successCount = dayLogs.filter(log => log.result === 'success').length;
        const totalDuration = dayLogs.reduce((sum, log) => sum + log.duration, 0);
        const errorCount = dayLogs.filter(log => log.error).length;

        const featureUsage = new Map<string, number>();
        dayLogs.forEach(log => {
          featureUsage.set(log.feature, (featureUsage.get(log.feature) || 0) + 1);
        });

        stats[dateKey] = {
          totalActions: dayLogs.length,
          successRate: (successCount / dayLogs.length) * 100,
          averageDuration: totalDuration / dayLogs.length,
          featureUsage,
          errorCount,
        };
      }
    }

    return stats;
  }

  /**
   * エラーログを取得
   */
  getErrorLogs(userId: string, limit: number = 100): UsageLog[] {
    const logs = this.logs.get(userId) || [];
    return logs.filter(log => log.error).slice(-limit);
  }

  /**
   * ログをクリア
   */
  clearUserLogs(userId: string): void {
    this.logs.delete(userId);
  }

  /**
   * 古いログを削除
   */
  cleanupOldLogs(daysToKeep: number = 30): number {
    let deletedCount = 0;
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    this.logs.forEach((logs, userId) => {
      const initialLength = logs.length;
      const filtered = logs.filter(log => log.timestamp > cutoffTime);
      this.logs.set(userId, filtered);
      deletedCount += initialLength - filtered.length;
    });

    return deletedCount;
  }

  /**
   * 全体統計を取得
   */
  getGlobalStats(): {
    totalUsers: number;
    totalLogs: number;
    totalActions: number;
    averageSuccessRate: number;
  } {
    let totalLogs = 0;
    let totalActions = 0;
    let totalSuccessRate = 0;

    this.logs.forEach(logs => {
      totalLogs += logs.length;
      totalActions += logs.length;
      const successCount = logs.filter(log => log.result === 'success').length;
      totalSuccessRate += (successCount / logs.length) * 100;
    });

    const userCount = this.logs.size;
    const avgSuccessRate = userCount > 0 ? totalSuccessRate / userCount : 0;

    return {
      totalUsers: userCount,
      totalLogs,
      totalActions,
      averageSuccessRate: avgSuccessRate,
    };
  }

  /**
   * ログをエクスポート
   */
  exportLogs(userId: string): string {
    const logs = this.logs.get(userId) || [];
    return JSON.stringify(logs, null, 2);
  }

  /**
   * ログをインポート
   */
  importLogs(userId: string, jsonData: string): number {
    try {
      const logs = JSON.parse(jsonData) as UsageLog[];
      this.logs.set(userId, logs);
      return logs.length;
    } catch (e) {
      throw new Error('Invalid log data format');
    }
  }
}

// Singleton instance
export const usageLoggingService = new UsageLoggingService();
