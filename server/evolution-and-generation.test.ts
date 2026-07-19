import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { createCallerFactory } from "./_core/trpc";

describe("Self-Evolution and Auto-Program Generation", () => {
  let caller: ReturnType<ReturnType<typeof createCallerFactory>>;

  beforeAll(async () => {
    const createCaller = createCallerFactory(appRouter);
    caller = createCaller({
      user: {
        id: "test-user",
        email: "test@example.com",
        name: "Test User",
        role: "user",
      },
      session: {
        id: "test-session",
        userId: "test-user",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  });

  describe("Self-Evolution Router", () => {
    it("should analyze feedback and suggest improvements", async () => {
      const result = await caller.evolution.analyzeFeedback({
        feedback: "The chat interface is slow when generating images",
        context: "Image generation performance issue",
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.priority).toMatch(/high|medium|low/);
    });

    it("should generate code improvements", async () => {
      const result = await caller.evolution.generateImprovement({
        feature: "Image Generation",
        feedback: "Need better error handling and caching",
        codeFile: "server/routers.streaming.ts",
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.improvements).toBeDefined();
      expect(result.code).toBeDefined();
      expect(result.explanation).toBeDefined();
    });

    it("should learn from user interactions", async () => {
      const result = await caller.evolution.learnFromInteraction({
        interaction: "User generated 5 images in 10 minutes",
        outcome: "All images generated successfully",
        satisfaction: 4,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.learningData).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("should get evolution status", async () => {
      const result = await caller.evolution.getEvolutionStatus();

      expect(result).toBeDefined();
      expect(result.status).toBe("active");
      expect(result.evolutionPhase).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.nextActions).toBeDefined();
      expect(Array.isArray(result.nextActions)).toBe(true);
    });
  });

  describe("Auto-Program Generation Router", () => {
    it("should generate a complete program", async () => {
      const result = await caller.autoProgramGeneration.generateProgram({
        title: "Todo List App",
        description: "A simple todo list application",
        requirements: [
          "Add tasks",
          "Mark tasks as complete",
          "Delete tasks",
          "Persist to local storage",
        ],
        language: "typescript",
        framework: "React",
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.structure).toBeDefined();
      expect(result.code).toBeDefined();
      expect(result.files).toBeDefined();
      expect(Array.isArray(result.files)).toBe(true);
      expect(result.explanation).toBeDefined();
    });

    it("should generate a component", async () => {
      const result = await caller.autoProgramGeneration.generateComponent({
        name: "UserCard",
        purpose: "Display user information in a card format",
        inputs: ["userId", "userName", "userEmail"],
        outputs: "Rendered card component",
        language: "typescript",
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.types).toBeDefined();
      expect(result.tests).toBeDefined();
      expect(result.documentation).toBeDefined();
    });

    it("should generate tests for code", async () => {
      const testCode = `
function add(a: number, b: number): number {
  return a + b;
}
`;

      const result = await caller.autoProgramGeneration.generateTests({
        code: testCode,
        framework: "vitest",
        coverage: 100,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.tests).toBeDefined();
      expect(result.coverage).toBeGreaterThan(0);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("should refactor code", async () => {
      const codeToRefactor = `
function processData(data) {
  let result = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i] > 0) {
      result.push(data[i] * 2);
    }
  }
  return result;
}
`;

      const result = await caller.autoProgramGeneration.refactorCode({
        code: codeToRefactor,
        goals: ["Use modern JavaScript", "Improve readability", "Add type safety"],
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.refactored).toBeDefined();
      expect(result.changes).toBeDefined();
      expect(Array.isArray(result.changes)).toBe(true);
      expect(result.improvements).toBeDefined();
      expect(Array.isArray(result.improvements)).toBe(true);
    });

    it("should get generation status", async () => {
      const result = await caller.autoProgramGeneration.getGenerationStatus();

      expect(result).toBeDefined();
      expect(result.status).toBe("active");
      expect(result.capabilities).toBeDefined();
      expect(Array.isArray(result.capabilities)).toBe(true);
      expect(result.supportedLanguages).toBeDefined();
      expect(Array.isArray(result.supportedLanguages)).toBe(true);
      expect(result.supportedFrameworks).toBeDefined();
      expect(Array.isArray(result.supportedFrameworks)).toBe(true);
    });
  });

  describe("Integration Tests", () => {
    it("should handle feedback and generate improvements", async () => {
      // First, analyze feedback
      const feedbackResult = await caller.evolution.analyzeFeedback({
        feedback: "Need better error messages in image generation",
        context: "User experience improvement",
      });

      expect(feedbackResult.success).toBe(true);

      // Then, generate improvements based on the feedback
      const improvementResult = await caller.evolution.generateImprovement({
        feature: "Error Handling",
        feedback: feedbackResult.analysis,
      });

      expect(improvementResult.success).toBe(true);
      expect(improvementResult.code).toBeDefined();
    });

    it("should generate program and tests", async () => {
      // Generate a program
      const programResult = await caller.autoProgramGeneration.generateProgram({
        title: "Calculator",
        description: "A simple calculator",
        requirements: ["Add", "Subtract", "Multiply", "Divide"],
        language: "typescript",
      });

      expect(programResult.success).toBe(true);

      // Generate tests for the generated code
      const testResult = await caller.autoProgramGeneration.generateTests({
        code: programResult.code,
        framework: "vitest",
        coverage: 90,
      });

      expect(testResult.success).toBe(true);
      expect(testResult.tests).toBeDefined();
    });
  });
});
