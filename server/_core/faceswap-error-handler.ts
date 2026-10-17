/**
 * エラーハンドリング・リカバリーモジュール
 * 顔入れ替え処理のエラー処理と復旧機能
 */

import * as fs from "fs";
import * as path from "path";

interface ErrorContext {
  operation: string;
  timestamp: number;
  userId?: string;
  details?: Record<string, unknown>;
}

interface ErrorRecoveryStrategy {
  name: string;
  condition: (error: Error) => boolean;
  recovery: () => Promise<void>;
  maxRetries: number;
}

interface ErrorReport {
  errorId: string;
  timestamp: number;
  operation: string;
  errorMessage: string;
  stackTrace: string;
  context: ErrorContext;
  recovered: boolean;
  recoveryMethod?: string;
}

const errorReports: ErrorReport[] = [];
const cacheClearers = new Set<() => void | Promise<void>>();
const operationCancellers = new Map<string, Set<() => void | Promise<void>>>();
const networkChecks = new Set<() => Promise<boolean>>();
const modelReloaders = new Map<string, () => Promise<void>>();

export function registerCacheClearer(clearer: () => void | Promise<void>): () => void {
  cacheClearers.add(clearer);
  return () => cacheClearers.delete(clearer);
}

export function registerOperationCanceller(operation: string, cancel: () => void | Promise<void>): () => void {
  const cancellers = operationCancellers.get(operation) ?? new Set();
  cancellers.add(cancel);
  operationCancellers.set(operation, cancellers);
  return () => {
    cancellers.delete(cancel);
    if (cancellers.size === 0) operationCancellers.delete(operation);
  };
}

export function registerNetworkCheck(check: () => Promise<boolean>): () => void {
  networkChecks.add(check);
  return () => networkChecks.delete(check);
}

export function registerModelReloader(modelName: string, reload: () => Promise<void>): () => void {
  modelReloaders.set(modelName, reload);
  return () => {
    if (modelReloaders.get(modelName) === reload) modelReloaders.delete(modelName);
  };
}

/**
 * エラーを記録
 */
export function logError(context: ErrorContext, error: Error): ErrorReport {
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const report: ErrorReport = {
    errorId,
    timestamp: Date.now(),
    operation: context.operation,
    errorMessage: error.message,
    stackTrace: error.stack || "",
    context,
    recovered: false,
  };

  errorReports.push(report);
  if (errorReports.length > 1000) errorReports.splice(0, errorReports.length - 1000);

  console.error(`[ErrorHandler] エラーを記録しました: ${errorId}`);
  console.error(`  操作: ${context.operation}`);
  console.error(`  メッセージ: ${error.message}`);

  return report;
}

/**
 * メモリ不足エラーを処理
 */
export async function handleOutOfMemoryError(): Promise<void> {
  console.log("[ErrorHandler] メモリ不足エラーを処理中...");

  try {
    // ガベージコレクションを実行
    if (global.gc) {
      global.gc();
    }

    await Promise.all(Array.from(cacheClearers, (clear) => clear()));

    console.log("[ErrorHandler] メモリ解放完了");
  } catch (error) {
    console.error("[ErrorHandler] メモリ解放エラー:", error);
    throw error;
  }
}

/**
 * タイムアウトエラーを処理
 */
export async function handleTimeoutError(operation: string): Promise<void> {
  console.log(`[ErrorHandler] タイムアウトエラーを処理中: ${operation}`);

  try {
    const cancellers = operationCancellers.get(operation);
    if (!cancellers?.size) {
      console.warn(`[ErrorHandler] キャンセル対象の処理が登録されていません: ${operation}`);
    } else {
      await Promise.all(Array.from(cancellers, (cancel) => cancel()));
      operationCancellers.delete(operation);
    }

    console.log("[ErrorHandler] タイムアウト処理完了");
  } catch (error) {
    console.error("[ErrorHandler] タイムアウト処理エラー:", error);
    throw error;
  }
}

/**
 * ネットワークエラーを処理
 */
export async function handleNetworkError(retryCount: number = 3): Promise<void> {
  console.log(`[ErrorHandler] ネットワークエラーを処理中 (リトライ: ${retryCount})...`);

  if (networkChecks.size === 0) {
    throw new Error("ネットワーク接続確認処理が登録されていません");
  }

  const attempts = Math.max(1, Math.trunc(retryCount));
  for (let i = 0; i < attempts; i++) {
    try {
      // リトライ待機
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));

      console.log(`[ErrorHandler] リトライ ${i + 1}/${retryCount}`);

      const connected = await Promise.all(Array.from(networkChecks, (check) => check()));
      if (!connected.some(Boolean)) throw new Error("ネットワーク接続を確認できませんでした");

      console.log("[ErrorHandler] ネットワーク復旧完了");
      return;
    } catch (error) {
      if (i === attempts - 1) {
        console.error("[ErrorHandler] ネットワーク復旧失敗:", error);
        throw error;
      }
    }
  }
}

/**
 * ファイルアクセスエラーを処理
 */
export async function handleFileAccessError(filePath: string): Promise<void> {
  console.log(`[ErrorHandler] ファイルアクセスエラーを処理中: ${filePath}`);

  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
    const file = await fs.promises.stat(filePath);
    if (!file.isFile()) throw new Error("指定されたパスはファイルではありません");

    console.log("[ErrorHandler] ファイルアクセス処理完了");
  } catch (error) {
    console.error("[ErrorHandler] ファイルアクセス処理エラー:", error);
    throw error;
  }
}

/**
 * 無効な入力エラーを処理
 */
export function handleInvalidInputError(inputType: string, value: unknown): Error {
  console.log(`[ErrorHandler] 無効な入力エラーを処理中: ${inputType}`);

  const error = new Error(`無効な入力: ${inputType} = ${JSON.stringify(value)}`);
  return error;
}

