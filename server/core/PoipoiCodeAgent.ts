import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  lstatSync,
} from "fs";
import { dirname, resolve, relative } from "path";
import { execFileSync } from "child_process";
import { createHash } from "node:crypto";
import { invokeLLM } from "../_core/llm";

export interface CodeChange {
  path: string;
  content: string;
  baseHash?: string;
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
    const parts = normalized.split("/");
    if (parts.some(part => part === ".git" || part === "node_modules" || part === ".env" || part.startsWith(".env."))) {
      throw new Error("Protected path: " + filePath);
    }

    if (
      forbidden.some(
        (item) =>
          normalized === item ||
          normalized.startsWith(item + "/")
      )
    ) {
      throw new Error(`Protected file cannot be modified: ${filePath}`);
    }

    // Never follow symlinks out of the repository, including parent folders.
    let current = this.root;
    for (const segment of rel.split(/[\\/]+/)) {
      current = resolve(current, segment);
      if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
        throw new Error(`Symlink paths are forbidden: ${filePath}`);
      }
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

    // Read only explicitly referenced source files, within the project boundary.
    const sourceFiles = task.match(/(?:server|mobile|client|shared|src)\/[a-zA-Z0-9_./-]+\.(?:ts|tsx|js|jsx)/g) ?? [];
    const context: string[] = [];
    const sourceHashes = new Map<string, string>();
    for (const file of [...new Set(sourceFiles)].slice(0, 5)) {
      try {
        const fullPath = this.safePath(file);
        if (!existsSync(fullPath)) continue;
        const source = readFileSync(fullPath, "utf8");
        if (source.length > 20000) continue;
        context.push("Existing source: " + file + "\n" + source);
        sourceHashes.set(file, createHash("sha256").update(source).digest("hex"));
      } catch {
        // Never disclose protected or inaccessible paths.
      }
    }
    if (!context.length) {
      throw new Error("Specify existing source file paths to enable grounded code evolution");
    }
    const planResponse = await invokeLLM({
      model: process.env.LOCAL_CODER_MODEL || "qwen2.5-coder:7b",
      temperature: 0.1,
      messages: [
        { role: "system", content: "Plan a minimal, dependency-aware code change. Do not write code. Keep the plan concise." },
        { role: "user", content: "Task:\n" + task + "\nAvailable files:\n" +
          [...sourceHashes.keys()].join("\n") +
          "\nExplain implementation steps, compatibility risks, and how to validate." },
      ],
    });
    const plan = planResponse.choices?.[0]?.message?.content?.trim();
    if (!plan) throw new Error("Unable to plan code evolution");
    const prompt = [
      "You are Poipoi's code implementation agent.",
      "Modify the existing TypeScript project according to the user's request.",
      "Preserve existing functionality.",
      "Make the minimum necessary file changes.",
      "First reason about dependencies and preserve all existing exports.",
      "Do not fabricate unknown existing file contents; return an empty changes array if necessary.",
      "Only modify files whose existing contents are supplied below.",
      "Implementation plan (check against the actual source):",
      plan.slice(0, 6000),
      "Existing project files:",
      context.join("\n\n") || "(none)",
      "Return JSON only.",
      "",
      "Required format:",
      '{"changes":[{"path":"server/example.ts","content":"complete file content"}]}',
      "",
      "User request:",
      task,
    ].join("\n");

    const response = await invokeLLM({
      model: process.env.LOCAL_CODER_MODEL || "qwen2.5-coder:7b",
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "poipoi_code_changes",
          schema: {
            type: "object",
            properties: {
              changes: {
                type: "array",
                items: {
                  type: "object",
                  properties: { path: { type: "string" }, content: { type: "string" } },
                  required: ["path", "content"],
                },
              },
            },
            required: ["changes"],
          },
        },
      },
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

