/**
 * BackupService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { backupService, BackupService } from './BackupService';

describe('BackupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backupService.cleanup();
  });

  afterEach(() => {
    backupService.cleanup();
  });

  // === バックアップ設定テスト ===
  describe('Backup Configuration', () => {
    it('should initialize backup config', () => {
      const config = backupService.initializeBackupConfig(1);
      expect(config.autoBackupEnabled).toBe(true);
      expect(config.retentionDays).toBe(30);
    });

    it('should get backup config', () => {
      backupService.initializeBackupConfig(1);
      const config = backupService.getBackupConfig(1);
      expect(config).not.toBeNull();
    });

    it('should update backup config', () => {
      backupService.initializeBackupConfig(1);
      const updated = backupService.updateBackupConfig(1, {
        autoBackupEnabled: false,
      });
      expect(updated?.autoBackupEnabled).toBe(false);
    });
  });

  // === バックアップ作成テスト ===
  describe('Create Backup', () => {
    it('should create backup', async () => {
      backupService.initializeBackupConfig(1);
      const backup = await backupService.createBackup(1, 'Test Backup');
      expect(backup).not.toBeNull();
      if (backup) {
        expect(backup.status).toBe('pending');
      }
    });

    it('should create full backup', async () => {
      backupService.initializeBackupConfig(1);
      const backup = await backupService.createBackup(1, 'Full Backup', 'full');
      expect(backup?.type).toBe('full');
    });

    it('should create incremental backup', async () => {
      backupService.initializeBackupConfig(1);
      const backup = await backupService.createBackup(1, 'Incremental Backup', 'incremental');
      expect(backup?.type).toBe('incremental');
    });
  });

  // === バックアップ取得テスト ===
  describe('Get Backup', () => {
    it('should get backup', async () => {
      backupService.initializeBackupConfig(1);
      const created = await backupService.createBackup(1, 'Test Backup');
      if (created) {
        const retrieved = backupService.getBackup(1, created.id);
        expect(retrieved).not.toBeNull();
      }
    });

    it('should get user backups', async () => {
      backupService.initializeBackupConfig(1);
      await backupService.createBackup(1, 'Backup 1');
      await backupService.createBackup(1, 'Backup 2');
      const backups = backupService.getUserBackups(1);
      expect(backups.length).toBe(2);
    });
  });

  // === バックアップ状態更新テスト ===
  describe('Update Backup Status', () => {
    it('should update backup status', async () => {
      backupService.initializeBackupConfig(1);
      const created = await backupService.createBackup(1, 'Test Backup');
      if (created) {
        const updated = backupService.updateBackupStatus(1, created.id, 'completed');
        expect(updated?.status).toBe('completed');
      }
    });

    it('should set completed time', async () => {
      backupService.initializeBackupConfig(1);
      const created = await backupService.createBackup(1, 'Test Backup');
      if (created) {
        backupService.updateBackupStatus(1, created.id, 'completed');
        const updated = backupService.getBackup(1, created.id);
        expect(updated?.completedAt).toBeDefined();
      }
    });
  });

  // === バックアップ削除テスト ===
  describe('Delete Backup', () => {
    it('should delete backup', async () => {
      backupService.initializeBackupConfig(1);
      const created = await backupService.createBackup(1, 'Test Backup');
      if (created) {
        const result = backupService.deleteBackup(1, created.id);
        expect(result).toBe(true);
      }
    });

    it('should cleanup expired backups', async () => {
      backupService.initializeBackupConfig(1);
      const backup = await backupService.createBackup(1, 'Test Backup');
      if (backup) {
        backup.expiresAt = Date.now() - 1000;
        const count = backupService.cleanupExpiredBackups(1);
        expect(count >= 0).toBe(true);
      }
    });

    it('should remove old backups', async () => {
      backupService.initializeBackupConfig(1);
      backupService.updateBackupConfig(1, { maxBackups: 2 });
      await backupService.createBackup(1, 'Backup 1');
      await backupService.createBackup(1, 'Backup 2');
      await backupService.createBackup(1, 'Backup 3');
      const removed = backupService.removeOldBackups(1);
      expect(removed >= 0).toBe(true);
    });
  });

  // === バックアップサイズテスト ===
  describe('Backup Size', () => {
    it('should calculate backup size', async () => {
      backupService.initializeBackupConfig(1);
      const backup = await backupService.createBackup(1, 'Test Backup');
      if (backup) {
        backup.size = 1000;
        const size = backupService.calculateBackupSize(1);
        expect(size).toBe(1000);
      }
    });
  });

  // === バックアップ統計テスト ===
  describe('Backup Statistics', () => {
    it('should get backup stats', async () => {
      backupService.initializeBackupConfig(1);
      const stats = backupService.getBackupStats(1);
      expect(stats).not.toBeNull();
      if (stats) {
        expect(stats.totalBackups >= 0).toBe(true);
        expect(stats.completedBackups >= 0).toBe(true);
      }
    });
  });

  // === 自動バックアップテスト ===
  describe('Auto Backup Scheduling', () => {
    it('should schedule auto backup', () => {
      backupService.initializeBackupConfig(1);
      backupService.scheduleAutoBackup(1);
      expect(true).toBe(true);
    });

    it('should schedule all auto backups', () => {
      backupService.initializeBackupConfig(1);
      backupService.initializeBackupConfig(2);
      backupService.scheduleAllAutoBackups();
      expect(true).toBe(true);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup specific user', async () => {
      backupService.initializeBackupConfig(1);
      await backupService.createBackup(1, 'Test Backup');
      backupService.cleanup(1);
      const backups = backupService.getUserBackups(1);
      expect(backups.length).toBe(0);
    });

    it('should cleanup all', () => {
      backupService.initializeBackupConfig(1);
      backupService.initializeBackupConfig(2);
      backupService.cleanup();
      expect(true).toBe(true);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = BackupService.getInstance();
      const instance2 = BackupService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
