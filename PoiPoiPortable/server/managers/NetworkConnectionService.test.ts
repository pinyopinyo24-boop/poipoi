/**
 * NetworkConnectionService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { networkConnectionService, NetworkConnectionService } from './NetworkConnectionService';

describe('NetworkConnectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    networkConnectionService.cleanup();
  });

  afterEach(() => {
    networkConnectionService.cleanup();
  });

  describe('Network Test Management', () => {
    it('should start network test', () => {
      const test = networkConnectionService.startTest('device123', 'wifi');
      expect(test.testId).toBeDefined();
      expect(test.status).toBe('connected');
    });

    it('should get network test', () => {
      const started = networkConnectionService.startTest('device123', 'wifi');
      const test = networkConnectionService.getTest(started.testId);
      expect(test).not.toBeNull();
      expect(test?.connectionType).toBe('wifi');
    });
  });

  describe('Network Test Execution', () => {
    it('should complete network test with good metrics', () => {
      const started = networkConnectionService.startTest('device123', 'wifi');
      const completed = networkConnectionService.completeTest(started.testId, 50, 100, 0, 5, 0);
      expect(completed?.status).toBe('connected');
      expect(completed?.latency).toBe(50);
      expect(completed?.bandwidth).toBe(100);
    });

    it('should mark test as unstable with high latency', () => {
      const started = networkConnectionService.startTest('device123', 'wifi');
      const completed = networkConnectionService.completeTest(started.testId, 600, 50, 2, 10, 0);
      expect(completed?.status).toBe('unstable');
    });

    it('should mark test as unstable with packet loss', () => {
      const started = networkConnectionService.startTest('device123', 'wifi');
      const completed = networkConnectionService.completeTest(started.testId, 100, 100, 10, 5, 0);
      expect(completed?.status).toBe('unstable');
    });

    it('should mark test as unstable with timeouts', () => {
      const started = networkConnectionService.startTest('device123', 'wifi');
      const completed = networkConnectionService.completeTest(started.testId, 100, 100, 0, 5, 2);
      expect(completed?.status).toBe('unstable');
    });
  });

  describe('Network Test Queries', () => {
    it('should get tests by device', () => {
      const test1 = networkConnectionService.startTest('device123', 'wifi');
      const test2 = networkConnectionService.startTest('device123', '4g');
      const test3 = networkConnectionService.startTest('device456', 'wifi');

      networkConnectionService.completeTest(test1.testId, 50, 100, 0, 5, 0);
      networkConnectionService.completeTest(test2.testId, 100, 50, 0, 10, 0);
      networkConnectionService.completeTest(test3.testId, 50, 100, 0, 5, 0);

      const device123Tests = networkConnectionService.getTestsByDevice('device123');
      expect(device123Tests.length).toBe(2);
    });

    it('should get tests by connection type', () => {
      const test1 = networkConnectionService.startTest('device123', 'wifi');
      const test2 = networkConnectionService.startTest('device456', 'wifi');
      const test3 = networkConnectionService.startTest('device123', '4g');

      networkConnectionService.completeTest(test1.testId, 50, 100, 0, 5, 0);
      networkConnectionService.completeTest(test2.testId, 50, 100, 0, 5, 0);
      networkConnectionService.completeTest(test3.testId, 100, 50, 0, 10, 0);

      const wifiTests = networkConnectionService.getTestsByConnectionType('wifi');
      expect(wifiTests.length).toBe(2);
    });

    it('should get stable tests', () => {
      const test1 = networkConnectionService.startTest('device123', 'wifi');
      const test2 = networkConnectionService.startTest('device123', '4g');

      networkConnectionService.completeTest(test1.testId, 50, 100, 0, 5, 0);
      networkConnectionService.completeTest(test2.testId, 600, 50, 2, 10, 0);

      const stable = networkConnectionService.getStableTests();
      expect(stable.length).toBe(1);
    });

    it('should get unstable tests', () => {
      const test1 = networkConnectionService.startTest('device123', 'wifi');
      const test2 = networkConnectionService.startTest('device123', '4g');

      networkConnectionService.completeTest(test1.testId, 50, 100, 0, 5, 0);
      networkConnectionService.completeTest(test2.testId, 600, 50, 2, 10, 0);

      const unstable = networkConnectionService.getUnstableTests();
      expect(unstable.length).toBe(1);
    });
  });

  describe('Network Statistics', () => {
    it('should get network statistics', () => {
      const test1 = networkConnectionService.startTest('device123', 'wifi');
      const test2 = networkConnectionService.startTest('device123', '4g');

      networkConnectionService.completeTest(test1.testId, 50, 100, 0, 5, 0);
      networkConnectionService.completeTest(test2.testId, 100, 50, 0, 10, 0);

      const stats = networkConnectionService.getNetworkStatistics();
      expect(stats.totalTests).toBe(2);
      expect(stats.stableTests).toBe(2);
      expect(stats.averageLatency).toBe(75);
      expect(stats.averageBandwidth).toBe(75);
    });

    it('should calculate statistics with unstable tests', () => {
      const test1 = networkConnectionService.startTest('device123', 'wifi');
      const test2 = networkConnectionService.startTest('device123', '4g');

      networkConnectionService.completeTest(test1.testId, 50, 100, 0, 5, 0);
      networkConnectionService.completeTest(test2.testId, 600, 50, 10, 10, 2);

      const stats = networkConnectionService.getNetworkStatistics();
      expect(stats.unstableTests).toBe(1);
      expect(stats.totalTimeouts).toBe(2);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      networkConnectionService.startTest('device123', 'wifi');
      networkConnectionService.cleanup();
      const stats = networkConnectionService.getNetworkStatistics();
      expect(stats.totalTests).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = NetworkConnectionService.getInstance();
      const instance2 = NetworkConnectionService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
