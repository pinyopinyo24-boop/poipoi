import { UsageAnalysis } from './LearningAnalyzer';
import { FeedbackAnalysis } from './LearningAnalyzer';
import { ImprovementProposal } from './EvolutionService';

/**
 * ImprovementEngine - 改善提案生成エンジン
 */
export class ImprovementEngine {
  /**
   * 改善提案を生成
   */
  async generateProposals(params: {
    usageAnalysis: UsageAnalysis;
    feedbackAnalysis: FeedbackAnalysis;
    userId: string;
  }): Promise<ImprovementProposal[]> {
    const proposals: Partial<ImprovementProposal>[] = [];

    // パフォーマンス提案を生成
    proposals.push(...this.generatePerformanceProposals(params.usageAnalysis));

    // 機能提案を生成
    proposals.push(...this.generateFeatureProposals(params.feedbackAnalysis));

    // UX提案を生成
    proposals.push(...this.generateUXProposals(params.usageAnalysis, params.feedbackAnalysis));

    // セキュリティ提案を生成
    proposals.push(...this.generateSecurityProposals());

    return proposals.map((p, i) => ({
      ...p,
      id: `proposal_${params.userId}_${Date.now()}_${i}`,
      userId: params.userId,
      createdAt: new Date(),
    } as ImprovementProposal));
  }

  /**
   * パフォーマンス提案を生成
   */
  private generatePerformanceProposals(usageAnalysis: UsageAnalysis): Partial<ImprovementProposal>[] {
    const proposals: Partial<ImprovementProposal>[] = [];

    // セッション時間が長い場合
    if (usageAnalysis.averageSessionDuration > 1800) {
      proposals.push({
        title: 'Optimize Session Performance',
        description: 'Sessions are taking longer than expected. Implement caching and query optimization.',
        type: 'performance',
        priority: 'high',
        estimatedImpact: 35,
        estimatedEffort: 40,
        status: 'pending',
      });
    }

    // 多数のセッションがある場合
    if (usageAnalysis.totalSessions > 100) {
      proposals.push({
        title: 'Implement Load Balancing',
        description: 'High session volume detected. Implement load balancing for better scalability.',
        type: 'performance',
        priority: 'high',
        estimatedImpact: 45,
        estimatedEffort: 60,
        status: 'pending',
      });
    }

    return proposals;
  }

  /**
   * 機能提案を生成
   */
  private generateFeatureProposals(feedbackAnalysis: FeedbackAnalysis): Partial<ImprovementProposal>[] {
    const proposals: Partial<ImprovementProposal>[] = [];

    // トップ提案を機能提案に変換
    feedbackAnalysis.topSuggestions.forEach((suggestion, i) => {
      proposals.push({
        title: `Implement: ${suggestion}`,
        description: `User suggestion from feedback: ${suggestion}`,
        type: 'feature',
        priority: i === 0 ? 'high' : 'medium',
        estimatedImpact: 40 - i * 5,
        estimatedEffort: 50 + i * 10,
        status: 'pending',
      });
    });

    return proposals;
  }

  /**
   * UX提案を生成
   */
  private generateUXProposals(
    usageAnalysis: UsageAnalysis,
    feedbackAnalysis: FeedbackAnalysis
  ): Partial<ImprovementProposal>[] {
    const proposals: Partial<ImprovementProposal>[] = [];

    // モバイル使用が多い場合
    if (usageAnalysis.deviceTypes.mobile > 0.3) {
      proposals.push({
        title: 'Enhance Mobile Experience',
        description: 'Significant mobile usage detected. Optimize UI for mobile devices.',
        type: 'ux',
        priority: 'high',
        estimatedImpact: 30,
        estimatedEffort: 45,
        status: 'pending',
      });
    }

    // UI関連のフィードバックが多い場合
    if ((feedbackAnalysis.categoryBreakdown['ui'] || 0) > feedbackAnalysis.totalFeedback * 0.2) {
      proposals.push({
        title: 'Redesign User Interface',
        description: 'Multiple UI-related feedback items. Consider a comprehensive UI redesign.',
        type: 'ux',
        priority: 'medium',
        estimatedImpact: 25,
        estimatedEffort: 70,
        status: 'pending',
      });
    }

    return proposals;
  }

