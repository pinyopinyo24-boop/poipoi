import { describe, it, expect, beforeEach } from 'vitest';
import { ProductionValidator } from './ProductionValidator';

describe('ProductionValidator', () => {
  let validator: ProductionValidator;

  beforeEach(() => {
    validator = new ProductionValidator();
  });

  describe('registerRule', () => {
    it('should register a validation rule', () => {
      const rule = validator.registerRule(
        'Code Quality',
        'Check code quality',
        'code',
        'error',
        () => true
      );

      expect(rule).toBeDefined();
      expect(rule.name).toBe('Code Quality');
      expect(rule.ruleId).toMatch(/^VAL-/);
    });
  });

  describe('getRule', () => {
    it('should retrieve a rule', () => {
      const created = validator.registerRule(
        'Code Quality',
        'Check code quality',
        'code',
        'error',
        () => true
      );
      const retrieved = validator.getRule(created.ruleId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Code Quality');
    });

    it('should return undefined for non-existent rule', () => {
      expect(validator.getRule('non-existent')).toBeUndefined();
    });
  });

  describe('getRulesByCategory', () => {
    it('should retrieve rules by category', () => {
      validator.registerRule('Code1', 'Desc', 'code', 'error', () => true);
      validator.registerRule('Code2', 'Desc', 'code', 'error', () => true);
      validator.registerRule('Security', 'Desc', 'security', 'error', () => true);

      const codeRules = validator.getRulesByCategory('code');
      expect(codeRules.length).toBe(2);
    });
  });

  describe('executeRule', () => {
    it('should execute a rule', () => {
      const rule = validator.registerRule(
        'Code Quality',
        'Check code quality',
        'code',
        'error',
        () => true
      );

      const result = validator.executeRule(rule.ruleId, {});

      expect(result).toBeDefined();
      expect(result?.passed).toBe(true);
      expect(result?.resultId).toMatch(/^RES-/);
    });

    it('should handle rule failure', () => {
      const rule = validator.registerRule(
        'Code Quality',
        'Check code quality',
        'code',
        'error',
        () => false
      );

      const result = validator.executeRule(rule.ruleId, {});

      expect(result?.passed).toBe(false);
    });

    it('should return null for non-existent rule', () => {
      expect(validator.executeRule('non-existent', {})).toBeNull();
    });
  });

  describe('getResult', () => {
    it('should retrieve a result', () => {
      const rule = validator.registerRule(
        'Code Quality',
        'Check code quality',
        'code',
        'error',
        () => true
      );

      const created = validator.executeRule(rule.ruleId, {});
      const retrieved = validator.getResult(created!.resultId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.passed).toBe(true);
    });
  });

  describe('validateAll', () => {
    it('should validate all rules', () => {
      validator.registerRule('Rule1', 'Desc', 'code', 'error', () => true);
      validator.registerRule('Rule2', 'Desc', 'code', 'error', () => true);

      const report = validator.validateAll({});

      expect(report).toBeDefined();
      expect(report.totalRules).toBe(2);
      expect(report.passedRules).toBe(2);
      expect(report.status).toBe('valid');
    });

    it('should set status to invalid for failed rules', () => {
      validator.registerRule('Rule1', 'Desc', 'code', 'error', () => false);

      const report = validator.validateAll({});

      expect(report.status).toBe('invalid');
      expect(report.canDeploy).toBe(false);
    });

    it('should set status to warning for warning rules', () => {
      validator.registerRule('Rule1', 'Desc', 'code', 'warning', () => false);

      const report = validator.validateAll({});

      expect(report.status).toBe('warning');
    });
  });

  describe('getReport', () => {
    it('should retrieve a report', () => {
      validator.registerRule('Rule1', 'Desc', 'code', 'error', () => true);
      const created = validator.validateAll({});

      const retrieved = validator.getReport(created.reportId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.passedRules).toBe(1);
    });
  });

  describe('getAllReports', () => {
    it('should retrieve all reports', () => {
      validator.registerRule('Rule1', 'Desc', 'code', 'error', () => true);
      validator.validateAll({});
      validator.validateAll({});

      const all = validator.getAllReports();
      expect(all.length).toBe(2);
    });
  });

  describe('getLatestReport', () => {
    it('should retrieve latest report', () => {
      validator.registerRule('Rule1', 'Desc', 'code', 'error', () => true);
      validator.validateAll({});
      
      // Add small delay to ensure different timestamp
      const latest = validator.validateAll({});

      const retrieved = validator.getLatestReport();
      expect(retrieved?.timestamp).toBeGreaterThanOrEqual(latest.timestamp);
    });
  });

  describe('canDeploy', () => {
    it('should return true when validation passes', () => {
      validator.registerRule('Rule1', 'Desc', 'code', 'error', () => true);
      validator.validateAll({});

      expect(validator.canDeploy()).toBe(true);
    });

    it('should return false when validation fails', () => {
      validator.registerRule('Rule1', 'Desc', 'code', 'error', () => false);
      validator.validateAll({});

      expect(validator.canDeploy()).toBe(false);
    });

    it('should return false when no report exists', () => {
      expect(validator.canDeploy()).toBe(false);
    });
  });

  describe('getValidationStats', () => {
    it('should calculate validation statistics', () => {
      validator.registerRule('Rule1', 'Desc', 'code', 'error', () => true);
      validator.registerRule('Rule2', 'Desc', 'code', 'error', () => true);
      validator.validateAll({});

      const stats = validator.getValidationStats();

      expect(stats.totalRules).toBe(2);
      expect(stats.passRate).toBeGreaterThan(0);
    });
  });

  describe('getAllRules', () => {
    it('should retrieve all rules', () => {
      validator.registerRule('Rule1', 'Desc', 'code', 'error', () => true);
      validator.registerRule('Rule2', 'Desc', 'code', 'error', () => true);

      const all = validator.getAllRules();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllResults', () => {
    it('should retrieve all results', () => {
      const rule = validator.registerRule(
        'Rule1',
        'Desc',
        'code',
        'error',
        () => true
      );

      validator.executeRule(rule.ruleId, {});
      validator.executeRule(rule.ruleId, {});

      const all = validator.getAllResults();
      expect(all.length).toBe(2);
    });
  });

  describe('getFailedValidations', () => {
    it('should retrieve failed validations', () => {
      const rule = validator.registerRule(
        'Rule1',
        'Desc',
        'code',
        'error',
        () => false
      );

      validator.executeRule(rule.ruleId, {});

      const failed = validator.getFailedValidations();
      expect(failed.length).toBe(1);
    });
  });

  describe('deleteRule', () => {
    it('should delete a rule', () => {
      const rule = validator.registerRule(
        'Rule1',
        'Desc',
        'code',
        'error',
        () => true
      );

      const result = validator.deleteRule(rule.ruleId);
      expect(result).toBe(true);
      expect(validator.getRule(rule.ruleId)).toBeUndefined();
    });

    it('should return false for non-existent rule', () => {
      expect(validator.deleteRule('non-existent')).toBe(false);
    });
  });

  describe('deleteReport', () => {
    it('should delete a report', () => {
      validator.registerRule('Rule1', 'Desc', 'code', 'error', () => true);
      const report = validator.validateAll({});

      const result = validator.deleteReport(report.reportId);
      expect(result).toBe(true);
      expect(validator.getReport(report.reportId)).toBeUndefined();
    });
  });

  describe('generateValidationReport', () => {
    it('should generate validation report', () => {
      validator.registerRule('Rule1', 'Desc', 'code', 'error', () => false);
      const report = validator.validateAll({});

      const generated = validator.generateValidationReport(report.reportId);

      expect(generated.report).toBeDefined();
      expect(generated.summary).toContain('検証');
      expect(generated.failedItems.length).toBeGreaterThan(0);
    });
  });
});
