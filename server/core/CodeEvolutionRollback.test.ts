import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CodeEvolutionEngine } from "./CodeEvolutionEngine";

describe("CodeEvolutionEngine rollback", () => {
  it("検証後に外部変更を検出して保護する", async () => {
    const root = await mkdtemp(join(tmpdir(), "poipoi-postverify-"));
    const file = join(root, "sample.ts");
    const original = "export const value = 1;\n";
    const external = "export const value = 999;\n";

    try {
      await writeFile(file, original);

      const engine = new CodeEvolutionEngine(root);
      let verified = false;

      const result = await engine.apply(
        [{
          filePath: "sample.ts",
          oldCode: original,
          newCode: "export const value = 2;\n", reason: "rollback test",
        }],
        [],
        async () => {
          verified = true;
          await writeFile(file, external);
        }
      );

      expect(verified).toBe(true);
      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(false);
      expect(await readFile(file, "utf8")).toBe(external);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("検証中に外部変更されたファイルを上書き復元しない", async () => {
    const root = await mkdtemp(join(tmpdir(), "poipoi-external-"));
    const file = join(root, "sample.ts");
    const original = "export const value = 1;\n";
    const external = "export const value = 999;\n";

    try {
      await writeFile(file, original);

      const engine = new CodeEvolutionEngine(root);

      const result = await engine.apply(
        [{
          filePath: "sample.ts",
          oldCode: original,
          newCode: "export const value = 2;\n", reason: "rollback test",
        }],
        [],
        async () => {
          await writeFile(file, external);
          throw new Error("外部変更を検出するためのテスト");
        }
      );

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(false);
      expect(await readFile(file, "utf8")).toBe(external);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("元コード不一致なら変更を拒否する", async () => {
    const root = await mkdtemp(join(tmpdir(), "poipoi-mismatch-"));
    const file = join(root, "sample.ts");
    const original = "export const value = 1;\n";

    try {
      await writeFile(file, original);

      const engine = new CodeEvolutionEngine(root);
      let verified = false;

      const result = await engine.apply(
        [{
          filePath: "sample.ts",
          oldCode: "export const value = 999;\n",
          newCode: "export const value = 2;\n", reason: "rollback test",
        }],
        [],
        () => {
          verified = true;
        }
      );

      expect(result.success).toBe(false);
      expect(verified).toBe(false);
      expect(await readFile(file, "utf8")).toBe(original);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("検証成功時に変更内容を保持する", async () => {
    const root = await mkdtemp(join(tmpdir(), "poipoi-success-"));
    const file = join(root, "sample.ts");
    const original = "export const value = 1;\n";
    const updated = "export const value = 2;\n";

    try {
      await writeFile(file, original);

      const engine = new CodeEvolutionEngine(root);
      let verified = false;

      const result = await engine.apply(
        [{
          filePath: "sample.ts",
          oldCode: original,
          newCode: updated, reason: "rollback test",
        }],
        [],
        () => {
          verified = true;
        }
      );

      expect(verified).toBe(true);
      expect(result.success).toBe(true);
      expect(result.rolledBack).toBe(false);
      expect(await readFile(file, "utf8")).toBe(updated);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("検証失敗時に元ファイルを復元する", async () => {
    const root = await mkdtemp(join(tmpdir(), "poipoi-rollback-"));
    const file = join(root, "sample.ts");
    const original = "export const value = 1;\n";

    try {
      await writeFile(file, original);

      const engine = new CodeEvolutionEngine(root);

      const result = await engine.apply(
        [{
          filePath: "sample.ts",
          oldCode: original,
          newCode: "export const value = 2;\n", reason: "rollback test",
        }],
        [],
        () => {
          throw new Error("検証失敗テスト");
        }
      );

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
      expect(await readFile(file, "utf8")).toBe(original);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
