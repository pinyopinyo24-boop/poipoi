/**
 * Cost Router
 * コスト分析 + プレゼンテーション自動生成
 */

import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { AnalysisEngine } from './managers/AnalysisEngine';
import { PresentationAIManager } from './managers/PresentationAIManager';
import { PresentationRepository } from './managers/PresentationRepository';

// Types
export interface CostData {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  variance: number;
}

// Managers
const analysisEngine = new AnalysisEngine();
const presentationRepository = new PresentationRepository();
const presentationManager = new PresentationAIManager(presentationRepository);

// In-memory storage
const costDataStore: Map<string, CostData[]> = new Map();

/**
 * Cost Router
 */
export const costRouter = router({
  /**
   * コストデータを記録
   */
  recordCost: protectedProcedure
    .input(
      z.object({
        category: z.string(),
        amount: z.number(),
        percentage: z.number(),
        trend: z.enum(['up', 'down', 'stable']),
        variance: z.number(),
      })
    )
    .mutation(({ input }) => {
      const costData: CostData = {
        category: input.category,
        amount: input.amount,
        percentage: input.percentage,
        trend: input.trend,
        variance: input.variance,
      };

      const key = `cost_${Date.now()}`;
      if (!costDataStore.has(key)) {
        costDataStore.set(key, []);
      }
      costDataStore.get(key)!.push(costData);

      return { success: true, key };
    }),

  /**
   * コストを分析
   */
  analyzeCost: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(['1m', '3m', '6m', '1y']).optional(),
      })
    )
    .mutation(({ input }) => {
      const allCosts: CostData[] = [];
      costDataStore.forEach(costs => {
        allCosts.push(...costs);
      });

      if (allCosts.length === 0) {
        return {
          success: false,
          error: 'No cost data available',
        };
      }

      // Convert to numerical data
      const numericalData: Record<string, any> = {
        amount: {
          sum: 0,
          average: 0,
          max: 0,
          min: Infinity,
          count: allCosts.length,
        },
        percentage: {
          sum: 0,
          average: 0,
          max: 0,
          min: 100,
          count: allCosts.length,
        },
        variance: {
          sum: 0,
          average: 0,
          max: 0,
          min: 0,
          count: allCosts.length,
        },
      };

      // Calculate statistics
      for (const cost of allCosts) {
        numericalData.amount.sum += cost.amount;
        numericalData.amount.max = Math.max(numericalData.amount.max, cost.amount);
        numericalData.amount.min = Math.min(numericalData.amount.min, cost.amount);

        numericalData.percentage.sum += cost.percentage;
        numericalData.percentage.max = Math.max(numericalData.percentage.max, cost.percentage);
        numericalData.percentage.min = Math.min(numericalData.percentage.min, cost.percentage);

        numericalData.variance.sum += cost.variance;
        numericalData.variance.max = Math.max(numericalData.variance.max, cost.variance);
        numericalData.variance.min = Math.min(numericalData.variance.min, cost.variance);
      }

      // Calculate averages
      for (const key in numericalData) {
        numericalData[key].average = numericalData[key].sum / numericalData[key].count;
      }

      // Analyze
      const excelResult = {
        fileName: 'cost-analysis.xlsx',
        sheets: [{ name: 'Costs', data: [], headers: [] }],
        numericalData,
        statistics: {
          sheetCount: 1,
          totalRows: allCosts.length,
          totalColumns: 3,
        },
      };

      const analysis = analysisEngine.analyzeExcel(excelResult);

      return {
        success: true,
        analysis,
        costsCount: allCosts.length,
        totalAmount: numericalData.amount.sum,
      };
    }),

  /**
   * コスト分析からプレゼンテーションを生成
   */
  generateCostPresentation: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const allCosts: CostData[] = [];
      costDataStore.forEach(costs => {
        allCosts.push(...costs);
      });

      if (allCosts.length === 0) {
        return {
          success: false,
          error: 'No cost data available',
        };
      }

      // Calculate statistics
      const numericalData: Record<string, any> = {
        amount: { sum: 0, average: 0, max: 0, min: Infinity, count: allCosts.length },
        percentage: { sum: 0, average: 0, max: 0, min: 100, count: allCosts.length },
        variance: { sum: 0, average: 0, max: 0, min: 0, count: allCosts.length },
      };

      for (const cost of allCosts) {
        numericalData.amount.sum += cost.amount;
        numericalData.amount.max = Math.max(numericalData.amount.max, cost.amount);
        numericalData.amount.min = Math.min(numericalData.amount.min, cost.amount);

        numericalData.percentage.sum += cost.percentage;
        numericalData.percentage.max = Math.max(numericalData.percentage.max, cost.percentage);
        numericalData.percentage.min = Math.min(numericalData.percentage.min, cost.percentage);

        numericalData.variance.sum += cost.variance;
        numericalData.variance.max = Math.max(numericalData.variance.max, cost.variance);
        numericalData.variance.min = Math.min(numericalData.variance.min, cost.variance);
      }

      for (const key in numericalData) {
        numericalData[key].average = numericalData[key].sum / numericalData[key].count;
      }

      // Analyze
      const excelResult = {
        fileName: 'cost-analysis.xlsx',
        sheets: [{ name: 'Costs', data: [], headers: [] }],
        numericalData,
        statistics: {
          sheetCount: 1,
          totalRows: allCosts.length,
          totalColumns: 3,
        },
      };

      const analysis = analysisEngine.analyzeExcel(excelResult);
      const presentationData = analysisEngine.generatePresentationData(analysis);

      // Create presentation
      const presentation = presentationManager.createPresentation(
        input.title || presentationData.title,
        'Cost Analysis Report'
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

      return {
        success: true,
        presentationId: presentation.id,
        title: presentation.title,
        slideCount: presentation.slides.length,
        totalAmount: numericalData.amount.sum,
      };
    }),

  /**
   * コスト削減提案を生成
   */
  generateCostReduction: protectedProcedure
    .input(
      z.object({
        targetReduction: z.number(),
      })
    )
    .query(({ input }) => {
      const allCosts: CostData[] = [];
      costDataStore.forEach(costs => {
        allCosts.push(...costs);
      });

      if (allCosts.length === 0) {
        return {
          success: false,
          error: 'No cost data available',
        };
      }

      const totalCost = allCosts.reduce((sum, c) => sum + c.amount, 0);
      const reductionTarget = (totalCost * input.targetReduction) / 100;

      // Find high-variance categories
      const highVarianceCosts = allCosts
        .filter(c => c.variance > 10)
        .sort((a, b) => b.variance - a.variance);

      const recommendations = highVarianceCosts.map((cost, index) => ({
        priority: index < 3 ? 'high' : index < 6 ? 'medium' : 'low',
        category: cost.category,
        currentAmount: cost.amount,
        potentialSavings: cost.amount * (cost.variance / 100),
        action: `Review and optimize ${cost.category} costs`,
      }));

      return {
        success: true,
        totalCost,
        reductionTarget,
        recommendations,
        achievable: recommendations.reduce((sum, r) => sum + r.potentialSavings, 0) >= reductionTarget,
      };
    }),

  /**
   * カテゴリ別コスト取得
   */
  getCostByCategory: protectedProcedure
    .input(
      z.object({
        category: z.string(),
      })
    )
    .query(({ input }) => {
      const allCosts: CostData[] = [];
      costDataStore.forEach(costs => {
        allCosts.push(...costs);
      });

      const categoryCosts = allCosts.filter(c => c.category === input.category);
      const totalAmount = categoryCosts.reduce((sum, c) => sum + c.amount, 0);
      const averageAmount = categoryCosts.length > 0 ? totalAmount / categoryCosts.length : 0;

      return {
        category: input.category,
        costs: categoryCosts,
        count: categoryCosts.length,
        totalAmount,
        averageAmount,
      };
    }),

  /**
   * コスト比較
   */
  compareCosts: protectedProcedure
    .input(
      z.object({
        category1: z.string(),
        category2: z.string(),
      })
    )
    .query(({ input }) => {
      const allCosts: CostData[] = [];
      costDataStore.forEach(costs => {
        allCosts.push(...costs);
      });

      const costs1 = allCosts.filter(c => c.category === input.category1);
      const costs2 = allCosts.filter(c => c.category === input.category2);

      const total1 = costs1.reduce((sum, c) => sum + c.amount, 0);
      const total2 = costs2.reduce((sum, c) => sum + c.amount, 0);

      return {
        category1: {
          name: input.category1,
          total: total1,
          average: costs1.length > 0 ? total1 / costs1.length : 0,
          count: costs1.length,
        },
        category2: {
          name: input.category2,
          total: total2,
          average: costs2.length > 0 ? total2 / costs2.length : 0,
          count: costs2.length,
        },
        difference: Math.abs(total1 - total2),
        percentageDifference: total1 > 0 ? ((total2 - total1) / total1) * 100 : 0,
      };
    }),
});
