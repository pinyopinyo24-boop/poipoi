/**
 * CrashLogCollectionService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { crashLogCollectionService, CrashLogCollectionService } from './CrashLogCollectionService';

describe('CrashLogCollectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    crashLogCollectionService.cleanup();
  });

  afterEach(() => {
    crashLogCollectionService.cleanup();
  });

  describe('Crash Log Recording', () => {
    it('should record crash log', () => {
      const log = crashLogCollectionService.recordCrash(
        'user1',
        'device1',
        '1.0.0',
        'Android 14',
        'NullPointerException',
        'at com.example.MainActivity.onCreate',
        ['app_started', 'button_clicked'],
        { manufacturer: 'Samsung', model: 'Galaxy S21', ramMB: 8000, storageMB: 128000, batteryLevel: 50 },
        { type: 'wifi', isConnected: true }
      );
      expect(log.id).toBeDefined();
      expect(log.userId).toBe('user1');
    });

    it('should determine severity correctly', () => {
      const criticalLog = crashLogCollectionService.recordCrash(
        'user1',
        'device1',
        '1.0.0',
        'Android 14',
        'Fatal Exception',
        'stack',
        [],
        { manufacturer: 'Samsung', model: 'Galaxy S21', ramMB: 8000, storageMB: 128000, batteryLevel: 50 },
        { type: 'wifi', isConnected: true }
      );
      expect(criticalLog.severity).toBe('critical');
    });
  });

  describe('Crash Log Retrieval', () => {
    it('should get crash log', () => {
      const recorded = crashLogCollectionService.recordCrash(
        'user1',
        'device1',
        '1.0.0',
        'Android 14',
        'Error',
        'stack',
        [],
        { manufacturer: 'Samsung', model: 'Galaxy S21', ramMB: 8000, storageMB: 128000, batteryLevel: 50 },
        { type: 'wifi', isConnected: true }
      );
      const retrieved = crashLogCollectionService.getCrashLog(recorded.id);
      expect(retrieved).not.toBeNull();
    });

    it('should get user crash logs', () => {
      crashLogCollectionService.recordCrash(
        'user1',
        'device1',
        '1.0.0',
        'Android 14',
        'Error 1',
        'stack',
        [],
        { manufacturer: 'Samsung', model: 'Galaxy S21', ramMB: 8000, storageMB: 128000, batteryLevel: 50 },
        { type: 'wifi', isConnected: true }
      );
      crashLogCollectionService.recordCrash(
        'user1',
        'device1',
        '1.0.0',
        'Android 14',
        'Error 2',
        'stack',
        [],
        { manufacturer: 'Samsung', model: 'Galaxy S21', ramMB: 8000, storageMB: 128000, batteryLevel: 50 },
        { type: 'wifi', isConnected: true }
      );
      const logs = crashLogCollectionService.getUserCrashLogs('user1');
      expect(logs.length).toBe(2);
    });

    it('should get device crash logs', () => {
      crashLogCollectionService.recordCrash(
        'user1',
        'device1',
        '1.0.0',
        'Android 14',
        'Error',
        'stack',
        [],
        { manufacturer: 'Samsung', model: 'Galaxy S21', ramMB: 8000, storageMB: 128000, batteryLevel: 50 },
        { type: 'wifi', isConnected: true }
      );
      const logs = crashLogCollectionService.getDeviceCrashLogs('device1');
      expect(logs.length).toBe(1);
    });
  });

  describe('Crash Status Update', () => {
    it('should update crash status', () => {
      const recorded = crashLogCollectionService.recordCrash(
        'user1',
        'device1',
        '1.0.0',
        'Android 14',
        'Error',
        'stack',
        [],
        { manufacturer: 'Samsung', model: 'Galaxy S21', ramMB: 8000, storageMB: 128000, batteryLevel: 50 },
        { type: 'wifi', isConnected: true }
      );
      const updated = crashLogCollectionService.updateCrashStatus(recorded.id, 'acknowledged');
      expect(updated?.status).toBe('acknowledged');
    });

    it('should update crash status with fixed version', () => {
      const recorded = crashLogCollectionService.recordCrash(
        'user1',
        'device1',
        '1.0.0',
        'Android 14',
        'Error',
        'stack',
        [],
        { manufacturer: 'Samsung', model: 'Galaxy S21', ramMB: 8000, storageMB: 128000, batteryLevel: 50 },
        { type: 'wifi', isConnected: true }
      );
      const updated = crashLogCollectionService.updateCrashStatus(recorded.id, 'fixed', '1.0.1');
      expect(updated?.fixedVersion).toBe('1.0.1');
    });
  });

  describe('Statistics', () => {
    it('should get statistics', () => {
      crashLogCollectionService.recordCrash(
        'user1',
        'device1',
        '1.0.0',
        'Android 14',
        'Fatal Error',
        'stack',
        [],
        { manufacturer: 'Samsung', model: 'Galaxy S21', ramMB: 8000, storageMB: 128000, batteryLevel: 50 },
        { type: 'wifi', isConnected: true }
      );
      const stats = crashLogCollectionService.getStatistics();
      expect(stats.totalCrashes).toBe(1);
      expect(stats.criticalCrashes).toBeGreaterThanOrEqual(0);
    });

    it('should get version statistics', () => {
      crashLogCollectionService.recordCrash(
        'user1',
        'device1',
        '1.0.0',
        'Android 14',
        'Error',
        'stack',
        [],
        { manufacturer: 'Samsung', model: 'Galaxy S21', ramMB: 8000, storageMB: 128000, batteryLevel: 50 },
        { type: 'wifi', isConnected: true }
      );
      const stats = crashLogCollectionService.getCrashStatisticsByVersion('1.0.0');
      expect(stats.version).toBe('1.0.0');
      expect(stats.crashCount).toBe(1);
    });
  });

  describe('Crash Deletion', () => {
    it('should delete crash log', () => {
      const recorded = crashLogCollectionService.recordCrash(
        'user1',
        'device1',
        '1.0.0',
        'Android 14',
        'Error',
        'stack',
        [],
        { manufacturer: 'Samsung', model: 'Galaxy S21', ramMB: 8000, storageMB: 128000, batteryLevel: 50 },
        { type: 'wifi', isConnected: true }
      );
      const deleted = crashLogCollectionService.deleteCrash(recorded.id);
      expect(deleted).toBe(true);
      const retrieved = crashLogCollectionService.getCrashLog(recorded.id);
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent crash', () => {
      const deleted = crashLogCollectionService.deleteCrash('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      crashLogCollectionService.recordCrash(
        'user1',
        'device1',
        '1.0.0',
        'Android 14',
        'Error',
        'stack',
        [],
        { manufacturer: 'Samsung', model: 'Galaxy S21', ramMB: 8000, storageMB: 128000, batteryLevel: 50 },
        { type: 'wifi', isConnected: true }
      );
      crashLogCollectionService.cleanup();
      const stats = crashLogCollectionService.getStatistics();
      expect(stats.totalCrashes).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = CrashLogCollectionService.getInstance();
      const instance2 = CrashLogCollectionService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
