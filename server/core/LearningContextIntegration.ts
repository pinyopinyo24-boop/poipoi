import { LearningKnowledgeBridge } from "./LearningKnowledgeBridge";

export class LearningContextIntegration {
  private readonly knowledge: LearningKnowledgeBridge;

  constructor(root: string) {
    this.knowledge = new LearningKnowledgeBridge(root);
  }

  async buildContext(message: string, limit = 5): Promise<string> {
    const entries = await this.knowledge.recall(message, limit);
    if (!entries.length) return "";

    // Record only accepted examples actually supplied to the AI.
    await Promise.all(entries.map(e => this.knowledge.recordUsage(e.task)));
    return entries.map((e, i) =>
      `${i + 1}. Question: ${e.task.slice(0, 500)}\nAnswer: ${e.solution.slice(0, 1200)}`
    ).join("\n\n");
  }

  async evaluateKnowledge(queries: Array<{ question: string; expectedAnswer: string }>) {
    return this.knowledge.evaluateRecall(queries);
  }

  async recordResult(input: {
    task: string;
    solution: string;
    success: boolean;
    feedback?: string;
  }): Promise<void> {
    await this.knowledge.learn({
      task: input.task,
      solution: input.solution,
      outcome: input.success ? "success" : "failure",
      feedback: input.feedback
    });
  }
}

export async function enrichPromptWithLearning(
  root: string,
  prompt: string
): Promise<string> {
  try {
    const context = await new LearningContextIntegration(root).buildContext(prompt);
    return context ? `Past examples:\n${context}\n\nCurrent request:\n${prompt}` : prompt;
  } catch {
    return prompt;
  }
}

export async function recordLearningFeedback(
  task: string,
  answer: string,
  accepted: boolean,
  correction?: string
): Promise<void> {
  if (!task.trim() || !answer.trim()) return;

  await new LearningKnowledgeBridge(process.cwd()).recordFeedback(
    task, answer, accepted, correction
  );
}
