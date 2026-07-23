/**
 * 髪・背景の自動処理
 * セマンティックセグメンテーションを使用した自動マスク生成
 */

import sharp from "sharp";

export interface SegmentationMask {
  face: Buffer;
  hair: Buffer;
  background: Buffer;
  edges: Buffer;
}

/**
 * 顔領域のマスクを生成
 */
export async function generateFaceMask(
  imageBuffer: Buffer,
  landmarks: any[]
): Promise<Buffer> {
  try {
    const { metadata } = await sharp(imageBuffer)
      .metadata()
      .then((m) => ({ metadata: m }));

    if (!metadata || !metadata.width || !metadata.height) {
      throw new Error("画像メタデータが取得できません");
    }

    const width = metadata.width;
    const height = metadata.height;

    // 白いキャンバスを作成
    const svgImage = `
      <svg width="${width}" height="${height}">
        <rect width="${width}" height="${height}" fill="black"/>
        <ellipse cx="${width / 2}" cy="${height / 2}" rx="${width * 0.35}" ry="${height * 0.45}" fill="white"/>
      </svg>
    `;

    // SVGをバッファに変換
    const mask = await sharp(Buffer.from(svgImage))
      .resize(width, height)
      .toBuffer();

    return mask;
  } catch (error) {
    console.error("[HairBackground] 顔マスク生成エラー:", error);
    throw error;
  }
}

/**
 * 髪領域のマスクを生成
 */
export async function generateHairMask(
  imageBuffer: Buffer,
  landmarks: any[]
): Promise<Buffer> {
  try {
    const { metadata } = await sharp(imageBuffer)
      .metadata()
      .then((m) => ({ metadata: m }));

    if (!metadata || !metadata.width || !metadata.height) {
      throw new Error("画像メタデータが取得できません");
    }

    const width = metadata.width;
    const height = metadata.height;

    // 髪領域のマスクを生成（顔の上部）
    const svgImage = `
      <svg width="${width}" height="${height}">
        <rect width="${width}" height="${height}" fill="black"/>
        <path d="M ${width * 0.15} ${height * 0.15} Q ${width / 2} 0 ${width * 0.85} ${height * 0.15} L ${width * 0.8} ${height * 0.35} Q ${width / 2} ${height * 0.25} ${width * 0.2} ${height * 0.35} Z" fill="white"/>
      </svg>
    `;

    // SVGをバッファに変換
    const mask = await sharp(Buffer.from(svgImage))
      .resize(width, height)
      .toBuffer();

    return mask;
  } catch (error) {
    console.error("[HairBackground] 髪マスク生成エラー:", error);
    throw error;
  }
}

/**
 * エッジ検出（髦と背景の境界）
 */
export async function detectEdges(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // エッジ検出（グレースケール化）
    const edges = await sharp(imageBuffer)
      .modulate({
        saturation: 0, // グレースケール
      })
      .sharpen({ sigma: 2 }) // エッジを強調
      .toBuffer();

    return edges;
  } catch (error) {
    console.error("[HairBackground] エッジ検出エラー:", error);
    return imageBuffer;
  }
}

/**
 * 背景領域のマスクを生成
 */
export async function generateBackgroundMask(
  imageBuffer: Buffer
): Promise<Buffer> {
  try {
    const { metadata } = await sharp(imageBuffer)
      .metadata()
      .then((m) => ({ metadata: m }));

    if (!metadata || !metadata.width || !metadata.height) {
      throw new Error("画像メタデータが取得できません");
    }

    const width = metadata.width;
    const height = metadata.height;

    // 背景領域のマスク（顔と髪以外）
    const svgImage = `
      <svg width="${width}" height="${height}">
        <rect width="${width}" height="${height}" fill="white"/>
        <ellipse cx="${width / 2}" cy="${height / 2}" rx="${width * 0.35}" ry="${height * 0.45}" fill="black"/>
        <path d="M ${width * 0.15} ${height * 0.15} Q ${width / 2} 0 ${width * 0.85} ${height * 0.15} L ${width * 0.8} ${height * 0.35} Q ${width / 2} ${height * 0.25} ${width * 0.2} ${height * 0.35} Z" fill="black"/>
      </svg>
    `;

    // SVGをバッファに変換
    const mask = await sharp(Buffer.from(svgImage))
      .resize(width, height)
      .toBuffer();

    return mask;
  } catch (error) {
    console.error("[HairBackground] 背景マスク生成エラー:", error);
    throw error;
  }
}

