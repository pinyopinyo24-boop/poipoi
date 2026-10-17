/**
 * Face Swap High Quality Router - tRPC endpoints
 * 高品質顔入れ替え動画生成API
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { FaceSwapEngine } from "./_core/faceSwapEngine";
import { storagePut, storageGet } from "./storage";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 64 * 1024 * 1024;
const faceSwapEngines = new Map<string, FaceSwapEngine>();

function getUserId(ctx: { user: { id: string | number } }): string {
  return String(ctx.user.id);
}

function getUserTempDir(userId: string): string {
  return path.join(os.tmpdir(), "poipoi-faceswap", encodeURIComponent(userId));
}

function getUserEngine(userId: string): FaceSwapEngine {
  let engine = faceSwapEngines.get(userId);
  if (!engine) {
    engine = new FaceSwapEngine();
    faceSwapEngines.set(userId, engine);
  }
  return engine;
}

function decodeUpload(data: string, maxBytes: number): Buffer {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) {
    throw new Error("Invalid base64 upload");
  }
  const buffer = Buffer.from(data, "base64");
  if (buffer.length === 0 || buffer.length > maxBytes || buffer.toString("base64") !== data) {
    throw new Error(`Upload must be between 1 byte and ${maxBytes} bytes`);
  }
  return buffer;
}

function safeExtension(filename: string, allowed: readonly string[]): string {
  const extension = path.extname(filename).toLowerCase();
  if (!allowed.includes(extension)) {
    throw new Error(`Unsupported file type: ${extension || "none"}`);
  }
  return extension;
}

async function assertOwnedUpload(userId: string, filePath: string, maxBytes: number): Promise<void> {
  const userDir = path.resolve(getUserTempDir(userId));
  const resolved = path.resolve(filePath);
  if (path.dirname(resolved) !== userDir) {
    throw new Error("Uploaded file does not belong to the current user");
  }
  const stat = await fs.stat(resolved);
  if (!stat.isFile() || stat.size === 0 || stat.size > maxBytes) {
    throw new Error("Uploaded file is invalid or exceeds the size limit");
  }
}

export const faceSwapHQRouter = router({
  // Upload source image
  uploadSource: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1).max(255),
        data: z.string().max(Math.ceil(MAX_SOURCE_BYTES / 3) * 4), // base64
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = getUserId(ctx);
        const tempDir = getUserTempDir(userId);
        await fs.mkdir(tempDir, { recursive: true, mode: 0o700 });

        const extension = safeExtension(input.filename, [".jpg", ".jpeg", ".png", ".webp"]);
        const sourceImagePath = path.join(tempDir, `source-${randomUUID()}${extension}`);
        const buffer = decodeUpload(input.data, MAX_SOURCE_BYTES);
        await fs.writeFile(sourceImagePath, buffer, { mode: 0o600, flag: "wx" });

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
  uploadTarget: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1).max(255),
        data: z.string().max(Math.ceil(MAX_VIDEO_BYTES / 3) * 4), // base64
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = getUserId(ctx);
        const tempDir = getUserTempDir(userId);
        await fs.mkdir(tempDir, { recursive: true, mode: 0o700 });

        const extension = safeExtension(input.filename, [".mp4", ".mov", ".webm", ".mkv", ".avi"]);
        const targetVideoPath = path.join(tempDir, `target-${randomUUID()}${extension}`);
        const buffer = decodeUpload(input.data, MAX_VIDEO_BYTES);
        await fs.writeFile(targetVideoPath, buffer, { mode: 0o600, flag: "wx" });

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
  process: protectedProcedure
    .input(
      z.object({
        sourceImagePath: z.string(),
        targetVideoPath: z.string(),
        quality: z.enum(["low", "medium", "high"]).default("high"),
        gpuAcceleration: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = getUserId(ctx);
        const tempDir = getUserTempDir(userId);
        await assertOwnedUpload(userId, input.sourceImagePath, MAX_SOURCE_BYTES);
        await assertOwnedUpload(userId, input.targetVideoPath, MAX_VIDEO_BYTES);
        const outputPath = path.join(tempDir, `face_swap_output-${randomUUID()}.mp4`);

        // Initialize engine
        const engine = getUserEngine(userId);
        await engine.initialize();

        // Process face swap
        const result = await engine.processFaceSwap({
          sourceImagePath: input.sourceImagePath,
          targetVideoPath: input.targetVideoPath,
          outputPath,
          quality: input.quality,
          gpuAcceleration: input.gpuAcceleration,
        });

        // Upload to storage
        const fileBuffer = await fs.readFile(result);
        const storageResult = await storagePut(
          `faceswap/${encodeURIComponent(userId)}/${Date.now()}-${randomUUID()}.mp4`,
          fileBuffer,
          "video/mp4"
        );
        await Promise.all(
          [input.sourceImagePath, input.targetVideoPath].map(filePath =>
            fs.unlink(filePath).catch(() => undefined)
          )
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
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const progress = getUserEngine(getUserId(ctx)).getProgress();
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
  download: protectedProcedure
    .input(z.object({ path: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const userPrefix = `faceswap/${encodeURIComponent(getUserId(ctx))}/`;
        if (!input.path.startsWith(userPrefix) || input.path.includes("..")) {
          throw new Error("Result does not belong to the current user");
        }
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
  cleanup: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const userId = getUserId(ctx);
      const engine = getUserEngine(userId);
      if (engine.getProgress().status === "processing") {
        throw new Error("Cannot clean up while processing is active");
      }
      await engine.cleanup(getUserTempDir(userId));
      faceSwapEngines.delete(userId);
      return { success: true };
    } catch (error) {
      throw new Error(`Cleanup failed: ${error}`);
    }
  }),
});

export default faceSwapHQRouter;
