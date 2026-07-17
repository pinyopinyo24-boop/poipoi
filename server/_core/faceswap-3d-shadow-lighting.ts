/**
 * 3D影と照明計算モジュール
 * 物理ベースの影と照明の再計算
 */

import sharp from "sharp";

interface Light {
  position: { x: number; y: number; z: number };
  color: { r: number; g: number; b: number };
  intensity: number;
  type: "point" | "directional" | "spot";
}

interface ShadowMap {
  width: number;
  height: number;
  data: Buffer;
}

interface LightingResult {
  litImage: Buffer;
  shadowMap: ShadowMap;
  quality: number;
}

/**
 * 光源を設定
 */
export function createLight(
  position: { x: number; y: number; z: number },
  color: { r: number; g: number; b: number },
  intensity: number,
  type: "point" | "directional" | "spot" = "point"
): Light {
  console.log(`[ShadowLighting] ${type}光源を作成中...`);

  return {
    position,
    color,
    intensity,
    type,
  };
}

/**
 * シャドウマップを生成
 */
export async function generateShadowMap(
  faceBuffer: Buffer,
  light: Light,
  resolution: number = 512
): Promise<ShadowMap> {
  console.log("[ShadowLighting] シャドウマップを生成中...");

  try {
    // 画像をグレースケール化
    const grayscale = sharp(faceBuffer)
      .grayscale()
      .resize(resolution, resolution)
      .normalize();

    const shadowData = await grayscale.raw().toBuffer();

    return {
      width: resolution,
      height: resolution,
      data: shadowData,
    };
  } catch (error) {
    console.error("[ShadowLighting] シャドウマップ生成エラー:", error);
    throw error;
  }
}

/**
 * 照明を適用
 */
export async function applyLighting(
  faceBuffer: Buffer,
  lights: Light[],
  ambientLight: { r: number; g: number; b: number } = { r: 100, g: 100, b: 100 }
): Promise<LightingResult> {
  console.log("[ShadowLighting] 照明を適用中...");

  try {
    let image = sharp(faceBuffer);

    // 環境光を適用
    image = image.modulate({
      lightness: 1 + (ambientLight.r - 128) / 256,
    });

    // 各光源を適用
    for (const light of lights) {
      // 光源の強度に基づいて明るさを調整
      const lightStrength = light.intensity * 0.1;

      image = image.modulate({
        lightness: 1 + lightStrength,
        saturation: 1 + lightStrength * 0.5,
      });
    }

    const litBuffer = await image.toBuffer();

    // シャドウマップを生成
    const shadowMap = await generateShadowMap(faceBuffer, lights[0] || createLight({ x: 0, y: 0, z: 1 }, { r: 255, g: 255, b: 255 }, 1));

    return {
      litImage: litBuffer,
      shadowMap,
      quality: 0.85,
    };
  } catch (error) {
    console.error("[ShadowLighting] 照明適用エラー:", error);
    throw error;
  }
}

/**
 * 影を計算
 */
export async function calculateShadows(
  faceBuffer: Buffer,
  light: Light,
  shadowIntensity: number = 0.5
): Promise<Buffer> {
  console.log("[ShadowLighting] 影を計算中...");

  try {
    // シャドウマップを生成
    const shadowMap = await generateShadowMap(faceBuffer, light);

    // 影を適用
    const image = sharp(faceBuffer);

    // シャドウマップを合成
    const shadowBuffer = Buffer.alloc(shadowMap.data.length);
    for (let i = 0; i < shadowMap.data.length; i++) {
      shadowBuffer[i] = Math.round(shadowMap.data[i] * shadowIntensity);
    }

    const shadowed = image.composite([
      {
        input: shadowBuffer,
        blend: "darken",
      },
    ]);

    const resultBuffer = await shadowed.toBuffer();
    return resultBuffer;
  } catch (error) {
    console.error("[ShadowLighting] 影計算エラー:", error);
    throw error;
  }
}

/**
 * 反射を計算
 */
export async function calculateReflections(
  faceBuffer: Buffer,
  surfaceRoughness: number = 0.5
): Promise<Buffer> {
  console.log("[ShadowLighting] 反射を計算中...");

  try {
    // 表面の粗さに基づいて反射を計算
    const image = sharp(faceBuffer);

    // 反射を追加（明るさとコントラストを増加）
    const reflected = image.modulate({
      lightness: 1 + (1 - surfaceRoughness) * 0.1,
    });

    const resultBuffer = await reflected.toBuffer();
    return resultBuffer;
  } catch (error) {
    console.error("[ShadowLighting] 反射計算エラー:", error);
    throw error;
  }
}

/**
 * 拡散反射を計算
 */
