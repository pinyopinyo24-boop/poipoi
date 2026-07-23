/**
 * AIStatusMonitor Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { aiStatusMonitor, AIStatusMonitor } from './AIStatusMonitor';

describe('AIStatusMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiStatusMonitor.cleanup();
  });

  afterEach(() => {
    aiStatusMonitor.cleanup();
  });

  // === サービス状態更新テスト ===
  describe('Update Service Status', () => {
    it('should update service status', () => {
      const status = aiStatusMonitor.updateServiceStatus('SecurityAIManager', 'healthy', 100, 99.5);
      expect(status).not.toBeNull();
      expect(status.status).toBe('healthy');
    });

    it('should get service status', () => {
      aiStatusMonitor.updateServiceStatus('SecurityAIManager', 'healthy', 100, 99.5);
      const status = aiStatusMonitor.getServiceStatus('SecurityAIManager');
      expect(status).not.toBeNull();
      expect(status?.serviceName).toBe('SecurityAIManager');
    });

    it('should get all service statuses', () => {
      aiStatusMonitor.updateServiceStatus('SecurityAIManager', 'healthy', 100, 99.5);
      aiStatusMonitor.updateServiceStatus('GovernanceAIManager', 'degraded', 200, 95);
      const statuses = aiStatusMonitor.getAllServiceStatuses();
      expect(statuses.length).toBeGreaterThan(0);
    });
  });

  // === パフォーマンスメトリクステスト ===
  describe('Performance Metrics', () => {
    it('should record performance', () => {
      const metric = aiStatusMonitor.recordPerformance('SecurityAIManager', 1000, 995, 5, 150, 500, 50);
      expect(metric).not.toBeNull();
      expect(metric.successCount).toBe(995);
    });

    it('should get performance metrics', () => {
      aiStatusMonitor.recordPerformance('SecurityAIManager', 1000, 995, 5, 150, 500, 50);
      aiStatusMonitor.recordPerformance('SecurityAIManager', 1000, 990, 10, 160, 600, 60);
      const metrics = aiStatusMonitor.getPerformanceMetrics('SecurityAIManager');
      expect(metrics.length).toBe(2);
    });
  });

  // === ヘルスチェックテスト ===
  describe('Health Check', () => {
    it('should perform health check', () => {
      aiStatusMonitor.updateServiceStatus('SecurityAIManager', 'healthy', 100, 99.5);
      const result = aiStatusMonitor.performHealthCheck();
      expect(result).not.toBeNull();
      expect(['healthy', 'warning', 'critical']).toContain(result.overallHealth);
    });

    it('should get latest health check', () => {
      aiStatusMonitor.performHealthCheck();
      const latest = aiStatusMonitor.getLatestHealthCheck();
      expect(latest).not.toBeNull();
    });

    it('should get health check history', () => {
      aiStatusMonitor.performHealthCheck();
      aiStatusMonitor.performHealthCheck();
      const history = aiStatusMonitor.getHealthCheckHistory(10);
      expect(history.length).toBe(2);
    });
  });

  // === サービス統計テスト ===
  describe('Service Statistics', () => {
    it('should get service statistics', () => {
      aiStatusMonitor.updateServiceStatus('SecurityAIManager', 'healthy', 100, 99.5);
      aiStatusMonitor.updateServiceStatus('GovernanceAIManager', 'degraded', 200, 95);
      const stats = aiStatusMonitor.getServiceStatistics();
      expect(stats.totalServices).toBeGreaterThan(0);
    });

    it('should count healthy services', () => {
      aiStatusMonitor.updateServiceStatus('SecurityAIManager', 'healthy', 100, 99.5);
      const stats = aiStatusMonitor.getServiceStatistics();
      expect(stats.healthyServices).toBeGreaterThan(0);
    });

    it('should detect down services', () => {
      aiStatusMonitor.updateServiceStatus('SecurityAIManager', 'down', 0, 0);
      const stats = aiStatusMonitor.getServiceStatistics();
      expect(stats.downServices).toBeGreaterThan(0);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup', () => {
      aiStatusMonitor.updateServiceStatus('SecurityAIManager', 'healthy', 100, 99.5);
      aiStatusMonitor.cleanup();
      const statuses = aiStatusMonitor.getAllServiceStatuses();
      expect(statuses.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = AIStatusMonitor.getInstance();
      const instance2 = AIStatusMonitor.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
