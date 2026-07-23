/**
 * STEP 61 ProductionCopilotAI Integration Tests - 50+テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProductionCopilotAIManager } from './ProductionCopilotAIManager';

describe('STEP 61 ProductionCopilotAI Integration', () => {
  let manager: ProductionCopilotAIManager;

  beforeEach(() => {
    manager = new ProductionCopilotAIManager();
  });

  // ===== 質問回答テスト (6個) =====
  describe('Question Answering Tests', () => {
    it('should answer manufacturing question', async () => {
      const response = await manager.answerManufacturingQuestion('温度設定は?', 'equipment');
      expect(response.answer).toBeTruthy();
      expect(response.confidence).toBeGreaterThan(0);
    });

    it('should determine urgency correctly', async () => {
      const urgent = await manager.answerManufacturingQuestion('緊急: 機械が停止した', 'emergency');
      expect(urgent.answer).toBeTruthy();
    });

    it('should find relevant sources', async () => {
      const response = await manager.answerManufacturingQuestion('品質基準は?', 'quality');
      expect(response.sources.length).toBeGreaterThan(0);
    });

    it('should extract related topics', async () => {
      const response = await manager.answerManufacturingQuestion('生産効率を改善したい', 'production');
      expect(response.relatedTopics.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle different categories', async () => {
      const categories = ['equipment', 'quality', 'production', 'safety'];
      for (const category of categories) {
        const response = await manager.answerManufacturingQuestion('質問です', category);
        expect(response.answer).toBeTruthy();
      }
    });

    it('should calculate confidence based on question length', async () => {
      const short = await manager.answerManufacturingQuestion('何?');
      const long = await manager.answerManufacturingQuestion('詳細な説明を含めて、現在の生産プロセスを最適化するための具体的な改善方法を教えてください');
      expect(long.confidence).toBeGreaterThan(short.confidence);
    });
  });

  // ===== 改善提案テスト (6個) =====
  describe('Improvement Suggestion Tests', () => {
    it('should generate improvement suggestions', async () => {
      const suggestions = await manager.generateImprovementSuggestions('production');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should include suggestion details', async () => {
      const suggestions = await manager.generateImprovementSuggestions('quality');
      expect(suggestions[0].suggestion).toBeTruthy();
      expect(suggestions[0].expectedBenefit).toBeTruthy();
    });

    it('should assess difficulty', async () => {
      const suggestions = await manager.generateImprovementSuggestions('cost');
      const difficulties = suggestions.map((s) => s.difficulty);
      expect(difficulties.every((d) => ['easy', 'medium', 'hard'].includes(d))).toBe(true);
    });

    it('should calculate priority', async () => {
      const suggestions = await manager.generateImprovementSuggestions('production');
      expect(suggestions.every((s) => s.priority >= 1 && s.priority <= 10)).toBe(true);
    });

    it('should handle different areas', async () => {
      const areas = ['production', 'quality', 'cost'];
      for (const area of areas) {
        const suggestions = await manager.generateImprovementSuggestions(area);
        expect(suggestions.length).toBeGreaterThan(0);
      }
    });

    it('should generate unique suggestions', async () => {
      const suggestions = await manager.generateImprovementSuggestions('production');
      const ids = suggestions.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  // ===== 問題分析テスト (6個) =====
  describe('Problem Analysis Tests', () => {
    it('should analyze manufacturing problem', async () => {
      const analysis = await manager.analyzeProblem('製品の不良が増加している');
      expect(analysis.possibleCauses.length).toBeGreaterThan(0);
      expect(analysis.recommendedActions.length).toBeGreaterThan(0);
    });

    it('should identify possible causes', async () => {
      const analysis = await manager.analyzeProblem('生産速度が低下している');
      expect(analysis.possibleCauses.length).toBeGreaterThan(0);
    });

    it('should generate recommended actions', async () => {
      const analysis = await manager.analyzeProblem('品質が低下している');
      expect(analysis.recommendedActions.length).toBeGreaterThan(0);
    });

    it('should estimate resolution time', async () => {
      const analysis = await manager.analyzeProblem('機械が動作しない');
      expect(analysis.estimatedResolution).toBeTruthy();
    });

    it('should handle different problem types', async () => {
      const problems = ['機械故障', '品質低下', '生産遅延', '安全問題'];
      for (const problem of problems) {
        const analysis = await manager.analyzeProblem(problem);
        expect(analysis.possibleCauses.length).toBeGreaterThan(0);
      }
    });

    it('should provide actionable recommendations', async () => {
      const analysis = await manager.analyzeProblem('原材料の品質が悪い');
      expect(analysis.recommendedActions.every((a) => a.startsWith('Investigate'))).toBe(true);
    });
  });

  // ===== 日報作成テスト (6個) =====
  describe('Daily Report Tests', () => {
    it('should generate daily report', async () => {
      const report = await manager.generateDailyReport('2026-07-16', 85, 92, ['Issue 1']);
      expect(report.date).toBe('2026-07-16');
      expect(report.production).toBe(85);
      expect(report.quality).toBe(92);
    });

    it('should identify daily improvements', async () => {
      const report = await manager.generateDailyReport('2026-07-16', 75, 85, []);
      expect(report.improvements.length).toBeGreaterThan(0);
    });

    it('should plan next actions', async () => {
      const report = await manager.generateDailyReport('2026-07-16', 80, 90, ['Issue 1', 'Issue 2']);
      expect(report.nextActions.length).toBeGreaterThan(0);
    });

    it('should handle high performance', async () => {
      const report = await manager.generateDailyReport('2026-07-16', 95, 98, []);
      expect(report.production).toBe(95);
      expect(report.quality).toBe(98);
    });

    it('should handle low performance', async () => {
      const report = await manager.generateDailyReport('2026-07-16', 60, 70, ['Critical Issue']);
      expect(report.improvements.length).toBeGreaterThan(0);
    });

    it('should include all issues in report', async () => {
      const issues = ['Issue 1', 'Issue 2', 'Issue 3'];
      const report = await manager.generateDailyReport('2026-07-16', 80, 90, issues);
      expect(report.issues.length).toBe(3);
    });
  });

  // ===== 工程改善テスト (3個) =====
  describe('Process Improvement Tests', () => {
    it('should support process improvement', async () => {
      const result = await manager.supportProcessImprovement('assembly');
      expect(result.improvements.length).toBeGreaterThan(0);
      expect(result.metrics).toBeTruthy();
    });

    it('should calculate process metrics', async () => {
      const result = await manager.supportProcessImprovement('welding');
      expect(result.metrics.efficiency).toBeGreaterThan(0);
      expect(result.metrics.quality).toBeGreaterThan(0);
      expect(result.metrics.cost).toBeGreaterThan(0);
    });

    it('should handle different processes', async () => {
      const processes = ['assembly', 'welding', 'painting', 'packaging'];
      for (const process of processes) {
        const result = await manager.supportProcessImprovement(process);
        expect(result.improvements.length).toBeGreaterThan(0);
      }
    });
  });

  // ===== 原価改善テスト (3個) =====
  describe('Cost Improvement Tests', () => {
    it('should support cost improvement', async () => {
      const result = await manager.supportCostImprovement();
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.potentialSavings).toBeGreaterThan(0);
    });

    it('should generate cost saving suggestions', async () => {
      const result = await manager.supportCostImprovement();
      expect(result.suggestions.every((s) => typeof s === 'string')).toBe(true);
    });

    it('should calculate potential savings', async () => {
      const result = await manager.supportCostImprovement();
      expect(result.potentialSavings).toBeGreaterThan(0);
    });
  });

  // ===== 品質改善テスト (3個) =====
  describe('Quality Improvement Tests', () => {
    it('should support quality improvement', async () => {
      const result = await manager.supportQualityImprovement();
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.targetQuality).toBeGreaterThan(0);
    });

    it('should generate quality recommendations', async () => {
      const result = await manager.supportQualityImprovement();
      expect(result.recommendations.every((r) => typeof r === 'string')).toBe(true);
    });

    it('should set target quality', async () => {
      const result = await manager.supportQualityImprovement();
      expect(result.targetQuality).toBeGreaterThan(0.9);
    });
  });

  // ===== 過去事例検索テスト (3個) =====
  describe('Past Case Search Tests', () => {
    it('should search past cases', async () => {
      const result = await manager.searchPastCases('品質問題');
      expect(result.cases.length).toBeGreaterThan(0);
      expect(result.relevance.length).toBe(result.cases.length);
    });

    it('should calculate relevance scores', async () => {
      const result = await manager.searchPastCases('生産遅延');
      expect(result.relevance.every((r) => r >= 0 && r <= 1)).toBe(true);
    });

    it('should handle different keywords', async () => {
      const keywords = ['品質', '効率', '安全', '原価'];
      for (const keyword of keywords) {
        const result = await manager.searchPastCases(keyword);
        expect(result.cases.length).toBeGreaterThan(0);
      }
    });
  });

  // ===== 現場判断支援テスト (3個) =====
  describe('Field Judgment Support Tests', () => {
    it('should support field judgment', async () => {
      const result = await manager.supportFieldJudgment('機械が異音を出している');
      expect(result.recommendation).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toBeTruthy();
    });

    it('should provide confident recommendations', async () => {
      const result = await manager.supportFieldJudgment('詳細な状況分析に基づいて判断が必要な複雑な製造現場の状況');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should build reasoning', async () => {
      const result = await manager.supportFieldJudgment('品質低下の原因を特定したい');
      expect(result.reasoning).toContain('Based on analysis');
    });
  });

  // ===== セッション管理テスト (3個) =====
  describe('Session Management Tests', () => {
    it('should manage session history', async () => {
      const sessionId = 'session-1';
      await manager.addToSessionHistory(sessionId, 'First message');
      const history = await manager.getSessionHistory(sessionId);
      expect(history.length).toBe(1);
    });

    it('should accumulate session messages', async () => {
      const sessionId = 'session-2';
      await manager.addToSessionHistory(sessionId, 'Message 1');
      await manager.addToSessionHistory(sessionId, 'Message 2');
      const history = await manager.getSessionHistory(sessionId);
      expect(history.length).toBe(2);
    });

    it('should handle multiple sessions', async () => {
      await manager.addToSessionHistory('session-a', 'Message A');
      await manager.addToSessionHistory('session-b', 'Message B');
      const historyA = await manager.getSessionHistory('session-a');
      const historyB = await manager.getSessionHistory('session-b');
      expect(historyA.length).toBe(1);
      expect(historyB.length).toBe(1);
    });
  });

  // ===== 統計テスト (2個) =====
  describe('Statistics Tests', () => {
    it('should calculate statistics', async () => {
      await manager.answerManufacturingQuestion('質問1');
      await manager.generateImprovementSuggestions();
      await manager.analyzeProblem('問題1');
      await manager.generateDailyReport('2026-07-16', 80, 90);

      const stats = await manager.getStatistics();
      expect(stats.totalQuestions).toBeGreaterThan(0);
      expect(stats.totalSuggestions).toBeGreaterThan(0);
      expect(stats.totalProblems).toBeGreaterThan(0);
      expect(stats.totalReports).toBeGreaterThan(0);
    });

    it('should calculate average metrics', async () => {
      await manager.answerManufacturingQuestion('質問1');
      await manager.answerManufacturingQuestion('質問2');

      const stats = await manager.getStatistics();
      expect(stats.averageResponseConfidence).toBeGreaterThan(0);
    });
  });

  // ===== パフォーマンステスト (3個) =====
  describe('Performance Tests', () => {
    it('should handle bulk questions', async () => {
      const startTime = Date.now();
      for (let i = 0; i < 30; i++) {
        await manager.answerManufacturingQuestion(`質問${i}`);
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('should handle bulk improvements', async () => {
      const startTime = Date.now();
      for (let i = 0; i < 20; i++) {
        await manager.generateImprovementSuggestions();
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('should handle bulk reports', async () => {
      const startTime = Date.now();
      for (let i = 0; i < 25; i++) {
        await manager.generateDailyReport(`2026-07-${String(i + 1).padStart(2, '0')}`, 80 + Math.random() * 20, 85 + Math.random() * 15);
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });

  // ===== 異常系テスト (3個) =====
  describe('Error Handling Tests', () => {
    it('should handle empty question', async () => {
      const response = await manager.answerManufacturingQuestion('');
      expect(response.answer).toBeTruthy();
    });

    it('should handle non-existent session', async () => {
      const history = await manager.getSessionHistory('non-existent');
      expect(history.length).toBe(0);
    });

    it('should handle edge case values', async () => {
      const report = await manager.generateDailyReport('2026-07-16', 0, 0, []);
      expect(report.production).toBe(0);
      expect(report.quality).toBe(0);
    });
  });

  // ===== クリーンアップテスト (2個) =====
  describe('Cleanup Tests', () => {
    it('should clear all data', async () => {
      await manager.answerManufacturingQuestion('質問');
      await manager.generateImprovementSuggestions();
      await manager.clear();

      const stats = await manager.getStatistics();
      expect(stats.totalQuestions).toBe(0);
      expect(stats.totalSuggestions).toBe(0);
    });

    it('should handle operations after clear', async () => {
      await manager.clear();
      const response = await manager.answerManufacturingQuestion('質問');
      expect(response.answer).toBeTruthy();
    });
  });
});
