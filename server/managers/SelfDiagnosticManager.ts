/**
 * SelfDiagnosticManager - 自己診断管理
 * 
 * 機能:
 * - 自己診断実行
 * - 問題検出
 * - 改善提案
 * - 診断レポート生成
 */

export interface DiagnosticResult {
  resultId: string;
  timestamp: number;
  status: 'healthy' | 'warning' | 'critical';
  diagnostics: Diagnostic[];
  problems: DiagnosticProblem[];
  improvements: ImprovementSuggestion[];
  score: number; // 0-100
}

export interface Diagnostic {
  id: string;
  category: 'performance' | 'security' | 'reliability' | 'scalability' | 'maintainability';
  name: string;
  result: 'pass' | 'warning' | 'fail';
  value: number;
  threshold: number;
  details: string;
}

export interface DiagnosticProblem {
  problemId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  impact: string;
  affectedComponents: string[];
}

export interface ImprovementSuggestion {
  suggestionId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedBenefit: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  relatedProblems: string[];
}

export class SelfDiagnosticManager {
  private static instance: SelfDiagnosticManager;
  private diagnosticResults: Map<string, DiagnosticResult> = new Map();
  private resultCounter: number = 0;

  private constructor() {}

  static getInstance(): SelfDiagnosticManager {
    if (!SelfDiagnosticManager.instance) {
      SelfDiagnosticManager.instance = new SelfDiagnosticManager();
    }
    return SelfDiagnosticManager.instance;
  }

  /**
   * 自己診断実行
   */
  executeDiagnostics(
    diagnostics: Diagnostic[],
    problems: DiagnosticProblem[],
    improvements: ImprovementSuggestion[]
  ): DiagnosticResult {
    const resultId = `diagnostic_${++this.resultCounter}_${Date.now()}`;

    // ステータス判定
    const criticalProblems = problems.filter((p: DiagnosticProblem) => p.severity === 'critical');
    const highProblems = problems.filter((p: DiagnosticProblem) => p.severity === 'high');

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalProblems.length > 0) {
      status = 'critical';
    } else if (highProblems.length > 0) {
      status = 'warning';
    }

    // スコア計算
    const failCount = diagnostics.filter((d: Diagnostic) => d.result === 'fail').length;
    const warningCount = diagnostics.filter((d: Diagnostic) => d.result === 'warning').length;
    const passCount = diagnostics.filter((d: Diagnostic) => d.result === 'pass').length;

    const score = Math.max(
      0,
      100 - failCount * 20 - warningCount * 10 + (passCount > 0 ? passCount * 2 : 0)
    );

    const result: DiagnosticResult = {
      resultId,
      timestamp: Date.now(),
      status,
      diagnostics,
      problems,
      improvements,
      score: Math.min(100, Math.max(0, score)),
    };

    this.diagnosticResults.set(resultId, result);

    // 最新1000件のみ保持
    if (this.diagnosticResults.size > 1000) {
      const firstKey = this.diagnosticResults.keys().next().value;
      if (firstKey) {
        this.diagnosticResults.delete(firstKey);
      }
    }

    return result;
  }

  /**
   * 診断結果取得
   */
  getDiagnosticResult(resultId: string): DiagnosticResult | null {
    return this.diagnosticResults.get(resultId) || null;
  }

  /**
   * すべての診断結果取得
   */
  getAllDiagnosticResults(): DiagnosticResult[] {
    return Array.from(this.diagnosticResults.values());
  }

  /**
   * 最新診断結果取得
   */
  getLatestDiagnosticResult(): DiagnosticResult | null {
    const results = this.getAllDiagnosticResults();
    if (results.length === 0) return null;
    return results.reduce((latest: DiagnosticResult, current: DiagnosticResult) =>
      current.timestamp > latest.timestamp ? current : latest
    );
  }

  /**
   * 問題検出
   */
  detectProblems(): DiagnosticProblem[] {
    const latest = this.getLatestDiagnosticResult();
    return latest ? latest.problems : [];
  }

  /**
   * 改善提案取得
   */
  getImprovementSuggestions(): ImprovementSuggestion[] {
    const latest = this.getLatestDiagnosticResult();
    return latest ? latest.improvements : [];
  }

  /**
   * 診断統計取得
   */
  getDiagnosticStatistics(): {
    totalDiagnostics: number;
    healthyDiagnostics: number;
    warningDiagnostics: number;
    criticalDiagnostics: number;
    averageScore: number;
    totalProblems: number;
    totalSuggestions: number;
  } {
    const results = this.getAllDiagnosticResults();
    const healthyCount = results.filter((r: DiagnosticResult) => r.status === 'healthy').length;
    const warningCount = results.filter((r: DiagnosticResult) => r.status === 'warning').length;
    const criticalCount = results.filter((r: DiagnosticResult) => r.status === 'critical').length;

    const avgScore = results.length > 0 ? results.reduce((sum: number, r: DiagnosticResult) => sum + r.score, 0) / results.length : 0;

    const totalProblems = results.reduce((sum: number, r: DiagnosticResult) => sum + r.problems.length, 0);
    const totalSuggestions = results.reduce((sum: number, r: DiagnosticResult) => sum + r.improvements.length, 0);

    return {
      totalDiagnostics: results.length,
      healthyDiagnostics: healthyCount,
      warningDiagnostics: warningCount,
      criticalDiagnostics: criticalCount,
      averageScore: avgScore,
      totalProblems,
      totalSuggestions,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.diagnosticResults.clear();
  }
}

export const selfDiagnosticManager = SelfDiagnosticManager.getInstance();
export default selfDiagnosticManager;
