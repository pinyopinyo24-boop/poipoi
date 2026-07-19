/**
 * ReasoningEngine - PoiPoi AI Core
 * 推論エンジン
 */

export interface Premise {
  id: string;
  statement: string;
  confidence: number;
}

export interface Conclusion {
  id: string;
  statement: string;
  premises: string[];
  confidence: number;
}

class ReasoningEngine {
  private premises: Map<string, Premise> = new Map();
  private conclusions: Conclusion[] = [];

  addPremise(statement: string, confidence: number = 0.8): Premise {
    const premise: Premise = {
      id: `premise_${Date.now()}`,
      statement,
      confidence: Math.min(1, Math.max(0, confidence)),
    };

    this.premises.set(premise.id, premise);
    console.log(`📌 前提追加: ${statement}`);

    return premise;
  }

  reason(statement: string, premiseIds: string[]): Conclusion {
    // Calculate confidence based on premises
    const premiseConfidences = premiseIds
      .map((id) => this.premises.get(id)?.confidence || 0)
      .filter((c) => c > 0);

    const confidence =
      premiseConfidences.length > 0
        ? premiseConfidences.reduce((a, b) => a + b) / premiseConfidences.length
        : 0.5;

    const conclusion: Conclusion = {
      id: `conclusion_${Date.now()}`,
      statement,
      premises: premiseIds,
      confidence,
    };

    this.conclusions.push(conclusion);
    console.log(`🔍 推論: ${statement} (信頼度: ${(confidence * 100).toFixed(1)}%)`);

    return conclusion;
  }

  getPremises(): Premise[] {
    return Array.from(this.premises.values());
  }

  getConclusions(): Conclusion[] {
    return [...this.conclusions];
  }

  getStats() {
    return {
      totalPremises: this.premises.size,
      totalConclusions: this.conclusions.length,
      averagePremiseConfidence:
        this.premises.size > 0
          ? Array.from(this.premises.values()).reduce((sum, p) => sum + p.confidence, 0) /
            this.premises.size
          : 0,
    };
  }
}

export default ReasoningEngine;
