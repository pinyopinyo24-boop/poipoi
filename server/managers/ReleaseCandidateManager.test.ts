import { describe, it, expect, beforeEach } from 'vitest';
import { ReleaseCandidateManager } from './ReleaseCandidateManager';

describe('ReleaseCandidateManager', () => {
  let manager: ReleaseCandidateManager;

  beforeEach(() => {
    manager = new ReleaseCandidateManager();
  });

  describe('createReleaseCandidate', () => {
    it('should create a release candidate', () => {
      const rc = manager.createReleaseCandidate(
        'v1.0.0',
        1,
        'build-001',
        'Initial release',
        ['Chat', 'Memory'],
        ['Bug fix 1'],
        [],
        'Release notes'
      );

      expect(rc).toBeDefined();
      expect(rc.rcId).toMatch(/^RC-/);
      expect(rc.status).toBe('created');
    });
  });

  describe('getReleaseCandidate', () => {
    it('should retrieve a release candidate', () => {
      const created = manager.createReleaseCandidate(
        'v1.0.0',
        1,
        'build-001',
        'Initial release',
        ['Chat'],
        [],
        [],
        'Notes'
      );
      const retrieved = manager.getReleaseCandidate(created.rcId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.version).toBe('v1.0.0');
    });
  });

  describe('getReleaseCandidatesByVersion', () => {
    it('should retrieve RCs by version', () => {
      manager.createReleaseCandidate('v1.0.0', 1, 'build-001', 'RC1', [], [], [], '');
      manager.createReleaseCandidate('v1.0.0', 2, 'build-002', 'RC2', [], [], [], '');
      manager.createReleaseCandidate('v1.1.0', 1, 'build-003', 'RC1', [], [], [], '');

      const v1RCs = manager.getReleaseCandidatesByVersion('v1.0.0');
      expect(v1RCs.length).toBe(2);
    });
  });

  describe('getAllReleaseCandidates', () => {
    it('should retrieve all release candidates', () => {
      manager.createReleaseCandidate('v1.0.0', 1, 'build-001', 'RC1', [], [], [], '');
      manager.createReleaseCandidate('v1.1.0', 1, 'build-002', 'RC1', [], [], [], '');

      const all = manager.getAllReleaseCandidates();
      expect(all.length).toBe(2);
    });
  });

  describe('getLatestReleaseCandidate', () => {
    it('should retrieve the latest RC', async () => {
      manager.createReleaseCandidate('v1.0.0', 1, 'build-001', 'RC1', [], [], [], '');
      await new Promise(resolve => setTimeout(resolve, 10));
      const rc2 = manager.createReleaseCandidate('v1.0.0', 2, 'build-002', 'RC2', [], [], [], '');

      const latest = manager.getLatestReleaseCandidate();
      expect(latest?.rcNumber).toBe(2);
    });
  });

  describe('updateRcStatus', () => {
    it('should update RC status', () => {
      const rc = manager.createReleaseCandidate('v1.0.0', 1, 'build-001', 'RC1', [], [], [], '');

      const result = manager.updateRcStatus(rc.rcId, 'validating');

      expect(result).toBe(true);

      const updated = manager.getReleaseCandidate(rc.rcId);
      expect(updated?.status).toBe('validating');
    });
  });

  describe('createValidationResult', () => {
    it('should create validation result', () => {
      const rc = manager.createReleaseCandidate('v1.0.0', 1, 'build-001', 'RC1', [], [], [], '');
      const result = manager.createValidationResult(
        rc.rcId,
        'functional',
        'passed',
        95,
        { tests: 100 },
        []
      );

      expect(result).toBeDefined();
      expect(result.resultId).toMatch(/^VAL-/);
      expect(result.score).toBe(95);
    });
  });

  describe('getValidationResult', () => {
    it('should retrieve validation result', () => {
      const rc = manager.createReleaseCandidate('v1.0.0', 1, 'build-001', 'RC1', [], [], [], '');
      const created = manager.createValidationResult(
        rc.rcId,
        'performance',
        'passed',
        90,
        {},
        []
      );
      const retrieved = manager.getValidationResult(created.resultId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.validationType).toBe('performance');
    });
  });

  describe('getValidationsByRc', () => {
    it('should retrieve validations by RC', () => {
      const rc = manager.createReleaseCandidate('v1.0.0', 1, 'build-001', 'RC1', [], [], [], '');

      manager.createValidationResult(rc.rcId, 'functional', 'passed', 95, {}, []);
      manager.createValidationResult(rc.rcId, 'performance', 'passed', 90, {}, []);

      const validations = manager.getValidationsByRc(rc.rcId);
      expect(validations.length).toBe(2);
    });
  });

  describe('getAllValidationResults', () => {
    it('should retrieve all validation results', () => {
      const rc = manager.createReleaseCandidate('v1.0.0', 1, 'build-001', 'RC1', [], [], [], '');

      manager.createValidationResult(rc.rcId, 'functional', 'passed', 95, {}, []);
      manager.createValidationResult(rc.rcId, 'security', 'passed', 98, {}, []);

      const all = manager.getAllValidationResults();
      expect(all.length).toBe(2);
    });
  });

  describe('createApproval', () => {
    it('should create approval', () => {
      const rc = manager.createReleaseCandidate('v1.0.0', 1, 'build-001', 'RC1', [], [], [], '');
      const approval = manager.createApproval(rc.rcId, 'Manager', 'Looks good');

      expect(approval).toBeDefined();
      expect(approval.approvalId).toMatch(/^APR-/);
      expect(approval.approvalStatus).toBe('pending');
    });
  });

  describe('getApproval', () => {
    it('should retrieve approval', () => {
      const rc = manager.createReleaseCandidate('v1.0.0', 1, 'build-001', 'RC1', [], [], [], '');
      const created = manager.createApproval(rc.rcId, 'Manager', 'OK');
      const retrieved = manager.getApproval(created.approvalId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.approverName).toBe('Manager');
    });
  });

  describe('getApprovalsByRc', () => {
    it('should retrieve approvals by RC', () => {
      const rc = manager.createReleaseCandidate('v1.0.0', 1, 'build-001', 'RC1', [], [], [], '');

      manager.createApproval(rc.rcId, 'Manager1', 'OK');
      manager.createApproval(rc.rcId, 'Manager2', 'OK');

      const approvals = manager.getApprovalsByRc(rc.rcId);
      expect(approvals.length).toBe(2);
    });
  });

  describe('getAllApprovals', () => {
    it('should retrieve all approvals', () => {
      const rc = manager.createReleaseCandidate('v1.0.0', 1, 'build-001', 'RC1', [], [], [], '');

      manager.createApproval(rc.rcId, 'Manager1', 'OK');
      manager.createApproval(rc.rcId, 'Manager2', 'OK');

      const all = manager.getAllApprovals();
      expect(all.length).toBe(2);
    });
  });

  describe('updateApprovalStatus', () => {
    it('should update approval status', () => {
      const rc = manager.createReleaseCandidate('v1.0.0', 1, 'build-001', 'RC1', [], [], [], '');
      const approval = manager.createApproval(rc.rcId, 'Manager', 'OK');

      const result = manager.updateApprovalStatus(approval.approvalId, 'approved');

      expect(result).toBe(true);

      const updated = manager.getApproval(approval.approvalId);
      expect(updated?.approvalStatus).toBe('approved');
      expect(updated?.approvalDate).toBeDefined();
    });
  });

  describe('getReleaseStats', () => {
    it('should calculate release statistics', () => {
      const rc = manager.createReleaseCandidate('v1.0.0', 1, 'build-001', 'RC1', [], [], [], '');

      manager.createValidationResult(rc.rcId, 'functional', 'passed', 95, {}, []);
      manager.createValidationResult(rc.rcId, 'performance', 'passed', 90, {}, []);
      manager.createApproval(rc.rcId, 'Manager', 'OK');

      const stats = manager.getReleaseStats();

      expect(stats.totalRCs).toBe(1);
      expect(stats.createdRCs).toBe(1);
      expect(stats.totalValidations).toBe(2);
      expect(stats.passedValidations).toBe(2);
      expect(stats.totalApprovals).toBe(1);
      expect(stats.pendingApprovals).toBe(1);
    });
  });

  describe('deleteReleaseCandidate', () => {
    it('should delete RC', () => {
      const rc = manager.createReleaseCandidate('v1.0.0', 1, 'build-001', 'RC1', [], [], [], '');

      const result = manager.deleteReleaseCandidate(rc.rcId);

      expect(result).toBe(true);
      expect(manager.getReleaseCandidate(rc.rcId)).toBeUndefined();
    });
  });

  describe('validation types', () => {
    it('should support different validation types', () => {
      const rc = manager.createReleaseCandidate('v1.0.0', 1, 'build-001', 'RC1', [], [], [], '');

      manager.createValidationResult(rc.rcId, 'functional', 'passed', 95, {}, []);
      manager.createValidationResult(rc.rcId, 'performance', 'passed', 90, {}, []);
      manager.createValidationResult(rc.rcId, 'security', 'passed', 98, {}, []);
      manager.createValidationResult(rc.rcId, 'compatibility', 'passed', 92, {}, []);
      manager.createValidationResult(rc.rcId, 'stability', 'passed', 94, {}, []);

      const stats = manager.getReleaseStats();

      expect(stats.totalValidations).toBe(5);
      expect(stats.passedValidations).toBe(5);
    });
  });

  describe('approval workflow', () => {
    it('should handle approval workflow', () => {
      const rc = manager.createReleaseCandidate('v1.0.0', 1, 'build-001', 'RC1', [], [], [], '');
      const approval = manager.createApproval(rc.rcId, 'Manager', 'Pending review');

      expect(approval.approvalStatus).toBe('pending');

      manager.updateApprovalStatus(approval.approvalId, 'approved');
      const updated = manager.getApproval(approval.approvalId);

      expect(updated?.approvalStatus).toBe('approved');
      expect(updated?.approvalDate).toBeDefined();
    });
  });
});
