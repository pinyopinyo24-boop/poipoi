import { describe, it, expect, beforeEach } from 'vitest';

/**
 * APKOptimizationService
 * APK最適化・ProGuard・リソース削除
 */
export interface OptimizationReport {
  reportId: string;
  artifactPath: string;
  originalSize: number;
  optimizedSize: number;
  reductionPercent: number;
  optimizationSteps: OptimizationStep[];
  timestamp: Date;
}

export interface OptimizationStep {
  stepId: string;
  name: string;
  type: 'proguard' | 'resource-shrinking' | 'compression' | 'dex-optimization';
  sizeBefore: number;
  sizeAfter: number;
  reductionBytes: number;
  status: 'completed' | 'failed';
  duration: number;
}

export class APKOptimizationService {
  private reports: Map<string, OptimizationReport> = new Map();
  private optimizationHistory: OptimizationReport[] = [];

  /**
   * ProGuard最適化を実行
   */
  runProGuardOptimization(artifactPath: string, currentSize: number): OptimizationStep {
    const stepId = `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // シミュレーション: ProGuard最適化で15-25%削減
    const reduction = Math.random() * 0.1 + 0.15;
    const sizeAfter = Math.floor(currentSize * (1 - reduction));
    const reductionBytes = currentSize - sizeAfter;

    return {
      stepId,
      name: 'ProGuard Code Obfuscation',
      type: 'proguard',
      sizeBefore: currentSize,
      sizeAfter,
      reductionBytes,
      status: 'completed',
      duration: Math.random() * 10000 + 5000,
    };
  }

  /**
   * リソース削除最適化を実行
   */
  runResourceShrinking(artifactPath: string, currentSize: number): OptimizationStep {
    const stepId = `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // シミュレーション: リソース削除で5-15%削減
    const reduction = Math.random() * 0.1 + 0.05;
    const sizeAfter = Math.floor(currentSize * (1 - reduction));
    const reductionBytes = currentSize - sizeAfter;

    return {
      stepId,
      name: 'Resource Shrinking',
      type: 'resource-shrinking',
      sizeBefore: currentSize,
      sizeAfter,
      reductionBytes,
      status: 'completed',
      duration: Math.random() * 5000 + 2000,
    };
  }

  /**
   * 圧縮最適化を実行
   */
  runCompressionOptimization(artifactPath: string, currentSize: number): OptimizationStep {
    const stepId = `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // シミュレーション: 圧縮で3-8%削減
    const reduction = Math.random() * 0.05 + 0.03;
    const sizeAfter = Math.floor(currentSize * (1 - reduction));
    const reductionBytes = currentSize - sizeAfter;

    return {
      stepId,
      name: 'Compression Optimization',
      type: 'compression',
      sizeBefore: currentSize,
      sizeAfter,
      reductionBytes,
      status: 'completed',
      duration: Math.random() * 3000 + 1000,
    };
  }

  /**
   * DEX最適化を実行
   */
  runDexOptimization(artifactPath: string, currentSize: number): OptimizationStep {
    const stepId = `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // シミュレーション: DEX最適化で2-5%削減
    const reduction = Math.random() * 0.03 + 0.02;
    const sizeAfter = Math.floor(currentSize * (1 - reduction));
    const reductionBytes = currentSize - sizeAfter;

    return {
      stepId,
      name: 'DEX Optimization',
      type: 'dex-optimization',
      sizeBefore: currentSize,
      sizeAfter,
      reductionBytes,
      status: 'completed',
      duration: Math.random() * 4000 + 2000,
    };
  }

  /**
   * 完全最適化パイプラインを実行
   */
  runFullOptimization(artifactPath: string, originalSize: number): OptimizationReport {
    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const steps: OptimizationStep[] = [];

    let currentSize = originalSize;

    // Step 1: ProGuard
    const proguardStep = this.runProGuardOptimization(artifactPath, currentSize);
    steps.push(proguardStep);
    currentSize = proguardStep.sizeAfter;

    // Step 2: Resource Shrinking
    const resourceStep = this.runResourceShrinking(artifactPath, currentSize);
    steps.push(resourceStep);
    currentSize = resourceStep.sizeAfter;

    // Step 3: Compression
    const compressionStep = this.runCompressionOptimization(artifactPath, currentSize);
    steps.push(compressionStep);
    currentSize = compressionStep.sizeAfter;

    // Step 4: DEX Optimization
    const dexStep = this.runDexOptimization(artifactPath, currentSize);
    steps.push(dexStep);
    currentSize = dexStep.sizeAfter;

    const reductionPercent = ((originalSize - currentSize) / originalSize) * 100;

    const report: OptimizationReport = {
      reportId,
      artifactPath,
      originalSize,
      optimizedSize: currentSize,
      reductionPercent: Math.round(reductionPercent * 100) / 100,
      optimizationSteps: steps,
      timestamp: new Date(),
    };

    this.reports.set(reportId, report);
    this.optimizationHistory.push(report);

    return report;
  }

  /**
   * 最適化レポートを取得
   */
  getReport(reportId: string): OptimizationReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * すべてのレポートを取得
   */
  getAllReports(): OptimizationReport[] {
    return Array.from(this.reports.values());
  }

  /**
   * 最適化履歴を取得
   */
  getOptimizationHistory(): OptimizationReport[] {
    return [...this.optimizationHistory];
  }

