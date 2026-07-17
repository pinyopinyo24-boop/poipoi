/**
 * 詳細表情・筋肉制御システム
 * 468個のランドマークから細かい表情を抽出・制御
 */

export interface DetailedExpressionFeatures {
  eyeOpenness: { left: number; right: number };
  eyebrowHeight: { left: number; right: number };
  eyebrowAngle: { left: number; right: number };
  mouthOpenness: number;
  mouthWidth: number;
  mouthCornerHeight: { left: number; right: number };
  noseWidth: number;
  cheekHeight: { left: number; right: number };
  jawPosition: number;
  foreheadHeight: number;
}

/**
 * 左目の開き具合を計算
 */
function calculateLeftEyeOpenness(landmarks: any[]): number {
  if (!landmarks || landmarks.length < 468) return 0.5;

  // 左目のランドマーク
  const eyeTop = landmarks[159]; // 上
  const eyeBottom = landmarks[145]; // 下
  const eyeLeft = landmarks[133]; // 左
  const eyeRight = landmarks[33]; // 右

  const verticalDistance = Math.abs(eyeBottom.y - eyeTop.y);
  const horizontalDistance = Math.abs(eyeRight.x - eyeLeft.x);

  // 正規化（0-1）
  const openness = verticalDistance / (horizontalDistance * 0.3);
  return Math.min(1, Math.max(0, openness));
}

/**
 * 右目の開き具合を計算
 */
function calculateRightEyeOpenness(landmarks: any[]): number {
  if (!landmarks || landmarks.length < 468) return 0.5;

  // 右目のランドマーク
  const eyeTop = landmarks[386]; // 上
  const eyeBottom = landmarks[374]; // 下
  const eyeLeft = landmarks[263]; // 左
  const eyeRight = landmarks[362]; // 右

  const verticalDistance = Math.abs(eyeBottom.y - eyeTop.y);
  const horizontalDistance = Math.abs(eyeRight.x - eyeLeft.x);

  // 正規化（0-1）
  const openness = verticalDistance / (horizontalDistance * 0.3);
  return Math.min(1, Math.max(0, openness));
}

/**
 * 眉の高さを計算
 */
function calculateEyebrowHeight(landmarks: any[], side: "left" | "right"): number {
  if (!landmarks || landmarks.length < 468) return 0.5;

  const eyeIndex = side === "left" ? 33 : 263;
  const browIndex = side === "left" ? 70 : 300;

  const eye = landmarks[eyeIndex];
  const brow = landmarks[browIndex];

  // 眉と目の距離を計算
  const distance = Math.abs(brow.y - eye.y);
  const height = Math.max(0, 1 - distance / 50); // 正規化

  return Math.min(1, Math.max(0, height));
}

/**
 * 眉の角度を計算
 */
function calculateEyebrowAngle(landmarks: any[], side: "left" | "right"): number {
  if (!landmarks || landmarks.length < 468) return 0;

  const browIndices =
    side === "left" ? [70, 63, 105] : [300, 293, 334]; // 眉の3点
  const p1 = landmarks[browIndices[0]];
  const p2 = landmarks[browIndices[1]];
  const p3 = landmarks[browIndices[2]];

  // 眉の角度を計算
  const angle = Math.atan2(p3.y - p1.y, p3.x - p1.x);
  return angle * (180 / Math.PI);
}

/**
 * 口の開き具合を計算
 */
function calculateMouthOpenness(landmarks: any[]): number {
  if (!landmarks || landmarks.length < 468) return 0.5;

  // 口のランドマーク
  const mouthTop = landmarks[13]; // 上
  const mouthBottom = landmarks[14]; // 下

  const verticalDistance = Math.abs(mouthBottom.y - mouthTop.y);
  const openness = verticalDistance / 30; // 正規化

  return Math.min(1, Math.max(0, openness));
}

/**
 * 口の幅を計算
 */
function calculateMouthWidth(landmarks: any[]): number {
  if (!landmarks || landmarks.length < 468) return 0.5;

  // 口の左右のランドマーク
  const mouthLeft = landmarks[61]; // 左
  const mouthRight = landmarks[291]; // 右

  const horizontalDistance = Math.abs(mouthRight.x - mouthLeft.x);
  const width = horizontalDistance / 100; // 正規化

  return Math.min(1, Math.max(0, width));
}

/**
 * 口角の高さを計算
 */
function calculateMouthCornerHeight(landmarks: any[], side: "left" | "right"): number {
  if (!landmarks || landmarks.length < 468) return 0.5;

  const cornerIndex = side === "left" ? 61 : 291;
  const centerIndex = 13; // 口の中心

  const corner = landmarks[cornerIndex];
  const center = landmarks[centerIndex];

  // 口角が上に上がっているか下に下がっているかを計算
  const heightDifference = center.y - corner.y;
  const normalizedHeight = (heightDifference + 20) / 40; // 正規化

  return Math.min(1, Math.max(0, normalizedHeight));
}

/**
 * 鼻の幅を計算
 */
function calculateNoseWidth(landmarks: any[]): number {
  if (!landmarks || landmarks.length < 468) return 0.5;

  // 鼻のランドマーク
  const noseLeft = landmarks[114]; // 左
  const noseRight = landmarks[343]; // 右

  const width = Math.abs(noseRight.x - noseLeft.x);
  const normalizedWidth = width / 50; // 正規化

  return Math.min(1, Math.max(0, normalizedWidth));
}

/**
 * 頬の高さを計算
 */
function calculateCheekHeight(landmarks: any[], side: "left" | "right"): number {
  if (!landmarks || landmarks.length < 468) return 0.5;

  const cheekIndex = side === "left" ? 50 : 280;
  const bottomIndex = 152; // あご

  const cheek = landmarks[cheekIndex];
  const bottom = landmarks[bottomIndex];

  // 頬の高さを計算
  const height = Math.abs(bottom.y - cheek.y);
  const normalizedHeight = height / 100; // 正規化

  return Math.min(1, Math.max(0, normalizedHeight));
}

