import { CodeEvolutionEngine, CodeChange } from "./CodeEvolutionEngine";
import { LocalAIProvider } from "../_core/ai/providers/LocalAIProvider";
import fs from "fs/promises";

type AIChange = {
  filePath: string;
  target: string;
  newCode: string;
  reason: string;
};

async function main() {
  const request = process.argv.slice(2).join(" ").trim();

  if (!request) {
    console.error('使い方: pnpm poipoi:evolve "改善内容"');
    process.exit(1);
  }

  console.log("🐾 ポイポイ自己進化");
  console.log(`要求: ${request}`);

  const targetMatch = request.match(/(server[\/\\][^\s]+?\.tsx?)/);

  if (!targetMatch) {
    throw new Error("対象ファイルを特定できません");
  }

  const targetPath = targetMatch[1].replace(/\\/g, "/");
  const currentCode = await fs.readFile(targetPath, "utf8");

  const ai = new LocalAIProvider();

  const response = await ai.invoke([
    {
      role: "system",
      content:
        'JSON配列だけを返してください。形式: [{"filePath":"相対パス","target":"変更対象の識別子","newCode":"変更後の完全なコード","reason":"理由"}]。oldCodeは絶対に返さないでください。'
    },
    {
      role: "user",
      content:
        "改善要求:\n" +
        request +
        "\n\n対象ファイル:\n" +
        targetPath +
        "\n\n現在コード:\n" +
        currentCode
    }
  ]);

  const json = response.content.match(/\[[\s\S]*\]/)?.[0];

  if (!json) {
    throw new Error("AIから変更JSONを取得できませんでした");
  }

  const aiChanges = JSON.parse(json) as AIChange[];
  const changes: CodeChange[] = [];

  for (const item of aiChanges) {
    const filePath = item.filePath.replace(/\\/g, "/");
    const code = await fs.readFile(filePath, "utf8");

    let target = item.target;

    if (filePath === targetPath) {
      const requested = request.match(/([A-Za-z_$][A-Za-z0-9_$]*)\s+を/);

      if (requested) {
        target = requested[1];
      }
    }

    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(target)) {
      throw new Error("安全な変更対象を特定できません: " + target);
    }

    const lines = code.split(/\r?\n/);
    const regex = new RegExp("\\b" + target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
    const matches = lines.filter((line) => regex.test(line));

    if (matches.length !== 1) {
      throw new Error(
        "変更対象を一意に特定できません: " +
        filePath +
        " / " +
        target
      );
    }

    changes.push({
      filePath,
      oldCode: matches[0],
      newCode: item.newCode,
      reason: item.reason
    });
  }

  const engine = new CodeEvolutionEngine(process.cwd());

  const result = await engine.apply(
    changes,
    ["cmd.exe", "/c", "pnpm check && pnpm exec vitest run server/core/PoipoiEvolutionTestTarget.test.ts"]
  );

  if (!result.success) {
    console.error("❌ 自己進化失敗");
    console.error(result.error);
    console.error("ロールバック:", result.rolledBack ? "実行済み" : "なし");
    process.exit(1);
  }

  console.log("✅ AI生成コード変更成功");
  console.log("変更ファイル:", result.changedFiles.join(", "));
  console.log("✅ TypeScriptチェック: OK");
}

main().catch((error: unknown) => {
  console.error("❌ CLIエラー");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
