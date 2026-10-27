import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { CodeEvolutionEngine } from "./CodeEvolutionEngine";

describe("PoiPoi Phase 3 approval to commit", () => {
  async function fixture() {
    const root = await mkdtemp(path.join(tmpdir(), "poipoi-approval-"));
    const file = "server/core/Target.ts";
    const absolute = path.join(root, file);

    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, "export const value = 1;\n");

    const git = (...args: string[]) =>
      execFileSync("git", args, {
        cwd: root,
        encoding: "utf8",
        stdio: "pipe"
      }).trim();

    git("init");
    git("config", "user.name", "PoiPoi Test");
    git("config", "user.email", "poipoi-test@example.invalid");
    git("add", "--", file);
    git("commit", "-m", "initial");

    return { root, file, absolute, git };
  }

  async function execute(
    approved: boolean,
    failVerification = false
  ) {
    const f = await fixture();

    try {
      const before = f.git("rev-parse", "HEAD");

      if (!approved) {
        return {
          approved: false,
          committed: false,
          unchanged: before === f.git("rev-parse", "HEAD")
        };
      }

      const engine = new CodeEvolutionEngine(f.root);

      const result = await engine.apply(
        [{
          filePath: f.file,
          oldCode: "export const value = 1;",
          newCode: "export const value = 2;",
          reason: "approved Phase 3 test"
        }],
        [],
        async () => {
          const content = await readFile(f.absolute, "utf8");

          if (!content.includes("value = 2")) {
            throw new Error("検証失敗");
          }

          if (failVerification) {
            throw new Error("意図的な検証失敗");
          }
        }
      );

      if (!result.success) {
        return {
          approved: true,
          committed: false,
          unchanged: before === f.git("rev-parse", "HEAD"),
          restored: (await readFile(f.absolute, "utf8"))
            .includes("value = 1")
        };
      }

      f.git("add", "--", f.file);
      f.git("commit", "-m", "approved evolution");

      return {
        approved: true,
        committed: true,
        unchanged: before === f.git("rev-parse", "HEAD"),
        content: await readFile(f.absolute, "utf8"),
        committedFiles: f.git(
          "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"
        )
      };
    } finally {
      await rm(f.root, { recursive: true, force: true });
    }
  }

  it("YES承認で変更・検証・コミットする", async () => {
    const result = await execute(true);

    expect(result.committed).toBe(true);
    expect(result.unchanged).toBe(false);
    expect(result.content).toContain("value = 2");
    expect(result.committedFiles).toBe("server/core/Target.ts");
  });

  it("未承認なら変更もコミットもしない", async () => {
    const result = await execute(false);

    expect(result.approved).toBe(false);
    expect(result.committed).toBe(false);
    expect(result.unchanged).toBe(true);
  });

  it("検証失敗なら復元してコミットしない", async () => {
    const result = await execute(true, true);

    expect(result.committed).toBe(false);
    expect(result.unchanged).toBe(true);
    expect(result.restored).toBe(true);
  });
});