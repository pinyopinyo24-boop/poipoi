import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { CodeEvolutionEngine, CodeChange } from "./CodeEvolutionEngine";
import { aiProviderManager } from "../ai/AIProviderManager";

type AIChange = {
  filePath: string;
  oldCode: string;
  newCode: string;
  reason: string;
};

const ROOT = process.cwd();

const FORBIDDEN = [
  ".env",
  ".env.local",
  ".env.production",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  ".git"
];

function safePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\.\/+/, "");
  const absolute = path.resolve(ROOT, normalized);

  if (!absolute.startsWith(ROOT + path.sep) && absolute !== ROOT) {
    throw new Error(`プロジェクト外のファイルは禁止: ${filePath}`);
  }

  if (!fs.existsSync(absolute)) {
    throw new Error(`変更対象ファイルが存在しません: ${filePath}`);
  }

  const realRoot = fs.realpathSync(ROOT);
  const realAbsolute = fs.realpathSync(absolute);

  if (
    !realAbsolute.startsWith(realRoot + path.sep) &&
    realAbsolute !== realRoot
  ) {
    throw new Error(`実体パスがプロジェクト外です: ${filePath}`);
  }

  if (
    FORBIDDEN.some(
      x =>
        normalized === x ||
        normalized.startsWith(x + "/")
    )
  ) {
    throw new Error(`変更禁止ファイルです: ${filePath}`);
  }

  return absolute;
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8"
  }).trim();
}

function commitChanges(changedFiles: string[]): void {
  const expectedFiles = [...new Set(changedFiles)].sort();

  if (expectedFiles.length === 0) {
    throw new Error("Gitに確定する変更がありません");
  }

  const existingStaged = git(["diff", "--cached", "--name-only"])
    .split(/\r?\n/)
    .filter(Boolean);

  if (existingStaged.length > 0) {
    throw new Error(
      "既存のステージ済み変更があります。誤コミット防止のため中止します。\n" +
      existingStaged.join("\n")
    );
  }

  git(['add', ...expectedFiles]);

  const stagedFiles = git(["diff", "--cached", "--name-only"])
    .split(/\r?\n/)
    .filter(Boolean);

  const actualFiles = [...new Set(stagedFiles)].sort();

  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    git(["reset", "--", ...expectedFiles]);
    throw new Error(
      "ステージ対象と変更対象が一致しません。コミットを中止しました。\n" +
      "予定: " + expectedFiles.join(", ") + "\n" +
      "実際: " + actualFiles.join(", ")
    );
  }

  try {
    git([
      "commit",
      "-m",
      "feat: apply safe poipoi self evolution",
    ]);
  } catch (commitError) {
    const commitMessage =
      commitError instanceof Error
        ? commitError.message
        : String(commitError);

    try {
      git([
        "restore",
        "--source=HEAD",
        "--staged",
        "--worktree",
        "--",
        ...expectedFiles,
      ]);
    } catch (restoreError) {
      const restoreMessage =
        restoreError instanceof Error
          ? restoreError.message
          : String(restoreError);

      throw new Error(
        "Gitコミットに失敗し、対象ファイルの復元にも失敗しました。\n" +
          "コミットエラー: " + commitMessage + "\n" +
          "復元エラー: " + restoreMessage
      );
    }

    throw new Error(
      "Gitコミットに失敗したため、対象ファイルをHEADの状態へ復元しました。\n" +
        commitMessage
    );
  }
}

