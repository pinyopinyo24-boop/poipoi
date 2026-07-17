import type { ProductionData } from '../core/ManufacturingIntelligenceAIManager';

export interface ProductionAnalysis {
  insights: string[];
  recommendations: string[];
  confidence: number;
  efficiency: number;
  variance: number;
}

export class ProductionAnalysisService {
  /**
   * 生産実績を分析
   */
  async analyzeProductionPerformance(data: ProductionData[]): Promise<ProductionAnalysis> {
    if (data.length === 0) {
      return {
        insights: ['No production data available'],
        recommendations: ['Collect production data'],
        confidence: 0,
        efficiency: 0,
        variance: 0,
      };
    }

    const totalPlanned = data.reduce((sum, d) => sum + d.plannedQuantity, 0);
    const totalActual = data.reduce((sum, d) => sum + d.actualQuantity, 0);
    const totalDefects = data.reduce((sum, d) => sum + d.defectCount, 0);

    const efficiency = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
    const defectRate = totalActual > 0 ? (totalDefects / totalActual) * 100 : 0;
    const variance = Math.abs(totalPlanned - totalActual);

    const insights: string[] = [];
    const recommendations: string[] = [];

    if (efficiency > 95) {
      insights.push('Production efficiency is excellent');
    } else if (efficiency > 85) {
      insights.push('Production efficiency is good');
      recommendations.push('Continue monitoring for improvements');
    } else {
      insights.push('Production efficiency needs improvement');
      recommendations.push('Investigate bottlenecks in production process');
    }

    if (defectRate > 5) {
      insights.push(`High defect rate detected: ${defectRate.toFixed(2)}%`);
      recommendations.push('Implement quality control measures');
    }

    const delayedCount = data.filter((d) => d.status === 'delayed').length;
    if (delayedCount > 0) {
      insights.push(`${delayedCount} delayed production runs detected`);
      recommendations.push('Review scheduling and resource allocation');
    }

    return {
      insights,
      recommendations,
      confidence: Math.min(100, 50 + data.length * 5),
      efficiency,
      variance,
    };
  }

  /**
   * 稼働率を計算
   */
  calculateUtilization(data: ProductionData[]): number {
    if (data.length === 0) return 0;

    const totalPlanned = data.reduce((sum, d) => sum + d.plannedHours, 0);
    const totalActual = data.reduce((sum, d) => sum + d.actualHours, 0);

    return totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
  }

  /**
   * 生産能力を分析
   */
  analyzeCapacity(data: ProductionData[]): {
    currentCapacity: number;
    utilizationRate: number;
    availableCapacity: number;
  } {
    const utilization = this.calculateUtilization(data);
    const currentCapacity = data.reduce((sum, d) => sum + d.actualQuantity, 0);
    const availableCapacity = Math.max(0, 100 - utilization);

    return {
      currentCapacity,
      utilizationRate: utilization,
      availableCapacity,
    };
  }
}
