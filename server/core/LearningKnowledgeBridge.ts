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

  async learn(input: Omit<Entry, "used">): Promise<void> {
    const data = await this.load();
    const index = data.findIndex(x =>
      x.task === input.task && x.solution === input.solution
    );
    // A user correction supersedes earlier answers for the same task.
    // Keep rejected answers as failures so recall cannot reuse them.
    if (input.outcome === "success" && input.feedback?.trim()) {
      for (const previous of data) {
        if (previous.task === input.task && previous.solution !== input.solution) {
          previous.outcome = "failure";
        }
      }
    }
    const entry = { ...input, used: index < 0 ? 0 : data[index].used };
    if (index < 0) data.push(entry);
    else data[index] = entry;
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(data, null, 2));
  }

  async recall(query: string, limit = 5): Promise<Entry[]> {
    const data = await this.load();
    const normalize = (v: string) => v.toLowerCase().normalize("NFKC").trim();
    const compact = (v: string) => normalize(v).replace(/[\\s、。,.!?！？・]+/g, "");
    const q = compact(query);
    if (!q) return [];
    const words = normalize(query).split(/[\\s、。,.!?！？・]+/).filter(w => w.length >= 2);
    return data.filter(x => x.outcome === "success")
      .map((entry, index) => {
        const task = compact(entry.task);
        let score = task === q ? 100 : task.includes(q) ? 50 : 0;
        for (const w of words) if (task.includes(compact(w))) score += 10;
        if (score > 0 && entry.feedback?.trim()) score += 20;
        return { entry, score, index };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || b.index - a.index)
      .slice(0, Math.max(0, limit))
      .map(x => x.entry);
  }

  async recordUsage(task: string): Promise<void> {
    const data = await this.load();
    const entry = data.find(x => x.task === task);
    if (!entry) return;
    entry.used++;
    await fs.writeFile(this.file, JSON.stringify(data, null, 2));
  }

  async getStatistics() {
    const data = await this.load();
    return {
      total: data.length,
      success: data.filter(x => x.outcome === "success").length,
      failure: data.filter(x => x.outcome === "failure").length
    };
  }
}