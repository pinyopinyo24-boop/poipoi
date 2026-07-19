/**
 * FinalIntegrationTestManager Tests - 20個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { finalIntegrationTestManager, FinalIntegrationTestManager } from './FinalIntegrationTestManager';

describe('FinalIntegrationTestManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    finalIntegrationTestManager.cleanup();
  });

  afterEach(() => {
    finalIntegrationTestManager.cleanup();
  });

  describe('Test Case Registration', () => {
    it('should register test case', () => {
      const testCase = finalIntegrationTestManager.registerTestCase('chat', 'メッセージ送受信', 'テスト説明', 'critical');
      expect(testCase.id).toBeDefined();
      expect(testCase.status).toBe('pending');
    });

    it('should get test case', () => {
      const registered = finalIntegrationTestManager.registerTestCase('chat', 'メッセージ送受信', 'テスト説明', 'critical');
      const testCase = finalIntegrationTestManager.getTestCase(registered.id);
      expect(testCase).not.toBeNull();
      expect(testCase?.name).toBe('メッセージ送受信');
    });

    it('should get test cases by category', () => {
      finalIntegrationTestManager.registerTestCase('chat', 'テスト1', '説明1', 'critical');
      finalIntegrationTestManager.registerTestCase('chat', 'テスト2', '説明2', 'high');
      const testCases = finalIntegrationTestManager.getTestCasesByCategory('chat');
      expect(testCases.length).toBeGreaterThan(0);
    });
  });

  describe('Test Execution', () => {
    it('should start test', () => {
      const registered = finalIntegrationTestManager.registerTestCase('chat', 'メッセージ送受信', 'テスト説明', 'critical');
      const started = finalIntegrationTestManager.startTest(registered.id);
      expect(started?.status).toBe('running');
      expect(started?.startedAt).toBeDefined();
    });

    it('should pass test', () => {
      const registered = finalIntegrationTestManager.registerTestCase('chat', 'メッセージ送受信', 'テスト説明', 'critical');
      finalIntegrationTestManager.startTest(registered.id);
      const passed = finalIntegrationTestManager.passTest(registered.id);
      expect(passed?.status).toBe('passed');
      expect(passed?.completedAt).toBeDefined();
      expect(passed?.duration).toBeDefined();
    });

    it('should fail test', () => {
      const registered = finalIntegrationTestManager.registerTestCase('chat', 'メッセージ送受信', 'テスト説明', 'critical');
      finalIntegrationTestManager.startTest(registered.id);
      const failed = finalIntegrationTestManager.failTest(registered.id, 'テスト失敗');
      expect(failed?.status).toBe('failed');
      expect(failed?.errorMessage).toBe('テスト失敗');
    });
  });

  describe('Test Result Generation', () => {
    it('should generate test result', () => {
      const test1 = finalIntegrationTestManager.registerTestCase('chat', 'テスト1', '説明1', 'critical');
      const test2 = finalIntegrationTestManager.registerTestCase('chat', 'テスト2', '説明2', 'high');

      finalIntegrationTestManager.startTest(test1.id);
      finalIntegrationTestManager.passTest(test1.id);

      finalIntegrationTestManager.startTest(test2.id);
      finalIntegrationTestManager.passTest(test2.id);

      const result = finalIntegrationTestManager.generateTestResult();
      expect(result.id).toBeDefined();
      expect(result.passedTests).toBeGreaterThan(0);
    });

    it('should get test result', () => {
      const test = finalIntegrationTestManager.registerTestCase('chat', 'テスト', '説明', 'critical');
      finalIntegrationTestManager.startTest(test.id);
      finalIntegrationTestManager.passTest(test.id);

      const result = finalIntegrationTestManager.generateTestResult();
      const retrieved = finalIntegrationTestManager.getTestResult(result.id);
      expect(retrieved).not.toBeNull();
    });

    it('should get latest test result', () => {
      const test = finalIntegrationTestManager.registerTestCase('chat', 'テスト', '説明', 'critical');
      finalIntegrationTestManager.startTest(test.id);
      finalIntegrationTestManager.passTest(test.id);

      const result = finalIntegrationTestManager.generateTestResult();
      const latest = finalIntegrationTestManager.getLatestTestResult();
      expect(latest?.id).toBe(result.id);
    });
  });

  describe('Test Statistics', () => {
    it('should get test statistics', () => {
      finalIntegrationTestManager.registerTestCase('chat', 'テスト1', '説明1', 'critical');
      finalIntegrationTestManager.registerTestCase('ai', 'テスト2', '説明2', 'high');

      const stats = finalIntegrationTestManager.getTestStatistics();
      expect(stats.totalTestCases).toBeGreaterThan(0);
      expect(stats.pendingTests).toBeGreaterThan(0);
    });

    it('should count passed tests', () => {
      const test1 = finalIntegrationTestManager.registerTestCase('chat', 'テスト1', '説明1', 'critical');
      const test2 = finalIntegrationTestManager.registerTestCase('chat', 'テスト2', '説明2', 'high');

      finalIntegrationTestManager.startTest(test1.id);
      finalIntegrationTestManager.passTest(test1.id);

      finalIntegrationTestManager.startTest(test2.id);
      finalIntegrationTestManager.passTest(test2.id);

      const stats = finalIntegrationTestManager.getTestStatistics();
      expect(stats.passedTests).toBe(2);
    });

    it('should count failed tests', () => {
      const test = finalIntegrationTestManager.registerTestCase('chat', 'テスト', '説明', 'critical');
      finalIntegrationTestManager.startTest(test.id);
      finalIntegrationTestManager.failTest(test.id, 'エラー');

      const stats = finalIntegrationTestManager.getTestStatistics();
      expect(stats.failedTests).toBe(1);
    });
  });

  describe('Test Result Summary', () => {
    it('should generate summary with success rate', () => {
      const test1 = finalIntegrationTestManager.registerTestCase('chat', 'テスト1', '説明1', 'critical');
      const test2 = finalIntegrationTestManager.registerTestCase('chat', 'テスト2', '説明2', 'high');

      finalIntegrationTestManager.startTest(test1.id);
      finalIntegrationTestManager.passTest(test1.id);

      finalIntegrationTestManager.startTest(test2.id);
      finalIntegrationTestManager.passTest(test2.id);

      const result = finalIntegrationTestManager.generateTestResult();
      expect(result.successRate).toBeGreaterThan(0);
      expect(result.summary).toContain('Passed');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      finalIntegrationTestManager.registerTestCase('chat', 'テスト', '説明', 'critical');
      finalIntegrationTestManager.cleanup();
      const stats = finalIntegrationTestManager.getTestStatistics();
      expect(stats.totalTestCases).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = FinalIntegrationTestManager.getInstance();
      const instance2 = FinalIntegrationTestManager.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
