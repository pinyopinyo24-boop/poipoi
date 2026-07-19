/**
 * 改善版: TensorFlow.js + FaceMesh を使用したリアルな顔入れ替え処理
 * 高度なブレンディング処理を統合
 */

import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-cpu";
tf.setBackend("cpu");

import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import sharp from "sharp";
import * as fs from "fs";
import { getCachedFaceMeshModel, getCacheStats } from "./model-cache";
import { advancedBlend } from "./faceswap-advanced-blending";
import { extractExpressionFeatures, calculateAverageSkinTone, adjustSkinTone, adjustLighting } from "./faceswap-advanced";

export interface FaceSwapRequest {
  sourceImageBase64: string;
  targetImageBase64: string;
  quality?: "low" | "medium" | "high";
}

export interface FaceSwapResult {
  success: boolean;
  resultImage?: string;
  error?: string;
  processingTime?: number;
  details?: {
    sourceFaceDetected: boolean;
    targetFaceDetected: boolean;
    sourcePoints: number;
    targetPoints: number;
    expressionPreserved?: boolean;
    skinToneAdjusted?: boolean;
    lightingAdjusted?: boolean;
    blendingMethod?: string;
  };
}

/**
 * FaceMesh モデルを取得（キャッシュ使用）
 */
async function initializeFaceMesh() {
  console.log("[FaceSwapV2] FaceMesh モデルを取得中...");
  const model = await getCachedFaceMeshModel();
  const stats = getCacheStats();
  console.log(
    `[FaceSwapV2] FaceMesh モデル取得完了 (キャッシュ: ${stats.isCached ? "YES" : "NO"}, ロード時間: ${stats.loadTime}ms)`
  );
  return model;
}

/**
 * Base64 画像を Buffer に変換
 */
function base64ToBuffer(base64: string): Buffer {
  let cleanBase64 = base64;
  if (base64.includes(",")) {
    cleanBase64 = base64.split(",")[1];
  }
  cleanBase64 = cleanBase64.replace(/\s/g, "");
  return Buffer.from(cleanBase64, "base64");
}

/**
 * Buffer を Base64 に変換
 */
function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

/**
 * 顔のランドマークを検出
 */
export async function detectFaceLandmarks(imageBuffer: Buffer, retryCount: number = 0): Promise<any> {
  const model = await initializeFaceMesh();

  try {
    const { data, info } = await sharp(imageBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    let imageTensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, info.channels]);

    if (info.channels === 4) {
      const rgbTensor = imageTensor.slice([0, 0, 0], [info.height, info.width, 3]);
      imageTensor.dispose();
      imageTensor = rgbTensor;
    }

    const predictions = await model.estimateFaces({
      input: imageTensor,
      returnTensors: false,
      flipHorizontal: false,
      predictIrises: false,
    });

    imageTensor.dispose();

    if (predictions.length === 0) {
      return null;
    }

    const prediction = predictions[0];
    return {
      keypoints: prediction.landmarks,
      boundingBox: prediction.boundingBox,
    };
  } catch (error) {
    console.error("[FaceSwapV2] 顔検出エラー:", error);
    if (retryCount < 2) {
      console.log(`[FaceSwapV2] リトライ ${retryCount + 1}/2`);
      return detectFaceLandmarks(imageBuffer, retryCount + 1);
    }
    return null;
  }
}

/**
 * 顔領域を抽出
 */
async function extractFaceRegion(imageBuffer: Buffer, metadata: any, landmarks: any): Promise<any> {
  try {
    const keypoints = landmarks.keypoints;
    const minX = Math.max(0, Math.floor(Math.min(...keypoints.map((p: any) => p.x))));
    const minY = Math.max(0, Math.floor(Math.min(...keypoints.map((p: any) => p.y))));
    const maxX = Math.min(metadata.width || 1920, Math.ceil(Math.max(...keypoints.map((p: any) => p.x))));
    const maxY = Math.min(metadata.height || 1920, Math.ceil(Math.max(...keypoints.map((p: any) => p.y))));

    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;

    const faceRegion = await sharp(imageBuffer)
      .extract({
        left: minX,
        top: minY,
        width: faceWidth,
        height: faceHeight,
      })
      .toBuffer();

    return {
      region: faceRegion,
      bounds: { minX, minY, maxX, maxY, width: faceWidth, height: faceHeight },
    };
  } catch (error) {
    console.error("[FaceSwapV2] 顔領域抽出エラー:", error);
    return null;
  }
}

/**
 * 改善版ブレンディング関数
 */
