import type { QualityData } from '../core/ManufacturingIntelligenceAIManager';

export interface QualityAnalysis {
  insights: string[];
  recommendations: string[];
  confidence: number;
  averageDefectRate: number;
  topDefectTypes: Array<{ type: string; count: number }>;
}

export class QualityAnalysisService {
  /**
   * 品質傾向を分析
   */
  async analyzeQualityTrends(quality: QualityData[]): Promise<QualityAnalysis> {
    if (quality.length === 0) {
      return {
        insights: ['No quality data available'],
        recommendations: ['Collect quality data'],
        confidence: 0,
        averageDefectRate: 0,
        topDefectTypes: [],
      };
    }

    const insights: string[] = [];
    const recommendations: string[] = [];

    const totalProduced = quality.reduce((sum, q) => sum + q.totalProduced, 0);
    const totalDefects = quality.reduce((sum, q) => sum + q.defectCount, 0);
    const averageDefectRate = totalProduced > 0 ? (totalDefects / totalProduced) * 100 : 0;

    if (averageDefectRate < 1) {
      insights.push('Quality performance is excellent');
    } else if (averageDefectRate < 3) {
      insights.push('Quality performance is acceptable');
    } else {
      insights.push('Quality performance needs improvement');
      recommendations.push('Implement quality control measures');
    }

    const defectTypeMap = new Map<string, number>();
    for (const q of quality) {
      for (const [type, count] of Object.entries(q.defectTypes)) {
        defectTypeMap.set(type, (defectTypeMap.get(type) || 0) + (count as number));
      }
    }

    const topDefectTypes = Array.from(defectTypeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (topDefectTypes.length > 0) {
      const topType = topDefectTypes[0];
      insights.push(`Most common defect type: ${topType.type} (${topType.count} occurrences)`);
      recommendations.push(`Focus on reducing ${topType.type} defects`);
    }

    return {
      insights,
      recommendations,
      confidence: Math.min(100, 50 + quality.length * 5),
      averageDefectRate,
      topDefectTypes,
    };
  }

  /**
   * 不良原因を分析
   */
  analyzeDefectCauses(quality: QualityData[]): {
    primaryCauses: Array<{ type: string; percentage: number }>;
    trend: 'improving' | 'stable' | 'deteriorating';
  } {
    if (quality.length < 2) {
      return {
        primaryCauses: [],
        trend: 'stable',
      };
    }

    const defectTypeMap = new Map<string, number>();
    let totalDefects = 0;

    for (const q of quality) {
      for (const [type, count] of Object.entries(q.defectTypes)) {
        defectTypeMap.set(type, (defectTypeMap.get(type) || 0) + (count as number));
        totalDefects += count as number;
      }
    }

    const primaryCauses = Array.from(defectTypeMap.entries())
      .map(([type, count]) => ({
        type,
        percentage: totalDefects > 0 ? (count / totalDefects) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    const firstHalfDefects = quality.slice(0, Math.floor(quality.length / 2)).reduce((sum, q) => sum + q.defectCount, 0);
    const secondHalfDefects = quality.slice(Math.floor(quality.length / 2)).reduce((sum, q) => sum + q.defectCount, 0);

    let trend: 'improving' | 'stable' | 'deteriorating' = 'stable';
    if (secondHalfDefects < firstHalfDefects * 0.9) {
      trend = 'improving';
    } else if (secondHalfDefects > firstHalfDefects * 1.1) {
      trend = 'deteriorating';
    }

    return {
      primaryCauses,
      trend,
    };
  }

  /**
   * 品質スコアを計算
   */
  calculateQualityScore(quality: QualityData[]): number {
    if (quality.length === 0) return 0;

    const totalProduced = quality.reduce((sum, q) => sum + q.totalProduced, 0);
    const totalDefects = quality.reduce((sum, q) => sum + q.defectCount, 0);

    if (totalProduced === 0) return 0;

    const defectRate = (totalDefects / totalProduced) * 100;
    return Math.max(0, 100 - defectRate * 10);
  }
}
