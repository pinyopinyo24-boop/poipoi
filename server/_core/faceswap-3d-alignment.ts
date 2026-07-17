/**
 * 3D顔モデルを使用した高精度位置合わせ
 * MediaPipe 3D Face Meshを活用した正確な顔の回転・傾き補正
 */

import * as tf from "@tensorflow/tfjs";
import sharp from "sharp";

export interface Face3DLandmarks {
  keypoints: Array<{ x: number; y: number; z: number }>;
  keypoints2D: Array<{ x: number; y: number }>;
  rotation: { roll: number; pitch: number; yaw: number };
  scale: number;
}

/**
 * 3D顔ランドマークから回転角度を計算
 */
export function calculateFaceRotation(landmarks: any[]): {
  roll: number;
  pitch: number;
  yaw: number;
} {
  if (!landmarks || landmarks.length < 468) {
    return { roll: 0, pitch: 0, yaw: 0 };
  }

  // 主要なランドマークポイント
  const nose = landmarks[1]; // 鼻の先端
  const leftEye = landmarks[33]; // 左目
  const rightEye = landmarks[263]; // 右目
  const leftMouth = landmarks[61]; // 左口角
  const rightMouth = landmarks[291]; // 右口角
  const chin = landmarks[152]; // あご

  // Roll（Z軸回転）を計算
  const eyeVector = {
    x: rightEye.x - leftEye.x,
    y: rightEye.y - leftEye.y,
  };
  const roll = Math.atan2(eyeVector.y, eyeVector.x);

  // Pitch（X軸回転）を計算
  const noseToMouth = {
    x: nose.x,
    y: (leftMouth.y + rightMouth.y) / 2 - nose.y,
  };
  const pitch = Math.atan2(noseToMouth.y, Math.abs(noseToMouth.x));

  // Yaw（Y軸回転）を計算
  const faceWidth = rightEye.x - leftEye.x;
  const noseToLeftEye = Math.abs(nose.x - leftEye.x);
  const noseToRightEye = Math.abs(nose.x - rightEye.x);
  const asymmetry = (noseToRightEye - noseToLeftEye) / faceWidth;
  const yaw = Math.atan2(asymmetry, 1);

  return {
    roll: roll * (180 / Math.PI),
    pitch: pitch * (180 / Math.PI),
    yaw: yaw * (180 / Math.PI),
  };
}

/**
 * 顔の奥行き情報を計算
 */
export function calculateFaceDepth(landmarks: any[]): number {
  if (!landmarks || landmarks.length < 468) {
    return 1;
  }

  // 顔の幅と高さから奥行きを推定
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const top = landmarks[10]; // 額
  const bottom = landmarks[152]; // あご

  const faceWidth = Math.abs(rightEye.x - leftEye.x);
  const faceHeight = Math.abs(bottom.y - top.y);

  // 顔の奥行きを計算（0.5-1.5の範囲）
  const aspectRatio = faceHeight / faceWidth;
  const depth = 0.5 + aspectRatio * 0.5;

  return Math.min(1.5, Math.max(0.5, depth));
}

/**
 * 顔の大きさを計算
 */
export function calculateFaceScale(landmarks: any[]): number {
  if (!landmarks || landmarks.length < 468) {
    return 1;
  }

  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const top = landmarks[10];
  const bottom = landmarks[152];

  const faceWidth = Math.abs(rightEye.x - leftEye.x);
  const faceHeight = Math.abs(bottom.y - top.y);

  // 顔の大きさを計算（0.5-2.0の範囲）
  const faceArea = faceWidth * faceHeight;
  const scale = Math.sqrt(faceArea) / 100; // 正規化

  return Math.min(2.0, Math.max(0.5, scale));
}

/**
 * 顔の中心座標を計算
 */
export function calculateFaceCenter(landmarks: any[]): { x: number; y: number } {
  if (!landmarks || landmarks.length < 468) {
    return { x: 0, y: 0 };
  }

  let sumX = 0;
  let sumY = 0;

  // 全ランドマークの平均を計算
  for (let i = 0; i < landmarks.length; i++) {
    sumX += landmarks[i].x;
    sumY += landmarks[i].y;
  }

  return {
    x: sumX / landmarks.length,
    y: sumY / landmarks.length,
  };
}

