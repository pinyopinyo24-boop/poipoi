/**
 * tRPC Router for AI Agents
 * Provides RPC endpoints for agent operations
 */

import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { invokeLLM } from '../_core/llm';
import { getAICore, initializeAICore } from '../_core/ai/AICore';
import { AgentType } from '../_core/ai/agents/BaseAgent';

/**
 * AI Agents Router
 */
export const aiAgentsRouter = router({
  planAndExecute: protectedProcedure
    .input(z.object({ request: z.string().min(1).max(4000) }))
    .mutation(async ({ input }) => {
      const core = getAICore() ?? await initializeAICore();
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'Return JSON only: {"steps":[{"agentType":"task","description":"step","input":{}}]}. Allowed agentType: design, implementation, review, task. Maximum five steps. Use review as the final step to verify the preceding output; do not claim work is complete without evidence.' },
          { role: 'user', content: input.request },
        ],
        model: process.env.LOCAL_CODER_MODEL || 'qwen2.5-coder:7b',
        temperature: 0.1,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'agent_workflow',
            schema: {
              type: 'object',
              properties: {
                steps: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      agentType: { type: 'string' },
                      description: { type: 'string' },
                      input: { type: 'object' },
                    },
                    required: ['agentType', 'description', 'input'],
                  },
                },
              },
              required: ['steps'],
            },
          },
        },
      });
      const raw = response.choices[0]?.message?.content;
      if (!raw) throw new Error('No plan returned');
      const plan = z.object({
        steps: z.array(z.object({
          agentType: z.enum(['design', 'implementation', 'review', 'task']),
          description: z.string().min(1).max(2000),
          input: z.record(z.string(), z.any()),
        })).min(1).max(5),
      }).parse(JSON.parse(raw));
      const workflowId = 'planned-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      const steps = plan.steps.map((step, index) => ({
        ...step,
        input: { ...step.input, originalRequest: input.request },
        dependsOn: index > 0 ? [plan.steps[index - 1].agentType] : [],
      }));
      const result = await core.executeWorkflow(workflowId, steps);
      let verification: { passed: boolean; reason: string } = {
        passed: false,
        reason: result.error || 'Workflow did not complete',
      };
      if (result.status === 'completed') {
        const review = await invokeLLM({
          model: process.env.LOCAL_CHAT_MODEL || 'qwen2.5:7b',
          temperature: 0,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'workflow_verification',
              schema: {
                type: 'object',
                properties: { passed: { type: 'boolean' }, reason: { type: 'string' } },
                required: ['passed', 'reason'],
              },
            },
          },
          messages: [
            { role: 'system', content: 'Evaluate whether the evidence in agent outputs satisfies the original request. Be conservative: generated text alone does not prove external actions occurred. Return JSON with passed boolean and reason.' },
            { role: 'user', content: JSON.stringify({
              request: input.request,
              plan: plan.steps,
              outputs: result.aggregatedResults,
            }).slice(0, 16000) },
          ],
        });
        const assessment = review.choices[0]?.message?.content;
        if (!assessment) throw new Error('Workflow verification returned no assessment');
        verification = z.object({
          passed: z.boolean(),
          reason: z.string().min(1).max(2000),
        }).parse(JSON.parse(assessment));
      }
      let revision = null;
      if (result.status === 'completed' && !verification.passed &&
          plan.steps.every(step => step.agentType === 'design' || step.agentType === 'review')) {
        const retryId = workflowId + '-retry';
        const retrySteps = steps.map(step => ({
          ...step,
          description: step.description + '\nReviewer feedback: ' + verification.reason,
        }));
        const retry = await core.executeWorkflow(retryId, retrySteps);
        revision = {
          workflowId: retryId,
          status: retry.status,
          outputs: retry.aggregatedResults,
          error: retry.error,
          verified: false,
        };
      }
      return {
        revision,
        verification,
        workflowId,
        plan: plan.steps,
        status: result.status === 'completed' && !verification.passed ? 'needs_revision' : result.status,
        stepCount: result.steps.length,
        executionTime: result.executionTime,
        totalTokensUsed: result.totalTokensUsed,
        aggregatedResults: result.aggregatedResults,
        error: result.error,
      };
    }),

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
