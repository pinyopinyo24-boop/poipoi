/**
 * SystemDashboard Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { systemDashboard, SystemDashboard } from './SystemDashboard';

describe('SystemDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    systemDashboard.cleanup();
  });

  afterEach(() => {
    systemDashboard.cleanup();
  });

  // === メトリクス記録テスト ===
  describe('Record Metrics', () => {
    it('should record metrics', () => {
      const metrics = systemDashboard.recordMetrics(50, 60, 40, 10, 100, 1000, 1);
      expect(metrics).not.toBeNull();
      expect(metrics.cpuUsage).toBe(50);
    });

    it('should get latest metrics', () => {
      systemDashboard.recordMetrics(50, 60, 40, 10, 100, 1000, 1);
      const latest = systemDashboard.getLatestMetrics();
      expect(latest).not.toBeNull();
      expect(latest?.cpuUsage).toBe(50);
    });

    it('should get metrics history', () => {
      systemDashboard.recordMetrics(50, 60, 40, 10, 100, 1000, 1);
      systemDashboard.recordMetrics(55, 65, 45, 12, 110, 1100, 1.5);
      const history = systemDashboard.getMetricsHistory(10);
      expect(history.length).toBe(2);
    });
  });

  // === アラート管理テスト ===
  describe('Alert Management', () => {
    it('should create alert', () => {
      const alert = systemDashboard.createAlert('warning', 'Test alert');
      expect(alert).not.toBeNull();
      expect(alert.severity).toBe('warning');
    });

    it('should get alert', () => {
      const created = systemDashboard.createAlert('error', 'Test error');
      const retrieved = systemDashboard.getAlert(created.id);
      expect(retrieved).not.toBeNull();
    });

    it('should get unresolved alerts', () => {
      systemDashboard.createAlert('warning', 'Alert 1');
      systemDashboard.createAlert('error', 'Alert 2');
      const unresolved = systemDashboard.getUnresolvedAlerts();
      expect(unresolved.length).toBe(2);
    });

    it('should resolve alert', () => {
      const created = systemDashboard.createAlert('warning', 'Test alert');
      const resolved = systemDashboard.resolveAlert(created.id);
      expect(resolved?.resolved).toBe(true);
    });
  });

  // === 自動アラート生成テスト ===
  describe('Auto Alert Generation', () => {
    it('should generate critical alert on high CPU', () => {
      systemDashboard.recordMetrics(95, 60, 40, 10, 100, 1000, 1);
      const alerts = systemDashboard.getUnresolvedAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should generate warning alert on high memory', () => {
      systemDashboard.recordMetrics(50, 90, 40, 10, 100, 1000, 1);
      const alerts = systemDashboard.getUnresolvedAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  // === ウィジェット管理テスト ===
  describe('Widget Management', () => {
    it('should add widget', () => {
      const widget = systemDashboard.addWidget('CPU Usage', 'metric', { value: 50 });
      expect(widget).not.toBeNull();
    });

    it('should get widget', () => {
      const added = systemDashboard.addWidget('CPU Usage', 'metric', { value: 50 });
      const retrieved = systemDashboard.getWidget(added.id);
      expect(retrieved).not.toBeNull();
    });

    it('should get all widgets', () => {
      systemDashboard.addWidget('Widget 1', 'metric', { value: 50 });
      systemDashboard.addWidget('Widget 2', 'chart', { data: [] });
      const widgets = systemDashboard.getAllWidgets();
      expect(widgets.length).toBe(2);
    });
  });

  // === ダッシュボードサマリーテスト ===
  describe('Dashboard Summary', () => {
    it('should get dashboard summary', () => {
      systemDashboard.recordMetrics(50, 60, 40, 10, 100, 1000, 1);
      const summary = systemDashboard.getDashboardSummary();
      expect(summary.latestMetrics).not.toBeNull();
    });

    it('should determine system health', () => {
      systemDashboard.recordMetrics(50, 60, 40, 10, 100, 1000, 1);
      const summary = systemDashboard.getDashboardSummary();
      expect(['healthy', 'warning', 'critical']).toContain(summary.systemHealth);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = SystemDashboard.getInstance();
      const instance2 = SystemDashboard.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
