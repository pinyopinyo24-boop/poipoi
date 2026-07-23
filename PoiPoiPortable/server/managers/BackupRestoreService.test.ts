/**
 * BackupRestoreService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { backupRestoreService, BackupRestoreService } from './BackupRestoreService';

describe('BackupRestoreService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backupRestoreService.cleanup();
  });

  afterEach(() => {
    backupRestoreService.cleanup();
  });

  describe('Backup Creation', () => {
    it('should create backup', () => {
      const backup = backupRestoreService.createBackup(
        'user1',
        'full',
        1000000,
        'checksum123',
        '/backups/backup_1',
        true,
        30
      );
      expect(backup.id).toBeDefined();
      expect(backup.userId).toBe('user1');
    });

    it('should create backup with metadata', () => {
      const metadata = { source: 'mobile', version: '1.0.0' };
      const backup = backupRestoreService.createBackup(
        'user1',
        'full',
        1000000,
        'checksum123',
        '/backups/backup_1',
        true,
        30,
        metadata
      );
      expect(backup.metadata).toEqual(metadata);
    });

    it('should get backup', () => {
      const created = backupRestoreService.createBackup(
        'user1',
        'full',
        1000000,
        'checksum123',
        '/backups/backup_1',
        true,
        30
      );
      const backup = backupRestoreService.getBackup(created.id);
      expect(backup).not.toBeNull();
    });
  });

  describe('Backup Retrieval', () => {
    it('should get user backups', () => {
      backupRestoreService.createBackup('user1', 'full', 1000000, 'checksum1', '/backups/backup_1', true, 30);
      backupRestoreService.createBackup('user1', 'incremental', 500000, 'checksum2', '/backups/backup_2', true, 30);
      const backups = backupRestoreService.getUserBackups('user1');
      expect(backups.length).toBe(2);
    });

    it('should get latest backup', () => {
      backupRestoreService.createBackup('user1', 'full', 1000000, 'checksum1', '/backups/backup_1', true, 30);
      const latest = backupRestoreService.getLatestBackup('user1');
      expect(latest).not.toBeNull();
    });
  });

  describe('Backup Verification', () => {
    it('should verify backup', () => {
      const created = backupRestoreService.createBackup(
        'user1',
        'full',
        1000000,
        'checksum123',
        '/backups/backup_1',
        true,
        30
      );
      const verified = backupRestoreService.verifyBackup(created.id, 'checksum123');
      expect(verified).toBe(true);
    });

    it('should return false for invalid checksum', () => {
      const created = backupRestoreService.createBackup(
        'user1',
        'full',
        1000000,
        'checksum123',
        '/backups/backup_1',
        true,
        30
      );
      const verified = backupRestoreService.verifyBackup(created.id, 'invalid_checksum');
      expect(verified).toBe(false);
    });
  });

  describe('Backup Deletion', () => {
    it('should delete backup', () => {
      const created = backupRestoreService.createBackup(
        'user1',
        'full',
        1000000,
        'checksum123',
        '/backups/backup_1',
        true,
        30
      );
      const deleted = backupRestoreService.deleteBackup(created.id);
      expect(deleted).toBe(true);
    });
  });

  describe('Restore Job Management', () => {
    it('should create restore job', () => {
      const backup = backupRestoreService.createBackup(
        'user1',
        'full',
        1000000,
        'checksum123',
        '/backups/backup_1',
        true,
        30
      );
      const job = backupRestoreService.createRestoreJob('user1', backup.id);
      expect(job.id).toBeDefined();
      expect(job.status).toBe('pending');
    });

    it('should get restore job', () => {
      const backup = backupRestoreService.createBackup(
        'user1',
        'full',
        1000000,
        'checksum123',
        '/backups/backup_1',
        true,
        30
      );
      const created = backupRestoreService.createRestoreJob('user1', backup.id);
      const job = backupRestoreService.getRestoreJob(created.id);
      expect(job).not.toBeNull();
    });

    it('should start restore job', () => {
      const backup = backupRestoreService.createBackup(
        'user1',
        'full',
        1000000,
        'checksum123',
        '/backups/backup_1',
        true,
        30
      );
      const created = backupRestoreService.createRestoreJob('user1', backup.id);
      const started = backupRestoreService.startRestoreJob(created.id);
      expect(started?.status).toBe('processing');
    });

    it('should complete restore job', () => {
      const backup = backupRestoreService.createBackup(
        'user1',
        'full',
        1000000,
        'checksum123',
        '/backups/backup_1',
        true,
        30
      );
      const created = backupRestoreService.createRestoreJob('user1', backup.id);
      backupRestoreService.startRestoreJob(created.id);
      const completed = backupRestoreService.completeRestoreJob(created.id, 100);
      expect(completed?.status).toBe('completed');
      expect(completed?.restoredItemCount).toBe(100);
    });

    it('should fail restore job', () => {
      const backup = backupRestoreService.createBackup(
        'user1',
        'full',
        1000000,
        'checksum123',
        '/backups/backup_1',
        true,
        30
      );
      const created = backupRestoreService.createRestoreJob('user1', backup.id);
      const failed = backupRestoreService.failRestoreJob(created.id, 'Restore failed');
      expect(failed?.status).toBe('failed');
    });
  });

  describe('Statistics', () => {
    it('should get backup statistics', () => {
      backupRestoreService.createBackup('user1', 'full', 1000000, 'checksum1', '/backups/backup_1', true, 30);
      const stats = backupRestoreService.getBackupStatistics();
      expect(stats.totalBackups).toBeGreaterThan(0);
    });

    it('should get restore statistics', () => {
      const backup = backupRestoreService.createBackup(
        'user1',
        'full',
        1000000,
        'checksum123',
        '/backups/backup_1',
        true,
        30
      );
      const job = backupRestoreService.createRestoreJob('user1', backup.id);
      backupRestoreService.startRestoreJob(job.id);
      const stats = backupRestoreService.getRestoreStatistics();
      expect(stats.totalJobs).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired backups', () => {
      backupRestoreService.createBackup('user1', 'full', 1000000, 'checksum1', '/backups/backup_1', true, -1);
      const removed = backupRestoreService.cleanupExpiredBackups();
      expect(removed).toBeGreaterThan(0);
    });

    it('should cleanup', () => {
      backupRestoreService.createBackup('user1', 'full', 1000000, 'checksum1', '/backups/backup_1', true, 30);
      backupRestoreService.cleanup();
      const stats = backupRestoreService.getBackupStatistics();
      expect(stats.totalBackups).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = BackupRestoreService.getInstance();
      const instance2 = BackupRestoreService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
