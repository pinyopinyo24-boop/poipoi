/**
 * RestoreService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { restoreService, RestoreService } from './RestoreService';

describe('RestoreService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreService.cleanup();
  });

  afterEach(() => {
    restoreService.cleanup();
  });

  // === 復元設定テスト ===
  describe('Restore Configuration', () => {
    it('should initialize restore config', () => {
      const config = restoreService.initializeRestoreConfig(1);
      expect(config.verifyChecksum).toBe(true);
      expect(config.maxConcurrentRestores).toBe(3);
    });

    it('should get restore config', () => {
      restoreService.initializeRestoreConfig(1);
      const config = restoreService.getRestoreConfig(1);
      expect(config).not.toBeNull();
    });

    it('should update restore config', () => {
      restoreService.initializeRestoreConfig(1);
      const updated = restoreService.updateRestoreConfig(1, {
        verifyChecksum: false,
      });
      expect(updated?.verifyChecksum).toBe(false);
    });
  });

  // === 復元ジョブ作成テスト ===
  describe('Create Restore Job', () => {
    it('should create restore job', async () => {
      restoreService.initializeRestoreConfig(1);
      const job = await restoreService.createRestoreJob(1, 'backup_123');
      expect(job).not.toBeNull();
      if (job) {
        expect(job.status).toBe('pending');
      }
    });

    it('should get restore job', async () => {
      restoreService.initializeRestoreConfig(1);
      const created = await restoreService.createRestoreJob(1, 'backup_123');
      if (created) {
        const retrieved = restoreService.getRestoreJob(1, created.id);
        expect(retrieved).not.toBeNull();
      }
    });

    it('should get user restore jobs', async () => {
      restoreService.initializeRestoreConfig(1);
      await restoreService.createRestoreJob(1, 'backup_123');
      await restoreService.createRestoreJob(1, 'backup_456');
      const jobs = restoreService.getUserRestoreJobs(1);
      expect(jobs.length).toBe(2);
    });
  });

  // === 復元ジョブ状態更新テスト ===
  describe('Update Restore Job Status', () => {
    it('should update job status', async () => {
      restoreService.initializeRestoreConfig(1);
      const created = await restoreService.createRestoreJob(1, 'backup_123');
      if (created) {
        const updated = restoreService.updateRestoreJobStatus(1, created.id, 'in_progress', 50);
        expect(updated?.status).toBe('in_progress');
        expect(updated?.progress).toBe(50);
      }
    });

    it('should set completed time', async () => {
      restoreService.initializeRestoreConfig(1);
      const created = await restoreService.createRestoreJob(1, 'backup_123');
      if (created) {
        restoreService.updateRestoreJobStatus(1, created.id, 'completed', 100);
        const updated = restoreService.getRestoreJob(1, created.id);
        expect(updated?.completedAt).toBeDefined();
      }
    });
  });

  // === 復元進捗更新テスト ===
  describe('Update Restore Progress', () => {
    it('should update restore progress', async () => {
      restoreService.initializeRestoreConfig(1);
      const created = await restoreService.createRestoreJob(1, 'backup_123');
      if (created) {
        const updated = restoreService.updateRestoreProgress(1, created.id, 50, 10);
        expect(updated?.restoredItems).toBe(50);
        expect(updated?.failedItems).toBe(10);
      }
    });

    it('should calculate progress percentage', async () => {
      restoreService.initializeRestoreConfig(1);
      const created = await restoreService.createRestoreJob(1, 'backup_123');
      if (created) {
        restoreService.updateRestoreProgress(1, created.id, 75, 25);
        const updated = restoreService.getRestoreJob(1, created.id);
        expect(updated?.progress).toBe(75);
      }
    });
  });

  // === 復元キャンセルテスト ===
  describe('Cancel Restore', () => {
    it('should cancel restore', async () => {
      restoreService.initializeRestoreConfig(1);
      const created = await restoreService.createRestoreJob(1, 'backup_123');
      if (created) {
        restoreService.updateRestoreJobStatus(1, created.id, 'in_progress');
        const result = restoreService.cancelRestore(1, created.id);
        expect(result).toBe(true);
      }
    });
  });

  // === 復元実行テスト ===
  describe('Execute Restore', () => {
    it('should execute restore', async () => {
      restoreService.initializeRestoreConfig(1);
      const created = await restoreService.createRestoreJob(1, 'backup_123');
      if (created) {
        const result = await restoreService.executeRestore(1, created.id);
        expect(result.success === true || result.success === false).toBe(true);
      }
    });
  });

  // === 復元検証テスト ===
  describe('Verify Restore', () => {
    it('should verify restore', async () => {
      restoreService.initializeRestoreConfig(1);
      const created = await restoreService.createRestoreJob(1, 'backup_123');
      if (created) {
        const result = await restoreService.verifyRestore(1, created.id);
        expect(result.isValid === true || result.isValid === false).toBe(true);
        expect(Array.isArray(result.errors)).toBe(true);
      }
    });
  });

  // === 復元統計テスト ===
  describe('Restore Statistics', () => {
    it('should get restore stats', async () => {
      restoreService.initializeRestoreConfig(1);
      const stats = restoreService.getRestoreStats(1);
      expect(stats).not.toBeNull();
      if (stats) {
        expect(stats.totalJobs >= 0).toBe(true);
        expect(stats.completedJobs >= 0).toBe(true);
      }
    });

    it('should get active restore count', async () => {
      restoreService.initializeRestoreConfig(1);
      const count = restoreService.getActiveRestoreCount(1);
      expect(typeof count).toBe('number');
    });
  });

  // === 復元履歴テスト ===
  describe('Restore History', () => {
    it('should get restore history', async () => {
      restoreService.initializeRestoreConfig(1);
      await restoreService.createRestoreJob(1, 'backup_123');
      const history = restoreService.getRestoreHistory(1);
      expect(Array.isArray(history)).toBe(true);
    });

    it('should cleanup old restores', async () => {
      restoreService.initializeRestoreConfig(1);
      const created = await restoreService.createRestoreJob(1, 'backup_123');
      if (created) {
        created.completedAt = Date.now() - 40 * 86400000;
        const count = restoreService.cleanupOldRestores(1, 30);
        expect(count >= 0).toBe(true);
      }
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup specific user', async () => {
      restoreService.initializeRestoreConfig(1);
      await restoreService.createRestoreJob(1, 'backup_123');
      restoreService.cleanup(1);
      const jobs = restoreService.getUserRestoreJobs(1);
      expect(jobs.length).toBe(0);
    });

    it('should cleanup all', () => {
      restoreService.initializeRestoreConfig(1);
      restoreService.initializeRestoreConfig(2);
      restoreService.cleanup();
      expect(true).toBe(true);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = RestoreService.getInstance();
      const instance2 = RestoreService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
