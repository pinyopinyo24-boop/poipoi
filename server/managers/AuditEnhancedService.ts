/**
 * AuditEnhancedService - 拡張監査サービス
 * 
 * 機能:
 * - 監査ログ記録
 * - 監査履歴管理
 * - 監査トレース
 * - 監査統計
 */

export interface AuditLog {
  id: string;
  userId: number;
  action: string;
  resource: string;
  status: 'success' | 'failure';
  timestamp: number;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditTrail {
  userId: number;
  totalActions: number;
  successCount: number;
  failureCount: number;
  lastAction: number;
  firstAction: number;
  actionTypes: Map<string, number>;
}

export class AuditEnhancedService {
  private static instance: AuditEnhancedService;
  private logs: Map<number, AuditLog[]> = new Map();
  private logCounter: number = 0;

  private constructor() {}

  static getInstance(): AuditEnhancedService {
    if (!AuditEnhancedService.instance) {
      AuditEnhancedService.instance = new AuditEnhancedService();
    }
    return AuditEnhancedService.instance;
  }

  /**
   * 監査ログ記録
   */
  recordLog(
    userId: number,
    action: string,
    resource: string,
    status: 'success' | 'failure',
    details: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string
  ): AuditLog {
    const logId = `audit_${++this.logCounter}_${Date.now()}`;

    const log: AuditLog = {
      id: logId,
      userId,
      action,
      resource,
      status,
      timestamp: Date.now(),
      details,
      ipAddress,
      userAgent,
    };

    if (!this.logs.has(userId)) {
      this.logs.set(userId, []);
    }

    const userLogs = this.logs.get(userId);
    if (userLogs) {
      userLogs.push(log);
    }

    return log;
  }

  /**
   * 監査ログ取得
   */
  getLog(logId: string): AuditLog | null {
    let result: AuditLog | null = null;
    this.logs.forEach((logs: AuditLog[]) => {
      const log = logs.find((l: AuditLog) => l.id === logId);
      if (log) result = log;
    });
    return result;
  }

  /**
   * ユーザー監査ログ取得
   */
  getUserLogs(userId: number, limit: number = 100): AuditLog[] {
    const userLogs = this.logs.get(userId) || [];
    return userLogs.slice(-limit);
  }

  /**
   * 期間別ログ取得
   */
  getLogsByPeriod(
    userId: number,
    startTime: number,
    endTime: number
  ): AuditLog[] {
    const userLogs = this.logs.get(userId) || [];
    return userLogs.filter(
      (log: AuditLog) => log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  /**
   * アクション別ログ取得
   */
  getLogsByAction(userId: number, action: string): AuditLog[] {
    const userLogs = this.logs.get(userId) || [];
    return userLogs.filter((log: AuditLog) => log.action === action);
  }

  /**
   * 監査トレール取得
   */
  getAuditTrail(userId: number): AuditTrail {
    const userLogs = this.logs.get(userId) || [];
    const successCount = userLogs.filter((l: AuditLog) => l.status === 'success').length;
    const failureCount = userLogs.filter((l: AuditLog) => l.status === 'failure').length;

    const actionTypes = new Map<string, number>();
    userLogs.forEach((log: AuditLog) => {
      const count = actionTypes.get(log.action) || 0;
      actionTypes.set(log.action, count + 1);
    });

    const lastAction = userLogs.length > 0 ? userLogs[userLogs.length - 1].timestamp : 0;
    const firstAction = userLogs.length > 0 ? userLogs[0].timestamp : 0;

    return {
      userId,
      totalActions: userLogs.length,
      successCount,
      failureCount,
      lastAction,
      firstAction,
      actionTypes,
    };
  }

  /**
   * 監査統計取得
   */
  getAuditStats(userId: number): {
    totalLogs: number;
    successRate: number;
    failureRate: number;
    mostCommonAction: string;
    lastActionTime: number;
  } {
    const trail = this.getAuditTrail(userId);
    const successRate =
      trail.totalActions > 0 ? (trail.successCount / trail.totalActions) * 100 : 0;
    const failureRate =
      trail.totalActions > 0 ? (trail.failureCount / trail.totalActions) * 100 : 0;

    let mostCommonAction = '';
    let maxCount = 0;
    trail.actionTypes.forEach((count: number, action: string) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonAction = action;
      }
    });

    return {
      totalLogs: trail.totalActions,
      successRate,
      failureRate,
      mostCommonAction,
      lastActionTime: trail.lastAction,
    };
  }

  /**
   * 異常検知
   */
  detectAnomalies(userId: number): {
    hasAnomalies: boolean;
    anomalies: string[];
  } {
    const stats = this.getAuditStats(userId);
    const anomalies: string[] = [];

    if (stats.failureRate > 50) {
      anomalies.push('失敗率が高い');
    }

    const userLogs = this.logs.get(userId) || [];
    if (userLogs.length > 0) {
      const recentLogs = userLogs.slice(-10);
      const recentFailures = recentLogs.filter((l: AuditLog) => l.status === 'failure').length;
      if (recentFailures > 5) {
        anomalies.push('最近の失敗が多い');
      }
    }

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies,
    };
  }

  /**
   * ログエクスポート
   */
  exportLogs(userId: number): string {
    const userLogs = this.logs.get(userId) || [];
    const header = 'ID,User,Action,Resource,Status,Timestamp,Details\n';
    const rows = userLogs
      .map(
        (log: AuditLog) =>
          `${log.id},${log.userId},${log.action},${log.resource},${log.status},${log.timestamp},${JSON.stringify(log.details)}`
      )
      .join('\n');

    return header + rows;
  }

  /**
   * ログクリーンアップ
   */
  cleanup(userId?: number): void {
    if (userId) {
      this.logs.delete(userId);
    } else {
      this.logs.clear();
    }
  }
}

export const auditEnhancedService = AuditEnhancedService.getInstance();
export default auditEnhancedService;