/**
 * あごの位置を計算
 */
function calculateJawPosition(landmarks: any[]): number {
  if (!landmarks || landmarks.length < 468) return 0.5;

  // あごのランドマーク
  const chin = landmarks[152]; // あご
  const nose = landmarks[1]; // 鼻

  // あごが前に出ているか後ろに引っ込んでいるかを計算
  const distance = chin.x - nose.x;
  const normalizedPosition = (distance + 50) / 100; // 正規化

  return Math.min(1, Math.max(0, normalizedPosition));
}

/**
 * 額の高さを計算
 */
function calculateForeheadHeight(landmarks: any[]): number {
  if (!landmarks || landmarks.length < 468) return 0.5;

  // 額のランドマーク
  const forehead = landmarks[10]; // 額
  const eyebrow = landmarks[70]; // 眉

  // 額の高さを計算
  const height = Math.abs(eyebrow.y - forehead.y);
  const normalizedHeight = height / 50; // 正規化

  return Math.min(1, Math.max(0, normalizedHeight));
}

/**
 * 詳細な表情特性を抽出
 */
export function extractDetailedExpressionFeatures(
  landmarks: any[]
): DetailedExpressionFeatures {
  return {
    eyeOpenness: {
      left: calculateLeftEyeOpenness(landmarks),
      right: calculateRightEyeOpenness(landmarks),
    },
    eyebrowHeight: {
      left: calculateEyebrowHeight(landmarks, "left"),
      right: calculateEyebrowHeight(landmarks, "right"),
    },
    eyebrowAngle: {
      left: calculateEyebrowAngle(landmarks, "left"),
      right: calculateEyebrowAngle(landmarks, "right"),
    },
    mouthOpenness: calculateMouthOpenness(landmarks),
    mouthWidth: calculateMouthWidth(landmarks),
    mouthCornerHeight: {
      left: calculateMouthCornerHeight(landmarks, "left"),
      right: calculateMouthCornerHeight(landmarks, "right"),
    },
    noseWidth: calculateNoseWidth(landmarks),
    cheekHeight: {
      left: calculateCheekHeight(landmarks, "left"),
      right: calculateCheekHeight(landmarks, "right"),
    },
    jawPosition: calculateJawPosition(landmarks),
    foreheadHeight: calculateForeheadHeight(landmarks),
  };
}

/**
 * 表情を転移（ソースの表情をターゲットに適用）
 */
export function transferExpression(
  targetFeatures: DetailedExpressionFeatures,
  sourceFeatures: DetailedExpressionFeatures,
  transferStrength: number = 0.8
): DetailedExpressionFeatures {
  const blend = (target: number, source: number) =>
    target * (1 - transferStrength) + source * transferStrength;

  return {
    eyeOpenness: {
      left: blend(targetFeatures.eyeOpenness.left, sourceFeatures.eyeOpenness.left),
      right: blend(targetFeatures.eyeOpenness.right, sourceFeatures.eyeOpenness.right),
    },
    eyebrowHeight: {
      left: blend(targetFeatures.eyebrowHeight.left, sourceFeatures.eyebrowHeight.left),
      right: blend(targetFeatures.eyebrowHeight.right, sourceFeatures.eyebrowHeight.right),
    },
    eyebrowAngle: {
      left: blend(targetFeatures.eyebrowAngle.left, sourceFeatures.eyebrowAngle.left),
      right: blend(targetFeatures.eyebrowAngle.right, sourceFeatures.eyebrowAngle.right),
    },
    mouthOpenness: blend(targetFeatures.mouthOpenness, sourceFeatures.mouthOpenness),
    mouthWidth: blend(targetFeatures.mouthWidth, sourceFeatures.mouthWidth),
    mouthCornerHeight: {
      left: blend(targetFeatures.mouthCornerHeight.left, sourceFeatures.mouthCornerHeight.left),
      right: blend(targetFeatures.mouthCornerHeight.right, sourceFeatures.mouthCornerHeight.right),
    },
    noseWidth: blend(targetFeatures.noseWidth, sourceFeatures.noseWidth),
    cheekHeight: {
      left: blend(targetFeatures.cheekHeight.left, sourceFeatures.cheekHeight.left),
      right: blend(targetFeatures.cheekHeight.right, sourceFeatures.cheekHeight.right),
    },
    jawPosition: blend(targetFeatures.jawPosition, sourceFeatures.jawPosition),
    foreheadHeight: blend(targetFeatures.foreheadHeight, sourceFeatures.foreheadHeight),
  };
}

/**
 * 表情特性を文字列で説明
 */
export function describeExpression(features: DetailedExpressionFeatures): string {
  const parts: string[] = [];

  if (features.eyeOpenness.left > 0.7) parts.push("目が大きく開いている");
  if (features.eyeOpenness.left < 0.3) parts.push("目を細めている");

  if (features.eyebrowHeight.left > 0.7) parts.push("眉が上がっている");
  if (features.eyebrowHeight.left < 0.3) parts.push("眉が下がっている");

  if (features.mouthOpenness > 0.7) parts.push("口が大きく開いている");
  if (features.mouthOpenness < 0.2) parts.push("口を閉じている");

  if (features.mouthCornerHeight.left > 0.6 && features.mouthCornerHeight.right > 0.6)
    parts.push("笑顔");
  if (features.mouthCornerHeight.left < 0.4 && features.mouthCornerHeight.right < 0.4)
    parts.push("不満そう");

  return parts.length > 0 ? parts.join("、") : "中立的な表情";
}
