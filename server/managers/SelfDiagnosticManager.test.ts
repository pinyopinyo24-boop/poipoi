/**
 * SelfDiagnosticManager Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { selfDiagnosticManager, SelfDiagnosticManager } from './SelfDiagnosticManager';

describe('SelfDiagnosticManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selfDiagnosticManager.cleanup();
  });

  afterEach(() => {
    selfDiagnosticManager.cleanup();
  });

  // === 自己診断実行テスト ===
  describe('Execute Diagnostics', () => {
    it('should execute diagnostics', () => {
      const diagnostics = [
        {
          id: 'diag_1',
          category: 'performance' as const,
          name: 'Response Time',
          result: 'pass' as const,
          value: 100,
          threshold: 200,
          details: 'Response time is good',
        },
      ];
      const result = selfDiagnosticManager.executeDiagnostics(diagnostics, [], []);
      expect(result).not.toBeNull();
      expect(result.status).toBe('healthy');
    });

    it('should detect critical status', () => {
      const diagnostics = [
        {
          id: 'diag_1',
          category: 'performance' as const,
          name: 'Response Time',
          result: 'fail' as const,
          value: 500,
          threshold: 200,
          details: 'Response time is bad',
        },
      ];
      const problems = [
        {
          problemId: 'prob_1',
          severity: 'critical' as const,
          category: 'performance',
          description: 'Critical performance issue',
          impact: 'High',
          affectedComponents: ['API'],
        },
      ];
      const result = selfDiagnosticManager.executeDiagnostics(diagnostics, problems, []);
      expect(result.status).toBe('critical');
    });

    it('should detect warning status', () => {
      const diagnostics = [
        {
          id: 'diag_1',
          category: 'performance' as const,
          name: 'Response Time',
          result: 'warning' as const,
          value: 250,
          threshold: 200,
          details: 'Response time is warning',
        },
      ];
      const problems = [
        {
          problemId: 'prob_1',
          severity: 'high' as const,
          category: 'performance',
          description: 'High performance issue',
          impact: 'Medium',
          affectedComponents: ['API'],
        },
      ];
      const result = selfDiagnosticManager.executeDiagnostics(diagnostics, problems, []);
      expect(result.status).toBe('warning');
    });
  });

  // === 診断結果取得テスト ===
  describe('Get Diagnostic Result', () => {
    it('should get diagnostic result', () => {
      const result = selfDiagnosticManager.executeDiagnostics([], [], []);
      const retrieved = selfDiagnosticManager.getDiagnosticResult(result.resultId);
      expect(retrieved).not.toBeNull();
    });

    it('should get all diagnostic results', () => {
      selfDiagnosticManager.executeDiagnostics([], [], []);
      selfDiagnosticManager.executeDiagnostics([], [], []);
      const results = selfDiagnosticManager.getAllDiagnosticResults();
      expect(results.length).toBe(2);
    });

    it('should get latest diagnostic result', () => {
      selfDiagnosticManager.executeDiagnostics([], [], []);
      const latest = selfDiagnosticManager.getLatestDiagnosticResult();
      expect(latest).not.toBeNull();
    });
  });

  // === 問題検出テスト ===
  describe('Problem Detection', () => {
    it('should detect problems', () => {
      const problems = [
        {
          problemId: 'prob_1',
          severity: 'high' as const,
          category: 'performance',
          description: 'Performance issue',
          impact: 'High',
          affectedComponents: ['API'],
        },
      ];
      selfDiagnosticManager.executeDiagnostics([], problems, []);
      const detected = selfDiagnosticManager.detectProblems();
      expect(detected.length).toBe(1);
    });
  });

  // === 改善提案テスト ===
  describe('Improvement Suggestions', () => {
    it('should get improvement suggestions', () => {
      const improvements = [
        {
          suggestionId: 'sugg_1',
          priority: 'high' as const,
          title: 'Optimize API',
          description: 'Optimize API performance',
          expectedBenefit: 'Improve response time',
          estimatedEffort: 'medium' as const,
          relatedProblems: ['prob_1'],
        },
      ];
      selfDiagnosticManager.executeDiagnostics([], [], improvements);
      const suggestions = selfDiagnosticManager.getImprovementSuggestions();
      expect(suggestions.length).toBe(1);
    });
  });

  // === 診断統計テスト ===
  describe('Diagnostic Statistics', () => {
    it('should get diagnostic statistics', () => {
      selfDiagnosticManager.executeDiagnostics([], [], []);
      selfDiagnosticManager.executeDiagnostics([], [], []);
      const stats = selfDiagnosticManager.getDiagnosticStatistics();
      expect(stats.totalDiagnostics).toBe(2);
    });

    it('should calculate average score', () => {
      const diag1 = [
        {
          id: 'diag_1',
          category: 'performance' as const,
          name: 'Test 1',
          result: 'pass' as const,
          value: 100,
          threshold: 100,
          details: 'Pass',
        },
      ];
      const diag2 = [
        {
          id: 'diag_2',
          category: 'performance' as const,
          name: 'Test 2',
          result: 'fail' as const,
          value: 50,
          threshold: 100,
          details: 'Fail',
        },
      ];
      selfDiagnosticManager.executeDiagnostics(diag1, [], []);
      selfDiagnosticManager.executeDiagnostics(diag2, [], []);
      const stats = selfDiagnosticManager.getDiagnosticStatistics();
      expect(stats.averageScore).toBeGreaterThan(0);
    });

    it('should count status', () => {
      const diag1 = [
        {
          id: 'diag_1',
          category: 'performance' as const,
          name: 'Test 1',
          result: 'pass' as const,
          value: 100,
          threshold: 100,
          details: 'Pass',
        },
      ];
      selfDiagnosticManager.executeDiagnostics(diag1, [], []);
      const stats = selfDiagnosticManager.getDiagnosticStatistics();
      expect(stats.healthyDiagnostics).toBe(1);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup', () => {
      selfDiagnosticManager.executeDiagnostics([], [], []);
      selfDiagnosticManager.cleanup();
      const results = selfDiagnosticManager.getAllDiagnosticResults();
      expect(results.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = SelfDiagnosticManager.getInstance();
      const instance2 = SelfDiagnosticManager.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
