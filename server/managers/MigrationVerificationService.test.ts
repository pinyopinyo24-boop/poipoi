import { describe, it, expect, beforeEach } from 'vitest';
import { MigrationVerificationService } from './MigrationVerificationService';

describe('MigrationVerificationService', () => {
  let service: MigrationVerificationService;

  beforeEach(() => {
    service = new MigrationVerificationService();
  });

  describe('createMigrationCheck', () => {
    it('should create migration check', () => {
      const check = service.createMigrationCheck(
        'account',
        'User ID',
        'passed',
        'user123',
        'user123'
      );

      expect(check).toBeDefined();
      expect(check.checkId).toMatch(/^MIG-/);
      expect(check.status).toBe('passed');
    });
  });

  describe('getMigrationCheck', () => {
    it('should retrieve migration check', () => {
      const created = service.createMigrationCheck(
        'account',
        'Email',
        'passed',
        'user@example.com',
        'user@example.com'
      );
      const retrieved = service.getMigrationCheck(created.checkId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.itemName).toBe('Email');
    });
  });

  describe('getAllMigrationChecks', () => {
    it('should retrieve all checks', () => {
      service.createMigrationCheck('account', 'Check 1', 'passed', 'val1', 'val1');
      service.createMigrationCheck('account', 'Check 2', 'passed', 'val2', 'val2');

      const all = service.getAllMigrationChecks();
      expect(all.length).toBe(2);
    });
  });

  describe('createMigrationReport', () => {
    it('should create migration report', () => {
      const check1 = service.createMigrationCheck('account', 'Check 1', 'passed', 'val1', 'val1');
      const check2 = service.createMigrationCheck('account', 'Check 2', 'passed', 'val2', 'val2');

      const report = service.createMigrationReport('RC-001', 'v0.9.0', 'v1.0.0', [check1, check2], [
        'All good',
      ]);

      expect(report).toBeDefined();
      expect(report.reportId).toMatch(/^MIGR-/);
      expect(report.totalChecks).toBe(2);
      expect(report.passedChecks).toBe(2);
      expect(report.overallScore).toBe(100);
    });
  });

  describe('getMigrationReport', () => {
    it('should retrieve migration report', () => {
      const check = service.createMigrationCheck('account', 'Check', 'passed', 'val', 'val');
      const created = service.createMigrationReport('RC-001', 'v0.9.0', 'v1.0.0', [check], []);
      const retrieved = service.getMigrationReport(created.reportId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.rcId).toBe('RC-001');
    });
  });

  describe('getAllMigrationReports', () => {
    it('should retrieve all reports', () => {
      const check = service.createMigrationCheck('account', 'Check', 'passed', 'val', 'val');

      service.createMigrationReport('RC-001', 'v0.9.0', 'v1.0.0', [check], []);
      service.createMigrationReport('RC-002', 'v0.9.0', 'v1.0.0', [check], []);

      const all = service.getAllMigrationReports();
      expect(all.length).toBe(2);
    });
  });

  describe('getLatestReportByRc', () => {
    it('should retrieve latest report by RC', async () => {
      const check = service.createMigrationCheck('account', 'Check', 'passed', 'val', 'val');

      service.createMigrationReport('RC-001', 'v0.9.0', 'v1.0.0', [check], []);
      await new Promise(resolve => setTimeout(resolve, 10));
      const report2 = service.createMigrationReport('RC-001', 'v0.9.0', 'v1.0.0', [check], []);

      const latest = service.getLatestReportByRc('RC-001');
      expect(latest?.reportId).toBe(report2.reportId);
    });
  });

  describe('verifyAccountMigration', () => {
    it('should verify account migration', () => {
      const checks = service.verifyAccountMigration('user123', 'user@example.com', 'testuser');

      expect(checks.length).toBe(3);
      expect(checks.every(c => c.checkType === 'account')).toBe(true);
      expect(checks.every(c => c.status === 'passed')).toBe(true);
    });
  });

  describe('verifyConversationMigration', () => {
    it('should verify conversation migration', () => {
      const checks = service.verifyConversationMigration(10, 100);

      expect(checks.length).toBe(2);
      expect(checks.every(c => c.checkType === 'conversation')).toBe(true);
      expect(checks.every(c => c.status === 'passed')).toBe(true);
    });
  });

  describe('verifySettingsMigration', () => {
    it('should verify settings migration', () => {
      const settings = {
        theme: 'dark',
        language: 'ja',
        notifications: true,
      };

      const checks = service.verifySettingsMigration(settings);

      expect(checks.length).toBe(3);
      expect(checks.every(c => c.checkType === 'settings')).toBe(true);
    });
  });

  describe('verifyCloudSync', () => {
    it('should verify cloud sync', () => {
      const lastSyncTime = Date.now() - 1800000; // 30 minutes ago

      const checks = service.verifyCloudSync('success', lastSyncTime);

      expect(checks.length).toBe(2);
      expect(checks.every(c => c.checkType === 'cloudsync')).toBe(true);
      expect(checks.every(c => c.status === 'passed')).toBe(true);
    });

    it('should detect old sync time', () => {
      const lastSyncTime = Date.now() - 7200000; // 2 hours ago

      const checks = service.verifyCloudSync('success', lastSyncTime);

      expect(checks.some(c => c.status === 'warning')).toBe(true);
    });
  });

  describe('getMigrationStats', () => {
    it('should calculate migration statistics', () => {
      const check1 = service.createMigrationCheck('account', 'Check 1', 'passed', 'val1', 'val1');
      const check2 = service.createMigrationCheck('account', 'Check 2', 'failed', 'val2', 'val2');
      const check3 = service.createMigrationCheck('account', 'Check 3', 'warning', 'val3', 'val3');

      service.createMigrationReport('RC-001', 'v0.9.0', 'v1.0.0', [check1, check2, check3], []);

      const stats = service.getMigrationStats();

      expect(stats.totalChecks).toBe(3);
      expect(stats.totalReports).toBe(1);
      expect(stats.passedChecks).toBe(1);
      expect(stats.failedChecks).toBe(1);
      expect(stats.warningChecks).toBe(1);
    });
  });

  describe('deleteMigrationCheck', () => {
    it('should delete migration check', () => {
      const check = service.createMigrationCheck('account', 'Check', 'passed', 'val', 'val');

      const result = service.deleteMigrationCheck(check.checkId);

      expect(result).toBe(true);
      expect(service.getMigrationCheck(check.checkId)).toBeUndefined();
    });
  });

  describe('deleteMigrationReport', () => {
    it('should delete migration report', () => {
      const check = service.createMigrationCheck('account', 'Check', 'passed', 'val', 'val');
      const report = service.createMigrationReport('RC-001', 'v0.9.0', 'v1.0.0', [check], []);

      const result = service.deleteMigrationReport(report.reportId);

      expect(result).toBe(true);
      expect(service.getMigrationReport(report.reportId)).toBeUndefined();
    });
  });

  describe('migration report status determination', () => {
    it('should set status to failed if any check failed', () => {
      const check1 = service.createMigrationCheck('account', 'Check 1', 'passed', 'val1', 'val1');
      const check2 = service.createMigrationCheck('account', 'Check 2', 'failed', 'val2', 'val2');

      const report = service.createMigrationReport('RC-001', 'v0.9.0', 'v1.0.0', [check1, check2], []);

      expect(report.status).toBe('failed');
    });

    it('should set status to warning if any check warning', () => {
      const check1 = service.createMigrationCheck('account', 'Check 1', 'passed', 'val1', 'val1');
      const check2 = service.createMigrationCheck('account', 'Check 2', 'warning', 'val2', 'val2');

      const report = service.createMigrationReport('RC-001', 'v0.9.0', 'v1.0.0', [check1, check2], []);

      expect(report.status).toBe('warning');
    });

    it('should set status to passed if all checks passed', () => {
      const check1 = service.createMigrationCheck('account', 'Check 1', 'passed', 'val1', 'val1');
      const check2 = service.createMigrationCheck('account', 'Check 2', 'passed', 'val2', 'val2');

      const report = service.createMigrationReport('RC-001', 'v0.9.0', 'v1.0.0', [check1, check2], []);

      expect(report.status).toBe('passed');
    });
  });

  describe('comprehensive migration workflow', () => {
    it('should support full migration workflow', () => {
      const accountChecks = service.verifyAccountMigration('user123', 'user@example.com', 'testuser');
      const conversationChecks = service.verifyConversationMigration(10, 100);
      const settingsChecks = service.verifySettingsMigration({ theme: 'dark' });
      const syncChecks = service.verifyCloudSync('success', Date.now() - 1800000);

      const allChecks = [...accountChecks, ...conversationChecks, ...settingsChecks, ...syncChecks];

      const report = service.createMigrationReport(
        'RC-001',
        'v0.9.0',
        'v1.0.0',
        allChecks,
        ['Migration ready']
      );

      expect(report.totalChecks).toBe(8);
      expect(report.passedChecks).toBeGreaterThan(0);
      expect(report.recommendations.length).toBe(1);
    });
  });
});
