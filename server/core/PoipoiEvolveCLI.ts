import { CodeEvolutionEngine, CodeChange } from "./CodeEvolutionEngine";
import { LocalAIProvider } from "../_core/ai/providers/LocalAIProvider";

async function main() {
  const request = process.argv.slice(2).join(" ").trim();

  if (!request) {
    console.error('使い方: pnpm poipoi:evolve "改善内容"');
    process.exit(1);
  }

  console.log("🐾 ポイポイ自己進化");
  console.log(`要求: ${request}`);

  const ai = new LocalAIProvider();
  const response = await ai.invoke([
    {
      role: "system",
      content:
        'あなたはPoipoiのコード改善AIです。必ずJSON配列のみを返してください。形式: [{"filePath":"相対パス","oldCode":"現在のコード","newCode":"改善後のコード","reason":"理由"}]。説明文は禁止。プロジェクト外のファイルは禁止。'
    },
    {
      role: "user",
      content: request
    }
  ]);

  const jsonText = response.content.match(/\[[\s\S]*\]/)?.[0];

  if (!jsonText) {
    throw new Error("AIからCodeChange JSONを取得できませんでした");
  }

  const changes = JSON.parse(jsonText) as CodeChange[];

  if (!Array.isArray(changes) || changes.length === 0) {
    throw new Error("AIが有効なコード変更を生成しませんでした");
  }

  console.log(`AI生成変更数: ${changes.length}`);

  const engine = new CodeEvolutionEngine(process.cwd());
  const result = await engine.apply(
    changes,
    ["pnpm", "exec", "tsc", "--noEmit"]
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
