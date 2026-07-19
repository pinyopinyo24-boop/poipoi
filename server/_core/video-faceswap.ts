/**
 * 改善版：動画顔入れ替え処理エンジン
 * MP4、WebM等の動画ファイルから複数フレームを抽出し、
 * 各フレームに対して顔入れ替え処理を実行して新しい動画を生成
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { performFaceSwap, detectFaceLandmarks } from "./faceswap-tensorflow";
import sharp from "sharp";

export interface VideoFrameData {
  frameIndex: number;
  timestamp: number;
  base64: string;
  width: number;
  height: number;
}

export interface VideoFaceSwapRequest {
  sourceImageBase64: string;
  videoBase64: string;
  frameInterval?: number;
  quality?: "low" | "medium" | "high";
  maxFrames?: number;
}

export interface VideoFaceSwapResult {
  success: boolean;
  resultVideo?: string;
  processedFrames?: number;
  totalFrames?: number;
  processingTime?: number;
  error?: string;
  message?: string;
  details?: {
    sourceImageDetected: boolean;
    framesProcessed: number;
    skippedFrames: number;
    averageFrameTime: number;
  };
}

function base64ToBuffer(base64: string): Buffer {
  let cleanBase64 = base64;
  if (base64.includes(",")) {
    cleanBase64 = base64.split(",")[1];
  }
  cleanBase64 = cleanBase64.replace(/\s/g, "");
  return Buffer.from(cleanBase64, "base64");
}

function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

/**
 * フレーム抽出
 */
export async function extractVideoFrames(
  videoBuffer: Buffer,
  frameInterval: number = 1000,
  maxFrames: number = 30
): Promise<VideoFrameData[]> {
  console.log("[VideoFaceSwap] フレーム抽出開始");
  console.log(`[VideoFaceSwap] フレーム間隔: ${frameInterval}ms, 最大フレーム数: ${maxFrames}`);

  const frames: VideoFrameData[] = [];
  const tempDir = `/tmp/faceswap_${Date.now()}`;
  const tempVideoPath = path.join(tempDir, "input.mp4");
  const frameDir = path.join(tempDir, "frames");

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs.existsSync(frameDir)) {
      fs.mkdirSync(frameDir, { recursive: true });
    }

    fs.writeFileSync(tempVideoPath, videoBuffer);
    console.log(`[VideoFaceSwap] 一時動画ファイル: ${tempVideoPath} (${videoBuffer.length} bytes)`);

    // FPS を 2 に固定（再生速度を正常化）
    const fps = 2;
    
    try {
      const cmd = `/usr/bin/ffmpeg -i "${tempVideoPath}" -vf "fps=${fps}" -vframes ${maxFrames} -q:v 2 "${frameDir}/frame_%04d.jpg" -y 2>&1`;
      console.log(`[VideoFaceSwap] FFmpeg実行中...`);
      const output = execSync(cmd, { stdio: "pipe", encoding: "utf-8", maxBuffer: 50 * 1024 * 1024, timeout: 600000 });
      console.log(`[VideoFaceSwap] FFmpeg完了`);
    } catch (ffmpegError) {
      console.warn("[VideoFaceSwap] FFmpeg警告:", ffmpegError instanceof Error ? ffmpegError.message : ffmpegError);
      // フレーム抽出に失敗しても続行
      if (frames.length === 0) {
        throw new Error("Failed to extract video frames");
      }
    }

    const frameFiles = fs
      .readdirSync(frameDir)
      .filter((f) => f.endsWith(".jpg"))
      .sort();

    console.log(`[VideoFaceSwap] 抽出フレーム数: ${frameFiles.length}`);

    if (frameFiles.length === 0) {
      console.warn("[VideoFaceSwap] フレーム抽出失敗 - フレームが見つかりません");
      return frames;
    }

    for (let i = 0; i < frameFiles.length; i++) {
      const framePath = path.join(frameDir, frameFiles[i]);
      const frameBuffer = fs.readFileSync(framePath);
      const metadata = await sharp(frameBuffer).metadata();

      frames.push({
        frameIndex: i,
        timestamp: i * frameInterval,
        base64: frameBuffer.toString("base64"),
        width: metadata.width || 1280,
        height: metadata.height || 720,
      });
    }

    console.log(`[VideoFaceSwap] フレーム抽出完了: ${frames.length}フレーム`);
    return frames;
  } catch (error) {
    console.error("[VideoFaceSwap] フレーム抽出エラー:", error);
    return frames;
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.warn("[VideoFaceSwap] クリーンアップエラー:", cleanupError);
    }
  }
}

/**
 * バッチ処理（顔検出失敗時はスキップ）
 */
