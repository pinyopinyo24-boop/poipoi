import { EvolutionService } from '../services/EvolutionService';
import { LearningAnalyzer } from '../services/LearningAnalyzer';
import { FeedbackService } from '../services/FeedbackService';
import { ImprovementEngine } from '../services/ImprovementEngine';
import { VersionManager } from '../services/VersionManager';
import { EvolutionValidator } from '../services/EvolutionValidator';
import { EvolutionRepository } from '../repositories/EvolutionRepository';

/**
 * EvolutionAIManager - AI自己進化・最適化管理
 * 
 * 機能:
 * - 利用状況分析
 * - ユーザーフィードバック分析
 * - AI改善提案生成
 * - 自己最適化実行
 * - バージョン管理
 * - ロールバック管理
 * - 改善履歴管理
 */
export class EvolutionAIManager {
  private evolutionService: EvolutionService;
  private learningAnalyzer: LearningAnalyzer;
  private feedbackService: FeedbackService;
  private improvementEngine: ImprovementEngine;
  private versionManager: VersionManager;
  private evolutionValidator: EvolutionValidator;
  private repository: EvolutionRepository;

  constructor(
    evolutionService: EvolutionService,
    learningAnalyzer: LearningAnalyzer,
    feedbackService: FeedbackService,
    improvementEngine: ImprovementEngine,
    versionManager: VersionManager,
    evolutionValidator: EvolutionValidator,
    repository: EvolutionRepository
  ) {
    this.evolutionService = evolutionService;
    this.learningAnalyzer = learningAnalyzer;
    this.feedbackService = feedbackService;
    this.improvementEngine = improvementEngine;
    this.versionManager = versionManager;
    this.evolutionValidator = evolutionValidator;
    this.repository = repository;
  }

  /**
   * 利用状況を分析
   */
  async analyzeUsage(userId: string, timeRange: 'day' | 'week' | 'month' = 'week'): Promise<any> {
    const analysis = await this.learningAnalyzer.analyzeUsagePatterns(userId, timeRange);
    await this.repository.saveAnalysis({
      userId,
      type: 'usage',
      data: analysis,
      timestamp: new Date(),
    });
    return analysis;
  }

  /**
   * ユーザーフィードバックを分析
   */
  async analyzeFeedback(userId: string): Promise<any> {
    const feedback = await this.feedbackService.collectFeedback(userId);
    const feedbackItems = feedback.map(f => ({
      userId: f.userId,
      rating: f.rating,
      comment: f.comment,
      category: (f.category === 'security' ? 'other' : f.category) as 'feature' | 'performance' | 'ui' | 'other',
      tags: f.tags,
      timestamp: f.createdAt,
    }));
    const analysis = await this.learningAnalyzer.analyzeFeedback(feedbackItems);
    await this.repository.saveFeedbackAnalysis({
      userId,
      feedback,
      analysis,
      timestamp: new Date(),
    });
    return analysis;
  }

  /**
   * AI改善提案を生成
   */
  async generateImprovementProposals(userId: string) {
    // 利用状況分析
    const usageAnalysis = await this.analyzeUsage(userId);
    
    // フィードバック分析
    const feedbackAnalysis = await this.analyzeFeedback(userId);
    
    // 改善提案生成
    const proposals = await this.improvementEngine.generateProposals({
      usageAnalysis,
      feedbackAnalysis,
      userId,
    });

    // 提案を検証
    const validatedProposals = await this.evolutionValidator.validateProposals(proposals);

    // 提案を保存
    const proposalsWithTimestamp = validatedProposals.map(p => ({
      ...p,
      timestamp: new Date(),
    }));
    await this.repository.saveProposals({
      userId,
      proposals: proposalsWithTimestamp as any,
      timestamp: new Date(),
    });

    return validatedProposals;
  }

