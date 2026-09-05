import fs from "fs/promises";
import path from "path";

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

  async apply(
    changes: CodeChange[],
    testCommand: string[] = []
  ): Promise<CodeEvolutionResult> {
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

        if (
          change.newCode.includes("export const export const") ||
          change.newCode.includes("export default export default") ||
          change.newCode.includes("import import ") ||
          change.newCode.includes("class class ") ||
          change.newCode.includes("function function ")
        ) {
          throw new Error(
            "AI生成コードに不正な重複構文があります: " + change.filePath
          );
        }

        if (!change.newCode.trim()) {
          throw new Error("新しいコードが空です: " + change.filePath);
        }

        await fs.writeFile(
          filePath,
          current.replace(change.oldCode, change.newCode),
          "utf8"
        );
      }

      // 本番自己進化ではテストを自動実行しない
      if (testCommand.length > 0) {
        throw new Error(
          "本番自己進化ではテスト自動実行は禁止されています"
        );
      }

      return {
        success: true,
        changedFiles: changes.map(change => change.filePath),
        testsPassed: false,
        rolledBack: false,
      };
    } catch (error) {
      for (const filePath of Array.from(backups.keys())) {
        const original = backups.get(filePath)!;
        await fs.writeFile(filePath, original, "utf8");
      }

      return {
        success: false,
        changedFiles: changes.map(change => change.filePath),
        testsPassed: false,
        rolledBack: backups.size > 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private resolveSafePath(filePath: string): string {
    const root = path.resolve(this.projectRoot);
    const absolutePath = path.resolve(root, filePath);

    if (
      absolutePath !== root &&
      !absolutePath.startsWith(root + path.sep)
    ) {
      throw new Error(
        "プロジェクト外への変更は禁止されています: " + filePath
      );
    }

    return absolutePath;
  }
}
