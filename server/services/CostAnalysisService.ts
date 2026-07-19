import type { CostData } from '../core/ManufacturingIntelligenceAIManager';

export interface CostAnalysis {
  insights: string[];
  recommendations: string[];
  confidence: number;
  totalVariance: number;
  averageVariancePercentage: number;
}

export class CostAnalysisService {
  /**
   * 原価差異を分析
   */
  async analyzeCostVariance(costs: CostData[]): Promise<CostAnalysis> {
    if (costs.length === 0) {
      return {
        insights: ['No cost data available'],
        recommendations: ['Collect cost data'],
        confidence: 0,
        totalVariance: 0,
        averageVariancePercentage: 0,
      };
    }

    const insights: string[] = [];
    const recommendations: string[] = [];

    const totalPlanned = costs.reduce((sum, c) => sum + c.plannedCost, 0);
    const totalActual = costs.reduce((sum, c) => sum + c.actualCost, 0);
    const totalVariance = totalActual - totalPlanned;

    const averageVariancePercentage = costs.reduce((sum, c) => sum + c.variancePercentage, 0) / costs.length;

    if (totalVariance > 0) {
      insights.push(`Cost overrun detected: ${totalVariance.toFixed(2)}`);
      recommendations.push('Review cost drivers and identify efficiency improvements');
    } else if (totalVariance < 0) {
      insights.push(`Cost savings achieved: ${Math.abs(totalVariance).toFixed(2)}`);
      recommendations.push('Maintain current cost management practices');
    } else {
      insights.push('Costs are within planned budget');
    }

    const unfavorableCount = costs.filter((c) => c.variancePercentage > 5).length;
    if (unfavorableCount > 0) {
      insights.push(`${unfavorableCount} items with unfavorable variance detected`);
      recommendations.push('Investigate high-variance items');
    }

    return {
      insights,
      recommendations,
      confidence: Math.min(100, 50 + costs.length * 4),
      totalVariance,
      averageVariancePercentage,
    };
  }

  /**
   * 原価を分類
   */
  categorizeCosts(costs: CostData[]): {
    favorable: CostData[];
    unfavorable: CostData[];
    neutral: CostData[];
  } {
    const favorable = costs.filter((c) => c.variance < -1);
    const unfavorable = costs.filter((c) => c.variance > 1);
    const neutral = costs.filter((c) => c.variance >= -1 && c.variance <= 1);

    return { favorable, unfavorable, neutral };
  }

  /**
   * 原価削減の可能性を計算
   */
  calculateCostReductionPotential(costs: CostData[]): {
    currentTotalCost: number;
    potentialSavings: number;
    savingsPercentage: number;
  } {
    if (costs.length === 0) {
      return {
        currentTotalCost: 0,
        potentialSavings: 0,
        savingsPercentage: 0,
      };
    }

    const currentTotalCost = costs.reduce((sum, c) => sum + c.actualCost, 0);
    const potentialSavings = costs.reduce((sum, c) => (c.variance > 0 ? c.variance * 0.8 : 0), 0);
    const savingsPercentage = currentTotalCost > 0 ? (potentialSavings / currentTotalCost) * 100 : 0;

    return {
      currentTotalCost,
      potentialSavings,
      savingsPercentage,
    };
  }
}
