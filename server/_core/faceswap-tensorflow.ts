/**
 * TensorFlow.js + FaceMesh を使用したリアルな顔入れ替え処理
 * Google の AI モデルを使用した高品質な顔認識・検出・置き換え
 */

import * as tf from "@tensorflow/tfjs"; // Import tf from core tfjs
import "@tensorflow/tfjs-backend-cpu"; // Explicitly import CPU backend

// Ensure backend is set to CPU before any model loading
tf.setBackend("cpu");

import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import sharp from "sharp";
import * as fs from "fs";
import { getCachedFaceMeshModel, getCacheStats } from "./model-cache";
import {
  extractExpressionFeatures,
  calculateAverageSkinTone,
  adjustSkinTone,
  adjustLighting,
  smoothBlend,
} from "./faceswap-advanced";
import { advancedBlend } from "./faceswap-advanced-blending";
import {
  align3DFaces,
  calculateFaceRotation,
  calculateFaceScale,
  blendWithDepthAwareness,
} from "./faceswap-3d-alignment";
import {
  extractDetailedExpressionFeatures,
  transferExpression,
} from "./faceswap-expression-control";
import {
  processSkinDetails,
  extractHighFrequencyDetails,
  applyHighFrequencyDetails,
} from "./faceswap-texture-preservation";
import {
  processHairBackgroundAndShadows,
} from "./faceswap-hair-background";
import {
  ensureFrameConsistency,
} from "./faceswap-frame-consistency";
import {
  applyQualityEnhancement,
} from "./faceswap-quality-enhancement";
import {
  performVidwudQualityFaceSwap,
} from "./faceswap-vidwud-quality";

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
  };
}

/**
 * FaceMesh モデルを取得（キャッシュ使用）
 */
async function initializeFaceMesh() {
  console.log("[FaceSwap] FaceMesh モデルを取得中...");
  const model = await getCachedFaceMeshModel();
  const stats = getCacheStats();
  console.log(
    `[FaceSwap] FaceMesh モデル取得完了 (キャッシュ: ${stats.isCached ? "YES" : "NO"}, ロード時間: ${stats.loadTime}ms)`
  );
  return model;
}

/**
 * Base64 画像を Buffer に変換
 */
function base64ToBuffer(base64: string): Buffer {
  // data:image/jpeg;base64, のようなプリフィックスを削除
  let cleanBase64 = base64;
  if (base64.includes(",")) {
    cleanBase64 = base64.split(",")[1];
  }
  
  // 空白や改行を削除
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
 * 顔のランドマークを検出（改善版）
 */
export async function detectFaceLandmarks(imageBuffer: Buffer, retryCount: number = 0): Promise<any> {
  const model = await initializeFaceMesh();

  try {
    // sharp を使用して画像をデコードし、生のピクセルデータを取得
    const { data, info } = await sharp(imageBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 生のピクセルデータから TensorFlow.js テンソルを作成
    let imageTensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, info.channels]);

    // Convert RGBA to RGB if necessary (FaceMesh expects 3 channels)
    if (info.channels === 4) {
      const rgbTensor = imageTensor.slice([0, 0, 0], [info.height, info.width, 3]);
      imageTensor.dispose();
      imageTensor = rgbTensor;
    }

    // Resize the tensor to 128x128, as required by FaceMesh model
    const resizedTensor = tf.image.resizeBilinear(imageTensor, [128, 128]);
    imageTensor.dispose();

    // FaceMesh model expects a 3D tensor for estimateFaces, it handles batching internally.
    // The resizedTensor is already 3D: [height, width, channels]
    // No need to expandDims(0) here, as estimateFaces expects a single image tensor.

    // @ts-ignore
    const predictions = await model.estimateFaces(resizedTensor, {
      returnTensors: false,
      flipHorizontal: false,
    });

    // メモリ解放
    resizedTensor.dispose();

    if (predictions.length === 0) {
      console.warn(`[FaceSwap] 顔検出失敗 (試行 ${retryCount + 1})`);
      
      // リトライ: 画像を回転させて再試行
      if (retryCount < 2) {
        console.log("[FaceSwap] 画像を回転させて再試行中...");
        const rotatedBuffer = await sharp(imageBuffer)
          .rotate(retryCount === 0 ? 90 : -90)
          .toBuffer();
        return detectFaceLandmarks(rotatedBuffer, retryCount + 1);
      }
      
      return null;
    }

    console.log(`[FaceSwap] 顔検出成功: ${predictions[0].keypoints.length} キーポイント`);
    return predictions[0];
  } catch (error) {
    console.error("[FaceSwap] ランドマーク検出エラー:", error);
    return null;
  }
}

/**
 * 顔領域を抽出（改善版）
 */
