/**
 * ComplianceValidator Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { complianceValidator, ComplianceValidator } from './ComplianceValidator';

describe('ComplianceValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    complianceValidator.cleanup();
  });

  afterEach(() => {
    complianceValidator.cleanup();
  });

  // === ルール追加テスト ===
  describe('Add Rule', () => {
    it('should add rule', () => {
      const rule = complianceValidator.addRule(
        'Email Validation',
        'Validate email format',
        (data: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),
        'high'
      );
      expect(rule).not.toBeNull();
    });

    it('should get rule', () => {
      const created = complianceValidator.addRule(
        'Email Validation',
        'Validate email format',
        (data: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),
        'high'
      );
      const retrieved = complianceValidator.getRule(created.id);
      expect(retrieved).not.toBeNull();
    });

    it('should get all rules', () => {
      complianceValidator.addRule(
        'Rule 1',
        'Description 1',
        (data: any) => true,
        'high'
      );
      complianceValidator.addRule(
        'Rule 2',
        'Description 2',
        (data: any) => true,
        'medium'
      );
      const rules = complianceValidator.getAllRules();
      expect(rules.length).toBe(2);
    });
  });

  // === 検証実行テスト ===
  describe('Validate', () => {
    it('should validate data', () => {
      complianceValidator.addRule(
        'Email Validation',
        'Validate email format',
        (data: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),
        'high'
      );
      const results = complianceValidator.validate(1, { email: 'test@example.com' });
      expect(results.length).toBe(1);
    });

    it('should get user results', () => {
      complianceValidator.addRule(
        'Email Validation',
        'Validate email format',
        (data: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),
        'high'
      );
      complianceValidator.validate(1, { email: 'test@example.com' });
      const results = complianceValidator.getUserResults(1);
      expect(results.length).toBe(1);
    });
  });

  // === 検証レポート生成テスト ===
  describe('Generate Validation Report', () => {
    it('should generate validation report', () => {
      complianceValidator.addRule(
        'Email Validation',
        'Validate email format',
        (data: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),
        'high'
      );
      complianceValidator.validate(1, { email: 'test@example.com' });
      const report = complianceValidator.generateValidationReport(1);
      expect(report.userId).toBe(1);
      expect(report.summary).toBeDefined();
    });
  });

  // === 検証統計テスト ===
  describe('Get Validation Stats', () => {
    it('should get validation stats', () => {
      complianceValidator.addRule(
        'Email Validation',
        'Validate email format',
        (data: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),
        'high'
      );
      complianceValidator.validate(1, { email: 'test@example.com' });
      const stats = complianceValidator.getValidationStats(1);
      expect(stats.totalValidations).toBe(1);
    });

    it('should calculate pass rate', () => {
      complianceValidator.addRule(
        'Rule 1',
        'Description 1',
        (data: any) => true,
        'high'
      );
      complianceValidator.validate(1, {});
      const stats = complianceValidator.getValidationStats(1);
      expect(stats.passRate).toBe(100);
    });

    it('should detect critical failures', () => {
      complianceValidator.addRule(
        'Critical Rule',
        'Critical validation',
        (data: any) => false,
        'critical'
      );
      complianceValidator.validate(1, {});
      const stats = complianceValidator.getValidationStats(1);
      expect(stats.criticalFailures).toBe(1);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup specific user', () => {
      complianceValidator.addRule(
        'Email Validation',
        'Validate email format',
        (data: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),
        'high'
      );
      complianceValidator.validate(1, { email: 'test@example.com' });
      complianceValidator.cleanup(1);
      const results = complianceValidator.getUserResults(1);
      expect(results.length).toBe(0);
    });

    it('should cleanup all', () => {
      complianceValidator.addRule(
        'Email Validation',
        'Validate email format',
        (data: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),
        'high'
      );
      complianceValidator.validate(1, { email: 'test@example.com' });
      complianceValidator.cleanup();
      const rules = complianceValidator.getAllRules();
      const results = complianceValidator.getUserResults(1);
      expect(rules.length).toBe(0);
      expect(results.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = ComplianceValidator.getInstance();
      const instance2 = ComplianceValidator.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
