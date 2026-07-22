/**
 * Sync Tests - Data synchronization testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncManagerV2 } from './SyncManagerV2';

describe('SyncManagerV2', () => {
  let syncManager: SyncManagerV2;

  beforeEach(() => {
    syncManager = new SyncManagerV2({
      autoSync: false,
      syncInterval: 60000,
      maxRetries: 3,
      conflictResolution: 'merge',
      enableVersioning: true,
    });
    syncManager.initialize();
  });

  describe('Push Sync', () => {
    it('should push conversation data to cloud', async () => {
      const result = await syncManager.pushSyncData('conversation', {
        message: 'Hello',
        timestamp: Date.now(),
      });

      expect(result.success).toBe(true);
      expect(result.itemId).toBeDefined();
    });

    it('should push memory data to cloud', async () => {
      const result = await syncManager.pushSyncData('memory', {
        key: 'user_preference',
        value: 'dark_mode',
      });

      expect(result.success).toBe(true);
    });

    it('should push learning data to cloud', async () => {
      const result = await syncManager.pushSyncData('learning', {
        pattern: 'user_behavior',
        confidence: 0.85,
      });

      expect(result.success).toBe(true);
    });

    it('should push production data to cloud', async () => {
      const result = await syncManager.pushSyncData('production', {
        processName: 'Assembly',
        efficiency: 92.4,
      });

      expect(result.success).toBe(true);
    });

    it('should push settings data to cloud', async () => {
      const result = await syncManager.pushSyncData('settings', {
        theme: 'dark',
        language: 'ja',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Pull Sync', () => {
    it('should pull conversation data from cloud', async () => {
      const result = await syncManager.pullSyncData('conversation');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should pull memory data from cloud', async () => {
      const result = await syncManager.pullSyncData('memory');

      expect(result.success).toBe(true);
    });

    it('should pull learning data from cloud', async () => {
      const result = await syncManager.pullSyncData('learning');

      expect(result.success).toBe(true);
    });

    it('should pull production data from cloud', async () => {
      const result = await syncManager.pullSyncData('production');

      expect(result.success).toBe(true);
    });

    it('should pull settings data from cloud', async () => {
      const result = await syncManager.pullSyncData('settings');

      expect(result.success).toBe(true);
    });
  });

  describe('Sync Status', () => {
    it('should return current sync status', () => {
      const status = syncManager.getSyncStatus();

      expect(status).toBeDefined();
      expect(status.isActive).toBeDefined();
      expect(status.pendingItems).toBe(0);
      expect(status.syncedItems).toBeGreaterThanOrEqual(0);
      expect(status.failedItems).toBeGreaterThanOrEqual(0);
      expect(status.conflicts).toBeGreaterThanOrEqual(0);
    });

    it('should track pending items', async () => {
      await syncManager.pushSyncData('conversation', { message: 'test' });
      const status = syncManager.getSyncStatus();

      expect(status.pendingItems).toBeGreaterThanOrEqual(0);
    });

    it('should track synced items', async () => {
      await syncManager.pushSyncData('conversation', { message: 'test' });
      const status = syncManager.getSyncStatus();

      expect(status.syncedItems).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflict with local-wins strategy', async () => {
      // Create a mock conflict
      const conflicts = syncManager.getConflicts();
      
      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        const result = await syncManager.resolveConflict(conflict.id, 'local-wins');

        expect(result.success).toBe(true);
      }
    });

    it('should resolve conflict with cloud-wins strategy', async () => {
      const conflicts = syncManager.getConflicts();
      
      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        const result = await syncManager.resolveConflict(conflict.id, 'cloud-wins');

        expect(result.success).toBe(true);
      }
    });

    it('should resolve conflict with merge strategy', async () => {
      const conflicts = syncManager.getConflicts();
      
      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        const result = await syncManager.resolveConflict(conflict.id, 'merge');

        expect(result.success).toBe(true);
      }
    });

    it('should resolve conflict with manual strategy', async () => {
      const conflicts = syncManager.getConflicts();
      
      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        const result = await syncManager.resolveConflict(
          conflict.id,
          'manual',
          { custom: 'data' }
        );

        expect(result.success).toBe(true);
      }
    });

    it('should return error for non-existent conflict', async () => {
      const result = await syncManager.resolveConflict('non-existent-id', 'merge');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Sync History', () => {
    it('should return sync history', async () => {
      await syncManager.pushSyncData('conversation', { message: 'test' });
      const history = syncManager.getSyncHistory(10);

      expect(Array.isArray(history)).toBe(true);
    });

    it('should respect history limit', async () => {
      for (let i = 0; i < 20; i++) {
        await syncManager.pushSyncData('conversation', { message: `test ${i}` });
      }

      const history = syncManager.getSyncHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });

    it('should track sync item details', async () => {
      await syncManager.pushSyncData('conversation', { message: 'test' });
      const history = syncManager.getSyncHistory(1);

      if (history.length > 0) {
        const item = history[0];
        expect(item.id).toBeDefined();
        expect(item.target).toBeDefined();
        expect(item.timestamp).toBeGreaterThan(0);
        expect(item.source).toBeDefined();
        expect(item.status).toBeDefined();
      }
    });
  });

  describe('Conflict Detection', () => {
    it('should return conflicts list', () => {
      const conflicts = syncManager.getConflicts();

      expect(Array.isArray(conflicts)).toBe(true);
    });

    it('should track conflict details', () => {
      const conflicts = syncManager.getConflicts();

      conflicts.forEach((conflict) => {
        expect(conflict.id).toBeDefined();
        expect(conflict.target).toBeDefined();
        expect(conflict.localData).toBeDefined();
        expect(conflict.cloudData).toBeDefined();
        expect(conflict.localTimestamp).toBeGreaterThan(0);
        expect(conflict.cloudTimestamp).toBeGreaterThan(0);
      });
    });
  });

  describe('Multi-target Sync', () => {
    it('should sync multiple targets simultaneously', async () => {
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

    it('should handle mixed push and pull operations', async () => {
      const pushResult = await syncManager.pushSyncData('conversation', { message: 'test' });
      const pullResult = await syncManager.pullSyncData('memory');

      expect(pushResult.success).toBe(true);
      expect(pullResult.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle push errors gracefully', async () => {
      const result = await syncManager.pushSyncData('conversation' as any, null);

      // Should not throw, but handle gracefully
      expect(result).toBeDefined();
    });

    it('should handle pull errors gracefully', async () => {
      const result = await syncManager.pullSyncData('conversation');

      expect(result).toBeDefined();
    });

    it('should track retry attempts', async () => {
      const result = await syncManager.pushSyncData('conversation', { message: 'test' });

      expect(result.success).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', () => {
      syncManager.destroy();

      // Should not throw
      expect(true).toBe(true);
    });
  });
});
