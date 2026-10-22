import { executePhase3 } from "./Phase3ExecutionService";
import type { CodeChange } from "./CodeEvolutionEngine";

export interface Phase3CLIAdapterOptions {
  root: string;
  approved: boolean;
  targetPath: string;
  changes: CodeChange[];
  validateBeforeApply: (files: string[]) => void | Promise<void>;
  validateBeforeCommit: (files: string[]) => void | Promise<void>;
  verify: () => void | Promise<void>;
  commit: (files: string[]) => void | Promise<void>;
}

export async function runPhase3CLIAdapter(
  options: Phase3CLIAdapterOptions
) {
  return executePhase3({
    root: options.root,
    approved: options.approved,
    targetPath: options.targetPath,
    changes: options.changes,
    beforeApply: options.validateBeforeApply,
    beforeCommit: options.validateBeforeCommit,
    verify: options.verify,
    commit: options.commit
  });
}