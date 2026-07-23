/**
 * BackupService - バックアップ管理
 * 
 * 機能:
 * - バックアップ作成
 * - バックアップ管理
 * - バージョン管理
 * - 自動バックアップ
 */

export interface Backup {
  id: string;
  userId: number;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  size: number;
  fileCount: number;
  createdAt: number;
  completedAt?: number;
  expiresAt: number;
  checksum: string;
  metadata: Record<string, any>;
}

export interface BackupConfig {
  autoBackupEnabled: boolean;
  backupInterval: number;
  retentionDays: number;
  maxBackups: number;
  compressionEnabled: boolean;
}

export class BackupService {
  private static instance: BackupService;
  private backups: Map<number, Backup[]> = new Map();
  private backupConfigs: Map<number, BackupConfig> = new Map();
  private readonly DEFAULT_RETENTION_DAYS = 30;
  private readonly DEFAULT_MAX_BACKUPS = 10;

  private constructor() {}

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * バックアップ設定初期化
   */
  initializeBackupConfig(userId: number): BackupConfig {
    const config: BackupConfig = {
      autoBackupEnabled: true,
      backupInterval: 86400000,
      retentionDays: this.DEFAULT_RETENTION_DAYS,
      maxBackups: this.DEFAULT_MAX_BACKUPS,
      compressionEnabled: true,
    };

    this.backupConfigs.set(userId, config);
    return config;
  }

  /**
   * バックアップ設定取得
   */
  getBackupConfig(userId: number): BackupConfig | null {
    return this.backupConfigs.get(userId) || null;
  }

  /**
   * バックアップ設定更新
   */
  updateBackupConfig(userId: number, config: Partial<BackupConfig>): BackupConfig | null {
    const current = this.backupConfigs.get(userId);
    if (!current) return null;

    const updated = { ...current, ...config };
    this.backupConfigs.set(userId, updated);
    return updated;
  }

  /**
   * バックアップ作成
   */
  async createBackup(
    userId: number,
    name: string,
    type: 'full' | 'incremental' | 'differential' = 'full'
  ): Promise<Backup | null> {
    try {
      const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();
      const config = this.backupConfigs.get(userId);
      const retentionMs = (config?.retentionDays || this.DEFAULT_RETENTION_DAYS) * 86400000;

      const backup: Backup = {
        id: backupId,
        userId,
        name,
        type,
        status: 'pending',
        size: 0,
        fileCount: 0,
        createdAt: now,
        expiresAt: now + retentionMs,
        checksum: '',
        metadata: {},
      };

      if (!this.backups.has(userId)) {
        this.backups.set(userId, []);
      }

      const userBackups = this.backups.get(userId);
      if (userBackups) {
        userBackups.push(backup);
      }

      return backup;
    } catch (error) {
      console.error('Failed to create backup:', error);
      return null;
    }
  }

  /**
   * バックアップ取得
   */
  getBackup(userId: number, backupId: string): Backup | null {
    const userBackups = this.backups.get(userId);
    if (!userBackups) return null;

    return userBackups.find(b => b.id === backupId) || null;
  }

  /**
   * ユーザーのバックアップ一覧取得
   */
  getUserBackups(userId: number): Backup[] {
    return this.backups.get(userId) || [];
  }

  /**
   * バックアップ状態更新
   */
  updateBackupStatus(
    userId: number,
    backupId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    metadata?: Record<string, any>
  ): Backup | null {
    const backup = this.getBackup(userId, backupId);
    if (!backup) return null;

    backup.status = status;
    if (status === 'completed') {
      backup.completedAt = Date.now();
    }
    if (metadata) {
      backup.metadata = { ...backup.metadata, ...metadata };
    }

    return backup;
  }

  /**
   * バックアップ削除
   */
  deleteBackup(userId: number, backupId: string): boolean {
    const userBackups = this.backups.get(userId);
    if (!userBackups) return false;

    const index = userBackups.findIndex(b => b.id === backupId);
    if (index === -1) return false;

    userBackups.splice(index, 1);
    return true;
  }

  /**
   * 期限切れバックアップ削除
   */
  cleanupExpiredBackups(userId: number): number {
    const userBackups = this.backups.get(userId);
    if (!userBackups) return 0;

    const now = Date.now();
    const beforeCount = userBackups.length;
    const filtered = userBackups.filter(b => b.expiresAt > now);
    this.backups.set(userId, filtered);

    return beforeCount - filtered.length;
  }

  /**
   * 古いバックアップ削除
   */
  removeOldBackups(userId: number): number {
    const userBackups = this.backups.get(userId);
    if (!userBackups) return 0;

    const config = this.backupConfigs.get(userId);
    const maxBackups = config?.maxBackups || this.DEFAULT_MAX_BACKUPS;

    if (userBackups.length <= maxBackups) return 0;

    const toRemove = userBackups.length - maxBackups;
    const sorted = [...userBackups].sort((a, b) => a.createdAt - b.createdAt);
    const toDelete = sorted.slice(0, toRemove);

    toDelete.forEach(backup => {
      this.deleteBackup(userId, backup.id);
    });

    return toRemove;
  }

  /**
   * バックアップサイズ計算
   */
  calculateBackupSize(userId: number): number {
    const userBackups = this.backups.get(userId) || [];
    return userBackups.reduce((total, backup) => total + backup.size, 0);
  }

  /**
   * バックアップ統計取得
   */
  getBackupStats(userId: number): {
    totalBackups: number;
    totalSize: number;
    completedBackups: number;
    failedBackups: number;
    lastBackupTime?: number;
  } | null {
    const userBackups = this.backups.get(userId);
    if (!userBackups) return null;

    const completed = userBackups.filter(b => b.status === 'completed');
    const failed = userBackups.filter(b => b.status === 'failed');
    const totalSize = this.calculateBackupSize(userId);
    const lastBackup = [...userBackups].sort((a, b) => b.createdAt - a.createdAt)[0];

    return {
      totalBackups: userBackups.length,
      totalSize,
      completedBackups: completed.length,
      failedBackups: failed.length,
      lastBackupTime: lastBackup?.createdAt,
    };
  }

  /**
   * 自動バックアップスケジュール
   */
  scheduleAutoBackup(userId: number): void {
    const config = this.backupConfigs.get(userId);
    if (!config || !config.autoBackupEnabled) return;

    const userBackups = this.backups.get(userId) || [];
    const lastBackup = [...userBackups]
      .filter(b => b.status === 'completed')
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    const now = Date.now();
    if (!lastBackup || now - lastBackup.createdAt >= config.backupInterval) {
      this.createBackup(userId, `Auto Backup ${new Date().toISOString()}`, 'incremental')
        .catch(error => {
          console.error('Auto backup failed:', error);
        });
    }
  }

  /**
   * すべてのユーザーの自動バックアップ
   */
  scheduleAllAutoBackups(): void {
    this.backupConfigs.forEach((config, userId) => {
      this.scheduleAutoBackup(userId);
    });
  }

  /**
   * クリーンアップ
   */
  cleanup(userId?: number): void {
    if (userId) {
      this.backups.delete(userId);
      this.backupConfigs.delete(userId);
    } else {
      this.backups.clear();
      this.backupConfigs.clear();
    }
  }
}

export const backupService = BackupService.getInstance();
export default backupService;
