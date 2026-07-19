/**
 * Video Reconstruction Engine
 * Combines processed video frames back into a video file
 */

import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ReconstructionOptions {
  fps?: number;
  codec?: "libx264" | "libx265" | "mpeg4";
  preset?: "ultrafast" | "fast" | "medium" | "slow";
  quality?: "low" | "medium" | "high";
}

export interface ReconstructionProgress {
  status: "preparing" | "encoding" | "finalizing" | "complete" | "error";
  progress: number;
  estimatedTimeRemaining: number;
  error?: string;
}

/**
 * Reconstruct video from processed frames
 * Note: Requires FFmpeg to be installed on the system
 */
export async function reconstructVideoFromFrames(
  frames: Array<{ base64: string; timestamp: number }>,
  outputPath: string,
  options: ReconstructionOptions = {}
): Promise<{
  success: boolean;
  outputPath?: string;
  error?: string;
  fileSize?: number;
}> {
  const {
    fps = 30,
    codec = "libx264",
    preset = "fast",
    quality = "medium",
  } = options;

  try {
    // Create temporary directory for frame files
    const tempDir = path.join("/tmp", `video-reconstruction-${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write frames to temporary files
    console.log(`[VideoReconstruction] Writing ${frames.length} frames to ${tempDir}`);
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const frameBuffer = Buffer.from(frame.base64.split(",")[1] || frame.base64, "base64");
      const framePath = path.join(tempDir, `frame-${String(i).padStart(6, "0")}.png`);
      fs.writeFileSync(framePath, frameBuffer);
    }

    // Determine quality settings
    const qualitySettings = {
      low: { crf: 28, preset: "ultrafast" },
      medium: { crf: 23, preset: "fast" },
      high: { crf: 18, preset: "slow" },
    };

    const { crf, preset: ffmpegPreset } = qualitySettings[quality];

    // Build FFmpeg command
    const inputPattern = path.join(tempDir, "frame-%06d.png");
    const ffmpegCmd = `ffmpeg -y -framerate ${fps} -i "${inputPattern}" -c:v ${codec} -preset ${ffmpegPreset} -crf ${crf} -pix_fmt yuv420p "${outputPath}"`;

    console.log(`[VideoReconstruction] Running FFmpeg: ${ffmpegCmd}`);

    // Execute FFmpeg
    const { stdout, stderr } = await execAsync(ffmpegCmd, { maxBuffer: 50 * 1024 * 1024 });
    console.log(`[VideoReconstruction] FFmpeg output: ${stdout}`);

    // Check if output file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error("Output file was not created by FFmpeg");
    }

    const fileSize = fs.statSync(outputPath).size;
    console.log(`[VideoReconstruction] Video created successfully: ${fileSize} bytes`);

    // Clean up temporary files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`[VideoReconstruction] Cleaned up temporary directory`);
    } catch (cleanupError) {
      console.warn(`[VideoReconstruction] Failed to clean up temp directory:`, cleanupError);
    }

    return {
      success: true,
      outputPath,
      fileSize,
    };
  } catch (error) {
    console.error("[VideoReconstruction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Video reconstruction failed",
    };
  }
}

/**
 * Convert video to different format
 */
export async function convertVideoFormat(
  inputPath: string,
  outputPath: string,
  format: "mp4" | "webm" | "mov" = "mp4"
): Promise<{
  success: boolean;
  outputPath?: string;
  error?: string;
}> {
  try {
    const codecMap = {
      mp4: "libx264",
      webm: "libvpx",
      mov: "mpeg4",
    };

    const codec = codecMap[format];
    const ffmpegCmd = `ffmpeg -y -i "${inputPath}" -c:v ${codec} -preset fast "${outputPath}"`;

    console.log(`[VideoReconstruction] Converting to ${format}: ${ffmpegCmd}`);
    await execAsync(ffmpegCmd, { maxBuffer: 50 * 1024 * 1024 });

    if (!fs.existsSync(outputPath)) {
      throw new Error("Output file was not created");
    }

    return {
      success: true,
      outputPath,
    };
  } catch (error) {
    console.error("[VideoReconstruction] Conversion error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Video conversion failed",
    };
  }
}

/**
 * Get video information using FFprobe
 */
export async function getVideoInfo(videoPath: string): Promise<{
  success: boolean;
  duration?: number;
  fps?: number;
  width?: number;
  height?: number;
  codec?: string;
  error?: string;
}> {
  try {
    const ffprobeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=duration,r_frame_rate,width,height,codec_name -of default=noprint_wrappers=1:nokey=1:nokey=1 "${videoPath}"`;

    const { stdout } = await execAsync(ffprobeCmd);
    const lines = stdout.trim().split("\n");

    return {
      success: true,
      duration: parseFloat(lines[0]),
      fps: eval(lines[1]), // r_frame_rate is in format like "30/1"
      width: parseInt(lines[2]),
      height: parseInt(lines[3]),
      codec: lines[4],
    };
  } catch (error) {
    console.error("[VideoReconstruction] FFprobe error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get video info",
    };
  }
}

/**
 * Estimate video file size
 */
export function estimateVideoFileSize(
  frameCount: number,
  width: number,
  height: number,
  fps: number,
  quality: "low" | "medium" | "high" = "medium"
): number {
  // Rough estimation based on quality
  const bitrateMbps = {
    low: 2,
    medium: 5,
    high: 10,
  };

  const durationSeconds = frameCount / fps;
  const bitrate = bitrateMbps[quality];
  const fileSizeBytes = (bitrate * 1024 * 1024 * durationSeconds) / 8;

  return Math.round(fileSizeBytes);
}

export default {
  reconstructVideoFromFrames,
  convertVideoFormat,
  getVideoInfo,
  estimateVideoFileSize,
};
