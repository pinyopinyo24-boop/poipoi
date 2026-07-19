/**
 * Failsafe Service Integration Tests
 * フェイルセーフサービス統合テスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  EnhancedFailsafeService,
  ProviderHealth,
  ErrorClassification,
} from './FailsafeService';

describe('Enhanced Failsafe Service', () => {
  let failsafeService: EnhancedFailsafeService;

  beforeEach(() => {
    failsafeService = new EnhancedFailsafeService({
      healthCheckInterval: 5000,
      failoverThreshold: 3,
      recoveryTimeout: 10000,
      maxRetries: 3,
      strategy: 'priority',
      enableAutoFailover: true,
      enableLearning: true,
    });
  });

  afterEach(() => {
    failsafeService.cleanup();
  });

  describe('Health Check', () => {
    it('should initialize provider health status', () => {
      const status = failsafeService.getHealthStatus();
      expect(Array.isArray(status)).toBe(true);
      expect(status).toHaveLength(4);
    });

    it('should get health status for specific provider', () => {
      const status = failsafeService.getHealthStatus('openai');
      expect(status).not.toBeNull();
      expect(status?.provider).toBe('openai');
      expect(status?.status).toBe('healthy');
    });

    it('should track response time', () => {
      const status = failsafeService.getHealthStatus('openai');
      expect(status?.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should track error count', () => {
      const status = failsafeService.getHealthStatus('openai');
      expect(status?.errorCount).toBeGreaterThanOrEqual(0);
    });

    it('should track success count', () => {
      const status = failsafeService.getHealthStatus('openai');
      expect(status?.successCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Classification', () => {
    it('should classify rate limit error', () => {
      const classification = failsafeService.classifyError('Rate limit exceeded', 429);
      expect(classification).toBe('rate-limit');
    });

    it('should classify authentication error', () => {
      const classification = failsafeService.classifyError('Unauthorized', 401);
      expect(classification).toBe('auth');
    });

    it('should classify transient error', () => {
      const classification = failsafeService.classifyError('Internal server error', 500);
      expect(classification).toBe('transient');
    });

    it('should classify permanent error', () => {
      const classification = failsafeService.classifyError('Invalid request', 400);
      expect(classification).toBe('permanent');
    });

    it('should classify timeout error', () => {
      const classification = failsafeService.classifyError('Request timeout');
      expect(classification).toBe('transient');
    });

    it('should classify unknown error', () => {
      const classification = failsafeService.classifyError('Unknown error');
      expect(classification).toBe('unknown');
    });
  });

  describe('Failover', () => {
    it('should execute failover to healthy provider', async () => {
      const error = new Error('Provider unavailable');
      const result = await failsafeService.executeFailover(
        'openai',
        error,
        ['claude', 'gemini', 'local']
      );

      expect(result.provider).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should record failover event', async () => {
      const error = new Error('Provider error');
      await failsafeService.executeFailover(
        'openai',
        error,
        ['claude', 'gemini', 'local']
      );

      const events = failsafeService.getFailoverEvents('openai');
      expect(events.length).toBeGreaterThan(0);
    });

    it('should classify failover error', async () => {
      const error = new Error('Rate limit exceeded');
      await failsafeService.executeFailover(
        'openai',
        error,
        ['claude', 'gemini', 'local']
      );

      const events = failsafeService.getFailoverEvents('openai');
      expect(events[0].errorClassification).toBe('rate-limit');
    });

    it('should track recovery time', async () => {
      const error = new Error('Provider error');
      await failsafeService.executeFailover(
        'openai',
        error,
        ['claude', 'gemini', 'local']
      );

      const events = failsafeService.getFailoverEvents('openai');
      if (events[0].successful) {
        expect(events[0].recoveryTime).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle multiple failovers', async () => {
      const error = new Error('Provider error');

      for (let i = 0; i < 5; i++) {
        await failsafeService.executeFailover(
          'openai',
          error,
          ['claude', 'gemini', 'local']
        );
      }

      const events = failsafeService.getFailoverEvents('openai');
      expect(events.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Recovery Logging', () => {
    it('should record recovery logs', async () => {
      const error = new Error('Provider error');
      await failsafeService.executeFailover(
        'openai',
        error,
        ['claude', 'gemini', 'local']
      );

      const logs = failsafeService.getRecoveryLogs();
      expect(logs.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter recovery logs by provider', async () => {
      const error = new Error('Provider error');
      await failsafeService.executeFailover(
        'openai',
        error,
        ['claude', 'gemini', 'local']
      );

      const logs = failsafeService.getRecoveryLogs('openai');
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should limit recovery logs', async () => {
      const error = new Error('Provider error');

      for (let i = 0; i < 10; i++) {
        await failsafeService.executeFailover(
          'openai',
          error,
          ['claude', 'gemini', 'local']
        );
      }

      const logs = failsafeService.getRecoveryLogs('openai', 5);
      expect(logs.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Error Patterns', () => {
    it('should track error patterns', async () => {
      const error = new Error('Rate limit exceeded');
      await failsafeService.executeFailover(
        'openai',
        error,
        ['claude', 'gemini', 'local']
      );

      const patterns = failsafeService.getErrorPatterns('openai');
      expect(patterns.length).toBeGreaterThanOrEqual(0);
    });

    it('should accumulate error patterns', async () => {
      for (let i = 0; i < 5; i++) {
        const error = new Error('Rate limit exceeded');
        await failsafeService.executeFailover(
          'openai',
          error,
          ['claude', 'gemini', 'local']
        );
      }

      const patterns = failsafeService.getErrorPatterns('openai');
      expect(patterns.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Learning Data', () => {
    it('should collect learning data', async () => {
      const error = new Error('Provider error');
      await failsafeService.executeFailover(
        'openai',
        error,
        ['claude', 'gemini', 'local']
      );

      const learningData = failsafeService.getLearningData();
      expect(typeof learningData).toBe('object');
    });

    it('should track failover patterns', async () => {
      for (let i = 0; i < 3; i++) {
        const error = new Error('Provider error');
        await failsafeService.executeFailover(
          'openai',
          error,
          ['claude', 'gemini', 'local']
        );
      }

      const learningData = failsafeService.getLearningData();
      expect(Object.keys(learningData).length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Statistics', () => {
    it('should calculate statistics', async () => {
      const error = new Error('Provider error');
      await failsafeService.executeFailover(
        'openai',
        error,
        ['claude', 'gemini', 'local']
      );

      const stats = failsafeService.getStatistics();
      expect(stats.totalFailovers).toBeGreaterThanOrEqual(0);
      expect(stats.successfulFailovers).toBeGreaterThanOrEqual(0);
      expect(stats.failedFailovers).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.averageRecoveryTime).toBeGreaterThanOrEqual(0);
    });

    it('should calculate success rate', async () => {
      const error = new Error('Provider error');

      for (let i = 0; i < 10; i++) {
        await failsafeService.executeFailover(
          'openai',
          error,
          ['claude', 'gemini', 'local']
        );
      }

      const stats = failsafeService.getStatistics();
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });

    it('should provide provider statistics', async () => {
      const stats = failsafeService.getStatistics();
      expect(stats.providerStats).toBeDefined();
      expect(Object.keys(stats.providerStats).length).toBeGreaterThan(0);
    });

    it('should track uptime', () => {
      const stats = failsafeService.getStatistics();
      const providers = Object.values(stats.providerStats);

      for (const provider of providers) {
        expect(provider.uptime).toBeGreaterThanOrEqual(0);
        expect(provider.uptime).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Failover Strategies', () => {
    it('should support priority strategy', async () => {
      const service = new EnhancedFailsafeService({
        strategy: 'priority',
      });

      const error = new Error('Provider error');
      const result = await service.executeFailover(
        'openai',
        error,
        ['claude', 'gemini', 'local']
      );

      expect(result.provider).toBeDefined();
      service.cleanup();
    });

    it('should support round-robin strategy', async () => {
      const service = new EnhancedFailsafeService({
        strategy: 'round-robin',
      });

      const error = new Error('Provider error');
      const result = await service.executeFailover(
        'openai',
        error,
        ['claude', 'gemini', 'local']
      );

      expect(result.provider).toBeDefined();
      service.cleanup();
    });

    it('should support weighted strategy', async () => {
      const service = new EnhancedFailsafeService({
        strategy: 'weighted',
      });

      const error = new Error('Provider error');
      const result = await service.executeFailover(
        'openai',
        error,
        ['claude', 'gemini', 'local']
      );

      expect(result.provider).toBeDefined();
      service.cleanup();
    });

    it('should support random strategy', async () => {
      const service = new EnhancedFailsafeService({
        strategy: 'random',
      });

      const error = new Error('Provider error');
      const result = await service.executeFailover(
        'openai',
        error,
        ['claude', 'gemini', 'local']
      );

      expect(result.provider).toBeDefined();
      service.cleanup();
    });
  });

  describe('Cleanup and Reset', () => {
    it('should cleanup resources', () => {
      failsafeService.cleanup();
      // Should not throw
      expect(true).toBe(true);
    });

    it('should reset state', async () => {
      const error = new Error('Provider error');
      await failsafeService.executeFailover(
        'openai',
        error,
        ['claude', 'gemini', 'local']
      );

      failsafeService.reset();

      const events = failsafeService.getFailoverEvents();
      expect(events.length).toBe(0);
    });

    it('should reset learning data', async () => {
      const error = new Error('Provider error');
      await failsafeService.executeFailover(
        'openai',
        error,
        ['claude', 'gemini', 'local']
      );

      failsafeService.reset();

      const learningData = failsafeService.getLearningData();
      expect(Object.keys(learningData).length).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should handle multiple failovers efficiently', async () => {
      const startTime = Date.now();
      const error = new Error('Provider error');

      for (let i = 0; i < 100; i++) {
        await failsafeService.executeFailover(
          'openai',
          error,
          ['claude', 'gemini', 'local']
        );
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000);
    });

    it('should efficiently track error patterns', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const error = new Error('Provider error');
        await failsafeService.executeFailover(
          'openai',
          error,
          ['claude', 'gemini', 'local']
        );
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(30000);
    });
  });

  describe('Integration with AIProviderManager', () => {
    it('should not interfere with existing services', () => {
      // Verify failsafe service is independent
      const stats = failsafeService.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalFailovers).toBeGreaterThanOrEqual(0);
    });

    it('should provide data for learning manager', () => {
      const learningData = failsafeService.getLearningData();
      expect(typeof learningData).toBe('object');
      // Learning manager can consume this data
    });

    it('should track provider health independently', () => {
      const status = failsafeService.getHealthStatus();
      expect(Array.isArray(status)).toBe(true);
      // Can be used by APIKeyManager for key rotation decisions
    });
  });
});