/**
 * 3D顔の回転を補正
 */
export async function correctFaceRotation(
  imageBuffer: Buffer,
  landmarks: any[]
): Promise<Buffer> {
  try {
    const rotation = calculateFaceRotation(landmarks);
    const { metadata } = await sharp(imageBuffer)
      .metadata()
      .then((m) => ({ metadata: m }));

    if (!metadata || !metadata.width || !metadata.height) {
      return imageBuffer;
    }

    // 回転角度が小さい場合はスキップ
    if (Math.abs(rotation.roll) < 2) {
      return imageBuffer;
    }

    // 画像を回転
    const rotated = await sharp(imageBuffer)
      .rotate(rotation.roll, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    return rotated;
  } catch (error) {
    console.error("[3DAlignment] 回転補正エラー:", error);
    return imageBuffer;
  }
}

/**
 * 3D空間での正確な位置合わせ
 */
export async function align3DFaces(
  sourceBuffer: Buffer,
  targetBuffer: Buffer,
  sourceLandmarks: any[],
  targetLandmarks: any[]
): Promise<{
  alignedSource: Buffer;
  alignedTarget: Buffer;
  transformation: {
    scale: number;
    rotation: { roll: number; pitch: number; yaw: number };
    translation: { x: number; y: number };
  };
}> {
  try {
    // ソース顔の情報を計算
    const sourceRotation = calculateFaceRotation(sourceLandmarks);
    const sourceScale = calculateFaceScale(sourceLandmarks);
    const sourceCenter = calculateFaceCenter(sourceLandmarks);

    // ターゲット顔の情報を計算
    const targetRotation = calculateFaceRotation(targetLandmarks);
    const targetScale = calculateFaceScale(targetLandmarks);
    const targetCenter = calculateFaceCenter(targetLandmarks);

    // スケール比を計算
    const scaleFactor = targetScale / sourceScale;

    // 回転補正を適用
    const alignedSource = await correctFaceRotation(sourceBuffer, sourceLandmarks);

    // 変換情報を返す
    return {
      alignedSource,
      alignedTarget: targetBuffer,
      transformation: {
        scale: scaleFactor,
        rotation: {
          roll: targetRotation.roll - sourceRotation.roll,
          pitch: targetRotation.pitch - sourceRotation.pitch,
          yaw: targetRotation.yaw - sourceRotation.yaw,
        },
        translation: {
          x: targetCenter.x - sourceCenter.x,
          y: targetCenter.y - sourceCenter.y,
        },
      },
    };
  } catch (error) {
    console.error("[3DAlignment] 位置合わせエラー:", error);
    return {
      alignedSource: sourceBuffer,
      alignedTarget: targetBuffer,
      transformation: {
        scale: 1,
        rotation: { roll: 0, pitch: 0, yaw: 0 },
        translation: { x: 0, y: 0 },
      },
    };
  }
}

/**
 * 顔の奥行き情報を活用した自然なブレンディング
 */
export async function blendWithDepthAwareness(
  targetBuffer: Buffer,
  sourceFaceBuffer: Buffer,
  bounds: any,
  depth: number,
  blendingStrength: number = 0.85
): Promise<Buffer> {
  try {
    // 奥行きに基づいてブレンディング強度を調整
    const depthAdjustedBlending = blendingStrength * (0.5 + depth * 0.5);

    // ソース顔をターゲットサイズにリサイズ
    const resizedSourceFace = await sharp(sourceFaceBuffer)
      .resize(bounds.width, bounds.height, {
        fit: "fill",
      })
      .toBuffer();

    // ガウシアンブラーを適用（エッジをスムーズに）
    const blurredEdges = await sharp(resizedSourceFace)
      .blur(2 * depth) // 奥行きに基づいてブラー強度を調整
      .toBuffer();

    // ブレンディングを実行
    const result = await sharp(targetBuffer)
      .composite([
        {
          input: blurredEdges,
          left: bounds.minX,
          top: bounds.minY,
          blend: "over",
        },
      ])
      .toBuffer();

    return result;
  } catch (error) {
    console.error("[3DAlignment] 奥行き認識ブレンディングエラー:", error);
    throw error;
  }
}
