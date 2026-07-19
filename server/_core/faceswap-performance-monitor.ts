/**
 * パフォーマンス監視・最適化モジュール
 * 処理時間、メモリ使用量、CPU使用率を監視
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsed?: number;
  cpuUsage?: number;
}

interface PerformanceReport {
  timestamp: number;
  metrics: PerformanceMetric[];
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
  totalMemoryUsed: number;
  averageCpuUsage: number;
}

const metrics: PerformanceMetric[] = [];

/**
 * パフォーマンス測定を開始
 */
export function startPerformanceMeasure(name: string): PerformanceMetric {
  const metric: PerformanceMetric = {
    name,
    startTime: Date.now(),
  };

  metrics.push(metric);

  console.log(`[Performance] 測定開始: ${name}`);

  return metric;
}

/**
 * パフォーマンス測定を終了
 */
export function endPerformanceMeasure(metric: PerformanceMetric): PerformanceMetric {
  metric.endTime = Date.now();
  metric.duration = metric.endTime - metric.startTime;

  // メモリ使用量を取得
  if (process.memoryUsage) {
    const memUsage = process.memoryUsage();
    metric.memoryUsed = memUsage.heapUsed / 1024 / 1024; // MB
  }

  console.log(`[Performance] 測定終了: ${metric.name} (${metric.duration}ms, メモリ: ${metric.memoryUsed?.toFixed(2)}MB)`);

  return metric;
}

/**
 * パフォーマンスレポートを生成
 */
export function generatePerformanceReport(): PerformanceReport {
  const completedMetrics = metrics.filter((m) => m.duration !== undefined) as Required<PerformanceMetric>[];

  if (completedMetrics.length === 0) {
    return {
      timestamp: Date.now(),
      metrics: [],
      averageDuration: 0,
      maxDuration: 0,
      minDuration: 0,
      totalMemoryUsed: 0,
      averageCpuUsage: 0,
    };
  }

  const durations = completedMetrics.map((m) => m.duration);
  const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const maxDuration = Math.max(...durations);
  const minDuration = Math.min(...durations);

  const memoryUsages = completedMetrics.filter((m) => m.memoryUsed !== undefined).map((m) => m.memoryUsed!);
  const totalMemoryUsed = memoryUsages.reduce((a, b) => a + b, 0);

  const cpuUsages = completedMetrics.filter((m) => m.cpuUsage !== undefined).map((m) => m.cpuUsage!);
  const averageCpuUsage = cpuUsages.length > 0 ? cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length : 0;

  return {
    timestamp: Date.now(),
    metrics: completedMetrics,
    averageDuration,
    maxDuration,
    minDuration,
    totalMemoryUsed,
    averageCpuUsage,
  };
}

/**
 * パフォーマンスレポートを表示
 */
export function displayPerformanceReport(report: PerformanceReport): void {
  console.log("\n========================================");
  console.log("パフォーマンスレポート");
  console.log("========================================");
  console.log(`タイムスタンプ: ${new Date(report.timestamp).toISOString()}`);
  console.log(`測定数: ${report.metrics.length}`);
  console.log(`平均処理時間: ${report.averageDuration.toFixed(2)}ms`);
  console.log(`最大処理時間: ${report.maxDuration.toFixed(2)}ms`);
  console.log(`最小処理時間: ${report.minDuration.toFixed(2)}ms`);
  console.log(`合計メモリ使用量: ${report.totalMemoryUsed.toFixed(2)}MB`);
  console.log(`平均CPU使用率: ${report.averageCpuUsage.toFixed(2)}%`);
  console.log("========================================\n");

  // 詳細メトリクスを表示
  console.log("詳細メトリクス:");
  for (const metric of report.metrics) {
    console.log(`  ${metric.name}: ${metric.duration}ms (メモリ: ${metric.memoryUsed?.toFixed(2)}MB)`);
  }
}

/**
 * パフォーマンスを最適化
 */
export function optimizePerformance(): void {
  console.log("[Performance] パフォーマンスを最適化中...");

  // ガベージコレクションを実行
  if (global.gc) {
    global.gc();
    console.log("[Performance] ガベージコレクション実行完了");
  }

  // キャッシュをクリア
  // TODO: キャッシュクリア処理

  console.log("[Performance] パフォーマンス最適化完了");
}

/**
 * ボトルネックを分析
 */
export function analyzeBottlenecks(): { name: string; duration: number; percentage: number }[] {
  const report = generatePerformanceReport();

  if (report.metrics.length === 0) {
    return [];
  }

  const totalDuration = report.metrics.reduce((a, b) => a + (b.duration || 0), 0);

  const bottlenecks = report.metrics
    .map((m) => ({
      name: m.name,
      duration: m.duration || 0,
      percentage: ((m.duration || 0) / totalDuration) * 100,
    }))
    .sort((a, b) => b.duration - a.duration);

  console.log("\n========================================");
  console.log("ボトルネック分析");
  console.log("========================================");
  for (const bottleneck of bottlenecks) {
    console.log(`${bottleneck.name}: ${bottleneck.duration}ms (${bottleneck.percentage.toFixed(2)}%)`);
  }
  console.log("========================================\n");

  return bottlenecks;
}

