/**
 * tRPC Router for AI Agents
 * Provides RPC endpoints for agent operations
 */

import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getAICore, initializeAICore } from '../_core/ai/AICore';
import { AgentType } from '../_core/ai/agents/BaseAgent';

/**
 * AI Agents Router
 */
export const aiAgentsRouter = router({
  /**
   * Initialize AI Core
   */
  initialize: publicProcedure.mutation(async () => {
    try {
      const aiCore = await initializeAICore();
      return {
        success: true,
        status: aiCore.getSystemStatus(),
      };
    } catch (error) {
      console.error('[aiAgents.initialize] Error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to initialize AI Core');
    }
  }),

  /**
   * Get system status
   */
  getSystemStatus: publicProcedure.query(async () => {
    const aiCore = getAICore();
    if (!aiCore) {
      return {
        initialized: false,
        error: 'AI Core not initialized',
      };
    }

    return aiCore.getSystemStatus();
  }),

  /**
   * Get provider statuses
   */
  getProviderStatuses: publicProcedure.query(async () => {
    const aiCore = getAICore();
    if (!aiCore) {
      return {};
    }

    try {
      return await aiCore.getAllProviderStatuses();
    } catch (error) {
      console.error('[aiAgents.getProviderStatuses] Error:', error);
      return {};
    }
  }),

  /**
   * Get agent statuses
   */
  getAgentStatuses: publicProcedure.query(async () => {
    const aiCore = getAICore();
    if (!aiCore) {
      return {};
    }

    return aiCore.getAllAgentStatuses();
  }),

  /**
   * Get agent details
   */
  getAgentDetails: publicProcedure
    .input(z.object({
      agentType: z.enum(['design', 'implementation', 'review', 'task', 'coordinator']),
    }))
    .query(async ({ input }) => {
      const aiCore = getAICore();
      if (!aiCore) {
        throw new Error('AI Core not initialized');
      }

      const agent = aiCore.getAgent(input.agentType as AgentType);
      if (!agent) {
        throw new Error(`Agent '${input.agentType}' not found`);
      }

      return {
        type: input.agentType,
        name: agent.getName(),
        description: agent.getDescription(),
        status: agent.getStatus(),
        currentTask: agent.getCurrentTask(),
        taskHistoryLength: agent.getTaskHistory().length,
      };
    }),

  /**
   * Execute agent task
   */
  executeTask: publicProcedure
    .input(z.object({
      agentType: z.enum(['design', 'implementation', 'review', 'task', 'coordinator']),
      description: z.string(),
      input: z.record(z.string(), z.any()),
    }))
    .mutation(async ({ input }) => {
      const aiCore = getAICore();
      if (!aiCore) {
        throw new Error('AI Core not initialized');
      }

      try {
        const result = await aiCore.executeTask(
          input.agentType as AgentType,
          input.description,
          input.input
        );

        return {
          success: result.success,
          taskId: result.taskId,
          output: result.output,
          executionTime: result.executionTime,
          tokensUsed: result.tokensUsed,
          error: result.error,
        };
      } catch (error) {
        console.error('[aiAgents.executeTask] Error:', error);
        throw new Error(error instanceof Error ? error.message : 'Task execution failed');
      }
    }),

  /**
   * Execute workflow
   */
  executeWorkflow: publicProcedure
    .input(z.object({
      workflowId: z.string(),
      steps: z.array(z.object({
        agentType: z.enum(['design', 'implementation', 'review', 'task', 'coordinator']),
        description: z.string(),
        input: z.record(z.string(), z.any()),
        dependsOn: z.array(z.enum(['design', 'implementation', 'review', 'task', 'coordinator'])).optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const aiCore = getAICore();
      if (!aiCore) {
        throw new Error('AI Core not initialized');
      }

      try {
        const result = await aiCore.executeWorkflow(input.workflowId, input.steps as any);

        return {
          workflowId: result.workflowId,
          status: result.status,
          stepCount: result.steps.length,
          executionTime: result.executionTime,
          totalTokensUsed: result.totalTokensUsed,
          error: result.error,
          aggregatedResults: result.aggregatedResults,
        };
      } catch (error) {
        console.error('[aiAgents.executeWorkflow] Error:', error);
        throw new Error(error instanceof Error ? error.message : 'Workflow execution failed');
      }
    }),

  /**
   * Get workflow result
   */
  getWorkflowResult: publicProcedure
    .input(z.object({
      workflowId: z.string(),
    }))
    .query(async ({ input }) => {
      const aiCore = getAICore();
      if (!aiCore) {
        throw new Error('AI Core not initialized');
      }

      const result = aiCore.getWorkflowResult(input.workflowId);
      if (!result) {
        return null;
      }

      return {
        workflowId: result.workflowId,
        status: result.status,
        stepCount: result.steps.length,
        executionTime: result.executionTime,
        totalTokensUsed: result.totalTokensUsed,
        error: result.error,
      };
    }),
});
