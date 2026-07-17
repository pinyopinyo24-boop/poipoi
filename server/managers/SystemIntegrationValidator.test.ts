/**
 * SystemIntegrationValidator Tests - 20個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { systemIntegrationValidator, SystemIntegrationValidator } from './SystemIntegrationValidator';

describe('SystemIntegrationValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    systemIntegrationValidator.cleanup();
  });

  afterEach(() => {
    systemIntegrationValidator.cleanup();
  });

  describe('Component Validation', () => {
    it('should start component validation', () => {
      const validation = systemIntegrationValidator.startComponentValidation('chat', 'Chat System');
      expect(validation.componentId).toBeDefined();
      expect(validation.status).toBe('validating');
    });

    it('should get component validation', () => {
      const started = systemIntegrationValidator.startComponentValidation('chat', 'Chat System');
      const validation = systemIntegrationValidator.getComponentValidation(started.componentId);
      expect(validation).not.toBeNull();
      expect(validation?.name).toBe('Chat System');
    });

    it('should complete component validation successfully', () => {
      const started = systemIntegrationValidator.startComponentValidation('chat', 'Chat System');
      const completed = systemIntegrationValidator.completeComponentValidation(started.componentId, true);
      expect(completed?.status).toBe('passed');
      expect(completed?.completedAt).toBeDefined();
    });

    it('should complete component validation with failure', () => {
      const started = systemIntegrationValidator.startComponentValidation('chat', 'Chat System');
      const completed = systemIntegrationValidator.completeComponentValidation(started.componentId, false, 'Connection failed');
      expect(completed?.status).toBe('failed');
      expect(completed?.errorMessage).toBe('Connection failed');
    });
  });

  describe('Validation Checks', () => {
    it('should add check to component', () => {
      const validation = systemIntegrationValidator.startComponentValidation('chat', 'Chat System');
      const check = systemIntegrationValidator.addCheck(validation.componentId, 'Connection test');
      expect(check.checkId).toBeDefined();
      expect(check.status).toBe('pending');
    });

    it('should pass check', () => {
      const validation = systemIntegrationValidator.startComponentValidation('chat', 'Chat System');
      const check = systemIntegrationValidator.addCheck(validation.componentId, 'Connection test');
      const passed = systemIntegrationValidator.passCheck(validation.componentId, check.checkId, 'Connected');
      expect(passed?.status).toBe('passed');
      expect(passed?.message).toBe('Connected');
    });

    it('should fail check', () => {
      const validation = systemIntegrationValidator.startComponentValidation('chat', 'Chat System');
      const check = systemIntegrationValidator.addCheck(validation.componentId, 'Connection test');
      const failed = systemIntegrationValidator.failCheck(validation.componentId, check.checkId, 'Connection timeout');
      expect(failed?.status).toBe('failed');
      expect(failed?.message).toBe('Connection timeout');
    });

    it('should add multiple checks', () => {
      const validation = systemIntegrationValidator.startComponentValidation('chat', 'Chat System');
      systemIntegrationValidator.addCheck(validation.componentId, 'Check 1');
      systemIntegrationValidator.addCheck(validation.componentId, 'Check 2');
      systemIntegrationValidator.addCheck(validation.componentId, 'Check 3');
      const updated = systemIntegrationValidator.getComponentValidation(validation.componentId);
      expect(updated?.checks.length).toBe(3);
    });
  });

  describe('Overall Validation Result', () => {
    it('should get overall validation result', () => {
      const validation1 = systemIntegrationValidator.startComponentValidation('chat', 'Chat System');
      const validation2 = systemIntegrationValidator.startComponentValidation('ai', 'AI System');

      systemIntegrationValidator.completeComponentValidation(validation1.componentId, true);
      systemIntegrationValidator.completeComponentValidation(validation2.componentId, true);

      const result = systemIntegrationValidator.getOverallValidationResult();
      expect(result.totalComponents).toBe(2);
      expect(result.passedComponents).toBe(2);
      expect(result.allComponentsPassed).toBe(true);
    });

    it('should calculate success rate', () => {
      const validation1 = systemIntegrationValidator.startComponentValidation('chat', 'Chat System');
      const validation2 = systemIntegrationValidator.startComponentValidation('ai', 'AI System');

      systemIntegrationValidator.completeComponentValidation(validation1.componentId, true);
      systemIntegrationValidator.completeComponentValidation(validation2.componentId, false);

      const result = systemIntegrationValidator.getOverallValidationResult();
      expect(result.successRate).toBe(50);
    });

    it('should detect failed components', () => {
      const validation1 = systemIntegrationValidator.startComponentValidation('chat', 'Chat System');
      const validation2 = systemIntegrationValidator.startComponentValidation('ai', 'AI System');

      systemIntegrationValidator.completeComponentValidation(validation1.componentId, true);
      systemIntegrationValidator.completeComponentValidation(validation2.componentId, false);

      const result = systemIntegrationValidator.getOverallValidationResult();
      expect(result.failedComponents).toBe(1);
      expect(result.allComponentsPassed).toBe(false);
    });
  });

  describe('Validation by Type', () => {
    it('should get validations by type', () => {
      systemIntegrationValidator.startComponentValidation('chat', 'Chat System 1');
      systemIntegrationValidator.startComponentValidation('chat', 'Chat System 2');
      systemIntegrationValidator.startComponentValidation('ai', 'AI System');

      const chatValidations = systemIntegrationValidator.getValidationsByType('chat');
      expect(chatValidations.length).toBe(2);
    });
  });

  describe('Failed Components', () => {
    it('should get failed components', () => {
      const validation1 = systemIntegrationValidator.startComponentValidation('chat', 'Chat System');
      const validation2 = systemIntegrationValidator.startComponentValidation('ai', 'AI System');

      systemIntegrationValidator.completeComponentValidation(validation1.componentId, true);
      systemIntegrationValidator.completeComponentValidation(validation2.componentId, false);

      const failed = systemIntegrationValidator.getFailedComponents();
      expect(failed.length).toBe(1);
      expect(failed[0].name).toBe('AI System');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      systemIntegrationValidator.startComponentValidation('chat', 'Chat System');
      systemIntegrationValidator.cleanup();
      const result = systemIntegrationValidator.getOverallValidationResult();
      expect(result.totalComponents).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = SystemIntegrationValidator.getInstance();
      const instance2 = SystemIntegrationValidator.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
