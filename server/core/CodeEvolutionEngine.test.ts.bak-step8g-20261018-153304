import { describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { CodeEvolutionEngine } from "./CodeEvolutionEngine";

describe("CodeEvolutionEngine", () => {
  it("変更してTypeScriptチェック成功", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "poipoi-evolution-"));
    const file = path.join(root, "target.ts");

    await fs.writeFile(file, 'export const VALUE = "before";\n', "utf8");

    const engine = new CodeEvolutionEngine(root);
    const result = await engine.apply([{
      filePath: "target.ts",
      oldCode: 'export const VALUE = "before";',
      newCode: 'export const VALUE = "after";',
      reason: "test"
    }], ["node", "-e", "process.exit(0)"]);

    expect(result.success).toBe(true);
    expect(await fs.readFile(file, "utf8")).toContain('"after"');
  });

  it("テスト失敗時に自動ロールバック", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "poipoi-evolution-"));
    const file = path.join(root, "target.ts");

    await fs.writeFile(file, 'export const VALUE = "before";\n', "utf8");

    const engine = new CodeEvolutionEngine(root);
    const result = await engine.apply([{
      filePath: "target.ts",
      oldCode: 'export const VALUE = "before";',
      newCode: 'export const VALUE = "after";',
      reason: "test"
    }], ["pnpm", "exec", "tsc", "--noEmit", "--invalid-option"]);

    expect(result.success).toBe(false);
    expect(result.rolledBack).toBe(true);
    expect(await fs.readFile(file, "utf8")).toContain('"before"');
  });

  it("重複対象コードを拒否", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "poipoi-evolution-"));
    const file = path.join(root, "target.ts");

    await fs.writeFile(file, 'const X = "same";\nconst Y = "same";\n', "utf8");

    const engine = new CodeEvolutionEngine(root);
    const result = await engine.apply([{
      filePath: "target.ts",
      oldCode: '"same"',
      newCode: '"changed"',
      reason: "test"
    }], ["node", "-e", "process.exit(0)"]);

    expect(result.success).toBe(false);
    expect(await fs.readFile(file, "utf8")).toContain('"same"');
  });

  it("プロジェクト外への変更を拒否", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "poipoi-evolution-"));

    const engine = new CodeEvolutionEngine(root);
    const result = await engine.apply([{
      filePath: "../outside.ts",
      oldCode: "a",
      newCode: "b",
      reason: "test"
    }], ["node", "-e", "process.exit(0)"]);

    expect(result.success).toBe(false);
  });
});

