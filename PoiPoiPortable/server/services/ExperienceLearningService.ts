import type { MemoryItem, ExperienceData } from '../core/MemoryIntelligenceAIManager';

export class ExperienceLearningService {
  /**
   * 経験パターンを抽出
   */
  async extractExperiencePatterns(memories: MemoryItem[]): Promise<ExperienceData> {
    const patterns = this.identifyPatterns(memories);
    const insights = this.generateInsights(memories, patterns);
    const recommendations = this.generateRecommendations(insights);
    const learningScore = this.calculateLearningScore(memories);

    return {
      userId: memories.length > 0 ? memories[0].userId : '',
      patterns,
      insights,
      recommendations,
      learningScore,
      generatedAt: Date.now(),
    };
  }

  /**
   * パターンを特定
   */
  private identifyPatterns(memories: MemoryItem[]): string[] {
    const patterns: string[] = [];
    const categoryMap = new Map<string, number>();

    // カテゴリ別の頻度を計算
    for (const memory of memories) {
      const category = memory.category || 'uncategorized';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    }

    // 頻度の高いカテゴリをパターンとして抽出
    const categoryEntries = Array.from(categoryMap.entries());
    for (const [category, count] of categoryEntries) {
      if (count > memories.length * 0.1) {
        patterns.push(`Frequent pattern: ${category} (${count} occurrences)`);
      }
    }

    // 時間的パターンを分析
    const timePatterns = this.analyzeTemporalPatterns(memories);
    patterns.push(...timePatterns);

    return patterns;
  }

  /**
   * 時間的パターンを分析
   */
  private analyzeTemporalPatterns(memories: MemoryItem[]): string[] {
    const patterns: string[] = [];
    const hourMap = new Map<number, number>();

    for (const memory of memories) {
      const hour = new Date(memory.timestamp).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    }

    let maxHour = 0;
    let maxCount = 0;

    const hourEntries = Array.from(hourMap.entries());
    for (const [hour, count] of hourEntries) {
      if (count > maxCount) {
        maxCount = count;
        maxHour = hour;
      }
    }

    if (maxCount > 0) {
      patterns.push(`Peak activity hour: ${maxHour}:00 (${maxCount} memories)`);
    }

    return patterns;
  }

