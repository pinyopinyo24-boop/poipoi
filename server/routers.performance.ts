import { router, publicProcedure } from './_core/trpc';
import { globalPerformanceMonitor } from './_core/performanceMonitor';
import { globalCache } from './_core/performanceCache';
import { globalMemoryOptimizer } from './_core/memoryOptimizer';
import { globalGPUAccelerator } from './_core/gpuAccelerator';
import { z } from 'zod';

export const performanceRouter = router({
  // パフォーマンスレポート取得
  getReport: publicProcedure.query(async () => {
    return globalPerformanceMonitor.generateReport();
  }),

  // メトリクス取得
  getMetrics: publicProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => {
      return globalPerformanceMonitor.getMetrics(input.limit);
    }),

  // 操作別統計
  getOperationStats: publicProcedure.query(async () => {
    return globalPerformanceMonitor.getOperationStats();
  }),

  // ボトルネック検出
  detectBottlenecks: publicProcedure.query(async () => {
    return globalPerformanceMonitor.detectBottlenecks();
  }),

  // キャッシュ統計
  getCacheStats: publicProcedure.query(async () => {
    return globalCache.getStats();
  }),

  // メモリ統計
  getMemoryStats: publicProcedure.query(async () => {
    return globalMemoryOptimizer.getMemoryStats();
  }),

  // GPU統計
  getGPUStats: publicProcedure.query(async () => {
    return globalGPUAccelerator.getStats();
  }),

  // 強制ガベージコレクション
  forceGC: publicProcedure.mutation(async () => {
    globalMemoryOptimizer.forceGC();
    return { success: true, message: 'ガベージコレクション実行完了' };
  }),

  // キャッシュクリア
  clearCache: publicProcedure.mutation(async () => {
    globalCache.flushAll();
    return { success: true, message: 'キャッシュクリア完了' };
  }),

  // GPU バックエンド設定
  setGPUBackend: publicProcedure
    .input(z.object({ backend: z.enum(['cpu', 'gpu', 'auto']) }))
    .mutation(async ({ input }) => {
      globalGPUAccelerator.setBackend(input.backend);
      return { success: true, message: `GPUバックエンド: ${input.backend}` };
    }),

  // メトリクスリセット
  resetMetrics: publicProcedure.mutation(async () => {
    globalPerformanceMonitor.reset();
    return { success: true, message: 'メトリクスリセット完了' };
  }),

  // 総合ダッシュボード
  getDashboard: publicProcedure.query(async () => {
    const report = globalPerformanceMonitor.generateReport();
    const cacheStats = globalCache.getStats();
    const memoryStats = globalMemoryOptimizer.getMemoryStats();
    const gpuStats = globalGPUAccelerator.getStats();

    return {
      timestamp: new Date().toISOString(),
      report,
      cacheStats,
      memoryStats,
      gpuStats,
      operationStats: globalPerformanceMonitor.getOperationStats(),
    };
  }),
});