  /**
   * 自己最適化を実行
   */
  async executeOptimization(userId: string, proposalId: string) {
    // 提案を取得
    const proposal = await this.repository.getProposal(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    // 最適化を実行
    const result = await this.evolutionService.executeOptimization(proposal);

    // 結果を保存
    await this.repository.saveOptimizationResult({
      userId,
      proposalId,
      result,
      timestamp: new Date(),
    });

    return result;
  }

  /**
   * 改善履歴を取得
   */
  async getEvolutionHistory(userId: string, limit = 50) {
    return this.repository.getEvolutionHistory(userId, limit);
  }

  /**
   * バージョンを作成
   */
  async createVersion(userId: string, description: string, data: any) {
    const version = await this.versionManager.createVersion({
      userId,
      description,
      data,
      timestamp: new Date(),
    });

    await this.repository.saveVersion(version);
    return version;
  }

  /**
   * バージョンを復元
   */
  async restoreVersion(userId: string, versionId: string) {
    const version = await this.repository.getVersion(versionId);
    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }

    const restored = await this.versionManager.restoreVersion(version);
    
    await this.repository.saveRollback({
      userId,
      fromVersionId: (await this.repository.getCurrentVersion(userId))?.id,
      toVersionId: versionId,
      timestamp: new Date(),
    });

    return restored;
  }

  /**
   * バージョン履歴を取得
   */
  async getVersionHistory(userId: string, limit = 20) {
    return this.repository.getVersionHistory(userId, limit);
  }

  /**
   * 改善統計を取得
   */
  async getEvolutionStats(userId: string) {
    const history = await this.getEvolutionHistory(userId);
    const proposals = await this.repository.getProposals(userId);
    const versions = await this.getVersionHistory(userId);

    return {
      totalOptimizations: history.length,
      totalProposals: proposals.length,
      acceptedProposals: proposals.filter(p => p.status === 'accepted').length,
      totalVersions: versions.length,
      lastOptimization: history[0]?.timestamp,
      lastProposal: proposals[0]?.createdAt,
    };
  }

  /**
   * 改善提案を承認
   */
  async approveProposal(userId: string, proposalId: string) {
    const proposal = await this.repository.getProposal(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    const updated = await this.repository.updateProposal(proposalId, {
      status: 'accepted',
      approvedAt: new Date(),
    });

    return updated;
  }

  /**
   * 改善提案を却下
   */
  async rejectProposal(userId: string, proposalId: string, reason: string) {
    const proposal = await this.repository.getProposal(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    const updated = await this.repository.updateProposal(proposalId, {
      status: 'rejected',
      rejectedAt: new Date(),
    });

    return updated;
  }

  /**
   * 学習データを取得
   */
  async getLearningData(userId: string) {
    return this.repository.getLearningData(userId);
  }

  /**
   * 学習データをエクスポート
   */
  async exportLearningData(userId: string) {
    const history = await this.getEvolutionHistory(userId, 1000);
    const proposals = await this.repository.getProposals(userId, 1000);
    const versions = await this.getVersionHistory(userId, 100);
    const stats = await this.getEvolutionStats(userId);

    return {
      userId,
      exportedAt: new Date(),
      history,
      proposals,
      versions,
      stats,
    };
  }

  /**
   * AI改善分析を実行
   */
  async performAIAnalysis(userId: string): Promise<any> {
    const usageAnalysis = await this.analyzeUsage(userId);
    const feedbackAnalysis = await this.analyzeFeedback(userId);
    const stats = await this.getEvolutionStats(userId);

    // 高度な分析を実行
    return {
      usageAnalysis,
      feedbackAnalysis,
      stats,
      aiInsights: 'AI analysis insights would be generated here',
    };
  }

  /**
   * 改善提案の詳細を取得
   */
  async getProposalDetails(proposalId: string) {
    const proposal = await this.repository.getProposal(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    return {
      ...proposal,
      impact: await this.improvementEngine.estimateImpact(proposal),
      relatedProposals: await this.repository.getRelatedProposals(proposalId),
    };
  }
}

/**
 * EvolutionAIManager ファクトリー
 */
export function createEvolutionAIManager(
  evolutionService: EvolutionService,
  learningAnalyzer: LearningAnalyzer,
  feedbackService: FeedbackService,
  improvementEngine: ImprovementEngine,
  versionManager: VersionManager,
  evolutionValidator: EvolutionValidator,
  repository: EvolutionRepository
): EvolutionAIManager {
  return new EvolutionAIManager(
    evolutionService,
    learningAnalyzer,
    feedbackService,
    improvementEngine,
    versionManager,
    evolutionValidator,
    repository
  );
}
