import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";

// Self-evolution system that learns from user interactions
export const selfEvolutionRouter = router({
  // Analyze user feedback and suggest improvements
  analyzeFeedback: publicProcedure
    .input(
      z.object({
        feedback: z.string().describe("ユーザーからのフィードバック"),
        context: z.string().optional().describe("現在のコンテキスト"),
      })
    )
    .mutation(async ({ input }) => {
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
        feature: z.string().describe("改善対象の機能"),
        feedback: z.string().describe("ユーザーからのフィードバック"),
        codeFile: z.string().optional().describe("対象のコードファイル"),
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
  learnFromInteraction: publicProcedure
    .input(
      z.object({
        interaction: z.string().describe("ユーザーとの相互作用"),
        outcome: z.string().describe("相互作用の結果"),
        satisfaction: z.number().min(1).max(5).describe("ユーザー満足度 (1-5)"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Store interaction data for learning
        const learningData = {
          timestamp: new Date().toISOString(),
          interaction: input.interaction,
          outcome: input.outcome,
          satisfaction: input.satisfaction,
        };

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

  // Get system status and evolution metrics
  getEvolutionStatus: publicProcedure.query(async () => {
    return {
      status: "active",
      evolutionPhase: "continuous_learning",
      metrics: {
        feedbackProcessed: 0,
        improvementsGenerated: 0,
        interactionsAnalyzed: 0,
        systemOptimization: "ongoing",
      },
      nextActions: [
        "Monitor user feedback patterns",
        "Generate code improvements",
        "Adapt to user preferences",
      ],
    };
  }),
});
