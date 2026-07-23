/**
 * RuntimeValidationService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runtimeValidationService, RuntimeValidationService } from './RuntimeValidationService';

describe('RuntimeValidationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeValidationService.cleanup();
  });

  afterEach(() => {
    runtimeValidationService.cleanup();
  });

  describe('Validation Management', () => {
    it('should start validation', () => {
      const validation = runtimeValidationService.startValidation('device123');
      expect(validation.validationId).toBeDefined();
      expect(validation.status).toBe('validating');
    });

    it('should get validation', () => {
      const started = runtimeValidationService.startValidation('device123');
      const validation = runtimeValidationService.getValidation(started.validationId);
      expect(validation).not.toBeNull();
      expect(validation?.deviceId).toBe('device123');
    });
  });

  describe('Validation Execution', () => {
    it('should pass validation', () => {
      const started = runtimeValidationService.startValidation('device123');
      const passed = runtimeValidationService.passValidation(
        started.validationId,
        25,
        45,
        15,
        60,
        200
      );
      expect(passed?.status).toBe('passed');
      expect(passed?.cpuUsage).toBe(25);
      expect(passed?.memoryUsage).toBe(45);
    });

    it('should fail validation', () => {
      const started = runtimeValidationService.startValidation('device123');
      const failed = runtimeValidationService.failValidation(started.validationId, [
        'High CPU usage',
        'Low frame rate',
      ]);
      expect(failed?.status).toBe('failed');
      expect(failed?.issues?.length).toBe(2);
    });
  });

  describe('Validation Queries', () => {
    it('should get validations by device', () => {
      const val1 = runtimeValidationService.startValidation('device123');
      const val2 = runtimeValidationService.startValidation('device123');
      const val3 = runtimeValidationService.startValidation('device456');

      runtimeValidationService.passValidation(val1.validationId, 25, 45, 15, 60, 200);
      runtimeValidationService.passValidation(val2.validationId, 25, 45, 15, 60, 200);
      runtimeValidationService.passValidation(val3.validationId, 25, 45, 15, 60, 200);

      const device123Validations = runtimeValidationService.getValidationsByDevice('device123');
      expect(device123Validations.length).toBe(2);
    });

    it('should get passed validations', () => {
      const val1 = runtimeValidationService.startValidation('device123');
      const val2 = runtimeValidationService.startValidation('device123');

      runtimeValidationService.passValidation(val1.validationId, 25, 45, 15, 60, 200);
      runtimeValidationService.failValidation(val2.validationId, ['Failed']);

      const passed = runtimeValidationService.getPassedValidations();
      expect(passed.length).toBe(1);
    });
  });

  describe('Validation Statistics', () => {
    it('should get validation statistics', () => {
      const val1 = runtimeValidationService.startValidation('device123');
      const val2 = runtimeValidationService.startValidation('device123');

      runtimeValidationService.passValidation(val1.validationId, 25, 45, 15, 60, 200);
      runtimeValidationService.passValidation(val2.validationId, 35, 55, 20, 55, 250);

      const stats = runtimeValidationService.getValidationStatistics();
      expect(stats.totalValidations).toBe(2);
      expect(stats.passedValidations).toBe(2);
      expect(stats.averageCpuUsage).toBe(30);
      expect(stats.averageMemoryUsage).toBe(50);
    });

    it('should calculate averages correctly', () => {
      const val1 = runtimeValidationService.startValidation('device123');
      const val2 = runtimeValidationService.startValidation('device123');

      runtimeValidationService.passValidation(val1.validationId, 20, 40, 10, 50, 150);
      runtimeValidationService.passValidation(val2.validationId, 30, 60, 20, 70, 250);

      const stats = runtimeValidationService.getValidationStatistics();
      expect(stats.averageCpuUsage).toBe(25);
      expect(stats.averageBatteryUsage).toBe(15);
      expect(stats.averageFrameRate).toBe(60);
      expect(stats.averageResponseTime).toBe(200);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      runtimeValidationService.startValidation('device123');
      runtimeValidationService.cleanup();
      const stats = runtimeValidationService.getValidationStatistics();
      expect(stats.totalValidations).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = RuntimeValidationService.getInstance();
      const instance2 = RuntimeValidationService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
