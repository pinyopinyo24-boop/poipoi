/**
 * Video Face Processing Router
 * Handles video frame extraction, detection, and processing
 */

import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  processVideoFrame,
  processVideoFramesBatch,
  detectFacesInFrame,
  selectBestFrame,
  estimateProcessingTime,
  createVideoProcessingJob,
} from "./_core/video-face-processing";

export const videoFaceProcessingRouter = router({
  /**
   * Process a single video frame with face swap
   */
  processFrame: publicProcedure
    .input(
      z.object({
        frameBase64: z.string().describe("Video frame (Base64)"),
        sourceImageBase64: z.string().describe("Source image (Base64)"),
        quality: z.enum(["low", "medium", "high"]).optional().describe("Processing quality"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await processVideoFrame(
          input.frameBase64,
          input.sourceImageBase64,
          input.quality || "medium"
        );

        if (!result) {
          return {
            success: false,
            error: "顔が検出されませんでした",
          };
        }

        return {
          success: true,
          frame: result,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "フレーム処理に失敗しました",
        };
      }
    }),

  /**
   * Detect faces in a video frame
   */
  detectFaces: publicProcedure
    .input(
      z.object({
        frameBase64: z.string().describe("Video frame (Base64)"),
      })
    )
    .query(async ({ input }) => {
      try {
        const detection = await detectFacesInFrame(input.frameBase64);

        if (!detection) {
          return {
            success: false,
            error: "顔検出に失敗しました",
          };
        }

        return {
          success: true,
          detected: detection.detected,
          confidence: detection.confidence,
          landmarks: detection.landmarks,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "顔検出エラー",
        };
      }
    }),

  /**
   * Process multiple video frames in batch
   */
  processBatch: publicProcedure
    .input(
      z.object({
        frames: z.array(
          z.object({
            frameIndex: z.number(),
            timestamp: z.number(),
            base64: z.string(),
            width: z.number(),
            height: z.number(),
          })
        ).describe("Video frames"),
        sourceImageBase64: z.string().describe("Source image (Base64)"),
        quality: z.enum(["low", "medium", "high"]).optional().describe("Processing quality"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const results = await processVideoFramesBatch(
          input.frames,
          input.sourceImageBase64,
          input.quality || "medium"
        );

        return {
          success: true,
          processedFrames: results.length,
          frames: results,
          totalFrames: input.frames.length,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "バッチ処理に失敗しました",
        };
      }
    }),

  /**
   * Select the best frame for face swap
   */
  selectBestFrame: publicProcedure
    .input(
      z.object({
        frames: z.array(
          z.object({
            frameIndex: z.number(),
            timestamp: z.number(),
            base64: z.string(),
            width: z.number(),
            height: z.number(),
          })
        ).describe("Video frames"),
      })
    )
    .query(async ({ input }) => {
      try {
        const bestFrame = await selectBestFrame(input.frames);

        if (!bestFrame) {
          return {
            success: false,
            error: "適切なフレームが見つかりませんでした",
          };
        }

        return {
          success: true,
          frame: bestFrame,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "フレーム選択に失敗しました",
        };
      }
    }),

  /**
   * Estimate video processing time
   */
  estimateTime: publicProcedure
    .input(
      z.object({
        totalFrames: z.number().describe("Total number of frames"),
        quality: z.enum(["low", "medium", "high"]).optional().describe("Processing quality"),
      })
    )
    .query(async ({ input }) => {
      const estimatedTime = estimateProcessingTime(
        input.totalFrames,
        input.quality || "medium"
      );

      return {
        success: true,
        estimatedTimeMs: estimatedTime,
        estimatedTimeSec: Math.round(estimatedTime / 1000),
        estimatedTimeMin: Math.round(estimatedTime / 60000),
      };
    }),

  /**
   * Create a video processing job
   */
  createJob: publicProcedure
    .input(
      z.object({
        videoId: z.string().describe("Video ID"),
        totalFrames: z.number().describe("Total number of frames"),
        quality: z.enum(["low", "medium", "high"]).optional().describe("Processing quality"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const job = createVideoProcessingJob(
          input.videoId,
          input.totalFrames,
          input.quality || "medium"
        );

        return {
          success: true,
          job,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "ジョブ作成に失敗しました",
        };
      }
    }),
});

export default videoFaceProcessingRouter;
