import type { ProcessData } from '../core/ManufacturingIntelligenceAIManager';

export interface ProcessOptimization {
  insights: string[];
  recommendations: string[];
  confidence: number;
  bottlenecks: string[];
  improvementPotential: number;
}

export class ProcessOptimizationService {
  /**
   * 工程フローを最適化
   */
  async optimizeProcessFlow(processes: ProcessData[]): Promise<ProcessOptimization> {
    if (processes.length === 0) {
      return {
        insights: ['No process data available'],
        recommendations: ['Collect process data'],
        confidence: 0,
        bottlenecks: [],
        improvementPotential: 0,
      };
    }

    const insights: string[] = [];
    const recommendations: string[] = [];
    const bottlenecks: string[] = [];

    let totalUtilization = 0;
    let maxBottleneck = 0;

    for (const process of processes) {
      totalUtilization += process.utilization;

      if (process.bottleneckLevel > maxBottleneck) {
        maxBottleneck = process.bottleneckLevel;
      }

      if (process.utilization > 85) {
        bottlenecks.push(process.processName);
        insights.push(`${process.processName} is highly utilized (${process.utilization.toFixed(1)}%)`);
        recommendations.push(`Consider increasing capacity for ${process.processName}`);
      }

      if (process.efficiency < 70) {
        insights.push(`${process.processName} has low efficiency (${process.efficiency.toFixed(1)}%)`);
        recommendations.push(`Investigate efficiency issues in ${process.processName}`);
      }
    }

    const avgUtilization = totalUtilization / processes.length;
    const improvementPotential = Math.max(0, 100 - avgUtilization);

    if (avgUtilization > 80) {
      insights.push('Overall process utilization is high');
      recommendations.push('Monitor for potential bottlenecks');
    } else if (avgUtilization > 60) {
      insights.push('Overall process utilization is moderate');
      recommendations.push('Maintain current process efficiency');
    } else {
      insights.push('Overall process utilization is low');
      recommendations.push('Optimize resource allocation');
    }

    return {
      insights,
      recommendations,
      confidence: Math.min(100, 50 + processes.length * 8),
      bottlenecks,
      improvementPotential,
    };
  }

  /**
   * ボトルネックを検出
   */
  detectBottlenecks(processes: ProcessData[]): ProcessData[] {
    return processes.filter((p) => p.bottleneckLevel > 70).sort((a, b) => b.bottleneckLevel - a.bottleneckLevel);
  }

  /**
   * 工程効率を計算
   */
  calculateProcessEfficiency(processes: ProcessData[]): number {
    if (processes.length === 0) return 0;

    const totalEfficiency = processes.reduce((sum, p) => sum + p.efficiency, 0);
    return totalEfficiency / processes.length;
  }

  /**
   * サイクルタイムを最適化
   */
  optimizeCycleTime(processes: ProcessData[]): {
    currentAverageCycleTime: number;
    optimizedCycleTime: number;
    timeReduction: number;
  } {
    if (processes.length === 0) {
      return {
        currentAverageCycleTime: 0,
        optimizedCycleTime: 0,
        timeReduction: 0,
      };
    }

    const currentAverageCycleTime = processes.reduce((sum, p) => sum + p.cycleTime, 0) / processes.length;
    const optimizedCycleTime = currentAverageCycleTime * 0.85;
    const timeReduction = currentAverageCycleTime - optimizedCycleTime;

    return {
      currentAverageCycleTime,
      optimizedCycleTime,
      timeReduction,
    };
  }
}