    const generated = this.extractJson(content).changes;
    const allowed = new Set(context.map(item => item.slice("Existing source: ".length).split("\n", 1)[0]));
    for (const change of generated) {
      const normalizedPath = change.path.replace(/\\/g, "/");
      if (!allowed.has(normalizedPath)) {
        throw new Error("Generated change targets an unreviewed file: " + change.path);
      }
      change.baseHash = sourceHashes.get(normalizedPath);
    }
    return generated;
  }

  async applyAndTest(changes: CodeChange[]): Promise<CodeTaskResult> {
    const backups = new Map<string, string | null>();
    const rollback = () => {
      for (const [absolute, previous] of backups) {
        if (previous === null) {
          if (existsSync(absolute)) unlinkSync(absolute);
        } else {
          mkdirSync(dirname(absolute), { recursive: true });
          writeFileSync(absolute, previous, "utf8");
        }
      }
    };

    try {
      if (!changes.length) throw new Error("No generated changes to apply");
      const paths = changes.map(change => this.safePath(change.path));
      if (new Set(paths).size !== paths.length) throw new Error("Duplicate generated file paths");
      if (changes.some(change => !change.content.trim())) throw new Error("Empty generated file content");
      for (const change of changes) {
        if (!change.baseHash) continue;
        const absolute = this.safePath(change.path);
        const currentHash = existsSync(absolute)
          ? createHash("sha256").update(readFileSync(absolute, "utf8")).digest("hex")
          : "";
        if (currentHash !== change.baseHash) {
          throw new Error("Source changed after generation: " + change.path);
        }
      }

      // Validate syntax before modifying the working tree.
      const ts = await import("typescript");
      for (const change of changes) {
        if (!/\.[cm]?[jt]sx?$/.test(change.path)) continue;
        const checked = ts.transpileModule(change.content, {
          fileName: change.path,
          reportDiagnostics: true,
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
          },
        });
        if (checked.diagnostics?.some(item => item.category === ts.DiagnosticCategory.Error)) {
          throw new Error("Invalid generated TypeScript: " + change.path);
        }
      }

      // Existing uncommitted edits must never be silently replaced.
      const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
        cwd: this.root, encoding: "utf8", timeout: 15000, windowsHide: true,
      });
      const dirty = status.split(/\r?\n/).filter(Boolean);
      // A generated commit must not include unrelated pre-staged changes.
      const staged = execFileSync("git", ["diff", "--cached", "--name-only"], {
        cwd: this.root, encoding: "utf8", timeout: 15000, windowsHide: true,
      }).trim();
      if (staged) throw new Error("Refusing self-evolution while unrelated staged changes exist");
      for (const path of changes.map(item => item.path.replace(/\\/g, "/"))) {
        if (dirty.some(line => line.slice(3) === path || line.slice(3).endsWith(" -> " + path))) {
          throw new Error("Refusing to overwrite existing local changes: " + path);
        }
      }

      for (const change of changes) {
        const absolute = this.safePath(change.path);
        backups.set(absolute, existsSync(absolute) ? readFileSync(absolute, "utf8") : null);
        mkdirSync(dirname(absolute), { recursive: true });
        writeFileSync(absolute, change.content, "utf8");
      }

      // A successful syntax check alone is not a verified evolution.
      // Run the project's configured type checker; failures restore every file.
      execFileSync(process.platform === "win32" ? "cmd.exe" : "pnpm",
        process.platform === "win32" ? ["/d", "/s", "/c", "pnpm exec tsc --noEmit"] : ["exec", "tsc", "--noEmit"], {
        cwd: this.root, encoding: "utf8", timeout: 120000,
        windowsHide: true, stdio: "pipe",
      });

      // Only commit the exact generated paths after successful verification.
      // No git add -A: unrelated user changes are preserved.
      execFileSync("git", ["add", "--", ...changes.map(item => item.path)], {
        cwd: this.root, timeout: 15000, windowsHide: true,
      });
      execFileSync("git", ["commit", "-m", "PoiPoi verified self-evolution", "--", ...changes.map(item => item.path)], {
        cwd: this.root, timeout: 30000, windowsHide: true,
      });
      return { success: true, changes, tested: true };
    } catch (error) {
      let detail = error instanceof Error ? error.message : String(error);
      try {
        if (backups.size) {
          // Discard only our staged paths, leaving unrelated staged changes alone.
          execFileSync("git", ["reset", "--quiet", "--", ...changes.map(item => item.path)], {
            cwd: this.root, timeout: 15000, windowsHide: true,
          });
        }
      } catch (restoreError) {
        detail += "; rollback failed: " + String(restoreError);
      }
      try { if (backups.size) rollback(); } catch (restoreError) { detail += "; file restore failed: " + String(restoreError); }
      return { success: false, changes: [], tested: false, error: detail };
    }
  }

  async execute(task: string): Promise<CodeTaskResult> {
    const changes = await this.generate(task);
    return this.applyAndTest(changes);
  }
}
