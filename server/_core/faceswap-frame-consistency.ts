/**
 * 複数フレーム間の一貫性向上（動画用）
 * 光フロー・オプティカルフロー計算によるちらつき除去
 */

import sharp from "sharp";

export interface OpticalFlowVector {
  x: number;
  y: number;
  magnitude: number;
}

/**
 * 2フレーム間の光フローを計算
 */
export async function calculateOpticalFlow(
  frame1Buffer: Buffer,
  frame2Buffer: Buffer,
  gridSize: number = 16
): Promise<OpticalFlowVector[][]> {
  try {
    // フレームをグレースケールに変換
    const { data: frame1Data, info: info1 } = await sharp(frame1Buffer)
      .modulate({ saturation: 0 })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data: frame2Data } = await sharp(frame2Buffer)
      .modulate({ saturation: 0 })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info1.width || 640;
    const height = info1.height || 480;
    const cellWidth = Math.floor(width / gridSize);
    const cellHeight = Math.floor(height / gridSize);

    const flowVectors: OpticalFlowVector[][] = [];

    // グリッドごとに光フローを計算
    for (let gy = 0; gy < gridSize; gy++) {
      flowVectors[gy] = [];
      for (let gx = 0; gx < gridSize; gx++) {
        const x = gx * cellWidth;
        const y = gy * cellHeight;

        // セル内の平均差分を計算
        let sumDx = 0;
        let sumDy = 0;
        let count = 0;

        for (let dy = 0; dy < cellHeight && y + dy < height; dy++) {
          for (let dx = 0; dx < cellWidth && x + dx < width; dx++) {
            const idx1 = ((y + dy) * width + (x + dx)) * (info1.channels || 1);
            const idx2 = idx1;

            if (idx1 < frame1Data.length && idx2 < frame2Data.length) {
              const diff = frame2Data[idx2] - frame1Data[idx1];
              sumDx += diff;
              count++;
            }
          }
        }

        const avgFlow = count > 0 ? sumDx / count : 0;
        const magnitude = Math.abs(avgFlow);

        flowVectors[gy][gx] = {
          x: avgFlow,
          y: 0, // 簡略化（水平方向のみ）
          magnitude,
        };
      }
    }

    return flowVectors;
  } catch (error) {
    console.error("[FrameConsistency] 光フロー計算エラー:", error);
    return [];
  }
}

/**
 * ちらつきを除去（フレーム間の急激な変化を平滑化）
 */
export async function removeFlicker(
  currentFrameBuffer: Buffer,
  previousFrameBuffer: Buffer,
  smoothingStrength: number = 0.7
): Promise<Buffer> {
  try {
    const { data: currentData, info } = await sharp(currentFrameBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data: previousData } = await sharp(previousFrameBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // フレーム間の差分を計算
    const smoothed = new Uint8Array(currentData.length);
    for (let i = 0; i < currentData.length; i++) {
      // 前フレームと現フレームを混合
      smoothed[i] = Math.round(
        currentData[i] * (1 - smoothingStrength) +
          previousData[i] * smoothingStrength
      );
    }

    // 結果をバッファに変換
    const result = await sharp(Buffer.from(smoothed), {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels || 3,
      },
    }).toBuffer();

    return result;
  } catch (error) {
    console.error("[FrameConsistency] ちらつき除去エラー:", error);
    return currentFrameBuffer;
  }
}

/**
 * 光の一貫性を保持
 */
