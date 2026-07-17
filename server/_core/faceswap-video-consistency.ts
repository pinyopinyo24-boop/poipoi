/**
 * 動画フレーム一貫性モジュール
 * フレーム間の完全な一貫性を保証
 */

import sharp from "sharp";

interface FrameData {
  frameIndex: number;
  timestamp: number;
  buffer: Buffer;
  landmarks: number[][];
  features: Record<string, number>;
}

interface ConsistencyMetrics {
  opticalFlow: number;
  colorConsistency: number;
  landmarkConsistency: number;
  overallScore: number;
}

/**
 * フレーム間のオプティカルフローを計算
 */
export async function calculateOpticalFlow(
  frame1: Buffer,
  frame2: Buffer,
  windowSize: number = 15
): Promise<number> {
  console.log("[VideoConsistency] オプティカルフローを計算中...");

  try {
    // フレームをグレースケール化
    const gray1 = await sharp(frame1)
      .grayscale()
      .raw()
      .toBuffer();

    const gray2 = await sharp(frame2)
      .grayscale()
      .raw()
      .toBuffer();

    // オプティカルフローを計算（簡略版: 差分）
    let totalFlow = 0;
    const pixelCount = Math.min(gray1.length, gray2.length);

    for (let i = 0; i < pixelCount; i++) {
      const diff = Math.abs(gray1[i] - gray2[i]);
      totalFlow += diff;
    }

    const averageFlow = totalFlow / pixelCount / 255;
    return averageFlow;
  } catch (error) {
    console.error("[VideoConsistency] オプティカルフロー計算エラー:", error);
    throw error;
  }
}

/**
 * フレーム間の色一貫性を計算
 */
export async function calculateColorConsistency(
  frame1: Buffer,
  frame2: Buffer
): Promise<number> {
  console.log("[VideoConsistency] 色一貫性を計算中...");

  try {
    const stats1 = await sharp(frame1).stats();
    const stats2 = await sharp(frame2).stats();

    // 各チャネルの平均値の差を計算
    let colorDiff = 0;
    for (let i = 0; i < 3; i++) {
      colorDiff += Math.abs(stats1.channels[i].mean - stats2.channels[i].mean);
    }

    const consistency = 1 - colorDiff / (3 * 255);
    return Math.max(0, consistency);
  } catch (error) {
    console.error("[VideoConsistency] 色一貫性計算エラー:", error);
    throw error;
  }
}

/**
 * ランドマーク間の一貫性を計算
 */
