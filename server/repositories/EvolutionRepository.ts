import { ImprovementProposal } from '../services/EvolutionService';
import { Version } from '../services/VersionManager';

/**
 * EvolutionRepository - 進化データの永続化層
 */
export interface EvolutionAnalysis {
  userId: string;
  type: 'usage' | 'feedback';
  data: any;
  timestamp: Date;
}

export interface ProposalRecord {
  userId: string;
  proposals: ImprovementProposal[];
  timestamp: Date;
}

export interface OptimizationResult {
  userId: string;
  proposalId: string;
  result: any;
  timestamp: Date;
}

export interface RollbackRecord {
  userId: string;
  fromVersionId?: string;
  toVersionId: string;
  timestamp: Date;
}

export class EvolutionRepository {
  private analysisStore: Map<string, EvolutionAnalysis[]> = new Map();
  private proposalStore: Map<string, ProposalRecord[]> = new Map();
  private optimizationStore: Map<string, OptimizationResult[]> = new Map();
  private versionStore: Map<string, Version[]> = new Map();
  private rollbackStore: Map<string, RollbackRecord[]> = new Map();
  private feedbackAnalysisStore: Map<string, any[]> = new Map();

  /**
   * 分析を保存
   */
  async saveAnalysis(analysis: EvolutionAnalysis): Promise<void> {
    const key = analysis.userId;
    if (!this.analysisStore.has(key)) {
      this.analysisStore.set(key, []);
    }
    this.analysisStore.get(key)!.push(analysis);
  }

  /**
   * 提案を保存
   */
  async saveProposals(record: ProposalRecord): Promise<void> {
    const key = record.userId;
    if (!this.proposalStore.has(key)) {
      this.proposalStore.set(key, []);
    }
    this.proposalStore.get(key)!.push(record);
  }

  /**
   * 最適化結果を保存
   */
  async saveOptimizationResult(result: OptimizationResult): Promise<void> {
    const key = result.userId;
    if (!this.optimizationStore.has(key)) {
      this.optimizationStore.set(key, []);
    }
    this.optimizationStore.get(key)!.push(result);
  }

  /**
   * バージョンを保存
   */
  async saveVersion(version: Version): Promise<void> {
    const key = version.userId;
    if (!this.versionStore.has(key)) {
      this.versionStore.set(key, []);
    }
    this.versionStore.get(key)!.unshift(version);
  }

  /**
   * ロールバックを保存
   */
  async saveRollback(record: RollbackRecord): Promise<void> {
    const key = record.userId;
    if (!this.rollbackStore.has(key)) {
      this.rollbackStore.set(key, []);
    }
    this.rollbackStore.get(key)!.push(record);
  }

  /**
   * フィードバック分析を保存
   */
  async saveFeedbackAnalysis(data: any): Promise<void> {
    const key = data.userId;
    if (!this.feedbackAnalysisStore.has(key)) {
      this.feedbackAnalysisStore.set(key, []);
    }
    this.feedbackAnalysisStore.get(key)!.push(data);
  }

  /**
   * 進化履歴を取得
   */
  async getEvolutionHistory(userId: string, limit = 50): Promise<OptimizationResult[]> {
    const results = this.optimizationStore.get(userId) || [];
    return results.slice(0, limit);
  }

  /**
   * 提案を取得
   */
  async getProposal(proposalId: string): Promise<ImprovementProposal | null> {
    const recordsArray = Array.from(this.proposalStore.values());
    for (const records of recordsArray) {
      for (const record of records) {
        const proposal = record.proposals.find((p: ImprovementProposal) => p.id === proposalId);
        if (proposal) {
          return proposal;
        }
      }
    }
    return null;
  }

  /**
   * ユーザーの提案を取得
   */
  async getProposals(userId: string, limit = 50): Promise<ImprovementProposal[]> {
    const records = this.proposalStore.get(userId) || [];
    const allProposals = records.flatMap(r => r.proposals);
    return allProposals.slice(0, limit);
  }

  /**
   * バージョンを取得
   */
  async getVersion(versionId: string): Promise<Version | null> {
    const versionsArray = Array.from(this.versionStore.values());
    for (const versions of versionsArray) {
      const version = versions.find((v: Version) => v.id === versionId);
      if (version) {
        return version;
      }
    }
    return null;
  }

  /**
   * 現在のバージョンを取得
   */
  async getCurrentVersion(userId: string): Promise<Version | null> {
    const versions = this.versionStore.get(userId) || [];
    return versions.length > 0 ? versions[0] : null;
  }

  /**
   * バージョン履歴を取得
   */
  async getVersionHistory(userId: string, limit = 20): Promise<Version[]> {
    const versions = this.versionStore.get(userId) || [];
    return versions.slice(0, limit);
  }

  /**
   * 提案を更新
   */
  async updateProposal(proposalId: string, updates: Partial<ImprovementProposal>): Promise<ImprovementProposal | null> {
    const recordsArray = Array.from(this.proposalStore.values());
    for (const records of recordsArray) {
      for (const record of records) {
        const index = record.proposals.findIndex((p: ImprovementProposal) => p.id === proposalId);
        if (index !== -1) {
          record.proposals[index] = { ...record.proposals[index], ...updates };
          return record.proposals[index];
        }
      }
    }
    return null;
  }

  /**
   * 学習データを取得
   */
  async getLearningData(userId: string): Promise<any> {
    return {
      analyses: this.analysisStore.get(userId) || [],
      proposals: this.proposalStore.get(userId) || [],
      optimizations: this.optimizationStore.get(userId) || [],
      versions: this.versionStore.get(userId) || [],
      rollbacks: this.rollbackStore.get(userId) || [],
    };
  }

  /**
   * 関連提案を取得
   */
  async getRelatedProposals(proposalId: string): Promise<ImprovementProposal[]> {
    const proposal = await this.getProposal(proposalId);
    if (!proposal) {
      return [];
    }

    const related: ImprovementProposal[] = [];
    const recordsArray = Array.from(this.proposalStore.values());
    for (const records of recordsArray) {
      for (const record of records) {
        related.push(
          ...record.proposals.filter(
            (p: ImprovementProposal) =>
              p.id !== proposalId &&
              (p.type === proposal.type || p.priority === proposal.priority)
          )
        );
      }
    }

    return related.slice(0, 10);
  }

  /**
   * すべてのデータをエクスポート
   */
  async exportAllData(): Promise<any> {
    return {
      analyses: Array.from(this.analysisStore.values()).flat(),
      proposals: Array.from(this.proposalStore.values()).flat(),
      optimizations: Array.from(this.optimizationStore.values()).flat(),
      versions: Array.from(this.versionStore.values()).flat(),
      rollbacks: Array.from(this.rollbackStore.values()).flat(),
    };
  }

  /**
   * すべてのデータをクリア
   */
  async clearAllData(): Promise<void> {
    this.analysisStore.clear();
    this.proposalStore.clear();
    this.optimizationStore.clear();
    this.versionStore.clear();
    this.rollbackStore.clear();
    this.feedbackAnalysisStore.clear();
  }

  /**
   * ユーザーデータをクリア
   */
  async clearUserData(userId: string): Promise<void> {
    this.analysisStore.delete(userId);
    this.proposalStore.delete(userId);
    this.optimizationStore.delete(userId);
    this.versionStore.delete(userId);
    this.rollbackStore.delete(userId);
    this.feedbackAnalysisStore.delete(userId);
  }
}
