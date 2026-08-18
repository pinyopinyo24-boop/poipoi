import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);

function normalizeCommand(command: string): string {
  return process.platform === "win32" && command === "pnpm" ? "pnpm.cmd" : command;
}

export interface CodeChange {
  filePath: string;
  oldCode: string;
  newCode: string;
  reason: string;
}

export interface CodeEvolutionResult {
  success: boolean;
  changedFiles: string[];
  testsPassed: boolean;
  rolledBack: boolean;
  error?: string;
}

export class CodeEvolutionEngine {
  constructor(private readonly projectRoot: string = process.cwd()) {}

  async apply(changes: CodeChange[], testCommand: string[] = ["pnpm", "exec", "tsc", "--noEmit"]): Promise<CodeEvolutionResult> {
    const backups = new Map<string, string>();

    try {
      for (const change of changes) {
        const filePath = this.resolveSafePath(change.filePath);
        backups.set(filePath, await fs.readFile(filePath, "utf8"));
      }

      for (const change of changes) {
        const filePath = this.resolveSafePath(change.filePath);
        const current = await fs.readFile(filePath, "utf8");
        const count = current.split(change.oldCode).length - 1;

        if (count === 0) {
          throw new Error("変更対象コードが見つかりません: " + change.filePath);
        }

        if (count > 1) {
          throw new Error("変更対象コードが複数あります: " + change.filePath);
        }

        await fs.writeFile(filePath, current.replace(change.oldCode, change.newCode), "utf8");
      }

      await execFileAsync(process.platform === "win32" ? "cmd.exe" : normalizeCommand(testCommand[0]), process.platform === "win32" ? (testCommand[0].toLowerCase() === "cmd.exe" ? testCommand.slice(1) : ["/c", normalizeCommand(testCommand[0]), ...testCommand.slice(1)]) : testCommand.slice(1), {
        cwd: this.projectRoot,
        maxBuffer: 20 * 1024 * 1024,
      });

      return {
        success: true,
        changedFiles: changes.map(function (change) { return change.filePath; }),
        testsPassed: true,
        rolledBack: false,
      };
    } catch (error) {
      for (const filePath of Array.from(backups.keys())) {
        const original = backups.get(filePath)!;
        await fs.writeFile(filePath, original, "utf8");
      }

      return {
        success: false,
        changedFiles: changes.map(function (change) { return change.filePath; }),
        testsPassed: false,
        rolledBack: backups.size > 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private resolveSafePath(filePath: string): string {
    const root = path.resolve(this.projectRoot);
    const absolutePath = path.resolve(root, filePath);

    if (absolutePath !== root && !absolutePath.startsWith(root + path.sep)) {
      throw new Error("プロジェクト外への変更は禁止されています: " + filePath);
    }

    return absolutePath;
  }
}










