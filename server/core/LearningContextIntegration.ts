import { LearningKnowledgeBridge } from "./LearningKnowledgeBridge";
import { syncPoiPoiUnifiedState, getPoiPoiUnifiedState } from "./PoiPoiUnifiedStateStore";
import { createHash } from "node:crypto";
import { syncUserPoiPoiUnifiedState } from "./PoiPoiUnifiedStateStore";

async function publishLearning(task: string, solution: string, accepted: boolean, correction?: string, userId?: string): Promise<void> {
  const normalizedTask = task.normalize("NFKC").trim().toLowerCase();
  const normalizedSolution = (correction?.trim() || solution).normalize("NFKC").trim();
  const id = createHash("sha256").update(JSON.stringify([normalizedTask, normalizedSolution])).digest("hex");
  const records = [{
    id, category: "learning" as const, origin: "pc" as const, updatedAt: Date.now(),
    value: JSON.stringify({ task, solution: correction?.trim() || solution, outcome: accepted || !!correction?.trim() ? "success" : "failure", feedback: correction?.trim() }),
  }];
  if (correction?.trim() && correction.trim() !== solution) {
    const rejectedId = createHash("sha256").update(JSON.stringify([normalizedTask, solution.normalize("NFKC").trim()])).digest("hex");
    records.push({ id: rejectedId, category: "learning" as const, origin: "pc" as const, updatedAt: Date.now(),
      value: JSON.stringify({ task, solution, outcome: "failure" }) });
  }
  if (userId) await syncUserPoiPoiUnifiedState(userId, { version: 1, records });
  else await syncPoiPoiUnifiedState({ version: 1, records });
}


export class LearningContextIntegration {
  private readonly knowledge: LearningKnowledgeBridge;

  constructor(root: string) {
    this.knowledge = new LearningKnowledgeBridge(root);
  }

  async buildContext(message: string, limit = 5, userId?: string): Promise<string> {
    if (userId) return "";
    const entries = await this.knowledge.recall(message, limit);
    const shared = await getPoiPoiUnifiedState();
    const memories = shared.records.filter(record =>
      record.category === "memory" &&
      message.length >= 4 &&
      record.value.includes(message)
    ).slice(-3);
    if (!entries.length && !memories.length) return "";

    // Record only accepted examples actually supplied to the AI.
    await Promise.all(entries.map(e => this.knowledge.recordUsage(e.task)));
    return entries.map((e, i) =>
      `${i + 1}. Question: ${e.task.slice(0, 500)}\nAnswer: ${e.solution.slice(0, 1200)}`
    ).concat(memories.map(record => `Memory: ${record.value.slice(0, 500)}`)).join("\n\n");
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
    await publishLearning(input.task, input.solution, input.success, input.feedback);
  }
}

export async function enrichPromptWithLearning(
  root: string,
  prompt: string,
  userId?: string
): Promise<string> {
  try {
    const context = await new LearningContextIntegration(root).buildContext(prompt, 5, userId);
    return context ? `Past examples:\n${context}\n\nCurrent request:\n${prompt}` : prompt;
  } catch {
    return prompt;
  }
}

export async function recordLearningFeedback(
  task: string,
  answer: string,
  accepted: boolean,
  correction?: string,
  userId?: string
): Promise<void> {
  if (!task.trim() || !answer.trim()) return;

  if (!userId) await new LearningKnowledgeBridge(process.cwd()).recordFeedback(task, answer, accepted, correction);
  await publishLearning(task, answer, accepted, correction, userId);
}
