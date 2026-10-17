/**
 * TensorFlow.js モデルキャッシュマネージャー
 * 複数の顔入れ替え処理でモデルを再利用し、パフォーマンスを向上
 */

import * as tf from "@tensorflow/tfjs-node"; // Import tf from tfjs-node for Node.js specific functionalities
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import { MemoryOptimizationService } from "../managers/MemoryOptimizationService";

interface ModelCache {
  faceMesh: any;
  lastUsed: number;
  loadTime: number;
}

const CACHE_TIMEOUT = 5 * 60 * 1000; // 5分間キャッシュ保持
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB

let modelCache: ModelCache = {
  faceMesh: null,
  lastUsed: 0,
  loadTime: 0,
};

let totalCacheSize = 0;
let modelLoadPromise: Promise<any> | null = null;
const memoryOptimizationService = new MemoryOptimizationService();

/**
 * FaceMesh モデルをキャッシュから取得または初期化
 */
export async function getCachedFaceMeshModel(): Promise<any> {
  const now = Date.now();

  // キャッシュが有効かチェック
  if (modelCache.faceMesh && now - modelCache.lastUsed < CACHE_TIMEOUT) {
    console.log(
      "[ModelCache] FaceMesh モデルをキャッシュから取得（経過時間: " +
        (now - modelCache.lastUsed) +
        "ms）"
    );
    modelCache.lastUsed = now;
    return modelCache.faceMesh;
  }

  if (modelLoadPromise) {
    return modelLoadPromise;
  }

  modelLoadPromise = (async () => {
    // キャッシュが無効な場合は新規初期化
    console.log("[ModelCache] FaceMesh モデルを初期化中...");
    const startTime = Date.now();

    try {
      // 期限切れモデルの解放を最適化サービスに委譲してから新規ロードする
      if (modelCache.faceMesh) {
        await clearModelCache();
      }

      const model = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        { runtime: "tfjs", refineLandmarks: true }
      );

      const loadTime = Date.now() - startTime;
      modelCache = {
        faceMesh: model,
        lastUsed: Date.now(),
        loadTime,
      };
      totalCacheSize = 50 * 1024 * 1024;

      console.log(
        `[ModelCache] FaceMesh モデルをロード完了（${loadTime}ms、キャッシュサイズ: ${(totalCacheSize / 1024 / 1024).toFixed(2)}MB）`
      );
      return model;
    } catch (error) {
      console.error("[ModelCache] FaceMesh モデルのロードに失敗:", error);
      throw error;
    }
  })();

  try {
    return await modelLoadPromise;
  } finally {
    modelLoadPromise = null;
  }
}

/**
 * キャッシュをクリア
 */
export async function clearModelCache(): Promise<void> {
  console.log("[ModelCache] キャッシュをクリア中...");
  await memoryOptimizationService.clearCache("FaceMesh model cache", async () => {
    const memoryFreed = totalCacheSize;
    const cachedModel = modelCache.faceMesh;
    try {
      if (cachedModel) await cachedModel.dispose();
      return memoryFreed;
    } finally {
      modelCache = { faceMesh: null, lastUsed: 0, loadTime: 0 };
      totalCacheSize = 0;
    }
  });
  console.log("[ModelCache] キャッシュをクリア完了");
}

/**
 * キャッシュ統計情報を取得
 */
export function getCacheStats() {
  return {
    isCached: modelCache.faceMesh !== null,
    lastUsed: modelCache.lastUsed,
    loadTime: modelCache.loadTime,
    cacheSize: totalCacheSize,
    cacheSizeMB: (totalCacheSize / 1024 / 1024).toFixed(2),
    cacheTimeout: CACHE_TIMEOUT,
    maxCacheSize: MAX_CACHE_SIZE,
  };
}

/**
 * 定期的にキャッシュをクリーンアップ
 */
export function startCacheCleanupInterval(): NodeJS.Timeout {
  return setInterval(async () => {
    const now = Date.now();

    if (modelCache.faceMesh && now - modelCache.lastUsed > CACHE_TIMEOUT) {
      console.log("[ModelCache] タイムアウトによるキャッシュクリア");
      await clearModelCache();
    }
  }, 60000); // 1分ごとにチェック
}
