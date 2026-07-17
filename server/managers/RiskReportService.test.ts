/**
 * RiskReportService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { riskReportService, RiskReportService } from './RiskReportService';

describe('RiskReportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    riskReportService.cleanup();
  });

  afterEach(() => {
    riskReportService.cleanup();
  });

  // === リスク分析テスト ===
  describe('Analyze Risk', () => {
    it('should analyze risk', () => {
      const factors = new Map<string, number>();
      factors.set('factor1', 30);
      factors.set('factor2', 20);
      const analysis = riskReportService.analyzeRisk(1, factors);
      expect(analysis.riskScore).toBe(50);
    });

    it('should get analysis', () => {
      const factors = new Map<string, number>();
      factors.set('factor1', 30);
      const created = riskReportService.analyzeRisk(1, factors);
      const retrieved = riskReportService.getAnalysis(created.id);
      expect(retrieved).not.toBeNull();
    });

    it('should get user analyses', () => {
      const factors = new Map<string, number>();
      factors.set('factor1', 30);
      riskReportService.analyzeRisk(1, factors);
      riskReportService.analyzeRisk(1, factors);
      const analyses = riskReportService.getUserAnalyses(1);
      expect(analyses.length).toBe(2);
    });
  });

  // === リスク分類テスト ===
  describe('Classify Risk', () => {
    it('should classify critical risk', () => {
      const classification = riskReportService.classifyRisk(85);
      expect(classification.level).toBe('CRITICAL');
    });

    it('should classify high risk', () => {
      const classification = riskReportService.classifyRisk(65);
      expect(classification.level).toBe('HIGH');
    });

    it('should classify medium risk', () => {
      const classification = riskReportService.classifyRisk(45);
      expect(classification.level).toBe('MEDIUM');
    });

    it('should classify low risk', () => {
      const classification = riskReportService.classifyRisk(25);
      expect(classification.level).toBe('LOW');
    });
  });

  // === リスクレポート生成テスト ===
  describe('Generate Report', () => {
    it('should generate report', () => {
      const factors = new Map<string, number>();
      factors.set('factor1', 30);
      riskReportService.analyzeRisk(1, factors);
      const report = riskReportService.generateReport(1);
      expect(report.userId).toBe(1);
      expect(report.summary).toBeDefined();
    });

    it('should get report', () => {
      const factors = new Map<string, number>();
      factors.set('factor1', 30);
      riskReportService.analyzeRisk(1, factors);
      const created = riskReportService.generateReport(1);
      const retrieved = riskReportService.getReport(created.reportId);
      expect(retrieved).not.toBeNull();
    });

    it('should get user reports', () => {
      const factors = new Map<string, number>();
      factors.set('factor1', 30);
      riskReportService.analyzeRisk(1, factors);
      riskReportService.generateReport(1);
      riskReportService.generateReport(1);
      const reports = riskReportService.getUserReports(1);
      expect(reports.length).toBe(2);
    });
  });

  // === リスク傾向分析テスト ===
  describe('Analyze Trend', () => {
    it('should analyze trend', () => {
      const factors = new Map<string, number>();
      factors.set('factor1', 30);
      riskReportService.analyzeRisk(1, factors);
      riskReportService.analyzeRisk(1, factors);
      const trend = riskReportService.analyzeTrend(1);
      expect(['improving', 'stable', 'declining']).toContain(trend.direction);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup specific user', () => {
      const factors = new Map<string, number>();
      factors.set('factor1', 30);
      riskReportService.analyzeRisk(1, factors);
      riskReportService.cleanup(1);
      const analyses = riskReportService.getUserAnalyses(1);
      expect(analyses.length).toBe(0);
    });

    it('should cleanup all', () => {
      const factors = new Map<string, number>();
      factors.set('factor1', 30);
      riskReportService.analyzeRisk(1, factors);
      riskReportService.analyzeRisk(2, factors);
      riskReportService.cleanup();
      const analyses1 = riskReportService.getUserAnalyses(1);
      const analyses2 = riskReportService.getUserAnalyses(2);
      expect(analyses1.length).toBe(0);
      expect(analyses2.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = RiskReportService.getInstance();
      const instance2 = RiskReportService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