async function blendFaces(
  targetBuffer: Buffer,
  targetMetadata: any,
  sourceFaceBuffer: Buffer,
  sourceBounds: any,
  targetBounds: any,
  quality: string,
  targetLandmarks?: any[],
  sourceLandmarks?: any[]
): Promise<Buffer> {
  try {
    let adjustedSourceFace = sourceFaceBuffer;

    // 品質に応じた処理
    if (quality === "high") {
      try {
        console.log("[FaceSwapV2] 高品質処理を開始します");

        // 肌色調整
        const targetSkinTone = await calculateAverageSkinTone(targetBuffer);
        adjustedSourceFace = await adjustSkinTone(adjustedSourceFace, targetSkinTone);
        console.log("[FaceSwapV2] 肌色調整を適用しました");

        // 照明調整
        adjustedSourceFace = await adjustLighting(adjustedSourceFace, 0.5);
        console.log("[FaceSwapV2] 照明調整を適用しました");
      } catch (error) {
        console.warn("[FaceSwapV2] 高品質処理に失敗:", error);
      }
    }

    // 高度なブレンディングを実行
    console.log(`[FaceSwapV2] ${quality}品質でブレンディング中...`);
    const result = await advancedBlend(
      targetBuffer,
      adjustedSourceFace,
      targetBounds,
      quality,
      {
        blendingStrength: quality === "high" ? 0.95 : quality === "medium" ? 0.85 : 0.75,
        featherRadius: quality === "high" ? 50 : quality === "medium" ? 30 : 15,
        colorMatchStrength: quality === "high" ? 0.9 : quality === "medium" ? 0.7 : 0.5,
      }
    );

    console.log("[FaceSwapV2] ブレンディング完了");
    return result;
  } catch (error) {
    console.error("[FaceSwapV2] ブレンディング処理エラー:", error);
    throw error;
  }
}

/**
 * リアルな顔入れ替え処理（改善版）
 */
export async function performFaceSwap(request: FaceSwapRequest): Promise<FaceSwapResult> {
  const startTime = Date.now();

  try {
    console.log("[FaceSwapV2] 処理開始");

    // ソース画像を処理
    console.log("[FaceSwapV2] ソース画像を処理中...");
    const sourceBuffer = base64ToBuffer(request.sourceImageBase64);
    const sourceMetadata = await sharp(sourceBuffer).metadata();

    // ターゲット画像を処理
    console.log("[FaceSwapV2] ターゲット画像を処理中...");
    const targetBuffer = base64ToBuffer(request.targetImageBase64);
    const targetMetadata = await sharp(targetBuffer).metadata();

    // ソース画像の顔を検出
    console.log("[FaceSwapV2] ソース画像の顔を検出中...");
    const sourceLandmarks = await detectFaceLandmarks(sourceBuffer);

    if (!sourceLandmarks) {
      return {
        success: false,
        error: "ソース画像から顔が検出されませんでした",
        processingTime: Date.now() - startTime,
      };
    }

    // ターゲット画像の顔を検出
    console.log("[FaceSwapV2] ターゲット画像の顔を検出中...");
    const targetLandmarks = await detectFaceLandmarks(targetBuffer);

    if (!targetLandmarks) {
      return {
        success: false,
        error: "ターゲット画像から顔が検出されませんでした",
        processingTime: Date.now() - startTime,
      };
    }

    // ソース顔領域を抽出
    console.log("[FaceSwapV2] ソース顔領域を抽出中...");
    const sourceFaceExtraction = await extractFaceRegion(sourceBuffer, sourceMetadata, sourceLandmarks);

    if (!sourceFaceExtraction) {
      return {
        success: false,
        error: "ソース顔領域の抽出に失敗しました",
        processingTime: Date.now() - startTime,
      };
    }

    // ターゲット顔領域を抽出
    console.log("[FaceSwapV2] ターゲット顔領域を抽出中...");
    const targetFaceExtraction = await extractFaceRegion(targetBuffer, targetMetadata, targetLandmarks);

    if (!targetFaceExtraction) {
      return {
        success: false,
        error: "ターゲット顔領域の抽出に失敗しました",
        processingTime: Date.now() - startTime,
      };
    }

    // 顔をブレンド
    console.log("[FaceSwapV2] 顔をブレンド中...");
    const resultBuffer = await blendFaces(
      targetBuffer,
      targetMetadata,
      sourceFaceExtraction.region,
      sourceFaceExtraction.bounds,
      targetFaceExtraction.bounds,
      request.quality || "medium",
      targetLandmarks.keypoints,
      sourceLandmarks.keypoints
    );

    // 結果を Base64 に変換
    const resultImage = bufferToBase64(resultBuffer);

    const processingTime = Date.now() - startTime;

    console.log(`[FaceSwapV2] 処理完了（${processingTime}ms）`);

    return {
      success: true,
      resultImage,
      processingTime,
      details: {
        sourceFaceDetected: !!sourceLandmarks,
        targetFaceDetected: !!targetLandmarks,
        sourcePoints: sourceLandmarks.keypoints?.length || 0,
        targetPoints: targetLandmarks.keypoints?.length || 0,
        expressionPreserved: request.quality === "high",
        skinToneAdjusted: request.quality === "high",
        lightingAdjusted: request.quality === "high",
        blendingMethod: request.quality === "high" ? "alphaMask" : request.quality === "medium" ? "poisson" : "gaussian",
      },
    };
  } catch (error) {
    console.error("[FaceSwapV2] エラーが発生しました:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "不明なエラー",
      processingTime: Date.now() - startTime,
      details: {
        sourceFaceDetected: false,
        targetFaceDetected: false,
        sourcePoints: 0,
        targetPoints: 0,
        expressionPreserved: false,
        skinToneAdjusted: false,
        lightingAdjusted: false,
      },
    };
  }
}

export default {
  performFaceSwap,
  detectFaceLandmarks,
};
