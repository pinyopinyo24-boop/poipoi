import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "fs";
import { dirname, resolve, relative } from "path";
import { execFileSync } from "child_process";
import { invokeLLM } from "../_core/llm";

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
  private readonly root: string;

  private constructor(root = process.cwd()) {
    this.root = resolve(root);
  }

  static getInstance(): PoipoiCodeAgent {
    if (!PoipoiCodeAgent.instance) {
      PoipoiCodeAgent.instance = new PoipoiCodeAgent();
    }
    return PoipoiCodeAgent.instance;
  }

  private safePath(filePath: string): string {
    const absolute = resolve(this.root, filePath);
    const rel = relative(this.root, absolute);

    if (
      !rel ||
      rel.startsWith("..") ||
      rel.startsWith("../") ||
      rel.includes(":")
    ) {
      throw new Error(`Project outside path is forbidden: ${filePath}`);
    }

    const forbidden = [
      ".git",
      "node_modules",
      ".env",
      ".env.local",
      "package-lock.json",
      "pnpm-lock.yaml",
    ];

    const normalized = rel.replace(/\\/g, "/");

    if (
      forbidden.some(
        (item) =>
          normalized === item ||
          normalized.startsWith(item + "/")
      )
    ) {
      throw new Error(`Protected file cannot be modified: ${filePath}`);
    }

    return absolute;
  }

  private extractJson(text: string): { changes: CodeChange[] } {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```typescript/gi, "")
      .replace(/```ts/gi, "")
      .replace(/```/g, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start < 0 || end < start) {
      throw new Error("LLM returned no JSON object");
    }

    const candidate = cleaned.slice(start, end + 1);

    try {
      const parsed = JSON.parse(candidate);

      if (!Array.isArray(parsed.changes)) {
        throw new Error("changes array is missing");
      }

      for (const change of parsed.changes) {
        if (
          !change ||
          typeof change.path !== "string" ||
          typeof change.content !== "string"
        ) {
          throw new Error("Invalid code change");
        }
      }

      return parsed;
    } catch {
      const contentMatch = candidate.match(
        /"content"\s*:\s*`([\s\S]*?)`(?=\s*[,}])/
      );

      if (!contentMatch) {
        throw new Error("Unable to parse LLM JSON response");
      }

      const repaired = candidate.replace(
        contentMatch[0],
        `"content": ${JSON.stringify(contentMatch[1])}`
      );

      const parsed = JSON.parse(repaired);

      if (!Array.isArray(parsed.changes)) {
        throw new Error("changes array is missing");
      }

      for (const change of parsed.changes) {
        if (
          !change ||
          typeof change.path !== "string" ||
          typeof change.content !== "string"
        ) {
          throw new Error("Invalid code change");
        }
      }

      return parsed;
    }
  }

  async generate(task: string): Promise<CodeChange[]> {
    if (!task.trim()) {
      throw new Error("Code generation task is empty");
    }

    const prompt = [
      "You are Poipoi's code implementation agent.",
      "Modify the existing TypeScript project according to the user's request.",
      "Preserve existing functionality.",
      "Make the minimum necessary file changes.",
      "Return JSON only.",
      "",
      "Required format:",
      '{"changes":[{"path":"server/example.ts","content":"complete file content"}]}',
      "",
      "User request:",
      task,
    ].join("\n");

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a reliable software implementation agent. Return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content =
      typeof response === "string"
        ? response
        : response?.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      throw new Error("LLM returned empty response");
    }

    return this.extractJson(content).changes;
  }

  async applyAndTest(changes: CodeChange[]): Promise<CodeTaskResult> {
    const backups = new Map<string, string | null>();

    // Do not report generated changes as verified: execution requires a separate
    // explicit validation step and the caller must see tested=false.
    try {
      if (!changes.length) throw new Error('No generated changes to apply');
      const paths = changes.map(change => this.safePath(change.path));
      if (new Set(paths).size !== paths.length) throw new Error('Duplicate generated file paths');
      if (changes.some(change => !change.content.trim())) throw new Error('Empty generated file content');
      for (const change of changes) {
        const absolute = this.safePath(change.path);

        if (!backups.has(absolute)) {
          backups.set(
            absolute,
            existsSync(absolute)
              ? readFileSync(absolute, "utf8")
              : null
          );
        }

        mkdirSync(dirname(absolute), { recursive: true });
        writeFileSync(absolute, change.content, "utf8");
      }


      // Reject generated TypeScript with syntax diagnostics; catch restores backups.
      const ts = await import("typescript");
      for (const change of changes) {
        if (!change.path.endsWith(".ts") && !change.path.endsWith(".tsx")) continue;
        const checked = ts.transpileModule(change.content, {
          fileName: change.path,
          reportDiagnostics: true,
          compilerOptions: { target: ts.ScriptTarget.ES2022 },
        });
        if (checked.diagnostics?.some(item => item.category === ts.DiagnosticCategory.Error)) {
          throw new Error("Invalid generated TypeScript: " + change.path);
        }
      }
      return {
        success: true,
        changes,
        tested: false,
      };
    } catch (error) {
      for (const absolute of Array.from(backups.keys())) {
        const previous = backups.get(absolute);

        if (previous === null) {
          if (existsSync(absolute)) {
            unlinkSync(absolute);
          }
        } else if (previous !== undefined) {
          writeFileSync(absolute, previous, "utf8");
        }
      }

      return {
        success: false,
        changes: [],
        tested: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  async execute(task: string): Promise<CodeTaskResult> {
    const changes = await this.generate(task);
    return this.applyAndTest(changes);
  }
}