function assertGitSafe() {
  const status = git(["status", "--porcelain"]);
  const unexpectedChanges = status
    .split(/\r?\n/)
    .filter(Boolean)
    .filter(line => line.slice(0, 2) !== "??");

  if (unexpectedChanges.length > 0) {
    throw new Error(
      "追跡対象に未コミット変更またはステージ済み変更があります。安全のため中止します。\n" +
      unexpectedChanges.join("\n")
    );
  }
}
function extractTarget(request: string): string {
  const match = request.match(
    /((?:server|src)[\/\\][^\s"'`]+?\.(?:ts|tsx|js|jsx))/
  );

  if (!match) {
    throw new Error(
      "対象ファイルを特定できません。\n" +
      "例: server/core/SelfEvolutionWorkflow.ts を改善する"
    );
  }

  return match[1].replace(/\\/g, "/");
}

function extractJson(text: string): AIChange[] {
  const candidates = [
    text.trim(),
    text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
  ];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);

      const normalize = (value: unknown, index: number): AIChange => {
        if (!value || typeof value !== "object") {
          throw new Error(`AI変更 #${index + 1} の形式が不正です`);
        }

        const item = value as Record<string, unknown>;

        if (
          typeof item.filePath !== "string" ||
          typeof item.oldCode !== "string" ||
          typeof item.newCode !== "string" ||
          typeof item.reason !== "string"
        ) {
          throw new Error(`AI変更 #${index + 1} の形式が不正です`);
        }

        return {
          filePath: item.filePath,
          oldCode: item.oldCode,
          newCode: item.newCode,
          reason: item.reason,
        };
      };

      if (Array.isArray(parsed)) {
        return parsed.map(normalize);
      }

      if (parsed && typeof parsed === "object") {
        const value = parsed as Record<string, unknown>;

        if (Array.isArray(value.changes)) {
          return value.changes.map(normalize);
        }

        return [normalize(value, 0)];
      }
    } catch {
      continue;
    }
  }

  throw new Error("AI応答に有効なJSON変更内容がありません");
}
async function invokeAI(messages: unknown[]): Promise<string> {
  const manager = aiProviderManager as {
    invoke?: (messages: unknown[]) => Promise<string>;
  };

  if (typeof manager.invoke !== "function") {
    throw new Error("AIProviderManager.invoke() が利用できません");
  }

  return await manager.invoke(messages);
}
function findRelevantTests(targetPath: string): string[] {
  const absoluteTarget = safePath(targetPath);
  const directory = path.dirname(absoluteTarget);
  const base = path.basename(
    absoluteTarget,
    path.extname(absoluteTarget)
  );

  const candidates = [
    path.join(directory, `${base}.test.ts`),
    path.join(directory, `${base}.test.tsx`),
    path.join(directory, `${base}.spec.ts`),
    path.join(directory, `${base}.spec.tsx`)
  ];

  return candidates.filter(file => fs.existsSync(file));
}
function validateChanges(
  changes: AIChange[],
  targetPath: string
): CodeChange[] {
  const seenTargets = new Set<string>();

  return changes.map(item => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("変更候補がオブジェクトではありません");
    }
    if (
      typeof item.filePath !== "string" ||
      typeof item.oldCode !== "string" ||
      typeof item.newCode !== "string" ||
      !item.filePath.trim() ||
      !item.oldCode.trim()
    ) {
      throw new Error("変更候補の必須項目が欠落しているか、型が不正です");
    }

    const filePath = item.filePath.replace(/\\/g, "/");
    const absolutePath = safePath(filePath);

    if (filePath !== targetPath) {
      throw new Error(
        `変更対象外のファイルです: ${filePath}`
      );
    }

    const code = fs.readFileSync(absolutePath, "utf8");
    const sourceLineEnding = code.includes("\r\n") ? "\r\n" : "\n";
    const normalizeLineEndings = (value: string): string =>
      value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const normalizedOldCode = normalizeLineEndings(item.oldCode);
    const normalizedNewCode = normalizeLineEndings(item.newCode);
    const oldCode =
      sourceLineEnding === "\n"
        ? normalizedOldCode
        : normalizedOldCode.replace(/\n/g, "\r\n");
    const newCode =
      sourceLineEnding === "\n"
        ? normalizedNewCode
        : normalizedNewCode.replace(/\n/g, "\r\n");
    const targetKey = JSON.stringify([filePath, oldCode]);

    if (seenTargets.has(targetKey)) {
      throw new Error(`同じ置換対象が重複しています: ${filePath}`);
    }

    seenTargets.add(targetKey);

    if (!oldCode) {
      throw new Error(`置換対象コードが空です: ${filePath}`);
    }

    const occurrences = code.split(oldCode).length - 1;

    if (occurrences !== 1) {
      throw new Error(
        `置換対象コードを一意に特定できません: ${filePath} / ${occurrences}件`
      );
    }

    if (newCode === oldCode) {
      throw new Error(`AI生成コードに変更がありません: ${filePath}`);
    }

    const forbiddenGeneratedPatterns = [
      "export const export const",
      "export default export default",
      "import import ",
      "class class ",
      "function function ",
      "interface interface ",
      "type type ",
      "const const ",
      "let let ",
      "var var ",
    ];

    if (forbiddenGeneratedPatterns.some(pattern => newCode.includes(pattern))) {
      throw new Error(
        `AI生成コードに不正な重複構文があります: ${filePath}`
      );
    }



    if (
      newCode.includes("process.env.") ||
      newCode.includes("API_KEY") ||
      newCode.includes("SECRET")
    ) {
      throw new Error(
        `秘密情報を含む可能性がある変更を拒否しました: ${filePath}`
      );
    }

    return {
      filePath,
      oldCode,
      newCode,
      reason: item.reason
    };
  });
}
async function main() {
  const request = process.argv.slice(2).join(" ").trim();

  if (!request) {
    console.error(
      '使い方: pnpm poipoi:evolve "改善内容"'
    );
    process.exit(1);
  }

  assertGitSafe();
  console.log("🐾 ポイポイ自己進化");
  console.log(`要求: ${request}`);

  // 変更前のGit状態を保護
  const targetPath = extractTarget(request);
  const absoluteTarget = safePath(targetPath);

  console.log(`対象: ${targetPath}`);

  const currentCode = fs.readFileSync(
    absoluteTarget,
    "utf8"
  );

  if (!currentCode.trim()) {
    throw new Error("対象ファイルが空です");
  }
  const messages: { role: string; content: string }[] = [
    {
      role: "system",
      content:
        [
          "あなたはPoipoiの安全なコード改善AIです。",
          "必ずJSON配列だけを返してください。",
          "",
          "形式:",
          '[{"filePath":"相対パス","oldCode":"現在コードから完全一致する置換対象","newCode":"置換後コード","reason":"理由"}]',
          "",
          "ルール:",
          "1. filePathは対象ファイルと同じものだけを返す",
          "2. oldCodeは現在コードから完全コピーする",
          "3. oldCodeは必ず現在コード内に存在する文字列にする",
          "4. newCodeはoldCodeを置換する完全なコードにする",
          "5. oldCodeの前後を勝手に変更しない",
          "6. 変更は安全で小さなものを1件だけ提案する",
          "7. 説明文、Markdown、コードフェンスは禁止",
          "8. 必ずJSON配列だけを返す"
        ].join("\n")
    },
    {
      role: "user",
      content:
        [
          `改善要求:\n${request}`,
          `対象ファイル:\n${targetPath}`,
          `現在コード:\n${currentCode}`
        ].join("\n\n")
    }
  ];
  let aiText = "";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`AI生成: ${attempt}/3`);
      aiText = await invokeAI(messages);
      break;
    } catch (error) {
      if (attempt === 3) {
        throw new Error(
          "AI Provider呼び出しに3回失敗しました: " +
          (error instanceof Error ? error.message : String(error))
        );
      }

      await new Promise(resolve =>
        setTimeout(resolve, 1000 * attempt)
      );
    }
  }

  let changes: ReturnType<typeof validateChanges> = [];
  let validationError = "";

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const aiChanges = extractJson(aiText);

      if (!Array.isArray(aiChanges) || aiChanges.length === 0) {
        throw new Error("AIの変更候補が空、または配列ではありません");
      }
      if (aiChanges.length > 10) {
        throw new Error("AIの変更候補が10件を超えています");
      }

      for (const change of aiChanges) {
        if (
          change === null ||
          typeof change !== "object" ||
          Array.isArray(change) ||
          typeof change.filePath !== "string" ||
          change.filePath.replace(/\\/g, "/") !== targetPath
        ) {
          throw new Error("AIが対象外ファイルまたは不正な変更候補を返しました");
        }

        if (
          typeof change.oldCode !== "string" ||
          change.oldCode.length === 0 ||
          typeof change.newCode !== "string" ||
          change.newCode.trim().length === 0
        ) {
          throw new Error("oldCodeまたはnewCodeが不正です");
        }

        const normalizedOldCode = change.oldCode
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n");
        const sourceLineEnding = currentCode.includes("\r\n") ? "\r\n" : "\n";
        const sourceCompatibleOldCode =
          sourceLineEnding === "\n"
            ? normalizedOldCode
            : normalizedOldCode.replace(/\n/g, "\r\n");
        const occurrences =
          normalizedOldCode.length === 0
            ? 0
            : currentCode.split(sourceCompatibleOldCode).length - 1;
        if (occurrences !== 1) {
          throw new Error(
            `oldCodeが現在コード内に一意に存在しません（出現回数: ${occurrences}）`
          );
        }
      }

      changes = validateChanges(aiChanges, targetPath);
      if (changes.length === 0) {
        throw new Error("変更候補が0件です");
      }

      validationError = "";
      break;
    } catch (error) {
      validationError =
        error instanceof Error ? error.message : String(error);

      if (attempt === 3) {
        throw new Error(
          "AI生成コードの検証に3回失敗しました。変更は適用していません: " +
          validationError
        );
      }

      console.warn(`変更候補の検証失敗: ${attempt}/3。AIに再生成を要求します。`);

      messages.push(
        { role: "assistant", content: aiText },
        {
          role: "user",
          content:
            "直前の変更候補は検証に失敗しました。\n" +
            "失敗理由: " + validationError + "\n\n" +
            "対象ファイル: " + targetPath + "\n\n" +
            "以下が対象ファイルの現在コードです。\n" +
            "oldCodeには、次のコードから連続した文字列を一字一句そのままコピーしてください。\n" +
            "空白、改行、インデントも一致させ、現在コード内に1回だけ存在する範囲を選んでください。\n" +
            "変更は安全な最小限のものを1件だけ提案してください。\n" +
            "filePathは対象ファイルと同じ値にしてください。\n" +
            "JSON配列だけを返し、説明文やMarkdownは付けないでください。\n\n" +
            "現在コード:\n" + currentCode
        }
      );

      aiText = await invokeAI(messages);
    }
  }
  console.log(`変更候補: ${changes.length}件`);

  const engine = new CodeEvolutionEngine(ROOT);

  const result = await engine.apply(
    changes,
  );

  if (!result.success) {
    console.error("❌ 自己進化失敗");
    console.error(result.error);
    console.error(
      "ロールバック:",
      result.rolledBack ? "実行済み" : "失敗/なし"
    );
    process.exit(1);
  }

  if (result.changedFiles.length === 0) {
    throw new Error("自己進化成功と判定されましたが変更ファイルがありません");
  }

  const expectedTarget = targetPath.replace(/\\/g, "/");
  const unexpectedResultFiles = result.changedFiles.filter(
    filePath => filePath.replace(/\\/g, "/") !== expectedTarget
  );

  if (unexpectedResultFiles.length > 0) {
    throw new Error(
      "自己進化エンジンが対象外ファイルを返しました。コミットを中止します。\n" +
      unexpectedResultFiles.join("\n")
    );
  }
  const afterStatus = git([
    "status",
    "--porcelain",
    "--",
    ...result.changedFiles,
  ]);

  if (!afterStatus) {
    throw new Error(
      "自己進化成功と判定されましたが変更対象ファイルにGit差分がありません"
    );
  }

  // Gitへの確定が成功してから、自己進化成功を表示する
  commitChanges(result.changedFiles);

  console.log("================================");
  console.log("✅ 自己進化成功（Gitコミット完了）");
  console.log(`変更ファイル: ${result.changedFiles.join(", ")}`);
  console.log("================================");
}

main().catch((error: unknown) => {
  console.error("❌ CLIエラー");
  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  );
  process.exit(1);
});


