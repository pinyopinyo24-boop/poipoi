/**
 * APKGenerationService - APK生成サービス
 */

export type GenerationStatus = 'pending' | 'generating' | 'optimizing' | 'completed' | 'failed';

export interface APKGeneration {
  generationId: string;
  version: string;
  status: GenerationStatus;
  startedAt?: number;
  completedAt?: number;
  apkPath?: string;
  apkSize?: number;
  minSdkVersion: number;
  targetSdkVersion: number;
  errorMessage?: string;
}

export class APKGenerationService {
  private static instance: APKGenerationService;
  private generations: Map<string, APKGeneration> = new Map();
  private generationCounter: number = 0;

  private constructor() {}

  static getInstance(): APKGenerationService {
    if (!APKGenerationService.instance) {
      APKGenerationService.instance = new APKGenerationService();
    }
    return APKGenerationService.instance;
  }

  /**
   * APK生成開始
   */
  startGeneration(version: string, minSdkVersion: number, targetSdkVersion: number): APKGeneration {
    const generationId = `apk_gen_${++this.generationCounter}_${Date.now()}`;

    const generation: APKGeneration = {
      generationId,
      version,
      status: 'generating',
      startedAt: Date.now(),
      minSdkVersion,
      targetSdkVersion,
    };

    this.generations.set(generationId, generation);
    return generation;
  }

  /**
   * 最適化フェーズ
   */
  startOptimization(generationId: string): APKGeneration | null {
    const generation = this.generations.get(generationId);
    if (!generation) return null;

    generation.status = 'optimizing';
    return generation;
  }

  /**
   * APK生成完了
   */
  completeGeneration(generationId: string, apkPath: string, apkSize: number): APKGeneration | null {
    const generation = this.generations.get(generationId);
    if (!generation) return null;

    generation.status = 'completed';
    generation.apkPath = apkPath;
    generation.apkSize = apkSize;
    generation.completedAt = Date.now();

    return generation;
  }

  /**
   * APK生成失敗
   */
  failGeneration(generationId: string, errorMessage: string): APKGeneration | null {
    const generation = this.generations.get(generationId);
    if (!generation) return null;

    generation.status = 'failed';
    generation.errorMessage = errorMessage;
    generation.completedAt = Date.now();

    return generation;
  }

  /**
   * APK生成取得
   */
  getGeneration(generationId: string): APKGeneration | null {
    return this.generations.get(generationId) || null;
  }

  /**
   * 完了したAPK生成取得
   */
  getCompletedGenerations(): APKGeneration[] {
    return Array.from(this.generations.values()).filter((g) => g.status === 'completed');
  }

  /**
   * 失敗したAPK生成取得
   */
  getFailedGenerations(): APKGeneration[] {
    return Array.from(this.generations.values()).filter((g) => g.status === 'failed');
  }

  /**
   * APK生成統計
   */
  getGenerationStatistics(): {
    totalGenerations: number;
    completedGenerations: number;
    failedGenerations: number;
    generatingGenerations: number;
    successRate: number;
    totalAPKSize: number;
    averageAPKSize: number;
  } {
    const generationArray = Array.from(this.generations.values());
    const completedGenerations = generationArray.filter((g) => g.status === 'completed').length;
    const failedGenerations = generationArray.filter((g) => g.status === 'failed').length;
    const generatingGenerations = generationArray.filter((g) => g.status === 'generating' || g.status === 'optimizing').length;
    const totalGenerations = generationArray.length;

    let totalAPKSize = 0;
    let apkCount = 0;

    generationArray.forEach((generation) => {
      if (generation.apkSize !== undefined) {
        totalAPKSize += generation.apkSize;
        apkCount++;
      }
    });

    const successRate = totalGenerations > 0 ? (completedGenerations / totalGenerations) * 100 : 0;
    const averageAPKSize = apkCount > 0 ? totalAPKSize / apkCount : 0;

    return {
      totalGenerations,
      completedGenerations,
      failedGenerations,
      generatingGenerations,
      successRate,
      totalAPKSize,
      averageAPKSize,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.generations.clear();
  }
}

export const apkGenerationService = APKGenerationService.getInstance();
export default apkGenerationService;
