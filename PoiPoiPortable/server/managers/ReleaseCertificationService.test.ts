import { describe, it, expect, beforeEach } from 'vitest';
import { ReleaseCertificationService } from './ReleaseCertificationService';

describe('ReleaseCertificationService', () => {
  let service: ReleaseCertificationService;

  beforeEach(() => {
    service = new ReleaseCertificationService();
  });

  describe('createCriteria', () => {
    it('should create certification criteria', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      expect(criteria).toBeDefined();
      expect(criteria.name).toBe('Performance');
      expect(criteria.criteriaId).toMatch(/^CRT-/);
    });
  });

  describe('getCriteria', () => {
    it('should retrieve criteria', () => {
      const created = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );
      const retrieved = service.getCriteria(created.criteriaId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Performance');
    });

    it('should return undefined for non-existent criteria', () => {
      expect(service.getCriteria('non-existent')).toBeUndefined();
    });
  });

  describe('getAllCriteria', () => {
    it('should retrieve all criteria', () => {
      service.createCriteria('Perf', 'Desc', 'performance', 100, 1.0, true);
      service.createCriteria('Quality', 'Desc', 'quality', 85, 1.0, true);

      const all = service.getAllCriteria();
      expect(all.length).toBe(2);
    });
  });

  describe('performCheck', () => {
    it('should perform a check', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 150, 'Response time: 150ms');

      expect(check).toBeDefined();
      expect(check?.passed).toBe(true);
      expect(check?.checkId).toMatch(/^CHK-/);
    });

    it('should fail check if below threshold', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 50, 'Response time: 50ms');

      expect(check?.passed).toBe(false);
    });

    it('should return null for non-existent criteria', () => {
      expect(service.performCheck('non-existent', 100, 'Details')).toBeNull();
    });
  });

  describe('getCheck', () => {
    it('should retrieve a check', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const created = service.performCheck(criteria.criteriaId, 150, 'Response time: 150ms');
      const retrieved = service.getCheck(created!.checkId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.passed).toBe(true);
    });
  });

  describe('generateCertification', () => {
    it('should generate certification', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 150, 'Response time: 150ms');
      const cert = service.generateCertification('1.0.0', [check!]);

      expect(cert).toBeDefined();
      expect(cert.version).toBe('1.0.0');
      expect(cert.certificationId).toMatch(/^REL-/);
    });

    it('should set status to approved for high score', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 150, 'Response time: 150ms');
      const cert = service.generateCertification('1.0.0', [check!]);

      expect(cert.status).toBe('approved');
    });

    it('should set status to rejected for failed required check', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 50, 'Response time: 50ms');
      const cert = service.generateCertification('1.0.0', [check!]);

      expect(cert.status).toBe('rejected');
    });
  });

  describe('getCertification', () => {
    it('should retrieve certification', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 150, 'Response time: 150ms');
      const created = service.generateCertification('1.0.0', [check!]);
      const retrieved = service.getCertification(created.certificationId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.version).toBe('1.0.0');
    });
  });

  describe('approveCertification', () => {
    it('should approve certification', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 150, 'Response time: 150ms');
      const cert = service.generateCertification('1.0.0', [check!]);

      const result = service.approveCertification(cert.certificationId, 'admin');
      expect(result).toBe(true);

      const updated = service.getCertification(cert.certificationId);
      expect(updated?.approvedBy).toBe('admin');
    });

    it('should not approve rejected certification', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 50, 'Response time: 50ms');
      const cert = service.generateCertification('1.0.0', [check!]);

      const result = service.approveCertification(cert.certificationId, 'admin');
      expect(result).toBe(false);
    });
  });

  describe('rejectCertification', () => {
    it('should reject certification', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 150, 'Response time: 150ms');
      const cert = service.generateCertification('1.0.0', [check!]);

      const result = service.rejectCertification(cert.certificationId, 'Quality issues');
      expect(result).toBe(true);

      const updated = service.getCertification(cert.certificationId);
      expect(updated?.rejectionReason).toBe('Quality issues');
    });
  });

  describe('addCondition', () => {
    it('should add condition to certification', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 150, 'Response time: 150ms');
      const cert = service.generateCertification('1.0.0', [check!]);

      const result = service.addCondition(cert.certificationId, 'Fix performance issues');
      expect(result).toBe(true);

      const updated = service.getCertification(cert.certificationId);
      expect(updated?.conditions).toContain('Fix performance issues');
    });
  });

  describe('getAllCertifications', () => {
    it('should retrieve all certifications', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 150, 'Response time: 150ms');
      service.generateCertification('1.0.0', [check!]);
      service.generateCertification('1.0.1', [check!]);

      const all = service.getAllCertifications();
      expect(all.length).toBe(2);
    });
  });

  describe('getCertificationStats', () => {
    it('should calculate certification statistics', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 150, 'Response time: 150ms');
      service.generateCertification('1.0.0', [check!]);

      const stats = service.getCertificationStats();

      expect(stats.total).toBe(1);
      expect(stats.approved).toBe(1);
    });
  });

  describe('getLatestCertification', () => {
    it('should retrieve latest certification', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 150, 'Response time: 150ms');
      service.generateCertification('1.0.0', [check!]);
      const latest = service.generateCertification('1.0.1', [check!]);

      const retrieved = service.getLatestCertification();
      expect(retrieved?.timestamp).toBeGreaterThanOrEqual(latest.timestamp);
    });
  });

  describe('getCertificationByVersion', () => {
    it('should retrieve certification by version', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 150, 'Response time: 150ms');
      service.generateCertification('1.0.0', [check!]);

      const cert = service.getCertificationByVersion('1.0.0');
      expect(cert).toBeDefined();
      expect(cert?.version).toBe('1.0.0');
    });
  });

  describe('isReadyForRelease', () => {
    it('should return true when approved', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 150, 'Response time: 150ms');
      const cert = service.generateCertification('1.0.0', [check!]);

      service.approveCertification(cert.certificationId, 'admin');

      expect(service.isReadyForRelease()).toBe(true);
    });

    it('should return false when not approved', () => {
      expect(service.isReadyForRelease()).toBe(false);
    });
  });

  describe('generateCertificationReport', () => {
    it('should generate certification report', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 150, 'Response time: 150ms');
      const cert = service.generateCertification('1.0.0', [check!]);

      const report = service.generateCertificationReport(cert.certificationId);

      expect(report.certification).toBeDefined();
      expect(report.summary).toContain('1.0.0');
      expect(report.details.length).toBe(1);
    });
  });

  describe('deleteCertification', () => {
    it('should delete certification', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 150, 'Response time: 150ms');
      const cert = service.generateCertification('1.0.0', [check!]);

      const result = service.deleteCertification(cert.certificationId);
      expect(result).toBe(true);
      expect(service.getCertification(cert.certificationId)).toBeUndefined();
    });
  });

  describe('deleteCheck', () => {
    it('should delete check', () => {
      const criteria = service.createCriteria(
        'Performance',
        'Response time < 1s',
        'performance',
        100,
        1.0,
        true
      );

      const check = service.performCheck(criteria.criteriaId, 150, 'Response time: 150ms');
      const result = service.deleteCheck(check!.checkId);

      expect(result).toBe(true);
      expect(service.getCheck(check!.checkId)).toBeUndefined();
    });
  });
});
