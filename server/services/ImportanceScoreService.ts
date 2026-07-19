import type { MemoryItem, ImportanceScore } from '../core/MemoryIntelligenceAIManager';

export class ImportanceScoreService {
  /**
   * 記憶の重要度スコアを計算
   */
  async calculateImportanceScore(memory: MemoryItem): Promise<ImportanceScore> {
    const now = Date.now();
    
    // 各要因を計算 (0-1の範囲)
    const frequencyScore = Math.min(1, memory.accessCount / 100);
    const recencyScore = this.calculateRecencyScore(memory.lastAccessed, now);
    const relevanceScore = this.calculateRelevanceScore(memory.content);
    const uniquenessScore = this.calculateUniquenessScore(memory.content);

    // 加重平均で総スコアを計算
    const totalScore = (
      frequencyScore * 0.3 +
      recencyScore * 0.3 +
      relevanceScore * 0.2 +
      uniquenessScore * 0.2
    );

    const recommendation = this.generateRecommendation(totalScore, memory);

    return {
      memoryId: memory.id,
      score: totalScore,
      factors: {
        frequency: frequencyScore,
        recency: recencyScore,
        relevance: relevanceScore,
        uniqueness: uniquenessScore,
      },
      recommendation,
    };
  }

  /**
   * 最近性スコアを計算
   */
  private calculateRecencyScore(lastAccessed: number, now: number): number {
    const daysSinceAccess = (now - lastAccessed) / (1000 * 60 * 60 * 24);
    
    if (daysSinceAccess <= 1) return 1;
    if (daysSinceAccess <= 7) return 0.8;
    if (daysSinceAccess <= 30) return 0.6;
    if (daysSinceAccess <= 90) return 0.4;
    if (daysSinceAccess <= 365) return 0.2;
    
    return 0;
  }

  /**
   * 関連性スコアを計算
   */
  private calculateRelevanceScore(content: string): number {
    const length = content.length;
    
    // 適切な長さのコンテンツが最も関連性が高い
    if (length < 50) return 0.3;
    if (length < 500) return 0.8;
    if (length < 5000) return 0.9;
    
    return 0.7;
  }

  /**
   * ユニーク性スコアを計算
   */
  private calculateUniquenessScore(content: string): number {
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    
    if (words.length === 0) return 0;
    
    const uniqueRatio = uniqueWords.size / words.length;
    return Math.min(1, uniqueRatio);
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendation(score: number, memory: MemoryItem): string {
    if (score >= 0.8) {
      return 'Keep - This is a highly important memory';
    } else if (score >= 0.6) {
      return 'Keep - This memory has moderate importance';
    } else if (score >= 0.4) {
      return 'Consider archiving - Low importance memory';
    } else {
      return 'Delete - This memory can be safely removed';
    }
  }

  /**
   * 複数メモリのスコアを一括計算
   */
  async calculateBatchImportanceScores(memories: MemoryItem[]): Promise<ImportanceScore[]> {
    const scores: ImportanceScore[] = [];
    
    for (const memory of memories) {
      const score = await this.calculateImportanceScore(memory);
      scores.push(score);
    }
    
    return scores;
  }

  /**
   * スコアに基づいてメモリをランク付け
   */
  async rankMemoriesByImportance(scores: ImportanceScore[]): Promise<ImportanceScore[]> {
    return [...scores].sort((a, b) => b.score - a.score);
  }

  /**
   * 特定のしきい値以下のメモリを特定
   */
  async identifyLowImportanceMemories(
    scores: ImportanceScore[],
    threshold: number = 0.3
  ): Promise<ImportanceScore[]> {
    return scores.filter(score => score.score < threshold);
  }

  /**
   * 特定のしきい値以上のメモリを特定
   */
  async identifyHighImportanceMemories(
    scores: ImportanceScore[],
    threshold: number = 0.7
  ): Promise<ImportanceScore[]> {
    return scores.filter(score => score.score >= threshold);
  }

  /**
   * スコア分布を分析
   */
  async analyzeScoreDistribution(scores: ImportanceScore[]): Promise<{
    min: number;
    max: number;
    average: number;
    median: number;
    stdDev: number;
  }> {
    if (scores.length === 0) {
      return { min: 0, max: 0, average: 0, median: 0, stdDev: 0 };
    }

    const sorted = [...scores].map(s => s.score).sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const average = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    const variance = sorted.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / sorted.length;
    const stdDev = Math.sqrt(variance);

    return { min, max, average, median, stdDev };
  }
}
