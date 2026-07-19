/**
 * Face Swap High Quality Router - tRPC endpoints
 * 高品質顔入れ替え動画生成API
 */

import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { faceSwapEngine } from "./_core/faceSwapEngine";
import { storagePut, storageGet } from "./storage";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

export const faceSwapHQRouter = router({
  // Upload source image
  uploadSource: publicProcedure
    .input(
      z.object({
        filename: z.string(),
        data: z.string(), // base64
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = String(ctx.user?.id || "anonymous");
        const tempDir = path.join(os.tmpdir(), "poipoi-faceswap", userId);
        await fs.mkdir(tempDir, { recursive: true });

        const sourceImagePath = path.join(tempDir, "source_face.jpg");
        const buffer = Buffer.from(input.data, "base64");
        await fs.writeFile(sourceImagePath, buffer);

        return {
          success: true,
          path: sourceImagePath,
          filename: input.filename,
          size: buffer.length,
        };
      } catch (error) {
        throw new Error(`Upload source failed: ${error}`);
      }
    }),

  // Upload target video
  uploadTarget: publicProcedure
    .input(
      z.object({
        filename: z.string(),
        data: z.string(), // base64
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = String(ctx.user?.id || "anonymous");
        const tempDir = path.join(os.tmpdir(), "poipoi-faceswap", userId);
        await fs.mkdir(tempDir, { recursive: true });

        const targetVideoPath = path.join(tempDir, "target_video.mp4");
        const buffer = Buffer.from(input.data, "base64");
        await fs.writeFile(targetVideoPath, buffer);

        return {
          success: true,
          path: targetVideoPath,
          filename: input.filename,
          size: buffer.length,
        };
      } catch (error) {
        throw new Error(`Upload target failed: ${error}`);
      }
    }),

  // Process face swap
  process: publicProcedure
    .input(
      z.object({
        sourceImagePath: z.string(),
        targetVideoPath: z.string(),
        quality: z.enum(["low", "medium", "high"]).default("high"),
        enableEnhancer: z.boolean().default(true),
        gpuAcceleration: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = String(ctx.user?.id || "anonymous");
        const tempDir = path.join(os.tmpdir(), "poipoi-faceswap", userId);
        const outputPath = path.join(tempDir, "face_swap_output.mp4");

        // Initialize engine
        await faceSwapEngine.initialize();

        // Process face swap
        const result = await faceSwapEngine.processFaceSwap({
          sourceImagePath: input.sourceImagePath,
          targetVideoPath: input.targetVideoPath,
          outputPath,
          quality: input.quality,
          enableEnhancer: input.enableEnhancer,
          gpuAcceleration: input.gpuAcceleration,
        });

        // Upload to storage
        const fileBuffer = await fs.readFile(result);
        const storageResult = await storagePut(
          `faceswap/${userId}/${Date.now()}.mp4`,
          fileBuffer,
          "video/mp4"
        );

        return {
          success: true,
          outputPath: result,
          storageUrl: storageResult.url,
          storageKey: storageResult.key,
          size: fileBuffer.length,
        };
      } catch (error) {
        throw new Error(`Face swap processing failed: ${error}`);
      }
    }),

  // Get processing status
  getStatus: publicProcedure.query(async () => {
    try {
      const progress = faceSwapEngine.getProgress();
      return {
        status: progress.status,
        progress: progress.progress,
        message: progress.message,
        error: progress.error,
      };
    } catch (error) {
      throw new Error(`Get status failed: ${error}`);
    }
  }),

  // Download result
  download: publicProcedure
    .input(z.object({ path: z.string() }))
    .query(async ({ input }) => {
      try {
        const presignedUrl = await storageGet(input.path);
        return {
          success: true,
          downloadUrl: presignedUrl.url,
        };
      } catch (error) {
        throw new Error(`Download failed: ${error}`);
      }
    }),

  // Cleanup temporary files
  cleanup: publicProcedure.mutation(async ({ ctx }) => {
    try {
      await faceSwapEngine.cleanup();
      return { success: true };
    } catch (error) {
      throw new Error(`Cleanup failed: ${error}`);
    }
  }),
});

export default faceSwapHQRouter;