  /**
   * 最適化統計を計算
   */
  calculateOptimizationStats(): {
    totalOptimizations: number;
    totalOriginalSize: number;
    totalOptimizedSize: number;
    averageReductionPercent: number;
    totalReductionBytes: number;
  } {
    const totalOptimizations = this.optimizationHistory.length;

    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    let totalReductionPercent = 0;

    this.optimizationHistory.forEach((report) => {
      totalOriginalSize += report.originalSize;
      totalOptimizedSize += report.optimizedSize;
      totalReductionPercent += report.reductionPercent;
    });

    const averageReductionPercent = totalOptimizations > 0 ? totalReductionPercent / totalOptimizations : 0;
    const totalReductionBytes = totalOriginalSize - totalOptimizedSize;

    return {
      totalOptimizations,
      totalOriginalSize,
      totalOptimizedSize,
      averageReductionPercent: Math.round(averageReductionPercent * 100) / 100,
      totalReductionBytes,
    };
  }

  /**
   * 最適化レポートをMarkdown形式で生成
   */
  generateMarkdownReport(reportId: string): string {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    let markdown = `# APK Optimization Report

**Report ID:** ${report.reportId}
**Artifact:** ${report.artifactPath}
**Timestamp:** ${report.timestamp.toISOString()}

## Summary

| Metric | Value |
|--------|-------|
| Original Size | ${(report.originalSize / 1024 / 1024).toFixed(2)} MB |
| Optimized Size | ${(report.optimizedSize / 1024 / 1024).toFixed(2)} MB |
| Reduction | ${(report.reductionPercent).toFixed(2)}% |
| Saved Space | ${((report.originalSize - report.optimizedSize) / 1024 / 1024).toFixed(2)} MB |

## Optimization Steps

`;

    report.optimizationSteps.forEach((step, index) => {
      markdown += `### Step ${index + 1}: ${step.name}

- **Type:** ${step.type}
- **Status:** ${step.status}
- **Size Before:** ${(step.sizeBefore / 1024 / 1024).toFixed(2)} MB
- **Size After:** ${(step.sizeAfter / 1024 / 1024).toFixed(2)} MB
- **Reduction:** ${((step.reductionBytes / step.sizeBefore) * 100).toFixed(2)}% (${(step.reductionBytes / 1024 / 1024).toFixed(2)} MB)
- **Duration:** ${(step.duration / 1000).toFixed(2)}s

`;
    });

    return markdown;
  }
}

// ============ TESTS ============

describe('APKOptimizationService', () => {
  let service: APKOptimizationService;

  beforeEach(() => {
    service = new APKOptimizationService();
  });

  describe('runProGuardOptimization', () => {
    it('should run ProGuard optimization', () => {
      const step = service.runProGuardOptimization('app-release.apk', 40000000);

      expect(step.type).toBe('proguard');
      expect(step.status).toBe('completed');
      expect(step.sizeAfter).toBeLessThan(step.sizeBefore);
    });
  });

  describe('runResourceShrinking', () => {
    it('should run resource shrinking', () => {
      const step = service.runResourceShrinking('app-release.apk', 40000000);

      expect(step.type).toBe('resource-shrinking');
      expect(step.status).toBe('completed');
      expect(step.sizeAfter).toBeLessThan(step.sizeBefore);
    });
  });

  describe('runCompressionOptimization', () => {
    it('should run compression optimization', () => {
      const step = service.runCompressionOptimization('app-release.apk', 40000000);

      expect(step.type).toBe('compression');
      expect(step.status).toBe('completed');
      expect(step.sizeAfter).toBeLessThan(step.sizeBefore);
    });
  });

  describe('runDexOptimization', () => {
    it('should run DEX optimization', () => {
      const step = service.runDexOptimization('app-release.apk', 40000000);

      expect(step.type).toBe('dex-optimization');
      expect(step.status).toBe('completed');
      expect(step.sizeAfter).toBeLessThan(step.sizeBefore);
    });
  });

  describe('runFullOptimization', () => {
    it('should run full optimization pipeline', () => {
      const report = service.runFullOptimization('app-release.apk', 40000000);

      expect(report.optimizationSteps).toHaveLength(4);
      expect(report.optimizedSize).toBeLessThan(report.originalSize);
      expect(report.reductionPercent).toBeGreaterThan(0);
    });
  });

  describe('calculateOptimizationStats', () => {
    it('should calculate optimization statistics', () => {
      service.runFullOptimization('app-release.apk', 40000000);
      service.runFullOptimization('app-debug.apk', 60000000);

      const stats = service.calculateOptimizationStats();
      expect(stats.totalOptimizations).toBe(2);
      expect(stats.totalOriginalSize).toBeGreaterThan(0);
      expect(stats.averageReductionPercent).toBeGreaterThan(0);
    });
  });

  describe('generateMarkdownReport', () => {
    it('should generate markdown report', () => {
      const report = service.runFullOptimization('app-release.apk', 40000000);
      const markdown = service.generateMarkdownReport(report.reportId);

      expect(markdown).toContain('APK Optimization Report');
      expect(markdown).toContain('Summary');
      expect(markdown).toContain('Optimization Steps');
    });
  });

  describe('Complete optimization workflow', () => {
    it('should handle complete optimization workflow', () => {
      const report = service.runFullOptimization('app-release.apk', 40000000);

      expect(report.optimizationSteps).toHaveLength(4);
      expect(report.reductionPercent).toBeGreaterThan(20);
      expect(report.reductionPercent).toBeLessThan(60);

      const markdown = service.generateMarkdownReport(report.reportId);
      expect(markdown).toContain('Optimization Steps');
    });
  });
});
