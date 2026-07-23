/**
 * APIPerformanceTestService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiPerformanceTestService, APIPerformanceTestService } from './APIPerformanceTestService';

describe('APIPerformanceTestService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiPerformanceTestService.cleanup();
  });

  afterEach(() => {
    apiPerformanceTestService.cleanup();
  });

  describe('API Performance Test Management', () => {
    it('should start API performance test', () => {
      const test = apiPerformanceTestService.startTest('device123', 'chat');
      expect(test.testId).toBeDefined();
      expect(test.status).toBe('excellent');
    });

    it('should get API performance test', () => {
      const started = apiPerformanceTestService.startTest('device123', 'chat');
      const test = apiPerformanceTestService.getTest(started.testId);
      expect(test).not.toBeNull();
      expect(test?.endpoint).toBe('chat');
    });
  });

  describe('API Performance Test Execution', () => {
    it('should complete test with excellent performance', () => {
      const started = apiPerformanceTestService.startTest('device123', 'chat');
      const completed = apiPerformanceTestService.completeTest(
        started.testId,
        100,
        1000,
        0.5,
        100,
        0
      );
      expect(completed?.status).toBe('excellent');
    });

    it('should complete test with good performance', () => {
      const started = apiPerformanceTestService.startTest('device123', 'chat');
      const completed = apiPerformanceTestService.completeTest(
        started.testId,
        300,
        800,
        2,
        98,
        2
      );
      expect(completed?.status).toBe('good');
    });

    it('should complete test with acceptable performance', () => {
      const started = apiPerformanceTestService.startTest('device123', 'chat');
      const completed = apiPerformanceTestService.completeTest(
        started.testId,
        700,
        500,
        8,
        92,
        8
      );
      expect(completed?.status).toBe('acceptable');
    });

    it('should complete test with poor performance', () => {
      const started = apiPerformanceTestService.startTest('device123', 'chat');
      const completed = apiPerformanceTestService.completeTest(
        started.testId,
        2000,
        100,
        20,
        80,
        20
      );
      expect(completed?.status).toBe('poor');
    });
  });

  describe('API Performance Test Queries', () => {
    it('should get tests by device', () => {
      const test1 = apiPerformanceTestService.startTest('device123', 'chat');
      const test2 = apiPerformanceTestService.startTest('device123', 'auth');
      const test3 = apiPerformanceTestService.startTest('device456', 'chat');

      apiPerformanceTestService.completeTest(test1.testId, 100, 1000, 0.5, 100, 0);
      apiPerformanceTestService.completeTest(test2.testId, 150, 900, 1, 99, 1);
      apiPerformanceTestService.completeTest(test3.testId, 100, 1000, 0.5, 100, 0);

      const device123Tests = apiPerformanceTestService.getTestsByDevice('device123');
      expect(device123Tests.length).toBe(2);
    });

    it('should get tests by endpoint', () => {
      const test1 = apiPerformanceTestService.startTest('device123', 'chat');
      const test2 = apiPerformanceTestService.startTest('device456', 'chat');
      const test3 = apiPerformanceTestService.startTest('device123', 'auth');

      apiPerformanceTestService.completeTest(test1.testId, 100, 1000, 0.5, 100, 0);
      apiPerformanceTestService.completeTest(test2.testId, 100, 1000, 0.5, 100, 0);
      apiPerformanceTestService.completeTest(test3.testId, 150, 900, 1, 99, 1);

      const chatTests = apiPerformanceTestService.getTestsByEndpoint('chat');
      expect(chatTests.length).toBe(2);
    });

    it('should get excellent tests', () => {
      const test1 = apiPerformanceTestService.startTest('device123', 'chat');
      const test2 = apiPerformanceTestService.startTest('device123', 'auth');

      apiPerformanceTestService.completeTest(test1.testId, 100, 1000, 0.5, 100, 0);
      apiPerformanceTestService.completeTest(test2.testId, 2000, 100, 20, 80, 20);

      const excellent = apiPerformanceTestService.getExcellentTests();
      expect(excellent.length).toBe(1);
    });

    it('should get poor tests', () => {
      const test1 = apiPerformanceTestService.startTest('device123', 'chat');
      const test2 = apiPerformanceTestService.startTest('device123', 'auth');

      apiPerformanceTestService.completeTest(test1.testId, 100, 1000, 0.5, 100, 0);
      apiPerformanceTestService.completeTest(test2.testId, 2000, 100, 20, 80, 20);

      const poor = apiPerformanceTestService.getPoorTests();
      expect(poor.length).toBe(1);
    });
  });

  describe('API Performance Statistics', () => {
    it('should get API statistics', () => {
      const test1 = apiPerformanceTestService.startTest('device123', 'chat');
      const test2 = apiPerformanceTestService.startTest('device123', 'auth');

      apiPerformanceTestService.completeTest(test1.testId, 100, 1000, 0.5, 100, 0);
      apiPerformanceTestService.completeTest(test2.testId, 200, 900, 1, 99, 1);

      const stats = apiPerformanceTestService.getAPIStatistics();
      expect(stats.totalTests).toBe(2);
      expect(stats.excellentTests).toBe(2);
      expect(stats.averageResponseTime).toBe(150);
      expect(stats.totalSuccesses).toBe(199);
    });

    it('should calculate statistics with mixed performance', () => {
      const test1 = apiPerformanceTestService.startTest('device123', 'chat');
      const test2 = apiPerformanceTestService.startTest('device123', 'auth');

      apiPerformanceTestService.completeTest(test1.testId, 100, 1000, 0.5, 100, 0);
      apiPerformanceTestService.completeTest(test2.testId, 2000, 100, 20, 80, 20);

      const stats = apiPerformanceTestService.getAPIStatistics();
      expect(stats.poorTests).toBe(1);
      expect(stats.totalFailures).toBe(20);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      apiPerformanceTestService.startTest('device123', 'chat');
      apiPerformanceTestService.cleanup();
      const stats = apiPerformanceTestService.getAPIStatistics();
      expect(stats.totalTests).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = APIPerformanceTestService.getInstance();
      const instance2 = APIPerformanceTestService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