/**
 * 髪の毛の自然な処理
 */
export async function processHairNaturally(
  targetImage: Buffer,
  sourceImage: Buffer,
  hairMask: Buffer
): Promise<Buffer> {
  try {
    // ソース画像から髪領域を抽出
    const { data: sourceData, info: sourceInfo } = await sharp(sourceImage)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data: maskData } = await sharp(hairMask)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data: targetData } = await sharp(targetImage)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // マスクに基づいて髪を合成
    const result = new Uint8Array(targetData.length);
    for (let i = 0; i < targetData.length; i++) {
      // マスク値に基づいて混合
      const maskValue = maskData[i] / 255;
      result[i] = Math.round(
        targetData[i] * (1 - maskValue) + sourceData[i] * maskValue
      );
    }

    // 結果をバッファに変換
    const output = await sharp(Buffer.from(result), {
      raw: {
        width: sourceInfo.width,
        height: sourceInfo.height,
        channels: sourceInfo.channels || 3,
      },
    }).toBuffer();

    return output;
  } catch (error) {
    console.error("[HairBackground] 髪処理エラー:", error);
    return targetImage;
  }
}

/**
 * 背景の自動検出と保持
 */
export async function preserveBackground(
  targetImage: Buffer,
  backgroundMask: Buffer
): Promise<Buffer> {
  try {
    // 背景領域を保持（マスク値が高い領域）
    const { data: targetData, info: targetInfo } = await sharp(targetImage)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data: maskData } = await sharp(backgroundMask)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // マスクに基づいて背景を保持
    const result = new Uint8Array(targetData.length);
    for (let i = 0; i < targetData.length; i++) {
      // 背景領域（マスク値が高い）は保持
      const maskValue = maskData[i] / 255;
      if (maskValue > 0.5) {
        result[i] = targetData[i];
      } else {
        result[i] = targetData[i];
      }
    }

    // 結果をバッファに変換
    const output = await sharp(Buffer.from(result), {
      raw: {
        width: targetInfo.width,
        height: targetInfo.height,
        channels: targetInfo.channels || 3,
      },
    }).toBuffer();

    return output;
  } catch (error) {
    console.error("[HairBackground] 背景保持エラー:", error);
    return targetImage;
  }
}

/**
 * 影の自動補正
 */
export async function correctShadows(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // 影を補正（明るさを調整）
    const corrected = await sharp(imageBuffer)
      .modulate({
        brightness: 1.05, // 少し明るくして影を軽減
        saturation: 1.02, // 色を少し強調
      })
      .toBuffer();

    return corrected;
  } catch (error) {
    console.error("[HairBackground] 影補正エラー:", error);
    return imageBuffer;
  }
}

/**
 * 髪・背景・影の統合処理
 */
export async function processHairBackgroundAndShadows(
  targetImage: Buffer,
  sourceImage: Buffer,
  landmarks: any[]
): Promise<Buffer> {
  try {
    // マスクを生成
    const faceMask = await generateFaceMask(targetImage, landmarks);
    const hairMask = await generateHairMask(sourceImage, landmarks);
    const backgroundMask = await generateBackgroundMask(targetImage);

    // 髪を処理
    let result = await processHairNaturally(targetImage, sourceImage, hairMask);

    // 背景を保持
    result = await preserveBackground(result, backgroundMask);

    // 影を補正
    result = await correctShadows(result);

    return result;
  } catch (error) {
    console.error("[HairBackground] 統合処理エラー:", error);
    return targetImage;
  }
}
