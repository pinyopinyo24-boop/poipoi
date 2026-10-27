import { LearningKnowledgeBridge } from "./LearningKnowledgeBridge";

export class LearningContextIntegration {
  private readonly knowledge: LearningKnowledgeBridge;

  constructor(root: string) {
    this.knowledge = new LearningKnowledgeBridge(root);
  }

  async buildContext(message: string, limit = 5): Promise<string> {
    const entries = await this.knowledge.recall(message, limit);
    if (!entries.length) return "";

    return entries.map((e, i) =>
      `${i + 1}. Question: ${e.task}\nAnswer: ${e.solution}`
    ).join("\n\n");
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

  const learning = new LearningContextIntegration(process.cwd());
  const corrected = correction?.trim();

  if (!accepted) {
    await learning.recordResult({
      task, solution: answer, success: false, feedback: corrected
    });
  }

  if (accepted || corrected) {
    await learning.recordResult({
      task, solution: corrected || answer, success: true, feedback: corrected
    });
  }
}
