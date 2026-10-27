import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { executePhase3 } from "./Phase3ExecutionService";

describe("PoiPoi Phase 3 execution safety", () => {
  async function setup() {
    const root = await mkdtemp(path.join(tmpdir(), "poipoi-p3-"));
    const file = "server/core/Target.ts";
    const absolute = path.join(root, file);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, "export const value = 1;\n");
    return { root, file, absolute };
  }

  async function run(
    approved: boolean,
    failure: "none" | "before" | "verify" | "commit" = "none"
  ) {
    const f = await setup();
    let committed = false;

    try {
      const result = await executePhase3({
        root: f.root,
        approved,
        targetPath: f.file,
        changes: [{
          filePath: f.file,
          oldCode: "export const value = 1;",
          newCode: "export const value = 2;",
          reason: "Phase 3 safety test"
        }],
        beforeApply: () => {
          if (failure === "before") throw new Error("beforeApply failed");
        },
        verify: () => {
          if (failure === "verify") throw new Error("verify failed");
        },
        beforeCommit: () => {
          if (failure === "commit") throw new Error("beforeCommit failed");
        },
        commit: () => {
          committed = true;
        }
      });

      return {
        result,
        committed,
        content: await readFile(f.absolute, "utf8")
      };
    } finally {
      await rm(f.root, { recursive: true, force: true });
    }
  }

  it("YES承認で変更・検証・コミットする", async () => {
    const x = await run(true);
    expect(x.result.success).toBe(true);
    expect(x.committed).toBe(true);
    expect(x.content).toContain("value = 2");
  });

  it("未承認なら変更しない", async () => {
    const x = await run(false);
    expect(x.result.success).toBe(false);
    expect(x.committed).toBe(false);
    expect(x.content).toContain("value = 1");
  });

  it("変更前検証失敗なら変更しない", async () => {
    const x = await run(true, "before");
    expect(x.result.success).toBe(false);
    expect(x.committed).toBe(false);
    expect(x.content).toContain("value = 1");
  });

  it("検証失敗ならロールバックする", async () => {
    const x = await run(true, "verify");
    expect(x.result.success).toBe(false);
    expect(x.committed).toBe(false);
    expect(x.content).toContain("value = 1");
  });

  it("コミット前検証失敗ならコミットしない", async () => {
    const x = await run(true, "commit");
    expect(x.result.success).toBe(false);
    expect(x.committed).toBe(false);
    expect(x.content).toContain("value = 1");
  });
});