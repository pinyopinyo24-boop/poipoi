/**
 * ComplianceAIManager Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { complianceAIManager, ComplianceAIManager } from './ComplianceAIManager';

describe('ComplianceAIManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    complianceAIManager.cleanup();
  });

  afterEach(() => {
    complianceAIManager.cleanup();
  });

  // === チェック作成テスト ===
  describe('Create Check', () => {
    it('should create check', () => {
      const check = complianceAIManager.createCheck(
        'Data Protection',
        'Check data protection compliance',
        'security',
        'high'
      );
      expect(check).not.toBeNull();
      expect(check.status).toBe('active');
    });

    it('should get check', () => {
      const created = complianceAIManager.createCheck(
        'Data Protection',
        'Check data protection compliance',
        'security',
        'high'
      );
      const retrieved = complianceAIManager.getCheck(created.id);
      expect(retrieved).not.toBeNull();
    });

    it('should get all checks', () => {
      complianceAIManager.createCheck('Check 1', 'Description 1', 'security', 'high');
      complianceAIManager.createCheck('Check 2', 'Description 2', 'privacy', 'medium');
      const checks = complianceAIManager.getAllChecks();
      expect(checks.length).toBe(2);
    });
  });

  // === 違反検知テスト ===
  describe('Detect Violation', () => {
    it('should detect violation', () => {
      const check = complianceAIManager.createCheck(
        'Data Protection',
        'Check data protection compliance',
        'security',
        'high'
      );
      const violation = complianceAIManager.detectViolation(
        check.id,
        1,
        'Data not encrypted',
        'high'
      );
      expect(violation.status).toBe('open');
    });

    it('should get user violations', () => {
      const check = complianceAIManager.createCheck(
        'Data Protection',
        'Check data protection compliance',
        'security',
        'high'
      );
      complianceAIManager.detectViolation(check.id, 1, 'Data not encrypted', 'high');
      const violations = complianceAIManager.getUserViolations(1);
      expect(violations.length).toBe(1);
    });

    it('should resolve violation', () => {
      const check = complianceAIManager.createCheck(
        'Data Protection',
        'Check data protection compliance',
        'security',
        'high'
      );
      const violation = complianceAIManager.detectViolation(
        check.id,
        1,
        'Data not encrypted',
        'high'
      );
      const resolved = complianceAIManager.resolveViolation(violation.id);
      expect(resolved?.status).toBe('resolved');
    });
  });

  // === コンプライアンス率計算テスト ===
  describe('Calculate Compliance Rate', () => {
    it('should calculate compliance rate', () => {
      complianceAIManager.createCheck('Check 1', 'Description 1', 'security', 'high');
      const rate = complianceAIManager.calculateComplianceRate(1);
      expect(rate.rate >= 0 && rate.rate <= 100).toBe(true);
    });
  });

  // === ポリシー管理テスト ===
  describe('Policy Management', () => {
    it('should create policy', () => {
      const policy = complianceAIManager.createPolicy(
        'Data Protection Policy',
        'Policy for data protection',
        'All data must be encrypted'
      );
      expect(policy.status).toBe('draft');
    });

    it('should activate policy', () => {
      const policy = complianceAIManager.createPolicy(
        'Data Protection Policy',
        'Policy for data protection',
        'All data must be encrypted'
      );
      const activated = complianceAIManager.activatePolicy(policy.id);
      expect(activated?.status).toBe('active');
    });

    it('should update policy', () => {
      const policy = complianceAIManager.createPolicy(
        'Data Protection Policy',
        'Policy for data protection',
        'All data must be encrypted'
      );
      const updated = complianceAIManager.updatePolicy(policy.id, 'Updated content');
      expect(updated?.version).toBe(2);
    });
  });

  // === リスク評価テスト ===
  describe('Assess Risk', () => {
    it('should assess risk', () => {
      const check = complianceAIManager.createCheck(
        'Data Protection',
        'Check data protection compliance',
        'security',
        'critical'
      );
      complianceAIManager.detectViolation(check.id, 1, 'Critical issue', 'critical');
      const risk = complianceAIManager.assessRisk(1);
      expect(['low', 'medium', 'high', 'critical']).toContain(risk.riskLevel);
    });
  });

  // === 監査実行テスト ===
  describe('Execute Audit', () => {
    it('should execute audit', () => {
      const check = complianceAIManager.createCheck(
        'Data Protection',
        'Check data protection compliance',
        'security',
        'high'
      );
      const audit = complianceAIManager.executeAudit(1);
      expect(audit.auditId).toBeDefined();
      expect(audit.userId).toBe(1);
    });
  });

  // === レポート生成テスト ===
  describe('Generate Report', () => {
    it('should generate report', () => {
      complianceAIManager.createCheck('Check 1', 'Description 1', 'security', 'high');
      const report = complianceAIManager.generateReport(1);
      expect(report.userId).toBe(1);
      expect(report.summary).toBeDefined();
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup specific user', () => {
      const check = complianceAIManager.createCheck(
        'Data Protection',
        'Check data protection compliance',
        'security',
        'high'
      );
      complianceAIManager.detectViolation(check.id, 1, 'Data not encrypted', 'high');
      complianceAIManager.cleanup(1);
      const violations = complianceAIManager.getUserViolations(1);
      expect(violations.length).toBe(0);
    });

    it('should cleanup all', () => {
      const check = complianceAIManager.createCheck(
        'Data Protection',
        'Check data protection compliance',
        'security',
        'high'
      );
      complianceAIManager.detectViolation(check.id, 1, 'Data not encrypted', 'high');
      complianceAIManager.cleanup();
      const checks = complianceAIManager.getAllChecks();
      expect(checks.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = ComplianceAIManager.getInstance();
      const instance2 = ComplianceAIManager.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
