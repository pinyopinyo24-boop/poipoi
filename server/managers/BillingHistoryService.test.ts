/**
 * BillingHistoryService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { billingHistoryService, BillingHistoryService } from './BillingHistoryService';

describe('BillingHistoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    billingHistoryService.cleanup();
  });

  afterEach(() => {
    billingHistoryService.cleanup();
  });

  // === 請求記録作成テスト ===
  describe('Create Billing Record', () => {
    it('should create billing record', () => {
      const record = billingHistoryService.createBillingRecord(
        1,
        'sub_123',
        99.99,
        'USD',
        'Monthly subscription'
      );
      expect(record).not.toBeNull();
      expect(record.status).toBe('pending');
    });

    it('should get billing record', () => {
      const created = billingHistoryService.createBillingRecord(
        1,
        'sub_123',
        99.99,
        'USD',
        'Monthly subscription'
      );
      const retrieved = billingHistoryService.getBillingRecord(created.id);
      expect(retrieved).not.toBeNull();
    });

    it('should get user billing records', () => {
      billingHistoryService.createBillingRecord(1, 'sub_123', 99.99, 'USD', 'Monthly subscription');
      billingHistoryService.createBillingRecord(1, 'sub_123', 99.99, 'USD', 'Monthly subscription');
      const records = billingHistoryService.getUserBillingRecords(1);
      expect(records.length).toBe(2);
    });
  });

  // === 支払い状態管理テスト ===
  describe('Payment Status Management', () => {
    it('should mark as paid', () => {
      const record = billingHistoryService.createBillingRecord(
        1,
        'sub_123',
        99.99,
        'USD',
        'Monthly subscription'
      );
      const paid = billingHistoryService.markAsPaid(record.id);
      expect(paid?.status).toBe('completed');
      expect(paid?.paidDate).toBeDefined();
    });

    it('should mark as failed', () => {
      const record = billingHistoryService.createBillingRecord(
        1,
        'sub_123',
        99.99,
        'USD',
        'Monthly subscription'
      );
      const failed = billingHistoryService.markAsFailed(record.id);
      expect(failed?.status).toBe('failed');
    });

    it('should refund', () => {
      const record = billingHistoryService.createBillingRecord(
        1,
        'sub_123',
        99.99,
        'USD',
        'Monthly subscription'
      );
      const refunded = billingHistoryService.refund(record.id);
      expect(refunded?.status).toBe('refunded');
    });
  });

  // === 期限切れ請求テスト ===
  describe('Overdue Records', () => {
    it('should get overdue records', () => {
      const record = billingHistoryService.createBillingRecord(
        1,
        'sub_123',
        99.99,
        'USD',
        'Monthly subscription'
      );
      record.dueDate = Date.now() - 1000;
      const overdue = billingHistoryService.getOverdueRecords(1);
      expect(Array.isArray(overdue)).toBe(true);
    });
  });

  // === 請求統計テスト ===
  describe('Billing Statistics', () => {
    it('should get billing stats', () => {
      billingHistoryService.createBillingRecord(1, 'sub_123', 99.99, 'USD', 'Monthly subscription');
      const stats = billingHistoryService.getBillingStats(1);
      expect(stats.totalBilled).toBe(99.99);
      expect(stats.recordCount).toBe(1);
    });

    it('should get billing stats by period', () => {
      const now = Date.now();
      billingHistoryService.createBillingRecord(1, 'sub_123', 99.99, 'USD', 'Monthly subscription');
      const stats = billingHistoryService.getBillingStatsByPeriod(1, now - 1000, now + 1000);
      expect(stats.totalAmount).toBe(99.99);
    });
  });

  // === 請求レポート生成テスト ===
  describe('Generate Billing Report', () => {
    it('should generate billing report', () => {
      billingHistoryService.createBillingRecord(1, 'sub_123', 99.99, 'USD', 'Monthly subscription');
      const report = billingHistoryService.generateBillingReport(1);
      expect(report.userId).toBe(1);
      expect(report.totalRecords).toBe(1);
      expect(report.totalAmount).toBe(99.99);
    });
  });

  // === 請求記録更新テスト ===
  describe('Update Billing Record', () => {
    it('should update billing record', () => {
      const record = billingHistoryService.createBillingRecord(
        1,
        'sub_123',
        99.99,
        'USD',
        'Monthly subscription'
      );
      const updated = billingHistoryService.updateBillingRecord(record.id, {
        description: 'Updated description',
      });
      expect(updated?.description).toBe('Updated description');
    });
  });

  // === 請求記録削除テスト ===
  describe('Delete Billing Record', () => {
    it('should delete billing record', () => {
      const record = billingHistoryService.createBillingRecord(
        1,
        'sub_123',
        99.99,
        'USD',
        'Monthly subscription'
      );
      const result = billingHistoryService.deleteBillingRecord(record.id);
      expect(result).toBe(true);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup specific user', () => {
      billingHistoryService.createBillingRecord(1, 'sub_123', 99.99, 'USD', 'Monthly subscription');
      billingHistoryService.cleanup(1);
      const records = billingHistoryService.getUserBillingRecords(1);
      expect(records.length).toBe(0);
    });

    it('should cleanup all', () => {
      billingHistoryService.createBillingRecord(1, 'sub_123', 99.99, 'USD', 'Monthly subscription');
      billingHistoryService.createBillingRecord(2, 'sub_123', 99.99, 'USD', 'Monthly subscription');
      billingHistoryService.cleanup();
      const records1 = billingHistoryService.getUserBillingRecords(1);
      const records2 = billingHistoryService.getUserBillingRecords(2);
      expect(records1.length).toBe(0);
      expect(records2.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = BillingHistoryService.getInstance();
      const instance2 = BillingHistoryService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