/**
 * モデルロードエラーを処理
 */
export async function handleModelLoadError(modelName: string, retryCount: number = 3): Promise<void> {
  console.log(`[ErrorHandler] モデルロードエラーを処理中: ${modelName}`);

  const reload = modelReloaders.get(modelName);
  if (!reload) throw new Error(`モデル再ロード処理が登録されていません: ${modelName}`);
  const attempts = Math.max(1, Math.trunc(retryCount));

  for (let i = 0; i < attempts; i++) {
    try {
      await reload();

      console.log(`[ErrorHandler] モデル再ロード成功: ${modelName}`);
      return;
    } catch (error) {
      if (i === attempts - 1) {
        console.error(`[ErrorHandler] モデルロード失敗: ${modelName}`, error);
        throw error;
      }

      // リトライ待機
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

/**
 * 処理エラーを処理
 */
export async function handleProcessingError(
  operation: string,
  error: Error,
  recoveryStrategies: ErrorRecoveryStrategy[] = []
): Promise<boolean> {
  console.log(`[ErrorHandler] 処理エラーを処理中: ${operation}`);

  for (const strategy of recoveryStrategies) {
    if (strategy.condition(error)) {
      console.log(`[ErrorHandler] 復旧戦略を適用中: ${strategy.name}`);

      for (let i = 0; i < strategy.maxRetries; i++) {
        try {
          await strategy.recovery();
          console.log(`[ErrorHandler] 復旧成功: ${strategy.name}`);
          return true;
        } catch (recoveryError) {
          if (i === strategy.maxRetries - 1) {
            console.error(`[ErrorHandler] 復旧失敗: ${strategy.name}`, recoveryError);
          }
        }
      }
    }
  }

  return false;
}

/**
 * エラーレポートを取得
 */
export function getErrorReports(limit: number = 100): ErrorReport[] {
  return errorReports.slice(-limit);
}

/**
 * エラーレポートをクリア
 */
export function clearErrorReports(): void {
  errorReports.length = 0;
  console.log("[ErrorHandler] エラーレポートをクリアしました");
}

/**
 * エラー統計を取得
 */
export function getErrorStatistics(): {
  totalErrors: number;
  recoveredErrors: number;
  failedErrors: number;
  errorsByOperation: Record<string, number>;
  recentErrors: ErrorReport[];
} {
  const totalErrors = errorReports.length;
  const recoveredErrors = errorReports.filter((r) => r.recovered).length;
  const failedErrors = totalErrors - recoveredErrors;

  const errorsByOperation: Record<string, number> = {};
  for (const report of errorReports) {
    errorsByOperation[report.operation] = (errorsByOperation[report.operation] || 0) + 1;
  }

  const recentErrors = errorReports.slice(-10);

  return {
    totalErrors,
    recoveredErrors,
    failedErrors,
    errorsByOperation,
    recentErrors,
  };
}

/**
 * エラーレポートをファイルに保存
 */
export async function saveErrorReportToFile(filePath: string): Promise<void> {
  console.log(`[ErrorHandler] エラーレポートをファイルに保存中: ${filePath}`);

  try {
    const statistics = getErrorStatistics();
    const report = {
      timestamp: new Date().toISOString(),
      statistics,
      errors: errorReports,
    };

    await fs.promises.mkdir(path.dirname(path.resolve(filePath)), { recursive: true });
    await fs.promises.writeFile(filePath, JSON.stringify(report, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });

    console.log("[ErrorHandler] エラーレポート保存完了");
  } catch (error) {
    console.error("[ErrorHandler] エラーレポート保存エラー:", error);
    throw error;
  }
}

/**
 * エラーハンドラーを初期化
 */
export function initializeErrorHandler(): void {
  console.log("[ErrorHandler] エラーハンドラーを初期化中...");

  // グローバルエラーハンドラーを設定
  process.on("uncaughtException", (error) => {
    console.error("[ErrorHandler] 予期しないエラーが発生しました:", error);
    logError(
      {
        operation: "uncaughtException",
        timestamp: Date.now(),
      },
      error
    );
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("[ErrorHandler] 未処理の Promise rejection:", reason);
    logError(
      {
        operation: "unhandledRejection",
        timestamp: Date.now(),
        details: { promise: String(promise) },
      },
      new Error(String(reason))
    );
  });

  console.log("[ErrorHandler] エラーハンドラー初期化完了");
}

/**
 * エラーメッセージを生成
 */
export function generateErrorMessage(error: Error, context: ErrorContext): string {
  const timestamp = new Date(context.timestamp).toISOString();
  const operation = context.operation;
  const message = error.message;

  return `[${timestamp}] ${operation}: ${message}`;
}

/**
 * エラーを分類
 */
export function classifyError(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes("memory") || message.includes("out of memory")) {
    return "OutOfMemory";
  } else if (message.includes("timeout")) {
    return "Timeout";
  } else if (message.includes("network") || message.includes("econnrefused")) {
    return "Network";
  } else if (message.includes("file") || message.includes("enoent")) {
    return "FileAccess";
  } else if (message.includes("invalid") || message.includes("type")) {
    return "InvalidInput";
  } else if (message.includes("model")) {
    return "ModelLoad";
  } else {
    return "Unknown";
  }
}

/**
 * エラーの重大度を判定
 */
export function getErrorSeverity(error: Error): "low" | "medium" | "high" | "critical" {
  const classification = classifyError(error);

  switch (classification) {
    case "OutOfMemory":
    case "Network":
      return "critical";
    case "Timeout":
    case "ModelLoad":
      return "high";
    case "FileAccess":
      return "medium";
    case "InvalidInput":
      return "low";
    default:
      return "medium";
  }
}
