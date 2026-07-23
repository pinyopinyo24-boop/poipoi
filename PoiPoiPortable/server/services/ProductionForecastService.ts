import type { ProductionData } from '../core/ManufacturingIntelligenceAIManager';

export interface ProductionForecast {
  predictions: Array<{
    date: number;
    forecastedQuantity: number;
    confidence: number;
  }>;
  insights: string[];
  recommendations: string[];
  confidence: number;
}

export class ProductionForecastService {
  /**
   * 生産を予測
   */
  async forecastProduction(historicalData: ProductionData[]): Promise<ProductionForecast> {
    if (historicalData.length === 0) {
      return {
        predictions: [],
        insights: ['No historical data available'],
        recommendations: ['Collect production data'],
        confidence: 0,
      };
    }

    const sortedData = [...historicalData].sort((a, b) => a.date - b.date);
    const avgQuantity = sortedData.reduce((sum, d) => sum + d.actualQuantity, 0) / sortedData.length;
    const avgVariance = this.calculateVariance(sortedData.map((d) => d.actualQuantity));

    const predictions = this.generatePredictions(avgQuantity, avgVariance, 5);

    const insights: string[] = [];
    const recommendations: string[] = [];

    if (avgQuantity > 0) {
      insights.push(`Average production: ${avgQuantity.toFixed(2)} units`);
    }

    const trend = this.calculateTrend(sortedData);
    if (trend > 0.05) {
      insights.push('Production trend is increasing');
      recommendations.push('Prepare for increased production capacity');
    } else if (trend < -0.05) {
      insights.push('Production trend is decreasing');
      recommendations.push('Review production scheduling');
    }

    return {
      predictions,
      insights,
      recommendations,
      confidence: Math.min(100, 50 + historicalData.length * 3),
    };
  }

  /**
   * 予測を生成
   */
  private generatePredictions(
    avgQuantity: number,
    variance: number,
    periods: number
  ): Array<{ date: number; forecastedQuantity: number; confidence: number }> {
    const predictions = [];
    const baseDate = Date.now();

    for (let i = 1; i <= periods; i++) {
      const forecastedQuantity = avgQuantity + (Math.random() - 0.5) * variance * 2;
      const confidence = Math.max(30, 100 - i * 5);

      predictions.push({
        date: baseDate + i * 24 * 60 * 60 * 1000,
        forecastedQuantity: Math.max(0, forecastedQuantity),
        confidence,
      });
    }

    return predictions;
  }

  /**
   * 分散を計算
   */
  private calculateVariance(data: number[]): number {
    if (data.length === 0) return 0;

    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;

    return Math.sqrt(variance);
  }

  /**
   * トレンドを計算
   */
  private calculateTrend(data: ProductionData[]): number {
    if (data.length < 2) return 0;

    const firstHalf = data.slice(0, Math.floor(data.length / 2)).reduce((sum, d) => sum + d.actualQuantity, 0);
    const secondHalf = data.slice(Math.floor(data.length / 2)).reduce((sum, d) => sum + d.actualQuantity, 0);

    const firstHalfAvg = firstHalf / Math.floor(data.length / 2);
    const secondHalfAvg = secondHalf / (data.length - Math.floor(data.length / 2));

    return (secondHalfAvg - firstHalfAvg) / firstHalfAvg;
  }

  /**
   * 改善効果を予測
   */
  predictImprovementEffect(
    currentData: ProductionData[],
    improvementRate: number
  ): {
    currentPerformance: number;
    projectedPerformance: number;
    expectedImprovement: number;
  } {
    if (currentData.length === 0) {
      return {
        currentPerformance: 0,
        projectedPerformance: 0,
        expectedImprovement: 0,
      };
    }

    const totalPlanned = currentData.reduce((sum, d) => sum + d.plannedQuantity, 0);
    const totalActual = currentData.reduce((sum, d) => sum + d.actualQuantity, 0);

    const currentPerformance = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
    const projectedPerformance = Math.min(100, currentPerformance + improvementRate);
    const expectedImprovement = projectedPerformance - currentPerformance;

    return {
      currentPerformance,
      projectedPerformance,
      expectedImprovement,
    };
  }
}
