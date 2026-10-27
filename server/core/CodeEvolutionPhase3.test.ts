import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CodeEvolutionEngine } from "./CodeEvolutionEngine";

describe("PoiPoi Phase 3 integration", () => {
  async function fixture() {
    const root = await mkdtemp(path.join(tmpdir(), "poipoi-phase3-"));
    const relative = "server/core/Phase3Target.ts";
    const absolute = path.join(root, relative);

    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, "export const value = 1;\n");

    return { root, relative, absolute };
  }

  it("承認済み変更を適用して検証できる", async () => {
    const f = await fixture();

    try {
      const engine = new CodeEvolutionEngine(f.root);
      let verified = false;

      const result = await engine.apply(
        [{
          filePath: f.relative,
          oldCode: "export const value = 1;",
          newCode: "export const value = 2;",
          reason: "Phase 3 integration test"
        }],
        [],
        async () => {
          verified = true;
          expect(await readFile(f.absolute, "utf8"))
            .toContain("value = 2");
        }
      );

      expect(result.success).toBe(true);
      expect(verified).toBe(true);
      expect(await readFile(f.absolute, "utf8"))
        .toContain("value = 2");
    } finally {
      await rm(f.root, { recursive: true, force: true });
    }
  });

  it("検証失敗時は変更前の内容へ戻す", async () => {
    const f = await fixture();

    try {
      const original = await readFile(f.absolute, "utf8");
      const engine = new CodeEvolutionEngine(f.root);

      const result = await engine.apply(
        [{
          filePath: f.relative,
          oldCode: "export const value = 1;",
          newCode: "export const value = 3;",
          reason: "rollback test"
        }],
        [],
        async () => {
          throw new Error("verification failed");
        }
      );

      expect(result.success).toBe(false);
      expect(await readFile(f.absolute, "utf8")).toBe(original);
    } finally {
      await rm(f.root, { recursive: true, force: true });
    }
  });

  it("変更前の内容が一致しなければ適用しない", async () => {
    const f = await fixture();

    try {
      const original = await readFile(f.absolute, "utf8");
      const engine = new CodeEvolutionEngine(f.root);

      const result = await engine.apply(
        [{
          filePath: f.relative,
          oldCode: "export const value = 999;",
          newCode: "export const value = 4;",
          reason: "mismatch test"
        }],
        []
      );

      expect(result.success).toBe(false);
      expect(await readFile(f.absolute, "utf8")).toBe(original);
    } finally {
      await rm(f.root, { recursive: true, force: true });
    }
  });

  it("検証中の外部変更を検出して保護する", async () => {
    const f = await fixture();

    try {
      const engine = new CodeEvolutionEngine(f.root);

      const result = await engine.apply(
        [{
          filePath: f.relative,
          oldCode: "export const value = 1;",
          newCode: "export const value = 5;",
          reason: "concurrent modification test"
        }],
        [],
        async () => {
          await writeFile(f.absolute, "external change\n");
        }
      );

      expect(result.success).toBe(false);
      expect(await readFile(f.absolute, "utf8"))
        .toBe("external change\n");
    } finally {
      await rm(f.root, { recursive: true, force: true });
    }
  });
});