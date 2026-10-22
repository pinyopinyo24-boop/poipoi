import { CodeEvolutionEngine } from "./CodeEvolutionEngine";
import type { CodeChange } from "./CodeEvolutionEngine";

export interface Phase3ExecutionOptions {
  root: string;
  approved: boolean;
  targetPath: string;
  changes: CodeChange[];
  verify: () => Promise<void> | void;
  beforeApply?: (files: string[]) => Promise<void> | void;
  beforeCommit?: (files: string[]) => Promise<void> | void;
  commit?: (files: string[]) => Promise<void> | void;
}

export interface Phase3ExecutionResult {
  commitStatus?: "not_started" | "completed" | "failed";
  success: boolean;
  committed: boolean;
  rolledBack: boolean;
  changedFiles: string[];
  error?: string;
}

export async function executePhase3(
  options: Phase3ExecutionOptions
): Promise<Phase3ExecutionResult> {
  const rejected = (error: string): Phase3ExecutionResult => ({
    success: false,
    committed: false,
    rolledBack: false,
    changedFiles: [],
    error
  });

  if (typeof options.verify !== "function") {
    return rejected("検証処理が設定されていません");
  }

  if (typeof options.commit !== "function") {
    return rejected("コミット処理が設定されていません");
  }

  if (typeof options.beforeApply !== "function") {
    return rejected("変更前の安全検証が設定されていません");
  }

  if (typeof options.beforeCommit !== "function") {
    return rejected("コミット前の安全検証が設定されていません");
  }
  if (!options.approved) {
    return rejected("YES承認されていません");
  }

  const normalize = (value: string): string =>
    value.replace(/\\/g, "/");

  const target = normalize(options.targetPath);
  const files = [...new Set(options.changes.map(
    change => normalize(change.filePath)
  ))];

  if (
    !target ||
    target.startsWith("/") ||
    /^[A-Za-z]:/.test(target) ||
    target.split("/").includes("..") ||
    target.includes("\0") ||
    files.length !== 1 ||
    files[0] !== target
  ) {
    return rejected("承認対象以外の変更は禁止されています");
  }

  if (options.changes.length === 0) {
    return rejected("変更案がありません");
  }

  // 変更適用前の検証
  try {
    await options.beforeApply?.(files);
  } catch (error) {
    return rejected(String(error));
  }

  const engine = new CodeEvolutionEngine(options.root);

  // 検証失敗時の復元はエンジンが担当する
  const result = await engine.apply(
    options.changes,
    [],
    async () => {
      await options.verify();
      await options.beforeCommit!(files);
    }
  );

  if (!result.success) {
    return {
      success: false,
      committed: false,
      rolledBack: result.rolledBack,
      changedFiles: result.changedFiles,
      error: "変更適用または検証に失敗しました"
    };
  }

  // Gitコミットは検証成功後に限る
  // コミット失敗時は作業ファイルを保持して停止
  try {
    if (!options.commit) {
      throw new Error("コミット処理が設定されていません");
    }

    // apply内で検証済み
    await options.commit(files);

    return {
      success: true,
      committed: true,
      rolledBack: false,
      changedFiles: files
    };
  } catch (error) {
    return {
      success: false,
      committed: false,
      rolledBack: false,
      changedFiles: files,
      error: String(error)
    };
  }
}