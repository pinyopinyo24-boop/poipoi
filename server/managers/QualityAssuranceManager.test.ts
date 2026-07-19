import { describe, it, expect, beforeEach } from 'vitest';
import { QualityAssuranceManager } from './QualityAssuranceManager';

describe('QualityAssuranceManager', () => {
  let manager: QualityAssuranceManager;

  beforeEach(() => {
    manager = new QualityAssuranceManager();
  });

  describe('createQualityMetric', () => {
    it('should create quality metric', () => {
      const metric = manager.createQualityMetric('functionality', 'Feature Test', 90, 80, {});

      expect(metric).toBeDefined();
      expect(metric.metricId).toMatch(/^QM-/);
      expect(metric.status).toBe('passed');
    });

    it('should set warning status for borderline values', () => {
      const metric = manager.createQualityMetric('functionality', 'Feature Test', 82, 100, {});

      expect(metric.status).toBe('warning');
    });

    it('should set failed status for low values', () => {
      const metric = manager.createQualityMetric('functionality', 'Feature Test', 70, 100, {});

      expect(metric.status).toBe('failed');
    });
  });

  describe('getQualityMetric', () => {
    it('should retrieve quality metric', () => {
      const created = manager.createQualityMetric('functionality', 'Test', 90, 80, {});
      const retrieved = manager.getQualityMetric(created.metricId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.metricName).toBe('Test');
    });
  });

  describe('getAllQualityMetrics', () => {
    it('should retrieve all metrics', () => {
      manager.createQualityMetric('functionality', 'Test 1', 90, 80, {});
      manager.createQualityMetric('performance', 'Test 2', 85, 80, {});

      const all = manager.getAllQualityMetrics();
      expect(all.length).toBe(2);
    });
  });

  describe('createQualityReport', () => {
    it('should create quality report', () => {
      const metric1 = manager.createQualityMetric('functionality', 'Test 1', 90, 80, {});
      const metric2 = manager.createQualityMetric('functionality', 'Test 2', 85, 80, {});

      const report = manager.createQualityReport('v1.0.0', [metric1, metric2], ['All good']);

      expect(report).toBeDefined();
      expect(report.reportId).toMatch(/^QR-/);
      expect(report.totalMetrics).toBe(2);
      expect(report.passedMetrics).toBe(2);
      expect(report.status).toBe('approved');
    });
  });

  describe('getQualityReport', () => {
    it('should retrieve quality report', () => {
      const metric = manager.createQualityMetric('functionality', 'Test', 90, 80, {});
      const created = manager.createQualityReport('v1.0.0', [metric], []);
      const retrieved = manager.getQualityReport(created.reportId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.version).toBe('v1.0.0');
    });
  });

  describe('getReportsByVersion', () => {
    it('should retrieve reports by version', () => {
      const metric = manager.createQualityMetric('functionality', 'Test', 90, 80, {});

      manager.createQualityReport('v1.0.0', [metric], []);
      manager.createQualityReport('v1.0.0', [metric], []);
      manager.createQualityReport('v1.1.0', [metric], []);

      const v1Reports = manager.getReportsByVersion('v1.0.0');
      expect(v1Reports.length).toBe(2);
    });
  });

  describe('getLatestQualityReport', () => {
    it('should retrieve latest report', async () => {
      const metric = manager.createQualityMetric('functionality', 'Test', 90, 80, {});

      manager.createQualityReport('v1.0.0', [metric], []);
      await new Promise(resolve => setTimeout(resolve, 10));
      const report2 = manager.createQualityReport('v1.0.0', [metric], []);

      const latest = manager.getLatestQualityReport();
      expect(latest?.reportId).toBe(report2.reportId);
    });
  });

  describe('createDeviceTest', () => {
    it('should create device test', () => {
      const test = manager.createDeviceTest(
        'android',
        'Pixel 6',
        '13',
        'passed',
        [],
        { startupTime: 2500, memoryUsage: 256, cpuUsage: 45, batteryDrain: 5 }
      );

      expect(test).toBeDefined();
      expect(test.testId).toMatch(/^DT-/);
      expect(test.testResult).toBe('passed');
    });
  });

  describe('getDeviceTest', () => {
    it('should retrieve device test', () => {
      const created = manager.createDeviceTest(
        'android',
        'Pixel 6',
        '13',
        'passed',
        [],
        { startupTime: 2500, memoryUsage: 256, cpuUsage: 45, batteryDrain: 5 }
      );
      const retrieved = manager.getDeviceTest(created.testId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.deviceModel).toBe('Pixel 6');
    });
  });

  describe('getAllDeviceTests', () => {
    it('should retrieve all device tests', () => {
      manager.createDeviceTest(
        'android',
        'Pixel 6',
        '13',
        'passed',
        [],
        { startupTime: 2500, memoryUsage: 256, cpuUsage: 45, batteryDrain: 5 }
      );
      manager.createDeviceTest(
        'windows',
        'Desktop',
        '11',
        'passed',
        [],
        { startupTime: 2000, memoryUsage: 512, cpuUsage: 30, batteryDrain: 0 }
      );

      const all = manager.getAllDeviceTests();
      expect(all.length).toBe(2);
    });
  });

  describe('getTestsByDeviceType', () => {
    it('should retrieve tests by device type', () => {
      manager.createDeviceTest(
        'android',
        'Pixel 6',
        '13',
        'passed',
        [],
        { startupTime: 2500, memoryUsage: 256, cpuUsage: 45, batteryDrain: 5 }
      );
      manager.createDeviceTest(
        'android',
        'Galaxy S21',
        '12',
        'passed',
        [],
        { startupTime: 2600, memoryUsage: 280, cpuUsage: 50, batteryDrain: 6 }
      );
      manager.createDeviceTest(
        'windows',
        'Desktop',
        '11',
        'passed',
        [],
        { startupTime: 2000, memoryUsage: 512, cpuUsage: 30, batteryDrain: 0 }
      );

      const androidTests = manager.getTestsByDeviceType('android');
      expect(androidTests.length).toBe(2);
    });
  });

  describe('runFunctionalityTest', () => {
    it('should run functionality test', () => {
      const metrics = manager.runFunctionalityTest(['Chat', 'File Upload', 'Voice']);

      expect(metrics.length).toBe(3);
      expect(metrics.every(m => m.category === 'functionality')).toBe(true);
      expect(metrics.every(m => m.status === 'passed')).toBe(true);
    });
  });

  describe('runPerformanceTest', () => {
    it('should run performance test', () => {
      const benchmarks = {
        startup: 2500,
        chatResponse: 1800,
        screenTransition: 900,
      };

      const metrics = manager.runPerformanceTest(benchmarks);

      expect(metrics.length).toBe(3);
      expect(metrics.every(m => m.category === 'performance')).toBe(true);
    });

    it('should detect performance issues', () => {
      const benchmarks = {
        startup: 4000,
        chatResponse: 2500,
      };

      const metrics = manager.runPerformanceTest(benchmarks);

      expect(metrics.some(m => m.status === 'failed')).toBe(true);
    });
  });

  describe('runStabilityTest', () => {
    it('should run stability test', () => {
      const metrics = manager.runStabilityTest(1, 2, 1000);

      expect(metrics.length).toBe(2);
      expect(metrics.every(m => m.category === 'stability')).toBe(true);
      expect(metrics.every(m => m.status === 'passed')).toBe(true);
    });
  });

  describe('runCompatibilityTest', () => {
    it('should run compatibility test', () => {
      const metrics = manager.runCompatibilityTest(['Chrome', 'Firefox', 'Safari']);

      expect(metrics.length).toBe(3);
      expect(metrics.every(m => m.category === 'compatibility')).toBe(true);
    });
  });

  describe('runSecurityTest', () => {
    it('should run security test', () => {
      const metrics = manager.runSecurityTest(0, 95);

      expect(metrics.length).toBe(2);
      expect(metrics.every(m => m.category === 'security')).toBe(true);
    });

    it('should detect security issues', () => {
      const metrics = manager.runSecurityTest(5, 60);

      expect(metrics.some(m => m.status === 'failed')).toBe(true);
    });
  });

  describe('getQualityStats', () => {
    it('should calculate quality statistics', () => {
      const metric1 = manager.createQualityMetric('functionality', 'Test 1', 90, 80, {});
      const metric2 = manager.createQualityMetric('functionality', 'Test 2', 70, 80, {});
      const metric3 = manager.createQualityMetric('functionality', 'Test 3', 82, 100, {});

      const report = manager.createQualityReport('v1.0.0', [metric1, metric2, metric3], []);

      const stats = manager.getQualityStats();

      expect(stats.totalReports).toBe(1);
      expect(report.totalMetrics).toBe(3);
      expect(report.status).toBe('conditional');
      expect(report.passedMetrics).toBeGreaterThanOrEqual(0);
      expect(report.failedMetrics).toBeGreaterThanOrEqual(0);
      expect(report.warningMetrics).toBeGreaterThanOrEqual(0);
    });
  });

  describe('deleteQualityMetric', () => {
    it('should delete quality metric', () => {
      const metric = manager.createQualityMetric('functionality', 'Test', 90, 80, {});

      const result = manager.deleteQualityMetric(metric.metricId);

      expect(result).toBe(true);
      expect(manager.getQualityMetric(metric.metricId)).toBeUndefined();
    });
  });

  describe('deleteQualityReport', () => {
    it('should delete quality report', () => {
      const metric = manager.createQualityMetric('functionality', 'Test', 90, 80, {});
      const report = manager.createQualityReport('v1.0.0', [metric], []);

      const result = manager.deleteQualityReport(report.reportId);

      expect(result).toBe(true);
      expect(manager.getQualityReport(report.reportId)).toBeUndefined();
    });
  });

  describe('deleteDeviceTest', () => {
    it('should delete device test', () => {
      const test = manager.createDeviceTest(
        'android',
        'Pixel 6',
        '13',
        'passed',
        [],
        { startupTime: 2500, memoryUsage: 256, cpuUsage: 45, batteryDrain: 5 }
      );

      const result = manager.deleteDeviceTest(test.testId);

      expect(result).toBe(true);
      expect(manager.getDeviceTest(test.testId)).toBeUndefined();
    });
  });

  describe('comprehensive quality workflow', () => {
    it('should support full quality workflow', () => {
      const funcMetrics = manager.runFunctionalityTest(['Chat', 'File Upload']);
      const perfMetrics = manager.runPerformanceTest({
        startup: 2500,
        chatResponse: 1800,
      });
      const stabMetrics = manager.runStabilityTest(1, 2, 1000);

      const allMetrics = [...funcMetrics, ...perfMetrics, ...stabMetrics];

      const report = manager.createQualityReport('v1.0.0', allMetrics, ['Ready for release']);

      expect(report.totalMetrics).toBeGreaterThan(0);
      expect(report.recommendations.length).toBe(1);
    });
  });
});
