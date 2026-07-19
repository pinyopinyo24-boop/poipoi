/**
 * RiskAssessmentService - リスク評価
 */

import type { RiskAssessment } from '../core/GovernanceAIManager';

export class RiskAssessmentService {
  private assessments: Map<string, RiskAssessment> = new Map();

  /**
   * リスク評価を実施
   */
  async assessRisk(agentId: string, actionType: string): Promise<RiskAssessment> {
    const id = `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const riskFactors = this.calculateRiskFactors(agentId, actionType);
    const score = this.calculateRiskScore(riskFactors);
    const riskLevel = this.getRiskLevel(score);

    const assessment: RiskAssessment = {
      id,
      agentId,
      actionType,
      riskLevel,
      score,
      factors: riskFactors,
      timestamp: Date.now(),
    };

    this.assessments.set(id, assessment);
    return assessment;
  }

  /**
   * リスク要因を計算
   */
  private calculateRiskFactors(agentId: string, actionType: string): string[] {
    const factors: string[] = [];

    if (actionType === 'system_modification') {
      factors.push('system_impact');
    }

    if (actionType === 'data_access') {
      factors.push('data_sensitivity');
    }

    if (actionType === 'external_communication') {
      factors.push('external_risk');
    }

    if (agentId.includes('experimental')) {
      factors.push('agent_maturity');
    }

    return factors;
  }

  /**
   * リスクスコアを計算
   */
  private calculateRiskScore(factors: string[]): number {
    let score = 10;

    for (const factor of factors) {
      switch (factor) {
        case 'system_impact':
          score += 30;
          break;
        case 'data_sensitivity':
          score += 25;
          break;
        case 'external_risk':
          score += 20;
          break;
        case 'agent_maturity':
          score += 15;
          break;
        default:
          score += 5;
      }
    }

    return Math.min(100, score);
  }

  /**
   * リスクレベルを判定
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * 評価を取得
   */
  async getAssessment(assessmentId: string): Promise<RiskAssessment | null> {
    return this.assessments.get(assessmentId) || null;
  }

  /**
   * エージェントの評価を取得
   */
  async getAgentAssessments(agentId: string): Promise<RiskAssessment[]> {
    return Array.from(this.assessments.values()).filter((a) => a.agentId === agentId);
  }

  /**
   * 平均リスクスコアを計算
   */
  async getAverageRiskScore(agentId?: string): Promise<number> {
    let assessments = Array.from(this.assessments.values());

    if (agentId) {
      assessments = assessments.filter((a) => a.agentId === agentId);
    }

    if (assessments.length === 0) {
      return 0;
    }

    const total = assessments.reduce((sum, a) => sum + a.score, 0);
    return total / assessments.length;
  }

  /**
   * リスク分布を取得
   */
  async getRiskDistribution(): Promise<{
    low: number;
    medium: number;
    high: number;
    critical: number;
  }> {
    const assessments = Array.from(this.assessments.values());

    return {
      low: assessments.filter((a) => a.riskLevel === 'low').length,
      medium: assessments.filter((a) => a.riskLevel === 'medium').length,
      high: assessments.filter((a) => a.riskLevel === 'high').length,
      critical: assessments.filter((a) => a.riskLevel === 'critical').length,
    };
  }
}
