import { CodeEvolutionEngine, CodeChange } from "./CodeEvolutionEngine";
async function main(): Promise<void> {
  const request = process.argv.slice(2).join(" ").trim();
  if (!request) {
    console.error("使い方: pnpm poipoi:evolve 改善内容");
    process.exit(1);
  }
  console.log("🐾 ポイポイ自己進化");
  console.log("要求: " + request);
  const engine = new CodeEvolutionEngine(process.cwd());
  const changes: CodeChange[] = [];
  const result = await engine.apply(changes, ["pnpm", "exec", "tsc", "--noEmit"]);
  if (result.success) {
    console.log("✅ 自己進化エンジン正常");
    console.log("✅ TypeScriptチェック: OK");
  } else {
    console.error("❌ 自己進化失敗");
    console.error(result.error ?? "unknown error");
    process.exit(1);
  }
}
main().catch((error: unknown) => {
  console.error("❌ CLIエラー");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
