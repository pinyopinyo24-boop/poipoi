import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { CodeEvolutionEngine, CodeChange } from "./CodeEvolutionEngine";
import { aiProviderManager } from "../ai/AIProviderManager";

type AIChange = {
  filePath: string;
  target: string;
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

function assertGitSafe() {
  const status = git(["status", "--porcelain"]);

  if (status) {
    throw new Error(
      "作業ツリーが汚れています。\n" +
      "先に現在の変更をcommit/stashしてください。\n\n" +
      status
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
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("[");
  if (start < 0) {
    throw new Error("AI応答にJSON配列がありません");
  }

  let end = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "[") {
      depth++;
    } else if (ch === "]") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  if (end < 0) {
    throw new Error("AI応答のJSON配列が不完全です");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned.slice(start, end));
  } catch (error) {
    throw new Error(
      `AI応答のJSON解析に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error("AI応答がJSON配列ではありません");
  }

  if (parsed.length === 0) {
    throw new Error("AI変更内容が空です");
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`AI変更 #${index + 1} が不正です`);
    }

    const value = item as Record<string, unknown>;

    if (
      typeof value.filePath !== "string" ||
      typeof value.target !== "string" ||
      typeof value.newCode !== "string" ||
      typeof value.reason !== "string"
    ) {
      throw new Error(`AI変更 #${index + 1} の形式が不正です`);
    }

    return {
      filePath: value.filePath,
      target: value.target,
      newCode: value.newCode,
      reason: value.reason,
    };
  });
}
async function invokeAI(messages: unknown[]): Promise<string> {
  const manager = aiProviderManager as {
    invoke?: (messages: unknown[]) => Promise<string>;
  };

  if (typeof manager.invoke !== "function") {
    throw new Error("AIProviderManager.invoke() が利用できません");
  }

  const jsonInstruction = {
    role: "system",
    content:
      '必ず有効なJSON配列だけを返してください。説明文、Markdown、```は禁止です。必ず1件以上返してください。形式: [{"filePath":"対象ファイル","target":"識別子","newCode":"置換後コード","reason":"理由"}]'
  };

  return await manager.invoke([
    jsonInstruction,
    ...(messages as any[])
  ]);
}
function findRelevantTests(targetPath: string): string[] {
  const directory = path.dirname(targetPath);
  const base = path.basename(
    targetPath,
    path.extname(targetPath)
  );

  const candidates = [
    path.join(directory, `${base}.test.ts`),
    path.join(directory, `${base}.test.tsx`),
    path.join(directory, `${base}.spec.ts`),
    path.join(directory, `${base}.spec.tsx`)
  ];

  return candidates.filter(file => {
    try {
      fs.accessSync(file);
      return true;
    } catch {
      return false;
    }
  });
}

function validateChanges(
  changes: AIChange[],
  targetPath: string
): CodeChange[] {
  return changes.map(item => {
    const filePath = item.filePath.replace(/\\/g, "/");

    safePath(filePath);

    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(item.target)) {
      throw new Error(
        `安全な識別子ではありません: ${item.target}`
      );
    }

    const code = fs.readFileSync(
      safePath(filePath),
      "utf8"
    );

    const escaped = item.target.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(
      `\\b${escaped}\\b`
    );

    const matches = code
      .split(/\r?\n/)
      .filter((line: string) => regex.test(line));

    if (matches.length !== 1) {
      throw new Error(
        `変更対象を一意に特定できません: ${filePath} / ${item.target} / ${matches.length}件`
      );
    }

    if (!item.newCode.trim()) {
      throw new Error(
        `新しいコードが空です: ${filePath}`
      );
    }

    if (item.newCode.includes("process.env.") ||
        item.newCode.includes("API_KEY") ||
        item.newCode.includes("SECRET")) {
      throw new Error(
        `秘密情報を含む可能性がある変更を拒否しました: ${filePath}`
      );
    }

    return {
      filePath,
      oldCode: matches[0],
      newCode: item.newCode,
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
  assertGitSafe();

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

  const tests = findRelevantTests(targetPath);

  console.log(
    tests.length
      ? `テスト: ${tests.join(", ")}`
      : "テスト: 対応テスト未検出"
  );

  const testCommand = tests.length
    ? [
        "cmd.exe",
        "/c",
        `pnpm check && pnpm exec vitest run ${tests
          .map(x => `"${path.relative(ROOT, x)}"`)
          .join(" ")}`
      ]
    : [
        "cmd.exe",
        "/c",
        "pnpm check"
      ];

  const messages = [
    {
      role: "system",
      content:
        [
          "あなたはPoipoiの安全なコード改善AIです。",
          "必ずJSON配列だけを返してください。",
          "",
          "形式:",
          '[{"filePath":"相対パス","target":"一意な識別子","newCode":"変更後コード","reason":"理由"}]',
          "",
          "ルール:",
          "1. 対象ファイル以外を勝手に変更しない",
          "2. .env、秘密情報、lockfileを変更しない",
          "3. targetは単一のTypeScript識別子",
          "4. newCodeは対象行を置換できる完全な1行",
          "5. oldCodeは返さない",
          "6. 必ず1件以上の具体的な改善案を返す。空配列 [] は絶対に返さない", "7. 改善が難しい場合でも、対象ファイル内の安全で小さな改善を1件以上提案する", "8. 出力は必ずJSON配列だけにする。説明文、Markdown、コードフェンスは禁止"
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

  console.log("AI_RAW_RESPONSE:", JSON.stringify(aiText));
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
    testCommand
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

  const afterStatus = git(["status", "--porcelain"]);

  if (!afterStatus) {
    throw new Error(
      "自己進化成功と判定されましたがGit差分がありません"
    );
  }

  console.log("================================");
  console.log("✅ 自己進化成功");
  console.log(`変更ファイル: ${result.changedFiles.join(", ")}`);
  console.log("✅ TypeScriptチェック: OK");
  console.log("✅ テスト: OK");
  console.log("================================");
  console.log("※ Git commitは自動実行していません");
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


