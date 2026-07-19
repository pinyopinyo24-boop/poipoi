/**
 * ReleaseReadinessService - リリース準備確認サービス
 */

export type ReadinessCategory = 'functionality' | 'performance' | 'security' | 'dataIntegrity' | 'documentation';

export interface ReadinessCheck {
  checkId: string;
  category: ReadinessCategory;
  checkName: string;
  status: 'pending' | 'passed' | 'failed' | 'warning';
  priority: 'critical' | 'high' | 'medium' | 'low';
  message?: string;
}

export interface ReleaseReadiness {
  readinessId: string;
  version: string;
  checks: ReadinessCheck[];
  status: 'pending' | 'checking' | 'ready' | 'notReady';
  startedAt?: number;
  completedAt?: number;
  readyForRelease: boolean;
}

export class ReleaseReadinessService {
  private static instance: ReleaseReadinessService;
  private readinessChecks: Map<string, ReleaseReadiness> = new Map();
  private readinessCounter: number = 0;
  private checkCounter: number = 0;

  private constructor() {}

  static getInstance(): ReleaseReadinessService {
    if (!ReleaseReadinessService.instance) {
      ReleaseReadinessService.instance = new ReleaseReadinessService();
    }
    return ReleaseReadinessService.instance;
  }

  /**
   * リリース準備確認開始
   */
  startReleaseReadinessCheck(version: string): ReleaseReadiness {
    const readinessId = `release_readiness_${++this.readinessCounter}_${Date.now()}`;

    const readiness: ReleaseReadiness = {
      readinessId,
      version,
      checks: [],
      status: 'checking',
      startedAt: Date.now(),
      readyForRelease: false,
    };

    this.readinessChecks.set(readinessId, readiness);
    return readiness;
  }

  /**
   * チェック追加
   */
  addReadinessCheck(
    readinessId: string,
    category: ReadinessCategory,
    checkName: string,
    priority: 'critical' | 'high' | 'medium' | 'low'
  ): ReadinessCheck | null {
    const readiness = this.readinessChecks.get(readinessId);
    if (!readiness) return null;

    const checkId = `check_${++this.checkCounter}_${Date.now()}`;
    const check: ReadinessCheck = {
      checkId,
      category,
      checkName,
      status: 'pending',
      priority,
    };

    readiness.checks.push(check);
    return check;
  }

  /**
   * チェック成功
   */
  passReadinessCheck(readinessId: string, checkId: string, message?: string): ReadinessCheck | null {
    const readiness = this.readinessChecks.get(readinessId);
    if (!readiness) return null;

    const check = readiness.checks.find((c) => c.checkId === checkId);
    if (!check) return null;

    check.status = 'passed';
    if (message) check.message = message;
    return check;
  }

  /**
   * チェック失敗
   */
  failReadinessCheck(readinessId: string, checkId: string, message: string): ReadinessCheck | null {
    const readiness = this.readinessChecks.get(readinessId);
    if (!readiness) return null;

    const check = readiness.checks.find((c) => c.checkId === checkId);
    if (!check) return null;

    check.status = 'failed';
    check.message = message;
    return check;
  }

  /**
   * チェック警告
   */
  warnReadinessCheck(readinessId: string, checkId: string, message: string): ReadinessCheck | null {
    const readiness = this.readinessChecks.get(readinessId);
    if (!readiness) return null;

    const check = readiness.checks.find((c) => c.checkId === checkId);
    if (!check) return null;

    check.status = 'warning';
    check.message = message;
    return check;
  }

  /**
   * リリース準備確認完了
   */
  completeReleaseReadinessCheck(readinessId: string): ReleaseReadiness | null {
    const readiness = this.readinessChecks.get(readinessId);
    if (!readiness) return null;

    readiness.completedAt = Date.now();

    // 失敗したチェックがあるか確認
    const failedChecks = readiness.checks.filter((c) => c.status === 'failed');
    const criticalFailures = readiness.checks.filter((c) => c.status === 'failed' && c.priority === 'critical');

    readiness.readyForRelease = failedChecks.length === 0 && criticalFailures.length === 0;
    readiness.status = readiness.readyForRelease ? 'ready' : 'notReady';

    return readiness;
  }

  /**
   * リリース準備取得
   */
  getReleaseReadiness(readinessId: string): ReleaseReadiness | null {
    return this.readinessChecks.get(readinessId) || null;
  }

  /**
   * リリース準備統計
   */
  getReleaseReadinessStatistics(readinessId: string): {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningChecks: number;
    criticalFailures: number;
    successRate: number;
    isReadyForRelease: boolean;
  } | null {
    const readiness = this.readinessChecks.get(readinessId);
    if (!readiness) return null;

    const passedChecks = readiness.checks.filter((c) => c.status === 'passed').length;
    const failedChecks = readiness.checks.filter((c) => c.status === 'failed').length;
    const warningChecks = readiness.checks.filter((c) => c.status === 'warning').length;
    const criticalFailures = readiness.checks.filter((c) => c.status === 'failed' && c.priority === 'critical').length;
    const totalChecks = readiness.checks.length;

    const successRate = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

    return {
      totalChecks,
      passedChecks,
      failedChecks,
      warningChecks,
      criticalFailures,
      successRate,
      isReadyForRelease: readiness.readyForRelease,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.readinessChecks.clear();
  }
}

export const releaseReadinessService = ReleaseReadinessService.getInstance();
export default releaseReadinessService;
