/**
 * SecurityValidationService Tests - 20個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { securityValidationService, SecurityValidationService } from './SecurityValidationService';

describe('SecurityValidationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    securityValidationService.cleanup();
  });

  afterEach(() => {
    securityValidationService.cleanup();
  });

  describe('Security Validation Registration', () => {
    it('should register security validation', () => {
      const validation = securityValidationService.registerSecurityValidation('authentication', 'Auth check', 'critical');
      expect(validation.validationId).toBeDefined();
      expect(validation.status).toBe('pending');
    });

    it('should get security validation', () => {
      const registered = securityValidationService.registerSecurityValidation('authentication', 'Auth check', 'critical');
      const validation = securityValidationService.getValidation(registered.validationId);
      expect(validation).not.toBeNull();
      expect(validation?.checkName).toBe('Auth check');
    });

    it('should get validations by check type', () => {
      securityValidationService.registerSecurityValidation('authentication', 'Auth check 1', 'critical');
      securityValidationService.registerSecurityValidation('authentication', 'Auth check 2', 'high');
      const validations = securityValidationService.getValidationsByCheckType('authentication');
      expect(validations.length).toBe(2);
    });
  });

  describe('Security Validation Execution', () => {
    it('should start validation', () => {
      const registered = securityValidationService.registerSecurityValidation('authentication', 'Auth check', 'critical');
      const started = securityValidationService.startValidation(registered.validationId);
      expect(started?.status).toBe('validating');
      expect(started?.startedAt).toBeDefined();
    });

    it('should pass validation', () => {
      const registered = securityValidationService.registerSecurityValidation('authentication', 'Auth check', 'critical');
      securityValidationService.startValidation(registered.validationId);
      const passed = securityValidationService.passValidation(registered.validationId, 'Auth is secure');
      expect(passed?.status).toBe('passed');
      expect(passed?.recommendation).toBe('Auth is secure');
    });

    it('should fail validation', () => {
      const registered = securityValidationService.registerSecurityValidation('authentication', 'Auth check', 'critical');
      securityValidationService.startValidation(registered.validationId);
      const failed = securityValidationService.failValidation(
        registered.validationId,
        'Auth failed',
        'Implement OAuth2'
      );
      expect(failed?.status).toBe('failed');
      expect(failed?.errorMessage).toBe('Auth failed');
      expect(failed?.recommendation).toBe('Implement OAuth2');
    });

    it('should warn validation', () => {
      const registered = securityValidationService.registerSecurityValidation('encryption', 'Encryption check', 'medium');
      securityValidationService.startValidation(registered.validationId);
      const warned = securityValidationService.warnValidation(
        registered.validationId,
        'Weak encryption',
        'Upgrade to AES-256'
      );
      expect(warned?.status).toBe('warning');
      expect(warned?.errorMessage).toBe('Weak encryption');
    });
  });

  describe('Failed and Warning Validations', () => {
    it('should get failed validations', () => {
      const val1 = securityValidationService.registerSecurityValidation('authentication', 'Auth check', 'critical');
      const val2 = securityValidationService.registerSecurityValidation('authorization', 'Auth check', 'high');

      securityValidationService.startValidation(val1.validationId);
      securityValidationService.failValidation(val1.validationId, 'Failed');

      securityValidationService.startValidation(val2.validationId);
      securityValidationService.passValidation(val2.validationId);

      const failed = securityValidationService.getFailedValidations();
      expect(failed.length).toBe(1);
    });

    it('should get warning validations', () => {
      const val1 = securityValidationService.registerSecurityValidation('encryption', 'Encryption check', 'medium');
      const val2 = securityValidationService.registerSecurityValidation('audit', 'Audit check', 'low');

      securityValidationService.startValidation(val1.validationId);
      securityValidationService.warnValidation(val1.validationId, 'Warning');

      securityValidationService.startValidation(val2.validationId);
      securityValidationService.passValidation(val2.validationId);

      const warnings = securityValidationService.getWarningValidations();
      expect(warnings.length).toBe(1);
    });
  });

  describe('Security Statistics', () => {
    it('should get security statistics', () => {
      const val1 = securityValidationService.registerSecurityValidation('authentication', 'Auth check', 'critical');
      const val2 = securityValidationService.registerSecurityValidation('authorization', 'Auth check', 'high');

      securityValidationService.startValidation(val1.validationId);
      securityValidationService.passValidation(val1.validationId);

      securityValidationService.startValidation(val2.validationId);
      securityValidationService.passValidation(val2.validationId);

      const stats = securityValidationService.getSecurityStatistics();
      expect(stats.totalValidations).toBe(2);
      expect(stats.passedValidations).toBe(2);
      expect(stats.isSecure).toBe(true);
    });

    it('should detect critical issues', () => {
      const val1 = securityValidationService.registerSecurityValidation('authentication', 'Auth check', 'critical');
      const val2 = securityValidationService.registerSecurityValidation('authorization', 'Auth check', 'high');

      securityValidationService.startValidation(val1.validationId);
      securityValidationService.failValidation(val1.validationId, 'Critical failure');

      securityValidationService.startValidation(val2.validationId);
      securityValidationService.passValidation(val2.validationId);

      const stats = securityValidationService.getSecurityStatistics();
      expect(stats.criticalIssues).toBe(1);
      expect(stats.isSecure).toBe(false);
    });

    it('should calculate success rate', () => {
      const val1 = securityValidationService.registerSecurityValidation('authentication', 'Auth check', 'critical');
      const val2 = securityValidationService.registerSecurityValidation('authorization', 'Auth check', 'high');

      securityValidationService.startValidation(val1.validationId);
      securityValidationService.passValidation(val1.validationId);

      securityValidationService.startValidation(val2.validationId);
      securityValidationService.failValidation(val2.validationId, 'Failed');

      const stats = securityValidationService.getSecurityStatistics();
      expect(stats.successRate).toBe(50);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      securityValidationService.registerSecurityValidation('authentication', 'Auth check', 'critical');
      securityValidationService.cleanup();
      const stats = securityValidationService.getSecurityStatistics();
      expect(stats.totalValidations).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = SecurityValidationService.getInstance();
      const instance2 = SecurityValidationService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });

  describe('Multiple Check Types', () => {
    it('should handle multiple check types', () => {
      securityValidationService.registerSecurityValidation('authentication', 'Test 1', 'critical');
      securityValidationService.registerSecurityValidation('authorization', 'Test 2', 'high');
      securityValidationService.registerSecurityValidation('encryption', 'Test 3', 'medium');
      securityValidationService.registerSecurityValidation('audit', 'Test 4', 'low');
      securityValidationService.registerSecurityValidation('dataLeakage', 'Test 5', 'critical');

      const stats = securityValidationService.getSecurityStatistics();
      expect(stats.totalValidations).toBe(5);
    });
  });
});
