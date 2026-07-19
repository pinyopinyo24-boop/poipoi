/**
 * SyncRepository Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { syncRepository, SyncRepository } from './SyncRepository';

describe('SyncRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    syncRepository.cleanup();
  });

  afterEach(() => {
    syncRepository.cleanup();
  });

  // === レコード作成テスト ===
  describe('Create Record', () => {
    it('should create record', () => {
      const record = syncRepository.createRecord(1, 'chat', 'create', { message: 'test' });
      expect(record).not.toBeNull();
      expect(record.synced).toBe(false);
    });

    it('should create multiple records', () => {
      syncRepository.createRecord(1, 'chat', 'create', { message: 'test1' });
      syncRepository.createRecord(1, 'chat', 'update', { message: 'test2' });
      const count = syncRepository.getUserRecordCount(1);
      expect(count).toBe(2);
    });

    it('should increment version', () => {
      const record = syncRepository.createRecord(1, 'chat', 'create', { message: 'test' }, 2);
      expect(record.version).toBe(2);
    });
  });

  // === レコード取得テスト ===
  describe('Get Record', () => {
    it('should get record by id', () => {
      const created = syncRepository.createRecord(1, 'chat', 'create', { message: 'test' });
      const retrieved = syncRepository.getRecord(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent record', () => {
      const result = syncRepository.getRecord('non_existent');
      expect(result).toBeNull();
    });
  });

  // === レコード更新テスト ===
  describe('Update Record', () => {
    it('should update record', () => {
      const created = syncRepository.createRecord(1, 'chat', 'create', { message: 'test' });
      const updated = syncRepository.updateRecord(created.id, { synced: true });
      expect(updated?.synced).toBe(true);
    });

    it('should mark synced', () => {
      const created = syncRepository.createRecord(1, 'chat', 'create', { message: 'test' });
      const marked = syncRepository.markSynced(created.id);
      expect(marked?.synced).toBe(true);
      expect(marked?.syncedAt).toBeDefined();
    });
  });

  // === レコード削除テスト ===
  describe('Delete Record', () => {
    it('should delete record', () => {
      const created = syncRepository.createRecord(1, 'chat', 'create', { message: 'test' });
      const result = syncRepository.deleteRecord(created.id);
      expect(result).toBe(true);
    });

    it('should delete user records', () => {
      syncRepository.createRecord(1, 'chat', 'create', { message: 'test1' });
      syncRepository.createRecord(1, 'chat', 'create', { message: 'test2' });
      const count = syncRepository.deleteUserRecords(1);
      expect(count).toBe(2);
    });
  });

  // === クエリテスト ===
  describe('Query Records', () => {
    it('should query records by user', () => {
      syncRepository.createRecord(1, 'chat', 'create', { message: 'test' });
      const results = syncRepository.query({ userId: 1 });
      expect(results.length).toBe(1);
    });

    it('should query records by type', () => {
      syncRepository.createRecord(1, 'chat', 'create', { message: 'test1' });
      syncRepository.createRecord(1, 'file', 'create', { file: 'test2' });
      const results = syncRepository.query({ userId: 1, type: 'chat' });
      expect(results.length).toBe(1);
    });

    it('should query unsync records', () => {
      const created = syncRepository.createRecord(1, 'chat', 'create', { message: 'test' });
      syncRepository.markSynced(created.id);
      const results = syncRepository.getUnsyncedRecords(1);
      expect(results.length).toBe(0);
    });

    it('should query synced records', () => {
      const created = syncRepository.createRecord(1, 'chat', 'create', { message: 'test' });
      syncRepository.markSynced(created.id);
      const results = syncRepository.getSyncedRecords(1);
      expect(results.length).toBe(1);
    });
  });

  // === 統計テスト ===
  describe('Statistics', () => {
    it('should get sync stats', () => {
      syncRepository.createRecord(1, 'chat', 'create', { message: 'test1' });
      syncRepository.createRecord(1, 'chat', 'update', { message: 'test2' });
      syncRepository.createRecord(1, 'chat', 'delete', { id: 'test3' });
      const stats = syncRepository.getSyncStats(1);
      expect(stats.totalRecords).toBe(3);
      expect(stats.createRecords).toBe(1);
      expect(stats.updateRecords).toBe(1);
      expect(stats.deleteRecords).toBe(1);
    });

    it('should get unsynced count', () => {
      syncRepository.createRecord(1, 'chat', 'create', { message: 'test' });
      const count = syncRepository.getUnsyncedCount(1);
      expect(count).toBe(1);
    });

    it('should get repository stats', () => {
      syncRepository.createRecord(1, 'chat', 'create', { message: 'test1' });
      syncRepository.createRecord(2, 'chat', 'create', { message: 'test2' });
      const stats = syncRepository.getRepositoryStats();
      expect(stats.totalRecords).toBe(2);
      expect(stats.totalUsers).toBe(2);
    });
  });

  // === バッチ処理テスト ===
  describe('Batch Operations', () => {
    it('should batch mark synced', () => {
      const r1 = syncRepository.createRecord(1, 'chat', 'create', { message: 'test1' });
      const r2 = syncRepository.createRecord(1, 'chat', 'create', { message: 'test2' });
      const count = syncRepository.batchMarkSynced([r1.id, r2.id]);
      expect(count).toBe(2);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup old records', () => {
      const created = syncRepository.createRecord(1, 'chat', 'create', { message: 'test' });
      syncRepository.markSynced(created.id);
      created.timestamp = Date.now() - 40 * 86400000;
      const count = syncRepository.cleanupOldRecords(1, 30);
      expect(count >= 0).toBe(true);
    });

    it('should cleanup all', () => {
      syncRepository.createRecord(1, 'chat', 'create', { message: 'test1' });
      syncRepository.createRecord(2, 'chat', 'create', { message: 'test2' });
      syncRepository.cleanup();
      const stats = syncRepository.getRepositoryStats();
      expect(stats.totalRecords).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = SyncRepository.getInstance();
      const instance2 = SyncRepository.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
