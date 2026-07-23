/**
 * 顔入れ替え品質向上モジュール
 * 高度なブレンディングと色調整で自然な結果を実現
 */

import sharp from "sharp";

export interface QualityOptions {
  blendingStrength?: number;
  featherRadius?: number;
  colorMatchStrength?: number;
  enhanceDetails?: boolean;
}

/**
 * 高度なシームレスブレンディング
 * 複数段階のフェザリングと色調整
 */
export async function advancedSeamlessBlending(
  targetBuffer: Buffer,
  sourceFaceBuffer: Buffer,
  bounds: any,
  options?: QualityOptions
): Promise<Buffer> {
  try {
    const featherRadius = options?.featherRadius || 50;
    const blendingStrength = options?.blendingStrength || 0.9;
    const colorMatchStrength = options?.colorMatchStrength || 0.85;

    // ステップ1: ソース顔をターゲットサイズにリサイズ
    const resizedSourceFace = await sharp(sourceFaceBuffer)
      .resize(bounds.width, bounds.height, {
        fit: "fill",
        kernel: "cubic",
      })
      .toBuffer();

    // ステップ2: 複数段階のフェザリング（エッジの自然化）
    const feathered1 = await sharp(resizedSourceFace)
      .blur(featherRadius / 6)
      .toBuffer();

    const feathered2 = await sharp(feathered1)
      .blur(featherRadius / 4)
      .toBuffer();

    const feathered3 = await sharp(feathered2)
      .blur(featherRadius / 2)
      .toBuffer();

    // ステップ3: 色調整（ターゲット画像に合わせる）
    const colorAdjusted = await adjustColorToMatch(
      feathered3,
      targetBuffer,
      bounds,
      colorMatchStrength
    );

    // ステップ4: 段階的な合成
    const intermediate1 = await sharp(targetBuffer)
      .composite([
        {
          input: feathered1,
          left: bounds.minX - Math.floor(featherRadius / 4),
          top: bounds.minY - Math.floor(featherRadius / 4),
          blend: "over",
        },
      ])
      .toBuffer();

    const intermediate2 = await sharp(intermediate1)
      .composite([
        {
          input: feathered2,
          left: bounds.minX - Math.floor(featherRadius / 2),
          top: bounds.minY - Math.floor(featherRadius / 2),
          blend: "over",
        },
      ])
      .toBuffer();

    const result = await sharp(intermediate2)
      .composite([
        {
          input: colorAdjusted,
          left: bounds.minX,
          top: bounds.minY,
          blend: "over",
        },
      ])
      .toBuffer();

    return result;
  } catch (error) {
    console.error("[QualityEnhancement] 高度なシームレスブレンディングエラー:", error);
    throw error;
  }
}

/**
 * 色調整（ターゲット画像に合わせる）
 */
async function adjustColorToMatch(
  sourceBuffer: Buffer,
  targetBuffer: Buffer,
  bounds: any,
  strength: number
): Promise<Buffer> {
  try {
    // ターゲット画像から周辺領域の色情報を抽出
    const targetRegion = await sharp(targetBuffer)
      .extract({
        left: Math.max(0, bounds.minX - 20),
        top: Math.max(0, bounds.minY - 20),
        width: bounds.width + 40,
        height: bounds.height + 40,
      })
      .toBuffer();

    // 色統計を計算
    const targetStats = await sharp(targetRegion).stats();
    const sourceStats = await sharp(sourceBuffer).stats();

    // 色補正を適用
    const colorCorrected = await sharp(sourceBuffer)
      .modulate({
        brightness:
          1 +
          (targetStats.channels[0].mean - sourceStats.channels[0].mean) /
            255 *
            strength,
        saturation:
          1 +
          (targetStats.channels[1].mean - sourceStats.channels[1].mean) /
            255 *
            strength,
      })
      .toBuffer();

    return colorCorrected;
  } catch (error) {
    console.error("[QualityEnhancement] 色調整エラー:", error);
    return sourceBuffer;
  }
}

/**
 * 詳細強調（シャープニング）
 */
export async function enhanceDetails(
  imageBuffer: Buffer,
  strength: number = 1.5
): Promise<Buffer> {
  try {
    const enhanced = await sharp(imageBuffer)
      .sharpen({
        sigma: strength,
      })
      .toBuffer();

    return enhanced;
  } catch (error) {
    console.error("[QualityEnhancement] 詳細強調エラー:", error);
    return imageBuffer;
  }
}

/**
 * 照明調整
 */
export async function adjustLighting(
  imageBuffer: Buffer,
  brightness: number = 0,
  contrast: number = 1
): Promise<Buffer> {
  try {
    const adjusted = await sharp(imageBuffer)
      .modulate({
        brightness: 1 + brightness / 100,
        saturation: contrast,
      })
      .toBuffer();

    return adjusted;
  } catch (error) {
    console.error("[QualityEnhancement] 照明調整エラー:", error);
    return imageBuffer;
  }
}

/**
 * 完全な品質向上処理パイプライン
 */
export async function applyQualityEnhancement(
  targetBuffer: Buffer,
  sourceFaceBuffer: Buffer,
  bounds: any,
  quality: "low" | "medium" | "high" = "medium"
): Promise<Buffer> {
  try {
    const options: QualityOptions = {
      featherRadius: quality === "high" ? 60 : quality === "medium" ? 40 : 20,
      blendingStrength: quality === "high" ? 0.95 : 0.85,
      colorMatchStrength: quality === "high" ? 0.9 : 0.75,
      enhanceDetails: quality === "high",
    };

    // ステップ1: 高度なシームレスブレンディング
    let result = await advancedSeamlessBlending(
      targetBuffer,
      sourceFaceBuffer,
      bounds,
      options
    );

    // ステップ2: 詳細強調（高品質のみ）
    if (quality === "high" && options.enhanceDetails) {
      result = await enhanceDetails(result, 1.2);
    }

    // ステップ3: 照明調整
    result = await adjustLighting(result, 0, 1.05);

    return result;
  } catch (error) {
    console.error("[QualityEnhancement] 品質向上処理エラー:", error);
    throw error;
  }
}
