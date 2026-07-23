/**
 * DecisionSupportService - 判断支援エンジン
 * 複数の選択肢を評価し、推奨を提供
 */

export interface Alternative {
  id: string;
  description: string;
  pros: string[];
  cons: string[];
  score: number;
}

export interface Recommendation {
  option: string;
  confidence: number;
  reasoning: string;
}

export class DecisionSupportService {
  /**
   * 複数案を生成
   */
  async generateAlternatives(
    problem: string,
    subProblems: string[],
    objectives: string[]
  ): Promise<Alternative[]> {
    const alternatives: Alternative[] = [];

    // 基本的な選択肢を生成
    const baseAlternatives = [
      'Direct approach',
      'Indirect approach',
      'Hybrid approach',
      'Innovative approach',
    ];

    for (const alt of baseAlternatives) {
      alternatives.push({
        id: `alt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        description: alt,
        pros: this.generatePros(alt, objectives),
        cons: this.generateCons(alt, objectives),
        score: this.calculateScore(alt, objectives),
      });
    }

    return alternatives;
  }

  /**
   * 判断を支援
   */
  async supportDecision(
    alternatives: Alternative[],
    objectives: string[]
  ): Promise<Recommendation> {
    if (alternatives.length === 0) {
      return {
        option: 'No alternatives available',
        confidence: 0,
        reasoning: 'Unable to generate alternatives',
      };
    }

    // 最高スコアの選択肢を選択
    let bestAlternative = alternatives[0];
    for (const alt of alternatives) {
      if (alt.score > bestAlternative.score) {
        bestAlternative = alt;
      }
    }

    return {
      option: bestAlternative.description,
      confidence: bestAlternative.score,
      reasoning: `Selected based on ${bestAlternative.pros.length} positive factors and ${bestAlternative.cons.length} negative factors`,
    };
  }

  /**
   * メリットを生成
   */
  private generatePros(alternative: string, objectives: string[]): string[] {
    const pros: string[] = [];

    if (alternative.includes('Direct')) {
      pros.push('Fast implementation');
      pros.push('Clear path forward');
    }

    if (alternative.includes('Indirect')) {
      pros.push('Lower risk');
      pros.push('More flexibility');
    }

    if (alternative.includes('Hybrid')) {
      pros.push('Balanced approach');
      pros.push('Risk mitigation');
    }

    if (alternative.includes('Innovative')) {
      pros.push('Novel solution');
      pros.push('Potential for high impact');
    }

    // 目的に応じたメリットを追加
    for (const objective of objectives) {
      if (objective.length > 0) {
        pros.push(`Supports: ${objective}`);
      }
    }

    return pros;
  }

  /**
   * デメリットを生成
   */
  private generateCons(alternative: string, objectives: string[]): string[] {
    const cons: string[] = [];

    if (alternative.includes('Direct')) {
      cons.push('Higher risk');
      cons.push('Less flexibility');
    }

    if (alternative.includes('Indirect')) {
      cons.push('Slower implementation');
      cons.push('Unclear outcomes');
    }

    if (alternative.includes('Hybrid')) {
      cons.push('Complexity');
      cons.push('Coordination challenges');
    }

    if (alternative.includes('Innovative')) {
      cons.push('Unproven approach');
      cons.push('Higher uncertainty');
    }

    return cons;
  }

  /**
   * スコアを計算
   */
  private calculateScore(alternative: string, objectives: string[]): number {
    let score = 0.5; // ベーススコア

    if (alternative.includes('Direct')) score += 0.2;
    if (alternative.includes('Indirect')) score += 0.15;
    if (alternative.includes('Hybrid')) score += 0.25;
    if (alternative.includes('Innovative')) score += 0.1;

    // 目的の数に基づいてスコアを調整
    score += objectives.length * 0.05;

    return Math.min(score, 1);
  }

  /**
   * 複数案を比較
   */
  async compareAlternatives(
    alternatives: Alternative[]
  ): Promise<Record<string, unknown>> {
    return {
      count: alternatives.length,
      bestScore: Math.max(...alternatives.map((a) => a.score)),
      averageScore:
        alternatives.reduce((sum, a) => sum + a.score, 0) / alternatives.length,
      alternatives: alternatives.map((a) => ({
        description: a.description,
        score: a.score,
        prosCount: a.pros.length,
        consCount: a.cons.length,
      })),
    };
  }

  /**
   * リスク分析
   */
  async analyzeRisk(alternative: Alternative): Promise<Record<string, unknown>> {
    const riskLevel = 1 - alternative.score;
    const riskFactors = alternative.cons.length;
    const mitigationFactors = alternative.pros.length;

    return {
      riskLevel: Math.min(riskLevel, 1),
      riskFactors,
      mitigationFactors,
      riskAssessment:
        riskLevel > 0.5
          ? 'High risk'
          : riskLevel > 0.3
            ? 'Medium risk'
            : 'Low risk',
    };
  }
}
