/**
 * PolicyComplianceService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { policyComplianceService, PolicyComplianceService } from './PolicyComplianceService';

describe('PolicyComplianceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    policyComplianceService.cleanup();
  });

  afterEach(() => {
    policyComplianceService.cleanup();
  });

  // === ポリシー適用テスト ===
  describe('Apply Policy', () => {
    it('should apply policy', () => {
      const application = policyComplianceService.applyPolicy(1, 'policy_1');
      expect(application.status).toBe('active');
    });

    it('should get application', () => {
      const created = policyComplianceService.applyPolicy(1, 'policy_1');
      const retrieved = policyComplianceService.getApplication(created.id);
      expect(retrieved).not.toBeNull();
    });

    it('should get user applications', () => {
      policyComplianceService.applyPolicy(1, 'policy_1');
      policyComplianceService.applyPolicy(1, 'policy_2');
      const applications = policyComplianceService.getUserApplications(1);
      expect(applications.length).toBe(2);
    });
  });

  // === ポリシー準拠確認テスト ===
  describe('Check Compliance', () => {
    it('should check compliance', () => {
      policyComplianceService.applyPolicy(1, 'policy_1');
      const isCompliant = policyComplianceService.isUserCompliant(1, 'policy_1');
      expect(isCompliant).toBe(true);
    });

    it('should detect non-compliant', () => {
      const isCompliant = policyComplianceService.isUserCompliant(1, 'policy_1');
      expect(isCompliant).toBe(false);
    });

    it('should detect expired', () => {
      const now = Date.now();
      policyComplianceService.applyPolicy(1, 'policy_1', now - 1000);
      const isCompliant = policyComplianceService.isUserCompliant(1, 'policy_1');
      expect(isCompliant).toBe(false);
    });
  });

  // === ポリシー取り消しテスト ===
  describe('Revoke Application', () => {
    it('should revoke application', () => {
      const application = policyComplianceService.applyPolicy(1, 'policy_1');
      const revoked = policyComplianceService.revokeApplication(application.id);
      expect(revoked?.status).toBe('revoked');
    });
  });

  // === バージョン管理テスト ===
  describe('Version Management', () => {
    it('should add version', () => {
      const version = policyComplianceService.addVersion(
        'policy_1',
        1,
        'Policy content',
        'admin',
        'Initial version'
      );
      expect(version.version).toBe(1);
    });

    it('should get version', () => {
      policyComplianceService.addVersion(
        'policy_1',
        1,
        'Policy content',
        'admin',
        'Initial version'
      );
      const version = policyComplianceService.getVersion('policy_1', 1);
      expect(version).not.toBeNull();
    });

    it('should get version history', () => {
      policyComplianceService.addVersion(
        'policy_1',
        1,
        'Policy content v1',
        'admin',
        'Initial version'
      );
      policyComplianceService.addVersion(
        'policy_1',
        2,
        'Policy content v2',
        'admin',
        'Updated version'
      );
      const history = policyComplianceService.getVersionHistory('policy_1');
      expect(history.length).toBe(2);
    });
  });

  // === コンプライアンス確認テスト ===
  describe('Check Compliance Stats', () => {
    it('should check compliance stats', () => {
      policyComplianceService.applyPolicy(1, 'policy_1');
      const stats = policyComplianceService.checkCompliance(1);
      expect(stats.compliantPolicies).toBe(1);
    });
  });

  // === コンプライアンスレポート生成テスト ===
  describe('Generate Compliance Report', () => {
    it('should generate compliance report', () => {
      policyComplianceService.applyPolicy(1, 'policy_1');
      const report = policyComplianceService.generateComplianceReport(1);
      expect(report.userId).toBe(1);
      expect(report.complianceStatus).toBeDefined();
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup specific user', () => {
      policyComplianceService.applyPolicy(1, 'policy_1');
      policyComplianceService.cleanup(1);
      const applications = policyComplianceService.getUserApplications(1);
      expect(applications.length).toBe(0);
    });

    it('should cleanup all', () => {
      policyComplianceService.applyPolicy(1, 'policy_1');
      policyComplianceService.applyPolicy(2, 'policy_2');
      policyComplianceService.cleanup();
      const applications1 = policyComplianceService.getUserApplications(1);
      const applications2 = policyComplianceService.getUserApplications(2);
      expect(applications1.length).toBe(0);
      expect(applications2.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = PolicyComplianceService.getInstance();
      const instance2 = PolicyComplianceService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
