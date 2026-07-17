/**
 * ComplianceRepository Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { complianceRepository, ComplianceRepository } from './ComplianceRepository';

describe('ComplianceRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    complianceRepository.cleanup();
  });

  afterEach(() => {
    complianceRepository.cleanup();
  });

  // === データ保存テスト ===
  describe('Save Data', () => {
    it('should save data', () => {
      const data = complianceRepository.save(1, 'check', { name: 'Check 1' });
      expect(data).not.toBeNull();
      expect(data.userId).toBe(1);
    });

    it('should find by id', () => {
      const saved = complianceRepository.save(1, 'check', { name: 'Check 1' });
      const found = complianceRepository.findById(saved.id);
      expect(found).not.toBeNull();
    });

    it('should find by user id', () => {
      complianceRepository.save(1, 'check', { name: 'Check 1' });
      complianceRepository.save(1, 'violation', { name: 'Violation 1' });
      const data = complianceRepository.findByUserId(1);
      expect(data.length).toBe(2);
    });

    it('should find by type', () => {
      complianceRepository.save(1, 'check', { name: 'Check 1' });
      complianceRepository.save(2, 'check', { name: 'Check 2' });
      const data = complianceRepository.findByType('check');
      expect(data.length).toBe(2);
    });
  });

  // === クエリテスト ===
  describe('Query', () => {
    it('should query by user', () => {
      complianceRepository.save(1, 'check', { name: 'Check 1' });
      const results = complianceRepository.query({ userId: 1 });
      expect(results.length).toBe(1);
    });

    it('should query by type', () => {
      complianceRepository.save(1, 'check', { name: 'Check 1' });
      complianceRepository.save(1, 'violation', { name: 'Violation 1' });
      const results = complianceRepository.query({ type: 'check' });
      expect(results.length).toBe(1);
    });

    it('should query with pagination', () => {
      for (let i = 0; i < 10; i++) {
        complianceRepository.save(1, 'check', { name: `Check ${i}` });
      }
      const results = complianceRepository.query({ limit: 5, offset: 0 });
      expect(results.length).toBe(5);
    });
  });

  // === データ更新テスト ===
  describe('Update Data', () => {
    it('should update data', () => {
      const saved = complianceRepository.save(1, 'check', { name: 'Check 1' });
      const updated = complianceRepository.update(saved.id, { name: 'Updated Check' });
      expect(updated?.data.name).toBe('Updated Check');
    });
  });

  // === データ削除テスト ===
  describe('Delete Data', () => {
    it('should delete data', () => {
      const saved = complianceRepository.save(1, 'check', { name: 'Check 1' });
      const result = complianceRepository.delete(saved.id);
      expect(result).toBe(true);
    });
  });

  // === 統計情報テスト ===
  describe('Get Stats', () => {
    it('should get stats', () => {
      complianceRepository.save(1, 'check', { name: 'Check 1' });
      complianceRepository.save(1, 'violation', { name: 'Violation 1' });
      complianceRepository.save(2, 'check', { name: 'Check 2' });
      const stats = complianceRepository.getStats();
      expect(stats.totalData).toBe(3);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup specific user', () => {
      complianceRepository.save(1, 'check', { name: 'Check 1' });
      complianceRepository.cleanup(1);
      const data = complianceRepository.findByUserId(1);
      expect(data.length).toBe(0);
    });

    it('should cleanup all', () => {
      complianceRepository.save(1, 'check', { name: 'Check 1' });
      complianceRepository.save(2, 'violation', { name: 'Violation 1' });
      complianceRepository.cleanup();
      const data1 = complianceRepository.findByUserId(1);
      const data2 = complianceRepository.findByUserId(2);
      expect(data1.length).toBe(0);
      expect(data2.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = ComplianceRepository.getInstance();
      const instance2 = ComplianceRepository.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
