import { invokeLLM } from "../_core/llm";
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, unlinkSync } from "fs";
import { dirname, resolve, relative } from "path";
import { execFileSync } from "child_process";

export interface CodeChange {
  path: string;
  content: string;
}

export interface CodeTaskResult {
  success: boolean;
  changes: CodeChange[];
  tested: boolean;
  error?: string;
}

export class PoipoiCodeAgent {
  private static instance: PoipoiCodeAgent | null = null;

  static getInstance(): PoipoiCodeAgent {
    if (!PoipoiCodeAgent.instance) {
      PoipoiCodeAgent.instance = new PoipoiCodeAgent();
    }
    return PoipoiCodeAgent.instance;
  }

  private readonly root = process.cwd();

  private safePath(path: string): string {
    const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");
    if (
      !normalized ||
      normalized.startsWith(".git/") ||
      normalized === ".env" ||
      normalized.startsWith(".env.") ||
      normalized.includes("node_modules/")
    ) {
      throw new Error("変更禁止ファイル: " + path);
    }

    const absolute = resolve(this.root, normalized);
    const rel = relative(this.root, absolute).replace(/\\/g, "/");

    if (rel.startsWith("../") || rel === "..") {
      throw new Error("プロジェクト外のファイル: " + path);
    }

    return absolute;
  }

  private extractJson(text: string): { changes: CodeChange[] } {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start < 0 || end < start) {
      throw new Error("LLMからJSONを取得できません");
    }

    const parsed = JSON.parse(cleaned.slice(start, end + 1));

    if (!Array.isArray(parsed.changes)) {
      throw new Error("changes配列がありません");
    }

    for (const change of parsed.changes) {
      if (
        !change ||
        typeof change.path !== "string" ||
        typeof change.content !== "string"
      ) {
        throw new Error("不正な変更データ");
      }
    }

    return parsed;
  }

  async generate(task: string): Promise<CodeChange[]> {
    if (!task.trim()) {
      throw new Error("コード作業の依頼が空です");
    }

    const prompt = [
      "あなたはPoipoiの実装エージェントです。",
      "ユーザーの依頼を実際のTypeScriptプロジェクト変更に変換してください。",
      "既存機能を壊さず、必要最小限のファイルだけ変更してください。",
      "回答は必ずJSONのみ。",
      "",
      "形式:",
      '{"changes":[{"path":"server/...","content":"完全なファイル内容"}]}',
      "",
      "ユーザー依頼:",
      task
    ].join("\n");

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "あなたは安全なコード実装エージェントです。" },
        { role: "user", content: prompt }
      ]
    });

    const content =
      typeof response === "string"
        ? response
        : response?.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      throw new Error("LLM応答が空です");
    }

    return this.extractJson(content).changes;
  }

  async applyAndTest(changes: CodeChange[]): Promise<CodeTaskResult> {
    const backups = new Map<string, string | null>();

    try {
      for (const change of changes) {
        const absolute = this.safePath(change.path);

        if (!backups.has(absolute)) {
          backups.set(
            absolute,
            existsSync(absolute) ? readFileSync(absolute, "utf8") : null
          );
        }

        mkdirSync(dirname(absolute), { recursive: true });
        writeFileSync(absolute, change.content, "utf8");
      }

      execFileSync(
        process.platform === "win32" ? "cmd.exe" : "pnpm",
        process.platform === "win32"
          ? ["/c", "pnpm", "check"]
          : ["check"],
        { cwd: this.root, stdio: "pipe", encoding: "utf8" }
      );

      return {
        success: true,
        changes,
        tested: true
      };
    } catch (error) {
      for (const absolute of Array.from(backups.keys())) {
        const previous = backups.get(absolute)!;
        if (previous === null) {
          if (existsSync(absolute)) unlinkSync(absolute);
        } else {
          writeFileSync(absolute, previous, "utf8");
        }
      }

      return {
        success: false,
        changes: [],
        tested: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async execute(task: string): Promise<CodeTaskResult> {
    const changes = await this.generate(task);
    return this.applyAndTest(changes);
  }
}