export async function batchFaceSwap(
  sourceImageBase64: string,
  frames: VideoFrameData[],
  quality: "low" | "medium" | "high" = "medium"
): Promise<VideoFrameData[]> {
  console.log(`[VideoFaceSwap] バッチ処理開始: ${frames.length}フレーム`);

  const processedFrames: VideoFrameData[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    console.log(`[VideoFaceSwap] フレーム処理中: ${i + 1}/${frames.length}`);

    try {
      const result = await performFaceSwap({
        sourceImageBase64,
        targetImageBase64: `data:image/jpeg;base64,${frame.base64}`,
        quality,
      });

      if (result.success && result.resultImage) {
        processedFrames.push({
          frameIndex: frame.frameIndex,
          timestamp: frame.timestamp,
          base64: result.resultImage,
          width: frame.width,
          height: frame.height,
        });
        successCount++;
        console.log(`[VideoFaceSwap] フレーム ${i} 処理成功`);
      } else {
        failCount++;
        console.warn(`[VideoFaceSwap] フレーム ${i} 処理失敗: ${result.error}`);
      }
    } catch (error) {
      failCount++;
      console.error(`[VideoFaceSwap] フレーム ${i} エラー:`, error);
    }
  }

  console.log(`[VideoFaceSwap] バッチ処理完了: ${successCount}フレーム処理, ${failCount}フレーム失敗`);
  return processedFrames;
}

/**
 * 動画再構成
 */
export async function reconstructVideo(
  frames: VideoFrameData[],
  fps: number = 2
): Promise<Buffer> {
  console.log(`[VideoFaceSwap] 動画再構成開始: ${frames.length}フレーム, FPS: ${fps}`);

  const tempDir = `/tmp/faceswap_reconstruct_${Date.now()}`;
  const frameDir = path.join(tempDir, "frames");
  const outputPath = path.join(tempDir, "output.mp4");

  try {
    if (!fs.existsSync(frameDir)) {
      fs.mkdirSync(frameDir, { recursive: true });
    }

    // フレームをファイルに保存
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const frameBuffer = Buffer.from(frame.base64, "base64");
      const framePath = path.join(frameDir, `frame_${String(i).padStart(4, "0")}.jpg`);
      fs.writeFileSync(framePath, frameBuffer);
    }

    console.log(`[VideoFaceSwap] フレームファイル保存完了`);

    // FFmpeg で動画を再構成
    const cmd = `/usr/bin/ffmpeg -framerate ${fps} -i "${frameDir}/frame_%04d.jpg" -c:v libx264 -pix_fmt yuv420p -y "${outputPath}" 2>&1`;
    console.log(`[VideoFaceSwap] FFmpeg動画再構成中...`);
    execSync(cmd, { stdio: "pipe", encoding: "utf-8", maxBuffer: 50 * 1024 * 1024, timeout: 600000 });

    if (fs.existsSync(outputPath)) {
      const videoBuffer = fs.readFileSync(outputPath);
      console.log(`[VideoFaceSwap] 動画再構成完了: ${videoBuffer.length}バイト`);
      return videoBuffer;
    } else {
      throw new Error("動画ファイルが生成されませんでした");
    }
  } catch (error) {
    console.error("[VideoFaceSwap] 動画再構成エラー:", error);
    throw error;
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.warn("[VideoFaceSwap] クリーンアップエラー:", cleanupError);
    }
  }
}

/**
 * メイン処理
 */
export async function performVideoFaceSwap(
  request: VideoFaceSwapRequest
): Promise<VideoFaceSwapResult> {
  const startTime = Date.now();

  try {
    console.log("[VideoFaceSwap] 動画顔入れ替え処理開始");

    const videoBuffer = base64ToBuffer(request.videoBase64);
    console.log(`[VideoFaceSwap] 動画バッファサイズ: ${videoBuffer.length} bytes`);

    const frameInterval = request.frameInterval || 1000;
    const maxFrames = request.maxFrames || 30;
    const quality = request.quality || "medium";

    // フレーム抽出
    const frames = await extractVideoFrames(videoBuffer, frameInterval, maxFrames);

    if (frames.length === 0) {
      const errorMsg = "動画からフレームを抽出できませんでした";
      console.error(`[VideoFaceSwap] ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        message: errorMsg,
        processingTime: Date.now() - startTime,
      };
    }

    // バッチ処理
    const processedFrames = await batchFaceSwap(request.sourceImageBase64, frames, quality);

    if (processedFrames.length === 0) {
      const errorMsg = "フレーム処理に失敗しました。ソース画像またはターゲット動画の品質を確認してください。";
      console.error(`[VideoFaceSwap] ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        message: errorMsg,
        totalFrames: frames.length,
        processedFrames: 0,
        processingTime: Date.now() - startTime,
      };
    }

    // 動画再構成
    const outputVideoBuffer = await reconstructVideo(processedFrames, 30);
    const resultVideo = bufferToBase64(outputVideoBuffer);

    const processingTime = Date.now() - startTime;

    console.log(`[VideoFaceSwap] 処理完了（${processingTime}ms）`);

    return {
      success: true,
      resultVideo,
      processedFrames: processedFrames.length,
      totalFrames: frames.length,
      processingTime,
      message: `${processedFrames.length}/${frames.length} フレームを処理しました`,
      details: {
        sourceImageDetected: true,
        framesProcessed: processedFrames.length,
        skippedFrames: frames.length - processedFrames.length,
        averageFrameTime: processingTime / frames.length,
      },
    };
  } catch (error) {
    console.error("[VideoFaceSwap] エラーが発生しました:", error);
    const errorMsg = error instanceof Error ? error.message : "不明なエラー";
    return {
      success: false,
      error: errorMsg,
      message: errorMsg,
      processingTime: Date.now() - startTime,
    };
  }
}
