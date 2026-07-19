/**
 * ManufacturingMonitorPanel Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { manufacturingMonitorPanel, ManufacturingMonitorPanel } from './ManufacturingMonitorPanel';

describe('ManufacturingMonitorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    manufacturingMonitorPanel.cleanup();
  });

  afterEach(() => {
    manufacturingMonitorPanel.cleanup();
  });

  // === 生産ライン管理テスト ===
  describe('Production Line Management', () => {
    it('should update production line', () => {
      const line = manufacturingMonitorPanel.updateProductionLine('Line-A', 'running', 85, 98, 1000, 20);
      expect(line).not.toBeNull();
      expect(line.status).toBe('running');
    });

    it('should get production line', () => {
      manufacturingMonitorPanel.updateProductionLine('Line-A', 'running', 85, 98, 1000, 20);
      const line = manufacturingMonitorPanel.getProductionLine('Line-A');
      expect(line).not.toBeNull();
      expect(line?.efficiency).toBe(85);
    });

    it('should get all production lines', () => {
      manufacturingMonitorPanel.updateProductionLine('Line-A', 'running', 85, 98, 1000, 20);
      manufacturingMonitorPanel.updateProductionLine('Line-B', 'idle', 0, 100, 0, 0);
      const lines = manufacturingMonitorPanel.getAllProductionLines();
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  // === 効率メトリクステスト ===
  describe('Efficiency Metrics', () => {
    it('should record efficiency metric', () => {
      const metric = manufacturingMonitorPanel.recordEfficiencyMetric('Line-A', 85, 100, 5, 0.85);
      expect(metric).not.toBeNull();
      expect(metric.efficiency).toBe(85);
    });

    it('should get efficiency metrics', () => {
      manufacturingMonitorPanel.recordEfficiencyMetric('Line-A', 85, 100, 5, 0.85);
      manufacturingMonitorPanel.recordEfficiencyMetric('Line-A', 87, 105, 3, 0.87);
      const metrics = manufacturingMonitorPanel.getEfficiencyMetrics('Line-A');
      expect(metrics.length).toBe(2);
    });
  });

  // === 品質レポートテスト ===
  describe('Quality Report', () => {
    it('should generate quality report', () => {
      const report = manufacturingMonitorPanel.generateQualityReport(1000, 20);
      expect(report).not.toBeNull();
      expect(report.defectRate).toBe(2);
    });

    it('should get quality report', () => {
      const created = manufacturingMonitorPanel.generateQualityReport(1000, 20);
      const retrieved = manufacturingMonitorPanel.getQualityReport(created.reportId);
      expect(retrieved).not.toBeNull();
    });

    it('should get quality report history', () => {
      manufacturingMonitorPanel.generateQualityReport(1000, 20);
      manufacturingMonitorPanel.generateQualityReport(1000, 30);
      const history = manufacturingMonitorPanel.getQualityReportHistory();
      expect(history.length).toBe(2);
    });

    it('should generate recommendations for high defect rate', () => {
      const report = manufacturingMonitorPanel.generateQualityReport(1000, 100);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  // === 製造統計テスト ===
  describe('Manufacturing Statistics', () => {
    it('should get manufacturing statistics', () => {
      manufacturingMonitorPanel.updateProductionLine('Line-A', 'running', 85, 98, 1000, 20);
      manufacturingMonitorPanel.updateProductionLine('Line-B', 'idle', 0, 100, 0, 0);
      const stats = manufacturingMonitorPanel.getManufacturingStatistics();
      expect(stats.totalLines).toBeGreaterThan(0);
    });

    it('should count line status', () => {
      manufacturingMonitorPanel.updateProductionLine('Line-A', 'running', 85, 98, 1000, 20);
      manufacturingMonitorPanel.updateProductionLine('Line-B', 'maintenance', 0, 100, 0, 0);
      const stats = manufacturingMonitorPanel.getManufacturingStatistics();
      expect(stats.runningLines).toBeGreaterThan(0);
      expect(stats.maintenanceLines).toBeGreaterThan(0);
    });

    it('should calculate average efficiency', () => {
      manufacturingMonitorPanel.updateProductionLine('Line-A', 'running', 80, 98, 1000, 20);
      manufacturingMonitorPanel.updateProductionLine('Line-B', 'running', 90, 98, 1000, 20);
      const stats = manufacturingMonitorPanel.getManufacturingStatistics();
      expect(stats.averageEfficiency).toBe(85);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup', () => {
      manufacturingMonitorPanel.updateProductionLine('Line-A', 'running', 85, 98, 1000, 20);
      manufacturingMonitorPanel.cleanup();
      const lines = manufacturingMonitorPanel.getAllProductionLines();
      expect(lines.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = ManufacturingMonitorPanel.getInstance();
      const instance2 = ManufacturingMonitorPanel.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
