import pLimit from 'p-limit';

/**
 * 並列処理エンジン
 * - バッチ処理
 * - 並列実行制御
 * - タイムアウト管理
 * - エラーハンドリング
 */

interface BatchConfig {
  concurrency: number; // 同時実行数
  timeout: number; // タイムアウト（ミリ秒）
  retries: number; // リトライ回数
}

export class ParallelProcessor {
  private config: BatchConfig;
  private limit: ReturnType<typeof pLimit>;

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = {
      concurrency: 10,
      timeout: 30000,
      retries: 3,
      ...config,
    };
    this.limit = pLimit(this.config.concurrency);
  }

  /**
   * 複数のタスクを並列実行
   */
  async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options?: { concurrency?: number; timeout?: number }
  ): Promise<R[]> {
    const concurrency = options?.concurrency || this.config.concurrency;
    const timeout = options?.timeout || this.config.timeout;
    const limit = pLimit(concurrency);

    const promises = items.map((item) =>
      limit(() => this.executeWithTimeout(processor(item), timeout))
    );

    return Promise.all(promises);
  }

  /**
   * タイムアウト付き実行
   */
  private executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]);
  }

  /**
   * リトライ付き実行
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    retries?: number
  ): Promise<T> {
    const maxRetries = retries ?? this.config.retries;
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          // 指数バックオフ
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, i) * 100)
          );
        }
      }
    }

    throw lastError;
  }

  /**
   * マップ処理（並列）
   */
  async map<T, R>(
    items: T[],
    mapper: (item: T, index: number) => Promise<R>
  ): Promise<R[]> {
    return this.processBatch(
      items,
      async (item) => mapper(item, items.indexOf(item))
    );
  }

  /**
   * フィルター処理（並列）
   */
  async filter<T>(
    items: T[],
    predicate: (item: T) => Promise<boolean>
  ): Promise<T[]> {
    const results = await this.processBatch(items, async (item) => ({
      item,
      pass: await predicate(item),
    }));

    return results.filter((r) => r.pass).map((r) => r.item);
  }

  /**
   * リデュース処理（逐次）
   */
  async reduce<T, R>(
    items: T[],
    reducer: (acc: R, item: T) => Promise<R>,
    initial: R
  ): Promise<R> {
    let accumulator = initial;
    for (const item of items) {
      accumulator = await reducer(accumulator, item);
    }
    return accumulator;
  }

  /**
   * チャンク処理
   */
  async processInChunks<T, R>(
    items: T[],
    processor: (chunk: T[]) => Promise<R[]>,
    chunkSize: number = 100
  ): Promise<R[]> {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }

    const results = await this.processBatch(chunks, processor);
    return results.flat();
  }

  /**
   * 並列実行数を更新
   */
  setConcurrency(concurrency: number): void {
    this.config.concurrency = concurrency;
    this.limit = pLimit(concurrency);
  }

  /**
   * タイムアウトを更新
   */
  setTimeout(timeout: number): void {
    this.config.timeout = timeout;
  }
}

// グローバルプロセッサインスタンス
export const globalProcessor = new ParallelProcessor({
  concurrency: 10,
  timeout: 30000,
  retries: 3,
});
