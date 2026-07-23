/**
 * 肌テクスチャ・毛穴レベルの詳細処理
 * 高周波成分の抽出と保存、肌の微細なテクスチャの保持
 */

import sharp from "sharp";

/**
 * 高周波成分を抽出（毛穴、シワ、そばかすなど）
 */
export async function extractHighFrequencyDetails(
  imageBuffer: Buffer
): Promise<Buffer> {
  try {
    // 元の画像を取得
    const original = imageBuffer;

    // ガウシアンブラーを適用して低周波成分を抽出
    const blurred = await sharp(imageBuffer)
      .blur(10) // 高周波成分を除去
      .toBuffer();

    // 元の画像とぼかし画像の差分を計算（高周波成分）
    const { data: originalData, info: originalInfo } = await sharp(original)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data: blurredData } = await sharp(blurred)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 差分を計算
    const highFrequency = new Uint8Array(originalData.length);
    for (let i = 0; i < originalData.length; i++) {
      // 128を中心に差分を格納
      const diff = originalData[i] - blurredData[i];
      highFrequency[i] = Math.max(0, Math.min(255, 128 + diff));
    }

    // 高周波成分をバッファに変換
    const result = await sharp(Buffer.from(highFrequency), {
      raw: {
        width: originalInfo.width,
        height: originalInfo.height,
        channels: originalInfo.channels || 3,
      },
    }).toBuffer();

    return result;
  } catch (error) {
    console.error("[TexturePreservation] 高周波抽出エラー:", error);
    return imageBuffer;
  }
}

/**
 * 高周波成分を画像に合成
 */
export async function applyHighFrequencyDetails(
  baseImage: Buffer,
  highFrequencyBuffer: Buffer,
  strength: number = 0.8
): Promise<Buffer> {
  try {
    const { data: baseData, info: baseInfo } = await sharp(baseImage)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data: hfData } = await sharp(highFrequencyBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 高周波成分を合成
    const result = new Uint8Array(baseData.length);
    for (let i = 0; i < baseData.length; i++) {
      // 高周波成分（128を中心）を基画像に追加
      const hfValue = hfData[i] - 128;
      const blended = baseData[i] + hfValue * strength;
      result[i] = Math.max(0, Math.min(255, blended));
    }

    // 結果をバッファに変換
    const output = await sharp(Buffer.from(result), {
      raw: {
        width: baseInfo.width,
        height: baseInfo.height,
        channels: baseInfo.channels || 3,
      },
    }).toBuffer();

    return output;
  } catch (error) {
    console.error("[TexturePreservation] 高周波合成エラー:", error);
    return baseImage;
  }
}

/**
 * 肌の質感を分析
 */
export async function analyzeSkinTexture(
  imageBuffer: Buffer
): Promise<{
  smoothness: number;
  roughness: number;
  poreVisibility: number;
  wrinkleDepth: number;
}> {
  try {
    // 高周波成分を抽出
    const highFreq = await extractHighFrequencyDetails(imageBuffer);

    // 統計情報を計算
    const { data } = await sharp(highFreq)
      .raw()
      .toBuffer({ resolveWithObject: true });

    let variance = 0;
    let mean = 0;

    // 平均を計算
    for (let i = 0; i < data.length; i++) {
      mean += data[i];
    }
    mean /= data.length;

    // 分散を計算
    for (let i = 0; i < data.length; i++) {
      variance += Math.pow(data[i] - mean, 2);
    }
    variance /= data.length;

    // 標準偏差
    const stdDev = Math.sqrt(variance);

    // 質感指標を計算
    const roughness = stdDev / 128; // 0-2の範囲
    const smoothness = 1 - Math.min(1, roughness);
    const poreVisibility = Math.min(1, roughness * 0.5);
    const wrinkleDepth = Math.min(1, roughness * 0.3);

    return {
      smoothness: Math.min(1, smoothness),
      roughness: Math.min(1, roughness),
      poreVisibility: Math.min(1, poreVisibility),
      wrinkleDepth: Math.min(1, wrinkleDepth),
    };
  } catch (error) {
    console.error("[TexturePreservation] 質感分析エラー:", error);
    return {
      smoothness: 0.5,
      roughness: 0.5,
      poreVisibility: 0.5,
      wrinkleDepth: 0.5,
    };
  }
}

/**
 * 肌の質感を転移
 */
export async function transferSkinTexture(
  targetImage: Buffer,
  sourceImage: Buffer,
  strength: number = 0.9
): Promise<Buffer> {
  try {
    // ソース画像の高周波成分を抽出
    const sourceHighFreq = await extractHighFrequencyDetails(sourceImage);

    // ターゲット画像に高周波成分を適用
    const result = await applyHighFrequencyDetails(targetImage, sourceHighFreq, strength);

    return result;
  } catch (error) {
    console.error("[TexturePreservation] 質感転移エラー:", error);
    return targetImage;
  }
}

/**
 * 肌の色と質感を統合的に処理
 */
export async function enhanceSkinRealism(
  imageBuffer: Buffer,
  targetTexture: {
    smoothness: number;
    roughness: number;
    poreVisibility: number;
    wrinkleDepth: number;
  }
): Promise<Buffer> {
  try {
    let result = imageBuffer;

    // 毛穴を強調（poreVisibility > 0.5の場合）
    if (targetTexture.poreVisibility > 0.5) {
      result = await sharp(result)
        .modulate({
          saturation: 1.1, // 色を少し強調
        })
        .toBuffer();
    }

    // シワを強調（wrinkleDepth > 0.5の場合）
    if (targetTexture.wrinkleDepth > 0.5) {
      result = await sharp(result)
        .modulate({
          brightness: 0.98, // 少し暗くしてシワを目立たせる
        })
        .toBuffer();
    }

    // 滑らかさを調整
    if (targetTexture.smoothness > 0.7) {
      result = await sharp(result)
        .blur(0.5) // 軽いスムージング
        .toBuffer();
    }

    return result;
  } catch (error) {
    console.error("[TexturePreservation] 肌現実性向上エラー:", error);
    return imageBuffer;
  }
}

/**
 * 詳細な肌処理パイプライン
 */
export async function processSkinDetails(
  targetImage: Buffer,
  sourceImage: Buffer,
  options: {
    preserveTexture?: boolean;
    enhanceRealism?: boolean;
    textureStrength?: number;
  } = {}
): Promise<Buffer> {
  try {
    const {
      preserveTexture = true,
      enhanceRealism = true,
      textureStrength = 0.9,
    } = options;

    let result = targetImage;

    // 質感を転移
    if (preserveTexture) {
      result = await transferSkinTexture(result, sourceImage, textureStrength);
    }

    // 肌の現実性を向上
    if (enhanceRealism) {
      const texture = await analyzeSkinTexture(sourceImage);
      result = await enhanceSkinRealism(result, texture);
    }

    return result;
  } catch (error) {
    console.error("[TexturePreservation] 肌詳細処理エラー:", error);
    return targetImage;
  }
}