export async function maintainLightingConsistency(
  currentFrameBuffer: Buffer,
  previousFrameBuffer: Buffer
): Promise<Buffer> {
  try {
    // 前フレームの平均明度を計算
    const { data: prevData } = await sharp(previousFrameBuffer)
      .modulate({ saturation: 0 })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let prevBrightness = 0;
    for (let i = 0; i < prevData.length; i++) {
      prevBrightness += prevData[i];
    }
    prevBrightness /= prevData.length;

    // 現フレームの平均明度を計算
    const { data: currData } = await sharp(currentFrameBuffer)
      .modulate({ saturation: 0 })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let currBrightness = 0;
    for (let i = 0; i < currData.length; i++) {
      currBrightness += currData[i];
    }
    currBrightness /= currData.length;

    // 明度の差分を計算
    const brightnessDiff = currBrightness - prevBrightness;
    const brightnessAdjustment = 1 - brightnessDiff / 255 * 0.1; // 最大10%調整

    // 明度を調整
    const adjusted = await sharp(currentFrameBuffer)
      .modulate({
        brightness: brightnessAdjustment,
      })
      .toBuffer();

    return adjusted;
  } catch (error) {
    console.error("[FrameConsistency] 光の一貫性保持エラー:", error);
    return currentFrameBuffer;
  }
}

/**
 * より滑らかな動画生成
 */
export async function smoothVideoTransition(
  frames: Buffer[],
  transitionFrames: number = 5
): Promise<Buffer[]> {
  try {
    if (frames.length < 2) return frames;

    const result: Buffer[] = [];

    for (let i = 0; i < frames.length - 1; i++) {
      result.push(frames[i]);

      // フレーム間に補間フレームを挿入
      for (let j = 1; j < transitionFrames; j++) {
        const ratio = j / transitionFrames;

        // 2つのフレームを混合
        const { data: frame1Data, info } = await sharp(frames[i])
          .raw()
          .toBuffer({ resolveWithObject: true });

        const { data: frame2Data } = await sharp(frames[i + 1])
          .raw()
          .toBuffer({ resolveWithObject: true });

        const blended = new Uint8Array(frame1Data.length);
        for (let k = 0; k < frame1Data.length; k++) {
          blended[k] = Math.round(
            frame1Data[k] * (1 - ratio) + frame2Data[k] * ratio
          );
        }

        const blendedBuffer = await sharp(Buffer.from(blended), {
          raw: {
            width: info.width,
            height: info.height,
            channels: info.channels || 3,
          },
        }).toBuffer();

        result.push(blendedBuffer);
      }
    }

    // 最後のフレームを追加
    result.push(frames[frames.length - 1]);

    return result;
  } catch (error) {
    console.error("[FrameConsistency] 動画スムージングエラー:", error);
    return frames;
  }
}

/**
 * フレーム一貫性の統合処理
 */
export async function ensureFrameConsistency(
  frames: Buffer[],
  options: {
    removeFlicker?: boolean;
    maintainLighting?: boolean;
    smoothTransition?: boolean;
    transitionFrames?: number;
  } = {}
): Promise<Buffer[]> {
  try {
    const {
      removeFlicker: shouldRemoveFlicker = true,
      maintainLighting: shouldMaintainLighting = true,
      smoothTransition: shouldSmoothTransition = true,
      transitionFrames = 5,
    } = options;

    let result = frames;

    // ちらつきを除去
    if (shouldRemoveFlicker && result.length > 1) {
      const flickerRemoved: Buffer[] = [result[0]];
      for (let i = 1; i < result.length; i++) {
        const smoothed = await removeFlicker(result[i], result[i - 1], 0.6);
        flickerRemoved.push(smoothed);
      }
      result = flickerRemoved;
    }

    // 光の一貫性を保持
    if (shouldMaintainLighting && result.length > 1) {
      const lightingMaintained: Buffer[] = [result[0]];
      for (let i = 1; i < result.length; i++) {
        const consistent = await maintainLightingConsistency(
          result[i],
          result[i - 1]
        );
        lightingMaintained.push(consistent);
      }
      result = lightingMaintained;
    }

    // スムーズな遷移を作成
    if (shouldSmoothTransition && result.length > 1) {
      result = await smoothVideoTransition(result, transitionFrames);
    }

    return result;
  } catch (error) {
    console.error("[FrameConsistency] フレーム一貫性処理エラー:", error);
    return frames;
  }
}
