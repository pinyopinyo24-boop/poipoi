/**
 * Integration wrapper for real quality face swap
 * Handles base64 conversion and error handling
 */

import * as fs from "fs";
import * as path from "path";
import { performRealQualityFaceSwap, performRealQualityVideoFaceSwap } from "./faceswap-real-quality";

const uploadDir = "/tmp/faceswap-uploads";

/**
 * Perform real quality face swap from base64 images
 */
export async function performRealQualityFaceSwapFromBase64(
  sourceImageBase64: string,
  targetImageBase64: string,
  quality: "low" | "medium" | "high" = "high"
): Promise<{
  success: boolean;
  resultImage?: string;
  error?: string;
  processingTime: number;
}> {
  const startTime = Date.now();
  let sourcePath = "";
  let targetPath = "";

  try {
    // Handle data URLs
    const sourceBase64 = sourceImageBase64.includes(",")
      ? sourceImageBase64.split(",")[1]
      : sourceImageBase64;
    const targetBase64 = targetImageBase64.includes(",")
      ? targetImageBase64.split(",")[1]
      : targetImageBase64;

    // Create temporary file paths
    sourcePath = path.join(uploadDir, `source-${Date.now()}-${Math.random().toString(36).substring(7)}.png`);
    targetPath = path.join(uploadDir, `target-${Date.now()}-${Math.random().toString(36).substring(7)}.png`);

    // Convert base64 to buffers
    const sourceBuffer = Buffer.from(sourceBase64, "base64");
    const targetBuffer = Buffer.from(targetBase64, "base64");

    // Write temporary files
    fs.writeFileSync(sourcePath, sourceBuffer);
    fs.writeFileSync(targetPath, targetBuffer);

    console.log("[RealQualityFaceSwap] Processing images...");
    console.log("[RealQualityFaceSwap] Source:", sourcePath, `(${sourceBuffer.length} bytes)`);
    console.log("[RealQualityFaceSwap] Target:", targetPath, `(${targetBuffer.length} bytes)`);
    console.log("[RealQualityFaceSwap] Quality:", quality);

    // Perform real quality face swap
    const resultBuffer = await performRealQualityFaceSwap(
      sourcePath,
      targetPath,
      quality
    );

    // Convert result to base64
    const resultImage = resultBuffer.toString("base64");

    const processingTime = Date.now() - startTime;

    console.log("[RealQualityFaceSwap] Success! Processing time:", processingTime, "ms");

    return {
      success: true,
      resultImage,
      processingTime,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("[RealQualityFaceSwap] Error:", errorMessage);

    return {
      success: false,
      error: errorMessage,
      processingTime,
    };
  } finally {
    // Clean up temporary files
    try {
      if (sourcePath && fs.existsSync(sourcePath)) {
        fs.unlinkSync(sourcePath);
      }
      if (targetPath && fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
    } catch (e) {
      console.error("[RealQualityFaceSwap] Cleanup error:", e);
    }
  }
}

/**
 * Perform real quality video face swap from base64
 */
export async function performRealQualityVideoFaceSwapFromBase64(
  sourceImageBase64: string,
  targetVideoBase64: string,
  quality: "low" | "medium" | "high" = "high"
): Promise<{
  success: boolean;
  resultVideo?: Buffer;
  error?: string;
  processingTime: number;
}> {
  const startTime = Date.now();
  let sourcePath = "";
  let videoPath = "";

  try {
    // Handle data URLs
    const sourceBase64 = sourceImageBase64.includes(",")
      ? sourceImageBase64.split(",")[1]
      : sourceImageBase64;
    const videoBase64 = targetVideoBase64.includes(",")
      ? targetVideoBase64.split(",")[1]
      : targetVideoBase64;

    // Create temporary file paths
    sourcePath = path.join(uploadDir, `source-${Date.now()}-${Math.random().toString(36).substring(7)}.png`);
    videoPath = path.join(uploadDir, `video-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`);

    // Convert base64 to buffers
    const sourceBuffer = Buffer.from(sourceBase64, "base64");
    const videoBuffer = Buffer.from(videoBase64, "base64");

    // Write temporary files
    fs.writeFileSync(sourcePath, sourceBuffer);
    fs.writeFileSync(videoPath, videoBuffer);

    console.log("[RealQualityVideoFaceSwap] Processing video...");
    console.log("[RealQualityVideoFaceSwap] Source:", sourcePath, `(${sourceBuffer.length} bytes)`);
    console.log("[RealQualityVideoFaceSwap] Video:", videoPath, `(${videoBuffer.length} bytes)`);
    console.log("[RealQualityVideoFaceSwap] Quality:", quality);

    // Extract video frames (placeholder - would use ffmpeg)
    // For now, return error as video processing requires more setup
    throw new Error("Video face swap requires additional setup. Use image face swap instead.");

    // const resultBuffer = await performRealQualityVideoFaceSwap(
    //   sourcePath,
    //   videoPath,
    //   quality
    // );

    // const processingTime = Date.now() - startTime;

    // console.log("[RealQualityVideoFaceSwap] Success! Processing time:", processingTime, "ms");

    // return {
    //   success: true,
    //   resultVideo: resultBuffer,
    //   processingTime,
    // };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("[RealQualityVideoFaceSwap] Error:", errorMessage);

    return {
      success: false,
      error: errorMessage,
      processingTime,
    };
  } finally {
    // Clean up temporary files
    try {
      if (sourcePath && fs.existsSync(sourcePath)) {
        fs.unlinkSync(sourcePath);
      }
      if (videoPath && fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    } catch (e) {
      console.error("[RealQualityVideoFaceSwap] Cleanup error:", e);
    }
  }
}
