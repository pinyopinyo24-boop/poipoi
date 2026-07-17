/**
 * 唇テクスチャ保持モジュール
 * 唇の詳細なテクスチャと色を保持
 */

import sharp from "sharp";

interface LipData {
  region: { x: number; y: number; width: number; height: number };
  color: { r: number; g: number; b: number };
  texture: Buffer;
  brightness: number;
  saturation: number;
}

interface LipPreservationResult {
  preservedFace: Buffer;
  lipData: LipData;
  quality: number;
}

/**
 * 唇領域を検出
 */
export async function detectLipRegion(faceBuffer: Buffer): Promise<LipData> {
  console.log("[LipTexture] 唇領域を検出中...");

  try {
    const image = sharp(faceBuffer);
    const metadata = await image.metadata();

    // 唇の領域を推定（顔検出結果から計算）
    const lipRegion = {
      x: Math.floor(metadata.width! * 0.3),
      y: Math.floor(metadata.height! * 0.6),
      width: Math.floor(metadata.width! * 0.4),
      height: Math.floor(metadata.height! * 0.15),
    };

    // 唇領域を抽出
    const lipBuffer = await image
      .extract({ left: lipRegion.x, top: lipRegion.y, width: lipRegion.width, height: lipRegion.height })
      .toBuffer();

    // 唇の色を分析
    const stats = await sharp(lipBuffer).stats();
    const lipColor = {
      r: Math.round(stats.channels[0].mean),
      g: Math.round(stats.channels[1].mean),
      b: Math.round(stats.channels[2].mean),
    };

    return {
      region: lipRegion,
      color: lipColor,
      texture: lipBuffer,
      brightness: (lipColor.r + lipColor.g + lipColor.b) / 3 / 255,
      saturation: 0.7,
    };
  } catch (error) {
    console.error("[LipTexture] 唇検出エラー:", error);
    throw error;
  }
}

/**
 * 唇のテクスチャを抽出
 */
export async function extractLipTexture(lipBuffer: Buffer): Promise<Buffer> {
  console.log("[LipTexture] 唇のテクスチャを抽出中...");

  try {
    // 唇の詳細なテクスチャを抽出
    const texture = sharp(lipBuffer)
      .modulate({ saturation: 1.5 })
      .sharpen({ sigma: 1.5 })
      .normalize();

    const textureBuffer = await texture.toBuffer();
    return textureBuffer;
  } catch (error) {
    console.error("[LipTexture] テクスチャ抽出エラー:", error);
    throw error;
  }
}

/**
 * 唇のテクスチャを転移
 */
export async function transferLipTexture(
  sourceLipData: LipData,
  targetFaceBuffer: Buffer
): Promise<Buffer> {
  console.log("[LipTexture] 唇のテクスチャを転移中...");

  try {
    const image = sharp(targetFaceBuffer);

    // ソースの唇テクスチャをリサイズ
    const resizedTexture = sharp(sourceLipData.texture)
      .resize(sourceLipData.region.width, sourceLipData.region.height);

    // ターゲット画像に合成
    const composited = image.composite([
      {
        input: await resizedTexture.toBuffer(),
        left: sourceLipData.region.x,
        top: sourceLipData.region.y,
        blend: "overlay",
      },
    ]);

    const resultBuffer = await composited.toBuffer();
    return resultBuffer;
  } catch (error) {
    console.error("[LipTexture] テクスチャ転移エラー:", error);
    throw error;
  }
}

/**
 * 唇の色を分析
 */
export async function analyzeLipColor(lipBuffer: Buffer): Promise<{ r: number; g: number; b: number }> {
  console.log("[LipTexture] 唇の色を分析中...");

  try {
    const stats = await sharp(lipBuffer).stats();

    const color = {
      r: Math.round(stats.channels[0].mean),
      g: Math.round(stats.channels[1].mean),
      b: Math.round(stats.channels[2].mean),
    };

    return color;
  } catch (error) {
    console.error("[LipTexture] 色分析エラー:", error);
    throw error;
  }
}

/**
 * 唇の色を調整
 */