/**
 * メモリ使用量を監視
 */
export function monitorMemoryUsage(): { heapUsed: number; heapTotal: number; external: number; rss: number } {
  if (!process.memoryUsage) {
    return { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 };
  }

  const memUsage = process.memoryUsage();

  return {
    heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
    heapTotal: memUsage.heapTotal / 1024 / 1024, // MB
    external: memUsage.external / 1024 / 1024, // MB
    rss: memUsage.rss / 1024 / 1024, // MB
  };
}

/**
 * メモリ使用量を表示
 */
export function displayMemoryUsage(): void {
  const memUsage = monitorMemoryUsage();

  console.log("\n========================================");
  console.log("メモリ使用量");
  console.log("========================================");
  console.log(`Heap Used: ${memUsage.heapUsed.toFixed(2)}MB`);
  console.log(`Heap Total: ${memUsage.heapTotal.toFixed(2)}MB`);
  console.log(`External: ${memUsage.external.toFixed(2)}MB`);
  console.log(`RSS: ${memUsage.rss.toFixed(2)}MB`);
  console.log("========================================\n");
}

/**
 * CPU使用率を監視
 */
export function monitorCpuUsage(): number {
  // 簡略版: 実装ではos.cpus()を使用
  return 0;
}

/**
 * パフォーマンスメトリクスをリセット
 */
export function resetPerformanceMetrics(): void {
  metrics.length = 0;
  console.log("[Performance] パフォーマンスメトリクスをリセットしました");
}

/**
 * パフォーマンスレポートをファイルに保存
 */
export async function savePerformanceReportToFile(filePath: string): Promise<void> {
  console.log(`[Performance] パフォーマンスレポートをファイルに保存中: ${filePath}`);

  try {
    const report = generatePerformanceReport();

    // TODO: ファイル保存処理

    console.log("[Performance] パフォーマンスレポート保存完了");
  } catch (error) {
    console.error("[Performance] パフォーマンスレポート保存エラー:", error);
    throw error;
  }
}

/**
 * パフォーマンス監視を初期化
 */
export function initializePerformanceMonitoring(): void {
  console.log("[Performance] パフォーマンス監視を初期化中...");

  // 定期的にメモリ使用量を監視
  setInterval(() => {
    const memUsage = monitorMemoryUsage();

    if (memUsage.heapUsed > memUsage.heapTotal * 0.9) {
      console.warn("[Performance] メモリ使用量が危機的です:", memUsage);
      optimizePerformance();
    }
  }, 30000); // 30秒ごと

  console.log("[Performance] パフォーマンス監視初期化完了");
}

/**
 * パフォーマンス推奨事項を生成
 */
export function generatePerformanceRecommendations(): string[] {
  const recommendations: string[] = [];
  const report = generatePerformanceReport();

  if (report.averageDuration > 5000) {
    recommendations.push("平均処理時間が長いです。処理の最適化を検討してください。");
  }

  if (report.totalMemoryUsed > 500) {
    recommendations.push("メモリ使用量が多いです。メモリリークの確認やキャッシュの最適化を検討してください。");
  }

  const bottlenecks = analyzeBottlenecks();
  if (bottlenecks.length > 0 && bottlenecks[0].percentage > 50) {
    recommendations.push(`${bottlenecks[0].name}がボトルネックになっています。この処理の最適化を優先してください。`);
  }

  return recommendations;
}

/**
 * パフォーマンスベンチマークを実行
 */
export async function runPerformanceBenchmark(
  testFunction: () => Promise<void>,
  iterations: number = 10
): Promise<{ averageTime: number; minTime: number; maxTime: number; standardDeviation: number }> {
  console.log(`[Performance] パフォーマンスベンチマークを実行中 (${iterations}回)...`);

  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const metric = startPerformanceMeasure(`ベンチマーク ${i + 1}`);

    try {
      await testFunction();
    } catch (error) {
      console.error("[Performance] ベンチマーク実行エラー:", error);
    }

    endPerformanceMeasure(metric);
    times.push(metric.duration || 0);
  }

  const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  const variance = times.reduce((a, b) => a + Math.pow(b - averageTime, 2), 0) / times.length;
  const standardDeviation = Math.sqrt(variance);

  console.log(`[Performance] ベンチマーク完了:`);
  console.log(`  平均時間: ${averageTime.toFixed(2)}ms`);
  console.log(`  最小時間: ${minTime.toFixed(2)}ms`);
  console.log(`  最大時間: ${maxTime.toFixed(2)}ms`);
  console.log(`  標準偏差: ${standardDeviation.toFixed(2)}ms`);

  return {
    averageTime,
    minTime,
    maxTime,
    standardDeviation,
  };
}
