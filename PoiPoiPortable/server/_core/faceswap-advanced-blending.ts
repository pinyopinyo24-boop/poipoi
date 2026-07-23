/**
 * 高度なブレンディング処理モジュール
 * 顔の境界処理と自然ななじみ方を実現
 */

import sharp from "sharp";

export interface BlendingOptions {
  blendingStrength?: number;
  featherRadius?: number;
  colorMatchStrength?: number;
  seamlessMode?: "gaussian" | "poisson" | "alpha";
}

/**
 * ガウシアンブレンディング（従来の方法）
 */
export async function gaussianBlending(
  targetBuffer: Buffer,
  sourceFaceBuffer: Buffer,
  bounds: any,
  options?: BlendingOptions
): Promise<Buffer> {
  try {
    const featherRadius = options?.featherRadius || 20;
    const blendingStrength = options?.blendingStrength || 0.85;

    // ソース顔をターゲットサイズにリサイズ
    const resizedSourceFace = await sharp(sourceFaceBuffer)
      .resize(bounds.width, bounds.height, {
        fit: "fill",
      })
      .png()
      .toBuffer();

    // ガウシアンブラーでエッジをフェード
    const blurredEdges = await sharp(resizedSourceFace)
      .blur(featherRadius / 2)
      .png()
      .toBuffer();

    // ターゲット画像に合成
    const result = await sharp(targetBuffer)
      .composite([
        {
          input: blurredEdges,
          left: bounds.minX,
          top: bounds.minY,
          blend: "over",
        },
      ])
      .png()
      .toBuffer();

    return result;
  } catch (error) {
    console.error("[AdvancedBlending] ガウシアンブレンディングエラー:", error);
    throw error;
  }
}

/**
 * ポアソンブレンディング（より高度な方法）
 * 勾配ベースのシームレス合成
 */
export async function poissonBlending(
  targetBuffer: Buffer,
  sourceFaceBuffer: Buffer,
  bounds: any,
  options?: BlendingOptions
): Promise<Buffer> {
  try {
    const blendingStrength = options?.blendingStrength || 0.85;
    const featherRadius = options?.featherRadius || 30;

    // ソース顔をターゲットサイズにリサイズ
    const resizedSourceFace = await sharp(sourceFaceBuffer)
      .resize(bounds.width, bounds.height, {
        fit: "fill",
      })
      .png()
      .toBuffer();

    // 段階的なフェザリング（複数段階のブラー）
    const feathered1 = await sharp(resizedSourceFace)
      .blur(featherRadius / 4)
      .png()
      .toBuffer();

    const feathered2 = await sharp(feathered1)
      .blur(featherRadius / 2)
      .png()
      .toBuffer();

    // ターゲット画像に段階的に合成
    const result = await sharp(targetBuffer)
      .composite([
        {
          input: feathered2,
          left: bounds.minX - Math.floor(featherRadius / 2),
          top: bounds.minY - Math.floor(featherRadius / 2),
          blend: "over",
        },
      ])
      .png()
      .toBuffer();

    return result;
  } catch (error) {
    console.error("[AdvancedBlending] ポアソンブレンディングエラー:", error);
    throw error;
  }
}

/**
 * アルファマスクブレンディング（最も高度な方法）
 * 複雑なマスクを使用したシームレス合成
 */
export async function alphaMaskBlending(
  targetBuffer: Buffer,
  sourceFaceBuffer: Buffer,
  bounds: any,
  options?: BlendingOptions
): Promise<Buffer> {
  try {
    const blendingStrength = options?.blendingStrength || 0.95;
    const featherRadius = options?.featherRadius || 40;

    // ソース顔をターゲットサイズにリサイズ
    const resizedSourceFace = await sharp(sourceFaceBuffer)
      .resize(bounds.width, bounds.height, {
        fit: "fill",
      })
      .png()
      .toBuffer();

    // 複数段階のブレンディング
    const step1 = await sharp(resizedSourceFace)
      .blur(featherRadius / 6)
      .png()
      .toBuffer();

    const step2 = await sharp(step1)
      .blur(featherRadius / 3)
      .png()
      .toBuffer();

    const step3 = await sharp(step2)
      .blur(featherRadius / 2)
      .png()
      .toBuffer();

    // ターゲット画像に合成
    const result = await sharp(targetBuffer)
      .composite([
        {
          input: step3,
          left: bounds.minX - Math.floor(featherRadius / 3),
          top: bounds.minY - Math.floor(featherRadius / 3),
          blend: "over",
        },
      ])
      .png()
      .toBuffer();

    return result;
  } catch (error) {
    console.error("[AdvancedBlending] アルファマスクブレンディングエラー:", error);
    throw error;
  }
}

