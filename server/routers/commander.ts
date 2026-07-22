/**
 * Commander Router - tRPC endpoints for Commander Engine
 */

import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import { CommanderEngine } from '../_core/ai/CommanderEngine';
import { MemoryIntegrationService } from '../_core/ai/MemoryIntegrationService';

// Initialize services
const memoryService = new MemoryIntegrationService();
const commanderEngine = new CommanderEngine(memoryService);

export const commanderRouter = router({
  /**
   * Analyze user input and determine task category
   */
  analyzeTask: publicProcedure
    .input(z.object({
      userInput: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      try {
        const analysis = await commanderEngine.analyzeTask(input.userInput);
        
        return {
          success: true,
          data: {
            id: analysis.id,
            category: analysis.category,
            confidence: analysis.confidence,
            selectedAgents: analysis.selectedAgents,
            reasoning: analysis.reasoning,
            keywords: analysis.keywords,
            complexity: analysis.complexity,
            estimatedDuration: analysis.estimatedDuration,
            priority: analysis.priority,
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
   * Create and execute execution plan
   */
  executePlan: publicProcedure
    .input(z.object({
      taskAnalysisId: z.string(),
      userInput: z.string(),
      category: z.string(),
      selectedAgents: z.array(z.string()),
      confidence: z.number(),
    }))
    .mutation(async ({ input }) => {
      try {
        // Create analysis object from input
        const analysis = {
          id: input.taskAnalysisId,
          userInput: input.userInput,
          category: input.category as any,
          confidence: input.confidence,
          selectedAgents: input.selectedAgents as any,
          reasoning: '',
          keywords: [],
          complexity: 'medium' as const,
          estimatedDuration: 2000,
          priority: 'medium' as const,
        };

        const plan = await commanderEngine.executePlan(analysis);

        return {
          success: true,
          data: {
            id: plan.id,
            taskAnalysisId: plan.taskAnalysisId,
            totalSteps: plan.totalSteps,
            estimatedDuration: plan.estimatedDuration,
            agents: plan.agents.map(a => ({
              agentType: a.agentType,
              order: a.order,
              dependsOn: a.dependsOn,
            })),
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
   * Get current commander status
   */
  getStatus: publicProcedure
    .query(() => {
      try {
        const status = commanderEngine.getStatus();

        if (!status) {
          return {
            success: true,
            data: null,
          };
        }

        return {
          success: true,
          data: {
            currentTaskId: status.currentTaskId,
            category: status.category,
            selectedAgents: status.selectedAgents,
            executionPhase: status.executionPhase,
            progress: status.progress,
            result: status.result,
            error: status.error,
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
   * Get task history
   */
  getTaskHistory: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(10),
    }))
    .query(({ input }) => {
      try {
        const history = commanderEngine.getTaskHistory(input.limit);

        return {
          success: true,
          data: history.map(task => ({
            id: task.id,
            userInput: task.userInput,
            category: task.category,
            confidence: task.confidence,
            selectedAgents: task.selectedAgents,
            complexity: task.complexity,
            priority: task.priority,
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
   * Get execution plans
   */
  getExecutionPlans: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(10),
    }))
    .query(({ input }) => {
      try {
        const plans = commanderEngine.getExecutionPlans(input.limit);

        return {
          success: true,
          data: plans.map(plan => ({
            id: plan.id,
            taskAnalysisId: plan.taskAnalysisId,
            totalSteps: plan.totalSteps,
            estimatedDuration: plan.estimatedDuration,
            createdAt: plan.createdAt,
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
   * Get commander statistics
   */
  getStatistics: publicProcedure
    .query(() => {
      try {
        const stats = commanderEngine.getStatistics();

        return {
          success: true,
          data: {
            totalTasks: stats.totalTasks,
            categoryDistribution: stats.categoryDistribution,
            averageConfidence: stats.averageConfidence,
            mostCommonCategory: stats.mostCommonCategory,
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
   * Update commander status
   */
  updateStatus: publicProcedure
    .input(z.object({
      phase: z.enum(['analyzing', 'planning', 'executing', 'completed', 'failed']),
      progress: z.number().min(0).max(100),
      result: z.record(z.string(), z.any()).optional(),
      error: z.string().optional(),
    }))
    .mutation(({ input }) => {
      try {
        commanderEngine.updateStatus(
          input.phase,
          input.progress,
          input.result,
          input.error
        );

        return {
          success: true,
          data: { message: 'Status updated' },
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
        commanderEngine.clearHistory();

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
