import type { MemoryItem, MemorySearchResult } from '../core/MemoryIntelligenceAIManager';

export class MemorySearchOptimizer {
  /**
   * 類似メモリを検索
   */
  async searchSimilarMemories(query: string, memories: MemoryItem[]): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];

    for (const memory of memories) {
      const similarity = this.calculateSimilarity(query, memory.content);
      const relevanceScore = this.calculateRelevanceScore(memory, similarity);

      if (similarity > 0.1) {
        results.push({
          memoryId: memory.id,
          similarity,
          content: memory.content.substring(0, 200),
          relevanceScore,
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * 類似度を計算（コサイン類似度）
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const vec1 = this.textToVector(text1);
    const vec2 = this.textToVector(text2);

    return this.cosineSimilarity(vec1, vec2);
  }

  /**
   * テキストをベクトルに変換
   */
  private textToVector(text: string): Map<string, number> {
    const words = text.toLowerCase().split(/\s+/);
    const vector = new Map<string, number>();

    for (const word of words) {
      vector.set(word, (vector.get(word) || 0) + 1);
    }

    return vector;
  }

  /**
   * コサイン類似度を計算
   */
  private cosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    const keys1 = Array.from(vec1.keys());
    const keys2 = Array.from(vec2.keys());
    const allKeys = new Set([...keys1, ...keys2]);

    const allKeysArray = Array.from(allKeys);
    for (const key of allKeysArray) {
      const val1 = vec1.get(key) || 0;
      const val2 = vec2.get(key) || 0;

      dotProduct += val1 * val2;
      magnitude1 += val1 * val1;
      magnitude2 += val2 * val2;
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * 関連性スコアを計算
   */
  private calculateRelevanceScore(memory: MemoryItem, similarity: number): number {
    const importanceWeight = memory.importance * 0.4;
    const similarityWeight = similarity * 0.4;
    const accessWeight = Math.min(1, memory.accessCount / 100) * 0.2;

    return importanceWeight + similarityWeight + accessWeight;
  }

  /**
   * キーワード検索
   */
  async searchByKeywords(keywords: string[], memories: MemoryItem[]): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];

    for (const memory of memories) {
      let matchCount = 0;
      const contentLower = memory.content.toLowerCase();

      for (const keyword of keywords) {
        if (contentLower.includes(keyword.toLowerCase())) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const similarity = matchCount / keywords.length;
        const relevanceScore = this.calculateRelevanceScore(memory, similarity);

        results.push({
          memoryId: memory.id,
          similarity,
          content: memory.content.substring(0, 200),
          relevanceScore,
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * カテゴリ別検索
   */
  async searchByCategory(category: string, memories: MemoryItem[]): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];

    for (const memory of memories) {
      if (memory.category === category) {
        const relevanceScore = memory.importance;

        results.push({
          memoryId: memory.id,
          similarity: 1,
          content: memory.content.substring(0, 200),
          relevanceScore,
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * 時間範囲検索
   */
  async searchByTimeRange(
    startTime: number,
    endTime: number,
    memories: MemoryItem[]
  ): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];

    for (const memory of memories) {
      if (memory.timestamp >= startTime && memory.timestamp <= endTime) {
        results.push({
          memoryId: memory.id,
          similarity: 1,
          content: memory.content.substring(0, 200),
          relevanceScore: memory.importance,
        });
      }
    }

    // Sort by memory timestamp (descending)
    return results.sort((a, b) => {
      const memA = memories.find(m => m.id === a.memoryId);
      const memB = memories.find(m => m.id === b.memoryId);
      return (memB?.timestamp || 0) - (memA?.timestamp || 0);
    });
  }

  /**
   * 高度な検索（複合条件）
   */
  async advancedSearch(
    query: string,
    filters: {
      minImportance?: number;
      maxImportance?: number;
      category?: string;
      startTime?: number;
      endTime?: number;
    },
    memories: MemoryItem[]
  ): Promise<MemorySearchResult[]> {
    let filtered = memories;

    // フィルター適用
    if (filters.minImportance !== undefined) {
      filtered = filtered.filter(m => m.importance >= filters.minImportance!);
    }
    if (filters.maxImportance !== undefined) {
      filtered = filtered.filter(m => m.importance <= filters.maxImportance!);
    }
    if (filters.category) {
      filtered = filtered.filter(m => m.category === filters.category);
    }
    if (filters.startTime !== undefined && filters.endTime !== undefined) {
      filtered = filtered.filter(m => m.timestamp >= filters.startTime! && m.timestamp <= filters.endTime!);
    }

    // 検索実行
    return this.searchSimilarMemories(query, filtered);
  }

  /**
   * インデックス最適化
   */
  async optimizeSearchIndex(memories: MemoryItem[]): Promise<Map<string, MemoryItem[]>> {
    const index = new Map<string, MemoryItem[]>();

    for (const memory of memories) {
      const words = memory.content.toLowerCase().split(/\s+/);

      for (const word of words) {
        if (word.length > 3) {
          if (!index.has(word)) {
            index.set(word, []);
          }
          index.get(word)!.push(memory);
        }
      }
    }

    return index;
  }

  /**
   * 検索パフォーマンス分析
   */
  async analyzeSearchPerformance(
    query: string,
    memories: MemoryItem[]
  ): Promise<{ searchTime: number; resultsCount: number; averageSimilarity: number }> {
    const startTime = Date.now();
    const results = await this.searchSimilarMemories(query, memories);
    const searchTime = Date.now() - startTime;

    const averageSimilarity = results.length > 0
      ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length
      : 0;

    return {
      searchTime,
      resultsCount: results.length,
      averageSimilarity,
    };
  }
}
