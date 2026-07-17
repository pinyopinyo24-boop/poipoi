import { describe, it, expect, beforeEach } from 'vitest';
import { ReleaseAuditService } from './ReleaseAuditService';

describe('ReleaseAuditService', () => {
  let service: ReleaseAuditService;

  beforeEach(() => {
    service = new ReleaseAuditService();
  });

  describe('createAuditItem', () => {
    it('should create audit item', () => {
      const item = service.createAuditItem(
        'security',
        'SSL/TLS Verification',
        'passed',
        { verified: true },
        'security-team'
      );

      expect(item).toBeDefined();
      expect(item.itemId).toMatch(/^AUD-/);
      expect(item.status).toBe('passed');
    });
  });

  describe('getAuditItem', () => {
    it('should retrieve audit item', () => {
      const created = service.createAuditItem(
        'security',
        'SSL/TLS',
        'passed',
        {},
        'security-team'
      );
      const retrieved = service.getAuditItem(created.itemId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.itemName).toBe('SSL/TLS');
    });
  });

  describe('getAllAuditItems', () => {
    it('should retrieve all items', () => {
      service.createAuditItem('security', 'Item 1', 'passed', {}, 'team1');
      service.createAuditItem('compliance', 'Item 2', 'passed', {}, 'team2');

      const all = service.getAllAuditItems();
      expect(all.length).toBe(2);
    });
  });

  describe('createAuditReport', () => {
    it('should create audit report', () => {
      const item1 = service.createAuditItem('security', 'Item 1', 'passed', {}, 'team1');
      const item2 = service.createAuditItem('security', 'Item 2', 'passed', {}, 'team1');

      const report = service.createAuditReport('RC-001', 'v1.0.0', [item1, item2]);

      expect(report).toBeDefined();
      expect(report.reportId).toMatch(/^AUDR-/);
      expect(report.totalItems).toBe(2);
      expect(report.passedItems).toBe(2);
      expect(report.status).toBe('approved');
    });
  });

  describe('getAuditReport', () => {
    it('should retrieve audit report', () => {
      const item = service.createAuditItem('security', 'Item', 'passed', {}, 'team');
      const created = service.createAuditReport('RC-001', 'v1.0.0', [item]);
      const retrieved = service.getAuditReport(created.reportId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.version).toBe('v1.0.0');
    });
  });

  describe('getAllAuditReports', () => {
    it('should retrieve all reports', () => {
      const item = service.createAuditItem('security', 'Item', 'passed', {}, 'team');

      service.createAuditReport('RC-001', 'v1.0.0', [item]);
      service.createAuditReport('RC-002', 'v1.0.0', [item]);

      const all = service.getAllAuditReports();
      expect(all.length).toBe(2);
    });
  });

  describe('getReportsByVersion', () => {
    it('should retrieve reports by version', () => {
      const item = service.createAuditItem('security', 'Item', 'passed', {}, 'team');

      service.createAuditReport('RC-001', 'v1.0.0', [item]);
      service.createAuditReport('RC-002', 'v1.0.0', [item]);
      service.createAuditReport('RC-003', 'v1.1.0', [item]);

      const v1Reports = service.getReportsByVersion('v1.0.0');
      expect(v1Reports.length).toBe(2);
    });
  });

  describe('getLatestAuditReport', () => {
    it('should retrieve latest audit report', async () => {
      const item = service.createAuditItem('security', 'Item', 'passed', {}, 'team');

      service.createAuditReport('RC-001', 'v1.0.0', [item]);
      await new Promise(resolve => setTimeout(resolve, 10));
      const report2 = service.createAuditReport('RC-002', 'v1.0.0', [item]);

      const latest = service.getLatestAuditReport();
      expect(latest?.reportId).toBe(report2.reportId);
    });
  });

  describe('approveAuditReport', () => {
    it('should approve audit report', () => {
      const item = service.createAuditItem('security', 'Item', 'passed', {}, 'team');
      const report = service.createAuditReport('RC-001', 'v1.0.0', [item]);

      const result = service.approveAuditReport(report.reportId, 'manager');

      expect(result).toBe(true);

      const updated = service.getAuditReport(report.reportId);
      expect(updated?.status).toBe('approved');
      expect(updated?.approvedBy).toBe('manager');
    });
  });

  describe('rejectAuditReport', () => {
    it('should reject audit report', () => {
      const item = service.createAuditItem('security', 'Item', 'failed', {}, 'team');
      const report = service.createAuditReport('RC-001', 'v1.0.0', [item]);

      const result = service.rejectAuditReport(report.reportId, 'Security issues found');

      expect(result).toBe(true);

      const updated = service.getAuditReport(report.reportId);
      expect(updated?.status).toBe('rejected');
      expect(updated?.rejectionReason).toBe('Security issues found');
    });
  });

  describe('runSecurityAudit', () => {
    it('should run security audit', () => {
      const items = service.runSecurityAudit(['SSL/TLS', 'Authentication', 'Encryption']);

      expect(items.length).toBe(3);
      expect(items.every(i => i.category === 'security')).toBe(true);
      expect(items.every(i => i.status === 'passed')).toBe(true);
    });
  });

  describe('runComplianceAudit', () => {
    it('should run compliance audit', () => {
      const items = service.runComplianceAudit(['GDPR', 'Privacy Policy', 'Terms']);

      expect(items.length).toBe(3);
      expect(items.every(i => i.category === 'compliance')).toBe(true);
    });
  });

  describe('runPerformanceAudit', () => {
    it('should run performance audit', () => {
      const metrics = {
        startup: 2500,
        chatResponse: 1800,
        screenTransition: 900,
      };

      const items = service.runPerformanceAudit(metrics);

      expect(items.length).toBe(3);
      expect(items.every(i => i.category === 'performance')).toBe(true);
      expect(items.every(i => i.status === 'passed')).toBe(true);
    });

    it('should detect performance issues', () => {
      const metrics = {
        startup: 4000,
        chatResponse: 2500,
      };

      const items = service.runPerformanceAudit(metrics);

      expect(items.some(i => i.status === 'warning')).toBe(true);
    });
  });

  describe('runQualityAudit', () => {
    it('should run quality audit', () => {
      const metrics = {
        testCoverage: 85,
        codeQuality: 90,
        documentation: 75,
      };

      const items = service.runQualityAudit(metrics);

      expect(items.length).toBe(3);
      expect(items.every(i => i.category === 'quality')).toBe(true);
    });

    it('should detect quality issues', () => {
      const metrics = {
        testCoverage: 50,
        codeQuality: 40,
      };

      const items = service.runQualityAudit(metrics);

      expect(items.some(i => i.status === 'failed')).toBe(true);
    });
  });

  describe('runDocumentationAudit', () => {
    it('should run documentation audit', () => {
      const items = service.runDocumentationAudit(['README', 'API Docs', 'User Guide']);

      expect(items.length).toBe(3);
      expect(items.every(i => i.category === 'documentation')).toBe(true);
    });
  });

  describe('getAuditStats', () => {
    it('should calculate audit statistics', () => {
      const item1 = service.createAuditItem('security', 'Item 1', 'passed', {}, 'team');
      const item2 = service.createAuditItem('security', 'Item 2', 'failed', {}, 'team');
      const item3 = service.createAuditItem('security', 'Item 3', 'warning', {}, 'team');

      service.createAuditReport('RC-001', 'v1.0.0', [item1, item2, item3]);

      const stats = service.getAuditStats();

      expect(stats.totalItems).toBe(3);
      expect(stats.totalReports).toBe(1);
      expect(stats.passedItems).toBe(1);
      expect(stats.failedItems).toBe(1);
      expect(stats.warningItems).toBe(1);
    });
  });

  describe('deleteAuditItem', () => {
    it('should delete audit item', () => {
      const item = service.createAuditItem('security', 'Item', 'passed', {}, 'team');

      const result = service.deleteAuditItem(item.itemId);

      expect(result).toBe(true);
      expect(service.getAuditItem(item.itemId)).toBeUndefined();
    });
  });

  describe('deleteAuditReport', () => {
    it('should delete audit report', () => {
      const item = service.createAuditItem('security', 'Item', 'passed', {}, 'team');
      const report = service.createAuditReport('RC-001', 'v1.0.0', [item]);

      const result = service.deleteAuditReport(report.reportId);

      expect(result).toBe(true);
      expect(service.getAuditReport(report.reportId)).toBeUndefined();
    });
  });

  describe('audit report status determination', () => {
    it('should set status to rejected if any item failed', () => {
      const item1 = service.createAuditItem('security', 'Item 1', 'passed', {}, 'team');
      const item2 = service.createAuditItem('security', 'Item 2', 'failed', {}, 'team');

      const report = service.createAuditReport('RC-001', 'v1.0.0', [item1, item2]);

      expect(report.status).toBe('rejected');
    });

    it('should set status to conditional if any item warning', () => {
      const item1 = service.createAuditItem('security', 'Item 1', 'passed', {}, 'team');
      const item2 = service.createAuditItem('security', 'Item 2', 'warning', {}, 'team');

      const report = service.createAuditReport('RC-001', 'v1.0.0', [item1, item2]);

      expect(report.status).toBe('conditional');
    });

    it('should set status to approved if all items passed', () => {
      const item1 = service.createAuditItem('security', 'Item 1', 'passed', {}, 'team');
      const item2 = service.createAuditItem('security', 'Item 2', 'passed', {}, 'team');

      const report = service.createAuditReport('RC-001', 'v1.0.0', [item1, item2]);

      expect(report.status).toBe('approved');
    });
  });
});
