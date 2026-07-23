import { describe, it, expect, beforeEach } from 'vitest';
import { ProductionReadinessManager } from './ProductionReadinessManager';

describe('ProductionReadinessManager', () => {
  let manager: ProductionReadinessManager;

  beforeEach(() => {
    manager = new ProductionReadinessManager();
  });

  describe('createCheckpoint', () => {
    it('should create a checkpoint', () => {
      const checkpoint = manager.createCheckpoint('performance', 'passed', 'Performance OK');

      expect(checkpoint).toBeDefined();
      expect(checkpoint.category).toBe('performance');
      expect(checkpoint.status).toBe('passed');
      expect(checkpoint.checkpointId).toMatch(/^CHK-/);
    });

    it('should create checkpoint with metrics and recommendations', () => {
      const checkpoint = manager.createCheckpoint(
        'performance',
        'warning',
        'CPU high',
        {
          metrics: { cpu: 85 },
          recommendations: ['Optimize CPU'],
        }
      );

      expect(checkpoint.metrics?.cpu).toBe(85);
      expect(checkpoint.recommendations).toContain('Optimize CPU');
    });
  });

  describe('getCheckpoint', () => {
    it('should retrieve a checkpoint', () => {
      const created = manager.createCheckpoint('performance', 'passed', 'OK');
      const retrieved = manager.getCheckpoint(created.checkpointId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.category).toBe('performance');
    });

    it('should return undefined for non-existent checkpoint', () => {
      expect(manager.getCheckpoint('non-existent')).toBeUndefined();
    });
  });

  describe('getCheckpointsByCategory', () => {
    it('should retrieve checkpoints by category', () => {
      manager.createCheckpoint('performance', 'passed', 'OK');
      manager.createCheckpoint('performance', 'warning', 'Warning');
      manager.createCheckpoint('security', 'passed', 'OK');

      const performance = manager.getCheckpointsByCategory('performance');
      expect(performance.length).toBe(2);
    });
  });

  describe('getCheckpointsByStatus', () => {
    it('should retrieve checkpoints by status', () => {
      manager.createCheckpoint('performance', 'passed', 'OK');
      manager.createCheckpoint('performance', 'passed', 'OK');
      manager.createCheckpoint('security', 'failed', 'Failed');

      const passed = manager.getCheckpointsByStatus('passed');
      expect(passed.length).toBe(2);
    });
  });

  describe('recordMetrics', () => {
    it('should record metrics', () => {
      const metrics = manager.recordMetrics(50, 60, 200, 0.001, 99.9, 1000, 100);

      expect(metrics.cpuUsage).toBe(50);
      expect(metrics.memoryUsage).toBe(60);
      expect(metrics.responseTime).toBe(200);
      expect(metrics.metricsId).toMatch(/^MET-/);
    });
  });

  describe('generateReadinessReport', () => {
    it('should generate a readiness report', () => {
      const checkpoint = manager.createCheckpoint('performance', 'passed', 'OK');
      const metrics = manager.recordMetrics(50, 60, 200, 0.001, 99.9, 1000, 100);

      const report = manager.generateReadinessReport('1.0.0', [checkpoint], metrics);

      expect(report).toBeDefined();
      expect(report.version).toBe('1.0.0');
      expect(report.overallStatus).toBe('ready');
      expect(report.reportId).toMatch(/^RPT-/);
    });

    it('should set status to not_ready if failed checkpoints exist', () => {
      const checkpoint = manager.createCheckpoint('performance', 'failed', 'Failed');
      const metrics = manager.recordMetrics(50, 60, 200, 0.001, 99.9, 1000, 100);

      const report = manager.generateReadinessReport('1.0.0', [checkpoint], metrics);

      expect(report.overallStatus).toBe('not_ready');
    });

    it('should set status to warning if warning checkpoints exist', () => {
      const checkpoint = manager.createCheckpoint('performance', 'warning', 'Warning');
      const metrics = manager.recordMetrics(50, 60, 200, 0.001, 99.9, 1000, 100);

      const report = manager.generateReadinessReport('1.0.0', [checkpoint], metrics);

      expect(report.overallStatus).toBe('warning');
    });
  });

  describe('getReport', () => {
    it('should retrieve a report', () => {
      const checkpoint = manager.createCheckpoint('performance', 'passed', 'OK');
      const metrics = manager.recordMetrics(50, 60, 200, 0.001, 99.9, 1000, 100);
      const created = manager.generateReadinessReport('1.0.0', [checkpoint], metrics);

      const retrieved = manager.getReport(created.reportId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.version).toBe('1.0.0');
    });
  });

  describe('updateReportApprovalStatus', () => {
    it('should update report approval status', () => {
      const checkpoint = manager.createCheckpoint('performance', 'passed', 'OK');
      const metrics = manager.recordMetrics(50, 60, 200, 0.001, 99.9, 1000, 100);
      const report = manager.generateReadinessReport('1.0.0', [checkpoint], metrics);

      const result = manager.updateReportApprovalStatus(report.reportId, 'approved');
      expect(result).toBe(true);

      const updated = manager.getReport(report.reportId);
      expect(updated?.approvalStatus).toBe('approved');
    });
  });

  describe('checkPerformanceMetrics', () => {
    it('should pass performance check for good metrics', () => {
      const metrics = manager.recordMetrics(50, 60, 200, 0.001, 99.9, 1000, 100);
      const checkpoint = manager.checkPerformanceMetrics(metrics);

      expect(checkpoint.status).toBe('passed');
    });

    it('should warn for high CPU usage', () => {
      const metrics = manager.recordMetrics(85, 60, 200, 0.001, 99.9, 1000, 100);
      const checkpoint = manager.checkPerformanceMetrics(metrics);

      expect(checkpoint.status).toBe('warning');
      expect(checkpoint.details).toContain('CPU');
    });

    it('should warn for high memory usage', () => {
      const metrics = manager.recordMetrics(50, 90, 200, 0.001, 99.9, 1000, 100);
      const checkpoint = manager.checkPerformanceMetrics(metrics);

      expect(checkpoint.status).toBe('warning');
      expect(checkpoint.details).toContain('メモリ');
    });
  });

  describe('checkSecurityMetrics', () => {
    it('should pass security check', () => {
      const checkpoint = manager.checkSecurityMetrics();

      expect(checkpoint.status).toBe('passed');
      expect(checkpoint.category).toBe('security');
      expect(checkpoint.recommendations?.length).toBeGreaterThan(0);
    });
  });

  describe('checkStabilityMetrics', () => {
    it('should pass stability check for high uptime', () => {
      const checkpoint = manager.checkStabilityMetrics(99.9);

      expect(checkpoint.status).toBe('passed');
      expect(checkpoint.category).toBe('stability');
    });

    it('should warn for low uptime', () => {
      const checkpoint = manager.checkStabilityMetrics(98.5);

      expect(checkpoint.status).toBe('warning');
    });
  });

  describe('checkComplianceMetrics', () => {
    it('should pass compliance check', () => {
      const checkpoint = manager.checkComplianceMetrics();

      expect(checkpoint.status).toBe('passed');
      expect(checkpoint.category).toBe('compliance');
    });
  });

  describe('checkQualityMetrics', () => {
    it('should pass quality check for good metrics', () => {
      const checkpoint = manager.checkQualityMetrics(90, 99.5);

      expect(checkpoint.status).toBe('passed');
      expect(checkpoint.category).toBe('quality');
    });

    it('should warn for low test coverage', () => {
      const checkpoint = manager.checkQualityMetrics(70, 99.5);

      expect(checkpoint.status).toBe('warning');
      expect(checkpoint.details).toContain('テストカバレッジ');
    });

    it('should warn for low test success rate', () => {
      const checkpoint = manager.checkQualityMetrics(90, 98);

      expect(checkpoint.status).toBe('warning');
      expect(checkpoint.details).toContain('テスト成功率');
    });
  });

  describe('getLatestReport', () => {
    it('should retrieve latest report', () => {
      const checkpoint1 = manager.createCheckpoint('performance', 'passed', 'OK');
      const metrics1 = manager.recordMetrics(50, 60, 200, 0.001, 99.9, 1000, 100);
      const report1 = manager.generateReadinessReport('1.0.0', [checkpoint1], metrics1);

      const checkpoint2 = manager.createCheckpoint('performance', 'passed', 'OK');
      const metrics2 = manager.recordMetrics(50, 60, 200, 0.001, 99.9, 1000, 100);
      const report2 = manager.generateReadinessReport('1.0.1', [checkpoint2], metrics2);

      const latest = manager.getLatestReport();
      expect(latest?.version).toBe('1.0.1');
    });
  });

  describe('isProductionReady', () => {
    it('should return true when ready and approved', () => {
      const checkpoint = manager.createCheckpoint('performance', 'passed', 'OK');
      const metrics = manager.recordMetrics(50, 60, 200, 0.001, 99.9, 1000, 100);
      const report = manager.generateReadinessReport('1.0.0', [checkpoint], metrics);

      manager.updateReportApprovalStatus(report.reportId, 'approved');

      expect(manager.isProductionReady()).toBe(true);
    });

    it('should return false when not approved', () => {
      const checkpoint = manager.createCheckpoint('performance', 'passed', 'OK');
      const metrics = manager.recordMetrics(50, 60, 200, 0.001, 99.9, 1000, 100);
      manager.generateReadinessReport('1.0.0', [checkpoint], metrics);

      expect(manager.isProductionReady()).toBe(false);
    });

    it('should return false when not ready', () => {
      const checkpoint = manager.createCheckpoint('performance', 'failed', 'Failed');
      const metrics = manager.recordMetrics(50, 60, 200, 0.001, 99.9, 1000, 100);
      const report = manager.generateReadinessReport('1.0.0', [checkpoint], metrics);

      manager.updateReportApprovalStatus(report.reportId, 'approved');

      expect(manager.isProductionReady()).toBe(false);
    });
  });

  describe('getCheckpointStats', () => {
    it('should calculate checkpoint statistics', () => {
      manager.createCheckpoint('performance', 'passed', 'OK');
      manager.createCheckpoint('performance', 'passed', 'OK');
      manager.createCheckpoint('security', 'warning', 'Warning');
      manager.createCheckpoint('stability', 'failed', 'Failed');

      const stats = manager.getCheckpointStats();

      expect(stats.total).toBe(4);
      expect(stats.passed).toBe(2);
      expect(stats.warning).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });

  describe('getAllCheckpoints', () => {
    it('should retrieve all checkpoints', () => {
      manager.createCheckpoint('performance', 'passed', 'OK');
      manager.createCheckpoint('security', 'passed', 'OK');

      const all = manager.getAllCheckpoints();
      expect(all.length).toBe(2);
    });
  });

  describe('deleteCheckpoint', () => {
    it('should delete a checkpoint', () => {
      const checkpoint = manager.createCheckpoint('performance', 'passed', 'OK');
      const result = manager.deleteCheckpoint(checkpoint.checkpointId);

      expect(result).toBe(true);
      expect(manager.getCheckpoint(checkpoint.checkpointId)).toBeUndefined();
    });

    it('should return false for non-existent checkpoint', () => {
      expect(manager.deleteCheckpoint('non-existent')).toBe(false);
    });
  });

  describe('deleteReport', () => {
    it('should delete a report', () => {
      const checkpoint = manager.createCheckpoint('performance', 'passed', 'OK');
      const metrics = manager.recordMetrics(50, 60, 200, 0.001, 99.9, 1000, 100);
      const report = manager.generateReadinessReport('1.0.0', [checkpoint], metrics);

      const result = manager.deleteReport(report.reportId);
      expect(result).toBe(true);
      expect(manager.getReport(report.reportId)).toBeUndefined();
    });
  });
});
