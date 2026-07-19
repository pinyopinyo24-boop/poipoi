/**
 * PerformanceOptimizationService
 * チャット応答速度・メモリ・CPU最適化
 */

export interface PerformanceProfile {
  profileId: string;
  timestamp: number;
  operationType: 'chat' | 'analysis' | 'file_processing' | 'ai_inference';
  startTime: number;
  endTime: number;
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  cpuUsage: number;
  status: 'success' | 'failed';
}

export interface OptimizationResult {
  resultId: string;
  timestamp: number;
  optimizationType: 'caching' | 'batching' | 'compression' | 'lazy_loading' | 'indexing';
  targetMetric: string;
  beforeValue: number;
  afterValue: number;
  improvement: number;
  improvementPercent: number;
}

export interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number;
}

export class PerformanceOptimizationService {
  private profiles: Map<string, PerformanceProfile> = new Map();
  private results: Map<string, OptimizationResult> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private profilesByType: Map<string, string[]> = new Map();
  private resultsByType: Map<string, string[]> = new Map();

  /**
   * パフォーマンスプロファイルを記録
   */
  recordProfile(
    operationType: PerformanceProfile['operationType'],
    startTime: number,
    endTime: number,
    memoryBefore: number,
    memoryAfter: number,
    cpuUsage: number,
    status: PerformanceProfile['status']
  ): PerformanceProfile {
    const profileId = `PRF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = endTime - startTime;

    const profile: PerformanceProfile = {
      profileId,
      timestamp: Date.now(),
      operationType,
      startTime,
      endTime,
      duration,
      memoryBefore,
      memoryAfter,
      cpuUsage,
      status,
    };

    this.profiles.set(profileId, profile);

    if (!this.profilesByType.has(operationType)) {
      this.profilesByType.set(operationType, []);
    }
    this.profilesByType.get(operationType)!.push(profileId);

    return profile;
  }

  /**
   * プロファイルを取得
   */
  getProfile(profileId: string): PerformanceProfile | undefined {
    return this.profiles.get(profileId);
  }

  /**
   * 操作タイプ別プロファイルを取得
   */
  getProfilesByType(operationType: PerformanceProfile['operationType']): PerformanceProfile[] {
    const ids = this.profilesByType.get(operationType) || [];
    return ids
      .map(id => this.profiles.get(id))
      .filter((p): p is PerformanceProfile => p !== undefined);
  }

  /**
   * 最適化結果を記録
   */
  recordOptimization(
    optimizationType: OptimizationResult['optimizationType'],
    targetMetric: string,
    beforeValue: number,
    afterValue: number
  ): OptimizationResult {
    const resultId = `OPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const improvement = beforeValue - afterValue;
    const improvementPercent = (improvement / beforeValue) * 100;

    const result: OptimizationResult = {
      resultId,
      timestamp: Date.now(),
      optimizationType,
      targetMetric,
      beforeValue,
      afterValue,
      improvement,
      improvementPercent,
    };

    this.results.set(resultId, result);

    if (!this.resultsByType.has(optimizationType)) {
      this.resultsByType.set(optimizationType, []);
    }
    this.resultsByType.get(optimizationType)!.push(resultId);

    return result;
  }

  /**
   * 最適化結果を取得
   */
  getOptimizationResult(resultId: string): OptimizationResult | undefined {
    return this.results.get(resultId);
  }

  /**
   * 最適化タイプ別結果を取得
   */
  getOptimizationsByType(optimizationType: OptimizationResult['optimizationType']): OptimizationResult[] {
    const ids = this.resultsByType.get(optimizationType) || [];
    return ids
      .map(id => this.results.get(id))
      .filter((r): r is OptimizationResult => r !== undefined);
  }

  /**
   * キャッシュにエントリを追加
   */
  setCacheEntry(key: string, value: any, ttl: number = 3600000): CacheEntry {
    const entry: CacheEntry = {
      key,
      value,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      size: JSON.stringify(value).length,
    };

    this.cache.set(key, entry);
    return entry;
  }

  /**
   * キャッシュからエントリを取得
   */
  getCacheEntry(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // TTLをチェック
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.value;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): number {
    const size = this.cache.size;
    this.cache.clear();
    return size;
  }

  /**
   * 期限切れキャッシュを削除
   */
  cleanExpiredCache(): number {
    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of Array.from(this.cache)) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStats(): {
    totalEntries: number;
    totalSize: number;
    averageHits: number;
    hitRate: number;
  } {
    const entries = Array.from(this.cache.values());
    const stats = {
      totalEntries: entries.length,
      totalSize: 0,
      averageHits: 0,
      hitRate: 0,
    };

    let totalHits = 0;

    for (const entry of entries) {
      stats.totalSize += entry.size;
      totalHits += entry.hits;
    }

    stats.averageHits = entries.length > 0 ? totalHits / entries.length : 0;
    stats.hitRate = entries.length > 0 ? (totalHits / (totalHits + entries.length)) * 100 : 0;

    return stats;
  }

