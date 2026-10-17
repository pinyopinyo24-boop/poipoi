/**
 * 顔入れ替え動画生成機能
 * ffmpeg を使用した高速な動画処理
 */

import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

type FaceSwapJobStatus = "queued" | "processing" | "completed" | "error" | "cancelled";

interface FaceSwapJob {
  progress: number;
  status: FaceSwapJobStatus;
  startedAt: number;
  finishedAt?: number;
  error?: string;
  controller: AbortController;
  result: Promise<FaceSwapResult>;
}

const faceSwapJobs = new Map<string, FaceSwapJob>();

export interface FaceSwapOptions {
  sourceVideoPath: string;
  targetImagePath: string;
  outputPath: string;
  quality?: "low" | "medium" | "high";
}

export interface FaceSwapResult {
  success: boolean;
  jobId?: string;
  outputPath?: string;
  error?: string;
  processingTime?: number;
}

/**
 * 顔入れ替え動画を生成（シミュレーション版）
 * 実際の顔認識・入れ替えは複雑なため、動画処理のデモンストレーション
 */
export async function generateFaceSwapVideo(
  options: FaceSwapOptions
): Promise<FaceSwapResult> {
  const jobId = startFaceSwapJob(options);
  const job = faceSwapJobs.get(jobId);
  if (!job) return { success: false, jobId, error: "顔入れ替えジョブを開始できませんでした" };
  return job.result;
}

/** Start a cancellable job and return its ID immediately. */
export function startFaceSwapJob(options: FaceSwapOptions): string {
  const jobId = randomUUID();
  const controller = new AbortController();
  const job: FaceSwapJob = {
    progress: 0,
    status: "queued",
    startedAt: Date.now(),
    controller,
    result: Promise.resolve({ success: false, jobId, error: "処理を開始できませんでした" }),
  };
  faceSwapJobs.set(jobId, job);
  pruneFaceSwapJobs();
  job.result = executeFaceSwapJob(jobId, job, options);
  return jobId;
}

async function executeFaceSwapJob(
  jobId: string,
  job: FaceSwapJob,
  options: FaceSwapOptions
): Promise<FaceSwapResult> {
  const startTime = Date.now();

  try {
    job.status = "processing";
    job.progress = 5;
    // 入力ファイルの存在確認
    if (!fs.existsSync(options.sourceVideoPath)) {
      job.status = "error";
      job.error = "ソース動画ファイルが見つかりません";
      job.finishedAt = Date.now();
      return {
        success: false,
        jobId,
        error: "ソース動画ファイルが見つかりません",
      };
    }

    if (!fs.existsSync(options.targetImagePath)) {
      job.status = "error";
      job.error = "ターゲット画像ファイルが見つかりません";
      job.finishedAt = Date.now();
      return {
        success: false,
        jobId,
        error: "ターゲット画像ファイルが見つかりません",
      };
    }

    // 出力ディレクトリの作成
    const outputDir = path.dirname(options.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // ffmpeg で動画処理を実行
    job.progress = 50;
    await processFaceSwapWithFFmpeg(
      options.sourceVideoPath,
      options.targetImagePath,
      options.outputPath,
      options.quality || "medium",
      job.controller.signal
    );
    const processingTime = Date.now() - startTime;
    job.status = "completed";
    job.progress = 100;
    job.finishedAt = Date.now();
    return { success: true, jobId, outputPath: options.outputPath, processingTime };
  } catch (error) {
    const message = job.controller.signal.aborted
      ? "顔入れ替え処理をキャンセルしました"
      : `顔入れ替え処理中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`;
    job.status = job.controller.signal.aborted ? "cancelled" : "error";
    job.progress = 0;
    job.error = message;
    job.finishedAt = Date.now();
    return {
      success: false,
      jobId,
      error: message,
    };
  }
}

function pruneFaceSwapJobs(): void {
  for (const [jobId, job] of faceSwapJobs) {
    if (faceSwapJobs.size <= 200) break;
    if (job.status === "completed" || job.status === "error" || job.status === "cancelled") {
      faceSwapJobs.delete(jobId);
    }
  }
}

/**
 * ffmpeg で動画処理を実行
 */
async function processFaceSwapWithFFmpeg(
  sourceVideo: string,
  targetImage: string,
  outputPath: string,
  quality: string,
  signal: AbortSignal
): Promise<void> {
  const qualityParams = {
    low: { crf: 28, scale: "scale=640:-1" },
    medium: { crf: 23, scale: "scale=1280:-1" },
    high: { crf: 18, scale: "scale=1920:-1" },
  };
  const params = qualityParams[quality as keyof typeof qualityParams] || qualityParams.medium;
  const args = [
    "-i", sourceVideo,
    "-i", targetImage,
    "-filter_complex", `[1:v]${params.scale}[img];[0:v][img]overlay=10:10:enable='between(t,0,5)'`,
    "-c:v", "libx264",
    "-crf", String(params.crf),
    "-preset", "medium",
    "-c:a", "aac",
    "-y", outputPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      finish(new Error("ffmpeg 処理がタイムアウトしました"));
    }, 300000);
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal.removeEventListener("abort", abortProcess);
      if (error) reject(error);
      else resolve();
    };
    const abortProcess = () => child.kill("SIGTERM");
    if (signal.aborted) abortProcess();
    else signal.addEventListener("abort", abortProcess, { once: true });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString()}`.slice(-8000);
    });
    child.once("error", (error) => finish(error));
    child.once("close", (code) => {
      if (signal.aborted) return finish(new Error("処理をキャンセルしました"));
      if (code !== 0) return finish(new Error(`ffmpeg failed (${code}): ${stderr}`));
      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
        return finish(new Error(`出力ファイルが作成されませんでした: ${stderr}`));
      }
      finish();
    });
  });
}

/**
 * 顔入れ替え動画の進捗を取得
 */
export async function getFaceSwapProgress(
  jobId: string
): Promise<{ progress: number; status: string }> {
  const job = faceSwapJobs.get(jobId);
  if (!job) return { progress: 0, status: "not_found" };
  return {
    progress: job.progress,
    status: job.status,
  };
}

/**
 * 顔入れ替え動画処理をキャンセル
 */
export async function cancelFaceSwap(jobId: string): Promise<boolean> {
  const job = faceSwapJobs.get(jobId);
  if (!job || job.status !== "processing" && job.status !== "queued") return false;
  job.controller.abort();
  return true;
}
