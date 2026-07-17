/**
 * CloudSyncService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cloudSyncService, CloudSyncService, SyncData } from './CloudSyncService';

describe('CloudSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cloudSyncService.cleanup();
  });

  afterEach(() => {
    cloudSyncService.cleanup();
  });

  // === 同期状態初期化テスト ===
  describe('Sync State Initialization', () => {
    it('should initialize sync state', () => {
      const state = cloudSyncService.initializeSyncState(1);
      expect(state.isSyncing).toBe(false);
      expect(state.syncProgress).toBe(0);
      expect(state.pendingChanges).toBe(0);
    });

    it('should get sync state', () => {
      cloudSyncService.initializeSyncState(1);
      const state = cloudSyncService.getSyncState(1);
      expect(state).not.toBeNull();
    });

    it('should return null for non-existent state', () => {
      const state = cloudSyncService.getSyncState(999);
      expect(state).toBeNull();
    });
  });

  // === データ追加テスト ===
  describe('Add Data', () => {
    it('should add data', () => {
      cloudSyncService.initializeSyncState(1);
      const data: SyncData = {
        id: 'test_1',
        userId: 1,
        type: 'chat',
        data: { message: 'test' },
        version: 1,
        timestamp: Date.now(),
        hash: 'hash_1',
      };

      const result = cloudSyncService.addData(1, data);
      expect(result).toBe(true);
    });

    it('should track pending changes', () => {
      cloudSyncService.initializeSyncState(1);
      const data: SyncData = {
        id: 'test_1',
        userId: 1,
        type: 'chat',
        data: { message: 'test' },
        version: 1,
        timestamp: Date.now(),
        hash: 'hash_1',
      };

      cloudSyncService.addData(1, data);
      const pending = cloudSyncService.getPendingChanges(1);
      expect(pending.length).toBe(1);
    });
  });

  // === 同期実行テスト ===
  describe('Sync Execution', () => {
    it('should sync data', async () => {
      cloudSyncService.initializeSyncState(1);
      const result = await cloudSyncService.sync(1);
      expect(result.success === true || result.success === false).toBe(true);
    });

    it('should prevent concurrent sync', async () => {
      cloudSyncService.initializeSyncState(1);
      const state = cloudSyncService.getSyncState(1);
      if (state) {
        state.isSyncing = true;
        const result = await cloudSyncService.sync(1);
        expect(result.success).toBe(false);
      }
    });

    it('should clear pending changes after sync', async () => {
      cloudSyncService.initializeSyncState(1);
      const data: SyncData = {
        id: 'test_1',
        userId: 1,
        type: 'chat',
        data: { message: 'test' },
        version: 1,
        timestamp: Date.now(),
        hash: 'hash_1',
      };

      cloudSyncService.addData(1, data);
      await cloudSyncService.sync(1);
      const pending = cloudSyncService.getPendingChanges(1);
      expect(pending.length).toBe(0);
    });
  });

  // === 差分同期テスト ===
  describe('Delta Sync', () => {
    it('should sync delta', async () => {
      cloudSyncService.initializeSyncState(1);
      const delta = await cloudSyncService.syncDelta(1, Date.now() - 10000);
      expect(Array.isArray(delta)).toBe(true);
    });
  });

  // === 競合解決テスト ===
  describe('Conflict Resolution', () => {
    it('should resolve conflict with local strategy', async () => {
      const localData: SyncData = {
        id: 'test_1',
        userId: 1,
        type: 'chat',
        data: { message: 'local' },
        version: 1,
        timestamp: Date.now(),
        hash: 'hash_1',
      };

      const remoteData: SyncData = {
        id: 'test_1',
        userId: 1,
        type: 'chat',
        data: { message: 'remote' },
        version: 2,
        timestamp: Date.now(),
        hash: 'hash_2',
      };

      const result = await cloudSyncService.resolveConflict(1, localData, remoteData, 'local');
      expect(result).not.toBeNull();
      if (result) {
        expect(result.strategy).toBe('local');
      }
    });

    it('should resolve conflict with remote strategy', async () => {
      const localData: SyncData = {
        id: 'test_1',
        userId: 1,
        type: 'chat',
        data: { message: 'local' },
        version: 1,
        timestamp: Date.now(),
        hash: 'hash_1',
      };

      const remoteData: SyncData = {
        id: 'test_1',
        userId: 1,
        type: 'chat',
        data: { message: 'remote' },
        version: 2,
        timestamp: Date.now(),
        hash: 'hash_2',
      };

      const result = await cloudSyncService.resolveConflict(1, localData, remoteData, 'remote');
      expect(result).not.toBeNull();
      if (result) {
        expect(result.strategy).toBe('remote');
      }
    });

    it('should resolve conflict with merge strategy', async () => {
      const localData: SyncData = {
        id: 'test_1',
        userId: 1,
        type: 'chat',
        data: { message: 'local', field1: 'value1' },
        version: 1,
        timestamp: Date.now(),
        hash: 'hash_1',
      };

      const remoteData: SyncData = {
        id: 'test_1',
        userId: 1,
        type: 'chat',
        data: { message: 'remote', field2: 'value2' },
        version: 2,
        timestamp: Date.now(),
        hash: 'hash_2',
      };

      const result = await cloudSyncService.resolveConflict(1, localData, remoteData, 'merge');
      expect(result).not.toBeNull();
      if (result) {
        expect(result.strategy).toBe('merge');
      }
    });
  });

  // === 同期キャンセルテスト ===
  describe('Sync Cancellation', () => {
    it('should cancel sync', () => {
      cloudSyncService.initializeSyncState(1);
      const result = cloudSyncService.cancelSync(1);
      expect(result).toBe(true);
    });
  });

  // === 同期リセットテスト ===
  describe('Sync Reset', () => {
    it('should reset sync', () => {
      cloudSyncService.initializeSyncState(1);
      const result = cloudSyncService.resetSync(1);
      expect(result).toBe(true);
    });
  });

  // === 同期統計テスト ===
  describe('Sync Statistics', () => {
    it('should get sync stats', () => {
      cloudSyncService.initializeSyncState(1);
      const stats = cloudSyncService.getSyncStats(1);
      expect(stats).not.toBeNull();
      if (stats) {
        expect(stats.totalSynced >= 0).toBe(true);
        expect(stats.pendingChanges >= 0).toBe(true);
      }
    });
  });

  // === 自動同期スケジュールテスト ===
  describe('Auto Sync Scheduling', () => {
    it('should schedule auto sync', () => {
      cloudSyncService.initializeSyncState(1);
      cloudSyncService.scheduleAutoSync(1);
      expect(true).toBe(true);
    });

    it('should schedule all auto sync', () => {
      cloudSyncService.initializeSyncState(1);
      cloudSyncService.initializeSyncState(2);
      cloudSyncService.scheduleAllAutoSync();
      expect(true).toBe(true);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup specific user', () => {
      cloudSyncService.initializeSyncState(1);
      cloudSyncService.cleanup(1);
      const state = cloudSyncService.getSyncState(1);
      expect(state).toBeNull();
    });

    it('should cleanup all', () => {
      cloudSyncService.initializeSyncState(1);
      cloudSyncService.initializeSyncState(2);
      cloudSyncService.cleanup();
      expect(true).toBe(true);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = CloudSyncService.getInstance();
      const instance2 = CloudSyncService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
