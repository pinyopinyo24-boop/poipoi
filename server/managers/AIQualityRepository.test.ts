import { describe, it, expect, beforeEach } from 'vitest';
import { AIQualityRepository } from './AIQualityRepository';

describe('AIQualityRepository', () => {
  let repository: AIQualityRepository;

  beforeEach(() => {
    repository = new AIQualityRepository();
  });

  describe('createSnapshot', () => {
    it('should create a snapshot', () => {
      const snapshot = repository.createSnapshot(
        1,
        { totalMetrics: 100, averageAccuracy: 85 },
        { totalQualityRecords: 50, averageContextMaintenance: 80 },
        { totalEvaluations: 75, averageAccuracy: 82 }
      );

      expect(snapshot).toBeDefined();
      expect(snapshot.snapshotId).toMatch(/^QS-/);
      expect(snapshot.version).toBe(1);
    });
  });

  describe('getSnapshot', () => {
    it('should retrieve a snapshot', () => {
      const created = repository.createSnapshot(
        1,
        { totalMetrics: 100, averageAccuracy: 85 },
        { totalQualityRecords: 50 },
        { totalEvaluations: 75 }
      );
      const retrieved = repository.getSnapshot(created.snapshotId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.version).toBe(1);
    });
  });

  describe('getSnapshotByVersion', () => {
    it('should retrieve snapshot by version', () => {
      const created = repository.createSnapshot(
        1,
        { totalMetrics: 100, averageAccuracy: 85 },
        { totalQualityRecords: 50 },
        { totalEvaluations: 75 }
      );
      const retrieved = repository.getSnapshotByVersion(1);

      expect(retrieved).toBeDefined();
      expect(retrieved?.snapshotId).toBe(created.snapshotId);
    });
  });

  describe('getAllSnapshots', () => {
    it('should retrieve all snapshots', () => {
      repository.createSnapshot(1, { totalMetrics: 100 }, { totalQualityRecords: 50 }, { totalEvaluations: 75 });
      repository.createSnapshot(2, { totalMetrics: 110 }, { totalQualityRecords: 55 }, { totalEvaluations: 80 });

      const all = repository.getAllSnapshots();
      expect(all.length).toBe(2);
    });
  });

  describe('archiveSnapshot', () => {
    it('should archive a snapshot', () => {
      const snapshot = repository.createSnapshot(
        1,
        { totalMetrics: 100 },
        { totalQualityRecords: 50 },
        { totalEvaluations: 75 }
      );

      const result = repository.archiveSnapshot(snapshot.snapshotId);

      expect(result).toBe(true);

      const archived = repository.getSnapshot(snapshot.snapshotId);
      expect(archived?.status).toBe('archived');
    });
  });

  describe('recordHistory', () => {
    it('should record history', () => {
      const history = repository.recordHistory(
        'metric_recorded',
        'Quality metric recorded',
        'entity-1',
        { score: 85 }
      );

      expect(history).toBeDefined();
      expect(history.historyId).toMatch(/^QH-/);
      expect(history.changeType).toBe('metric_recorded');
    });
  });

  describe('getHistory', () => {
    it('should retrieve history', () => {
      const created = repository.recordHistory(
        'metric_recorded',
        'Quality metric recorded',
        'entity-1',
        { score: 85 }
      );
      const retrieved = repository.getHistory(created.historyId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.description).toBe('Quality metric recorded');
    });
  });

  describe('getHistoryByChangeType', () => {
    it('should retrieve history by change type', () => {
      repository.recordHistory('metric_recorded', 'Metric 1', 'entity-1', { score: 85 });
      repository.recordHistory('metric_recorded', 'Metric 2', 'entity-2', { score: 90 });

      const histories = repository.getHistoryByChangeType('metric_recorded');
      expect(histories.length).toBe(2);
    });
  });

  describe('getAllHistory', () => {
    it('should retrieve all history', () => {
      repository.recordHistory('metric_recorded', 'Metric 1', 'entity-1', { score: 85 });
      repository.recordHistory('alert_created', 'Alert 1', 'entity-2', { severity: 'high' });

      const all = repository.getAllHistory();
      expect(all.length).toBe(2);
    });
  });

  describe('createBackup', () => {
    it('should create a backup', () => {
      const snapshot = repository.createSnapshot(
        1,
        { totalMetrics: 100 },
        { totalQualityRecords: 50 },
        { totalEvaluations: 75 }
      );
      const backup = repository.createBackup(snapshot.snapshotId, 1024, 30);

      expect(backup).toBeDefined();
      expect(backup.backupId).toMatch(/^QB-/);
      expect(backup.status).toBe('completed');
    });
  });

  describe('getBackup', () => {
    it('should retrieve a backup', () => {
      const snapshot = repository.createSnapshot(
        1,
        { totalMetrics: 100 },
        { totalQualityRecords: 50 },
        { totalEvaluations: 75 }
      );
      const created = repository.createBackup(snapshot.snapshotId, 1024, 30);
      const retrieved = repository.getBackup(created.backupId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.dataSize).toBe(1024);
    });
  });

  describe('getBackupsBySnapshot', () => {
    it('should retrieve backups by snapshot', () => {
      const snapshot = repository.createSnapshot(
        1,
        { totalMetrics: 100 },
        { totalQualityRecords: 50 },
        { totalEvaluations: 75 }
      );
      repository.createBackup(snapshot.snapshotId, 1024, 30);
      repository.createBackup(snapshot.snapshotId, 2048, 30);

      const backups = repository.getBackupsBySnapshot(snapshot.snapshotId);
      expect(backups.length).toBe(2);
    });
  });

  describe('getBackupsByStatus', () => {
    it('should retrieve backups by status', () => {
      const snapshot = repository.createSnapshot(
        1,
        { totalMetrics: 100 },
        { totalQualityRecords: 50 },
        { totalEvaluations: 75 }
      );
      repository.createBackup(snapshot.snapshotId, 1024, 30);
      repository.createBackup(snapshot.snapshotId, 2048, 30);

      const completed = repository.getBackupsByStatus('completed');
      expect(completed.length).toBe(2);
    });
  });

  describe('getAllBackups', () => {
    it('should retrieve all backups', () => {
      const snapshot1 = repository.createSnapshot(
        1,
        { totalMetrics: 100 },
        { totalQualityRecords: 50 },
        { totalEvaluations: 75 }
      );
      const snapshot2 = repository.createSnapshot(
        2,
        { totalMetrics: 110 },
        { totalQualityRecords: 55 },
        { totalEvaluations: 80 }
      );
      repository.createBackup(snapshot1.snapshotId, 1024, 30);
      repository.createBackup(snapshot2.snapshotId, 2048, 30);

      const all = repository.getAllBackups();
      expect(all.length).toBe(2);
    });
  });

  describe('failBackup', () => {
    it('should fail a backup', () => {
      const snapshot = repository.createSnapshot(
        1,
        { totalMetrics: 100 },
        { totalQualityRecords: 50 },
        { totalEvaluations: 75 }
      );
      const backup = repository.createBackup(snapshot.snapshotId, 1024, 30);

      const result = repository.failBackup(backup.backupId);

      expect(result).toBe(true);

      const failed = repository.getBackup(backup.backupId);
      expect(failed?.status).toBe('failed');
    });
  });

  describe('getRepositoryStats', () => {
    it('should calculate repository statistics', () => {
      const snapshot = repository.createSnapshot(
        1,
        { totalMetrics: 100 },
        { totalQualityRecords: 50 },
        { totalEvaluations: 75 }
      );
      repository.recordHistory('metric_recorded', 'Metric', 'entity-1', { score: 85 });
      repository.createBackup(snapshot.snapshotId, 1024, 30);

      const stats = repository.getRepositoryStats();

      expect(stats.totalSnapshots).toBe(1);
      expect(stats.totalHistoryRecords).toBe(1);
      expect(stats.totalBackups).toBe(1);
      expect(stats.totalBackupSize).toBe(1024);
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete a snapshot', () => {
      const snapshot = repository.createSnapshot(
        1,
        { totalMetrics: 100 },
        { totalQualityRecords: 50 },
        { totalEvaluations: 75 }
      );

      const result = repository.deleteSnapshot(snapshot.snapshotId);

      expect(result).toBe(true);
      expect(repository.getSnapshot(snapshot.snapshotId)).toBeUndefined();
    });
  });

  describe('deleteHistory', () => {
    it('should delete history', () => {
      const history = repository.recordHistory(
        'metric_recorded',
        'Metric',
        'entity-1',
        { score: 85 }
      );

      const result = repository.deleteHistory(history.historyId);

      expect(result).toBe(true);
      expect(repository.getHistory(history.historyId)).toBeUndefined();
    });
  });

  describe('deleteBackup', () => {
    it('should delete a backup', () => {
      const snapshot = repository.createSnapshot(
        1,
        { totalMetrics: 100 },
        { totalQualityRecords: 50 },
        { totalEvaluations: 75 }
      );
      const backup = repository.createBackup(snapshot.snapshotId, 1024, 30);

      const result = repository.deleteBackup(backup.backupId);

      expect(result).toBe(true);
      expect(repository.getBackup(backup.backupId)).toBeUndefined();
    });
  });
});
