import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
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
  uploadFile: publicProcedure
    .input(z.object({
      fileBase64: z.string().describe("File content as base64"),
      fileName: z.string().describe("Original file name"),
      fileType: z.enum(["image", "video"]).describe("File type"),
    }))
    .mutation(async ({ input }) => {
      try {
        // Decode base64 to buffer
        const buffer = Buffer.from(input.fileBase64, "base64");
        
        // Validate file size (max 500MB)
        const maxSize = 500 * 1024 * 1024;
        if (buffer.length > maxSize) {
          throw new Error("File size exceeds 500MB limit");
        }
        
        // Generate unique filename
        const ext = path.extname(input.fileName);
        const uniqueName = `${input.fileType}-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
        const filePath = path.join(uploadDir, uniqueName);
        
        // Save file
        fs.writeFileSync(filePath, buffer);
        
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
  getFile: publicProcedure
    .input(z.object({
      filePath: z.string().describe("Path to the uploaded file"),
    }))
    .query(async ({ input }) => {
      try {
        // Security: ensure path is within upload directory
        const resolvedPath = path.resolve(input.filePath);
        const uploadDirResolved = path.resolve(uploadDir);
        
        if (!resolvedPath.startsWith(uploadDirResolved)) {
          throw new Error("Invalid file path");
        }
        
        if (!fs.existsSync(resolvedPath)) {
          throw new Error("File not found");
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
  deleteFile: publicProcedure
    .input(z.object({
      filePath: z.string().describe("Path to the file to delete"),
    }))
    .mutation(async ({ input }) => {
      try {
        // Security: ensure path is within upload directory
        const resolvedPath = path.resolve(input.filePath);
        const uploadDirResolved = path.resolve(uploadDir);
        
        if (!resolvedPath.startsWith(uploadDirResolved)) {
          throw new Error("Invalid file path");
        }
        
        if (fs.existsSync(resolvedPath)) {
          fs.unlinkSync(resolvedPath);
        }
        
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
      sourceImage: z.string().describe("Source face image as base64"),
      targetImage: z.string().describe("Target image as base64"),
      quality: z.enum(["low", "medium", "high"]).default("high"),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await performRealQualityFaceSwapFromBase64(
          input.sourceImage,
          input.targetImage,
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
      sourceImage: z.string().describe("Source face image as base64"),
      targetVideo: z.string().describe("Target video as base64"),
      quality: z.enum(["low", "medium", "high"]).default("medium"),
    }))
    .mutation(async ({ input }) => {
      let sourceImagePath = "";
      let targetVideoPath = "";
      
      try {
        // Convert base64 to files
        console.log('[VideoSwap] Input sourceImage length:', input.sourceImage?.length);
        console.log('[VideoSwap] Input targetVideo length:', input.targetVideo?.length);
        
        // Handle data URLs (data:image/jpeg;base64,xxx or data:video/mp4;base64,xxx)
        const sourceBase64 = input.sourceImage.includes(',') 
          ? input.sourceImage.split(',')[1] 
          : input.sourceImage;
        const videoBase64 = input.targetVideo.includes(',')
          ? input.targetVideo.split(',')[1]
          : input.targetVideo;
        
        console.log('[VideoSwap] Extracted sourceBase64 length:', sourceBase64.length);
        console.log('[VideoSwap] Extracted videoBase64 length:', videoBase64.length);
        console.log('[VideoSwap] sourceBase64 first 50 chars:', sourceBase64.substring(0, 50));
        console.log('[VideoSwap] videoBase64 first 50 chars:', videoBase64.substring(0, 50));
        
        const sourceBuffer = Buffer.from(sourceBase64, "base64");
        const videoBuffer = Buffer.from(videoBase64, "base64");
        
        // Create temporary file paths
        sourceImagePath = path.join(uploadDir, `source-${Date.now()}.jpg`);
        targetVideoPath = path.join(uploadDir, `video-${Date.now()}.mp4`);
        
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
          { quality: input.quality, fps: 2 }
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

  /**
   * Test endpoint for video face swap (Python-based)
   */
  testVideoSwap: publicProcedure
    .input(z.object({
      sourceImage: z.string().describe("Source face image as base64"),
      targetVideo: z.string().describe("Target video as base64"),
    }))
    .mutation(async ({ input }) => {
      let sourceImagePath = "";
      let targetVideoPath = "";
      let outputPath = "";
      
      try {
        // Handle data URLs
        const sourceBase64 = input.sourceImage.includes(',') 
          ? input.sourceImage.split(',')[1] 
          : input.sourceImage;
        const videoBase64 = input.targetVideo.includes(',')
          ? input.targetVideo.split(',')[1]
          : input.targetVideo;
        
        const sourceBuffer = Buffer.from(sourceBase64, "base64");
        const videoBuffer = Buffer.from(videoBase64, "base64");
        
        // Create temporary file paths
        sourceImagePath = path.join(uploadDir, `test-source-${Date.now()}.jpg`);
        targetVideoPath = path.join(uploadDir, `test-video-${Date.now()}.mp4`);
        outputPath = path.join(uploadDir, `test-output-${Date.now()}.mp4`);
        
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
      sourceImage: z.string().describe("Source face image as base64"),
      targetVideo: z.string().describe("Target video as base64"),
      quality: z.enum(["low", "medium", "high"]).default("high"),
      fps: z.number().default(2),
      maxFrames: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      let sourceImagePath = "";
      let targetVideoPath = "";
      
      try {
        const sourceBase64 = input.sourceImage.includes(',')
          ? input.sourceImage.split(',')[1]
          : input.sourceImage;
        const videoBase64 = input.targetVideo.includes(',')
          ? input.targetVideo.split(',')[1]
          : input.targetVideo;
        
        const sourceBuffer = Buffer.from(sourceBase64, "base64");
        const videoBuffer = Buffer.from(videoBase64, "base64");
        
        sourceImagePath = path.join(uploadDir, `source-rq-${Date.now()}.jpg`);
        targetVideoPath = path.join(uploadDir, `video-rq-${Date.now()}.mp4`);
        
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
