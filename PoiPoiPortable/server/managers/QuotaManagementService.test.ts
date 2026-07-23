/**
 * QuotaManagementService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { quotaManagementService, QuotaManagementService } from './QuotaManagementService';

describe('QuotaManagementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    quotaManagementService.cleanup();
  });

  afterEach(() => {
    quotaManagementService.cleanup();
  });

  // === クォータ作成テスト ===
  describe('Create Quota', () => {
    it('should create quota', () => {
      const quota = quotaManagementService.createQuota(
        1,
        'api_calls',
        1000,
        Date.now() + 86400000
      );
      expect(quota).not.toBeNull();
      expect(quota.limit).toBe(1000);
      expect(quota.remaining).toBe(1000);
    });

    it('should get quota', () => {
      const created = quotaManagementService.createQuota(
        1,
        'api_calls',
        1000,
        Date.now() + 86400000
      );
      const retrieved = quotaManagementService.getQuota(created.id);
      expect(retrieved).not.toBeNull();
    });

    it('should get user quotas', () => {
      quotaManagementService.createQuota(1, 'api_calls', 1000, Date.now() + 86400000);
      quotaManagementService.createQuota(1, 'storage', 5000, Date.now() + 86400000);
      const quotas = quotaManagementService.getUserQuotas(1);
      expect(quotas.length).toBe(2);
    });
  });

  // === クォータ使用テスト ===
  describe('Use Quota', () => {
    it('should use quota', () => {
      const quota = quotaManagementService.createQuota(
        1,
        'api_calls',
        1000,
        Date.now() + 86400000
      );
      const result = quotaManagementService.useQuota(quota.id, 100);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(900);
    });

    it('should not exceed quota', () => {
      const quota = quotaManagementService.createQuota(
        1,
        'api_calls',
        100,
        Date.now() + 86400000
      );
      const result = quotaManagementService.useQuota(quota.id, 150);
      expect(result.success).toBe(false);
    });

    it('should detect warning', () => {
      const quota = quotaManagementService.createQuota(
        1,
        'api_calls',
        100,
        Date.now() + 86400000,
        80
      );
      quotaManagementService.useQuota(quota.id, 85);
      const updated = quotaManagementService.getQuota(quota.id);
      expect(updated?.isWarning).toBe(true);
    });
  });

  // === クォータ使用状況テスト ===
  describe('Get Quota Usage', () => {
    it('should get quota usage', () => {
      const quota = quotaManagementService.createQuota(
        1,
        'api_calls',
        1000,
        Date.now() + 86400000
      );
      quotaManagementService.useQuota(quota.id, 250);
      const usage = quotaManagementService.getQuotaUsage(quota.id);
      expect(usage?.used).toBe(250);
      expect(usage?.percentage).toBe(25);
    });
  });

  // === クォータ警告確認テスト ===
  describe('Check Warnings', () => {
    it('should check warnings', () => {
      const quota = quotaManagementService.createQuota(
        1,
        'api_calls',
        100,
        Date.now() + 86400000,
        80
      );
      quotaManagementService.useQuota(quota.id, 85);
      const warnings = quotaManagementService.checkWarnings(1);
      expect(warnings.length).toBe(1);
    });
  });

  // === クォータリセットテスト ===
  describe('Reset Quota', () => {
    it('should reset quota', () => {
      const quota = quotaManagementService.createQuota(
        1,
        'api_calls',
        1000,
        Date.now() + 86400000
      );
      quotaManagementService.useQuota(quota.id, 500);
      const reset = quotaManagementService.resetQuota(quota.id);
      expect(reset?.used).toBe(0);
      expect(reset?.remaining).toBe(1000);
    });
  });

  // === クォータ制限更新テスト ===
  describe('Update Quota Limit', () => {
    it('should update quota limit', () => {
      const quota = quotaManagementService.createQuota(
        1,
        'api_calls',
        1000,
        Date.now() + 86400000
      );
      const updated = quotaManagementService.updateQuotaLimit(quota.id, 2000);
      expect(updated?.limit).toBe(2000);
    });
  });

  // === クォータ警告閾値更新テスト ===
  describe('Update Warning Threshold', () => {
    it('should update warning threshold', () => {
      const quota = quotaManagementService.createQuota(
        1,
        'api_calls',
        1000,
        Date.now() + 86400000,
        80
      );
      const updated = quotaManagementService.updateWarningThreshold(quota.id, 90);
      expect(updated?.warningThreshold).toBe(90);
    });
  });

  // === 期限切れクォータ確認テスト ===
  describe('Check Expired Quotas', () => {
    it('should check expired quotas', () => {
      quotaManagementService.createQuota(1, 'api_calls', 1000, Date.now() - 1000);
      const expired = quotaManagementService.checkExpiredQuotas();
      expect(Array.isArray(expired)).toBe(true);
    });
  });

  // === クォータ統計テスト ===
  describe('Get Quota Stats', () => {
    it('should get quota stats', () => {
      quotaManagementService.createQuota(1, 'api_calls', 1000, Date.now() + 86400000);
      const stats = quotaManagementService.getQuotaStats(1);
      expect(stats.totalQuotas).toBe(1);
    });
  });

  // === クォータ削除テスト ===
  describe('Delete Quota', () => {
    it('should delete quota', () => {
      const quota = quotaManagementService.createQuota(
        1,
        'api_calls',
        1000,
        Date.now() + 86400000
      );
      const result = quotaManagementService.deleteQuota(quota.id);
      expect(result).toBe(true);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup specific user', () => {
      quotaManagementService.createQuota(1, 'api_calls', 1000, Date.now() + 86400000);
      quotaManagementService.cleanup(1);
      const quotas = quotaManagementService.getUserQuotas(1);
      expect(quotas.length).toBe(0);
    });

    it('should cleanup all', () => {
      quotaManagementService.createQuota(1, 'api_calls', 1000, Date.now() + 86400000);
      quotaManagementService.createQuota(2, 'api_calls', 1000, Date.now() + 86400000);
      quotaManagementService.cleanup();
      const quotas1 = quotaManagementService.getUserQuotas(1);
      const quotas2 = quotaManagementService.getUserQuotas(2);
      expect(quotas1.length).toBe(0);
      expect(quotas2.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = QuotaManagementService.getInstance();
      const instance2 = QuotaManagementService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
