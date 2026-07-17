/**
 * DataManagementPanel - データ管理パネル
 * 
 * 機能:
 * - データベース管理
 * - バックアップ管理
 * - データ検証
 * - クリーンアップ
 */

export interface DatabaseStatus {
  name: string;
  size: number;
  tableCount: number;
  recordCount: number;
  lastBackup?: number;
  status: 'healthy' | 'warning' | 'error';
}

export interface BackupInfo {
  id: string;
  timestamp: number;
  size: number;
  status: 'completed' | 'failed' | 'in_progress';
  description: string;
}

export interface DataValidationResult {
  timestamp: number;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  validationRate: number;
  issues: string[];
}

export class DataManagementPanel {
  private static instance: DataManagementPanel;
  private databases: Map<string, DatabaseStatus> = new Map();
  private backups: BackupInfo[] = [];
  private validationResults: DataValidationResult[] = [];
  private backupCounter: number = 0;

  private constructor() {
    this.initializeDatabases();
  }

  static getInstance(): DataManagementPanel {
    if (!DataManagementPanel.instance) {
      DataManagementPanel.instance = new DataManagementPanel();
    }
    return DataManagementPanel.instance;
  }

  /**
   * データベース初期化
   */
  private initializeDatabases(): void {
    const databases = ['users', 'conversations', 'manufacturing', 'audit', 'compliance'];

    databases.forEach((db: string) => {
      this.databases.set(db, {
        name: db,
        size: 0,
        tableCount: 0,
        recordCount: 0,
        status: 'healthy',
      });
    });
  }

  /**
   * データベース状態更新
   */
  updateDatabaseStatus(
    name: string,
    size: number,
    tableCount: number,
    recordCount: number,
    status: 'healthy' | 'warning' | 'error'
  ): DatabaseStatus {
    const dbStatus: DatabaseStatus = {
      name,
      size,
      tableCount,
      recordCount,
      status,
    };

    this.databases.set(name, dbStatus);
    return dbStatus;
  }

  /**
   * データベース状態取得
   */
  getDatabaseStatus(name: string): DatabaseStatus | null {
    return this.databases.get(name) || null;
  }

  /**
   * すべてのデータベース状態取得
   */
  getAllDatabaseStatuses(): DatabaseStatus[] {
    return Array.from(this.databases.values());
  }

  /**
   * バックアップ作成
   */
  createBackup(description: string): BackupInfo {
    const backupId = `backup_${++this.backupCounter}_${Date.now()}`;

    const backup: BackupInfo = {
      id: backupId,
      timestamp: Date.now(),
      size: Math.random() * 1000000000, // ランダムサイズ
      status: 'completed',
      description,
    };

    this.backups.push(backup);

    // 最新100件のみ保持
    if (this.backups.length > 100) {
      this.backups.shift();
    }

    return backup;
  }

  /**
   * バックアップ取得
   */
  getBackup(backupId: string): BackupInfo | null {
    return this.backups.find((b: BackupInfo) => b.id === backupId) || null;
  }

  /**
   * すべてのバックアップ取得
   */
  getAllBackups(limit: number = 50): BackupInfo[] {
    const start = Math.max(0, this.backups.length - limit);
    return this.backups.slice(start);
  }

  /**
   * データ検証実行
   */
  validateData(totalRecords: number, validRecords: number): DataValidationResult {
    const invalidRecords = totalRecords - validRecords;
    const validationRate = totalRecords > 0 ? (validRecords / totalRecords) * 100 : 0;

    const issues: string[] = [];
    if (validationRate < 95) {
      issues.push('データ品質が低い');
    }
    if (invalidRecords > 100) {
      issues.push('無効なレコードが多い');
    }

    const result: DataValidationResult = {
      timestamp: Date.now(),
      totalRecords,
      validRecords,
      invalidRecords,
      validationRate,
      issues,
    };

    this.validationResults.push(result);

    // 最新1000件のみ保持
    if (this.validationResults.length > 1000) {
      this.validationResults.shift();
    }

    return result;
  }

  /**
   * 検証結果取得
   */
  getValidationResults(limit: number = 100): DataValidationResult[] {
    const start = Math.max(0, this.validationResults.length - limit);
    return this.validationResults.slice(start);
  }

  /**
   * 最新検証結果取得
   */
  getLatestValidationResult(): DataValidationResult | null {
    return this.validationResults.length > 0
      ? this.validationResults[this.validationResults.length - 1]
      : null;
  }

  /**
   * データベース統計取得
   */
  getDatabaseStatistics(): {
    totalSize: number;
    totalTables: number;
    totalRecords: number;
    healthyDatabases: number;
    warningDatabases: number;
    errorDatabases: number;
  } {
    const statuses = this.getAllDatabaseStatuses();

    const totalSize = statuses.reduce((sum: number, s: DatabaseStatus) => sum + s.size, 0);
    const totalTables = statuses.reduce((sum: number, s: DatabaseStatus) => sum + s.tableCount, 0);
    const totalRecords = statuses.reduce((sum: number, s: DatabaseStatus) => sum + s.recordCount, 0);
    const healthyCount = statuses.filter((s: DatabaseStatus) => s.status === 'healthy').length;
    const warningCount = statuses.filter((s: DatabaseStatus) => s.status === 'warning').length;
    const errorCount = statuses.filter((s: DatabaseStatus) => s.status === 'error').length;

    return {
      totalSize,
      totalTables,
      totalRecords,
      healthyDatabases: healthyCount,
      warningDatabases: warningCount,
      errorDatabases: errorCount,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.databases.clear();
    this.backups = [];
    this.validationResults = [];
  }
}

export const dataManagementPanel = DataManagementPanel.getInstance();
export default dataManagementPanel;
