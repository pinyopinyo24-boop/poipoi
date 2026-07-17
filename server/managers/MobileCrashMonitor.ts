/**
 * MobileCrashMonitor - モバイルクラッシュ監視
 */

export type CrashSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface CrashReport {
  crashId: string;
  deviceId: string;
  appVersion: string;
  osVersion: string;
  severity: CrashSeverity;
  timestamp: number;
  errorMessage: string;
  stackTrace: string;
  screenName?: string;
  userId?: string;
  resolved: boolean;
}

export class MobileCrashMonitor {
  private static instance: MobileCrashMonitor;
  private crashes: Map<string, CrashReport> = new Map();
  private crashCounter: number = 0;

  private constructor() {}

  static getInstance(): MobileCrashMonitor {
    if (!MobileCrashMonitor.instance) {
      MobileCrashMonitor.instance = new MobileCrashMonitor();
    }
    return MobileCrashMonitor.instance;
  }

  /**
   * クラッシュレポート記録
   */
  reportCrash(
    deviceId: string,
    appVersion: string,
    osVersion: string,
    errorMessage: string,
    stackTrace: string,
    screenName?: string,
    userId?: string
  ): CrashReport {
    const crashId = `crash_${++this.crashCounter}_${Date.now()}`;

    // 重大度判定
    let severity: CrashSeverity = 'low';
    if (
      errorMessage.includes('NullPointer') ||
      errorMessage.includes('OutOfMemory') ||
      errorMessage.includes('StackOverflow')
    ) {
      severity = 'critical';
    } else if (errorMessage.includes('Network') || errorMessage.includes('Timeout')) {
      severity = 'high';
    } else if (errorMessage.includes('Parse') || errorMessage.includes('Validation')) {
      severity = 'medium';
    }

    const crash: CrashReport = {
      crashId,
      deviceId,
      appVersion,
      osVersion,
      severity,
      timestamp: Date.now(),
      errorMessage,
      stackTrace,
      screenName,
      userId,
      resolved: false,
    };

    this.crashes.set(crashId, crash);
    return crash;
  }

  /**
   * クラッシュ取得
   */
  getCrash(crashId: string): CrashReport | null {
    return this.crashes.get(crashId) || null;
  }

  /**
   * デバイス別クラッシュ取得
   */
  getCrashesByDevice(deviceId: string): CrashReport[] {
    return Array.from(this.crashes.values()).filter((c) => c.deviceId === deviceId);
  }

  /**
   * 重大度別クラッシュ取得
   */
  getCrashesBySeverity(severity: CrashSeverity): CrashReport[] {
    return Array.from(this.crashes.values()).filter((c) => c.severity === severity);
  }

  /**
   * 未解決クラッシュ取得
   */
  getUnresolvedCrashes(): CrashReport[] {
    return Array.from(this.crashes.values()).filter((c) => !c.resolved);
  }

  /**
   * クラッシュ解決
   */
  resolveCrash(crashId: string): CrashReport | null {
    const crash = this.crashes.get(crashId);
    if (!crash) return null;

    crash.resolved = true;
    return crash;
  }

  /**
   * クラッシュ統計
   */
  getCrashStatistics(): {
    totalCrashes: number;
    criticalCrashes: number;
    highCrashes: number;
    mediumCrashes: number;
    lowCrashes: number;
    unresolvedCrashes: number;
    resolvedCrashes: number;
    crashRate: number;
  } {
    const crashArray = Array.from(this.crashes.values());

    return {
      totalCrashes: crashArray.length,
      criticalCrashes: crashArray.filter((c) => c.severity === 'critical').length,
      highCrashes: crashArray.filter((c) => c.severity === 'high').length,
      mediumCrashes: crashArray.filter((c) => c.severity === 'medium').length,
      lowCrashes: crashArray.filter((c) => c.severity === 'low').length,
      unresolvedCrashes: crashArray.filter((c) => !c.resolved).length,
      resolvedCrashes: crashArray.filter((c) => c.resolved).length,
      crashRate: crashArray.length > 0 ? (crashArray.filter((c) => !c.resolved).length / crashArray.length) * 100 : 0,
    };
  }

  /**
   * バージョン別クラッシュ統計
   */
  getCrashStatisticsByVersion(appVersion: string): {
    totalCrashes: number;
    criticalCrashes: number;
    unresolvedCrashes: number;
  } {
    const versionCrashes = Array.from(this.crashes.values()).filter((c) => c.appVersion === appVersion);

    return {
      totalCrashes: versionCrashes.length,
      criticalCrashes: versionCrashes.filter((c) => c.severity === 'critical').length,
      unresolvedCrashes: versionCrashes.filter((c) => !c.resolved).length,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.crashes.clear();
  }
}

export const mobileCrashMonitor = MobileCrashMonitor.getInstance();
export default mobileCrashMonitor;
