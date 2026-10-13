import * as fs from "node:fs/promises";
import fsSync from "fs";
import * as path from "node:path";

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
    const backups = new Map<string, Buffer>();
    const modified = new Set<string>();

    try {
      if (testCommand.length > 0) {
        throw new Error(
          "本番自己進化ではテスト自動実行は禁止されています"
        );
      }

      if (changes.length === 0) {
        throw new Error("変更候補がありません");
      }

      const prepared: Array<{
        change: CodeChange;
        filePath: string;
        current: string;
        hasBom: boolean;
      }> = [];
      const seenPaths = new Set<string>();

      // 書き込み前に全変更を検証する
      for (const change of changes) {
        if (!change.oldCode) {
          throw new Error("変更元コードが空です: " + change.filePath);
        }

        if (!change.newCode.trim()) {
          throw new Error("新しいコードが空です: " + change.filePath);
        }

        const filePath = this.resolveSafePath(change.filePath);
        const pathKey =
          process.platform === "win32"
            ? filePath.toLowerCase()
            : filePath;

        if (seenPaths.has(pathKey)) {
          throw new Error(
            "同じファイルへの重複変更は禁止されています: " +
              change.filePath
          );
        }
        seenPaths.add(pathKey);

        const originalBytes = await fs.readFile(filePath);
        backups.set(filePath, originalBytes);

        const hasBom =
          originalBytes.length >= 3 &&
          originalBytes[0] === 0xef &&
          originalBytes[1] === 0xbb &&
          originalBytes[2] === 0xbf;

        const current = originalBytes
          .subarray(hasBom ? 3 : 0)
          .toString("utf8");

        if (
          typeof change.oldCode !== "string" ||
          change.oldCode.length === 0 ||
          typeof change.newCode !== "string"
        ) {
          throw new Error(
            "変更候補のoldCodeまたはnewCodeが不正です: " + change.filePath
          );
        }

        if (change.oldCode === change.newCode) {
          throw new Error(
            "変更前後のコードが同一です: " + change.filePath
          );
        }

        const sourceCode = current.charCodeAt(0) === 0xfeff ? current.slice(1) : current;
        const sourceLineEnding = sourceCode.includes("\r\n")
          ? "\r\n"
          : "\n";
        const normalizedOldCode = change.oldCode
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n");
        const sourceCompatibleOldCode =
          sourceLineEnding === "\n"
            ? normalizedOldCode
            : normalizedOldCode.replace(/\n/g, "\r\n");
        const count =
          normalizedOldCode.length === 0
            ? 0
            : sourceCode.split(sourceCompatibleOldCode).length - 1;

        if (count === 0) {
          throw new Error(
            "変更対象コードが見つかりません: " + change.filePath
          );
        }

        if (count > 1) {
          throw new Error(
            "変更対象コードが複数あります: " + change.filePath
          );
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

        prepared.push({ change, filePath, current: sourceCode, hasBom });
      }

      // 検証済みの置換をファイルごとにまとめる
      const outputByPath = new Map<
        string,
        { content: string; hasBom: boolean }
      >();

      for (const item of prepared) {
        const previous = outputByPath.get(item.filePath);
        const currentContent = previous
          ? previous.content
          : item.current;

        const currentLineEnding = currentContent.includes("\r\n")
          ? "\r\n"
          : "\n";
        const normalizedOldCode = item.change.oldCode
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n");
        const normalizedNewCode = item.change.newCode
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n");
        const compatibleOldCode =
          currentLineEnding === "\n"
            ? normalizedOldCode
            : normalizedOldCode.replace(/\n/g, "\r\n");
        const compatibleNewCode =
          currentLineEnding === "\n"
            ? normalizedNewCode
            : normalizedNewCode.replace(/\n/g, "\r\n");
        const count =
          normalizedOldCode.length === 0
            ? 0
            : currentContent.split(compatibleOldCode).length - 1;

        if (count !== 1) {
          throw new Error(
            "連続置換の対象コードを一意に特定できません: " +
              item.change.filePath +
              "（検出数: " +
              count +
              "）"
          );
        }

        outputByPath.set(item.filePath, {
          content: currentContent.replace(
            compatibleOldCode,
            compatibleNewCode
          ),
          hasBom: item.hasBom,
        });
        const generatedContent = outputByPath.get(item.filePath)?.content;
        if (
          generatedContent !== undefined &&
          /;\s*;/.test(generatedContent)
        ) {
          throw new Error(`r`n            "生成コードに連続セミコロン（;;）を検出しました。変更を中止します。"`r`n          );`r`n        }
      }

      // 全置換をまとめた後、ファイルごとに一度だけ書き込む
      for (const [filePath, item] of outputByPath) {
        const content = Buffer.from(item.content, "utf8");
        const output = item.hasBom
          ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), content])
          : content;

        // 書き込み途中の失敗にも備えて先に復元対象へ登録
        modified.add(filePath);
        await fs.writeFile(filePath, output);
      }

      return {
        success: true,
        changedFiles: Array.from(
          new Set(prepared.map(item => item.change.filePath))
        ),
        testsPassed: false,
        rolledBack: false,
      };
    } catch (error) {
      const rollbackErrors: string[] = [];

      for (const filePath of modified) {
        const original = backups.get(filePath);
        if (!original) continue;

        try {
          await fs.writeFile(filePath, original);
        } catch (rollbackError) {
          rollbackErrors.push(
            filePath + ": " +
              (rollbackError instanceof Error
                ? rollbackError.message
                : String(rollbackError))
          );
        }
      }

      const message =
        error instanceof Error ? error.message : String(error);
      const finalError =
        rollbackErrors.length > 0
          ? message + "\n復元失敗:\n" + rollbackErrors.join("\n")
          : message;

      return {
        success: false,
        changedFiles: Array.from(modified),
        testsPassed: false,
        rolledBack: modified.size > 0 && rollbackErrors.length === 0,
        error: finalError,
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

    let realRoot: string;
    let realAbsolute: string;

    try {
      realRoot = fsSync.realpathSync(root);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `プロジェクトの実体パスを確認できません: ${root} / ${detail}`
      );
    }

    try {
      realAbsolute = fsSync.realpathSync(absolutePath);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `変更対象の実体パスを確認できません: ${filePath} / ${detail}`
      );
    }

    const relativePath = path.relative(realRoot, realAbsolute);

    if (
      relativePath === ".." ||
      relativePath.startsWith(".." + path.sep) ||
      path.isAbsolute(relativePath)
    ) {
      throw new Error(
        "実体パスがプロジェクト外です: " + filePath
      );
    }

    if (relativePath.length === 0) {
      throw new Error(
        "プロジェクトのルート自体は変更対象にできません: " + filePath
      );
    }

    let targetStat: fsSync.Stats;

    try {
      targetStat = fsSync.statSync(realAbsolute);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `変更対象の情報を取得できません: ${filePath} / ${detail}`
      );
    }

    if (!targetStat.isFile()) {
      throw new Error(
        "通常ファイル以外は変更できません: " + filePath
      );
    }

    return realAbsolute;
  }
}
