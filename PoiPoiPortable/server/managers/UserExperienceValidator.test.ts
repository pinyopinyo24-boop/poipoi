/**
 * UserExperienceValidator Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { userExperienceValidator, UserExperienceValidator } from './UserExperienceValidator';

describe('UserExperienceValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userExperienceValidator.cleanup();
  });

  afterEach(() => {
    userExperienceValidator.cleanup();
  });

  describe('UX Validation', () => {
    it('should validate UX with excellent score', () => {
      const validation = userExperienceValidator.validateUX('device123', 'responsiveness', 95);
      expect(validation.score).toBe('excellent');
    });

    it('should validate UX with good score', () => {
      const validation = userExperienceValidator.validateUX('device123', 'responsiveness', 80);
      expect(validation.score).toBe('good');
    });

    it('should validate UX with acceptable score', () => {
      const validation = userExperienceValidator.validateUX('device123', 'responsiveness', 70);
      expect(validation.score).toBe('acceptable');
    });

    it('should validate UX with poor score', () => {
      const validation = userExperienceValidator.validateUX('device123', 'responsiveness', 50);
      expect(validation.score).toBe('poor');
    });
  });

  describe('UX Queries', () => {
    it('should get validations by device', () => {
      userExperienceValidator.validateUX('device123', 'responsiveness', 95);
      userExperienceValidator.validateUX('device123', 'stability', 85);
      userExperienceValidator.validateUX('device456', 'responsiveness', 90);

      const device123Validations = userExperienceValidator.getValidationsByDevice('device123');
      expect(device123Validations.length).toBe(2);
    });

    it('should get validations by metric', () => {
      userExperienceValidator.validateUX('device123', 'responsiveness', 95);
      userExperienceValidator.validateUX('device456', 'responsiveness', 90);
      userExperienceValidator.validateUX('device123', 'stability', 85);

      const responsivenessValidations = userExperienceValidator.getValidationsByMetric('responsiveness');
      expect(responsivenessValidations.length).toBe(2);
    });

    it('should get excellent validations', () => {
      userExperienceValidator.validateUX('device123', 'responsiveness', 95);
      userExperienceValidator.validateUX('device123', 'stability', 50);

      const excellent = userExperienceValidator.getExcellentValidations();
      expect(excellent.length).toBe(1);
    });

    it('should get poor validations', () => {
      userExperienceValidator.validateUX('device123', 'responsiveness', 95);
      userExperienceValidator.validateUX('device123', 'stability', 50);

      const poor = userExperienceValidator.getPoorValidations();
      expect(poor.length).toBe(1);
    });
  });

  describe('UX Statistics', () => {
    it('should get UX statistics', () => {
      userExperienceValidator.validateUX('device123', 'responsiveness', 95);
      userExperienceValidator.validateUX('device123', 'stability', 85);

      const stats = userExperienceValidator.getUXStatistics();
      expect(stats.totalValidations).toBe(2);
      expect(stats.excellentValidations).toBe(1);
      expect(stats.goodValidations).toBe(1);
      expect(stats.averageScore).toBe(90);
    });

    it('should calculate metric-specific scores', () => {
      userExperienceValidator.validateUX('device123', 'responsiveness', 100);
      userExperienceValidator.validateUX('device123', 'responsiveness', 80);
      userExperienceValidator.validateUX('device123', 'stability', 90);

      const stats = userExperienceValidator.getUXStatistics();
      expect(stats.responsivenesScore).toBe(90);
      expect(stats.stabilityScore).toBe(90);
    });

    it('should handle all metrics', () => {
      userExperienceValidator.validateUX('device123', 'responsiveness', 95);
      userExperienceValidator.validateUX('device123', 'stability', 85);
      userExperienceValidator.validateUX('device123', 'usability', 90);
      userExperienceValidator.validateUX('device123', 'accessibility', 80);
      userExperienceValidator.validateUX('device123', 'performance', 88);

      const stats = userExperienceValidator.getUXStatistics();
      expect(stats.responsivenesScore).toBe(95);
      expect(stats.stabilityScore).toBe(85);
      expect(stats.usabilityScore).toBe(90);
      expect(stats.accessibilityScore).toBe(80);
      expect(stats.performanceScore).toBe(88);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      userExperienceValidator.validateUX('device123', 'responsiveness', 95);
      userExperienceValidator.cleanup();
      const stats = userExperienceValidator.getUXStatistics();
      expect(stats.totalValidations).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = UserExperienceValidator.getInstance();
      const instance2 = UserExperienceValidator.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