  /**
   * インサイトを生成
   */
  private generateInsights(memories: MemoryItem[], patterns: string[]): string[] {
    const insights: string[] = [];

    // 重要度分析
    const avgImportance = memories.reduce((sum, m) => sum + m.importance, 0) / memories.length;
    insights.push(`Average memory importance: ${(avgImportance * 100).toFixed(1)}%`);

    // アクセスパターン分析
    const avgAccess = memories.reduce((sum, m) => sum + m.accessCount, 0) / memories.length;
    insights.push(`Average access frequency: ${avgAccess.toFixed(1)} times`);

    // 圧縮効率
    const compressedMemories = memories.filter(m => m.compressed).length;
    insights.push(`Compression efficiency: ${((compressedMemories / memories.length) * 100).toFixed(1)}%`);

    // パターンベースのインサイト
    insights.push(...patterns.map(p => `Identified: ${p}`));

    return insights;
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendations(insights: string[]): string[] {
    const recommendations: string[] = [];

    // 重要度が低い場合
    if (insights.some(i => i.includes('Average memory importance') && parseFloat(i) < 50)) {
      recommendations.push('Consider reviewing and consolidating low-importance memories');
    }

    // アクセス頻度が低い場合
    if (insights.some(i => i.includes('Average access frequency') && parseFloat(i) < 5)) {
      recommendations.push('Archive or delete rarely accessed memories to free up space');
    }

    // 圧縮効率が低い場合
    if (insights.some(i => i.includes('Compression efficiency') && parseFloat(i) < 50)) {
      recommendations.push('Compress more memories to improve storage efficiency');
    }

    // デフォルト推奨事項
    if (recommendations.length === 0) {
      recommendations.push('Memory management is optimal');
      recommendations.push('Continue monitoring memory patterns');
    }

    return recommendations;
  }

  /**
   * 学習スコアを計算
   */
  private calculateLearningScore(memories: MemoryItem[]): number {
    if (memories.length === 0) return 0;

    const avgImportance = memories.reduce((sum, m) => sum + m.importance, 0) / memories.length;
    const avgAccess = Math.min(1, memories.reduce((sum, m) => sum + m.accessCount, 0) / (memories.length * 100));
    const compressedRatio = memories.filter(m => m.compressed).length / memories.length;

    return (avgImportance * 0.4 + avgAccess * 0.3 + compressedRatio * 0.3) * 100;
  }

  /**
   * 学習データを生成
   */
  async generateLearningData(memories: MemoryItem[]): Promise<ExperienceData> {
    return this.extractExperiencePatterns(memories);
  }

  /**
   * メモリから知識を抽出
   */
  async extractKnowledge(memories: MemoryItem[]): Promise<{
    keyTopics: string[];
    frequentConcepts: string[];
    learningAreas: string[];
  }> {
    const keyTopics: string[] = [];
    const frequentConcepts: string[] = [];
    const learningAreas: string[] = [];

    const conceptMap = new Map<string, number>();

    for (const memory of memories) {
      const words = memory.content.toLowerCase().split(/\s+/);

      for (const word of words) {
        if (word.length > 5) {
          conceptMap.set(word, (conceptMap.get(word) || 0) + 1);
        }
      }

      if (memory.importance > 0.7) {
        keyTopics.push(memory.category || 'general');
      }
    }

    // 頻出概念を抽出
    const sorted = Array.from(conceptMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [concept, count] of sorted) {
      if (count > 2) {
        frequentConcepts.push(concept);
      }
    }

    // 学習領域を特定
    const categoryMap = new Map<string, number>();
    for (const memory of memories) {
      const category = memory.category || 'uncategorized';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    }

    const categoryEntries2 = Array.from(categoryMap.entries());
    for (const [category] of categoryEntries2) {
      learningAreas.push(category);
    }

    return {
      keyTopics: Array.from(new Set(keyTopics)),
      frequentConcepts,
      learningAreas,
    };
  }

  /**
   * 成長トレンドを分析
   */
  async analyzeGrowthTrend(memories: MemoryItem[]): Promise<{
    trend: 'improving' | 'declining' | 'stable';
    score: number;
    changeRate: number;
  }> {
    if (memories.length < 2) {
      return { trend: 'stable', score: 0, changeRate: 0 };
    }

    // 時系列でメモリを分割
    const sorted = [...memories].sort((a, b) => a.timestamp - b.timestamp);
    const mid = Math.floor(sorted.length / 2);

    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);

    const firstScore = firstHalf.reduce((sum, m) => sum + m.importance, 0) / firstHalf.length;
    const secondScore = secondHalf.reduce((sum, m) => sum + m.importance, 0) / secondHalf.length;

    const changeRate = ((secondScore - firstScore) / firstScore) * 100;
    let trend: 'improving' | 'declining' | 'stable' = 'stable';

    if (changeRate > 5) {
      trend = 'improving';
    } else if (changeRate < -5) {
      trend = 'declining';
    }

    return {
      trend,
      score: secondScore,
      changeRate,
    };
  }

  /**
   * 推奨学習パスを生成
   */
  async generateLearningPath(memories: MemoryItem[]): Promise<string[]> {
    const knowledge = await this.extractKnowledge(memories);
    const path: string[] = [];

    // 学習領域に基づいてパスを生成
    for (const area of knowledge.learningAreas) {
      path.push(`Master ${area}`);
    }

    // 頻出概念に基づいてパスを生成
    for (const concept of knowledge.frequentConcepts.slice(0, 5)) {
      path.push(`Deepen understanding of ${concept}`);
    }

    return path;
  }
}
