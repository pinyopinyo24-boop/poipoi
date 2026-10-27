import { Phase3ApprovalStore } from "./Phase3ApprovalStore";
import {
  executePhase3,
  type Phase3ExecutionOptions,
  type Phase3ExecutionResult
} from "./Phase3ExecutionService";

export interface Phase3AuthorizedOptions
  extends Phase3ExecutionOptions {
  approvalId: string;
}

export async function executeAuthorizedPhase3(
  options: Phase3AuthorizedOptions
): Promise<Phase3ExecutionResult> {
  const rejected = (error: string): Phase3ExecutionResult => ({
    success: false,
    committed: false,
    rolledBack: false,
    changedFiles: [],
    error
  });

  if (options.approved !== true) {
    return rejected("実行承認がありません");
  }

  if (!options.approvalId?.trim()) {
    return rejected("承認IDがありません");
  }

  const store = new Phase3ApprovalStore(options.root);

  let records;
  try {
    records = await store.load();
  } catch {
    return rejected("承認履歴を読み込めません");
  }

  const approval = records.find(
    record => record.id === options.approvalId
  );

  if (!approval) {
    return rejected("承認IDが登録されていません");
  }

  if (approval.status !== "approved") {
    return rejected("承認されていません");
  }

  const normalize = (value: string) =>
    value.replace(/\\/g, "/");

  if (
    normalize(approval.targetPath) !==
    normalize(options.targetPath)
  ) {
    return rejected("承認対象ファイルが一致しません");
  }

  return executePhase3(options);
}
