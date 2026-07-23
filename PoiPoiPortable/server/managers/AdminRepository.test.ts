/**
 * AdminRepository Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { adminRepository, AdminRepository } from './AdminRepository';

describe('AdminRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminRepository.cleanup();
  });

  afterEach(() => {
    adminRepository.cleanup();
  });

  // === データ保存テスト ===
  describe('Save Data', () => {
    it('should save data', () => {
      const data = adminRepository.save('user', { name: 'Admin User' }, 1);
      expect(data).not.toBeNull();
      expect(data.type).toBe('user');
    });

    it('should find by id', () => {
      const saved = adminRepository.save('user', { name: 'Admin User' }, 1);
      const found = adminRepository.findById(saved.id);
      expect(found).not.toBeNull();
    });

    it('should find by type', () => {
      adminRepository.save('user', { name: 'User 1' }, 1);
      adminRepository.save('user', { name: 'User 2' }, 1);
      const data = adminRepository.findByType('user');
      expect(data.length).toBe(2);
    });

    it('should find by user', () => {
      adminRepository.save('user', { name: 'User 1' }, 1);
      adminRepository.save('system', { name: 'System 1' }, 1);
      const data = adminRepository.findByUser(1);
      expect(data.length).toBe(2);
    });
  });

  // === クエリテスト ===
  describe('Query', () => {
    it('should query by type', () => {
      adminRepository.save('user', { name: 'User 1' }, 1);
      adminRepository.save('system', { name: 'System 1' }, 1);
      const results = adminRepository.query({ type: 'user' });
      expect(results.length).toBe(1);
    });

    it('should query by user', () => {
      adminRepository.save('user', { name: 'User 1' }, 1);
      adminRepository.save('user', { name: 'User 2' }, 2);
      const results = adminRepository.query({ createdBy: 1 });
      expect(results.length).toBe(1);
    });

    it('should query with pagination', () => {
      for (let i = 0; i < 10; i++) {
        adminRepository.save('user', { name: `User ${i}` }, 1);
      }
      const results = adminRepository.query({ limit: 5, offset: 0 });
      expect(results.length).toBe(5);
    });
  });

  // === データ更新テスト ===
  describe('Update Data', () => {
    it('should update data', () => {
      const saved = adminRepository.save('user', { name: 'User 1' }, 1);
      const updated = adminRepository.update(saved.id, { name: 'Updated User' });
      expect(updated?.data.name).toBe('Updated User');
    });
  });

  // === データ削除テスト ===
  describe('Delete Data', () => {
    it('should delete data', () => {
      const saved = adminRepository.save('user', { name: 'User 1' }, 1);
      const result = adminRepository.delete(saved.id);
      expect(result).toBe(true);
    });
  });

  // === 統計情報テスト ===
  describe('Get Stats', () => {
    it('should get stats', () => {
      adminRepository.save('user', { name: 'User 1' }, 1);
      adminRepository.save('system', { name: 'System 1' }, 1);
      adminRepository.save('user', { name: 'User 2' }, 2);
      const stats = adminRepository.getStats();
      expect(stats.totalData).toBe(3);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup', () => {
      adminRepository.save('user', { name: 'User 1' }, 1);
      adminRepository.cleanup();
      const data = adminRepository.findByType('user');
      expect(data.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = AdminRepository.getInstance();
      const instance2 = AdminRepository.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