  /**
   * 平均応答時間を計算
   */
  getAverageResponseTime(operationType?: PerformanceProfile['operationType']): number {
    let profiles: PerformanceProfile[];

    if (operationType) {
      profiles = this.getProfilesByType(operationType);
    } else {
      profiles = Array.from(this.profiles.values());
    }

    if (profiles.length === 0) return 0;

    const totalDuration = profiles.reduce((sum, p) => sum + p.duration, 0);
    return totalDuration / profiles.length;
  }

  /**
   * メモリ使用量の平均を計算
   */
  getAverageMemoryUsage(): number {
    const profiles = Array.from(this.profiles.values());
    if (profiles.length === 0) return 0;

    const totalMemory = profiles.reduce((sum, p) => sum + (p.memoryAfter - p.memoryBefore), 0);
    return totalMemory / profiles.length;
  }

  /**
   * CPU使用率の平均を計算
   */
  getAverageCPUUsage(): number {
    const profiles = Array.from(this.profiles.values());
    if (profiles.length === 0) return 0;

    const totalCPU = profiles.reduce((sum, p) => sum + p.cpuUsage, 0);
    return totalCPU / profiles.length;
  }

  /**
   * 最適化の総改善率を計算
   */
  getTotalImprovementRate(): number {
    const results = Array.from(this.results.values());
    if (results.length === 0) return 0;

    const totalImprovement = results.reduce((sum, r) => sum + r.improvementPercent, 0);
    return totalImprovement / results.length;
  }

  /**
   * パフォーマンス統計を取得
   */
  getPerformanceStats(): {
    totalProfiles: number;
    successRate: number;
    averageResponseTime: number;
    averageMemoryUsage: number;
    averageCPUUsage: number;
    byOperationType: Record<string, { count: number; avgDuration: number }>;
  } {
    const profiles = Array.from(this.profiles.values());
    const stats = {
      totalProfiles: profiles.length,
      successRate: 0,
      averageResponseTime: this.getAverageResponseTime(),
      averageMemoryUsage: this.getAverageMemoryUsage(),
      averageCPUUsage: this.getAverageCPUUsage(),
      byOperationType: {} as Record<string, { count: number; avgDuration: number }>,
    };

    if (profiles.length > 0) {
      const successCount = profiles.filter(p => p.status === 'success').length;
      stats.successRate = (successCount / profiles.length) * 100;
    }

    for (const [type, ids] of Array.from(this.profilesByType)) {
      const typeProfiles = ids
        .map(id => this.profiles.get(id))
        .filter((p): p is PerformanceProfile => p !== undefined);

      if (typeProfiles.length > 0) {
        const avgDuration = typeProfiles.reduce((sum, p) => sum + p.duration, 0) / typeProfiles.length;
        stats.byOperationType[type] = {
          count: typeProfiles.length,
          avgDuration,
        };
      }
    }

    return stats;
  }

  /**
   * 全プロファイルを取得
   */
  getAllProfiles(): PerformanceProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * 全最適化結果を取得
   */
  getAllOptimizations(): OptimizationResult[] {
    return Array.from(this.results.values());
  }

  /**
   * プロファイルを削除
   */
  deleteProfile(profileId: string): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) return false;

    const typeIds = this.profilesByType.get(profile.operationType) || [];
    const index = typeIds.indexOf(profileId);
    if (index > -1) {
      typeIds.splice(index, 1);
    }

    this.profiles.delete(profileId);
    return true;
  }

  /**
   * 最適化結果を削除
   */
  deleteOptimization(resultId: string): boolean {
    const result = this.results.get(resultId);
    if (!result) return false;

    const typeIds = this.resultsByType.get(result.optimizationType) || [];
    const index = typeIds.indexOf(resultId);
    if (index > -1) {
      typeIds.splice(index, 1);
    }

    this.results.delete(resultId);
    return true;
  }

  /**
   * 遅いプロファイルを取得
   */
  getSlowProfiles(threshold: number = 1000): PerformanceProfile[] {
    return Array.from(this.profiles.values()).filter(p => p.duration > threshold);
  }

  /**
   * 最適化効果が高い結果を取得
   */
  getHighImpactOptimizations(threshold: number = 20): OptimizationResult[] {
    return Array.from(this.results.values()).filter(r => r.improvementPercent >= threshold);
  }
}