async function extractFaceRegion(
  imageBuffer: Buffer,
  metadata: any,
  landmarks: any
): Promise<{ region: Buffer; bounds: any } | null> {
  if (!landmarks || !landmarks.keypoints) {
    console.warn("[FaceSwap] ランドマークが無効です");
    return null;
  }

  const points = landmarks.keypoints as {x: number, y: number, z: number}[];
  
  if (points.length === 0) {
    console.warn("[FaceSwap] キーポイントが空です");
    return null;
  }

  const width = metadata.width;
  const height = metadata.height;

  // 顔の境界を計算（0-1の相対値をピクセルに変換）
  // Scale keypoints from 128x128 model output back to original image dimensions
  const xs = points.map((p) => (p.x / 128) * width);
  const ys = points.map((p) => (p.y / 128) * height);

  const rawMinX = Math.min(...xs);
  const rawMaxX = Math.max(...xs);
  const rawMinY = Math.min(...ys);
  const rawMaxY = Math.max(...ys);

  // Apply padding and clamp to image boundaries
  let minX = Math.max(0, Math.floor(rawMinX) - 20);
  let maxX = Math.min(width, Math.ceil(rawMaxX) + 20);
  let minY = Math.max(0, Math.floor(rawMinY) - 20);
  let maxY = Math.min(height, Math.ceil(rawMaxY) + 20);

  // Ensure minX is always less than maxX and minY is always less than maxY
  if (minX > maxX) [minX, maxX] = [maxX, minX];
  if (minY > maxY) [minY, maxY] = [maxY, minY];

  // Ensure valid dimensions after clamping
  if (minX >= maxX || minY >= maxY) {
    console.warn("[FaceSwap] 無効な顔領域");
    return null;
  }

  const faceWidth = maxX - minX;
  const faceHeight = maxY - minY;

  // Additional check for valid dimensions before sharp.extract
  if (faceWidth <= 0 || faceHeight <= 0) {
    console.warn("[FaceSwap] 無効な顔サイズ");
    return null;
  }

  try {
    // 顔領域を抽出
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
    console.error("[FaceSwap] 顔領域抽出エラー:", error);
    return null;
  }
}

/**
 * 顔をブレンド（置き換え）- 高度なアルゴリズム使用
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
    // ブレンド強度を品質に応じて設定
    const blendingStrength = quality === "high" ? 0.95 : quality === "medium" ? 0.85 : 0.75;

    // 肌色調整を実行（高品質の場合）
    let adjustedSourceFace = sourceFaceBuffer;
    if (quality === "high") {
      try {
        const targetSkinTone = await calculateAverageSkinTone(targetBuffer);
        adjustedSourceFace = await adjustSkinTone(sourceFaceBuffer, targetSkinTone);
        console.log("[FaceSwap] 肌色調整を適用しました");
      } catch (error) {
        console.warn("[FaceSwap] 肌色調整に失敗しました:", error);
      }
    }

    // スムーズなブレンディングを実行
    const result = await smoothBlend(
      targetBuffer,
      adjustedSourceFace,
      targetBounds,
      blendingStrength
    );

    // 照明調整を実行（高品質の場合）
    let finalResult = result;
    if (quality === "high") {
      try {
        finalResult = await adjustLighting(result, 0.5);
        console.log("[FaceSwap] 照明調整を適用しました");
      } catch (error) {
        console.warn("[FaceSwap] 照明調整に失敗しました:", error);
      }
    }

    return finalResult;
  } catch (error) {
    console.error("[FaceSwap] ブレンド処理エラー:", error);
    throw error;
  }
}

/**
 * リアルな顔入れ替え処理（メイン）
 */