  /**
   * セキュリティ提案を生成
   */
  private generateSecurityProposals(): Partial<ImprovementProposal>[] {
    return [
      {
        title: 'Implement Rate Limiting',
        description: 'Add rate limiting to prevent abuse and improve security.',
        type: 'security',
        priority: 'medium',
        estimatedImpact: 20,
        estimatedEffort: 30,
        status: 'pending',
      },
      {
        title: 'Add Input Validation',
        description: 'Enhance input validation across all endpoints.',
        type: 'security',
        priority: 'high',
        estimatedImpact: 35,
        estimatedEffort: 25,
        status: 'pending',
      },
    ];
  }

  /**
   * 提案の影響を推定
   */
  async estimateImpact(proposal: ImprovementProposal): Promise<number> {
    // 基本的な影響スコア
    let impact = proposal.estimatedImpact;

    // 優先度に基づいて調整
    const priorityMultiplier = {
      critical: 1.5,
      high: 1.2,
      medium: 1.0,
      low: 0.8,
    };
    impact *= priorityMultiplier[proposal.priority];

    // 努力に基づいて調整（努力が少ないほど良い）
    const effortFactor = 1 - (proposal.estimatedEffort / 100) * 0.3;
    impact *= effortFactor;

    return Math.min(100, Math.max(0, impact));
  }

  /**
   * 複数提案をランク付け
   */
  async rankProposals(proposals: ImprovementProposal[]): Promise<ImprovementProposal[]> {
    const rankedProposals = await Promise.all(
      proposals.map(async (p) => ({
        ...p,
        impact: await this.estimateImpact(p),
      }))
    );

    return rankedProposals.sort((a, b) => (b.impact || 0) - (a.impact || 0));
  }

  /**
   * 関連提案を検出
   */
  async findRelatedProposals(proposal: ImprovementProposal, allProposals: ImprovementProposal[]): Promise<ImprovementProposal[]> {
    return allProposals.filter(p => {
      // 同じタイプの提案
      if (p.type === proposal.type && p.id !== proposal.id) {
        return true;
      }

      // 同じ優先度の提案
      if (p.priority === proposal.priority && p.id !== proposal.id) {
        return true;
      }

      return false;
    });
  }

  /**
   * 提案を統合
   */
  async mergeProposals(proposal1: ImprovementProposal, proposal2: ImprovementProposal): Promise<ImprovementProposal> {
    return {
      ...proposal1,
      id: `merged_${proposal1.id}_${proposal2.id}`,
      title: `${proposal1.title} & ${proposal2.title}`,
      description: `${proposal1.description}\n\n${proposal2.description}`,
      estimatedImpact: Math.max(proposal1.estimatedImpact, proposal2.estimatedImpact),
      estimatedEffort: proposal1.estimatedEffort + proposal2.estimatedEffort,
      priority: proposal1.priority === 'critical' || proposal2.priority === 'critical' ? 'critical' : 'high',
    };
  }

  /**
   * 提案の実装可能性を評価
   */
  async assessFeasibility(proposal: ImprovementProposal): Promise<{
    score: number;
    factors: Record<string, number>;
    recommendation: string;
  }> {
    const factors = {
      effortScore: 100 - proposal.estimatedEffort, // 努力が少ないほど高い
      impactScore: proposal.estimatedImpact,
      priorityScore: this.getPriorityScore(proposal.priority),
    };

    const score = (factors.effortScore + factors.impactScore + factors.priorityScore) / 3;

    let recommendation = 'Proceed with implementation';
    if (score < 30) {
      recommendation = 'Consider deprioritizing this proposal';
    } else if (score < 50) {
      recommendation = 'Review before implementation';
    } else if (score > 75) {
      recommendation = 'High priority - implement immediately';
    }

    return { score, factors, recommendation };
  }

  /**
   * 優先度スコアを取得
   */
  private getPriorityScore(priority: string): number {
    const scores: Record<string, number> = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25,
    };
    return scores[priority] || 50;
  }
}
