import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import { execSync, spawnSync } from "child_process";
import { performFaceSwap } from "./_core/faceswap-tensorflow";
import { performVideoFaceSwap } from "./_core/video-faceswap";
import { performVideoFaceSwapVidwud } from "./_core/faceswap-video-vidwud";
import { performRealQualityFaceSwap, performRealQualityVideoFaceSwap } from "./_core/faceswap-real-quality";
import { performRealQualityFaceSwapFromBase64 } from "./_core/faceswap-integration";
import { performRealQualityVideoFaceSwap as performVideoFaceSwapRealQuality } from "./_core/faceswap-video-real-quality";

// Upload directory
const uploadDir = "/tmp/faceswap-uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const activeVideoSwapJobs = new Map<string, AbortController>();
const uploadedFileOwners = new Map<string, number>();

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 128 * 1024 * 1024;

function decodeBase64(value: string, maxBytes: number, label: string): Buffer {
  const dataUrl = /^data:(?:image|video)\/[a-z0-9.+-]+;base64,/i.test(value);
  const encoded = dataUrl ? value.slice(value.indexOf(",") + 1) : value;
  if (!encoded || encoded.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${label} must be valid base64 data` });
  }
  if (encoded.length > Math.ceil(maxBytes / 3) * 4) {
    throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: `${label} exceeds the ${Math.floor(maxBytes / 1024 / 1024)}MB limit` });
  }
  const buffer = Buffer.from(encoded, "base64");
  if (buffer.length === 0 || buffer.length > maxBytes || buffer.toString("base64") !== encoded) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${label} is empty, oversized, or malformed` });
  }
  return buffer;
}

function resolveUploadedFile(filePath: string): string {
  const root = path.resolve(uploadDir);
  const resolved = path.resolve(filePath);
  if (path.dirname(resolved) !== root || path.basename(resolved) === "." || path.basename(resolved) === "..") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid file path" });
  }
  return resolved;
}

/**
 * Pythonを使用した顔入れ替え処理
 */
function performFaceSwapWithPython(
  sourceImagePath: string,
  targetImagePath: string,
  outputPath: string
): { success: boolean; error?: string; message?: string } {
  try {
    const pythonScript = path.join(process.cwd(), "server/_core/faceswap_advanced.py");
    
    console.log("[FaceSwap] Python実行開始:", pythonScript);
    console.log("[FaceSwap] ソース:", sourceImagePath);
    console.log("[FaceSwap] ターゲット:", targetImagePath);
    console.log("[FaceSwap] 出力:", outputPath);
    
    const result = spawnSync("python3", [pythonScript, sourceImagePath, targetImagePath, outputPath], {
      encoding: "utf-8",
      timeout: 120000, // 2分タイムアウト
      maxBuffer: 10 * 1024 * 1024, // 10MBバッファ
    });
    
    if (result.error) {
      console.error("[FaceSwap] Python実行エラー:", result.error);
      return { success: false, error: `Python実行エラー: ${result.error.message}` };
    }
    
    if (result.status !== 0) {
      console.error("[FaceSwap] Python終了コード:", result.status);
      console.error("[FaceSwap] stderr:", result.stderr);
      return { success: false, error: `Python処理エラー: ${result.stderr}` };
    }
    
    const output = result.stdout.trim();
    console.log("[FaceSwap] Python出力:", output);
    
    return JSON.parse(output);
  } catch (error) {
    console.error("[FaceSwap] エラー:", error);
    return { success: false, error: error instanceof Error ? error.message : "不明なエラー" };
  }
}