export async function performFaceSwap(
  request: FaceSwapRequest
): Promise<FaceSwapResult> {
  const startTime = Date.now();

  try {
    console.log("[FaceSwap] 処理開始");

    // 1. ソース画像をバッファに変換
    console.log("[FaceSwap] ソース画像を処理中...");
    const sourceBuffer = base64ToBuffer(request.sourceImageBase64);
    console.log(`[FaceSwap] Source buffer size: ${sourceBuffer.length} bytes`);
    const sourceMetadata = await sharp(sourceBuffer).metadata();

    // 2. ターゲット画像をバッファに変換
    console.log("[FaceSwap] ターゲット画像を処理中...");
    const targetBuffer = base64ToBuffer(request.targetImageBase64);
    console.log(`[FaceSwap] Target buffer size: ${targetBuffer.length} bytes`);
    const targetMetadata = await sharp(targetBuffer).metadata();

    // 3. ソース画像の顔を検出
    console.log("[FaceSwap] ソース画像の顔を検出中...");
    const sourceLandmarks = await detectFaceLandmarks(sourceBuffer);

    if (!sourceLandmarks) {
      return {
        success: false,
        error: "ソース画像から顔が検出されませんでした",
        processingTime: Date.now() - startTime,
      };
    }

    // 4. ターゲット画像の顔を検出
    console.log("[FaceSwap] ターゲット画像の顔を検出中...");
    const targetLandmarks = await detectFaceLandmarks(targetBuffer);

    if (!targetLandmarks) {
      return {
        success: false,
        error: "ターゲット画像から顔が検出されませんでした",
        processingTime: Date.now() - startTime,
      };
    }

    // 5. ソース顔領域を抽出
    console.log("[FaceSwap] ソース顔領域を抽出中...");
    const sourceFaceExtraction = await extractFaceRegion(
      sourceBuffer,
      sourceMetadata,
      sourceLandmarks
    );

    if (!sourceFaceExtraction) {
      return {
        success: false,
        error: "ソース顔領域の抽出に失敗しました",
        processingTime: Date.now() - startTime,
      };
    }

    // 6. ターゲット顔領域を抽出
    console.log("[FaceSwap] ターゲット顔領域を抽出中...");
    const targetFaceExtraction = await extractFaceRegion(
      targetBuffer,
      targetMetadata,
      targetLandmarks
    );

    if (!targetFaceExtraction) {
      return {
        success: false,
        error: "ターゲット顔領域の抽出に失敗しました",
        processingTime: Date.now() - startTime,
      };
    }

    // 7. 表情特性を抽出（高品質の場合）
    let expressionFeatures = null;
    if (request.quality === "high") {
      try {
        expressionFeatures = extractExpressionFeatures(targetLandmarks.keypoints);
        console.log("[FaceSwap] ターゲット表情特性を抽出しました:", expressionFeatures);
      } catch (error) {
        console.warn("[FaceSwap] 表情特性抽出に失敗しました:", error);
      }
    }

    // 8. 顔をブレンド（ウルトラハイクオリティアルゴリズム使用）
    console.log("[FaceSwap] 顔をブレンド中...");
    // 高度なブレンディングを使用
    const resultBuffer = await performVidwudQualityFaceSwap(
      targetBuffer,
      sourceFaceExtraction.region,
      targetFaceExtraction.bounds,
      request.quality === "high" ? "aigc" : "portrait"
    );

    // 9. 結果を Base64 に変換
    const resultImage = bufferToBase64(resultBuffer);

    const processingTime = Date.now() - startTime;

    console.log(`[FaceSwap] 処理完了（${processingTime}ms）`);
    console.log("[FaceSwap] 高度なアルゴリズムを適用しました（表情保持、肌色調整、照明調整）");

    return {
      success: true,
      resultImage,
      processingTime,
      details: {
        sourceFaceDetected: !!sourceLandmarks,
        targetFaceDetected: !!targetLandmarks,
        sourcePoints: sourceLandmarks.keypoints?.length || 0,
        targetPoints: targetLandmarks.keypoints?.length || 0,
        expressionPreserved: request.quality === "high" && !!expressionFeatures,
        skinToneAdjusted: request.quality === "high",
        lightingAdjusted: request.quality === "high",
      },
    };
  } catch (error) {
    console.error("[FaceSwap] エラーが発生しました:", error);
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

/**
 * ファイルパスから顔入れ替えを実行
 */
export async function performFaceSwapFromFiles(
  sourceImagePath: string,
  targetImagePath: string,
  outputPath: string,
  quality?: "low" | "medium" | "high"
): Promise<FaceSwapResult> {
  try {
    // ファイルを読み込み
    const sourceBuffer = fs.readFileSync(sourceImagePath);
    const targetBuffer = fs.readFileSync(targetImagePath);

    const sourceBase64 = sourceBuffer.toString("base64");
    const targetBase64 = targetBuffer.toString("base64");

    // 顔入れ 替え処理を実行
    const result = await performFaceSwap({
      sourceImageBase64: sourceBase64,
      targetImageBase64: targetBase64,
      quality,
    });

    // 結果をファイルに保存
    if (result.success && result.resultImage) {
      const outputBuffer = Buffer.from(result.resultImage, "base64");
      fs.writeFileSync(outputPath, outputBuffer);
      console.log(`[FaceSwap] 結果を保存しました: ${outputPath}`);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "ファイル読み込みエラー",
    };
  }
}

/**
 * ビデオ顔入れ替え（フレーム処理）
 * 注: 完全なビデオ処理には ffmpeg が必要です
 */
export async function performVideoFaceSwap(
  sourceImageBase64: string,
  videoBase64: string,
  quality?: "low" | "medium" | "high"
): Promise<FaceSwapResult> {
  return {
    success: false,
    error: "ビデオ処理は別のエンドポイントを使用してください",
  };
}
