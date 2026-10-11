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

  git(["add", "--", ...expectedFiles]);

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

  git([
    "commit",
    "-m",
    "feat: apply safe poipoi self evolution",
  ]);
}

function assertGitSafe() {
  const status = git(["status", "--porcelain"]);

  const unexpectedChanges = status
    .split(/\r?\n/)
    .filter(Boolean)
    .filter(line => {
      const entry = line.trim();

      return ![
        "?? server/core/PoipoiEvolveCLI.ts.bak2",
        "?? server/core/PoipoiEvolveCLI.ts.bak3",
      ].includes(entry);
    });

  if (unexpectedChanges.length > 0) {
    throw new Error(
      "作業ツリーが汚れています。\n" +
      "先に現在の変更をcommit/stashしてください。\n\n" +
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
  return changes.map(item => {
    const filePath = item.filePath.replace(/\\/g, "/");
    const absolutePath = safePath(filePath);

    if (filePath !== targetPath) {
      throw new Error(
        `変更対象外のファイルです: ${filePath}`
      );
    }

    const code = fs.readFileSync(absolutePath, "utf8");
    const oldCode = item.oldCode.trim();
    const newCode = item.newCode.trim();

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

    if (!newCode) {
      throw new Error(`新しいコードが空です: ${filePath}`);
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

  const aiChanges = extractJson(aiText);

  if (
    aiChanges.some(
      change =>
        change.filePath.replace(/\\/g, "/") !== targetPath
    )
  ) {
    throw new Error(
      "AIが対象外ファイルを変更しようとしました"
    );
  }

  const changes = validateChanges(
    aiChanges,
    targetPath
  );

  if (changes.length > 10) {
    throw new Error("1回の自己進化で変更できる件数を超えています");
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

  console.log("================================");
  console.log("✅ 自己進化成功");
  console.log(`変更ファイル: ${result.changedFiles.join(", ")}`);
  console.log("================================");
  commitChanges(result.changedFiles);
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






