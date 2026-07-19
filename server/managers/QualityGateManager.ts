/**
 * QualityGateManager - 品質ゲート管理
 * 
 * 機能:
 * - コード品質チェック
 * - テスト結果確認
 * - セキュリティ検証
 * - デプロイメント承認
 */

export interface QualityMetrics {
  codeQualityScore: number; // 0-100
  testCoverage: number; // 0-100
  securityScore: number; // 0-100
  performanceScore: number; // 0-100
  overallScore: number; // 0-100
}

export interface QualityGate {
  gateId: string;
  version: string;
  timestamp: number;
  status: 'passed' | 'failed' | 'warning';
  metrics: QualityMetrics;
  issues: QualityIssue[];
  recommendations: string[];
  canDeploy: boolean;
}

export interface QualityIssue {
  issueId: string;
  type: 'code_quality' | 'test_coverage' | 'security' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  file?: string;
  line?: number;
}

export class QualityGateManager {
  private static instance: QualityGateManager;
  private qualityGates: Map<string, QualityGate> = new Map();
  private gateCounter: number = 0;

  private constructor() {}

  static getInstance(): QualityGateManager {
    if (!QualityGateManager.instance) {
      QualityGateManager.instance = new QualityGateManager();
    }
    return QualityGateManager.instance;
  }

  /**
   * 品質ゲート実行
   */
  executeQualityGate(
    version: string,
    codeQualityScore: number,
    testCoverage: number,
    securityScore: number,
    performanceScore: number,
    issues: QualityIssue[]
  ): QualityGate {
    const gateId = `gate_${++this.gateCounter}_${Date.now()}`;

    // スコア計算
    const overallScore = (codeQualityScore + testCoverage + securityScore + performanceScore) / 4;

    // ステータス判定
    let status: 'passed' | 'failed' | 'warning' = 'passed';
    const criticalIssues = issues.filter((i: QualityIssue) => i.severity === 'critical');
    const highIssues = issues.filter((i: QualityIssue) => i.severity === 'high');

    if (criticalIssues.length > 0 || codeQualityScore < 60 || testCoverage < 70 || securityScore < 70) {
      status = 'failed';
    } else if (highIssues.length > 0 || overallScore < 80) {
      status = 'warning';
    }

    // 推奨事項生成
    const recommendations: string[] = [];
    if (codeQualityScore < 80) {
      recommendations.push('コード品質スコアを改善してください');
    }
    if (testCoverage < 85) {
      recommendations.push('テストカバレッジを増加させてください');
    }
    if (securityScore < 85) {
      recommendations.push('セキュリティ脆弱性を修正してください');
    }
    if (performanceScore < 80) {
      recommendations.push('パフォーマンスを最適化してください');
    }

    const gate: QualityGate = {
      gateId,
      version,
      timestamp: Date.now(),
      status,
      metrics: {
        codeQualityScore,
        testCoverage,
        securityScore,
        performanceScore,
        overallScore,
      },
      issues,
      recommendations,
      canDeploy: status !== 'failed',
    };

    this.qualityGates.set(gateId, gate);

    // 最新1000件のみ保持
    if (this.qualityGates.size > 1000) {
      const firstKey = this.getFirstKey();
      if (firstKey) {
        this.qualityGates.delete(firstKey);
      }
    }

    return gate;
  }

  /**
   * 品質ゲート取得
   */
  getQualityGate(gateId: string): QualityGate | null {
    return this.qualityGates.get(gateId) || null;
  }

  /**
   * すべての品質ゲート取得
   */
  getAllQualityGates(): QualityGate[] {
    return Array.from(this.qualityGates.values());
  }

  /**
   * 品質ゲート取得（Map用）
   */
  private getFirstKey(): string | undefined {
    return this.qualityGates.keys().next().value;
  }

  /**
   * バージョンの最新品質ゲート取得
   */
  getLatestQualityGate(version: string): QualityGate | null {
    const gates = Array.from(this.qualityGates.values())
      .filter((g: QualityGate) => g.version === version)
      .sort((a: QualityGate, b: QualityGate) => b.timestamp - a.timestamp);
    return gates.length > 0 ? gates[0] : null;
  }

  /**
   * デプロイ可能判定
   */
  canDeploy(version: string): boolean {
    const gate = this.getLatestQualityGate(version);
    return gate ? gate.canDeploy : false;
  }

  /**
   * 品質問題検出
   */
  detectQualityIssues(version: string): QualityIssue[] {
    const gate = this.getLatestQualityGate(version);
    return gate ? gate.issues : [];
  }

  /**
   * 品質統計取得
   */
  getQualityStatistics(): {
    totalGates: number;
    passedGates: number;
    warningGates: number;
    failedGates: number;
    averageCodeQuality: number;
    averageTestCoverage: number;
    averageSecurityScore: number;
    averagePerformanceScore: number;
  } {
    const gates = this.getAllQualityGates();
    const passedCount = gates.filter((g: QualityGate) => g.status === 'passed').length;
    const warningCount = gates.filter((g: QualityGate) => g.status === 'warning').length;
    const failedCount = gates.filter((g: QualityGate) => g.status === 'failed').length;

    const avgCodeQuality =
      gates.length > 0 ? gates.reduce((sum: number, g: QualityGate) => sum + g.metrics.codeQualityScore, 0) / gates.length : 0;
    const avgTestCoverage =
      gates.length > 0 ? gates.reduce((sum: number, g: QualityGate) => sum + g.metrics.testCoverage, 0) / gates.length : 0;
    const avgSecurityScore =
      gates.length > 0 ? gates.reduce((sum: number, g: QualityGate) => sum + g.metrics.securityScore, 0) / gates.length : 0;
    const avgPerformanceScore =
      gates.length > 0 ? gates.reduce((sum: number, g: QualityGate) => sum + g.metrics.performanceScore, 0) / gates.length : 0;

    return {
      totalGates: gates.length,
      passedGates: passedCount,
      warningGates: warningCount,
      failedGates: failedCount,
      averageCodeQuality: avgCodeQuality,
      averageTestCoverage: avgTestCoverage,
      averageSecurityScore: avgSecurityScore,
      averagePerformanceScore: avgPerformanceScore,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.qualityGates.clear();
  }
}

export const qualityGateManager = QualityGateManager.getInstance();
export default qualityGateManager;
