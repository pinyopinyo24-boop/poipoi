import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";

// Auto-program generation system that creates code automatically
export const autoProgramGenerationRouter = router({
  // Generate a complete program based on user requirements
  generateProgram: publicProcedure
    .input(
      z.object({
        title: z.string().describe("プログラムのタイトル"),
        description: z.string().describe("プログラムの説明"),
        requirements: z.array(z.string()).describe("プログラムの要件"),
        language: z.enum(["typescript", "javascript", "python"]).default("typescript").describe("プログラミング言語"),
        framework: z.string().optional().describe("使用するフレームワーク"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Generate program structure and code
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert code generation system for PoiPoi platform.
Generate complete, production-ready code based on user requirements.
Provide structured code with proper error handling, types, and documentation.
Respond in JSON format with: { "structure": {...}, "code": "...", "files": [...], "explanation": "..." }`,
            },
            {
              role: "user",
              content: `Title: ${input.title}
Description: ${input.description}
Requirements: ${input.requirements.join(", ")}
Language: ${input.language}
${input.framework ? `Framework: ${input.framework}` : ""}

Generate a complete program that meets all requirements.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "program_generation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  structure: {
                    type: "object",
                    description: "Program structure/architecture",
                  },
                  code: {
                    type: "string",
                    description: "Main program code",
                  },
                  files: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        content: { type: "string" },
                      },
                    },
                    description: "Additional files to create",
                  },
                  explanation: {
                    type: "string",
                    description: "Explanation of the generated program",
                  },
                },
                required: ["structure", "code", "files", "explanation"],
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
          structure: result.structure,
          code: result.code,
          files: result.files,
          explanation: result.explanation,
        };
      } catch (error) {
        console.error("Program generation error:", error);
        return {
          success: false,
          error: "Failed to generate program",
        };
      }
    }),

  // Generate a specific function/component
  generateComponent: publicProcedure
    .input(
      z.object({
        name: z.string().describe("コンポーネント/関数の名前"),
        purpose: z.string().describe("目的"),
        inputs: z.array(z.string()).describe("入力パラメータ"),
        outputs: z.string().describe("出力内容"),
        language: z.enum(["typescript", "javascript", "python"]).default("typescript"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a code generation system for PoiPoi platform.
Generate a complete, well-documented component/function.
Include proper types, error handling, and comments.
Respond in JSON format with: { "code": "...", "types": "...", "tests": "...", "documentation": "..." }`,
            },
            {
              role: "user",
              content: `Component: ${input.name}
Purpose: ${input.purpose}
Inputs: ${input.inputs.join(", ")}
Outputs: ${input.outputs}
Language: ${input.language}

Generate a complete, production-ready component.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "component_generation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  code: {
                    type: "string",
                    description: "Generated component code",
                  },
                  types: {
                    type: "string",
                    description: "Type definitions",
                  },
                  tests: {
                    type: "string",
                    description: "Test code",
                  },
                  documentation: {
                    type: "string",
                    description: "Documentation",
                  },
                },
                required: ["code", "types", "tests", "documentation"],
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
          code: result.code,
          types: result.types,
          tests: result.tests,
          documentation: result.documentation,
        };
      } catch (error) {
        console.error("Component generation error:", error);
        return {
          success: false,
          error: "Failed to generate component",
        };
      }
    }),

  // Generate tests for existing code
  generateTests: publicProcedure
    .input(
      z.object({
        code: z.string().describe("テストの対象コード"),
        framework: z.string().optional().describe("テストフレームワーク"),
        coverage: z.number().min(0).max(100).default(80).describe("目標カバレッジ"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a test generation system for PoiPoi platform.
Generate comprehensive tests for the provided code.
Include unit tests, integration tests, and edge cases.
Respond in JSON format with: { "tests": "...", "coverage": number, "recommendations": [...] }`,
            },
            {
              role: "user",
              content: `Code to test:
\`\`\`
${input.code}
\`\`\`

${input.framework ? `Test Framework: ${input.framework}` : ""}
Target Coverage: ${input.coverage}%

Generate comprehensive tests.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "test_generation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  tests: {
                    type: "string",
                    description: "Generated test code",
                  },
                  coverage: {
                    type: "number",
                    description: "Expected coverage percentage",
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "Testing recommendations",
                  },
                },
                required: ["tests", "coverage", "recommendations"],
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
          tests: result.tests,
          coverage: result.coverage,
          recommendations: result.recommendations,
        };
      } catch (error) {
        console.error("Test generation error:", error);
        return {
          success: false,
          error: "Failed to generate tests",
        };
      }
    }),

  // Refactor existing code
  refactorCode: publicProcedure
    .input(
      z.object({
        code: z.string().describe("リファクタリング対象のコード"),
        goals: z.array(z.string()).describe("リファクタリングの目標"),
        constraints: z.array(z.string()).optional().describe("制約条件"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a code refactoring system for PoiPoi platform.
Refactor the provided code according to the specified goals.
Maintain functionality while improving quality, performance, and maintainability.
Respond in JSON format with: { "refactored": "...", "changes": [...], "improvements": [...] }`,
            },
            {
              role: "user",
              content: `Code to refactor:
\`\`\`
${input.code}
\`\`\`

Goals: ${input.goals.join(", ")}
${input.constraints ? `Constraints: ${input.constraints.join(", ")}` : ""}

Refactor the code.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "code_refactoring",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  refactored: {
                    type: "string",
                    description: "Refactored code",
                  },
                  changes: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of changes made",
                  },
                  improvements: {
                    type: "array",
                    items: { type: "string" },
                    description: "Improvements achieved",
                  },
                },
                required: ["refactored", "changes", "improvements"],
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
          refactored: result.refactored,
          changes: result.changes,
          improvements: result.improvements,
        };
      } catch (error) {
        console.error("Code refactoring error:", error);
        return {
          success: false,
          error: "Failed to refactor code",
        };
      }
    }),

  // Get generation status
  getGenerationStatus: publicProcedure.query(async () => {
    return {
      status: "active",
      capabilities: [
        "Program generation",
        "Component generation",
        "Test generation",
        "Code refactoring",
      ],
      supportedLanguages: ["typescript", "javascript", "python"],
      supportedFrameworks: ["React", "Vue", "Angular", "Express", "FastAPI"],
    };
  }),
});
