import { globalCache } from './performanceCache';
import { globalProcessor } from './parallelProcessor';
import { globalMemoryOptimizer } from './memoryOptimizer';
import { globalGPUAccelerator } from './gpuAccelerator';

/**
 * パフォーマンス監視・最適化エンジン
 * - リアルタイム監視
 * - 自動最適化
 * - ボトルネック検出
 * - レポート生成
 */

interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  cacheHit?: boolean;
  parallelized?: boolean;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private thresholds = {
    slow: 1000, // 1秒以上は遅い
    veryFast: 100, // 100ms以下は高速
  };

  /**
   * 操作を監視して実行
   */
  async monitorOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    options?: { useCache?: boolean; parallel?: boolean }
  ): Promise<T> {
    const metric: PerformanceMetrics = {
      operationName,
      startTime: Date.now(),
      success: false,
    };

    try {
      // キャッシュチェック
      if (options?.useCache) {
        const cached = globalCache.get(operationName, {});
        if (cached !== undefined) {
          metric.cacheHit = true;
          metric.endTime = Date.now();
          metric.duration = metric.endTime - metric.startTime;
          metric.success = true;
          this.metrics.push(metric);
          return cached;
        }
      }

      // 操作実行
      const result = await operation();

      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = true;

      // キャッシュに保存
      if (options?.useCache) {
        globalCache.set(operationName, {}, result);
      }

      this.metrics.push(metric);
      return result;
    } catch (error) {
      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = false;
      metric.error = (error as Error).message;
      this.metrics.push(metric);
      throw error;
    }
  }

  /**
   * バッチ操作を監視
   */
  async monitorBatchOperation<T, R>(
    operationName: string,
    items: T[],
    processor: (item: T) => Promise<R>,
    options?: { concurrency?: number }
  ): Promise<R[]> {
    const metric: PerformanceMetrics = {
      operationName: `${operationName} (batch: ${items.length})`,
      startTime: Date.now(),
      success: false,
      parallelized: true,
    };

    try {
      const results = await globalProcessor.processBatch(
        items,
        processor,
        options
      );

      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = true;
      this.metrics.push(metric);

      return results;
    } catch (error) {
      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = false;
      metric.error = (error as Error).message;
      this.metrics.push(metric);
      throw error;
    }
  }

  /**
   * ボトルネックを検出
   */
  detectBottlenecks() {
    const bottlenecks: PerformanceMetrics[] = [];

    this.metrics.forEach((metric) => {
      if (metric.duration && metric.duration > this.thresholds.slow) {
        bottlenecks.push(metric);
      }
    });

    return bottlenecks.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  }

  /**
   * パフォーマンスレポートを生成
   */
  generateReport() {
    const totalMetrics = this.metrics.length;
    const successCount = this.metrics.filter((m) => m.success).length;
    const totalDuration = this.metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const avgDuration = totalDuration / totalMetrics;

    const cacheHits = this.metrics.filter((m) => m.cacheHit).length;
    const parallelOps = this.metrics.filter((m) => m.parallelized).length;

    const bottlenecks = this.detectBottlenecks();

    const memoryStats = globalMemoryOptimizer.getMemoryStats();
    const gpuStats = globalGPUAccelerator.getStats();
    const cacheStats = globalCache.getStats();

    return {
      summary: {
        totalOperations: totalMetrics,
        successRate: `${((successCount / totalMetrics) * 100).toFixed(2)}%`,
        avgDuration: `${avgDuration.toFixed(2)}ms`,
        totalDuration: `${totalDuration.toFixed(2)}ms`,
      },
      optimization: {
        cacheHits,
        cacheHitRate: `${((cacheHits / totalMetrics) * 100).toFixed(2)}%`,
        parallelOperations: parallelOps,
        parallelizationRate: `${((parallelOps / totalMetrics) * 100).toFixed(2)}%`,
      },
      resources: {
        memory: memoryStats,
        gpu: gpuStats,
        cache: cacheStats,
      },
      bottlenecks: bottlenecks.slice(0, 10).map((m) => ({
        operation: m.operationName,
        duration: `${m.duration}ms`,
        error: m.error,
      })),
      recommendations: this.generateRecommendations(bottlenecks, memoryStats),
    };
  }

  /**
   * 最適化の推奨事項を生成
   */
  private generateRecommendations(
    bottlenecks: PerformanceMetrics[],
    memoryStats: any
  ): string[] {
    const recommendations: string[] = [];

    if (bottlenecks.length > 0) {
      recommendations.push(
        `${bottlenecks.length}個のボトルネック操作が検出されました。キャッシングまたは並列化を検討してください。`
      );
    }

    if (memoryStats.usagePercent > 80) {
      recommendations.push(
        'メモリ使用率が高い（80%以上）です。ガベージコレクションを実行してください。'
      );
    }

    const cacheStats = globalCache.getStats();
    if (cacheStats.hitRate < 0.5) {
      recommendations.push('キャッシュヒット率が低い（50%未満）です。キャッシュサイズを増やすか、TTLを調整してください。');
    }

    return recommendations;
  }

  /**
   * メトリクスをリセット
   */
  reset(): void {
    this.metrics = [];
  }

  /**
   * メトリクスを取得
   */
  getMetrics(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * 操作別の統計
   */
  getOperationStats() {
    const stats: { [key: string]: { count: number; avgDuration: number; successRate: number } } = {};

    this.metrics.forEach((metric) => {
      if (!stats[metric.operationName]) {
        stats[metric.operationName] = {
          count: 0,
          avgDuration: 0,
          successRate: 0,
        };
      }

      stats[metric.operationName].count++;
      stats[metric.operationName].avgDuration += metric.duration || 0;
      if (metric.success) {
        stats[metric.operationName].successRate++;
      }
    });

    // 平均を計算
    Object.keys(stats).forEach((key) => {
      stats[key].avgDuration /= stats[key].count;
      stats[key].successRate = (stats[key].successRate / stats[key].count) * 100;
    });

    return stats;
  }
}

// グローバルパフォーマンスモニタインスタンス
export const globalPerformanceMonitor = new PerformanceMonitor();
