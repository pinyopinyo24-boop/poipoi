import type { ManufacturingAnalysis } from '../core/ManufacturingIntelligenceAIManager';

export class ManufacturingIntelligenceRepository {
  private analyses: Map<string, ManufacturingAnalysis> = new Map();
  private analysisHistory: ManufacturingAnalysis[] = [];

  /**
   * 分析を保存
   */
  async saveAnalysis(analysis: ManufacturingAnalysis): Promise<void> {
    this.analyses.set(analysis.id, analysis);
    this.analysisHistory.push(analysis);

    // Keep only last 1000 analyses
    if (this.analysisHistory.length > 1000) {
      this.analysisHistory = this.analysisHistory.slice(-1000);
    }
  }

  /**
   * 分析を取得
   */
  async getAnalysis(id: string): Promise<ManufacturingAnalysis | null> {
    return this.analyses.get(id) || null;
  }

  /**
   * 分析履歴を取得
   */
  async getAnalysisHistory(type?: string, limit: number = 10): Promise<ManufacturingAnalysis[]> {
    let filtered = [...this.analysisHistory];

    if (type) {
      filtered = filtered.filter((a) => a.type === type);
    }

    return filtered.slice(-limit).reverse();
  }

  /**
   * 統計情報を取得
   */
  async getManufacturingStats(): Promise<{
    totalAnalyses: number;
    productionAnalyses: number;
    processAnalyses: number;
    costAnalyses: number;
    qualityAnalyses: number;
    forecastAnalyses: number;
    averageConfidence: number;
  }> {
    const stats = {
      totalAnalyses: this.analysisHistory.length,
      productionAnalyses: 0,
      processAnalyses: 0,
      costAnalyses: 0,
      qualityAnalyses: 0,
      forecastAnalyses: 0,
      averageConfidence: 0,
    };

    let totalConfidence = 0;

    for (const analysis of this.analysisHistory) {
      switch (analysis.type) {
        case 'production':
          stats.productionAnalyses++;
          break;
        case 'process':
          stats.processAnalyses++;
          break;
        case 'cost':
          stats.costAnalyses++;
          break;
        case 'quality':
          stats.qualityAnalyses++;
          break;
        case 'forecast':
          stats.forecastAnalyses++;
          break;
      }
      totalConfidence += analysis.confidence;
    }

    if (this.analysisHistory.length > 0) {
      stats.averageConfidence = totalConfidence / this.analysisHistory.length;
    }

    return stats;
  }

  /**
   * 分析を削除
   */
  async deleteAnalysis(id: string): Promise<boolean> {
    const analysis = this.analyses.get(id);
    if (!analysis) return false;

    this.analyses.delete(id);
    const index = this.analysisHistory.indexOf(analysis);
    if (index > -1) {
      this.analysisHistory.splice(index, 1);
    }

    return true;
  }

  /**
   * 古い分析をクリーンアップ
   */
  async cleanupOldAnalyses(daysOld: number = 30): Promise<number> {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    const toDelete: string[] = [];
    const entries = Array.from(this.analyses.entries());
    for (const [id, analysis] of entries) {
      if (analysis.timestamp < cutoffTime) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      await this.deleteAnalysis(id);
      deletedCount++;
    }

    return deletedCount;
  }

  /**
   * 分析を検索
   */
  async searchAnalyses(query: {
    type?: string;
    startDate?: number;
    endDate?: number;
    minConfidence?: number;
  }): Promise<ManufacturingAnalysis[]> {
    let results = [...this.analysisHistory];

    if (query.type) {
      results = results.filter((a) => a.type === query.type);
    }

    if (query.startDate) {
      results = results.filter((a) => a.timestamp >= query.startDate!);
    }

    if (query.endDate) {
      results = results.filter((a) => a.timestamp <= query.endDate!);
    }

    if (query.minConfidence) {
      results = results.filter((a) => a.confidence >= query.minConfidence!);
    }

    return results;
  }

  /**
   * 分析を取得（タイプ別）
   */
  async getAnalysesByType(type: string): Promise<ManufacturingAnalysis[]> {
    return this.analysisHistory.filter((a) => a.type === type);
  }

  /**
   * すべての分析をクリア
   */
  async clearAll(): Promise<void> {
    this.analyses.clear();
    this.analysisHistory = [];
  }
}
