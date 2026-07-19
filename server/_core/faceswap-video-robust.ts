/**
 * ロバストな動画処理モジュール
 * FFmpegエラーの自動復旧と最適化
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface VideoProcessingOptions {
  maxFrames?: number;
  fps?: number;
  quality?: "low" | "medium" | "high";
  timeout?: number;
}

/**
 * 動画をMP4に変換（互換性向上）
 */
export function convertVideoToMP4(
  inputPath: string,
  outputPath: string
): boolean {
  try {
    const cmd = `/usr/bin/ffmpeg -i "${inputPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -y "${outputPath}" 2>&1`;
    console.log("[VideoRobust] MP4変換中...");
    execSync(cmd, { stdio: "pipe", timeout: 300000, maxBuffer: 50 * 1024 * 1024 });
    console.log("[VideoRobust] MP4変換完了");
    return true;
  } catch (error) {
    console.error("[VideoRobust] MP4変換失敗:", error);
    return false;
  }
}

/**
 * 動画情報を取得
 */
export function getVideoInfo(videoPath: string): {
  duration: number;
  fps: number;
  width: number;
  height: number;
} | null {
  try {
    const cmd = `/usr/bin/ffprobe -v error -select_streams v:0 -show_entries stream=duration,r_frame_rate,width,height -of default=noprint_wrappers=1:nokey=1:noesc=1 "${videoPath}" 2>&1`;
    const output = execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
    const lines = output.trim().split("\n");

    return {
      duration: parseFloat(lines[0]) || 0,
      fps: eval(lines[1]) || 30,
      width: parseInt(lines[2]) || 1920,
      height: parseInt(lines[3]) || 1080,
    };
  } catch (error) {
    console.error("[VideoRobust] 動画情報取得失敗:", error);
    return null;
  }
}

/**
 * フレーム抽出（ロバスト版）
 */
export function extractFramesRobust(
  videoPath: string,
  frameDir: string,
  options?: VideoProcessingOptions
): number {
  const maxFrames = options?.maxFrames || 30;
  const fps = options?.fps || 2;

  try {
    if (!fs.existsSync(frameDir)) {
      fs.mkdirSync(frameDir, { recursive: true });
    }

    // ステップ1: 動画情報を取得
    const videoInfo = getVideoInfo(videoPath);
    if (!videoInfo) {
      console.warn("[VideoRobust] 動画情報取得失敗、デフォルト設定を使用");
    }

    // ステップ2: フレーム抽出コマンド（複数の試行）
    const commands = [
      // 試行1: 標準的なフレーム抽出
      `/usr/bin/ffmpeg -i "${videoPath}" -vf "fps=${fps}" -vframes ${maxFrames} -q:v 2 "${frameDir}/frame_%04d.jpg" -y 2>&1`,
      // 試行2: ビデオフィルター付き
      `/usr/bin/ffmpeg -i "${videoPath}" -vf "scale=1280:720,fps=${fps}" -vframes ${maxFrames} -q:v 2 "${frameDir}/frame_%04d.jpg" -y 2>&1`,
      // 試行3: 低品質設定
      `/usr/bin/ffmpeg -i "${videoPath}" -vf "fps=${fps}" -vframes ${maxFrames} -q:v 5 "${frameDir}/frame_%04d.jpg" -y 2>&1`,
    ];

    let success = false;
    let lastError = "";

    for (let i = 0; i < commands.length; i++) {
      try {
        console.log(`[VideoRobust] フレーム抽出試行 ${i + 1}/${commands.length}...`);
        execSync(commands[i], {
          stdio: "pipe",
          timeout: 120000,
          maxBuffer: 50 * 1024 * 1024,
        });
        success = true;
        console.log("[VideoRobust] フレーム抽出成功");
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.warn(`[VideoRobust] 試行 ${i + 1} 失敗:`, lastError);
      }
    }

    if (!success) {
      throw new Error(`フレーム抽出失敗（全試行失敗）: ${lastError}`);
    }

    // ステップ3: 抽出されたフレーム数を確認
    const frames = fs
      .readdirSync(frameDir)
      .filter((f) => f.endsWith(".jpg"))
      .sort();

    console.log(`[VideoRobust] ${frames.length}個のフレームを抽出`);
    return frames.length;
  } catch (error) {
    console.error("[VideoRobust] フレーム抽出エラー:", error);
    return 0;
  }
}

/**
 * 動画を再構成（ロバスト版）
 */
export function reconstructVideoRobust(
  frameDir: string,
  outputPath: string,
  fps: number = 30
): boolean {
  try {
    // ステップ1: フレーム数を確認
    const frames = fs
      .readdirSync(frameDir)
      .filter((f) => f.endsWith(".jpg"))
      .sort();

    if (frames.length === 0) {
      throw new Error("フレームが見つかりません");
    }

    console.log(`[VideoRobust] ${frames.length}個のフレームから動画を再構成...`);

    // ステップ2: 動画再構成コマンド（複数の試行）
    const commands = [
      // 試行1: 標準的な再構成
      `/usr/bin/ffmpeg -framerate ${fps} -i "${frameDir}/frame_%04d.jpg" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -y "${outputPath}" 2>&1`,
      // 試行2: 低品質設定
      `/usr/bin/ffmpeg -framerate ${fps} -i "${frameDir}/frame_%04d.jpg" -c:v libx264 -pix_fmt yuv420p -preset ultrafast -crf 28 -y "${outputPath}" 2>&1`,
      // 試行3: MPEG4コーデック
      `/usr/bin/ffmpeg -framerate ${fps} -i "${frameDir}/frame_%04d.jpg" -c:v mpeg4 -q:v 5 -y "${outputPath}" 2>&1`,
    ];

    let success = false;
    let lastError = "";

    for (let i = 0; i < commands.length; i++) {
      try {
        console.log(`[VideoRobust] 動画再構成試行 ${i + 1}/${commands.length}...`);
        execSync(commands[i], {
          stdio: "pipe",
          timeout: 300000,
          maxBuffer: 50 * 1024 * 1024,
        });
        success = true;
        console.log("[VideoRobust] 動画再構成成功");
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.warn(`[VideoRobust] 試行 ${i + 1} 失敗:`, lastError);
      }
    }

    if (!success) {
      throw new Error(`動画再構成失敗（全試行失敗）: ${lastError}`);
    }

    // ステップ3: 出力ファイルを確認
    if (!fs.existsSync(outputPath)) {
      throw new Error("出力ファイルが生成されませんでした");
    }

    const fileSize = fs.statSync(outputPath).size;
    console.log(`[VideoRobust] 動画再構成完了: ${fileSize}バイト`);
    return true;
  } catch (error) {
    console.error("[VideoRobust] 動画再構成エラー:", error);
    return false;
  }
}

/**
 * 一時ディレクトリを作成
 */
export function createTempDir(): string {
  const tempDir = path.join(os.tmpdir(), `faceswap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
}

/**
 * 一時ディレクトリをクリーンアップ
 */
export function cleanupTempDir(tempDir: string): void {
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log("[VideoRobust] 一時ディレクトリをクリーンアップ");
    }
  } catch (error) {
    console.warn("[VideoRobust] クリーンアップエラー:", error);
  }
}
