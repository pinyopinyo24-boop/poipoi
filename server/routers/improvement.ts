/**
 * Improvement Router - tRPC endpoints for Self Improvement Engine
 */

import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import { SelfImprovementEngine } from '../_core/ai/SelfImprovementEngine';
import { MemoryIntegrationService } from '../_core/ai/MemoryIntegrationService';

// Initialize services
const memoryService = new MemoryIntegrationService();
const improvementEngine = new SelfImprovementEngine(memoryService);

export const improvementRouter = router({
  /**
   * Analyze workflow and generate improvement suggestions
   */
  analyze: publicProcedure
    .input(z.object({
      workflow: z.object({
        id: z.string(),
        state: z.string(),
        duration: z.number().optional(),
        steps: z.array(z.object({
          agentType: z.string(),
          state: z.string(),
          duration: z.number().optional(),
          error: z.string().optional(),
        })),
      }),
    }))
    .mutation(async ({ input }) => {
      try {
        const analysis = await improvementEngine.analyzeWorkflow(input.workflow as any);

        return {
          success: true,
          data: {
            workflowId: analysis.workflowId,
            overallSuccessRate: analysis.overallSuccessRate,
            bottlenecks: analysis.bottlenecks,
            suggestions: analysis.suggestions.map(s => ({
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
            learningPoints: analysis.learningPoints,
            nextSteps: analysis.nextSteps,
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
   * Get improvement suggestions for a workflow
   */
  getSuggestions: publicProcedure
    .input(z.object({
      workflowId: z.string().optional(),
    }))
    .query(({ input }) => {
      try {
        const suggestions = improvementEngine.getSuggestions(input.workflowId);

        return {
          success: true,
          data: suggestions.map(s => ({
            id: s.id,
            workflowId: s.workflowId,
            type: s.type,
            category: s.category,
            suggestion: s.suggestion,
            reason: s.reason,
            confidence: s.confidence,
            priority: s.priority,
            estimatedImpact: s.estimatedImpact,
            actionItems: s.actionItems,
            createdAt: s.createdAt,
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
   * Apply a suggestion
   */
  applySuggestion: publicProcedure
    .input(z.object({
      suggestionId: z.string(),
    }))
    .mutation(({ input }) => {
      try {
        const applied = improvementEngine.applySuggestion(input.suggestionId);

        return {
          success: true,
          data: {
            applied,
            message: applied ? 'Suggestion applied' : 'Suggestion not found',
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
   * Get analysis history
   */
  getAnalysisHistory: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(10),
    }))
    .query(({ input }) => {
      try {
        const history = improvementEngine.getAnalysisHistory(input.limit);

        return {
          success: true,
          data: history.map(a => ({
            workflowId: a.workflowId,
            overallSuccessRate: a.overallSuccessRate,
            bottlenecks: a.bottlenecks,
            suggestionCount: a.suggestions.length,
            learningPoints: a.learningPoints,
            nextSteps: a.nextSteps,
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
   * Get agent performance metrics
   */
  getAgentMetrics: publicProcedure
    .input(z.object({
      agentType: z.string(),
    }))
    .query(({ input }) => {
      try {
        const metrics = improvementEngine.getAgentMetrics(input.agentType);

        return {
          success: true,
          data: metrics.map(m => ({
            agentType: m.agentType,
            successRate: m.successRate,
            averageDuration: m.averageDuration,
            errorCount: m.errorCount,
            lastErrors: m.lastErrors,
            improvementOpportunities: m.improvementOpportunities,
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
   * Get improvement statistics
   */
  getStatistics: publicProcedure
    .query(() => {
      try {
        const stats = improvementEngine.getStatistics();

        return {
          success: true,
          data: {
            totalAnalyzed: stats.totalAnalyzed,
            totalSuggestions: stats.totalSuggestions,
            averageConfidence: stats.averageConfidence,
            highPrioritySuggestions: stats.highPrioritySuggestions,
            agentCount: stats.agentCount,
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
        improvementEngine.clearHistory();

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
