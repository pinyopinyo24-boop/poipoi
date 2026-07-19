import { describe, it, expect, beforeEach } from 'vitest';
import { OperationsRepository } from './OperationsRepository';

describe('OperationsRepository', () => {
  let repo: OperationsRepository;

  beforeEach(() => {
    repo = new OperationsRepository();
  });

  describe('createSnapshot', () => {
    it('should create a snapshot', () => {
      const snapshot = repo.createSnapshot({ cpu: 45 }, 2, 1, 'healthy', 95);

      expect(snapshot).toBeDefined();
      expect(snapshot.snapshotId).toMatch(/^SNP-/);
      expect(snapshot.systemHealth).toBe(95);
    });
  });

  describe('getSnapshot', () => {
    it('should retrieve a snapshot', () => {
      const created = repo.createSnapshot({ cpu: 45 }, 2, 1, 'healthy', 95);
      const retrieved = repo.getSnapshot(created.snapshotId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.alertCount).toBe(2);
    });
  });

  describe('getLatestSnapshot', () => {
    it('should retrieve latest snapshot', () => {
      repo.createSnapshot({ cpu: 45 }, 2, 1, 'healthy', 95);
      const latest = repo.createSnapshot({ cpu: 50 }, 1, 0, 'healthy', 96);

      const retrieved = repo.getLatestSnapshot();
      expect(retrieved?.timestamp).toBeGreaterThanOrEqual(latest.timestamp);
    });
  });

  describe('getSnapshotsByTimeRange', () => {
    it('should retrieve snapshots by time range', () => {
      const now = Date.now();
      repo.createSnapshot({ cpu: 45 }, 2, 1, 'healthy', 95);

      const snapshots = repo.getSnapshotsByTimeRange(now - 1000, now + 1000);
      expect(snapshots.length).toBeGreaterThan(0);
    });
  });

  describe('recordHistoryEvent', () => {
    it('should record a history event', () => {
      const event = repo.recordHistoryEvent('metric', { value: 100 }, 'user1');

      expect(event).toBeDefined();
      expect(event.historyId).toMatch(/^HIS-/);
      expect(event.eventType).toBe('metric');
    });
  });

  describe('getHistoryEvent', () => {
    it('should retrieve a history event', () => {
      const created = repo.recordHistoryEvent('alert', { severity: 'high' });
      const retrieved = repo.getHistoryEvent(created.historyId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.eventType).toBe('alert');
    });
  });

  describe('getHistoryByType', () => {
    it('should retrieve history by type', () => {
      repo.recordHistoryEvent('metric', { value: 100 });
      repo.recordHistoryEvent('metric', { value: 200 });
      repo.recordHistoryEvent('alert', { severity: 'high' });

      const metrics = repo.getHistoryByType('metric');
      expect(metrics.length).toBe(2);
    });
  });

  describe('createBackup', () => {
    it('should create a backup', () => {
      const backup = repo.createBackup('full', 5000000, '/backups/full-2024-01-01');

      expect(backup).toBeDefined();
      expect(backup.backupId).toMatch(/^BKP-/);
      expect(backup.status).toBe('pending');
    });
  });

  describe('getBackup', () => {
    it('should retrieve a backup', () => {
      const created = repo.createBackup('incremental', 1000000, '/backups/inc-2024-01-01');
      const retrieved = repo.getBackup(created.backupId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.backupType).toBe('incremental');
    });
  });

  describe('getBackupsByStatus', () => {
    it('should retrieve backups by status', () => {
      repo.createBackup('full', 5000000, '/backups/full-1');
      repo.createBackup('incremental', 1000000, '/backups/inc-1');

      const pending = repo.getBackupsByStatus('pending');
      expect(pending.length).toBe(2);
    });
  });

  describe('startBackup', () => {
    it('should start a backup', () => {
      const backup = repo.createBackup('full', 5000000, '/backups/full-1');
      const result = repo.startBackup(backup.backupId);

      expect(result).toBe(true);

      const updated = repo.getBackup(backup.backupId);
      expect(updated?.status).toBe('in_progress');
    });
  });

  describe('completeBackup', () => {
    it('should complete a backup', () => {
      const backup = repo.createBackup('full', 5000000, '/backups/full-1');
      repo.startBackup(backup.backupId);

      const result = repo.completeBackup(backup.backupId);

      expect(result).toBe(true);

      const completed = repo.getBackup(backup.backupId);
      expect(completed?.status).toBe('completed');
      expect(completed?.completedAt).toBeDefined();
    });
  });

  describe('getAllSnapshots', () => {
    it('should retrieve all snapshots', () => {
      repo.createSnapshot({ cpu: 45 }, 2, 1, 'healthy', 95);
      repo.createSnapshot({ cpu: 50 }, 1, 0, 'healthy', 96);

      const all = repo.getAllSnapshots();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllHistory', () => {
    it('should retrieve all history events', () => {
      repo.recordHistoryEvent('metric', { value: 100 });
      repo.recordHistoryEvent('alert', { severity: 'high' });

      const all = repo.getAllHistory();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllBackups', () => {
    it('should retrieve all backups', () => {
      repo.createBackup('full', 5000000, '/backups/full-1');
      repo.createBackup('incremental', 1000000, '/backups/inc-1');

      const all = repo.getAllBackups();
      expect(all.length).toBe(2);
    });
  });

  describe('getRepositoryStats', () => {
    it('should calculate repository statistics', () => {
      repo.createSnapshot({ cpu: 45 }, 2, 1, 'healthy', 95);
      repo.recordHistoryEvent('metric', { value: 100 });
      repo.createBackup('full', 5000000, '/backups/full-1');

      const stats = repo.getRepositoryStats();

      expect(stats.totalSnapshots).toBe(1);
      expect(stats.totalHistoryEvents).toBe(1);
      expect(stats.totalBackups).toBe(1);
      expect(stats.totalBackupSize).toBe(5000000);
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete a snapshot', () => {
      const snapshot = repo.createSnapshot({ cpu: 45 }, 2, 1, 'healthy', 95);
      const result = repo.deleteSnapshot(snapshot.snapshotId);

      expect(result).toBe(true);
      expect(repo.getSnapshot(snapshot.snapshotId)).toBeUndefined();
    });
  });

  describe('deleteHistoryEvent', () => {
    it('should delete a history event', () => {
      const event = repo.recordHistoryEvent('metric', { value: 100 });
      const result = repo.deleteHistoryEvent(event.historyId);

      expect(result).toBe(true);
      expect(repo.getHistoryEvent(event.historyId)).toBeUndefined();
    });
  });

  describe('deleteBackup', () => {
    it('should delete a backup', () => {
      const backup = repo.createBackup('full', 5000000, '/backups/full-1');
      const result = repo.deleteBackup(backup.backupId);

      expect(result).toBe(true);
      expect(repo.getBackup(backup.backupId)).toBeUndefined();
    });
  });
});
