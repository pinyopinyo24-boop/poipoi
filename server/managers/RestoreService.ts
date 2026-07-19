/**
 * RestoreService - 復元管理
 * 
 * 機能:
 * - バックアップから復元
 * - 復元状態管理
 * - 復元履歴
 * - 復元検証
 */

export interface RestoreJob {
  id: string;
  userId: number;
  backupId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  startedAt: number;
  completedAt?: number;
  restoredItems: number;
  failedItems: number;
  error?: string;
  metadata: Record<string, any>;
}

export interface RestoreConfig {
  verifyChecksum: boolean;
  preserveTimestamps: boolean;
  overwriteExisting: boolean;
  maxConcurrentRestores: number;
}

export class RestoreService {
  private static instance: RestoreService;
  private restoreJobs: Map<number, RestoreJob[]> = new Map();
  private restoreConfigs: Map<number, RestoreConfig> = new Map();
  private activeRestores: Set<string> = new Set();

  private constructor() {}

  static getInstance(): RestoreService {
    if (!RestoreService.instance) {
      RestoreService.instance = new RestoreService();
    }
    return RestoreService.instance;
  }

  /**
   * 復元設定初期化
   */
  initializeRestoreConfig(userId: number): RestoreConfig {
    const config: RestoreConfig = {
      verifyChecksum: true,
      preserveTimestamps: true,
      overwriteExisting: false,
      maxConcurrentRestores: 3,
    };

    this.restoreConfigs.set(userId, config);
    return config;
  }

  /**
   * 復元設定取得
   */
  getRestoreConfig(userId: number): RestoreConfig | null {
    return this.restoreConfigs.get(userId) || null;
  }

  /**
   * 復元設定更新
   */
  updateRestoreConfig(userId: number, config: Partial<RestoreConfig>): RestoreConfig | null {
    const current = this.restoreConfigs.get(userId);
    if (!current) return null;

    const updated = { ...current, ...config };
    this.restoreConfigs.set(userId, updated);
    return updated;
  }

