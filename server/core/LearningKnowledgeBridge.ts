import { promises as fs } from "node:fs";
import path from "node:path";

type Entry = {
  task: string;
  solution: string;
  outcome: "success" | "failure";
  feedback?: string;
  used: number;
};

export class LearningKnowledgeBridge {
  private file: string;
  private static writes = new Map<string, Promise<void>>();

  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = LearningKnowledgeBridge.writes.get(this.file) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>(resolve => { release = resolve; });
    const tail = previous.then(() => current);
    LearningKnowledgeBridge.writes.set(this.file, tail);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (LearningKnowledgeBridge.writes.get(this.file) === tail) {
        LearningKnowledgeBridge.writes.delete(this.file);
      }
    }
  }

  constructor(root: string) {
    this.file = path.join(root, "data", "learning-knowledge.json");
  }

  private async load(): Promise<Entry[]> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8"));
    } catch (e: any) {
      if (e.code === "ENOENT") return [];
      throw e;
    }
  }

  async recordFeedback(task: string, answer: string, accepted: boolean, correction?: string): Promise<void> {
    const corrected = correction?.trim();
    await this.exclusive(async () => {
      const data = await this.load();
      const key = (text: string) => text.normalize("NFKC").toLowerCase().replace(/[\s、。,.!?！？・]+/g, "");
      const question = key(task);
      const upsert = (solution: string, outcome: Entry["outcome"], feedback?: string) => {
        const index = data.findIndex(e => key(e.task) === question && e.solution === solution);
        if (outcome === "success" && !feedback && index >= 0 && data[index].outcome === "failure") return;
        const entry: Entry = { task, solution, outcome, feedback, used: index >= 0 ? data[index].used : 0 };
        if (index < 0) data.push(entry);
        else data[index] = entry;
      };
      if (!accepted) upsert(answer, "failure", corrected);
      if (corrected) {
        for (const entry of data) {
          if (key(entry.task) === question && entry.solution !== corrected) entry.outcome = "failure";
        }
        upsert(corrected, "success", corrected);
      } else if (accepted) {
        upsert(answer, "success");
      }
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const temporary = `${this.file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
      try {
        await fs.writeFile(temporary, JSON.stringify(data, null, 2));
        await fs.rename(temporary, this.file);
      } finally {
        await fs.rm(temporary, { force: true }).catch(() => {});
      }
    });
  }

  async learn(input: Omit<Entry, "used">): Promise<void> {
    return this.exclusive(async () => {
    const data = await this.load();
    const taskKey = (text: string) =>
      text.normalize("NFKC").toLowerCase().replace(/[\s、。,.!?！？・]+/g, "");
    const index = data.findIndex(x =>
      taskKey(x.task) === taskKey(input.task) && x.solution === input.solution
    );
    // Explicit corrections take precedence over earlier answers to equivalent questions.
    if (input.outcome === "success" && input.feedback?.trim()) {
      for (const previous of data) {
        if (taskKey(previous.task) === taskKey(input.task) && previous.solution !== input.solution) {
          previous.outcome = "failure";
        }
      }
    }
    // Do not re-approve an answer that a user previously rejected without a correction.
    if (input.outcome === "success" && !input.feedback?.trim() &&
        index >= 0 && data[index].outcome === "failure") return;
    const entry = { ...input, used: index < 0 ? 0 : data[index].used };
    if (index < 0) data.push(entry);
    else data[index] = entry;
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const temporary = `${this.file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    try {
      await fs.writeFile(temporary, JSON.stringify(data, null, 2));
      await fs.rename(temporary, this.file);
    } finally {
      await fs.rm(temporary, { force: true }).catch(() => {});
    }
    });
  }
  async recall(query: string, limit = 5): Promise<Entry[]> {
    await (LearningKnowledgeBridge.writes.get(this.file) ?? Promise.resolve());
    const data = await this.load();
    const compact = (v: string) => v.toLowerCase().normalize("NFKC")
      .replace(/[\s、。,.!?！？・]+/g, "");
    const q = compact(query);
    if (q.length < 2) return [];
    const bigrams = (v: string): Set<string> => {
      const pairs = new Set<string>();
      for (let i = 0; i < v.length - 1; i++) pairs.add(v.slice(i, i + 2));
      return pairs;
    };
    const queryPairs = bigrams(q);
    return data.filter(x => x.outcome === "success")
      .map((entry, index) => {
        const task = compact(entry.task);
        const taskPairs = bigrams(task);
        let shared = 0;
        for (const pair of queryPairs) if (taskPairs.has(pair)) shared++;
        const overlap = shared / Math.max(queryPairs.size, taskPairs.size, 1);
        const exact = task === q;
        const contained = task.includes(q) || q.includes(task);
        // Avoid unrelated historical answers: short incidental matches are insufficient.
        const score = exact ? 100 : contained && Math.min(task.length, q.length) >= 4
          ? 75 : overlap >= 0.45 && shared >= 3 ? Math.round(overlap * 65) : 0;
        return { entry, score: score > 0 && entry.feedback?.trim() ? score + 5 : score, index };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || b.index - a.index)
      .slice(0, Math.max(0, limit))
      .map(x => x.entry);
  }

  async recordUsage(task: string): Promise<void> {
    return this.exclusive(async () => {
    const data = await this.load();
    const entry = data.find(x => x.task === task);
    if (!entry) return;
    entry.used++;
    const temporary = `${this.file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    try {
      await fs.writeFile(temporary, JSON.stringify(data, null, 2));
      await fs.rename(temporary, this.file);
    } finally {
      await fs.rm(temporary, { force: true }).catch(() => {});
    }
    });
  }
  async evaluateRecall(queries: Array<{ question: string; expectedAnswer: string }>) {
    const results = await Promise.all(queries.map(async ({ question, expectedAnswer }) => {
      const recalled = await this.recall(question, 5);
      const normalize = (value: string) => value.normalize("NFKC").trim().toLowerCase();
      const rank = recalled.findIndex(item => normalize(item.solution) === normalize(expectedAnswer));
      return { question, hitAt1: rank === 0, hitAt5: rank >= 0, rank: rank < 0 ? null : rank + 1 };
    }));
    const count = results.length;
    return {
      count,
      hitAt1: count ? results.filter(item => item.hitAt1).length / count : 0,
      hitAt5: count ? results.filter(item => item.hitAt5).length / count : 0,
      results,
    };
  }

  async getStatistics() {
    await (LearningKnowledgeBridge.writes.get(this.file) ?? Promise.resolve());
    const data = await this.load();
    return {
      total: data.length,
      success: data.filter(x => x.outcome === "success").length,
      failure: data.filter(x => x.outcome === "failure").length
    };
  }
}