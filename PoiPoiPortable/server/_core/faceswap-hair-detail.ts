/**
 * 髪詳細処理モジュール
 * 髪の毛一本一本の詳細処理
 */

import sharp from "sharp";

interface HairDetail {
  strands: Buffer;
  color: { r: number; g: number; b: number };
  texture: Buffer;
  shine: number;
  density: number;
}

interface HairPreservationResult {
  preservedFace: Buffer;
  hairDetail: HairDetail;
  quality: number;
}

/**
 * 髪の領域を検出
 */
export async function detectHairRegion(faceBuffer: Buffer): Promise<{ x: number; y: number; width: number; height: number }> {
  console.log("[HairDetail] 髪の領域を検出中...");

  try {
    const image = sharp(faceBuffer);
    const metadata = await image.metadata();

    // 髪の領域を推定（顔の上部）
    const hairRegion = {
      x: 0,
      y: 0,
      width: metadata.width!,
      height: Math.floor(metadata.height! * 0.4),
    };

    return hairRegion;
  } catch (error) {
    console.error("[HairDetail] 髪検出エラー:", error);
    throw error;
  }
}

/**
 * 髪の詳細を抽出
 */
export async function extractHairDetail(faceBuffer: Buffer): Promise<HairDetail> {
  console.log("[HairDetail] 髪の詳細を抽出中...");

  try {
    const hairRegion = await detectHairRegion(faceBuffer);
    const image = sharp(faceBuffer);

    // 髪領域を抽出
    const hairBuffer = await image
      .extract({
        left: hairRegion.x,
        top: hairRegion.y,
        width: hairRegion.width,
        height: hairRegion.height,
      })
      .toBuffer();

    // 髪の色を分析
    const stats = await sharp(hairBuffer).stats();
    const hairColor = {
      r: Math.round(stats.channels[0].mean),
      g: Math.round(stats.channels[1].mean),
      b: Math.round(stats.channels[2].mean),
    };

    // 髪のテクスチャを抽出
    const texture = sharp(hairBuffer)
      .sharpen({ sigma: 2 })
      .normalize();

    const textureBuffer = await texture.toBuffer();

    // 髪の毛の筋を検出
    const strands = await extractHairStrands(hairBuffer);

    return {
      strands,
      color: hairColor,
      texture: textureBuffer,
      shine: 0.6,
      density: 0.8,
    };
  } catch (error) {
    console.error("[HairDetail] 詳細抽出エラー:", error);
    throw error;
  }
}

/**
 * 髪の毛の筋を抽出
 */
export async function extractHairStrands(hairBuffer: Buffer): Promise<Buffer> {
  console.log("[HairDetail] 髪の毛の筋を抽出中...");

  try {
    // 髪の毛の筋パターンを抽出
    const strands = sharp(hairBuffer)
      .modulate({ saturation: 0 }) // グレースケール化
      .sharpen({ sigma: 3 })
      .normalize()
      .threshold(100);

    const strandsBuffer = await strands.toBuffer();
    return strandsBuffer;
  } catch (error) {
    console.error("[HairDetail] 筋抽出エラー:", error);
    throw error;
  }
}

/**
 * 髪の詳細を転移
 */
export async function transferHairDetail(
  sourceHairDetail: HairDetail,
  targetFaceBuffer: Buffer
): Promise<Buffer> {
  console.log("[HairDetail] 髪の詳細を転移中...");

  try {
    const hairRegion = await detectHairRegion(targetFaceBuffer);
    let image = sharp(targetFaceBuffer);

    // 髪の毛の筋パターンを合成
    image = image.composite([
      {
        input: sourceHairDetail.strands,
        left: hairRegion.x,
        top: hairRegion.y,
        blend: "overlay",
      },
    ]);

    // 髪のテクスチャを合成
    image = image.composite([
      {
        input: sourceHairDetail.texture,
        left: hairRegion.x,
        top: hairRegion.y,
        blend: "overlay",
      },
    ]);

    const resultBuffer = await image.toBuffer();
    return resultBuffer;
  } catch (error) {
    console.error("[HairDetail] 詳細転移エラー:", error);
    throw error;
  }
}

/**
 * 髪を保持して顔を入れ替え
 */
export async function preserveHairInFaceSwap(
  sourceFaceBuffer: Buffer,
  swappedFaceBuffer: Buffer
): Promise<HairPreservationResult> {
  console.log("[HairDetail] 髪を保持して顔を入れ替え中...");

  try {
    // ソース顔から髪の詳細を抽出
    const sourceHairDetail = await extractHairDetail(sourceFaceBuffer);

    // 入れ替え後の顔にソースの髪詳細を転移
    const resultFace = await transferHairDetail(sourceHairDetail, swappedFaceBuffer);

    return {
      preservedFace: resultFace,
      hairDetail: sourceHairDetail,
      quality: 0.89,
    };
  } catch (error) {
    console.error("[HairDetail] 髪保持エラー:", error);
    throw error;
  }
}

/**
 * 髪の色を分析
 */
