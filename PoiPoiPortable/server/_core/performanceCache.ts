import NodeCache from 'node-cache';
import crypto from 'crypto';

/**
 * 高性能キャッシング層
 * - LRU キャッシュ
 * - TTL管理
 * - 自動クリーンアップ
 * - メモリ効率最適化
 */

interface CacheConfig {
  stdTTL: number; // 標準TTL（秒）
  checkperiod: number; // チェック周期（秒）
  maxSize: number; // 最大サイズ（バイト）
}

export class PerformanceCache {
  private cache: NodeCache;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };
  private maxSize: number;
  private currentSize = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    const defaultConfig: CacheConfig = {
      stdTTL: 3600, // 1時間
      checkperiod: 600, // 10分
      maxSize: 500 * 1024 * 1024, // 500MB
      ...config,
    };

    this.maxSize = defaultConfig.maxSize;
    this.cache = new NodeCache({
      stdTTL: defaultConfig.stdTTL,
      checkperiod: defaultConfig.checkperiod,
      useClones: false, // メモリ効率
    });

    // 自動クリーンアップ
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * キャッシュキーの生成
   */
  private generateKey(namespace: string, input: any): string {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');
    return `${namespace}:${hash}`;
  }

  /**
   * 値をキャッシュに設定
   */
  set(namespace: string, input: any, value: any, ttl?: number): boolean {
    try {
      const key = this.generateKey(namespace, input);
      const size = JSON.stringify(value).length;

      // サイズチェック
      if (this.currentSize + size > this.maxSize) {
        this.evictLRU();
      }

      if (ttl) {
        this.cache.set(key, value, ttl);
      } else {
        this.cache.set(key, value);
      }
      this.currentSize += size;
      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * キャッシュから値を取得
   */
  get(namespace: string, input: any): any | undefined {
    try {
      const key = this.generateKey(namespace, input);
      const value = this.cache.get(key);

      if (value !== undefined) {
        this.stats.hits++;
      } else {
        this.stats.misses++;
      }

      return value;
    } catch (error) {
      console.error('Cache get error:', error);
      return undefined;
    }
  }

  /**
   * キャッシュをクリア
   */
  delete(namespace: string, input: any): boolean {
    try {
      const key = this.generateKey(namespace, input);
      const value = this.cache.get(key);
      if (value) {
        const size = JSON.stringify(value).length;
        this.currentSize -= size;
      }
      this.cache.del(key);
      this.stats.deletes++;
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * 名前空間全体をクリア
   */
  clearNamespace(namespace: string): void {
    const keys = this.cache.keys();
    keys.forEach((key: string) => {
      if (key.startsWith(`${namespace}:`)) {
        this.delete(namespace, {});
      }
    });
  }

  /**
   * LRU削除（最も使用されていない項目を削除）
   */
  private evictLRU(): void {
    const keys = this.cache.keys();
    if (keys.length > 0) {
      const keyToDelete = keys[0];
      const value = this.cache.get(keyToDelete);
      if (value) {
        const size = JSON.stringify(value).length;
        this.currentSize -= size;
      }
      this.cache.del(keyToDelete);
    }
  }

  /**
   * 自動クリーンアップ
   */
  private cleanup(): void {
    const keys = this.cache.keys();
    let totalSize = 0;

    keys.forEach((key: string) => {
      const value = this.cache.get(key);
      if (value) {
        totalSize += JSON.stringify(value).length;
      }
    });

    this.currentSize = totalSize;

    // メモリ使用率が80%を超えたら削除
    if (this.currentSize > this.maxSize * 0.8) {
      const keysToDelete = Math.ceil(keys.length * 0.2);
      for (let i = 0; i < keysToDelete; i++) {
        this.cache.del(keys[i]);
      }
    }
  }

  /**
   * キャッシュ統計情報を取得
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      size: this.currentSize,
      maxSize: this.maxSize,
      keys: this.cache.keys().length,
    };
  }

  /**
   * すべてクリア
   */
  flushAll(): void {
    this.cache.flushAll();
    this.currentSize = 0;
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }
}

// グローバルキャッシュインスタンス
export const globalCache = new PerformanceCache({
  stdTTL: 3600,
  checkperiod: 600,
  maxSize: 500 * 1024 * 1024,
});
