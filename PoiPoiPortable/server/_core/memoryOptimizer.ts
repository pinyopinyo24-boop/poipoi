/**
 * メモリ最適化エンジン
 * - ガベージコレクション制御
 * - メモリ監視
 * - オブジェクトプーリング
 * - ストリーミング処理
 */

interface MemoryConfig {
  maxHeapSize: number; // 最大ヒープサイズ（バイト）
  gcInterval: number; // GC間隔（ミリ秒）
  warningThreshold: number; // 警告閾値（%）
  criticalThreshold: number; // 危機的閾値（%）
}

export class MemoryOptimizer {
  private config: MemoryConfig;
  private stats = {
    gcCount: 0,
    totalGCTime: 0,
    peakMemory: 0,
    currentMemory: 0,
  };

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      maxHeapSize: 512 * 1024 * 1024, // 512MB
      gcInterval: 60000, // 1分
      warningThreshold: 80,
      criticalThreshold: 95,
      ...config,
    };

    this.startMonitoring();
  }

  /**
   * メモリ監視を開始
   */
  private startMonitoring(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.stats.currentMemory = memUsage.heapUsed;

      if (this.stats.currentMemory > this.stats.peakMemory) {
        this.stats.peakMemory = this.stats.currentMemory;
      }

      const usagePercent = (this.stats.currentMemory / this.config.maxHeapSize) * 100;

      if (usagePercent > this.config.criticalThreshold) {
        this.forceGC();
      } else if (usagePercent > this.config.warningThreshold) {
        this.suggestGC();
      }
    }, this.config.gcInterval);
  }

  /**
   * 強制ガベージコレクション
   */
  forceGC(): void {
    if (global.gc) {
      const startTime = Date.now();
      (global as any).gc();
      const gcTime = Date.now() - startTime;

      this.stats.gcCount++;
      this.stats.totalGCTime += gcTime;

      console.log(`[GC] Forced GC executed in ${gcTime}ms`);
    }
  }

  /**
   * GC提案（ソフト）
   */
  private suggestGC(): void {
    if ((global as any).gc) {
      setImmediate(() => {
        ((global as any).gc)();
      });
    }
  }

  /**
   * メモリ使用状況を取得
   */
  getMemoryStats() {
    const memUsage = process.memoryUsage();
    const usagePercent = (memUsage.heapUsed / this.config.maxHeapSize) * 100;

    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      usagePercent: Math.round(usagePercent),
      gcCount: this.stats.gcCount,
      totalGCTime: this.stats.totalGCTime,
      peakMemory: this.stats.peakMemory,
      currentMemory: this.stats.currentMemory,
    };
  }

  /**
   * オブジェクトプール（簡易版）
   */
  createObjectPool<T>(factory: () => T, size: number = 100) {
    const pool: T[] = [];

    for (let i = 0; i < size; i++) {
      pool.push(factory());
    }

    return {
      acquire: (): T => pool.pop() || factory(),
      release: (obj: T): void => {
        if (pool.length < size) {
          pool.push(obj);
        }
      },
      clear: (): void => {
        pool.length = 0;
      },
      size: (): number => pool.length,
    };
  }

  /**
   * ストリーミング処理（メモリ効率的）
   */
  async *streamProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 100
  ): AsyncGenerator<R> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(processor));

      for (const result of results) {
        yield result;
      }

      // メモリ解放
      if ((global as any).gc) {
        ((global as any).gc)();
      }
    }
  }

  /**
   * 大規模配列の処理（チャンク単位）
   */
  async processLargeArray<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    chunkSize: number = 1000
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(chunk.map(processor));
      results.push(...chunkResults);

      // メモリ解放
      if ((global as any).gc && i % (chunkSize * 10) === 0) {
        ((global as any).gc)();
      }
    }

    return results;
  }

  /**
   * 弱参照を使用したキャッシュ
   */
  createWeakCache<K extends object, V>() {
    const cache = new WeakMap<K, V>();

    return {
      set: (key: K, value: V): void => {
        cache.set(key, value);
      },
      get: (key: K): V | undefined => {
        return cache.get(key);
      },
      has: (key: K): boolean => {
        return cache.has(key);
      },
    };
  }

  /**
   * メモリ使用量レポート
   */
  getReport() {
    const stats = this.getMemoryStats();
    return {
      summary: `メモリ使用率: ${stats.usagePercent}%`,
      details: stats,
      recommendation:
        stats.usagePercent > this.config.warningThreshold
          ? 'メモリ使用量が高いため、GCを実行してください'
          : 'メモリ使用量は正常です',
    };
  }
}

// グローバルメモリオプティマイザインスタンス
export const globalMemoryOptimizer = new MemoryOptimizer({
  maxHeapSize: 512 * 1024 * 1024,
  gcInterval: 60000,
  warningThreshold: 80,
  criticalThreshold: 95,
});
