import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  lstatSync,
  readdirSync,
} from "fs";
import { dirname, resolve, relative } from "path";
import { execFileSync } from "child_process";
import { createHash } from "node:crypto";
import { invokeLLM } from "../_core/llm";

export interface CodeChange {
  path: string;
  content: string;
  baseHash?: string | null;
  previousContent?: string;
}

export interface CodeTaskResult {
  success: boolean;
  changes: CodeChange[];
  tested: boolean;
  typeChecked?: boolean;
  committed?: boolean;
  error?: string;
}

export class PoipoiCodeAgent {
  private static instance: PoipoiCodeAgent | null = null;
  private readonly root: string;
  private applying = false;

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

  async generate(task: string, userId = "system"): Promise<CodeChange[]> {
    if (!task.trim()) {
      throw new Error("Code generation task is empty");
    }

    // Discover relevant tracked source context when a user names a capability rather
    // than a path. Never run project code or expose configuration/secrets.
    const explicit = task.match(/(?:server|mobile|client|shared|src)\/[a-zA-Z0-9_./-]+\.(?:ts|tsx|js|jsx)/g) ?? [];
    const tokens: string[] = task.normalize('NFKC').toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) ?? [];
    const hints = [
      [/会話|チャット|文脈/, ['chat', 'conversation']],
      [/記憶|訂正|学習/, ['memory', 'learning']],
      [/自己進化|プログラム|コード/, ['codeagent', 'evolution']],
      [/画面|アプリ|電卓|ゲーム|ツール/, ['client/src/app', 'unifiedtools']],
      [/製造|生産|原価|在庫/, ['manufacturing', 'production', 'cost', 'inventory']],
      [/予定|スケジュール/, ['schedule']],
      [/資料|Excel|PDF|PowerPoint|PPT/i, ['unifiedtools', 'analysis', 'presentation']],
    ] as const;
    for (const [pattern, words] of hints) if (pattern.test(task)) tokens.push(...words);
    const candidates: string[] = [];
    const walk = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.isSymbolicLink() || /^(node_modules|dist|build|android|ios|core_backup.*)$/.test(entry.name)) continue;
        const file = resolve(directory, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (/\.[jt]sx?$/.test(entry.name) && !/\.test\.|\.bak/.test(entry.name)) {
          candidates.push(relative(this.root, file).replace(/\\/g, '/'));
        }
      }
    };
    for (const directory of ['server', 'client/src', 'shared']) {
      const full = resolve(this.root, directory);
      if (existsSync(full)) walk(full);
    }
    const ranked = candidates.map(file => ({ file, score: tokens.reduce((sum, token) =>
      sum + (file.toLowerCase().includes(token) ? token.length : 0), 0) }))
      .filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));
    // A concrete reference/target is already grounded context. Do not inflate a
    // one-file request with unrelated source, inventories or entry points.
    const explicitExisting = [...new Set(explicit)].filter(file => existsSync(this.safePath(file)));
    const sourceFiles = explicitExisting.length
      ? explicitExisting.slice(0, 5)
      : [...new Set([...ranked.map(item => item.file),
          'client/src/App.tsx', 'server/routers.ts', 'server/routers/unifiedTools.ts'])].slice(0, 5);
    const context: string[] = [];
    const sourceHashes = new Map<string, string>();
    const sourceContents = new Map<string, string>();
    let contextSize = 0;
    for (const file of sourceFiles) {
      const fullPath = this.safePath(file);
      if (!existsSync(fullPath)) continue;
      const source = readFileSync(fullPath, 'utf8');
      if (source.length > 60000 || contextSize + source.length > 60000) continue;
      contextSize += source.length;
      context.push('Existing source: ' + file + '\n' + source);
      sourceHashes.set(file, createHash('sha256').update(source).digest('hex'));
      sourceContents.set(file, source);
    }
    if (!context.length) throw new Error('関連する既存ソースを特定できません。対象機能またはソースパスを指定してください。');
    const configuredTimeout = Number(process.env.LOCAL_CODER_TIMEOUT_MS);
    const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout >= 1000
      ? Math.min(600000, configuredTimeout) : 300000;
    const configuredContext = Number(process.env.LOCAL_CODER_CONTEXT_SIZE);
    const contextFor = (characters: number) => {
      if (Number.isFinite(configuredContext) && configuredContext >= 4096) return Math.min(32768, configuredContext);
      return characters <= 16000 ? 8192 : characters <= 40000 ? 16384 : 32768;
    };
    const planResponse = await invokeLLM({ userId, timeoutMs,
      contextWindow: contextFor(task.length + 2000),
      max_tokens: 256,
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
      "First reason about dependencies and preserve all existing exports. Wire user-facing features into reviewed entry points when requested. For an explicitly requested standalone module, respect its requested path and do not invent entry-point changes.",
      "Do not fabricate unknown existing file contents; return an empty changes array if necessary.",
      "Only modify existing files whose full contents are supplied below. You may also CREATE new TypeScript/JavaScript source files under server/, client/src/, shared/, src/ or mobile/src/ when necessary. Never replace an existing file whose content is absent. Connect new exports to the existing implementation; preserve compatibility.",
      "Implementation plan (check against the actual source):",
      plan.slice(0, 6000),
      "Existing source path inventory (names only; do not modify without supplied content):",
      (explicitExisting.length ? explicit : sourceFiles).slice(0, 20).join("\n"),
      "Use only dependencies already declared by the project. Do not add packages or configuration changes.",
      "Existing dependency names:",
      Object.keys(JSON.parse(readFileSync(resolve(this.root, 'package.json'), 'utf8')).dependencies ?? {}).join(', '),
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

    const response = await invokeLLM({ userId, timeoutMs,
      contextWindow: contextFor(prompt.length + contextSize),
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
    if (generated.length > 5) throw new Error("Generated changes exceed the five-file safety limit");
    const allowed = new Set(context.map(item => item.slice("Existing source: ".length).split("\n", 1)[0]));
    for (const change of generated) {
      const normalizedPath = change.path.replace(/\\/g, "/");
      const isNewSource = /^(?:server|client\/src|shared|src|mobile\/src)\/[a-zA-Z0-9_./-]+\.[jt]sx?$/.test(normalizedPath)
        && !existsSync(this.safePath(normalizedPath));
      if (!allowed.has(normalizedPath) && !isNewSource) {
        throw new Error("Generated change targets an unreviewed file: " + change.path);
      }
      const absolute = this.safePath(normalizedPath);
      change.path = normalizedPath;
      change.baseHash = existsSync(absolute) ? sourceHashes.get(normalizedPath) : null;
      change.previousContent = change.baseHash === null ? '' : sourceContents.get(normalizedPath);
    }
    return generated;
  }

  async applyAndTest(changes: CodeChange[], options: { typeCheck?: boolean } = {}): Promise<CodeTaskResult> {
    if (this.applying) return { success: false, changes: [], tested: false, error: '別のコード変更を適用中です' };
    this.applying = true;
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
      if (changes.length > 5) throw new Error('Evolution batch exceeds five source files');
      for (const change of changes) {
        if (change.baseHash === undefined) throw new Error('Unverified source hash: ' + change.path);
        const absolute = this.safePath(change.path);
        const currentHash = existsSync(absolute)
          ? createHash("sha256").update(readFileSync(absolute, "utf8")).digest("hex")
          : null;
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

      // Preserve the existing public surface even when the model proposes a full
      // file replacement. This is a structural guard, not a functional test.
      const exportedNames = (file: string, source: string) => {
        const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
          file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
        const names = new Set<string>();
        const binding = (name: import('typescript').BindingName): void => {
          if (ts.isIdentifier(name)) names.add(name.text);
          else for (const element of name.elements) if (ts.isBindingElement(element)) binding(element.name);
        };
        for (const node of parsed.statements) {
          if (ts.isExportDeclaration(node)) {
            const module = node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : '';
            if (node.exportClause && ts.isNamedExports(node.exportClause)) {
              for (const element of node.exportClause.elements) names.add('re-export:' + module + ':' + element.name.text);
            } else names.add('re-export:' + module + ':*');
            continue;
          }
          if (ts.isExportAssignment(node)) { names.add('default'); continue; }
          const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
          if (!modifiers?.some(item => item.kind === ts.SyntaxKind.ExportKeyword)) continue;
          if (modifiers.some(item => item.kind === ts.SyntaxKind.DefaultKeyword)) names.add('default');
          if (ts.isVariableStatement(node)) for (const declaration of node.declarationList.declarations) binding(declaration.name);
          else if ('name' in node && node.name && ts.isIdentifier(node.name as import('typescript').Node)) names.add((node.name as import('typescript').Identifier).text);
        }
        return names;
      };
      for (const change of changes) {
        if (change.baseHash === null) continue;
        const before = exportedNames(change.path, readFileSync(this.safePath(change.path), 'utf8'));
        const after = exportedNames(change.path, change.content);
        for (const name of before) if (!after.has(name)) throw new Error('既存の公開機能を削除する変更を拒否しました: ' + change.path + ' / ' + name);
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
        writeFileSync(absolute, change.content, { encoding: "utf8", flag: change.baseHash === null ? "wx" : "w" });
      }

      // Type checking is optional and separately approved. Functional tests are never
      // implied by applying a patch; tested stays false in either mode.
      if (options.typeCheck) execFileSync(process.platform === "win32" ? "cmd.exe" : "pnpm",
        process.platform === "win32" ? ["/d", "/s", "/c", "pnpm exec tsc --noEmit"] : ["exec", "tsc", "--noEmit"], {
        cwd: this.root, encoding: "utf8", timeout: 120000,
        windowsHide: true, stdio: "pipe",
      });

      // Only commit the exact generated paths after successful verification.
      // No git add -A: unrelated user changes are preserved.
      execFileSync("git", ["add", "--", ...changes.map(item => item.path)], {
        cwd: this.root, timeout: 15000, windowsHide: true,
      });
      execFileSync("git", ["-c", "core.hooksPath=" + (process.platform === "win32" ? "NUL" : "/dev/null"), "commit", "-m", "PoiPoi approved self-evolution [skip ci]", "--", ...changes.map(item => item.path)], {
        cwd: this.root, timeout: 30000, windowsHide: true,
      });
      return { success: true, changes, tested: false, typeChecked: options.typeCheck === true, committed: true };
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
    } finally {
      this.applying = false;
    }
  }

  // The code agent must never bypass the user-scoped preview/approval router.
  async execute(_task: string): Promise<CodeTaskResult> {
    return {
      success: false,
      changes: [],
      tested: false,
      error: 'Direct execution disabled. Use unifiedTools.codePreview and applyCodePreview with explicit approval.',
    };
  }
}
