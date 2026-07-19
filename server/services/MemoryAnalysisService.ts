import type { MemoryItem, MemoryAnalysis } from '../core/MemoryIntelligenceAIManager';

export class MemoryAnalysisService {
  /**
   * メモリパターンを分析
   */
  async analyzeMemoryPatterns(memories: MemoryItem[]): Promise<MemoryAnalysis> {
    if (memories.length === 0) {
      return {
        totalMemories: 0,
        importantMemories: 0,
        redundantMemories: 0,
        compressionRatio: 0,
        averageImportance: 0,
        memoryHealth: 100,
      };
    }

    const importantMemories = memories.filter(m => m.importance > 0.7).length;
    const redundantMemories = this.detectRedundantMemories(memories);
    const averageImportance = memories.reduce((sum, m) => sum + m.importance, 0) / memories.length;
    
    const compressedMemories = memories.filter(m => m.compressed).length;
    const totalCompressedSize = memories
      .filter(m => m.compressed && m.compressedData)
      .reduce((sum, m) => sum + (m.compressedData?.length || 0), 0);
    
    const totalOriginalSize = memories.reduce((sum, m) => sum + m.content.length, 0);
    const compressionRatio = totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 0;

    const memoryHealth = this.calculateMemoryHealth(memories, importantMemories, redundantMemories);

    return {
      totalMemories: memories.length,
      importantMemories,
      redundantMemories,
      compressionRatio,
      averageImportance,
      memoryHealth,
    };
  }

  /**
   * 重複メモリを検出
   */
  private detectRedundantMemories(memories: MemoryItem[]): number {
    let redundantCount = 0;
    const seen = new Set<string>();

    for (const memory of memories) {
      const normalized = memory.content.toLowerCase().trim();
      if (seen.has(normalized)) {
        redundantCount++;
      } else {
        seen.add(normalized);
      }
    }

    return redundantCount;
  }

  /**
   * メモリヘルスを計算
   */
  private calculateMemoryHealth(
    memories: MemoryItem[],
    importantMemories: number,
    redundantMemories: number
  ): number {
    const totalMemories = memories.length;
    if (totalMemories === 0) return 100;

    const importanceRatio = importantMemories / totalMemories;
    const redundancyRatio = redundantMemories / totalMemories;
    const compressionRatio = memories.filter(m => m.compressed).length / totalMemories;

    // ヘルススコア計算: 重要度が高く、重複が少なく、圧縮率が高いほど良い
    const health = (importanceRatio * 40 + (1 - redundancyRatio) * 30 + compressionRatio * 30) * 100;
    return Math.min(100, Math.max(0, health));
  }

  /**
   * メモリカテゴリ別分析
   */
  async analyzeByCategory(memories: MemoryItem[]): Promise<Record<string, { count: number; avgImportance: number }>> {
    const categoryMap = new Map<string, { count: number; totalImportance: number }>();

    for (const memory of memories) {
      const category = memory.category || 'uncategorized';
      const existing = categoryMap.get(category) || { count: 0, totalImportance: 0 };
      
      categoryMap.set(category, {
        count: existing.count + 1,
        totalImportance: existing.totalImportance + memory.importance,
      });
    }

    const result: Record<string, { count: number; avgImportance: number }> = {};
    const categoryEntries = Array.from(categoryMap.entries());
    for (const [category, data] of categoryEntries) {
      result[category] = {
        count: data.count,
        avgImportance: data.totalImportance / data.count,
      };
    }

    return result;
  }

  /**
   * 時間別メモリ分析
   */
  async analyzeByTimeRange(
    memories: MemoryItem[],
    startTime: number,
    endTime: number
  ): Promise<{ count: number; avgImportance: number; avgAccessCount: number }> {
    const filtered = memories.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);

    if (filtered.length === 0) {
      return { count: 0, avgImportance: 0, avgAccessCount: 0 };
    }

    const avgImportance = filtered.reduce((sum, m) => sum + m.importance, 0) / filtered.length;
    const avgAccessCount = filtered.reduce((sum, m) => sum + m.accessCount, 0) / filtered.length;

    return {
      count: filtered.length,
      avgImportance,
      avgAccessCount,
    };
  }

  /**
   * アクセスパターン分析
   */
  async analyzeAccessPatterns(memories: MemoryItem[]): Promise<{
    mostAccessed: MemoryItem[];
    leastAccessed: MemoryItem[];
    averageAccessCount: number;
  }> {
    if (memories.length === 0) {
      return {
        mostAccessed: [],
        leastAccessed: [],
        averageAccessCount: 0,
      };
    }

    const sorted = [...memories].sort((a, b) => b.accessCount - a.accessCount);
    const topCount = Math.ceil(memories.length * 0.1);

    return {
      mostAccessed: sorted.slice(0, topCount),
      leastAccessed: sorted.slice(-topCount),
      averageAccessCount: memories.reduce((sum, m) => sum + m.accessCount, 0) / memories.length,
    };
  }
}
