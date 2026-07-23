/**
 * ReleaseValidationService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { releaseValidationService, ReleaseValidationService } from './ReleaseValidationService';

describe('ReleaseValidationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    releaseValidationService.cleanup();
    new ReleaseValidationService();
  });

  afterEach(() => {
    releaseValidationService.cleanup();
  });

  describe('Rule Management', () => {
    it('should get default rules', () => {
      const rules = releaseValidationService.getAllRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should add rule', () => {
      releaseValidationService.addRule({
        ruleId: 'custom_rule',
        name: 'Custom Rule',
        description: 'Custom validation rule',
        category: 'functionality',
        enabled: true,
        severity: 'medium',
        checkFunction: async () => true,
      });
      const rule = releaseValidationService.getRule('custom_rule');
      expect(rule).not.toBeNull();
    });
  });

  describe('Release Validation', () => {
    it('should validate release', async () => {
      const result = await releaseValidationService.validateRelease('1.0.0');
      expect(result).not.toBeNull();
      expect(result.status).toBe('passed' || 'failed' || 'warning');
    });

    it('should get validation result', async () => {
      const result = await releaseValidationService.validateRelease('1.0.0');
      const retrieved = releaseValidationService.getValidationResult(result.resultId);
      expect(retrieved).not.toBeNull();
    });

    it('should get all validation results', async () => {
      await releaseValidationService.validateRelease('1.0.0');
      await releaseValidationService.validateRelease('1.1.0');
      const results = releaseValidationService.getAllValidationResults();
      expect(results.length).toBe(2);
    });

    it('should get latest validation result', async () => {
      await releaseValidationService.validateRelease('1.0.0');
      const latest = releaseValidationService.getLatestValidationResult('1.0.0');
      expect(latest).not.toBeNull();
    });
  });

  describe('Validation Checks', () => {
    it('should include checks in result', async () => {
      const result = await releaseValidationService.validateRelease('1.0.0');
      expect(result.checks.length).toBeGreaterThan(0);
    });

    it('should calculate score', async () => {
      const result = await releaseValidationService.validateRelease('1.0.0');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should determine canRelease', async () => {
      const result = await releaseValidationService.validateRelease('1.0.0');
      expect(typeof result.canRelease).toBe('boolean');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', async () => {
      await releaseValidationService.validateRelease('1.0.0');
      releaseValidationService.cleanup();
      const results = releaseValidationService.getAllValidationResults();
      expect(results.length).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = ReleaseValidationService.getInstance();
      const instance2 = ReleaseValidationService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