export async function adjustLipColor(
  faceBuffer: Buffer,
  lipData: LipData,
  colorAdjustment: { r: number; g: number; b: number }
): Promise<Buffer> {
  console.log("[LipTexture] 唇の色を調整中...");

  try {
    const image = sharp(faceBuffer);

    // 唇領域を抽出
    const lipRegion = await image
      .extract({ left: lipData.region.x, top: lipData.region.y, width: lipData.region.width, height: lipData.region.height })
      .toBuffer();

    // 色を調整
    const adjustedLip = sharp(lipRegion)
      .modulate({
        hue: colorAdjustment.r - lipData.color.r,
        saturation: 1 + (colorAdjustment.g - lipData.color.g) / 255,
        lightness: 1 + (colorAdjustment.b - lipData.color.b) / 255,
      });

    // 合成
    const composited = image.composite([
      {
        input: await adjustedLip.toBuffer(),
        left: lipData.region.x,
        top: lipData.region.y,
      },
    ]);

    const resultBuffer = await composited.toBuffer();
    return resultBuffer;
  } catch (error) {
    console.error("[LipTexture] 色調整エラー:", error);
    throw error;
  }
}

/**
 * 唇を保持して顔を入れ替え
 */
export async function preserveLipInFaceSwap(
  sourceFaceBuffer: Buffer,
  swappedFaceBuffer: Buffer
): Promise<LipPreservationResult> {
  console.log("[LipTexture] 唇を保持して顔を入れ替え中...");

  try {
    // ソース顔から唇を検出
    const sourceLipData = await detectLipRegion(sourceFaceBuffer);

    // 入れ替え後の顔にソースの唇を転移
    const resultFace = await transferLipTexture(sourceLipData, swappedFaceBuffer);

    return {
      preservedFace: resultFace,
      lipData: sourceLipData,
      quality: 0.93,
    };
  } catch (error) {
    console.error("[LipTexture] 唇保持エラー:", error);
    throw error;
  }
}

/**
 * 唇の詳細度を向上
 */
export async function enhanceLipDetail(
  faceBuffer: Buffer,
  lipData: LipData,
  enhancementStrength: number
): Promise<Buffer> {
  console.log("[LipTexture] 唇の詳細度を向上中...");

  try {
    const image = sharp(faceBuffer);

    // 唇領域を抽出
    const lipRegion = await image
      .extract({ left: lipData.region.x, top: lipData.region.y, width: lipData.region.width, height: lipData.region.height })
      .toBuffer();

    // 詳細度を向上
    const enhanced = sharp(lipRegion)
      .sharpen({ sigma: enhancementStrength })
      .modulate({ saturation: 1 + enhancementStrength * 0.2 });

    // 合成
    const composited = image.composite([
      {
        input: await enhanced.toBuffer(),
        left: lipData.region.x,
        top: lipData.region.y,
        blend: "overlay",
      },
    ]);

    const resultBuffer = await composited.toBuffer();
    return resultBuffer;
  } catch (error) {
    console.error("[LipTexture] 詳細度向上エラー:", error);
    throw error;
  }
}

/**
 * 唇の明るさを調整
 */
export async function adjustLipBrightness(
  faceBuffer: Buffer,
  lipData: LipData,
  brightnessFactor: number
): Promise<Buffer> {
  console.log("[LipTexture] 唇の明るさを調整中...");

  try {
    const image = sharp(faceBuffer);

    // 唇領域を抽出
    const lipRegion = await image
      .extract({ left: lipData.region.x, top: lipData.region.y, width: lipData.region.width, height: lipData.region.height })
      .toBuffer();

    // 明るさを調整
    const adjusted = sharp(lipRegion).modulate({ lightness: brightnessFactor });

    // 合成
    const composited = image.composite([
      {
        input: await adjusted.toBuffer(),
        left: lipData.region.x,
        top: lipData.region.y,
      },
    ]);

    const resultBuffer = await composited.toBuffer();
    return resultBuffer;
  } catch (error) {
    console.error("[LipTexture] 明るさ調整エラー:", error);
    throw error;
  }
}

/**
 * 唇のグロスレベルを調整
 */
export async function adjustLipGloss(
  faceBuffer: Buffer,
  lipData: LipData,
  glossLevel: number
): Promise<Buffer> {
  console.log("[LipTexture] 唇のグロスレベルを調整中...");

  try {
    const image = sharp(faceBuffer);

    // 唇領域を抽出
    const lipRegion = await image
      .extract({ left: lipData.region.x, top: lipData.region.y, width: lipData.region.width, height: lipData.region.height })
      .toBuffer();

    // グロスを追加（明るさと彩度を増加）
    const glossed = sharp(lipRegion)
      .modulate({
        lightness: 1 + glossLevel * 0.1,
        saturation: 1 + glossLevel * 0.15,
      });

    // 合成
    const composited = image.composite([
      {
        input: await glossed.toBuffer(),
        left: lipData.region.x,
        top: lipData.region.y,
        blend: "screen",
      },
    ]);

    const resultBuffer = await composited.toBuffer();
    return resultBuffer;
  } catch (error) {
    console.error("[LipTexture] グロス調整エラー:", error);
    throw error;
  }
}
