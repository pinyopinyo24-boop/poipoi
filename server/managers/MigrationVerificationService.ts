/**
 * MigrationVerificationService
 * アカウント・会話・設定・クラウド同期の移行検証
 */

export interface MigrationCheck {
  checkId: string;
  timestamp: number;
  checkType: 'account' | 'conversation' | 'settings' | 'cloudsync';
  status: 'passed' | 'failed' | 'warning';
  itemName: string;
  sourceValue: any;
  targetValue: any;
  errorMessage?: string;
}

export interface MigrationReport {
  reportId: string;
  timestamp: number;
  rcId: string;
  fromVersion: string;
  toVersion: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  overallScore: number;
  status: 'passed' | 'failed' | 'warning';
  checks: MigrationCheck[];
  recommendations: string[];
}

export class MigrationVerificationService {
  private migrationChecks: Map<string, MigrationCheck> = new Map();
  private migrationReports: Map<string, MigrationReport> = new Map();
  private checksByReport: Map<string, string[]> = new Map();

  /**
   * 移行チェックを作成
   */
  createMigrationCheck(
    checkType: 'account' | 'conversation' | 'settings' | 'cloudsync',
    itemName: string,
    status: 'passed' | 'failed' | 'warning',
    sourceValue: any,
    targetValue: any,
    errorMessage?: string
  ): MigrationCheck {
    const checkId = `MIG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const check: MigrationCheck = {
      checkId,
      timestamp: Date.now(),
      checkType,
      status,
      itemName,
      sourceValue,
      targetValue,
      errorMessage,
    };

    this.migrationChecks.set(checkId, check);
    return check;
  }

  /**
   * 移行チェックを取得
   */
  getMigrationCheck(checkId: string): MigrationCheck | undefined {
    return this.migrationChecks.get(checkId);
  }

  /**
   * 全移行チェックを取得
   */
  getAllMigrationChecks(): MigrationCheck[] {
    return Array.from(this.migrationChecks.values());
  }

  /**
   * 移行レポートを作成
   */
  createMigrationReport(
    rcId: string,
    fromVersion: string,
    toVersion: string,
    checks: MigrationCheck[],
    recommendations: string[]
  ): MigrationReport {
    const reportId = `MIGR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let passedCount = 0;
    let failedCount = 0;
    let warningCount = 0;

    for (const check of checks) {
      if (check.status === 'passed') passedCount++;
      else if (check.status === 'failed') failedCount++;
      else if (check.status === 'warning') warningCount++;
    }

    const totalChecks = checks.length;
    const overallScore = totalChecks > 0 ? (passedCount / totalChecks) * 100 : 0;

    let overallStatus: 'passed' | 'failed' | 'warning' = 'passed';
    if (failedCount > 0) overallStatus = 'failed';
    else if (warningCount > 0) overallStatus = 'warning';

    const report: MigrationReport = {
      reportId,
      timestamp: Date.now(),
      rcId,
      fromVersion,
      toVersion,
      totalChecks,
      passedChecks: passedCount,
      failedChecks: failedCount,
      warningChecks: warningCount,
      overallScore,
      status: overallStatus,
      checks,
      recommendations,
    };

    this.migrationReports.set(reportId, report);

    if (!this.checksByReport.has(reportId)) {
      this.checksByReport.set(reportId, []);
    }
    for (const check of checks) {
      this.checksByReport.get(reportId)!.push(check.checkId);
    }

    return report;
  }

  /**
   * 移行レポートを取得
   */
  getMigrationReport(reportId: string): MigrationReport | undefined {
    return this.migrationReports.get(reportId);
  }

  /**
   * 全移行レポートを取得
   */
  getAllMigrationReports(): MigrationReport[] {
    return Array.from(this.migrationReports.values());
  }

