/**
 * PerformanceTestService Tests - 20個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performanceTestService, PerformanceTestService } from './PerformanceTestService';

describe('PerformanceTestService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    performanceTestService.cleanup();
  });

  afterEach(() => {
    performanceTestService.cleanup();
  });

  describe('Performance Test Registration', () => {
    it('should register performance test', () => {
      const test = performanceTestService.registerPerformanceTest('Response time test', 'responseTime', 500);
      expect(test.testId).toBeDefined();
      expect(test.status).toBe('pending');
    });

    it('should get performance test', () => {
      const registered = performanceTestService.registerPerformanceTest('Response time test', 'responseTime', 500);
      const test = performanceTestService.getPerformanceTest(registered.testId);
      expect(test).not.toBeNull();
      expect(test?.testName).toBe('Response time test');
    });

    it('should get tests by metric', () => {
      performanceTestService.registerPerformanceTest('Test 1', 'responseTime', 500);
      performanceTestService.registerPerformanceTest('Test 2', 'responseTime', 600);
      const tests = performanceTestService.getTestsByMetric('responseTime');
      expect(tests.length).toBe(2);
    });
  });

  describe('Performance Test Execution', () => {
    it('should start performance test', () => {
      const registered = performanceTestService.registerPerformanceTest('Response time test', 'responseTime', 500);
      const started = performanceTestService.startPerformanceTest(registered.testId);
      expect(started?.status).toBe('running');
      expect(started?.startedAt).toBeDefined();
    });

    it('should pass performance test', () => {
      const registered = performanceTestService.registerPerformanceTest('Response time test', 'responseTime', 500);
      performanceTestService.startPerformanceTest(registered.testId);
      const passed = performanceTestService.passPerformanceTest(registered.testId, 350);
      expect(passed?.status).toBe('passed');
      expect(passed?.actualValue).toBe(350);
    });

    it('should fail performance test', () => {
      const registered = performanceTestService.registerPerformanceTest('Response time test', 'responseTime', 500);
      performanceTestService.startPerformanceTest(registered.testId);
      const failed = performanceTestService.failPerformanceTest(registered.testId, 800, 'Exceeded threshold');
      expect(failed?.status).toBe('failed');
      expect(failed?.actualValue).toBe(800);
      expect(failed?.errorMessage).toBe('Exceeded threshold');
    });
  });

  describe('Performance Statistics', () => {
    it('should get performance statistics', () => {
      const test1 = performanceTestService.registerPerformanceTest('Test 1', 'responseTime', 500);
      const test2 = performanceTestService.registerPerformanceTest('Test 2', 'throughput', 1000);

      performanceTestService.startPerformanceTest(test1.testId);
      performanceTestService.passPerformanceTest(test1.testId, 300);

      performanceTestService.startPerformanceTest(test2.testId);
      performanceTestService.passPerformanceTest(test2.testId, 950);

      const stats = performanceTestService.getPerformanceStatistics();
      expect(stats.totalTests).toBe(2);
      expect(stats.passedTests).toBe(2);
      expect(stats.successRate).toBe(100);
    });

    it('should calculate average response time', () => {
      const test1 = performanceTestService.registerPerformanceTest('Test 1', 'responseTime', 500);
      const test2 = performanceTestService.registerPerformanceTest('Test 2', 'responseTime', 500);

      performanceTestService.startPerformanceTest(test1.testId);
      performanceTestService.passPerformanceTest(test1.testId, 200);

      performanceTestService.startPerformanceTest(test2.testId);
      performanceTestService.passPerformanceTest(test2.testId, 400);

      const stats = performanceTestService.getPerformanceStatistics();
      expect(stats.averageResponseTime).toBe(300);
    });

    it('should calculate success rate', () => {
      const test1 = performanceTestService.registerPerformanceTest('Test 1', 'responseTime', 500);
      const test2 = performanceTestService.registerPerformanceTest('Test 2', 'responseTime', 500);

      performanceTestService.startPerformanceTest(test1.testId);
      performanceTestService.passPerformanceTest(test1.testId, 300);

      performanceTestService.startPerformanceTest(test2.testId);
      performanceTestService.failPerformanceTest(test2.testId, 600, 'Exceeded');

      const stats = performanceTestService.getPerformanceStatistics();
      expect(stats.successRate).toBe(50);
    });
  });

  describe('Metrics Statistics', () => {
    it('should get metrics statistics', () => {
      const test1 = performanceTestService.registerPerformanceTest('Test 1', 'responseTime', 500);
      const test2 = performanceTestService.registerPerformanceTest('Test 2', 'responseTime', 500);

      performanceTestService.startPerformanceTest(test1.testId);
      performanceTestService.passPerformanceTest(test1.testId, 200);

      performanceTestService.startPerformanceTest(test2.testId);
      performanceTestService.passPerformanceTest(test2.testId, 400);

      const metricsStats = performanceTestService.getMetricsStatistics();
      expect(metricsStats.responseTime.count).toBe(2);
      expect(metricsStats.responseTime.average).toBe(300);
      expect(metricsStats.responseTime.min).toBe(200);
      expect(metricsStats.responseTime.max).toBe(400);
    });

    it('should calculate min and max values', () => {
      const test1 = performanceTestService.registerPerformanceTest('Test 1', 'throughput', 1000);
      const test2 = performanceTestService.registerPerformanceTest('Test 2', 'throughput', 1000);
      const test3 = performanceTestService.registerPerformanceTest('Test 3', 'throughput', 1000);

      performanceTestService.startPerformanceTest(test1.testId);
      performanceTestService.passPerformanceTest(test1.testId, 500);

      performanceTestService.startPerformanceTest(test2.testId);
      performanceTestService.passPerformanceTest(test2.testId, 1000);

      performanceTestService.startPerformanceTest(test3.testId);
      performanceTestService.passPerformanceTest(test3.testId, 750);

      const metricsStats = performanceTestService.getMetricsStatistics();
      expect(metricsStats.throughput.min).toBe(500);
      expect(metricsStats.throughput.max).toBe(1000);
    });
  });

  describe('Multiple Metrics', () => {
    it('should handle multiple metrics', () => {
      performanceTestService.registerPerformanceTest('Test 1', 'responseTime', 500);
      performanceTestService.registerPerformanceTest('Test 2', 'throughput', 1000);
      performanceTestService.registerPerformanceTest('Test 3', 'memoryUsage', 512);
      performanceTestService.registerPerformanceTest('Test 4', 'cpuUsage', 80);

      const stats = performanceTestService.getPerformanceStatistics();
      expect(stats.totalTests).toBe(4);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      performanceTestService.registerPerformanceTest('Test', 'responseTime', 500);
      performanceTestService.cleanup();
      const stats = performanceTestService.getPerformanceStatistics();
      expect(stats.totalTests).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = PerformanceTestService.getInstance();
      const instance2 = PerformanceTestService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
