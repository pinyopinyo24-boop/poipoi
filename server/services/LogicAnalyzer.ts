/**
 * LogicAnalyzer - 論理分析エンジン
 * 問題の論理構造を分析
 */

export interface LogicalStatement {
  id: string;
  statement: string;
  type: 'premise' | 'conclusion' | 'assumption';
  confidence: number;
}

export interface LogicalAnalysis {
  premises: LogicalStatement[];
  conclusions: LogicalStatement[];
  assumptions: LogicalStatement[];
  logicalChain: string[];
  validityScore: number;
}

export class LogicAnalyzer {
  /**
   * 問題の論理を分析
   */
  async analyzeProblemLogic(
    problem: string,
    subProblems: string[],
    context: Record<string, unknown>
  ): Promise<LogicalAnalysis> {
    const analysis: LogicalAnalysis = {
      premises: [],
      conclusions: [],
      assumptions: [],
      logicalChain: [],
      validityScore: 0,
    };

    // 前提を抽出
    analysis.premises = this.extractPremises(problem, context);

    // 結論を抽出
    analysis.conclusions = this.extractConclusions(subProblems);

    // 仮定を抽出
    analysis.assumptions = this.extractAssumptions(problem, context);

    // 論理チェーンを構築
    analysis.logicalChain = this.buildLogicalChain(
      analysis.premises,
      analysis.conclusions
    );

    // 妥当性を計算
    analysis.validityScore = this.calculateValidity(analysis);

    return analysis;
  }

  /**
   * 前提を抽出
   */
  private extractPremises(
    problem: string,
    context: Record<string, unknown>
  ): LogicalStatement[] {
    const premises: LogicalStatement[] = [];

    // 問題文から前提を抽出
    const sentences = problem.split(/[.!?]/);

    for (const sentence of sentences) {
      if (sentence.trim().length > 0) {
        premises.push({
          id: `premise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          statement: sentence.trim(),
          type: 'premise',
          confidence: 0.8,
        });
      }
    }

    // コンテキストから前提を追加
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string') {
        premises.push({
          id: `premise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          statement: `${key}: ${value}`,
          type: 'premise',
          confidence: 0.7,
        });
      }
    }

    return premises;
  }

  /**
   * 結論を抽出
   */
  private extractConclusions(subProblems: string[]): LogicalStatement[] {
    return subProblems.map((problem, index) => ({
      id: `conclusion_${index}`,
      statement: problem,
      type: 'conclusion',
      confidence: 0.75,
    }));
  }

  /**
   * 仮定を抽出
   */
  private extractAssumptions(
    problem: string,
    context: Record<string, unknown>
  ): LogicalStatement[] {
    const assumptions: LogicalStatement[] = [];

    // 暗黙の仮定を抽出
    const implicitAssumptions = [
      'The problem is well-defined',
      'All relevant information is provided',
      'The context is stable',
    ];

    for (const assumption of implicitAssumptions) {
      assumptions.push({
        id: `assumption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        statement: assumption,
        type: 'assumption',
        confidence: 0.6,
      });
    }

    return assumptions;
  }

  /**
   * 論理チェーンを構築
   */
  private buildLogicalChain(
    premises: LogicalStatement[],
    conclusions: LogicalStatement[]
  ): string[] {
    const chain: string[] = [];

    for (const premise of premises) {
      chain.push(`Premise: ${premise.statement}`);
    }

    for (const conclusion of conclusions) {
      chain.push(`Therefore: ${conclusion.statement}`);
    }

    return chain;
  }

  /**
   * 論理の妥当性を計算
   */
  private calculateValidity(analysis: LogicalAnalysis): number {
    let score = 0;

    // 前提の信頼度の平均
    const premiseConfidence =
      analysis.premises.length > 0
        ? analysis.premises.reduce((sum, p) => sum + p.confidence, 0) /
          analysis.premises.length
        : 0;

    // 結論の信頼度の平均
    const conclusionConfidence =
      analysis.conclusions.length > 0
        ? analysis.conclusions.reduce((sum, c) => sum + c.confidence, 0) /
          analysis.conclusions.length
        : 0;

    // 仮定の信頼度の平均
    const assumptionConfidence =
      analysis.assumptions.length > 0
        ? analysis.assumptions.reduce((sum, a) => sum + a.confidence, 0) /
          analysis.assumptions.length
        : 0;

    score =
      premiseConfidence * 0.4 +
      conclusionConfidence * 0.4 +
      (1 - assumptionConfidence) * 0.2;

    return Math.min(score, 1);
  }

  /**
   * 論理矛盾を検出
   */
  async detectContradictions(
    analysis: LogicalAnalysis
  ): Promise<Array<{ statement1: string; statement2: string }>> {
    const contradictions: Array<{ statement1: string; statement2: string }> = [];

    for (let i = 0; i < analysis.premises.length; i++) {
      for (let j = i + 1; j < analysis.premises.length; j++) {
        if (this.isContradictory(analysis.premises[i], analysis.premises[j])) {
          contradictions.push({
            statement1: analysis.premises[i].statement,
            statement2: analysis.premises[j].statement,
          });
        }
      }
    }

    return contradictions;
  }

  /**
   * 矛盾を判定
   */
  private isContradictory(
    statement1: LogicalStatement,
    statement2: LogicalStatement
  ): boolean {
    // 簡単な矛盾判定
    const text1 = statement1.statement.toLowerCase();
    const text2 = statement2.statement.toLowerCase();

    if (text1.includes('not') && text2.includes(text1.replace('not', ''))) {
      return true;
    }

    if (text2.includes('not') && text1.includes(text2.replace('not', ''))) {
      return true;
    }

    return false;
  }
}
