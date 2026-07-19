/**
 * HealthManager Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { healthManager, HealthManager } from './HealthManager';

describe('HealthManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    healthManager.cleanup();
  });

  afterEach(() => {
    healthManager.cleanup();
  });

  // === コンポーネント状態管理テスト ===
  describe('Component Health Management', () => {
    it('should update component health', () => {
      const health = healthManager.updateComponentHealth('SecurityAIManager', 'healthy', 100, 0, 99.5);
      expect(health).not.toBeNull();
      expect(health.status).toBe('healthy');
    });

    it('should get component health', () => {
      healthManager.updateComponentHealth('SecurityAIManager', 'healthy', 100, 0, 99.5);
      const health = healthManager.getComponentHealth('SecurityAIManager');
      expect(health).not.toBeNull();
      expect(health?.componentName).toBe('SecurityAIManager');
    });

    it('should get all component statuses', () => {
      healthManager.updateComponentHealth('SecurityAIManager', 'healthy', 100, 0, 99.5);
      healthManager.updateComponentHealth('Database', 'degraded', 200, 5, 95);
      const statuses = healthManager.getAllComponentStatuses();
      expect(statuses.length).toBeGreaterThan(0);
    });
  });

  // === ヘルスレポート生成テスト ===
  describe('Health Report Generation', () => {
    it('should generate health report', () => {
      healthManager.updateComponentHealth('SecurityAIManager', 'healthy', 100, 0, 99.5);
      const report = healthManager.generateHealthReport();
      expect(report).not.toBeNull();
      expect(['healthy', 'warning', 'critical']).toContain(report.overallHealth);
    });

    it('should get health report', () => {
      const created = healthManager.generateHealthReport();
      const retrieved = healthManager.getHealthReport(created.reportId);
      expect(retrieved).not.toBeNull();
    });

    it('should get latest health report', () => {
      healthManager.generateHealthReport();
      const latest = healthManager.getLatestHealthReport();
      expect(latest).not.toBeNull();
    });

    it('should get health report history', () => {
      healthManager.generateHealthReport();
      healthManager.generateHealthReport();
      const history = healthManager.getHealthReportHistory();
      expect(history.length).toBe(2);
    });
  });

  // === ヘルス分析テスト ===
  describe('Health Analysis', () => {
    it('should detect critical issues', () => {
      healthManager.updateComponentHealth('SecurityAIManager', 'down', 0, 100, 0);
      const report = healthManager.generateHealthReport();
      expect(report.overallHealth).toBe('critical');
    });

    it('should detect warning issues', () => {
      healthManager.updateComponentHealth('SecurityAIManager', 'degraded', 200, 10, 90);
      const report = healthManager.generateHealthReport();
      expect(report.overallHealth).toBe('warning');
    });

    it('should generate recommendations', () => {
      healthManager.updateComponentHealth('SecurityAIManager', 'down', 0, 100, 0);
      const report = healthManager.generateHealthReport();
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  // === ヘルス統計テスト ===
  describe('Health Statistics', () => {
    it('should get health statistics', () => {
      healthManager.updateComponentHealth('SecurityAIManager', 'healthy', 100, 0, 99.5);
      healthManager.updateComponentHealth('Database', 'degraded', 200, 5, 95);
      const stats = healthManager.getHealthStatistics();
      expect(stats.totalComponents).toBeGreaterThan(0);
    });

    it('should count component status', () => {
      healthManager.updateComponentHealth('SecurityAIManager', 'healthy', 100, 0, 99.5);
      healthManager.updateComponentHealth('Database', 'down', 0, 100, 0);
      const stats = healthManager.getHealthStatistics();
      expect(stats.healthyComponents).toBeGreaterThan(0);
      expect(stats.downComponents).toBeGreaterThan(0);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup', () => {
      healthManager.updateComponentHealth('SecurityAIManager', 'healthy', 100, 0, 99.5);
      healthManager.cleanup();
      const statuses = healthManager.getAllComponentStatuses();
      expect(statuses.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = HealthManager.getInstance();
      const instance2 = HealthManager.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
