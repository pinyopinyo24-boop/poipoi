import { ImprovementProposal } from './EvolutionService';

/**
 * EvolutionValidator - 進化・改善提案の検証
 */
export class EvolutionValidator {
  /**
   * 提案を検証
   */
  async validateProposals(proposals: ImprovementProposal[]): Promise<ImprovementProposal[]> {
    const validatedProposals: ImprovementProposal[] = [];

    for (const proposal of proposals) {
      if (await this.isValidProposal(proposal)) {
        validatedProposals.push(proposal);
      }
    }

    return validatedProposals;
  }

  /**
   * 提案が有効か確認
   */
  private async isValidProposal(proposal: ImprovementProposal): Promise<boolean> {
    // タイトルが空でない
    if (!proposal.title || proposal.title.trim().length === 0) {
      return false;
    }

    // 説明が空でない
    if (!proposal.description || proposal.description.trim().length === 0) {
      return false;
    }

    // タイプが有効
    const validTypes = ['performance', 'feature', 'security', 'ux', 'other'];
    if (!validTypes.includes(proposal.type)) {
      return false;
    }

    // 優先度が有効
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(proposal.priority)) {
      return false;
    }

    // 推定影響が0-100の範囲内
    if (proposal.estimatedImpact < 0 || proposal.estimatedImpact > 100) {
      return false;
    }

    // 推定努力が0-100の範囲内
    if (proposal.estimatedEffort < 0 || proposal.estimatedEffort > 100) {
      return false;
    }

    return true;
  }

  /**
   * 提案の品質スコアを計算
   */
  async calculateQualityScore(proposal: ImprovementProposal): Promise<number> {
    let score = 100;

    // タイトルの長さをチェック
    if (proposal.title.length < 10) {
      score -= 10;
    } else if (proposal.title.length > 100) {
      score -= 5;
    }

    // 説明の長さをチェック
    if (proposal.description.length < 20) {
      score -= 10;
    } else if (proposal.description.length > 500) {
      score -= 5;
    }

    // 影響と努力のバランスをチェック
    const balance = Math.abs(proposal.estimatedImpact - (100 - proposal.estimatedEffort));
    if (balance > 50) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * 重複提案を検出
   */
  async detectDuplicates(proposals: ImprovementProposal[]): Promise<ImprovementProposal[][]> {
    const duplicates: ImprovementProposal[][] = [];

    for (let i = 0; i < proposals.length; i++) {
      for (let j = i + 1; j < proposals.length; j++) {
        if (this.isSimilar(proposals[i], proposals[j])) {
          duplicates.push([proposals[i], proposals[j]]);
        }
      }
    }

    return duplicates;
  }

  /**
   * 提案が似ているか確認
   */
  private isSimilar(proposal1: ImprovementProposal, proposal2: ImprovementProposal): boolean {
    // 同じタイプと優先度
    if (proposal1.type === proposal2.type && proposal1.priority === proposal2.priority) {
      // タイトルが似ている（簡単な比較）
      const title1 = proposal1.title.toLowerCase();
      const title2 = proposal2.title.toLowerCase();
      const commonWords = title1.split(' ').filter(w => title2.includes(w)).length;
      return commonWords >= Math.min(title1.split(' ').length, title2.split(' ').length) * 0.5;
    }

    return false;
  }

  /**
   * 提案の依存関係を検証
   */
  async validateDependencies(proposals: ImprovementProposal[]): Promise<boolean> {
    // 循環依存を検出
    for (const proposal of proposals) {
      if (await this.hasCyclicDependency(proposal, proposals)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 循環依存を検出
   */
  private async hasCyclicDependency(proposal: ImprovementProposal, allProposals: ImprovementProposal[]): Promise<boolean> {
    // 簡単な循環依存チェック（実装例）
    // 実際の実装では、提案間の依存関係グラフを構築して検証
    return false;
  }

  /**
   * 提案の実現可能性を評価
   */
  async evaluateFeasibility(proposal: ImprovementProposal): Promise<{
    feasible: boolean;
    score: number;
    issues: string[];
  }> {
    const issues: string[] = [];

    // 努力が多すぎる場合
    if (proposal.estimatedEffort > 80) {
      issues.push('High effort required');
    }

    // 影響が低い場合
    if (proposal.estimatedImpact < 20) {
      issues.push('Low estimated impact');
    }

    // 影響と努力のバランスが悪い場合
    if (proposal.estimatedEffort > proposal.estimatedImpact * 1.5) {
      issues.push('Effort significantly exceeds expected impact');
    }

    const score = 100 - issues.length * 20;
    const feasible = issues.length === 0;

    return { feasible, score, issues };
  }

  /**
   * 提案セットを検証
   */
  async validateProposalSet(proposals: ImprovementProposal[]): Promise<{
    valid: boolean;
    validProposals: ImprovementProposal[];
    invalidProposals: ImprovementProposal[];
    issues: string[];
  }> {
    const issues: string[] = [];
    const validProposals: ImprovementProposal[] = [];
    const invalidProposals: ImprovementProposal[] = [];

    // 各提案を検証
    for (const proposal of proposals) {
      if (await this.isValidProposal(proposal)) {
        validProposals.push(proposal);
      } else {
        invalidProposals.push(proposal);
        issues.push(`Invalid proposal: ${proposal.title}`);
      }
    }

    // 重複を検出
    const duplicates = await this.detectDuplicates(validProposals);
    if (duplicates.length > 0) {
      issues.push(`Found ${duplicates.length} duplicate proposals`);
    }

    // 依存関係を検証
    const hasDependencyIssues = !(await this.validateDependencies(validProposals));
    if (hasDependencyIssues) {
      issues.push('Dependency validation failed');
    }

    return {
      valid: invalidProposals.length === 0 && duplicates.length === 0 && !hasDependencyIssues,
      validProposals,
      invalidProposals,
      issues,
    };
  }

  /**
   * 提案を正規化
   */
  async normalizeProposal(proposal: ImprovementProposal): Promise<ImprovementProposal> {
    return {
      ...proposal,
      title: proposal.title.trim(),
      description: proposal.description.trim(),
      estimatedImpact: Math.max(0, Math.min(100, proposal.estimatedImpact)),
      estimatedEffort: Math.max(0, Math.min(100, proposal.estimatedEffort)),
    };
  }

  /**
   * 複数提案を正規化
   */
  async normalizeProposals(proposals: ImprovementProposal[]): Promise<ImprovementProposal[]> {
    return Promise.all(proposals.map(p => this.normalizeProposal(p)));
  }
}
