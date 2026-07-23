/**
 * CrashLogCollectionService - クラッシュログ収集機能
 */

export interface CrashLog {
  id: string;
  userId: string;
  deviceId: string;
  timestamp: number;
  appVersion: string;
  osVersion: string;
  errorMessage: string;
  stackTrace: string;
  breadcrumbs: string[];
  deviceInfo: {
    manufacturer: string;
    model: string;
    ramMB: number;
    storageMB: number;
    batteryLevel: number;
  };
  networkInfo: {
    type: string;
    isConnected: boolean;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'acknowledged' | 'investigating' | 'fixed' | 'wontfix';
  reportedAt: number;
  fixedVersion?: string;
}

export interface CrashStatistics {
  totalCrashes: number;
  criticalCrashes: number;
  affectedUsers: number;
  affectedDevices: number;
  topErrors: Array<{ error: string; count: number }>;
}

export class CrashLogCollectionService {
  private static instance: CrashLogCollectionService;
  private crashLogs: Map<string, CrashLog> = new Map();
  private crashCounter: number = 0;
  private maxLogsPerUser: number = 1000;
  private userCrashCounts: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): CrashLogCollectionService {
    if (!CrashLogCollectionService.instance) {
      CrashLogCollectionService.instance = new CrashLogCollectionService();
    }
    return CrashLogCollectionService.instance;
  }

  /**
   * クラッシュログ記録
   */
  recordCrash(
    userId: string,
    deviceId: string,
    appVersion: string,
    osVersion: string,
    errorMessage: string,
    stackTrace: string,
    breadcrumbs: string[],
    deviceInfo: CrashLog['deviceInfo'],
    networkInfo: CrashLog['networkInfo']
  ): CrashLog {
    const id = `crash_${++this.crashCounter}_${Date.now()}`;
    const severity = this.determineSeverity(errorMessage);

    const crashLog: CrashLog = {
      id,
      userId,
      deviceId,
      timestamp: Date.now(),
      appVersion,
      osVersion,
      errorMessage,
      stackTrace,
      breadcrumbs,
      deviceInfo,
      networkInfo,
      severity,
      status: 'new',
      reportedAt: Date.now(),
    };

    this.crashLogs.set(id, crashLog);

    // ユーザーごとのクラッシュ数追跡
    const userCount = (this.userCrashCounts.get(userId) || 0) + 1;
    this.userCrashCounts.set(userId, userCount);

    // ユーザーあたりのログ数制限
    if (userCount > this.maxLogsPerUser) {
      this.removeOldestCrashForUser(userId);
    }

    return crashLog;
  }

  /**
   * 重大度判定
   */
  private determineSeverity(errorMessage: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalKeywords = ['fatal', 'crash', 'segmentation', 'outofmemory', 'stackoverflow'];
    const highKeywords = ['error', 'exception', 'undefined', 'null'];

    const lowerMessage = errorMessage.toLowerCase();

    if (criticalKeywords.some((k) => lowerMessage.includes(k))) {
      return 'critical';
    }
    if (highKeywords.some((k) => lowerMessage.includes(k))) {
      return 'high';
    }

    return 'medium';
  }

  /**
   * ユーザーの最古のクラッシュを削除
   */
  private removeOldestCrashForUser(userId: string): void {
    let oldestId: string | null = null;
    let oldestTime = Date.now();

    for (const [id, log] of Array.from(this.crashLogs.entries())) {
      if (log.userId === userId && log.timestamp < oldestTime) {
        oldestId = id;
        oldestTime = log.timestamp;
      }
    }

    if (oldestId) {
      this.crashLogs.delete(oldestId);
    }
  }

  /**
   * クラッシュログ取得
   */
  getCrashLog(crashId: string): CrashLog | null {
    return this.crashLogs.get(crashId) || null;
  }

  /**
   * ユーザーのクラッシュログ取得
   */
  getUserCrashLogs(userId: string, limit: number = 50): CrashLog[] {
    return Array.from(this.crashLogs.values())
      .filter((log) => log.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * デバイスのクラッシュログ取得
   */
  getDeviceCrashLogs(deviceId: string, limit: number = 50): CrashLog[] {
    return Array.from(this.crashLogs.values())
      .filter((log) => log.deviceId === deviceId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * クラッシュステータス更新
   */
  updateCrashStatus(crashId: string, status: CrashLog['status'], fixedVersion?: string): CrashLog | null {
    const log = this.crashLogs.get(crashId);
    if (!log) return null;

    log.status = status;
    if (fixedVersion) {
      log.fixedVersion = fixedVersion;
    }

    return log;
  }

  /**
   * クラッシュ統計取得
   */
  getStatistics(): CrashStatistics {
    const logs = Array.from(this.crashLogs.values());
    const criticalCrashes = logs.filter((l) => l.severity === 'critical').length;
    const affectedUsers = new Set(logs.map((l) => l.userId)).size;
    const affectedDevices = new Set(logs.map((l) => l.deviceId)).size;

    // トップエラー取得
    const errorCounts: Map<string, number> = new Map();
    logs.forEach((log) => {
      const count = (errorCounts.get(log.errorMessage) || 0) + 1;
      errorCounts.set(log.errorMessage, count);
    });

    const topErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCrashes: logs.length,
      criticalCrashes,
      affectedUsers,
      affectedDevices,
      topErrors,
    };
  }

  /**
   * バージョン別クラッシュ統計
   */
  getCrashStatisticsByVersion(appVersion: string): {
    version: string;
    crashCount: number;
    affectedUsers: number;
  } {
    const logs = Array.from(this.crashLogs.values()).filter((l) => l.appVersion === appVersion);
    const affectedUsers = new Set(logs.map((l) => l.userId)).size;

    return {
      version: appVersion,
      crashCount: logs.length,
      affectedUsers,
    };
  }

  /**
   * クラッシュ削除
   */
  deleteCrash(crashId: string): boolean {
    const log = this.crashLogs.get(crashId);
    if (!log) return false;

    this.crashLogs.delete(crashId);
    const userCount = (this.userCrashCounts.get(log.userId) || 1) - 1;
    if (userCount > 0) {
      this.userCrashCounts.set(log.userId, userCount);
    } else {
      this.userCrashCounts.delete(log.userId);
    }

    return true;
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.crashLogs.clear();
    this.userCrashCounts.clear();
  }
}

export const crashLogCollectionService = CrashLogCollectionService.getInstance();
export default crashLogCollectionService;
