/**
 * ContextAnalysisService - コンテキスト分析エンジン
 * 問題のコンテキストを理解
 */

export interface ContextInfo {
  domain: string;
  constraints: string[];
  assumptions: string[];
  relevantFactors: string[];
  timeframe: string;
}

export class ContextAnalysisService {
  /**
   * コンテキストを分析
   */
  async analyzeContext(
    problem: string,
    context: Record<string, unknown>
  ): Promise<ContextInfo> {
    return {
      domain: this.identifyDomain(problem),
      constraints: this.extractConstraints(problem, context),
      assumptions: this.extractAssumptions(problem),
      relevantFactors: this.identifyRelevantFactors(problem, context),
      timeframe: this.determineTimeframe(context),
    };
  }

  /**
   * ドメインを識別
   */
  private identifyDomain(problem: string): string {
    const domains: Record<string, string[]> = {
      technical: ['code', 'system', 'software', 'algorithm', 'database'],
      business: ['profit', 'revenue', 'market', 'customer', 'strategy'],
      scientific: ['experiment', 'hypothesis', 'data', 'research', 'analysis'],
      social: ['people', 'community', 'relationship', 'organization', 'team'],
    };

    const lowerProblem = problem.toLowerCase();

    for (const [domain, keywords] of Object.entries(domains)) {
      for (const keyword of keywords) {
        if (lowerProblem.includes(keyword)) {
          return domain;
        }
      }
    }

    return 'general';
  }

  /**
   * 制約を抽出
   */
  private extractConstraints(
    problem: string,
    context: Record<string, unknown>
  ): string[] {
    const constraints: string[] = [];

    // 問題文から制約を抽出
    if (problem.includes('limited')) constraints.push('Limited resources');
    if (problem.includes('deadline')) constraints.push('Time constraint');
    if (problem.includes('budget')) constraints.push('Budget constraint');
    if (problem.includes('must')) constraints.push('Mandatory requirement');

    // コンテキストから制約を抽出
    for (const [key, value] of Object.entries(context)) {
      if (key.includes('constraint') && typeof value === 'string') {
        constraints.push(value);
      }
    }

    return constraints;
  }

  /**
   * 仮定を抽出
   */
  private extractAssumptions(problem: string): string[] {
    const assumptions: string[] = [];

    // 基本的な仮定
    assumptions.push('Problem is well-defined');
    assumptions.push('Information provided is accurate');

    // 問題文から仮定を抽出
    if (problem.includes('assume')) {
      assumptions.push('Explicit assumptions mentioned');
    }

    return assumptions;
  }

  /**
   * 関連要因を識別
   */
  private identifyRelevantFactors(
    problem: string,
    context: Record<string, unknown>
  ): string[] {
    const factors: string[] = [];

    // 問題文から要因を抽出
    const words = problem.split(/\s+/);
    for (const word of words) {
      if (word.length > 5) {
        factors.push(word);
      }
    }

    // コンテキストから要因を抽出
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string' && value.length > 0) {
        factors.push(`${key}: ${value}`);
      }
    }

    return factors.slice(0, 10); // 最大10個
  }

  /**
   * タイムフレームを決定
   */
  private determineTimeframe(context: Record<string, unknown>): string {
    if (context.timeframe && typeof context.timeframe === 'string') {
      return context.timeframe;
    }

    if (context.deadline) {
      return 'Short-term';
    }

    return 'Medium-term';
  }

  /**
   * コンテキストの妥当性を検証
   */
  async validateContext(contextInfo: ContextInfo): Promise<boolean> {
    if (!contextInfo.domain || contextInfo.domain.length === 0) return false;
    if (contextInfo.constraints.length < 0) return false;
    if (contextInfo.assumptions.length < 1) return false;

    return true;
  }

  /**
   * コンテキストの完全性を評価
   */
  async evaluateContextCompleteness(
    contextInfo: ContextInfo
  ): Promise<number> {
    let score = 0;

    if (contextInfo.domain && contextInfo.domain.length > 0) score += 0.2;
    if (contextInfo.constraints.length > 0) score += 0.2;
    if (contextInfo.assumptions.length > 0) score += 0.2;
    if (contextInfo.relevantFactors.length > 0) score += 0.2;
    if (contextInfo.timeframe && contextInfo.timeframe.length > 0) score += 0.2;

    return Math.min(score, 1);
  }
}