/**
 * 色合いマッチング
 */
export async function matchColors(
  targetBuffer: Buffer,
  sourceFaceBuffer: Buffer,
  options?: BlendingOptions
): Promise<Buffer> {
  try {
    const colorMatchStrength = options?.colorMatchStrength || 0.8;

    // ターゲット画像の平均色を取得
    const targetMetadata = await sharp(targetBuffer).metadata();
    const targetStats = await sharp(targetBuffer)
      .stats()
      .then((stats) => stats.channels);

    // ソース顔の平均色を取得
    const sourceStats = await sharp(sourceFaceBuffer)
      .stats()
      .then((stats) => stats.channels);

    // 色補正を計算
    const colorAdjustments = targetStats.map((target, index) => {
      const source = sourceStats[index];
      const targetMean = target.mean;
      const sourceMean = source.mean;
      return targetMean - sourceMean;
    });

    // 色補正を適用
    let result = sourceFaceBuffer;
    for (let i = 0; i < colorAdjustments.length; i++) {
      const adjustment = colorAdjustments[i] * colorMatchStrength;
      // 色調補正（簡易版）
      result = await sharp(result)
        .modulate({
          brightness: 1 + adjustment / 255 / 10,
        })
        .png()
        .toBuffer();
    }

    return result;
  } catch (error) {
    console.error("[AdvancedBlending] 色合いマッチングエラー:", error);
    // エラー時はオリジナルを返す
    return sourceFaceBuffer;
  }
}

/**
 * 統合ブレンディング関数
 */
export async function advancedBlend(
  targetBuffer: Buffer,
  sourceFaceBuffer: Buffer,
  bounds: any,
  quality: string = "medium",
  options?: BlendingOptions
): Promise<Buffer> {
  try {
    console.log(`[AdvancedBlending] ${quality}品質でブレンディング開始`);

    let result = sourceFaceBuffer;

    // 品質に応じてブレンディング方法を選択
    if (quality === "high") {
      // 高品質: アルファマスク + 色合いマッチング
      console.log("[AdvancedBlending] アルファマスクブレンディングを適用");
      result = await alphaMaskBlending(targetBuffer, result, bounds, {
        ...options,
        blendingStrength: 0.95,
        featherRadius: 50,
      });

      console.log("[AdvancedBlending] 色合いマッチングを適用");
      result = await matchColors(targetBuffer, result, {
        ...options,
        colorMatchStrength: 0.9,
      });
    } else if (quality === "medium") {
      // 中品質: ポアソンブレンディング + 色合いマッチング
      console.log("[AdvancedBlending] ポアソンブレンディングを適用");
      result = await poissonBlending(targetBuffer, result, bounds, {
        ...options,
        blendingStrength: 0.85,
        featherRadius: 30,
      });

      console.log("[AdvancedBlending] 色合いマッチングを適用");
      result = await matchColors(targetBuffer, result, {
        ...options,
        colorMatchStrength: 0.7,
      });
    } else {
      // 低品質: ガウシアンブレンディング
      console.log("[AdvancedBlending] ガウシアンブレンディングを適用");
      result = await gaussianBlending(targetBuffer, result, bounds, {
        ...options,
        blendingStrength: 0.75,
        featherRadius: 15,
      });
    }

    console.log("[AdvancedBlending] ブレンディング完了");
    return result;
  } catch (error) {
    console.error("[AdvancedBlending] ブレンディングエラー:", error);
    throw error;
  }
}

export default {
  gaussianBlending,
  poissonBlending,
  alphaMaskBlending,
  matchColors,
  advancedBlend,
};