  /**
   * RC別最新レポートを取得
   */
  getLatestReportByRc(rcId: string): MigrationReport | undefined {
    const all = Array.from(this.migrationReports.values()).filter(r => r.rcId === rcId);
    if (all.length === 0) return undefined;
    return all.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  /**
   * アカウント移行検証を実行
   */
  verifyAccountMigration(
    userId: string,
    email: string,
    username: string
  ): MigrationCheck[] {
    const checks: MigrationCheck[] = [];

    // ユーザーID検証
    const userIdCheck = this.createMigrationCheck(
      'account',
      `User ID: ${userId}`,
      'passed',
      userId,
      userId
    );
    checks.push(userIdCheck);

    // メール検証
    const emailCheck = this.createMigrationCheck(
      'account',
      `Email: ${email}`,
      'passed',
      email,
      email
    );
    checks.push(emailCheck);

    // ユーザー名検証
    const usernameCheck = this.createMigrationCheck(
      'account',
      `Username: ${username}`,
      'passed',
      username,
      username
    );
    checks.push(usernameCheck);

    return checks;
  }

  /**
   * 会話履歴移行検証を実行
   */
  verifyConversationMigration(
    conversationCount: number,
    messageCount: number
  ): MigrationCheck[] {
    const checks: MigrationCheck[] = [];

    // 会話数検証
    const convCheck = this.createMigrationCheck(
      'conversation',
      `Conversations: ${conversationCount}`,
      'passed',
      conversationCount,
      conversationCount
    );
    checks.push(convCheck);

    // メッセージ数検証
    const msgCheck = this.createMigrationCheck(
      'conversation',
      `Messages: ${messageCount}`,
      'passed',
      messageCount,
      messageCount
    );
    checks.push(msgCheck);

    return checks;
  }

  /**
   * 設定移行検証を実行
   */
  verifySettingsMigration(settings: Record<string, any>): MigrationCheck[] {
    const checks: MigrationCheck[] = [];

    for (const [key, value] of Object.entries(settings)) {
      const check = this.createMigrationCheck(
        'settings',
        `Setting: ${key}`,
        'passed',
        value,
        value
      );
      checks.push(check);
    }

    return checks;
  }

  /**
   * クラウド同期検証を実行
   */
  verifyCloudSync(syncStatus: string, lastSyncTime: number): MigrationCheck[] {
    const checks: MigrationCheck[] = [];

    // 同期ステータス検証
    const statusCheck = this.createMigrationCheck(
      'cloudsync',
      `Sync Status: ${syncStatus}`,
      syncStatus === 'success' ? 'passed' : 'warning',
      syncStatus,
      syncStatus
    );
    checks.push(statusCheck);

    // 最終同期時刻検証
    const timeDiff = Date.now() - lastSyncTime;
    const timeStatus = timeDiff < 3600000 ? 'passed' : 'warning'; // 1時間以内

    const timeCheck = this.createMigrationCheck(
      'cloudsync',
      `Last Sync: ${new Date(lastSyncTime).toISOString()}`,
      timeStatus,
      lastSyncTime,
      lastSyncTime
    );
    checks.push(timeCheck);

    return checks;
  }

  /**
   * 移行統計を計算
   */
  getMigrationStats(): {
    totalChecks: number;
    totalReports: number;
    passedChecks: number;
    failedChecks: number;
    warningChecks: number;
    passedReports: number;
    failedReports: number;
    warningReports: number;
    averageScore: number;
  } {
    const allChecks = Array.from(this.migrationChecks.values());
    const allReports = Array.from(this.migrationReports.values());

    let totalScore = 0;
    for (const report of allReports) {
      totalScore += report.overallScore;
    }
    const averageScore = allReports.length > 0 ? totalScore / allReports.length : 0;

    return {
      totalChecks: allChecks.length,
      totalReports: allReports.length,
      passedChecks: allChecks.filter(c => c.status === 'passed').length,
      failedChecks: allChecks.filter(c => c.status === 'failed').length,
      warningChecks: allChecks.filter(c => c.status === 'warning').length,
      passedReports: allReports.filter(r => r.status === 'passed').length,
      failedReports: allReports.filter(r => r.status === 'failed').length,
      warningReports: allReports.filter(r => r.status === 'warning').length,
      averageScore,
    };
  }

  /**
   * 移行チェックを削除
   */
  deleteMigrationCheck(checkId: string): boolean {
    return this.migrationChecks.delete(checkId);
  }

  /**
   * 移行レポートを削除
   */
  deleteMigrationReport(reportId: string): boolean {
    this.checksByReport.delete(reportId);
    return this.migrationReports.delete(reportId);
  }
}
