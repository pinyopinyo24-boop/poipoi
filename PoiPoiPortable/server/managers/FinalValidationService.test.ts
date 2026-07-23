import { describe, it, expect, beforeEach } from 'vitest';
import { FinalValidationService } from './FinalValidationService';

describe('FinalValidationService', () => {
  let service: FinalValidationService;

  beforeEach(() => {
    service = new FinalValidationService();
  });

  describe('createValidationCheck', () => {
    it('should create validation check', () => {
      const check = service.createValidationCheck(
        'functional',
        'Chat Feature',
        'passed',
        { feature: 'chat' }
      );

      expect(check).toBeDefined();
      expect(check.checkId).toMatch(/^CHK-/);
      expect(check.status).toBe('passed');
    });
  });

  describe('getValidationCheck', () => {
    it('should retrieve validation check', () => {
      const created = service.createValidationCheck(
        'performance',
        'Response Time',
        'passed',
        { time: 1500 }
      );
      const retrieved = service.getValidationCheck(created.checkId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.itemName).toBe('Response Time');
    });
  });

  describe('getAllValidationChecks', () => {
    it('should retrieve all checks', () => {
      service.createValidationCheck('functional', 'Feature 1', 'passed', {});
      service.createValidationCheck('functional', 'Feature 2', 'passed', {});

      const all = service.getAllValidationChecks();
      expect(all.length).toBe(2);
    });
  });

  describe('createValidationReport', () => {
    it('should create validation report', () => {
      const check1 = service.createValidationCheck('functional', 'Feature 1', 'passed', {});
      const check2 = service.createValidationCheck('functional', 'Feature 2', 'passed', {});

      const report = service.createValidationReport('RC-001', [check1, check2], ['All good']);

      expect(report).toBeDefined();
      expect(report.reportId).toMatch(/^REP-/);
      expect(report.totalChecks).toBe(2);
      expect(report.passedChecks).toBe(2);
      expect(report.overallScore).toBe(100);
    });
  });

  describe('getValidationReport', () => {
    it('should retrieve validation report', () => {
      const check = service.createValidationCheck('functional', 'Feature', 'passed', {});
      const created = service.createValidationReport('RC-001', [check], []);
      const retrieved = service.getValidationReport(created.reportId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.rcId).toBe('RC-001');
    });
  });

  describe('getAllValidationReports', () => {
    it('should retrieve all reports', () => {
      const check = service.createValidationCheck('functional', 'Feature', 'passed', {});

      service.createValidationReport('RC-001', [check], []);
      service.createValidationReport('RC-002', [check], []);

      const all = service.getAllValidationReports();
      expect(all.length).toBe(2);
    });
  });

  describe('getLatestReportByRc', () => {
    it('should retrieve latest report by RC', async () => {
      const check = service.createValidationCheck('functional', 'Feature', 'passed', {});

      service.createValidationReport('RC-001', [check], []);
      await new Promise(resolve => setTimeout(resolve, 10));
      const report2 = service.createValidationReport('RC-001', [check], []);

      const latest = service.getLatestReportByRc('RC-001');
      expect(latest?.reportId).toBe(report2.reportId);
    });
  });

  describe('runFunctionalValidation', () => {
    it('should run functional validation', () => {
      const checks = service.runFunctionalValidation(['Chat', 'Memory', 'Voice']);

      expect(checks.length).toBe(3);
      expect(checks.every(c => c.checkType === 'functional')).toBe(true);
      expect(checks.every(c => c.status === 'passed')).toBe(true);
    });
  });

  describe('runPerformanceValidation', () => {
    it('should run performance validation', () => {
      const metrics = {
        startup: 2500,
        chatResponse: 1800,
        screenTransition: 900,
        memoryUsage: 400,
        cpuUsage: 70,
      };

      const checks = service.runPerformanceValidation(metrics);

      expect(checks.length).toBe(5);
      expect(checks.every(c => c.checkType === 'performance')).toBe(true);
      expect(checks.every(c => c.status === 'passed')).toBe(true);
    });

    it('should detect performance issues', () => {
      const metrics = {
        startup: 4000,
        chatResponse: 2500,
      };

      const checks = service.runPerformanceValidation(metrics);

      expect(checks.some(c => c.status === 'warning')).toBe(true);
    });
  });

  describe('runSecurityValidation', () => {
    it('should run security validation', () => {
      const items = ['SSL/TLS', 'Authentication', 'Data Encryption'];

      const checks = service.runSecurityValidation(items);

      expect(checks.length).toBe(3);
      expect(checks.every(c => c.checkType === 'security')).toBe(true);
      expect(checks.every(c => c.status === 'passed')).toBe(true);
    });
  });

  describe('runCompatibilityValidation', () => {
    it('should run compatibility validation', () => {
      const platforms = ['Android', 'iOS', 'Windows', 'macOS', 'Web'];

      const checks = service.runCompatibilityValidation(platforms);

      expect(checks.length).toBe(5);
      expect(checks.every(c => c.checkType === 'compatibility')).toBe(true);
    });
  });

  describe('runStabilityValidation', () => {
    it('should run stability validation', () => {
      const checks = service.runStabilityValidation(3600000); // 1 hour

      expect(checks.length).toBe(1);
      expect(checks[0].checkType).toBe('stability');
      expect(checks[0].status).toBe('passed');
    });
  });

  describe('getValidationStats', () => {
    it('should calculate validation statistics', () => {
      const check1 = service.createValidationCheck('functional', 'Feature 1', 'passed', {});
      const check2 = service.createValidationCheck('functional', 'Feature 2', 'failed', {});
      const check3 = service.createValidationCheck('functional', 'Feature 3', 'warning', {});

      service.createValidationReport('RC-001', [check1, check2, check3], []);

      const stats = service.getValidationStats();

      expect(stats.totalChecks).toBe(3);
      expect(stats.totalReports).toBe(1);
      expect(stats.passedChecks).toBe(1);
      expect(stats.failedChecks).toBe(1);
      expect(stats.warningChecks).toBe(1);
    });
  });

  describe('deleteValidationCheck', () => {
    it('should delete validation check', () => {
      const check = service.createValidationCheck('functional', 'Feature', 'passed', {});

      const result = service.deleteValidationCheck(check.checkId);

      expect(result).toBe(true);
      expect(service.getValidationCheck(check.checkId)).toBeUndefined();
    });
  });

  describe('deleteValidationReport', () => {
    it('should delete validation report', () => {
      const check = service.createValidationCheck('functional', 'Feature', 'passed', {});
      const report = service.createValidationReport('RC-001', [check], []);

      const result = service.deleteValidationReport(report.reportId);

      expect(result).toBe(true);
      expect(service.getValidationReport(report.reportId)).toBeUndefined();
    });
  });

  describe('validation report status determination', () => {
    it('should set status to failed if any check failed', () => {
      const check1 = service.createValidationCheck('functional', 'Feature 1', 'passed', {});
      const check2 = service.createValidationCheck('functional', 'Feature 2', 'failed', {});

      const report = service.createValidationReport('RC-001', [check1, check2], []);

      expect(report.status).toBe('failed');
    });

    it('should set status to warning if any check warning', () => {
      const check1 = service.createValidationCheck('functional', 'Feature 1', 'passed', {});
      const check2 = service.createValidationCheck('functional', 'Feature 2', 'warning', {});

      const report = service.createValidationReport('RC-001', [check1, check2], []);

      expect(report.status).toBe('warning');
    });

    it('should set status to passed if all checks passed', () => {
      const check1 = service.createValidationCheck('functional', 'Feature 1', 'passed', {});
      const check2 = service.createValidationCheck('functional', 'Feature 2', 'passed', {});

      const report = service.createValidationReport('RC-001', [check1, check2], []);

      expect(report.status).toBe('passed');
    });
  });

  describe('comprehensive validation workflow', () => {
    it('should support full validation workflow', () => {
      const functionalChecks = service.runFunctionalValidation(['Chat', 'Memory']);
      const performanceChecks = service.runPerformanceValidation({
        startup: 2500,
        chatResponse: 1800,
      });
      const securityChecks = service.runSecurityValidation(['SSL/TLS']);
      const compatibilityChecks = service.runCompatibilityValidation(['Android', 'iOS']);
      const stabilityChecks = service.runStabilityValidation(3600000);

      const allChecks = [
        ...functionalChecks,
        ...performanceChecks,
        ...securityChecks,
        ...compatibilityChecks,
        ...stabilityChecks,
      ];

      const report = service.createValidationReport('RC-001', allChecks, ['Ready for release']);

      expect(report.totalChecks).toBe(8);
      expect(report.passedChecks).toBeGreaterThan(0);
      expect(report.recommendations.length).toBe(1);
    });
  });
});