export const fileUploadRouter = router({
  /**
   * Upload a file and return it as base64
   * This endpoint expects multipart/form-data
   */
  uploadFile: protectedProcedure
    .input(z.object({
      fileBase64: z.string().max(Math.ceil(MAX_VIDEO_BYTES / 3) * 4 + 128).describe("File content as base64"),
      fileName: z.string().describe("Original file name"),
      fileType: z.enum(["image", "video"]).describe("File type"),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Decode base64 to buffer
        const maxSize = input.fileType === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
        const buffer = decodeBase64(input.fileBase64, maxSize, "File");
        
        // Validate extension before using a server-generated storage name.
        const ext = path.extname(path.basename(input.fileName)).toLowerCase();
        const allowedExtensions = input.fileType === "image"
          ? new Set([".jpg", ".jpeg", ".png", ".webp"])
          : new Set([".mp4", ".mov", ".webm"]);
        if (!allowedExtensions.has(ext)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported file extension" });
        }
        const uniqueName = `${input.fileType}-${randomUUID()}${ext}`;
        const filePath = path.join(uploadDir, uniqueName);
        
        // Save file
        fs.writeFileSync(filePath, buffer, { flag: "wx", mode: 0o600 });
        uploadedFileOwners.set(path.resolve(filePath), ctx.user.id);
        
        return {
          success: true,
          filePath,
          fileSize: buffer.length,
          fileName: uniqueName,
        };
      } catch (error) {
        console.error("File upload error:", error);
        throw new Error(`File upload failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * Get uploaded file as base64
   */
  getFile: protectedProcedure
    .input(z.object({
      filePath: z.string().describe("Path to the uploaded file"),
    }))
    .query(async ({ input, ctx }) => {
      try {
        // Security: ensure path is within upload directory
        const resolvedPath = resolveUploadedFile(input.filePath);
        if (uploadedFileOwners.get(resolvedPath) !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
        }
        
        if (!fs.existsSync(resolvedPath)) {
          throw new Error("File not found");
        }
        
        const fileStat = fs.lstatSync(resolvedPath);
        if (!fileStat.isFile() || fileStat.isSymbolicLink() || fileStat.size > MAX_VIDEO_BYTES) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or oversized uploaded file" });
        }
        const buffer = fs.readFileSync(resolvedPath);
        const base64 = buffer.toString("base64");
        
        return {
          success: true,
          data: base64,
          size: buffer.length,
        };
      } catch (error) {
        console.error("File read error:", error);
        throw new Error(`File read failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * Delete uploaded file
   */
  deleteFile: protectedProcedure
    .input(z.object({
      filePath: z.string().describe("Path to the file to delete"),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Security: ensure path is within upload directory
        const resolvedPath = resolveUploadedFile(input.filePath);
        if (uploadedFileOwners.get(resolvedPath) !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
        }
        
        if (fs.existsSync(resolvedPath)) {
          fs.unlinkSync(resolvedPath);
        }
        uploadedFileOwners.delete(resolvedPath);
        
        return { success: true };
      } catch (error) {
        console.error("File delete error:", error);
        throw new Error(`File delete failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * Perform face swap on images - REAL QUALITY VERSION
   */
  swap: publicProcedure
    .input(z.object({
      sourceImage: z.string().max(Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 128).describe("Source face image as base64"),
      targetImage: z.string().max(Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 128).describe("Target image as base64"),
      quality: z.enum(["low", "medium", "high"]).default("high"),
    }))
    .mutation(async ({ input }) => {
      try {
        const sourceImage = decodeBase64(input.sourceImage, MAX_IMAGE_BYTES, "Source image").toString("base64");
        const targetImage = decodeBase64(input.targetImage, MAX_IMAGE_BYTES, "Target image").toString("base64");
        const result = await performRealQualityFaceSwapFromBase64(
          sourceImage,
          targetImage,
          input.quality
        );

        if (result.success && result.resultImage) {
          return {
            success: true,
            resultImage: result.resultImage,
            message: "Real quality face swap completed",
            processingTime: result.processingTime,
            error: null,
          };
        } else {
          return {
            success: false,
            resultImage: "",
            message: result.error || "Face swap failed",
            processingTime: result.processingTime,
            error: result.error || "Unknown error",
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Face swap error:", error);
        return {
          success: false,
          resultImage: "",
          message: `Error: ${errorMessage}`,
          processingTime: 0,
          error: errorMessage,
        };
      }
    }),

  /**
   * Perform face swap on videos
   */
  swapVideo: publicProcedure
    .input(z.object({
      sourceImage: z.string().max(Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 128).describe("Source face image as base64"),
      targetVideo: z.string().max(Math.ceil(MAX_VIDEO_BYTES / 3) * 4 + 128).describe("Target video as base64"),
      quality: z.enum(["low", "medium", "high"]).default("medium"),
      jobId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      if (activeVideoSwapJobs.has(input.jobId)) {
        throw new TRPCError({ code: "CONFLICT", message: "この動画処理IDはすでに使用されています" });
      }
      const controller = new AbortController();
      activeVideoSwapJobs.set(input.jobId, controller);
      let sourceImagePath = "";
      let targetVideoPath = "";
      
      try {
        // Convert base64 to files
        console.log('[VideoSwap] Input sourceImage length:', input.sourceImage?.length);
        console.log('[VideoSwap] Input targetVideo length:', input.targetVideo?.length);
        
        // Handle data URLs (data:image/jpeg;base64,xxx or data:video/mp4;base64,xxx)
        const sourceBuffer = decodeBase64(input.sourceImage, MAX_IMAGE_BYTES, "Source image");
        const videoBuffer = decodeBase64(input.targetVideo, MAX_VIDEO_BYTES, "Target video");
        
        // Create temporary file paths
        sourceImagePath = path.join(uploadDir, `source-${randomUUID()}.jpg`);
        targetVideoPath = path.join(uploadDir, `video-${randomUUID()}.mp4`);
        
        // Write files
        fs.writeFileSync(sourceImagePath, sourceBuffer);
        fs.writeFileSync(targetVideoPath, videoBuffer);
        
        // Verify files were written
        const sourceStats = fs.statSync(sourceImagePath);
        const videoStats = fs.statSync(targetVideoPath);
        
        console.log(`[VideoSwap] Source image saved: ${sourceImagePath} (${sourceStats.size} bytes)`);
        console.log(`[VideoSwap] Target video saved: ${targetVideoPath} (${videoStats.size} bytes)`);
        
        const result = await performVideoFaceSwapVidwud(
          sourceImagePath,
          targetVideoPath,
          { quality: input.quality, fps: 2, signal: controller.signal }
        );

        if (result.success && result.videoBuffer) {
          const videoBase64 = result.videoBuffer.toString('base64');
          return {
            success: true,
            resultVideo: `data:video/mp4;base64,${videoBase64}`,
            message: result.message,
            processingTime: result.stats.processingTime,
            error: null,
          };
        } else {
          return {
            success: false,
            resultVideo: "",
            message: result.message || "Video face swap failed",
            processingTime: result.stats?.processingTime || 0,
            error: (result as any).error || "Unknown error",
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Video face swap error:", error);
        return {
          success: false,
          resultVideo: "",
          message: `Error: ${errorMessage}`,
          processingTime: 0,
          error: errorMessage,
        };
      } finally {
        activeVideoSwapJobs.delete(input.jobId);
        // Clean up temporary files
        try {
          if (sourceImagePath && fs.existsSync(sourceImagePath)) {
            fs.unlinkSync(sourceImagePath);
          }
          if (targetVideoPath && fs.existsSync(targetVideoPath)) {
            fs.unlinkSync(targetVideoPath);
          }
        } catch (e) {
          console.error("Cleanup error:", e);
        }
      }
    }),

  cancelVideoSwap: publicProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(({ input }) => {
      const controller = activeVideoSwapJobs.get(input.jobId);
      if (!controller) return { cancelled: false };
      controller.abort();
      return { cancelled: true };
    }),

  /**
   * Test endpoint for video face swap (Python-based)
   */
  testVideoSwap: publicProcedure
    .input(z.object({
      sourceImage: z.string().max(Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 128).describe("Source face image as base64"),
      targetVideo: z.string().max(Math.ceil(MAX_VIDEO_BYTES / 3) * 4 + 128).describe("Target video as base64"),
    }))
    .mutation(async ({ input }) => {
      let sourceImagePath = "";
      let targetVideoPath = "";
      let outputPath = "";
      
      try {
        // Handle data URLs
        const sourceBuffer = decodeBase64(input.sourceImage, MAX_IMAGE_BYTES, "Source image");
        const videoBuffer = decodeBase64(input.targetVideo, MAX_VIDEO_BYTES, "Target video");
        
        // Create temporary file paths
        sourceImagePath = path.join(uploadDir, `test-source-${randomUUID()}.jpg`);
        targetVideoPath = path.join(uploadDir, `test-video-${randomUUID()}.mp4`);
        outputPath = path.join(uploadDir, `test-output-${randomUUID()}.mp4`);
        
        // Write files
        fs.writeFileSync(sourceImagePath, sourceBuffer);
        fs.writeFileSync(targetVideoPath, videoBuffer);
        
        const result = performFaceSwapWithPython(sourceImagePath, targetVideoPath, outputPath);
        
        if (result.success && fs.existsSync(outputPath)) {
          const outputBuffer = fs.readFileSync(outputPath);
          const outputBase64 = outputBuffer.toString('base64');
          return {
            success: true,
            resultVideo: `data:video/mp4;base64,${outputBase64}`,
            message: result.message || "Test face swap completed",
            error: null,
          };
        } else {
          return {
            success: false,
            resultVideo: "",
            message: result.error || "Test face swap failed",
            error: result.error || "Unknown error",
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Test face swap error:", error);
        return {
          success: false,
          resultVideo: "",
          message: `Error: ${errorMessage}`,
          error: errorMessage,
        };
      } finally {
        // Clean up temporary files
        try {
          if (sourceImagePath && fs.existsSync(sourceImagePath)) fs.unlinkSync(sourceImagePath);
          if (targetVideoPath && fs.existsSync(targetVideoPath)) fs.unlinkSync(targetVideoPath);
          if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch (e) {
          console.error("Cleanup error:", e);
        }
      }
    }),

  /**
   * Perform real quality face swap on videos
   */
  swapVideoRealQuality: publicProcedure
    .input(z.object({
      sourceImage: z.string().max(Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 128).describe("Source face image as base64"),
      targetVideo: z.string().max(Math.ceil(MAX_VIDEO_BYTES / 3) * 4 + 128).describe("Target video as base64"),
      quality: z.enum(["low", "medium", "high"]).default("high"),
      fps: z.number().default(2),
      maxFrames: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      let sourceImagePath = "";
      let targetVideoPath = "";
      
      try {
        const sourceBuffer = decodeBase64(input.sourceImage, MAX_IMAGE_BYTES, "Source image");
        const videoBuffer = decodeBase64(input.targetVideo, MAX_VIDEO_BYTES, "Target video");
        
        sourceImagePath = path.join(uploadDir, `source-rq-${randomUUID()}.jpg`);
        targetVideoPath = path.join(uploadDir, `video-rq-${randomUUID()}.mp4`);
        
        fs.writeFileSync(sourceImagePath, sourceBuffer);
        fs.writeFileSync(targetVideoPath, videoBuffer);
        
        const result = await performVideoFaceSwapRealQuality(
          sourceImagePath,
          targetVideoPath,
          {
            quality: input.quality,
            fps: input.fps,
            maxFrames: input.maxFrames,
          }
        );
        
        if (result.success && result.videoBuffer) {
          const resultBase64 = result.videoBuffer.toString('base64');
          return {
            success: true,
            resultVideo: `data:video/mp4;base64,${resultBase64}`,
            message: result.message,
            processingTime: result.stats.processingTime,
            stats: result.stats,
            error: null,
          };
        } else {
          return {
            success: false,
            resultVideo: "",
            message: result.message || "Video face swap failed",
            processingTime: result.stats.processingTime,
            stats: result.stats,
            error: result.error || "Unknown error",
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          resultVideo: "",
          message: `Error: ${errorMessage}`,
          processingTime: 0,
          stats: { totalFrames: 0, processedFrames: 0, failedFrames: 0, processingTime: 0, fps: 2, outputPath: "" },
          error: errorMessage,
        };
      } finally {
        try {
          if (sourceImagePath && fs.existsSync(sourceImagePath)) fs.unlinkSync(sourceImagePath);
          if (targetVideoPath && fs.existsSync(targetVideoPath)) fs.unlinkSync(targetVideoPath);
        } catch (e) {
          console.error("Cleanup error:", e);
        }
      }
    }),
});
