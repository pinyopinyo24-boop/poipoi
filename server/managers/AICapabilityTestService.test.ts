/**
 * AICapabilityTestService Tests - 20個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { aiCapabilityTestService, AICapabilityTestService } from './AICapabilityTestService';

describe('AICapabilityTestService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiCapabilityTestService.cleanup();
  });

  afterEach(() => {
    aiCapabilityTestService.cleanup();
  });

  describe('AI Test Registration', () => {
    it('should register AI test', () => {
      const test = aiCapabilityTestService.registerAITest('EvolutionAI', 'chat', 'Chat capability test');
      expect(test.testId).toBeDefined();
      expect(test.status).toBe('pending');
    });

    it('should get AI test', () => {
      const registered = aiCapabilityTestService.registerAITest('EvolutionAI', 'chat', 'Chat capability test');
      const test = aiCapabilityTestService.getAITest(registered.testId);
      expect(test).not.toBeNull();
      expect(test?.testName).toBe('Chat capability test');
    });

    it('should get tests by AI manager', () => {
      aiCapabilityTestService.registerAITest('EvolutionAI', 'chat', 'Test 1');
      aiCapabilityTestService.registerAITest('EvolutionAI', 'reasoning', 'Test 2');
      const tests = aiCapabilityTestService.getTestsByAIManager('EvolutionAI');
      expect(tests.length).toBeGreaterThan(0);
    });

    it('should get tests by capability', () => {
      aiCapabilityTestService.registerAITest('EvolutionAI', 'chat', 'Test 1');
      aiCapabilityTestService.registerAITest('MemoryIntelligenceAI', 'chat', 'Test 2');
      const tests = aiCapabilityTestService.getTestsByCapability('chat');
      expect(tests.length).toBeGreaterThan(0);
    });
  });

  describe('AI Test Execution', () => {
    it('should start AI test', () => {
      const registered = aiCapabilityTestService.registerAITest('EvolutionAI', 'chat', 'Chat capability test');
      const started = aiCapabilityTestService.startAITest(registered.testId);
      expect(started?.status).toBe('running');
      expect(started?.startedAt).toBeDefined();
    });

    it('should pass AI test', () => {
      const registered = aiCapabilityTestService.registerAITest('EvolutionAI', 'chat', 'Chat capability test');
      aiCapabilityTestService.startAITest(registered.testId);
      const passed = aiCapabilityTestService.passAITest(registered.testId, 250, 95);
      expect(passed?.status).toBe('passed');
      expect(passed?.responseTime).toBe(250);
      expect(passed?.qualityScore).toBe(95);
    });

    it('should fail AI test', () => {
      const registered = aiCapabilityTestService.registerAITest('EvolutionAI', 'chat', 'Chat capability test');
      aiCapabilityTestService.startAITest(registered.testId);
      const failed = aiCapabilityTestService.failAITest(registered.testId, 'API timeout');
      expect(failed?.status).toBe('failed');
      expect(failed?.errorMessage).toBe('API timeout');
    });
  });

  describe('AI Test Statistics', () => {
    it('should get AI test statistics', () => {
      const test1 = aiCapabilityTestService.registerAITest('EvolutionAI', 'chat', 'Test 1');
      const test2 = aiCapabilityTestService.registerAITest('MemoryIntelligenceAI', 'reasoning', 'Test 2');

      aiCapabilityTestService.startAITest(test1.testId);
      aiCapabilityTestService.passAITest(test1.testId, 200, 90);

      aiCapabilityTestService.startAITest(test2.testId);
      aiCapabilityTestService.passAITest(test2.testId, 300, 85);

      const stats = aiCapabilityTestService.getAITestStatistics();
      expect(stats.totalTests).toBe(2);
      expect(stats.passedTests).toBe(2);
      expect(stats.successRate).toBe(100);
    });

    it('should calculate average response time', () => {
      const test1 = aiCapabilityTestService.registerAITest('EvolutionAI', 'chat', 'Test 1');
      const test2 = aiCapabilityTestService.registerAITest('MemoryIntelligenceAI', 'reasoning', 'Test 2');

      aiCapabilityTestService.startAITest(test1.testId);
      aiCapabilityTestService.passAITest(test1.testId, 200, 90);

      aiCapabilityTestService.startAITest(test2.testId);
      aiCapabilityTestService.passAITest(test2.testId, 400, 85);

      const stats = aiCapabilityTestService.getAITestStatistics();
      expect(stats.averageResponseTime).toBe(300);
    });

    it('should calculate average quality score', () => {
      const test1 = aiCapabilityTestService.registerAITest('EvolutionAI', 'chat', 'Test 1');
      const test2 = aiCapabilityTestService.registerAITest('MemoryIntelligenceAI', 'reasoning', 'Test 2');

      aiCapabilityTestService.startAITest(test1.testId);
      aiCapabilityTestService.passAITest(test1.testId, 200, 80);

      aiCapabilityTestService.startAITest(test2.testId);
      aiCapabilityTestService.passAITest(test2.testId, 300, 100);

      const stats = aiCapabilityTestService.getAITestStatistics();
      expect(stats.averageQualityScore).toBe(90);
    });

    it('should calculate success rate', () => {
      const test1 = aiCapabilityTestService.registerAITest('EvolutionAI', 'chat', 'Test 1');
      const test2 = aiCapabilityTestService.registerAITest('MemoryIntelligenceAI', 'reasoning', 'Test 2');

      aiCapabilityTestService.startAITest(test1.testId);
      aiCapabilityTestService.passAITest(test1.testId, 200, 90);

      aiCapabilityTestService.startAITest(test2.testId);
      aiCapabilityTestService.failAITest(test2.testId, 'API error');

      const stats = aiCapabilityTestService.getAITestStatistics();
      expect(stats.successRate).toBe(50);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      aiCapabilityTestService.registerAITest('EvolutionAI', 'chat', 'Test');
      aiCapabilityTestService.cleanup();
      const stats = aiCapabilityTestService.getAITestStatistics();
      expect(stats.totalTests).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = AICapabilityTestService.getInstance();
      const instance2 = AICapabilityTestService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });

  describe('Multiple AI Managers', () => {
    it('should handle multiple AI managers', () => {
      aiCapabilityTestService.registerAITest('EvolutionAI', 'chat', 'Test 1');
      aiCapabilityTestService.registerAITest('MemoryIntelligenceAI', 'learning', 'Test 2');
      aiCapabilityTestService.registerAITest('ReasoningAI', 'reasoning', 'Test 3');
      aiCapabilityTestService.registerAITest('ManufacturingIntelligenceAI', 'manufacturing', 'Test 4');

      const stats = aiCapabilityTestService.getAITestStatistics();
      expect(stats.totalTests).toBe(4);
    });
  });

  describe('Test Duration Calculation', () => {
    it('should calculate test duration', () => {
      const test = aiCapabilityTestService.registerAITest('EvolutionAI', 'chat', 'Test');
      const started = aiCapabilityTestService.startAITest(test.testId);
      expect(started?.startedAt).toBeDefined();

      const passed = aiCapabilityTestService.passAITest(test.testId, 200, 90);
      expect(passed?.duration).toBeDefined();
      expect(passed?.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
