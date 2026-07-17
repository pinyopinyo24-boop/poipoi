/**
 * 顔入れ替え処理のパフォーマンス測定・最適化モジュール
 * ウルトラハイクオリティ処理の各ステップの処理時間を測定し、最適化する
 */

import * as fs from "fs";

export interface PerformanceMetrics {
  stepName: string;
  duration: number;
  percentage: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
}

export interface PerformanceReport {
  totalDuration: number;
  steps: PerformanceMetrics[];
  averageMemoryUsage: number;
  peakMemoryUsage: number;
  recommendations: string[];
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private startTime: number = 0;
  private startMemory: number = 0;

  /**
   * パフォーマンス測定を開始
   */
  start(): void {
    this.startTime = Date.now();
    this.startMemory = this.getMemoryUsage();
    this.metrics = [];
  }

  /**
   * ステップのパフォーマンスを記録
   */
  recordStep(stepName: string): void {
    const now = Date.now();
    const duration = now - this.startTime;
    const currentMemory = this.getMemoryUsage();
    const memoryDelta = currentMemory - this.startMemory;

    this.metrics.push({
      stepName,
      duration,
      percentage: 0, // 後で計算
      memoryBefore: this.startMemory,
      memoryAfter: currentMemory,
      memoryDelta,
    });

    console.log(`[Performance] ${stepName}: ${duration}ms, Memory: ${memoryDelta}MB`);
  }

  /**
   * メモリ使用量を取得（MB）
   */
  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100;
  }

  /**
   * パフォーマンスレポートを生成
   */
  generateReport(): PerformanceReport {
    const totalDuration = this.metrics[this.metrics.length - 1]?.duration || 0;

    // 各ステップの割合を計算
    const metricsWithPercentage = this.metrics.map((m) => ({
      ...m,
      percentage: totalDuration > 0 ? Math.round((m.duration / totalDuration) * 100) : 0,
    }));

    // メモリ使用量の統計
    const memoryUsages = metricsWithPercentage.map((m) => m.memoryAfter);
    const averageMemory = memoryUsages.length > 0 ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length : 0;
    const peakMemory = Math.max(...memoryUsages, 0);

    // 最適化の推奨事項を生成
    const recommendations = this.generateRecommendations(metricsWithPercentage, totalDuration);

    return {
      totalDuration,
      steps: metricsWithPercentage,
      averageMemoryUsage: Math.round(averageMemory * 100) / 100,
      peakMemoryUsage: Math.round(peakMemory * 100) / 100,
      recommendations,
    };
  }

  /**
   * 最適化の推奨事項を生成
   */
  private generateRecommendations(metrics: PerformanceMetrics[], totalDuration: number): string[] {
    const recommendations: string[] = [];

    // 処理時間が長いステップを特定
    metrics.forEach((m) => {
      if (m.percentage > 30) {
        recommendations.push(`${m.stepName}の処理時間が長い（${m.percentage}%）。並列処理やキャッシング機能を検討してください。`);
      }
    });

    // メモリ使用量が多いステップを特定
    metrics.forEach((m) => {
      if (m.memoryDelta > 100) {
        recommendations.push(`${m.stepName}のメモリ使用量が多い（${m.memoryDelta}MB）。バッファの最適化を検討してください。`);
      }
    });

    // 全体的な処理時間が長い場合
    if (totalDuration > 30000) {
      recommendations.push(`全体的な処理時間が長い（${totalDuration}ms）。GPU処理やワーカープロセスの導入を検討してください。`);
    }

    if (recommendations.length === 0) {
      recommendations.push("パフォーマンスは良好です。");
    }

    return recommendations;
  }

  /**
   * レポートをログに出力
   */
  printReport(report: PerformanceReport): void {
    console.log("\n========== パフォーマンスレポート ==========");
    console.log(`総処理時間: ${report.totalDuration}ms`);
    console.log(`平均メモリ使用量: ${report.averageMemoryUsage}MB`);
    console.log(`ピークメモリ使用量: ${report.peakMemoryUsage}MB`);

    console.log("\n--- ステップ別処理時間 ---");
    report.steps.forEach((step) => {
      console.log(`${step.stepName}: ${step.duration}ms (${step.percentage}%)`);
    });

    console.log("\n--- 最適化の推奨事項 ---");
    report.recommendations.forEach((rec) => {
      console.log(`• ${rec}`);
    });
    console.log("==========================================\n");
  }

  /**
   * レポートをファイルに保存
   */
  saveReport(report: PerformanceReport, filePath: string): void {
    const reportText = this.formatReportAsText(report);
    fs.writeFileSync(filePath, reportText);
    console.log(`[Performance] レポートを保存しました: ${filePath}`);
  }

  /**
   * レポートをテキスト形式にフォーマット
   */
  private formatReportAsText(report: PerformanceReport): string {
    let text = "========== パフォーマンスレポート ==========\n";
    text += `総処理時間: ${report.totalDuration}ms\n`;
    text += `平均メモリ使用量: ${report.averageMemoryUsage}MB\n`;
    text += `ピークメモリ使用量: ${report.peakMemoryUsage}MB\n\n`;

    text += "--- ステップ別処理時間 ---\n";
    report.steps.forEach((step) => {
      text += `${step.stepName}: ${step.duration}ms (${step.percentage}%)\n`;
    });

    text += "\n--- 最適化の推奨事項 ---\n";
    report.recommendations.forEach((rec) => {
      text += `• ${rec}\n`;
    });

    return text;
  }
}

// グローバルなパフォーマンスモニター
let globalMonitor: PerformanceMonitor | null = null;

/**
 * パフォーマンス測定を開始
 */
export function startPerformanceMonitoring(): PerformanceMonitor {
  globalMonitor = new PerformanceMonitor();
  globalMonitor.start();
  return globalMonitor;
}

/**
 * グローバルなパフォーマンスモニターを取得
 */
export function getPerformanceMonitor(): PerformanceMonitor | null {
  return globalMonitor;
}

/**
 * パフォーマンスレポートを生成
 */
export function generatePerformanceReport(): PerformanceReport | null {
  if (!globalMonitor) return null;
  return globalMonitor.generateReport();
}

/**
 * パフォーマンスレポートを出力
 */
export function printPerformanceReport(): void {
  if (!globalMonitor) {
    console.log("[Performance] パフォーマンスモニターが初期化されていません");
    return;
  }

  const report = globalMonitor.generateReport();
  globalMonitor.printReport(report);
}

/**
 * パフォーマンスレポートをファイルに保存
 */
export function savePerformanceReport(filePath: string): void {
  if (!globalMonitor) {
    console.log("[Performance] パフォーマンスモニターが初期化されていません");
    return;
  }

  const report = globalMonitor.generateReport();
  globalMonitor.saveReport(report, filePath);
}

/**
 * パフォーマンス測定をリセット
 */
export function resetPerformanceMonitoring(): void {
  globalMonitor = null;
}

export default {
  startPerformanceMonitoring,
  getPerformanceMonitor,
  generatePerformanceReport,
  printPerformanceReport,
  savePerformanceReport,
  resetPerformanceMonitoring,
};
