/**
 * DeviceTestManager Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { deviceTestManager, DeviceTestManager } from './DeviceTestManager';

describe('DeviceTestManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deviceTestManager.cleanup();
  });

  afterEach(() => {
    deviceTestManager.cleanup();
  });

  describe('Test Management', () => {
    it('should start test', () => {
      const test = deviceTestManager.startTest('device123', 'startup');
      expect(test.testId).toBeDefined();
      expect(test.status).toBe('running');
    });

    it('should get test', () => {
      const started = deviceTestManager.startTest('device123', 'startup');
      const test = deviceTestManager.getTest(started.testId);
      expect(test).not.toBeNull();
      expect(test?.deviceId).toBe('device123');
    });
  });

  describe('Test Execution', () => {
    it('should pass test', () => {
      const started = deviceTestManager.startTest('device123', 'startup');
      const passed = deviceTestManager.passTest(started.testId, { appStarted: true });
      expect(passed?.status).toBe('passed');
      expect(passed?.result?.appStarted).toBe(true);
    });

    it('should fail test', () => {
      const started = deviceTestManager.startTest('device123', 'startup');
      const failed = deviceTestManager.failTest(started.testId, 'App failed to start');
      expect(failed?.status).toBe('failed');
      expect(failed?.errorMessage).toBe('App failed to start');
    });
  });

  describe('Test Queries', () => {
    it('should get tests by device', () => {
      const test1 = deviceTestManager.startTest('device123', 'startup');
      const test2 = deviceTestManager.startTest('device123', 'chat');
      const test3 = deviceTestManager.startTest('device456', 'startup');

      deviceTestManager.passTest(test1.testId);
      deviceTestManager.passTest(test2.testId);
      deviceTestManager.passTest(test3.testId);

      const device123Tests = deviceTestManager.getTestsByDevice('device123');
      expect(device123Tests.length).toBe(2);
    });

    it('should get tests by type', () => {
      const test1 = deviceTestManager.startTest('device123', 'startup');
      const test2 = deviceTestManager.startTest('device456', 'startup');
      const test3 = deviceTestManager.startTest('device123', 'chat');

      deviceTestManager.passTest(test1.testId);
      deviceTestManager.passTest(test2.testId);
      deviceTestManager.passTest(test3.testId);

      const startupTests = deviceTestManager.getTestsByType('startup');
      expect(startupTests.length).toBe(2);
    });

    it('should get passed tests', () => {
      const test1 = deviceTestManager.startTest('device123', 'startup');
      const test2 = deviceTestManager.startTest('device123', 'chat');

      deviceTestManager.passTest(test1.testId);
      deviceTestManager.failTest(test2.testId, 'Failed');

      const passed = deviceTestManager.getPassedTests();
      expect(passed.length).toBe(1);
    });

    it('should get failed tests', () => {
      const test1 = deviceTestManager.startTest('device123', 'startup');
      const test2 = deviceTestManager.startTest('device123', 'chat');

      deviceTestManager.passTest(test1.testId);
      deviceTestManager.failTest(test2.testId, 'Failed');

      const failed = deviceTestManager.getFailedTests();
      expect(failed.length).toBe(1);
    });
  });

  describe('Test Statistics', () => {
    it('should get test statistics', () => {
      const test1 = deviceTestManager.startTest('device123', 'startup');
      const test2 = deviceTestManager.startTest('device123', 'chat');

      deviceTestManager.passTest(test1.testId);
      deviceTestManager.passTest(test2.testId);

      const stats = deviceTestManager.getTestStatistics();
      expect(stats.totalTests).toBe(2);
      expect(stats.passedTests).toBe(2);
      expect(stats.successRate).toBe(100);
    });

    it('should calculate success rate with failures', () => {
      const test1 = deviceTestManager.startTest('device123', 'startup');
      const test2 = deviceTestManager.startTest('device123', 'chat');

      deviceTestManager.passTest(test1.testId);
      deviceTestManager.failTest(test2.testId, 'Failed');

      const stats = deviceTestManager.getTestStatistics();
      expect(stats.successRate).toBe(50);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      deviceTestManager.startTest('device123', 'startup');
      deviceTestManager.cleanup();
      const stats = deviceTestManager.getTestStatistics();
      expect(stats.totalTests).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = DeviceTestManager.getInstance();
      const instance2 = DeviceTestManager.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
