/**
 * Production Router - tRPC endpoints for Production Intelligence Engine
 */

import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import { ProductionEngine } from '../_core/ai/ProductionEngine';
import { MemoryIntegrationService } from '../_core/ai/MemoryIntegrationService';
import { SelfImprovementEngine } from '../_core/ai/SelfImprovementEngine';

// Initialize services
const memoryService = new MemoryIntegrationService();
const improvementEngine = new SelfImprovementEngine(memoryService);
const productionEngine = new ProductionEngine(memoryService, improvementEngine);

export const productionRouter = router({
  /**
   * Analyze production data
   */
  analyze: publicProcedure
    .input(z.object({
      productionData: z.array(z.object({
        id: z.string(),
        date: z.number(),
        processName: z.string(),
        plannedQuantity: z.number(),
        actualQuantity: z.number(),
        plannedCost: z.number(),
        actualCost: z.number(),
        plannedHours: z.number(),
        actualHours: z.number(),
        materialCost: z.number(),
        laborCost: z.number(),
        overheadCost: z.number(),
        defectRate: z.number(),
        efficiency: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await productionEngine.analyzeProduction(input.productionData);

        return {
          success: true,
          data: {
            id: result.id,
            timestamp: result.timestamp,
            overallEfficiency: result.overallEfficiency,
            costReductionOpportunities: result.costReductionOpportunities,
            costAnalysisCount: result.costAnalysis.length,
            inventoryAnalysisCount: result.inventoryAnalysis.length,
            processAnalysisCount: result.processAnalysis.length,
            suggestionCount: result.improvementSuggestions.length,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Get cost analysis
   */
  getCostAnalysis: publicProcedure
    .input(z.object({
      productionDataId: z.string(),
    }))
    .query(({ input }) => {
      try {
        const analysis = productionEngine.getCostAnalysis(input.productionDataId);

        if (!analysis) {
          return {
            success: false,
            error: 'Cost analysis not found',
          };
        }

        return {
          success: true,
          data: {
            id: analysis.id,
            estimatedCost: analysis.estimatedCost,
            actualCost: analysis.actualCost,
            variance: analysis.variance,
            varianceRate: analysis.varianceRate,
            costPerUnit: analysis.costPerUnit,
            chargeAmount: analysis.chargeAmount,
            profitMargin: analysis.profitMargin,
            recommendations: analysis.recommendations,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Get inventory analysis
   */
  getInventoryAnalysis: publicProcedure
    .input(z.object({
      itemId: z.string(),
    }))
    .query(({ input }) => {
      try {
        const analysis = productionEngine.getInventoryAnalysis(input.itemId);

        if (!analysis) {
          return {
            success: false,
            error: 'Inventory analysis not found',
          };
        }

        return {
          success: true,
          data: {
            id: analysis.id,
            itemName: analysis.itemName,
            currentQuantity: analysis.currentQuantity,
            averageUsage: analysis.averageUsage,
            turnoverRate: analysis.turnoverRate,
            daysInventory: analysis.daysInventory,
            stockoutRisk: analysis.stockoutRisk,
            overstockRisk: analysis.overstockRisk,
            recommendations: analysis.recommendations,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Get improvement suggestions
   */
  getImprovementSuggestions: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(10),
    }))
    .query(({ input }) => {
      try {
        const history = productionEngine.getAnalysisHistory(input.limit);

        const allSuggestions = history.flatMap((a) => a.improvementSuggestions);

        return {
          success: true,
          data: allSuggestions.map((s) => ({
            id: s.id,
            type: s.type,
            category: s.category,
            suggestion: s.suggestion,
            reason: s.reason,
            confidence: s.confidence,
            priority: s.priority,
            estimatedImpact: s.estimatedImpact,
            actionItems: s.actionItems,
          })),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Get analysis history
   */
  getAnalysisHistory: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(10),
    }))
    .query(({ input }) => {
      try {
        const history = productionEngine.getAnalysisHistory(input.limit);

        return {
          success: true,
          data: history.map((a) => ({
            id: a.id,
            timestamp: a.timestamp,
            overallEfficiency: a.overallEfficiency,
            costReductionOpportunities: a.costReductionOpportunities,
            costAnalysisCount: a.costAnalysis.length,
            inventoryAnalysisCount: a.inventoryAnalysis.length,
            processAnalysisCount: a.processAnalysis.length,
            suggestionCount: a.improvementSuggestions.length,
          })),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Get production statistics
   */
  getStatistics: publicProcedure
    .query(() => {
      try {
        const stats = productionEngine.getStatistics();

        return {
          success: true,
          data: {
            totalAnalyzed: stats.totalAnalyzed,
            averageEfficiency: stats.averageEfficiency,
            costReductionOpportunities: stats.costReductionOpportunities,
            inventoryIssues: stats.inventoryIssues,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Clear history
   */
  clearHistory: publicProcedure
    .input(z.object({}))
    .mutation(() => {
      try {
        productionEngine.clearHistory();

        return {
          success: true,
          data: { message: 'History cleared' },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),
});
