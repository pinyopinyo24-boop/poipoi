/**
 * Production Router
 * 製造データ分析 + プレゼンテーション自動生成
 */

import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { ProductionOperationsManager, OperationMetric } from './managers/ProductionOperationsManager';
import { AnalysisEngine } from './managers/AnalysisEngine';
import { PresentationAIManager } from './managers/PresentationAIManager';
import { PresentationRepository } from './managers/PresentationRepository';

// Types
export interface ProductionData {
  metricId: string;
  timestamp: number;
  uptime: number;
  responseTime: number;
  aiQualityScore: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  activeUsers: number;
}

export interface ProductionAnalysisResult {
  summary: string;
  findings: Array<{
    category: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    impact: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    expectedImprovement: string;
    estimatedEffort: string;
  }>;
  metrics: {
    criticalIssues: number;
    improvementPotential: number;
    averageUptime: number;
    averageResponseTime: number;
  };
}

// Managers
const productionManager = new ProductionOperationsManager();
const analysisEngine = new AnalysisEngine();
const presentationRepository = new PresentationRepository();
const presentationManager = new PresentationAIManager(presentationRepository);

/**
 * Production Router
 */
export const productionRouter = router({
  /**
   * 製造メトリクスを記録
   */
  recordMetric: protectedProcedure
    .input(
      z.object({
        uptime: z.number(),
        responseTime: z.number(),
        aiQualityScore: z.number(),
        errorRate: z.number(),
        cpuUsage: z.number(),
        memoryUsage: z.number(),
        activeUsers: z.number(),
      })
    )
    .mutation(({ input }) => {
      const recorded = productionManager.recordMetric(
        input.uptime,
        input.responseTime,
        input.aiQualityScore,
        input.errorRate,
        input.cpuUsage,
        input.memoryUsage,
        input.activeUsers
      );
      return { success: !!recorded, metricId: recorded.metricId };
    }),

  /**
   * 製造メトリクスを取得
   */
  getMetrics: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(() => {
      const metric = productionManager.getLatestMetric();
      return { metric, success: !!metric };
    }),

  /**
   * 製造データを分析
   */
  analyzeProduction: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(['1h', '24h', '7d', '30d']).optional(),
      })
    )
    .mutation(({ input }) => {
      const metrics = productionManager.getAllMetrics();

      if (metrics.length === 0) {
        return {
          success: false,
          error: 'No production metrics available',
        };
      }

      // Convert metrics to numerical data for analysis
      const numericalData: Record<string, any> = {
        uptime: {
          sum: 0,
          average: 0,
          max: 0,
          min: 100,
          count: metrics.length,
        },
        responseTime: {
          sum: 0,
          average: 0,
          max: 0,
          min: Infinity,
          count: metrics.length,
        },
        errorRate: {
          sum: 0,
          average: 0,
          max: 0,
          min: 100,
          count: metrics.length,
        },
        aiQualityScore: {
          sum: 0,
          average: 0,
          max: 0,
          min: 100,
          count: metrics.length,
        },
      };

      // Calculate statistics
      for (const metric of metrics) {
        numericalData.uptime.sum += metric.uptime;
        numericalData.uptime.max = Math.max(numericalData.uptime.max, metric.uptime);
        numericalData.uptime.min = Math.min(numericalData.uptime.min, metric.uptime);

        numericalData.responseTime.sum += metric.responseTime;
        numericalData.responseTime.max = Math.max(numericalData.responseTime.max, metric.responseTime);
        numericalData.responseTime.min = Math.min(numericalData.responseTime.min, metric.responseTime);

        numericalData.errorRate.sum += metric.errorRate;
        numericalData.errorRate.max = Math.max(numericalData.errorRate.max, metric.errorRate);
        numericalData.errorRate.min = Math.min(numericalData.errorRate.min, metric.errorRate);

        numericalData.aiQualityScore.sum += metric.aiQualityScore;
        numericalData.aiQualityScore.max = Math.max(numericalData.aiQualityScore.max, metric.aiQualityScore);
        numericalData.aiQualityScore.min = Math.min(numericalData.aiQualityScore.min, metric.aiQualityScore);
      }

      // Calculate averages
      for (const key in numericalData) {
        numericalData[key].average = numericalData[key].sum / numericalData[key].count;
      }

      // Use AnalysisEngine to analyze
      const excelResult = {
        fileName: 'production-metrics.xlsx',
        sheets: [{ name: 'Metrics', data: [], headers: [] }],
        numericalData,
        statistics: {
          sheetCount: 1,
          totalRows: metrics.length,
          totalColumns: 4,
        },
      };

      const analysis = analysisEngine.analyzeExcel(excelResult);

      return {
        success: true,
        analysis,
        metricsCount: metrics.length,
      };
    }),

  /**
   * 製造分析からプレゼンテーションを生成
   */
  generateProductionPresentation: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
        theme: z.enum(['Corporate', 'Modern', 'Classic', 'Minimal']).optional(),
      })
    )
    .mutation(({ input }) => {
      const metrics = productionManager.getAllMetrics();

      if (metrics.length === 0) {
        return {
          success: false,
          error: 'No production metrics available',
        };
      }

      // Calculate statistics
      const numericalData: Record<string, any> = {
        uptime: { sum: 0, average: 0, max: 0, min: 100, count: metrics.length },
        responseTime: { sum: 0, average: 0, max: 0, min: Infinity, count: metrics.length },
        errorRate: { sum: 0, average: 0, max: 0, min: 100, count: metrics.length },
        aiQualityScore: { sum: 0, average: 0, max: 0, min: 100, count: metrics.length },
      };

      for (const metric of metrics) {
        numericalData.uptime.sum += metric.uptime;
        numericalData.uptime.max = Math.max(numericalData.uptime.max, metric.uptime);
        numericalData.uptime.min = Math.min(numericalData.uptime.min, metric.uptime);

        numericalData.responseTime.sum += metric.responseTime;
        numericalData.responseTime.max = Math.max(numericalData.responseTime.max, metric.responseTime);
        numericalData.responseTime.min = Math.min(numericalData.responseTime.min, metric.responseTime);

        numericalData.errorRate.sum += metric.errorRate;
        numericalData.errorRate.max = Math.max(numericalData.errorRate.max, metric.errorRate);
        numericalData.errorRate.min = Math.min(numericalData.errorRate.min, metric.errorRate);

        numericalData.aiQualityScore.sum += metric.aiQualityScore;
        numericalData.aiQualityScore.max = Math.max(numericalData.aiQualityScore.max, metric.aiQualityScore);
        numericalData.aiQualityScore.min = Math.min(numericalData.aiQualityScore.min, metric.aiQualityScore);
      }

      for (const key in numericalData) {
        numericalData[key].average = numericalData[key].sum / numericalData[key].count;
      }

      // Analyze
      const excelResult = {
        fileName: 'production-metrics.xlsx',
        sheets: [{ name: 'Metrics', data: [], headers: [] }],
        numericalData,
        statistics: {
          sheetCount: 1,
          totalRows: metrics.length,
          totalColumns: 4,
        },
      };

      const analysis = analysisEngine.analyzeExcel(excelResult);
      const presentationData = analysisEngine.generatePresentationData(analysis);

      // Create presentation
      const presentation = presentationManager.createPresentation(
        input.title || presentationData.title,
        'Production Performance Analysis Report'
      );

      // Add slides
      for (const slideData of presentationData.slides) {
        presentationManager.addSlide(presentation.id, {
          title: slideData.title,
          content: slideData.content,
          layout: (slideData.layout || 'content') as 'title' | 'content' | 'two-column' | 'image-text' | 'chart' | 'table',
          elements: [],
        });
      }

      // Apply theme
      if (input.theme) {
        presentationManager.updatePresentation(presentation.id, {
          title: presentation.title,
          description: presentation.description,
        });
      }

      return {
        success: true,
        presentationId: presentation.id,
        title: presentation.title,
        slideCount: presentation.slides.length,
      };
    }),

  /**
   * 製造アラートを作成
   */
  createAlert: protectedProcedure
    .input(
      z.object({
        severity: z.enum(['critical', 'warning', 'info']),
        type: z.string(),
        message: z.string(),
      })
    )
    .mutation(({ input }) => {
      const created = productionManager.createAlert(
        input.severity,
        input.type,
        input.message
      );
      return { success: !!created, alertId: created.alertId };
    }),

  /**
   * 製造アラートを取得
   */
  getAlerts: protectedProcedure
    .input(
      z.object({
        status: z.enum(['active', 'resolved']).optional(),
      })
    )
    .query(({ input }) => {
      const alerts = productionManager.getAlertsByStatus(input?.status || 'active');
      return { alerts, count: alerts.length };
    }),

  /**
   * インシデントを記録
   */
  recordIncident: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        severity: z.enum(['critical', 'high', 'medium', 'low']),
      })
    )
    .mutation(({ input }) => {
      const created = productionManager.createIncident(
        input.title,
        input.description,
        input.severity
      );
      return { success: !!created, incidentId: created.incidentId };
    }),

  /**
   * インシデントを取得
   */
  getIncidents: protectedProcedure
    .input(
      z.object({
        status: z.enum(['open', 'investigating', 'resolved']).optional(),
      })
    )
    .query(({ input }) => {
      const incidents = productionManager.getIncidentsByStatus(input?.status || 'open');
      return { incidents, count: incidents.length };
    }),
});
