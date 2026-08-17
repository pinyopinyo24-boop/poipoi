import { CodeEvolutionEngine, CodeChange } from "./CodeEvolutionEngine";

async function main() {
  const request = process.argv.slice(2).join(" ").trim();

  if (!request) {
    console.error('使い方: pnpm poipoi:evolve "改善内容"');
    process.exit(1);
  }

  console.log("🐾 ポイポイ自己進化");
  console.log(`要求: ${request}`);

  const engine = new CodeEvolutionEngine(process.cwd());

  const changes: CodeChange[] = [{
    filePath: "server/core/PoipoiEvolutionTestTarget.ts",
    oldCode: 'export const POIPOI_EVOLUTION_TEST = "before";',
    newCode: 'export const POIPOI_EVOLUTION_TEST = "after";',
    reason: request
  }];

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

  console.log("✅ コード変更成功");
  console.log("変更ファイル:", result.changedFiles.join(", "));
  console.log("ロールバック:", result.rolledBack ? "実行" : "なし");
  console.log("✅ TypeScriptチェック: OK");
}

main().catch((error: unknown) => {
  console.error("❌ CLIエラー");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
