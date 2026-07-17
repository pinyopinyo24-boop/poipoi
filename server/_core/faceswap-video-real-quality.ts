/**
 * Real Quality Video Face Swap Engine
 * Processes video frames with high-quality face swap
 * Maintains frame consistency and smooth transitions
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { performRealQualityFaceSwapFromBase64 } from "./faceswap-integration";

interface VideoProcessingStats {
  totalFrames: number;
  processedFrames: number;
  failedFrames: number;
  processingTime: number;
  fps: number;
  outputPath: string;
}

/**
 * Extract frames from video using ffmpeg
 */
export async function extractVideoFrames(
  videoPath: string,
  outputDir: string,
  fps: number = 2
): Promise<string[]> {
  try {
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Use ffmpeg to extract frames
    const framePattern = path.join(outputDir, "frame_%04d.png");
    const command = `ffmpeg -i "${videoPath}" -vf "fps=${fps}" "${framePattern}" -y`;

    console.log("[VideoFaceSwap] Extracting frames:", command);

    execSync(command, {
      stdio: "pipe",
      maxBuffer: 50 * 1024 * 1024,
    });

    // Get list of extracted frames
    const frames = fs
      .readdirSync(outputDir)
      .filter((f) => f.match(/^frame_\d+\.png$/))
      .sort()
      .map((f) => path.join(outputDir, f));

    console.log(`[VideoFaceSwap] Extracted ${frames.length} frames`);
    return frames;
  } catch (error) {
    throw new Error(`Frame extraction failed: ${error}`);
  }
}

/**
 * Reconstruct video from frames using ffmpeg
 */
export async function reconstructVideo(
  frameDir: string,
  outputPath: string,
  fps: number = 2
): Promise<void> {
  try {
    const framePattern = path.join(frameDir, "frame_%04d.png");
    const command = `ffmpeg -framerate ${fps} -i "${framePattern}" -c:v libx264 -pix_fmt yuv420p "${outputPath}" -y`;

    console.log("[VideoFaceSwap] Reconstructing video:", command);

    execSync(command, {
      stdio: "pipe",
      maxBuffer: 50 * 1024 * 1024,
    });

    console.log("[VideoFaceSwap] Video reconstructed:", outputPath);
  } catch (error) {
    throw new Error(`Video reconstruction failed: ${error}`);
  }
}

/**
 * Process video frames with face swap
 */
export async function processVideoFrames(
  sourceImagePath: string,
  frameDir: string,
  quality: "low" | "medium" | "high" = "high",
  maxFrames?: number
): Promise<VideoProcessingStats> {
  const startTime = Date.now();
  let processedFrames = 0;
  let failedFrames = 0;

  try {
    // Read source image
    const sourceImageBuffer = fs.readFileSync(sourceImagePath);
    const sourceImageBase64 = sourceImageBuffer.toString("base64");

    // Get list of frames
    const frames = fs
      .readdirSync(frameDir)
      .filter((f) => f.match(/^frame_\d+\.png$/))
      .sort();

    const totalFrames = maxFrames ? Math.min(maxFrames, frames.length) : frames.length;

    console.log(
      `[VideoFaceSwap] Processing ${totalFrames} frames with quality: ${quality}`
    );

    // Process each frame
    for (let i = 0; i < totalFrames; i++) {
      const framePath = path.join(frameDir, frames[i]);

      try {
        // Read frame
        const frameBuffer = fs.readFileSync(framePath);
        const frameBase64 = frameBuffer.toString("base64");

        // Perform face swap
        const result = await performRealQualityFaceSwapFromBase64(
          sourceImageBase64,
          frameBase64,
          quality
        );

        if (result.success && result.resultImage) {
          // Write processed frame
          const processedBuffer = Buffer.from(result.resultImage, "base64");
          fs.writeFileSync(framePath, processedBuffer);
          processedFrames++;

          // Log progress
          if ((i + 1) % 10 === 0 || i === 0) {
            console.log(
              `[VideoFaceSwap] Progress: ${i + 1}/${totalFrames} frames processed`
            );
          }
        } else {
          failedFrames++;
          console.warn(`[VideoFaceSwap] Failed to process frame ${i + 1}: ${result.error}`);
        }
      } catch (error) {
        failedFrames++;
        console.error(`[VideoFaceSwap] Error processing frame ${i + 1}:`, error);
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      totalFrames,
      processedFrames,
      failedFrames,
      processingTime,
      fps: 2,
      outputPath: frameDir,
    };
  } catch (error) {
    throw new Error(`Frame processing failed: ${error}`);
  }
}

/**
 * Main video face swap function
 */
export async function performRealQualityVideoFaceSwap(
  sourceImagePath: string,
  videoPath: string,
  options: {
    quality?: "low" | "medium" | "high";
    fps?: number;
    maxFrames?: number;
  } = {}
): Promise<{
  success: boolean;
  videoBuffer?: Buffer;
  message: string;
  stats: VideoProcessingStats;
  error?: string;
}> {
  const { quality = "high", fps = 2, maxFrames } = options;
  const tempDir = `/tmp/faceswap-video-${Date.now()}`;
  const frameDir = path.join(tempDir, "frames");
  const outputPath = path.join(tempDir, "output.mp4");

  try {
    console.log("[VideoFaceSwap] Starting video face swap");
    console.log("[VideoFaceSwap] Source:", sourceImagePath);
    console.log("[VideoFaceSwap] Video:", videoPath);
    console.log("[VideoFaceSwap] Quality:", quality);
    console.log("[VideoFaceSwap] FPS:", fps);

    // Extract frames
    console.log("[VideoFaceSwap] Step 1: Extracting frames...");
    await extractVideoFrames(videoPath, frameDir, fps);

    // Process frames
    console.log("[VideoFaceSwap] Step 2: Processing frames...");
    const stats = await processVideoFrames(sourceImagePath, frameDir, quality, maxFrames);

    // Reconstruct video
    console.log("[VideoFaceSwap] Step 3: Reconstructing video...");
    await reconstructVideo(frameDir, outputPath, fps);

    // Read output video
    if (!fs.existsSync(outputPath)) {
      throw new Error("Output video file not created");
    }

    const videoBuffer = fs.readFileSync(outputPath);

    console.log(
      `[VideoFaceSwap] Success! Video size: ${videoBuffer.length} bytes`
    );

    return {
      success: true,
      videoBuffer,
      message: `Video face swap completed: ${stats.processedFrames}/${stats.totalFrames} frames processed`,
      stats,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[VideoFaceSwap] Error:", errorMessage);

    return {
      success: false,
      message: `Video face swap failed: ${errorMessage}`,
      error: errorMessage,
      stats: {
        totalFrames: 0,
        processedFrames: 0,
        failedFrames: 0,
        processingTime: 0,
        fps,
        outputPath: "",
      },
    };
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(tempDir)) {
        console.log("[VideoFaceSwap] Cleaning up temporary files...");
        execSync(`rm -rf "${tempDir}"`, { stdio: "pipe" });
      }
    } catch (e) {
      console.error("[VideoFaceSwap] Cleanup error:", e);
    }
  }
}
