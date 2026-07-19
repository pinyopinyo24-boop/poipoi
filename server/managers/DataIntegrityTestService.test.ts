/**
 * DataIntegrityTestService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dataIntegrityTestService, DataIntegrityTestService } from './DataIntegrityTestService';

describe('DataIntegrityTestService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataIntegrityTestService.cleanup();
  });

  afterEach(() => {
    dataIntegrityTestService.cleanup();
  });

  describe('Data Integrity Test Registration', () => {
    it('should register data integrity test', () => {
      const test = dataIntegrityTestService.registerDataIntegrityTest('consistency', 'Consistency check');
      expect(test.testId).toBeDefined();
      expect(test.status).toBe('pending');
    });

    it('should get data integrity test', () => {
      const registered = dataIntegrityTestService.registerDataIntegrityTest('consistency', 'Consistency check');
      const test = dataIntegrityTestService.getDataIntegrityTest(registered.testId);
      expect(test).not.toBeNull();
      expect(test?.testName).toBe('Consistency check');
    });

    it('should get tests by check type', () => {
      dataIntegrityTestService.registerDataIntegrityTest('consistency', 'Test 1');
      dataIntegrityTestService.registerDataIntegrityTest('consistency', 'Test 2');
      const tests = dataIntegrityTestService.getTestsByCheckType('consistency');
      expect(tests.length).toBe(2);
    });
  });

  describe('Data Integrity Test Execution', () => {
    it('should start data integrity test', () => {
      const registered = dataIntegrityTestService.registerDataIntegrityTest('consistency', 'Consistency check');
      const started = dataIntegrityTestService.startDataIntegrityTest(registered.testId);
      expect(started?.status).toBe('running');
      expect(started?.startedAt).toBeDefined();
    });

    it('should pass data integrity test', () => {
      const registered = dataIntegrityTestService.registerDataIntegrityTest('consistency', 'Consistency check');
      dataIntegrityTestService.startDataIntegrityTest(registered.testId);
      const passed = dataIntegrityTestService.passDataIntegrityTest(registered.testId, 1000, 0);
      expect(passed?.status).toBe('passed');
      expect(passed?.recordsChecked).toBe(1000);
      expect(passed?.issuesFound).toBe(0);
    });

    it('should fail data integrity test', () => {
      const registered = dataIntegrityTestService.registerDataIntegrityTest('consistency', 'Consistency check');
      dataIntegrityTestService.startDataIntegrityTest(registered.testId);
      const failed = dataIntegrityTestService.failDataIntegrityTest(
        registered.testId,
        1000,
        5,
        'Found inconsistencies'
      );
      expect(failed?.status).toBe('failed');
      expect(failed?.issuesFound).toBe(5);
      expect(failed?.errorMessage).toBe('Found inconsistencies');
    });
  });

  describe('Failed Tests', () => {
    it('should get failed tests', () => {
      const test1 = dataIntegrityTestService.registerDataIntegrityTest('consistency', 'Test 1');
      const test2 = dataIntegrityTestService.registerDataIntegrityTest('completeness', 'Test 2');

      dataIntegrityTestService.startDataIntegrityTest(test1.testId);
      dataIntegrityTestService.failDataIntegrityTest(test1.testId, 1000, 5, 'Failed');

      dataIntegrityTestService.startDataIntegrityTest(test2.testId);
      dataIntegrityTestService.passDataIntegrityTest(test2.testId, 1000, 0);

      const failed = dataIntegrityTestService.getFailedTests();
      expect(failed.length).toBe(1);
    });
  });

  describe('Data Integrity Statistics', () => {
    it('should get data integrity statistics', () => {
      const test1 = dataIntegrityTestService.registerDataIntegrityTest('consistency', 'Test 1');
      const test2 = dataIntegrityTestService.registerDataIntegrityTest('completeness', 'Test 2');

      dataIntegrityTestService.startDataIntegrityTest(test1.testId);
      dataIntegrityTestService.passDataIntegrityTest(test1.testId, 1000, 0);

      dataIntegrityTestService.startDataIntegrityTest(test2.testId);
      dataIntegrityTestService.passDataIntegrityTest(test2.testId, 500, 0);

      const stats = dataIntegrityTestService.getDataIntegrityStatistics();
      expect(stats.totalTests).toBe(2);
      expect(stats.passedTests).toBe(2);
      expect(stats.totalRecordsChecked).toBe(1500);
      expect(stats.isDataIntegral).toBe(true);
    });

    it('should calculate total issues found', () => {
      const test1 = dataIntegrityTestService.registerDataIntegrityTest('consistency', 'Test 1');
      const test2 = dataIntegrityTestService.registerDataIntegrityTest('completeness', 'Test 2');

      dataIntegrityTestService.startDataIntegrityTest(test1.testId);
      dataIntegrityTestService.passDataIntegrityTest(test1.testId, 1000, 3);

      dataIntegrityTestService.startDataIntegrityTest(test2.testId);
      dataIntegrityTestService.passDataIntegrityTest(test2.testId, 500, 2);

      const stats = dataIntegrityTestService.getDataIntegrityStatistics();
      expect(stats.totalIssuesFound).toBe(5);
      expect(stats.averageIssuesPerTest).toBe(2.5);
    });

    it('should calculate success rate', () => {
      const test1 = dataIntegrityTestService.registerDataIntegrityTest('consistency', 'Test 1');
      const test2 = dataIntegrityTestService.registerDataIntegrityTest('completeness', 'Test 2');

      dataIntegrityTestService.startDataIntegrityTest(test1.testId);
      dataIntegrityTestService.passDataIntegrityTest(test1.testId, 1000, 0);

      dataIntegrityTestService.startDataIntegrityTest(test2.testId);
      dataIntegrityTestService.failDataIntegrityTest(test2.testId, 500, 5, 'Failed');

      const stats = dataIntegrityTestService.getDataIntegrityStatistics();
      expect(stats.successRate).toBe(50);
      expect(stats.isDataIntegral).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      dataIntegrityTestService.registerDataIntegrityTest('consistency', 'Test');
      dataIntegrityTestService.cleanup();
      const stats = dataIntegrityTestService.getDataIntegrityStatistics();
      expect(stats.totalTests).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = DataIntegrityTestService.getInstance();
      const instance2 = DataIntegrityTestService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });

  describe('Multiple Check Types', () => {
    it('should handle multiple check types', () => {
      dataIntegrityTestService.registerDataIntegrityTest('consistency', 'Test 1');
      dataIntegrityTestService.registerDataIntegrityTest('completeness', 'Test 2');
      dataIntegrityTestService.registerDataIntegrityTest('accuracy', 'Test 3');
      dataIntegrityTestService.registerDataIntegrityTest('validity', 'Test 4');
      dataIntegrityTestService.registerDataIntegrityTest('uniqueness', 'Test 5');

      const stats = dataIntegrityTestService.getDataIntegrityStatistics();
      expect(stats.totalTests).toBe(5);
    });
  });
});