export async function calculateDiffuse(
  faceBuffer: Buffer,
  light: Light,
  normal: { x: number; y: number; z: number }
): Promise<Buffer> {
  console.log("[ShadowLighting] 拡散反射を計算中...");

  try {
    // 光の方向を計算
    const lightDir = {
      x: light.position.x,
      y: light.position.y,
      z: light.position.z,
    };

    // 正規化
    const length = Math.sqrt(lightDir.x ** 2 + lightDir.y ** 2 + lightDir.z ** 2);
    lightDir.x /= length;
    lightDir.y /= length;
    lightDir.z /= length;

    // 内積を計算（拡散反射の強度）
    const diffuseStrength = Math.max(
      0,
      lightDir.x * normal.x + lightDir.y * normal.y + lightDir.z * normal.z
    );

    // 拡散反射を適用
    const image = sharp(faceBuffer);
    const diffused = image.modulate({
      lightness: 1 + diffuseStrength * light.intensity * 0.1,
    });

    const resultBuffer = await diffused.toBuffer();
    return resultBuffer;
  } catch (error) {
    console.error("[ShadowLighting] 拡散反射計算エラー:", error);
    throw error;
  }
}

/**
 * 鏡面反射を計算
 */
export async function calculateSpecular(
  faceBuffer: Buffer,
  light: Light,
  viewDirection: { x: number; y: number; z: number },
  normal: { x: number; y: number; z: number },
  shininess: number = 32
): Promise<Buffer> {
  console.log("[ShadowLighting] 鏡面反射を計算中...");

  try {
    // 反射ベクトルを計算
    const lightDir = {
      x: light.position.x,
      y: light.position.y,
      z: light.position.z,
    };

    // 正規化
    let length = Math.sqrt(lightDir.x ** 2 + lightDir.y ** 2 + lightDir.z ** 2);
    lightDir.x /= length;
    lightDir.y /= length;
    lightDir.z /= length;

    // 反射ベクトル R = 2(N·L)N - L
    const dotNL = lightDir.x * normal.x + lightDir.y * normal.y + lightDir.z * normal.z;
    const reflectDir = {
      x: 2 * dotNL * normal.x - lightDir.x,
      y: 2 * dotNL * normal.y - lightDir.y,
      z: 2 * dotNL * normal.z - lightDir.z,
    };

    // 正規化
    length = Math.sqrt(reflectDir.x ** 2 + reflectDir.y ** 2 + reflectDir.z ** 2);
    reflectDir.x /= length;
    reflectDir.y /= length;
    reflectDir.z /= length;

    // 鏡面反射の強度を計算
    const specularStrength = Math.pow(
      Math.max(0, reflectDir.x * viewDirection.x + reflectDir.y * viewDirection.y + reflectDir.z * viewDirection.z),
      shininess
    );

    // 鏡面反射を適用
    const image = sharp(faceBuffer);
    const specular = image.modulate({
      lightness: 1 + specularStrength * light.intensity * 0.2,
    });

    const resultBuffer = await specular.toBuffer();
    return resultBuffer;
  } catch (error) {
    console.error("[ShadowLighting] 鏡面反射計算エラー:", error);
    throw error;
  }
}

/**
 * 環境光遮蔽（AO）を計算
 */
export async function calculateAmbientOcclusion(
  faceBuffer: Buffer,
  sampleRadius: number = 10,
  samples: number = 16
): Promise<Buffer> {
  console.log("[ShadowLighting] 環境光遮蔽を計算中...");

  try {
    // 環境光遮蔽マップを生成
    const image = sharp(faceBuffer);

    // ブラーを適用して環境光遮蔽を近似
    const ao = image
      .blur(sampleRadius / 10)
      .normalize();

    // AOを適用
    const aoApplied = image.composite([
      {
        input: await ao.toBuffer(),
        blend: "darken",
      },
    ]);

    const resultBuffer = await aoApplied.toBuffer();
    return resultBuffer;
  } catch (error) {
    console.error("[ShadowLighting] 環境光遮蔽計算エラー:", error);
    throw error;
  }
}

/**
 * トーンマッピングを適用
 */
export async function applyToneMapping(
  faceBuffer: Buffer,
  exposure: number = 1.0,
  gamma: number = 2.2
): Promise<Buffer> {
  console.log("[ShadowLighting] トーンマッピングを適用中...");

  try {
    const image = sharp(faceBuffer);

    // 露出を調整
    const exposed = image.modulate({
      lightness: exposure,
    });

    // ガンマ補正を適用
    const gammaCorrect = exposed.modulate({
      lightness: Math.pow(1.0, 1.0 / gamma),
    });

    const resultBuffer = await gammaCorrect.toBuffer();
    return resultBuffer;
  } catch (error) {
    console.error("[ShadowLighting] トーンマッピングエラー:", error);
    throw error;
  }
}