  /**
   * 復元ジョブ作成
   */
  async createRestoreJob(userId: number, backupId: string): Promise<RestoreJob | null> {
    try {
      const config = this.restoreConfigs.get(userId);
      if (!config) return null;

      // 同時復元数チェック
      const activeCount = this.getActiveRestoreCount(userId);
      if (activeCount >= config.maxConcurrentRestores) {
        return null;
      }

      const jobId = `restore_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();

      const job: RestoreJob = {
        id: jobId,
        userId,
        backupId,
        status: 'pending',
        progress: 0,
        startedAt: now,
        restoredItems: 0,
        failedItems: 0,
        metadata: {},
      };

      if (!this.restoreJobs.has(userId)) {
        this.restoreJobs.set(userId, []);
      }

      const userJobs = this.restoreJobs.get(userId);
      if (userJobs) {
        userJobs.push(job);
      }

      this.activeRestores.add(jobId);
      return job;
    } catch (error) {
      console.error('Failed to create restore job:', error);
      return null;
    }
  }

  /**
   * 復元ジョブ取得
   */
  getRestoreJob(userId: number, jobId: string): RestoreJob | null {
    const userJobs = this.restoreJobs.get(userId);
    if (!userJobs) return null;

    return userJobs.find(j => j.id === jobId) || null;
  }

  /**
   * ユーザーの復元ジョブ一覧取得
   */
  getUserRestoreJobs(userId: number): RestoreJob[] {
    return this.restoreJobs.get(userId) || [];
  }

  /**
   * 復元ジョブ状態更新
   */
  updateRestoreJobStatus(
    userId: number,
    jobId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    progress?: number,
    metadata?: Record<string, any>
  ): RestoreJob | null {
    const job = this.getRestoreJob(userId, jobId);
    if (!job) return null;

    job.status = status;
    if (progress !== undefined) {
      job.progress = Math.min(100, Math.max(0, progress));
    }
    if (status === 'completed' || status === 'failed') {
      job.completedAt = Date.now();
      this.activeRestores.delete(jobId);
    }
    if (metadata) {
      job.metadata = { ...job.metadata, ...metadata };
    }

    return job;
  }

  /**
   * 復元進捗更新
   */
  updateRestoreProgress(
    userId: number,
    jobId: string,
    restoredItems: number,
    failedItems: number
  ): RestoreJob | null {
    const job = this.getRestoreJob(userId, jobId);
    if (!job) return null;

    job.restoredItems = restoredItems;
    job.failedItems = failedItems;
    const total = restoredItems + failedItems;
    if (total > 0) {
      job.progress = Math.round((restoredItems / total) * 100);
    }

    return job;
  }

  /**
   * 復元キャンセル
   */
  cancelRestore(userId: number, jobId: string): boolean {
    const job = this.getRestoreJob(userId, jobId);
    if (!job) return false;

    if (job.status === 'in_progress') {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      job.completedAt = Date.now();
      this.activeRestores.delete(jobId);
      return true;
    }

    return false;
  }

  /**
   * 復元実行
   */
  async executeRestore(userId: number, jobId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const job = this.getRestoreJob(userId, jobId);
      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      if (job.status !== 'pending') {
        return { success: false, error: 'Job already started' };
      }

      this.updateRestoreJobStatus(userId, jobId, 'in_progress', 0);

      // 復元処理の実装
      await new Promise(resolve => setTimeout(resolve, 100));

      this.updateRestoreJobStatus(userId, jobId, 'completed', 100);
      return { success: true };
    } catch (error) {
      const errorMsg = String(error);
      this.updateRestoreJobStatus(userId, jobId, 'failed', 0, { error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 復元検証
   */
  async verifyRestore(userId: number, jobId: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    try {
      const job = this.getRestoreJob(userId, jobId);
      if (!job) {
        return { isValid: false, errors: ['Job not found'] };
      }

      const errors: string[] = [];

      if (job.status !== 'completed') {
        errors.push('Restore job not completed');
      }

      if (job.failedItems > 0) {
        errors.push(`${job.failedItems} items failed to restore`);
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return { isValid: false, errors: [String(error)] };
    }
  }

  /**
   * 復元統計取得
   */
  getRestoreStats(userId: number): {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    activeJobs: number;
    totalRestoredItems: number;
  } | null {
    const userJobs = this.restoreJobs.get(userId);
    if (!userJobs) return null;

    const completed = userJobs.filter(j => j.status === 'completed');
    const failed = userJobs.filter(j => j.status === 'failed');
    const active = userJobs.filter(j => j.status === 'in_progress');
    const totalRestored = completed.reduce((sum, j) => sum + j.restoredItems, 0);

    return {
      totalJobs: userJobs.length,
      completedJobs: completed.length,
      failedJobs: failed.length,
      activeJobs: active.length,
      totalRestoredItems: totalRestored,
    };
  }

  /**
   * 同時復元数取得
   */
  getActiveRestoreCount(userId: number): number {
    const userJobs = this.restoreJobs.get(userId) || [];
    return userJobs.filter(j => j.status === 'in_progress').length;
  }

  /**
   * 復元履歴取得
   */
  getRestoreHistory(userId: number, limit: number = 50): RestoreJob[] {
    const userJobs = this.restoreJobs.get(userId) || [];
    return userJobs.slice(-limit);
  }

  /**
   * 復元クリーンアップ
   */
  cleanupOldRestores(userId: number, daysOld: number = 30): number {
    const userJobs = this.restoreJobs.get(userId);
    if (!userJobs) return 0;

    const now = Date.now();
    const cutoffTime = now - daysOld * 86400000;
    const beforeCount = userJobs.length;

    const filtered = userJobs.filter(j => {
      if (!j.completedAt) return true;
      return j.completedAt > cutoffTime;
    });

    this.restoreJobs.set(userId, filtered);
    return beforeCount - filtered.length;
  }

  /**
   * クリーンアップ
   */
  cleanup(userId?: number): void {
    if (userId) {
      this.restoreJobs.delete(userId);
      this.restoreConfigs.delete(userId);
    } else {
      this.restoreJobs.clear();
      this.restoreConfigs.clear();
    }
    this.activeRestores.clear();
  }
}

export const restoreService = RestoreService.getInstance();
export default restoreService;
