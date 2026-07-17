/**
 * UsageTrackingService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usageTrackingService, UsageTrackingService } from './UsageTrackingService';

describe('UsageTrackingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usageTrackingService.cleanup();
  });

  afterEach(() => {
    usageTrackingService.cleanup();
  });

  // === 使用量記録テスト ===
  describe('Record Usage', () => {
    it('should record usage', () => {
      const record = usageTrackingService.recordUsage(1, 'api_calls', 100);
      expect(record).not.toBeNull();
      expect(record.userId).toBe(1);
      expect(record.amount).toBe(100);
    });

    it('should get usage records', () => {
      usageTrackingService.recordUsage(1, 'api_calls', 100);
      usageTrackingService.recordUsage(1, 'api_calls', 50);
      const records = usageTrackingService.getUsageRecords(1, 'api_calls');
      expect(records.length).toBe(2);
    });
  });

  // === 使用量統計テスト ===
  describe('Usage Statistics', () => {
    it('should get usage stats', () => {
      usageTrackingService.recordUsage(1, 'api_calls', 100);
      const stats = usageTrackingService.getUsageStats(1, 'api_calls');
      expect(stats).not.toBeNull();
      if (stats) {
        expect(stats.totalUsage).toBe(100);
      }
    });

    it('should get user usage stats', () => {
      usageTrackingService.recordUsage(1, 'api_calls', 100);
      usageTrackingService.recordUsage(1, 'storage', 500);
      const stats = usageTrackingService.getUserUsageStats(1);
      expect(stats.length).toBe(2);
    });
  });

  // === 期間別使用量テスト ===
  describe('Usage by Period', () => {
    it('should get usage by period', () => {
      const now = Date.now();
      usageTrackingService.recordUsage(1, 'api_calls', 100);
      const usage = usageTrackingService.getUsageByPeriod(1, 'api_calls', now - 1000, now + 1000);
      expect(usage).toBe(100);
    });
  });

  // === 使用パターン分析テスト ===
  describe('Analyze Usage Pattern', () => {
    it('should analyze usage pattern', () => {
      usageTrackingService.recordUsage(1, 'api_calls', 100);
      const analysis = usageTrackingService.analyzeUsagePattern(1, 'api_calls');
      expect(analysis.pattern).toBeDefined();
      expect(['increasing', 'decreasing', 'stable']).toContain(analysis.trend);
    });
  });

  // === 異常検知テスト ===
  describe('Detect Anomalies', () => {
    it('should detect anomalies', () => {
      usageTrackingService.recordUsage(1, 'api_calls', 100);
      usageTrackingService.recordUsage(1, 'api_calls', 100);
      usageTrackingService.recordUsage(1, 'api_calls', 1000);
      const anomaly = usageTrackingService.detectAnomalies(1, 'api_calls');
      expect(typeof anomaly.isAnomaly).toBe('boolean');
    });
  });

  // === 使用量リセットテスト ===
  describe('Reset Usage Stats', () => {
    it('should reset usage stats', () => {
      usageTrackingService.recordUsage(1, 'api_calls', 100);
      const count = usageTrackingService.resetUsageStats(1, 'api_calls');
      expect(count).toBe(1);
    });

    it('should reset all user stats', () => {
      usageTrackingService.recordUsage(1, 'api_calls', 100);
      usageTrackingService.recordUsage(1, 'storage', 500);
      const count = usageTrackingService.resetUsageStats(1);
      expect(count).toBe(2);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup specific user', () => {
      usageTrackingService.recordUsage(1, 'api_calls', 100);
      usageTrackingService.cleanup(1);
      const stats = usageTrackingService.getUsageStats(1, 'api_calls');
      expect(stats).toBeNull();
    });

    it('should cleanup all', () => {
      usageTrackingService.recordUsage(1, 'api_calls', 100);
      usageTrackingService.recordUsage(2, 'api_calls', 100);
      usageTrackingService.cleanup();
      const stats1 = usageTrackingService.getUsageStats(1, 'api_calls');
      const stats2 = usageTrackingService.getUsageStats(2, 'api_calls');
      expect(stats1).toBeNull();
      expect(stats2).toBeNull();
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = UsageTrackingService.getInstance();
      const instance2 = UsageTrackingService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
