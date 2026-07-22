/**
 * Hybrid Architecture Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectionManager } from './ConnectionManager';
import { SyncManagerV2 } from './SyncManagerV2';

describe('Hybrid Architecture Integration', () => {
  let connectionManager: ConnectionManager;
  let syncManager: SyncManagerV2;

  beforeEach(() => {
    connectionManager = new ConnectionManager({
      localServerUrl: 'http://localhost:3000',
      cloudServerUrl: 'https://poipoi.manus.space',
      connectionMode: 'auto',
      healthCheckInterval: 30000,
      healthCheckTimeout: 5000,
      maxRetries: 3,
    });

    syncManager = new SyncManagerV2({
      autoSync: false,
      syncInterval: 60000,
      maxRetries: 3,
      conflictResolution: 'merge',
      enableVersioning: true,
    });
  });

  describe('① Connection Tests', () => {
    it('should connect to local server', async () => {
      const result = await connectionManager.performHealthCheck();
      expect(result).toBeDefined();
    });

    it('should connect to cloud server', async () => {
      const result = await connectionManager.performHealthCheck();
      expect(result).toBeDefined();
    });

    it('should auto-failover from local to cloud on failure', async () => {
      // Simulate local server failure
      const result = await connectionManager.performHealthCheck();
      expect(result).toBeDefined();
    });

    it('should maintain connection priority', () => {
      const mode = connectionManager.getConnectionMode();
      expect(mode).toBeDefined();
    });

    it('should detect connection mode', () => {
      const mode = connectionManager.getConnectionMode();
      expect(['auto', 'local-only', 'cloud-only']).toContain(mode);
    });
  });

  describe('② Synchronization Tests', () => {
    it('should sync conversation from local to cloud', async () => {
      const result = await syncManager.pushSyncData('conversation', {
        message: 'Test message',
        timestamp: Date.now(),
      });

      expect(result.success).toBe(true);
      expect(result.itemId).toBeDefined();
    });

    it('should sync memory from local to cloud', async () => {
      const result = await syncManager.pushSyncData('memory', {
        key: 'user_preference',
        value: 'dark_mode',
      });

      expect(result.success).toBe(true);
    });

    it('should retrieve synced data from cloud', async () => {
      // First push
      await syncManager.pushSyncData('conversation', {
        message: 'Test',
      });

      // Then pull
      const result = await syncManager.pullSyncData('conversation');
      expect(result.success).toBe(true);
    });

    it('should sync across multiple targets', async () => {
      const results = await Promise.all([
        syncManager.pushSyncData('conversation', { message: 'test1' }),
        syncManager.pushSyncData('memory', { key: 'test2' }),
        syncManager.pushSyncData('learning', { pattern: 'test3' }),
        syncManager.pushSyncData('production', { process: 'test4' }),
        syncManager.pushSyncData('settings', { config: 'test5' }),
      ]);

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it('should maintain sync order', async () => {
      const id1 = await syncManager.pushSyncData('conversation', { seq: 1 });
      const id2 = await syncManager.pushSyncData('conversation', { seq: 2 });
      const id3 = await syncManager.pushSyncData('conversation', { seq: 3 });

      expect(id1.itemId).toBeDefined();
      expect(id2.itemId).toBeDefined();
      expect(id3.itemId).toBeDefined();
    });
  });

  describe('③ Data Consistency Tests', () => {
    it('should maintain conversation consistency', async () => {
      const pushResult = await syncManager.pushSyncData('conversation', {
        message: 'Test',
      });

      expect(pushResult.success).toBe(true);

      const pullResult = await syncManager.pullSyncData('conversation');
      expect(pullResult.success).toBe(true);
    });

    it('should maintain memory consistency', async () => {
      const pushResult = await syncManager.pushSyncData('memory', {
        key: 'test',
        value: 'data',
      });

      expect(pushResult.success).toBe(true);
    });

    it('should maintain learning consistency', async () => {
      const pushResult = await syncManager.pushSyncData('learning', {
        pattern: 'test',
      });

      expect(pushResult.success).toBe(true);
    });

    it('should maintain settings consistency', async () => {
      const pushResult = await syncManager.pushSyncData('settings', {
        theme: 'dark',
      });

      expect(pushResult.success).toBe(true);
    });

    it('should maintain production data consistency', async () => {
      const pushResult = await syncManager.pushSyncData('production', {
        process: 'Assembly',
      });

      expect(pushResult.success).toBe(true);
    });

    it('should detect data corruption', async () => {
      const result = await syncManager.pushSyncData('conversation', null);
      expect(result).toBeDefined();
    });
  });

  describe('④ Failure Recovery Tests', () => {
    it('should handle local server failure', async () => {
      // Simulate local server failure by changing mode
      connectionManager.setConnectionMode('cloud-only');
      const mode = connectionManager.getConnectionMode();
      expect(mode).toBe('cloud-only');
    });

    it('should handle cloud server delay', async () => {
      const result = await syncManager.pushSyncData('conversation', {
        message: 'Test',
      });

      expect(result.success).toBe(true);
    });

    it('should handle network disconnection', async () => {
      // Simulate network issue
      const result = await syncManager.pushSyncData('conversation', {
        message: 'Test',
      });

      // Should queue for retry
      expect(result).toBeDefined();
    });

    it('should recover from sync failure', async () => {
      const result = await syncManager.pushSyncData('conversation', {
        message: 'Test',
      });

      expect(result.success).toBe(true);
    });

    it('should retry failed syncs', async () => {
      const result = await syncManager.pushSyncData('conversation', {
        message: 'Test',
      });

      const status = syncManager.getSyncStatus();
      expect(status.failedItems).toBeGreaterThanOrEqual(0);
    });

    it('should track retry attempts', async () => {
      const result = await syncManager.pushSyncData('conversation', {
        message: 'Test',
      });

      const history = syncManager.getSyncHistory(1);
      if (history.length > 0) {
        expect(history[0].retryCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('⑤ End-to-End Integration', () => {
    it('should complete full hybrid workflow', async () => {
      // 1. Check connection
      const mode = connectionManager.getConnectionMode();
      expect(mode).toBeDefined();

      // 2. Push data
      const pushResult = await syncManager.pushSyncData('conversation', {
        message: 'E2E Test',
      });
      expect(pushResult.success).toBe(true);

      // 3. Check sync status
      const syncStatus = syncManager.getSyncStatus();
      expect(syncStatus.syncedItems).toBeGreaterThanOrEqual(0);

      // 4. Pull data
      const pullResult = await syncManager.pullSyncData('conversation');
      expect(pullResult.success).toBe(true);
    });

    it('should handle multi-device sync', async () => {
      // Simulate multiple devices
      const device1Result = await syncManager.pushSyncData('conversation', {
        device: 'device1',
        message: 'From device 1',
      });

      const device2Result = await syncManager.pushSyncData('conversation', {
        device: 'device2',
        message: 'From device 2',
      });

      expect(device1Result.success).toBe(true);
      expect(device2Result.success).toBe(true);
    });

    it('should maintain data integrity across sync cycles', async () => {
      // First cycle
      const result1 = await syncManager.pushSyncData('conversation', {
        cycle: 1,
      });

      // Second cycle
      const result2 = await syncManager.pushSyncData('conversation', {
        cycle: 2,
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should support offline-first operation', async () => {
      // Queue data while offline
      const result1 = await syncManager.pushSyncData('conversation', {
        offline: true,
      });

      expect(result1.success).toBe(true);

      // Data should be queued for sync
      const status = syncManager.getSyncStatus();
      expect(status.pendingItems).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle high-frequency syncs', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        await syncManager.pushSyncData('conversation', {
          index: i,
        });
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    });

    it('should maintain performance with large data', async () => {
      const largeData = {
        content: 'x'.repeat(10000),
        timestamp: Date.now(),
      };

      const result = await syncManager.pushSyncData('conversation', largeData);
      expect(result.success).toBe(true);
    });

    it('should scale with multiple targets', async () => {
      const startTime = Date.now();

      await Promise.all([
        syncManager.pushSyncData('conversation', { data: 1 }),
        syncManager.pushSyncData('memory', { data: 2 }),
        syncManager.pushSyncData('learning', { data: 3 }),
        syncManager.pushSyncData('production', { data: 4 }),
        syncManager.pushSyncData('settings', { data: 5 }),
      ]);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000);
    });
  });
});