export function calculateLandmarkConsistency(
  landmarks1: number[][],
  landmarks2: number[][]
): number {
  console.log("[VideoConsistency] ランドマーク一貫性を計算中...");

  if (landmarks1.length !== landmarks2.length) {
    return 0;
  }

  let totalDistance = 0;

  for (let i = 0; i < landmarks1.length; i++) {
    const dx = landmarks1[i][0] - landmarks2[i][0];
    const dy = landmarks1[i][1] - landmarks2[i][1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    totalDistance += distance;
  }

  const averageDistance = totalDistance / landmarks1.length;
  const consistency = 1 - Math.min(1, averageDistance / 100); // 正規化
  return consistency;
}

/**
 * フレーム間の一貫性メトリクスを計算
 */
export async function calculateConsistencyMetrics(
  frame1: FrameData,
  frame2: FrameData
): Promise<ConsistencyMetrics> {
  console.log("[VideoConsistency] 一貫性メトリクスを計算中...");

  try {
    const opticalFlow = await calculateOpticalFlow(frame1.buffer, frame2.buffer);
    const colorConsistency = await calculateColorConsistency(frame1.buffer, frame2.buffer);
    const landmarkConsistency = calculateLandmarkConsistency(frame1.landmarks, frame2.landmarks);

    const overallScore = (opticalFlow + colorConsistency + landmarkConsistency) / 3;

    return {
      opticalFlow,
      colorConsistency,
      landmarkConsistency,
      overallScore,
    };
  } catch (error) {
    console.error("[VideoConsistency] メトリクス計算エラー:", error);
    throw error;
  }
}

/**
 * フレーム間のちらつきを除去
 */
export async function removeFlicker(
  frames: Buffer[],
  windowSize: number = 5
): Promise<Buffer[]> {
  console.log("[VideoConsistency] ちらつきを除去中...");

  try {
    const smoothedFrames: Buffer[] = [];

    for (let i = 0; i < frames.length; i++) {
      // ウィンドウ内のフレームを取得
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(frames.length, i + Math.floor(windowSize / 2) + 1);
      const window = frames.slice(start, end);

      // フレームを平均化
      const averaged = await averageFrames(window);
      smoothedFrames.push(averaged);
    }

    return smoothedFrames;
  } catch (error) {
    console.error("[VideoConsistency] ちらつき除去エラー:", error);
    throw error;
  }
}

/**
 * フレームを平均化
 */
async function averageFrames(frames: Buffer[]): Promise<Buffer> {
  console.log("[VideoConsistency] フレームを平均化中...");

  try {
    if (frames.length === 0) {
      throw new Error("フレームが空です");
    }

    if (frames.length === 1) {
      return frames[0];
    }

    // 最初のフレームを基準として使用
    let averaged = sharp(frames[0]);

    // 他のフレームを合成
    const composites = [];
    for (let i = 1; i < frames.length; i++) {
      composites.push({
        input: frames[i],
        blend: "lighten" as const,
      });
    }

    if (composites.length > 0) {
      averaged = averaged.composite(composites);
    }

    const resultBuffer = await averaged.toBuffer();
    return resultBuffer;
  } catch (error) {
    console.error("[VideoConsistency] フレーム平均化エラー:", error);
    throw error;
  }
}

/**
 * 光の一貫性を保証
 */
export async function ensureLightingConsistency(
  frames: Buffer[],
  targetBrightness: number = 0.5
): Promise<Buffer[]> {
  console.log("[VideoConsistency] 光の一貫性を保証中...");

  try {
    const consistentFrames: Buffer[] = [];

    for (const frame of frames) {
      // フレームの明るさを分析
      const stats = await sharp(frame).stats();
      const currentBrightness = (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / (3 * 255);

      // 目標の明るさに調整
      const brightnessFactor = targetBrightness / (currentBrightness || 1);

      const adjusted = sharp(frame).modulate({
        lightness: brightnessFactor,
      });

      const resultBuffer = await adjusted.toBuffer();
      consistentFrames.push(resultBuffer);
    }

    return consistentFrames;
  } catch (error) {
    console.error("[VideoConsistency] 光一貫性エラー:", error);
    throw error;
  }
}

/**
 * フレーム間の色補正
 */
export async function correctColorBetweenFrames(
  frames: Buffer[]
): Promise<Buffer[]> {
  console.log("[VideoConsistency] フレーム間の色補正中...");

  try {
    const correctedFrames: Buffer[] = [];

    // 最初のフレームを基準とする
    const referenceStats = await sharp(frames[0]).stats();

    for (const frame of frames) {
      const frameStats = await sharp(frame).stats();

      // 各チャネルの補正係数を計算
      const corrections = [];
      for (let i = 0; i < 3; i++) {
        corrections.push(referenceStats.channels[i].mean / (frameStats.channels[i].mean || 1));
      }

      // 補正を適用
      let corrected = sharp(frame);

      // 色補正（簡略版）
      corrected = corrected.modulate({
        hue: (corrections[0] - 1) * 50,
        saturation: corrections[1],
        lightness: corrections[2],
      });

      const resultBuffer = await corrected.toBuffer();
      correctedFrames.push(resultBuffer);
    }

    return correctedFrames;
  } catch (error) {
    console.error("[VideoConsistency] 色補正エラー:", error);
    throw error;
  }
}

/**
 * フレーム間のモーション補正
 */
export async function correctMotionBetweenFrames(
  frames: FrameData[],
  maxMotion: number = 10
): Promise<FrameData[]> {
  console.log("[VideoConsistency] フレーム間のモーション補正中...");

  try {
    const correctedFrames: FrameData[] = [];

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];

      if (i === 0) {
        correctedFrames.push(frame);
        continue;
      }

      // 前フレームとの差を計算
      const prevFrame = frames[i - 1];
      let maxDiff = 0;

      for (let j = 0; j < frame.landmarks.length; j++) {
        const dx = frame.landmarks[j][0] - prevFrame.landmarks[j][0];
        const dy = frame.landmarks[j][1] - prevFrame.landmarks[j][1];
        const diff = Math.sqrt(dx * dx + dy * dy);
        maxDiff = Math.max(maxDiff, diff);
      }

      // モーションが大きすぎる場合は補正
      if (maxDiff > maxMotion) {
        const correctionFactor = maxMotion / maxDiff;

        const correctedLandmarks = frame.landmarks.map((landmark, j) => {
          const dx = landmark[0] - prevFrame.landmarks[j][0];
          const dy = landmark[1] - prevFrame.landmarks[j][1];
          return [
            prevFrame.landmarks[j][0] + dx * correctionFactor,
            prevFrame.landmarks[j][1] + dy * correctionFactor,
          ];
        });

        correctedFrames.push({
          ...frame,
          landmarks: correctedLandmarks,
        });
      } else {
        correctedFrames.push(frame);
      }
    }

    return correctedFrames;
  } catch (error) {
    console.error("[VideoConsistency] モーション補正エラー:", error);
    throw error;
  }
}
