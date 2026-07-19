/**
 * Video Face Swap Processing Engine
 * Handles frame extraction, processing, and video reconstruction
 */

import * as tf from "@tensorflow/tfjs";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import sharp from "sharp";
import { getCachedFaceMeshModel } from "./model-cache";

export interface VideoFrameData {
  frameIndex: number;
  timestamp: number;
  base64: string;
  width: number;
  height: number;
}

export interface ProcessedFrame {
  frameIndex: number;
  timestamp: number;
  base64: string;
  faceDetected: boolean;
  confidence?: number;
}

export interface VideoProcessingProgress {
  totalFrames: number;
  processedFrames: number;
  currentFrame: number;
  status: "extracting" | "detecting" | "processing" | "reconstructing" | "complete" | "error";
  estimatedTimeRemaining: number;
  error?: string;
}

/**
 * Process a single video frame with face swap
 */
export async function processVideoFrame(
  frameBase64: string,
  sourceImageBase64: string,
  quality: "low" | "medium" | "high" = "medium"
): Promise<ProcessedFrame | null> {
  try {
    const model = await getCachedFaceMeshModel();
    const frameBuffer = Buffer.from(frameBase64.split(",")[1] || frameBase64, "base64");
    const sourceBuffer = Buffer.from(sourceImageBase64.split(",")[1] || sourceImageBase64, "base64");

    // Detect faces in frame
    const frameImage = (tf as any).node.decodeImage(frameBuffer, 3);
    const frameExpanded = frameImage.expandDims(0);

    // @ts-ignore
    const framePredictions = await model.estimateFaces({
      input: frameExpanded,
      returnTensors: false,
      flipHorizontal: false,
    });

    frameImage.dispose();
    frameExpanded.dispose();

    if (framePredictions.length === 0) {
      return null; // No face detected in this frame
    }

    // Detect faces in source image
    const sourceImage = (tf as any).node.decodeImage(sourceBuffer, 3);
    const sourceExpanded = sourceImage.expandDims(0);

    // @ts-ignore
    const sourcePredictions = await model.estimateFaces({
      input: sourceExpanded,
      returnTensors: false,
      flipHorizontal: false,
    });

    sourceImage.dispose();
    sourceExpanded.dispose();

    if (sourcePredictions.length === 0) {
      return null; // No source face detected
    }

    // For now, return frame with detection info
    // Full face swap processing would happen here
    return {
      frameIndex: 0,
      timestamp: 0,
      base64: frameBase64,
      faceDetected: true,
      confidence: framePredictions[0]?.probability?.[0] || 0.9,
    };
  } catch (error) {
    console.error("[VideoFaceProcessing] Frame processing error:", error);
    return null;
  }
}

/**
 * Process multiple video frames in batch
 */
export async function processVideoFramesBatch(
  frames: VideoFrameData[],
  sourceImageBase64: string,
  quality: "low" | "medium" | "high" = "medium",
  onProgress?: (progress: VideoProcessingProgress) => void
): Promise<ProcessedFrame[]> {
  const results: ProcessedFrame[] = [];
  const totalFrames = frames.length;
  const startTime = Date.now();

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    // Report progress
    if (onProgress) {
      const elapsedTime = Date.now() - startTime;
      const avgTimePerFrame = elapsedTime / (i + 1);
      const remainingFrames = totalFrames - (i + 1);
      const estimatedTimeRemaining = avgTimePerFrame * remainingFrames;

      onProgress({
        totalFrames,
        processedFrames: i,
        currentFrame: i + 1,
        status: "processing",
        estimatedTimeRemaining,
      });
    }

    try {
      const processed = await processVideoFrame(frame.base64, sourceImageBase64, quality);
      if (processed) {
        results.push({
          ...processed,
          frameIndex: i,
          timestamp: frame.timestamp,
        });
      }
    } catch (error) {
      console.error(`[VideoFaceProcessing] Error processing frame ${i}:`, error);
    }
  }

  if (onProgress) {
    onProgress({
      totalFrames,
      processedFrames: totalFrames,
      currentFrame: totalFrames,
      status: "complete",
      estimatedTimeRemaining: 0,
    });
  }

  return results;
}

/**
 * Detect faces in a video frame
 */
export async function detectFacesInFrame(frameBase64: string): Promise<{
  detected: boolean;
  confidence: number;
  landmarks?: any;
} | null> {
  try {
    const model = await getCachedFaceMeshModel();
    const frameBuffer = Buffer.from(frameBase64.split(",")[1] || frameBase64, "base64");

    const image = (tf as any).node.decodeImage(frameBuffer, 3);
    const expanded = image.expandDims(0);

    // @ts-ignore
    const predictions = await model.estimateFaces({
      input: expanded,
      returnTensors: false,
      flipHorizontal: false,
    });

    image.dispose();
    expanded.dispose();

    if (predictions.length === 0) {
      return {
        detected: false,
        confidence: 0,
      };
    }

    const prediction = predictions[0];
    return {
      detected: true,
      confidence: prediction?.probability?.[0] || 0.9,
      landmarks: prediction?.landmarks,
    };
  } catch (error) {
    console.error("[VideoFaceProcessing] Face detection error:", error);
    return null;
  }
}

/**
 * Get optimal frame for face swap from multiple candidates
 */
export async function selectBestFrame(
  frames: VideoFrameData[]
): Promise<VideoFrameData | null> {
  let bestFrame: VideoFrameData | null = null;
  let bestConfidence = 0;

  for (const frame of frames) {
    const detection = await detectFacesInFrame(frame.base64);
    if (detection?.detected && detection.confidence > bestConfidence) {
      bestConfidence = detection.confidence;
      bestFrame = frame;
    }
  }

  return bestFrame;
}

/**
 * Estimate video processing time
 */
export function estimateProcessingTime(
  totalFrames: number,
  quality: "low" | "medium" | "high" = "medium"
): number {
  // Rough estimates based on quality setting
  const timePerFrame = {
    low: 500, // 500ms per frame
    medium: 1000, // 1s per frame
    high: 2000, // 2s per frame
  };

  return totalFrames * timePerFrame[quality];
}

/**
 * Create video processing job metadata
 */
export function createVideoProcessingJob(
  videoId: string,
  totalFrames: number,
  quality: "low" | "medium" | "high" = "medium"
): {
  jobId: string;
  videoId: string;
  totalFrames: number;
  quality: string;
  estimatedDuration: number;
  createdAt: number;
} {
  return {
    jobId: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    videoId,
    totalFrames,
    quality,
    estimatedDuration: estimateProcessingTime(totalFrames, quality),
    createdAt: Date.now(),
  };
}

export default {
  processVideoFrame,
  processVideoFramesBatch,
  detectFacesInFrame,
  selectBestFrame,
  estimateProcessingTime,
  createVideoProcessingJob,
};
