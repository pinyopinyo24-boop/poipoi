import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { invokeLLM } from "../_core/llm";
import { getUserPoiPoiUnifiedState, syncUserPoiPoiUnifiedState } from "../core/PoiPoiUnifiedStateStore";

// Self-evolution system that learns from user interactions
export const selfEvolutionRouter = router({
  // Analyze user feedback and suggest improvements
  analyzeFeedback: protectedProcedure
    .input(
      z.object({
        feedback: z.string().min(1).max(4000).describe("ユーザーからのフィードバック"),
        context: z.string().max(4000).optional().describe("現在のコンテキスト"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Use LLM to analyze feedback and generate improvements
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a self-evolution system for PoiPoi platform. 
Analyze user feedback and suggest specific improvements to the system.
Provide actionable insights that can be implemented immediately.
Respond in JSON format with: { "analysis": "...", "suggestions": ["...", "..."], "priority": "high|medium|low" }`,
            },
            {
              role: "user",
              content: `User feedback: "${input.feedback}"${input.context ? `\nContext: ${input.context}` : ""}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "evolution_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  analysis: {
                    type: "string",
                    description: "Detailed analysis of the feedback",
                  },
                  suggestions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Specific improvement suggestions",
                  },
                  priority: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Priority level for implementation",
                  },
                },
                required: ["analysis", "suggestions", "priority"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("No response from LLM");
        }

        const result = JSON.parse(content);
        if (typeof result.analysis !== 'string' || !Array.isArray(result.suggestions) ||
            !result.suggestions.every((item: unknown) => typeof item === 'string') ||
            !['high', 'medium', 'low'].includes(result.priority)) {
          throw new Error('Invalid feedback analysis response');
        }
        await syncUserPoiPoiUnifiedState(String(ctx.user.id), {
          version: 1,
          records: [{
            id: 'feedback-' + randomUUID(),
            category: 'learning',
            origin: 'pc',
            updatedAt: Date.now(),
            value: JSON.stringify({ feedback: input.feedback, context: input.context,
              analysis: result.analysis, suggestions: result.suggestions,
              priority: result.priority }).slice(0, 3000),
          }],
        });
        return {
          success: true,
          analysis: result.analysis,
          suggestions: result.suggestions,
          priority: result.priority,
        };
      } catch (error) {
        console.error("Evolution analysis error:", error);
        return {
          success: false,
          error: "Failed to analyze feedback",
        };
      }
    }),

  // Generate code improvements based on feedback
  generateImprovement: protectedProcedure
    .input(
      z.object({
        feature: z.string().min(1).max(300).describe("改善対象の機能"),
        feedback: z.string().describe("ユーザーからのフィードバック"),
        codeFile: z.string().max(500).optional().describe("対象のコードファイル"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Use LLM to generate code improvements
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a code improvement system for PoiPoi platform.
Generate specific code improvements based on user feedback.
Provide TypeScript/JavaScript code that can be directly integrated.
Respond in JSON format with: { "improvements": "...", "code": "...", "explanation": "..." }`,
            },
            {
              role: "user",
              content: `Feature: ${input.feature}\nFeedback: ${input.feedback}${input.codeFile ? `\nFile: ${input.codeFile}` : ""}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "code_improvement",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  improvements: {
                    type: "string",
                    description: "Summary of improvements",
                  },
                  code: {
                    type: "string",
                    description: "Generated code",
                  },
                  explanation: {
                    type: "string",
                    description: "Explanation of changes",
                  },
                },
                required: ["improvements", "code", "explanation"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("No response from LLM");
        }

        const result = JSON.parse(content);
        return {
          success: true,
          improvements: result.improvements,
          code: result.code,
          explanation: result.explanation,
        };
      } catch (error) {
        console.error("Code generation error:", error);
        return {
          success: false,
          error: "Failed to generate improvements",
        };
      }
    }),

  // Learn from user interactions and adapt
  learnFromInteraction: protectedProcedure
    .input(
      z.object({
        interaction: z.string().min(1).max(4000).describe("ユーザーとの相互作用"),
        outcome: z.string().min(1).max(4000).describe("相互作用の結果"),
        satisfaction: z.number().min(1).max(5).describe("ユーザー満足度 (1-5)"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Store interaction data for learning
        const learningData = {
          timestamp: new Date().toISOString(),
          interaction: input.interaction,
          outcome: input.outcome,
          satisfaction: input.satisfaction,
        };
        await syncUserPoiPoiUnifiedState(String(ctx.user.id), {
          version: 1,
          records: [{
            id: 'interaction-' + randomUUID(),
            category: 'learning',
            origin: 'pc',
            updatedAt: Date.now(),
            value: JSON.stringify(learningData).slice(0, 3000),
          }],
        });

        // Use LLM to extract insights
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a learning system for PoiPoi platform.
Extract insights from user interactions to improve the system.
Respond in JSON format with: { "insights": ["...", "..."], "recommendations": ["...", "..."] }`,
            },
            {
              role: "user",
              content: `Interaction: ${input.interaction}\nOutcome: ${input.outcome}\nSatisfaction: ${input.satisfaction}/5`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "learning_insights",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: { type: "string" },
                    description: "Extracted insights",
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "Recommendations for improvement",
                  },
                },
                required: ["insights", "recommendations"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("No response from LLM");
        }

        const result = JSON.parse(content);
        return {
          success: true,
          learningData,
          insights: result.insights,
          recommendations: result.recommendations,
        };
      } catch (error) {
        console.error("Learning error:", error);
        return {
          success: false,
          error: "Failed to learn from interaction",
        };
      }
    }),

  // Persistent, account-scoped proposal workflow. Generation never changes code.
  proposeImprovement: protectedProcedure
    .input(z.object({
      issue: z.string().trim().min(1).max(2000),
      target: z.string().trim().min(1).max(300),
      expectedOutcome: z.string().trim().min(1).max(1000),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = 'evolution-proposal-' + randomUUID();
      const proposal = { id, issue: input.issue, target: input.target,
        expectedOutcome: input.expectedOutcome, status: 'proposed' as const,
        createdAt: Date.now(), updatedAt: Date.now() };
      await syncUserPoiPoiUnifiedState(String(ctx.user.id), {
        version: 1, records: [{ id, category: 'evolution', origin: 'pc',
          updatedAt: proposal.updatedAt, value: JSON.stringify(proposal) }],
      });
      return proposal;
    }),

  listProposals: protectedProcedure.query(async ({ ctx }) => {
    const state = await getUserPoiPoiUnifiedState(String(ctx.user.id));
    return state.records.filter(record => record.category === 'evolution' &&
      record.id.startsWith('evolution-proposal-')).flatMap(record => {
      try { return [JSON.parse(record.value)]; } catch { return []; }
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  }),

  reviewProposal: protectedProcedure
    .input(z.object({
      proposalId: z.string().uuid(),
      decision: z.enum(['approve_preview', 'reject']),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = 'evolution-proposal-' + input.proposalId;
      const state = await getUserPoiPoiUnifiedState(String(ctx.user.id));
      const record = state.records.find(item => item.category === 'evolution' && item.id === id);
      if (!record) throw new Error('Proposal not found');
      const proposal = JSON.parse(record.value) as {
        id: string; issue: string; target: string; expectedOutcome: string;
        status: string; createdAt: number; updatedAt: number; previewId?: string;
      };
      if (proposal.status !== 'proposed') throw new Error('Proposal already reviewed');
      // Approval is for generating a preview only, not for applying changes.
      if (input.decision === 'approve_preview' && ctx.user.role !== 'admin')
        throw new Error('Administrator permission required');
      const next = { ...proposal, status: input.decision === 'reject' ? 'rejected' : 'preview_approved',
        updatedAt: Date.now() };
      await syncUserPoiPoiUnifiedState(String(ctx.user.id), {
        version: 1, records: [{ id, category: 'evolution', origin: 'pc',
          updatedAt: next.updatedAt, value: JSON.stringify(next) }],
      });
      return { ...next, applied: false, tested: false };
    }),

  generateApprovedPreview: protectedProcedure
    .input(z.object({ proposalId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new Error('Administrator permission required');
      const id = 'evolution-proposal-' + input.proposalId;
      const state = await getUserPoiPoiUnifiedState(String(ctx.user.id));
      const record = state.records.find(item => item.category === 'evolution' && item.id === id);
      if (!record) throw new Error('Proposal not found');
      const proposal = JSON.parse(record.value) as {
        issue: string; target: string; expectedOutcome: string; status: string;
        createdAt: number; updatedAt: number;
      };
      if (proposal.status !== 'preview_approved') throw new Error('Preview approval required');
      const { unifiedToolsRouter } = await import('./unifiedTools');
      const preview = await unifiedToolsRouter.createCaller(ctx).codePreview({
        request: 'Target: ' + proposal.target + '\nIssue: ' + proposal.issue +
          '\nExpected result: ' + proposal.expectedOutcome,
      });
      const next = { ...proposal, status: 'preview_ready', previewId: preview.previewId,
        updatedAt: Date.now() };
      await syncUserPoiPoiUnifiedState(String(ctx.user.id), {
        version: 1, records: [{ id, category: 'evolution', origin: 'pc',
          updatedAt: next.updatedAt, value: JSON.stringify(next) }],
      });
      return { ...next, changes: preview.changes, expiresInSeconds: preview.expiresInSeconds,
        applied: false, tested: false };
    }),

  applyApprovedPreview: protectedProcedure
    .input(z.object({
      proposalId: z.string().uuid(),
      previewId: z.string().uuid(),
      confirm: z.literal('APPLY_AND_VERIFY'),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') throw new Error('Administrator permission required');
      const id = 'evolution-proposal-' + input.proposalId;
      const state = await getUserPoiPoiUnifiedState(String(ctx.user.id));
      const record = state.records.find(item => item.category === 'evolution' && item.id === id);
      if (!record) throw new Error('Proposal not found');
      const proposal = JSON.parse(record.value) as { status: string; previewId?: string };
      if (proposal.status !== 'preview_ready' || proposal.previewId !== input.previewId)
        throw new Error('Approved preview does not match proposal');
      // Explicit confirmation is required. The existing code agent performs verification
      // and rollback; this endpoint does not silently invoke it.
      const { unifiedToolsRouter } = await import('./unifiedTools');
      const outcome = await unifiedToolsRouter.createCaller(ctx).applyCodePreview({
        previewId: input.previewId, confirm: input.confirm,
      });
      const next = { ...proposal, status: outcome.success ? 'applied' : 'failed',
        updatedAt: Date.now(), success: outcome.success, tested: outcome.tested,
        error: outcome.error?.slice(0, 1000) };
      await syncUserPoiPoiUnifiedState(String(ctx.user.id), {
        version: 1, records: [{ id, category: 'evolution', origin: 'pc',
          updatedAt: next.updatedAt, value: JSON.stringify(next) }],
      });
      return next;
    }),

  // Report actual stored learning events, not fabricated activity counters.
  getEvolutionStatus: protectedProcedure.query(async ({ ctx }) => {
    const state = await getUserPoiPoiUnifiedState(String(ctx.user.id));
    const learned = state.records.filter(record => record.category === 'learning');
    return {
      status: 'available',
      evolutionPhase: 'approval_required',
      metrics: {
        interactionsAnalyzed: learned.filter(record => record.id.startsWith('interaction-')).length,
        learningRecords: learned.length,
        feedbackProcessed: learned.filter(record => record.id.startsWith('correction-')).length,
        improvementsGenerated: state.records.filter(record => record.category === 'evolution').length,
        systemOptimization: 'not_verified',
      },
      nextActions: ['Review proposed changes', 'Approve code preview explicitly'],
    };
  }),
});
