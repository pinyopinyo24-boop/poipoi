/**
 * InstallationValidationService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installationValidationService, InstallationValidationService } from './InstallationValidationService';

describe('InstallationValidationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installationValidationService.cleanup();
  });

  afterEach(() => {
    installationValidationService.cleanup();
  });

  describe('Validation Management', () => {
    it('should start validation', () => {
      const validation = installationValidationService.startValidation('device123', '/path/to/app.apk');
      expect(validation.validationId).toBeDefined();
      expect(validation.status).toBe('validating');
    });

    it('should get validation', () => {
      const started = installationValidationService.startValidation('device123', '/path/to/app.apk');
      const validation = installationValidationService.getValidation(started.validationId);
      expect(validation).not.toBeNull();
      expect(validation?.deviceId).toBe('device123');
    });
  });

  describe('Validation Execution', () => {
    it('should pass validation', () => {
      const started = installationValidationService.startValidation('device123', '/path/to/app.apk');
      const passed = installationValidationService.passValidation(started.validationId, true, true, {
        uiLoaded: true,
        chatWorking: true,
      });
      expect(passed?.status).toBe('passed');
      expect(passed?.appInstalled).toBe(true);
      expect(passed?.appRunning).toBe(true);
    });

    it('should fail validation', () => {
      const started = installationValidationService.startValidation('device123', '/path/to/app.apk');
      const failed = installationValidationService.failValidation(started.validationId, 'Installation failed');
      expect(failed?.status).toBe('failed');
      expect(failed?.errorMessage).toBe('Installation failed');
    });
  });

  describe('Validation Queries', () => {
    it('should get validations by device', () => {
      const val1 = installationValidationService.startValidation('device123', '/path/to/app.apk');
      const val2 = installationValidationService.startValidation('device123', '/path/to/app.apk');
      const val3 = installationValidationService.startValidation('device456', '/path/to/app.apk');

      installationValidationService.passValidation(val1.validationId, true, true);
      installationValidationService.passValidation(val2.validationId, true, true);
      installationValidationService.passValidation(val3.validationId, true, true);

      const device123Validations = installationValidationService.getValidationsByDevice('device123');
      expect(device123Validations.length).toBe(2);
    });

    it('should get passed validations', () => {
      const val1 = installationValidationService.startValidation('device123', '/path/to/app.apk');
      const val2 = installationValidationService.startValidation('device123', '/path/to/app.apk');

      installationValidationService.passValidation(val1.validationId, true, true);
      installationValidationService.failValidation(val2.validationId, 'Failed');

      const passed = installationValidationService.getPassedValidations();
      expect(passed.length).toBe(1);
    });

    it('should get failed validations', () => {
      const val1 = installationValidationService.startValidation('device123', '/path/to/app.apk');
      const val2 = installationValidationService.startValidation('device123', '/path/to/app.apk');

      installationValidationService.passValidation(val1.validationId, true, true);
      installationValidationService.failValidation(val2.validationId, 'Failed');

      const failed = installationValidationService.getFailedValidations();
      expect(failed.length).toBe(1);
    });
  });

  describe('Validation Statistics', () => {
    it('should get validation statistics', () => {
      const val1 = installationValidationService.startValidation('device123', '/path/to/app.apk');
      const val2 = installationValidationService.startValidation('device123', '/path/to/app.apk');

      installationValidationService.passValidation(val1.validationId, true, true);
      installationValidationService.passValidation(val2.validationId, true, true);

      const stats = installationValidationService.getValidationStatistics();
      expect(stats.totalValidations).toBe(2);
      expect(stats.passedValidations).toBe(2);
      expect(stats.successRate).toBe(100);
    });

    it('should calculate success rate with failures', () => {
      const val1 = installationValidationService.startValidation('device123', '/path/to/app.apk');
      const val2 = installationValidationService.startValidation('device123', '/path/to/app.apk');

      installationValidationService.passValidation(val1.validationId, true, true);
      installationValidationService.failValidation(val2.validationId, 'Failed');

      const stats = installationValidationService.getValidationStatistics();
      expect(stats.successRate).toBe(50);
      expect(stats.failedValidations).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      installationValidationService.startValidation('device123', '/path/to/app.apk');
      installationValidationService.cleanup();
      const stats = installationValidationService.getValidationStatistics();
      expect(stats.totalValidations).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = InstallationValidationService.getInstance();
      const instance2 = InstallationValidationService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