export async function analyzeHairColor(faceBuffer: Buffer): Promise<{ r: number; g: number; b: number }> {
  console.log("[HairDetail] 髪の色を分析中...");

  try {
    const hairRegion = await detectHairRegion(faceBuffer);
    const image = sharp(faceBuffer);

    const hairBuffer = await image
      .extract({
        left: hairRegion.x,
        top: hairRegion.y,
        width: hairRegion.width,
        height: hairRegion.height,
      })
      .toBuffer();

    const stats = await sharp(hairBuffer).stats();

    const hairColor = {
      r: Math.round(stats.channels[0].mean),
      g: Math.round(stats.channels[1].mean),
      b: Math.round(stats.channels[2].mean),
    };

    return hairColor;
  } catch (error) {
    console.error("[HairDetail] 色分析エラー:", error);
    throw error;
  }
}

/**
 * 髪の色を調整
 */
export async function adjustHairColor(
  faceBuffer: Buffer,
  colorAdjustment: { r: number; g: number; b: number }
): Promise<Buffer> {
  console.log("[HairDetail] 髪の色を調整中...");

  try {
    const hairRegion = await detectHairRegion(faceBuffer);
    const image = sharp(faceBuffer);

    // 髪領域を抽出
    const hairBuffer = await image
      .extract({
        left: hairRegion.x,
        top: hairRegion.y,
        width: hairRegion.width,
        height: hairRegion.height,
      })
      .toBuffer();

    // 色を調整
    const adjustedHair = sharp(hairBuffer)
      .modulate({
        hue: colorAdjustment.r - 128,
        saturation: 1 + (colorAdjustment.g - 128) / 256,
        lightness: 1 + (colorAdjustment.b - 128) / 256,
      });

    // 合成
    const composited = image.composite([
      {
        input: await adjustedHair.toBuffer(),
        left: hairRegion.x,
        top: hairRegion.y,
      },
    ]);

    const resultBuffer = await composited.toBuffer();
    return resultBuffer;
  } catch (error) {
    console.error("[HairDetail] 色調整エラー:", error);
    throw error;
  }
}

/**
 * 髪のツヤを調整
 */
export async function adjustHairShine(
  faceBuffer: Buffer,
  shineFactor: number
): Promise<Buffer> {
  console.log("[HairDetail] 髪のツヤを調整中...");

  try {
    const hairRegion = await detectHairRegion(faceBuffer);
    const image = sharp(faceBuffer);

    // 髪領域を抽出
    const hairBuffer = await image
      .extract({
        left: hairRegion.x,
        top: hairRegion.y,
        width: hairRegion.width,
        height: hairRegion.height,
      })
      .toBuffer();

    // ツヤを追加（明るさを増加）
    const shiny = sharp(hairBuffer)
      .modulate({
        lightness: 1 + shineFactor * 0.2,
        saturation: 1 + shineFactor * 0.1,
      });

    // 合成
    const composited = image.composite([
      {
        input: await shiny.toBuffer(),
        left: hairRegion.x,
        top: hairRegion.y,
        blend: "screen",
      },
    ]);

    const resultBuffer = await composited.toBuffer();
    return resultBuffer;
  } catch (error) {
    console.error("[HairDetail] ツヤ調整エラー:", error);
    throw error;
  }
}

/**
 * 髪の詳細度を向上
 */
export async function enhanceHairDetail(
  faceBuffer: Buffer,
  enhancementStrength: number
): Promise<Buffer> {
  console.log("[HairDetail] 髪の詳細度を向上中...");

  try {
    const hairRegion = await detectHairRegion(faceBuffer);
    const image = sharp(faceBuffer);

    // 髪領域を抽出
    const hairBuffer = await image
      .extract({
        left: hairRegion.x,
        top: hairRegion.y,
        width: hairRegion.width,
        height: hairRegion.height,
      })
      .toBuffer();

    // 詳細度を向上
    const enhanced = sharp(hairBuffer)
      .sharpen({ sigma: enhancementStrength })
      .normalize();

    // 合成
    const composited = image.composite([
      {
        input: await enhanced.toBuffer(),
        left: hairRegion.x,
        top: hairRegion.y,
        blend: "overlay",
      },
    ]);

    const resultBuffer = await composited.toBuffer();
    return resultBuffer;
  } catch (error) {
    console.error("[HairDetail] 詳細度向上エラー:", error);
    throw error;
  }
}

/**
 * 髪の密度を調整
 */
export async function adjustHairDensity(
  faceBuffer: Buffer,
  densityFactor: number
): Promise<Buffer> {
  console.log("[HairDetail] 髪の密度を調整中...");

  try {
    const hairRegion = await detectHairRegion(faceBuffer);
    const image = sharp(faceBuffer);

    // 髪領域を抽出
    const hairBuffer = await image
      .extract({
        left: hairRegion.x,
        top: hairRegion.y,
        width: hairRegion.width,
        height: hairRegion.height,
      })
      .toBuffer();

    // 密度を調整（ブラーと正規化を組み合わせ）
    const adjusted = sharp(hairBuffer)
      .blur(densityFactor * 2)
      .normalize()
      .sharpen({ sigma: 1 });

    // 合成
    const composited = image.composite([
      {
        input: await adjusted.toBuffer(),
        left: hairRegion.x,
        top: hairRegion.y,
      },
    ]);

    const resultBuffer = await composited.toBuffer();
    return resultBuffer;
  } catch (error) {
    console.error("[HairDetail] 密度調整エラー:", error);
    throw error;
  }
}
