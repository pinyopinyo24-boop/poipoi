/**
 * BackupRestoreService - バックアップ・復元管理
 */

export type BackupType = 'full' | 'incremental' | 'differential';
export type RestoreStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Backup {
  id: string;
  userId: string;
  backupType: BackupType;
  timestamp: number;
  size: number;
  checksum: string;
  location: string;
  isEncrypted: boolean;
  retentionDays: number;
  expiresAt: number;
  metadata?: Record<string, any>;
}

export interface RestoreJob {
  id: string;
  userId: string;
  backupId: string;
  status: RestoreStatus;
  startedAt?: number;
  completedAt?: number;
  restoredItemCount: number;
  errorMessage?: string;
}

export class BackupRestoreService {
  private static instance: BackupRestoreService;
  private backups: Map<string, Backup> = new Map();
  private restoreJobs: Map<string, RestoreJob> = new Map();
  private backupCounter: number = 0;
  private jobCounter: number = 0;

  private constructor() {}

  static getInstance(): BackupRestoreService {
    if (!BackupRestoreService.instance) {
      BackupRestoreService.instance = new BackupRestoreService();
    }
    return BackupRestoreService.instance;
  }

  /**
   * バックアップ作成
   */
  createBackup(
    userId: string,
    backupType: BackupType,
    size: number,
    checksum: string,
    location: string,
    isEncrypted: boolean,
    retentionDays: number,
    metadata?: Record<string, any>
  ): Backup {
    const id = `backup_${++this.backupCounter}_${Date.now()}`;
    const expiresAt = Date.now() + retentionDays * 24 * 60 * 60 * 1000;

    const backup: Backup = {
      id,
      userId,
      backupType,
      timestamp: Date.now(),
      size,
      checksum,
      location,
      isEncrypted,
      retentionDays,
      expiresAt,
      metadata,
    };

    this.backups.set(id, backup);
    return backup;
  }

  /**
   * バックアップ取得
   */
  getBackup(backupId: string): Backup | null {
    return this.backups.get(backupId) || null;
  }

  /**
   * ユーザーのバックアップ取得
   */
  getUserBackups(userId: string, limit: number = 50): Backup[] {
    return Array.from(this.backups.values())
      .filter((b) => b.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * 最新バックアップ取得
   */
  getLatestBackup(userId: string): Backup | null {
    const backups = this.getUserBackups(userId, 1);
    return backups.length > 0 ? backups[0] : null;
  }

  /**
   * バックアップ検証
   */
  verifyBackup(backupId: string, checksum: string): boolean {
    const backup = this.backups.get(backupId);
    if (!backup) return false;

    return backup.checksum === checksum;
  }

  /**
   * バックアップ削除
   */
  deleteBackup(backupId: string): boolean {
    return this.backups.delete(backupId);
  }

  /**
   * 復元ジョブ作成
   */
  createRestoreJob(userId: string, backupId: string): RestoreJob {
    const id = `restore_${++this.jobCounter}_${Date.now()}`;

    const job: RestoreJob = {
      id,
      userId,
      backupId,
      status: 'pending',
      restoredItemCount: 0,
    };

    this.restoreJobs.set(id, job);
    return job;
  }

  /**
   * 復元ジョブ取得
   */
  getRestoreJob(jobId: string): RestoreJob | null {
    return this.restoreJobs.get(jobId) || null;
  }

  /**
   * ユーザーの復元ジョブ取得
   */
  getUserRestoreJobs(userId: string): RestoreJob[] {
    return Array.from(this.restoreJobs.values())
      .filter((j) => j.userId === userId)
      .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
  }

  /**
   * 復元ジョブ開始
   */
  startRestoreJob(jobId: string): RestoreJob | null {
    const job = this.restoreJobs.get(jobId);
    if (!job) return null;

    job.status = 'processing';
    job.startedAt = Date.now();
    return job;
  }

  /**
   * 復元ジョブ完了
   */
  completeRestoreJob(jobId: string, restoredItemCount: number): RestoreJob | null {
    const job = this.restoreJobs.get(jobId);
    if (!job) return null;

    job.status = 'completed';
    job.completedAt = Date.now();
    job.restoredItemCount = restoredItemCount;
    return job;
  }

  /**
   * 復元ジョブ失敗
   */
  failRestoreJob(jobId: string, errorMessage: string): RestoreJob | null {
    const job = this.restoreJobs.get(jobId);
    if (!job) return null;

    job.status = 'failed';
    job.errorMessage = errorMessage;
    return job;
  }

  /**
   * バックアップ統計
   */
  getBackupStatistics(): {
    totalBackups: number;
    totalSize: number;
    encryptedBackups: number;
    expiredBackups: number;
  } {
    const backups = Array.from(this.backups.values());
    const now = Date.now();

    return {
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, b) => sum + b.size, 0),
      encryptedBackups: backups.filter((b) => b.isEncrypted).length,
      expiredBackups: backups.filter((b) => b.expiresAt < now).length,
    };
  }

  /**
   * 復元統計
   */
  getRestoreStatistics(): {
    totalJobs: number;
    pendingJobs: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalRestoredItems: number;
  } {
    const jobs = Array.from(this.restoreJobs.values());

    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter((j) => j.status === 'pending').length,
      processingJobs: jobs.filter((j) => j.status === 'processing').length,
      completedJobs: jobs.filter((j) => j.status === 'completed').length,
      failedJobs: jobs.filter((j) => j.status === 'failed').length,
      totalRestoredItems: jobs.reduce((sum, j) => sum + j.restoredItemCount, 0),
    };
  }

  /**
   * 期限切れバックアップ削除
   */
  cleanupExpiredBackups(): number {
    const now = Date.now();
    const idsToDelete: string[] = [];

    this.backups.forEach((backup, id) => {
      if (backup.expiresAt < now) {
        idsToDelete.push(id);
      }
    });

    idsToDelete.forEach((id) => this.backups.delete(id));
    return idsToDelete.length;
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.backups.clear();
    this.restoreJobs.clear();
  }
}

export const backupRestoreService = BackupRestoreService.getInstance();
export default backupRestoreService;
