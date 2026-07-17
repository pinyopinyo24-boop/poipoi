import { describe, it, expect, beforeEach } from 'vitest';
import { ReleaseCandidateRepository } from './ReleaseCandidateRepository';

describe('ReleaseCandidateRepository', () => {
  let repo: ReleaseCandidateRepository;

  beforeEach(() => {
    repo = new ReleaseCandidateRepository();
  });

  describe('createSnapshot', () => {
    it('should create snapshot', () => {
      const snapshot = repo.createSnapshot('RC-001', 'v1.0.0', { key: 'value' });

      expect(snapshot).toBeDefined();
      expect(snapshot.snapshotId).toMatch(/^SNAP-/);
      expect(snapshot.data).toEqual({ key: 'value' });
    });
  });

  describe('getSnapshot', () => {
    it('should retrieve snapshot', () => {
      const created = repo.createSnapshot('RC-001', 'v1.0.0', { key: 'value' });
      const retrieved = repo.getSnapshot(created.snapshotId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.version).toBe('v1.0.0');
    });
  });

  describe('getSnapshotsByRc', () => {
    it('should retrieve snapshots by RC', () => {
      repo.createSnapshot('RC-001', 'v1.0.0', { key: 'value1' });
      repo.createSnapshot('RC-001', 'v1.0.0', { key: 'value2' });
      repo.createSnapshot('RC-002', 'v1.0.0', { key: 'value3' });

      const rc1Snapshots = repo.getSnapshotsByRc('RC-001');
      expect(rc1Snapshots.length).toBe(2);
    });
  });

  describe('getLatestSnapshot', () => {
    it('should retrieve latest snapshot', async () => {
      repo.createSnapshot('RC-001', 'v1.0.0', { key: 'value1' });
      await new Promise(resolve => setTimeout(resolve, 10));
      const snapshot2 = repo.createSnapshot('RC-001', 'v1.0.0', { key: 'value2' });

      const latest = repo.getLatestSnapshot('RC-001');
      expect(latest?.snapshotId).toBe(snapshot2.snapshotId);
    });
  });

  describe('getAllSnapshots', () => {
    it('should retrieve all snapshots', () => {
      repo.createSnapshot('RC-001', 'v1.0.0', { key: 'value1' });
      repo.createSnapshot('RC-002', 'v1.0.0', { key: 'value2' });

      const all = repo.getAllSnapshots();
      expect(all.length).toBe(2);
    });
  });

  describe('createBackup', () => {
    it('should create backup', () => {
      const backup = repo.createBackup('RC-001', 'full', '/path/to/backup.zip', 1024000);

      expect(backup).toBeDefined();
      expect(backup.backupId).toMatch(/^BKP-/);
      expect(backup.status).toBe('completed');
    });
  });

  describe('getBackup', () => {
    it('should retrieve backup', () => {
      const created = repo.createBackup('RC-001', 'full', '/path/to/backup.zip', 1024000);
      const retrieved = repo.getBackup(created.backupId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.backupType).toBe('full');
    });
  });

  describe('getBackupsByRc', () => {
    it('should retrieve backups by RC', () => {
      repo.createBackup('RC-001', 'full', '/path/to/backup1.zip', 1024000);
      repo.createBackup('RC-001', 'incremental', '/path/to/backup2.zip', 512000);
      repo.createBackup('RC-002', 'full', '/path/to/backup3.zip', 1024000);

      const rc1Backups = repo.getBackupsByRc('RC-001');
      expect(rc1Backups.length).toBe(2);
    });
  });

  describe('getLatestBackup', () => {
    it('should retrieve latest backup', async () => {
      repo.createBackup('RC-001', 'full', '/path/to/backup1.zip', 1024000);
      await new Promise(resolve => setTimeout(resolve, 10));
      const backup2 = repo.createBackup('RC-001', 'incremental', '/path/to/backup2.zip', 512000);

      const latest = repo.getLatestBackup('RC-001');
      expect(latest?.backupId).toBe(backup2.backupId);
    });
  });

  describe('getAllBackups', () => {
    it('should retrieve all backups', () => {
      repo.createBackup('RC-001', 'full', '/path/to/backup1.zip', 1024000);
      repo.createBackup('RC-002', 'full', '/path/to/backup2.zip', 1024000);

      const all = repo.getAllBackups();
      expect(all.length).toBe(2);
    });
  });

  describe('createHistory', () => {
    it('should create history', () => {
      const history = repo.createHistory('RC-001', 'created', { version: 'v1.0.0' }, 'admin');

      expect(history).toBeDefined();
      expect(history.historyId).toMatch(/^HIST-/);
      expect(history.action).toBe('created');
    });
  });

  describe('getHistory', () => {
    it('should retrieve history', () => {
      const created = repo.createHistory('RC-001', 'created', { version: 'v1.0.0' }, 'admin');
      const retrieved = repo.getHistory(created.historyId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.actor).toBe('admin');
    });
  });

  describe('getHistoriesByRc', () => {
    it('should retrieve histories by RC', () => {
      repo.createHistory('RC-001', 'created', {}, 'admin');
      repo.createHistory('RC-001', 'updated', {}, 'admin');
      repo.createHistory('RC-002', 'created', {}, 'admin');

      const rc1Histories = repo.getHistoriesByRc('RC-001');
      expect(rc1Histories.length).toBe(2);
    });
  });

  describe('getAllHistories', () => {
    it('should retrieve all histories', () => {
      repo.createHistory('RC-001', 'created', {}, 'admin');
      repo.createHistory('RC-002', 'created', {}, 'admin');

      const all = repo.getAllHistories();
      expect(all.length).toBe(2);
    });
  });

  describe('restoreFromSnapshot', () => {
    it('should restore from snapshot', () => {
      const created = repo.createSnapshot('RC-001', 'v1.0.0', { key: 'value' });
      const restored = repo.restoreFromSnapshot(created.snapshotId);

      expect(restored).toBeDefined();
      expect(restored?.data).toEqual({ key: 'value' });
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore from backup', () => {
      const created = repo.createBackup('RC-001', 'full', '/path/to/backup.zip', 1024000);
      const restored = repo.restoreFromBackup(created.backupId);

      expect(restored).toBeDefined();
      expect(restored?.filePath).toBe('/path/to/backup.zip');
    });
  });

  describe('getRepositoryStats', () => {
    it('should calculate repository statistics', () => {
      repo.createSnapshot('RC-001', 'v1.0.0', { key: 'value' });
      repo.createBackup('RC-001', 'full', '/path/to/backup.zip', 1024000);
      repo.createHistory('RC-001', 'created', {}, 'admin');

      const stats = repo.getRepositoryStats();

      expect(stats.totalSnapshots).toBe(1);
      expect(stats.totalBackups).toBe(1);
      expect(stats.totalHistories).toBe(1);
      expect(stats.completedBackups).toBe(1);
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete snapshot', () => {
      const snapshot = repo.createSnapshot('RC-001', 'v1.0.0', { key: 'value' });

      const result = repo.deleteSnapshot(snapshot.snapshotId);

      expect(result).toBe(true);
      expect(repo.getSnapshot(snapshot.snapshotId)).toBeUndefined();
    });
  });

  describe('deleteBackup', () => {
    it('should delete backup', () => {
      const backup = repo.createBackup('RC-001', 'full', '/path/to/backup.zip', 1024000);

      const result = repo.deleteBackup(backup.backupId);

      expect(result).toBe(true);
      expect(repo.getBackup(backup.backupId)).toBeUndefined();
    });
  });

  describe('deleteHistory', () => {
    it('should delete history', () => {
      const history = repo.createHistory('RC-001', 'created', {}, 'admin');

      const result = repo.deleteHistory(history.historyId);

      expect(result).toBe(true);
      expect(repo.getHistory(history.historyId)).toBeUndefined();
    });
  });

  describe('comprehensive repository workflow', () => {
    it('should support full repository workflow', () => {
      repo.createSnapshot('RC-001', 'v1.0.0', { key: 'value' });
      repo.createBackup('RC-001', 'full', '/path/to/backup.zip', 1024000);
      repo.createHistory('RC-001', 'created', { version: 'v1.0.0' }, 'admin');
      repo.createHistory('RC-001', 'backup_created', {}, 'system');

      const stats = repo.getRepositoryStats();

      expect(stats.totalSnapshots).toBe(1);
      expect(stats.totalBackups).toBe(1);
      expect(stats.totalHistories).toBe(2);
      expect(stats.completedBackups).toBe(1);
    });
  });
});
