import type { MemoryItem, MemoryAnalysis, ImportanceScore, MemoryCleanupResult, ExperienceData } from '../core/MemoryIntelligenceAIManager';

export class MemoryIntelligenceRepository {
  private memoryStore: Map<string, MemoryItem> = new Map();
  private userMemoriesIndex: Map<string, Set<string>> = new Map();
  private importanceScores: Map<string, ImportanceScore> = new Map();
  private memoryAnalyses: Map<string, MemoryAnalysis> = new Map();
  private cleanupResults: Map<string, MemoryCleanupResult> = new Map();
  private experienceData: Map<string, ExperienceData> = new Map();
  private searchQueries: Map<string, unknown[]> = new Map();
  private validationResults: Map<string, unknown> = new Map();
  private learningData: Map<string, ExperienceData> = new Map();
  private archivedMemories: Map<string, MemoryItem> = new Map();

  /**
   * メモリを保存
   */
  async saveMemory(memory: MemoryItem): Promise<void> {
    this.memoryStore.set(memory.id, memory);

    // ユーザーインデックスを更新
    if (!this.userMemoriesIndex.has(memory.userId)) {
      this.userMemoriesIndex.set(memory.userId, new Set());
    }
    this.userMemoriesIndex.get(memory.userId)!.add(memory.id);
  }

  /**
   * メモリを取得
   */
  async getMemory(memoryId: string): Promise<MemoryItem | null> {
    return this.memoryStore.get(memoryId) || null;
  }

  /**
   * ユーザーのメモリを取得
   */
  async getUserMemories(userId: string): Promise<MemoryItem[]> {
    const memoryIds = this.userMemoriesIndex.get(userId) || new Set();
    const memories: MemoryItem[] = [];

    const idArray = Array.from(memoryIds);
    for (const id of idArray) {
      const memory = this.memoryStore.get(id);
      if (memory) {
        memories.push(memory);
      }
    }

    return memories;
  }

  /**
   * メモリを更新
   */
  async updateMemory(memory: MemoryItem): Promise<void> {
    this.memoryStore.set(memory.id, memory);
  }

  /**
   * メモリを削除
   */
  async deleteMemory(memoryId: string): Promise<void> {
    const memory = this.memoryStore.get(memoryId);
    if (memory) {
      this.userMemoriesIndex.get(memory.userId)?.delete(memoryId);
      this.memoryStore.delete(memoryId);
    }
  }

  /**
   * メモリをアーカイブ
   */
  async archiveMemory(memoryId: string): Promise<void> {
    const memory = this.memoryStore.get(memoryId);
    if (memory) {
      this.archivedMemories.set(memoryId, memory);
      this.deleteMemory(memoryId);
    }
  }

  /**
   * 重要度スコアを保存
   */
  async saveImportanceScore(score: ImportanceScore): Promise<void> {
    this.importanceScores.set(score.memoryId, score);
  }

  /**
   * 重要度スコアを取得
   */
  async getImportanceScore(memoryId: string): Promise<ImportanceScore | null> {
    return this.importanceScores.get(memoryId) || null;
  }

  /**
   * メモリ分析を保存
   */
  async saveMemoryAnalysis(userId: string, analysis: MemoryAnalysis): Promise<void> {
    this.memoryAnalyses.set(userId, analysis);
  }

  /**
   * メモリ分析を取得
   */
  async getMemoryAnalysis(userId: string): Promise<MemoryAnalysis | null> {
    return this.memoryAnalyses.get(userId) || null;
  }

  /**
   * クリーンアップ結果を保存
   */
  async saveCleanupResult(userId: string, result: MemoryCleanupResult): Promise<void> {
    this.cleanupResults.set(userId, result);
  }

  /**
   * クリーンアップ結果を取得
   */
  async getCleanupResult(userId: string): Promise<MemoryCleanupResult | null> {
    return this.cleanupResults.get(userId) || null;
  }

  /**
   * 経験データを保存
   */
  async saveExperienceData(userId: string, data: ExperienceData): Promise<void> {
    this.experienceData.set(userId, data);
  }

  /**
   * 経験データを取得
   */
  async getExperienceData(userId: string): Promise<ExperienceData | null> {
    return this.experienceData.get(userId) || null;
  }

  /**
   * 検索クエリを保存
   */
  async saveSearchQuery(userId: string, query: string, results: unknown[]): Promise<void> {
    const key = `${userId}:${query}`;
    this.searchQueries.set(key, results);
  }

  /**
   * 検索結果を取得
   */
  async getSearchResults(userId: string, query: string): Promise<unknown[] | null> {
    const key = `${userId}:${query}`;
    return (this.searchQueries.get(key) as unknown[] | undefined) || null;
  }

  /**
   * バリデーション結果を保存
   */
  async saveValidationResults(userId: string, results: unknown): Promise<void> {
    this.validationResults.set(userId, results);
  }

  /**
   * バリデーション結果を取得
   */
  async getValidationResults(userId: string): Promise<unknown | null> {
    return this.validationResults.get(userId) || null;
  }

  /**
   * 学習データを保存
   */
  async saveLearningData(userId: string, data: ExperienceData): Promise<void> {
    this.learningData.set(userId, data);
  }

  /**
   * 学習データを取得
   */
  async getLearningData(userId: string): Promise<ExperienceData | null> {
    return this.learningData.get(userId) || null;
  }

  /**
   * ユーザーのメモリをクリア
   */
  async clearUserMemories(userId: string): Promise<void> {
    const memoryIds = this.userMemoriesIndex.get(userId) || new Set();

    const idArray = Array.from(memoryIds);
    for (const id of idArray) {
      this.memoryStore.delete(id);
    }

    this.userMemoriesIndex.delete(userId);
    this.memoryAnalyses.delete(userId);
    this.cleanupResults.delete(userId);
    this.experienceData.delete(userId);
    this.learningData.delete(userId);
    this.validationResults.delete(userId);
  }

  /**
   * 全メモリをクリア
   */
  async clearAllMemories(): Promise<void> {
    this.memoryStore.clear();
    this.userMemoriesIndex.clear();
    this.importanceScores.clear();
    this.memoryAnalyses.clear();
    this.cleanupResults.clear();
    this.experienceData.clear();
    this.searchQueries.clear();
    this.validationResults.clear();
    this.learningData.clear();
    this.archivedMemories.clear();
  }

  /**
   * リポジトリ統計を取得
   */
  async getStats(): Promise<{
    totalMemories: number;
    totalUsers: number;
    archivedMemories: number;
    totalScores: number;
  }> {
    return {
      totalMemories: this.memoryStore.size,
      totalUsers: this.userMemoriesIndex.size,
      archivedMemories: this.archivedMemories.size,
      totalScores: this.importanceScores.size,
    };
  }

  /**
   * アーカイブされたメモリを取得
   */
  async getArchivedMemories(userId: string): Promise<MemoryItem[]> {
    const memories: MemoryItem[] = [];

    const memoryArray = Array.from(this.archivedMemories.values());
    for (const memory of memoryArray) {
      if (memory.userId === userId) {
        memories.push(memory);
      }
    }

    return memories;
  }

  /**
   * アーカイブされたメモリを復元
   */
  async restoreArchivedMemory(memoryId: string): Promise<void> {
    const memory = this.archivedMemories.get(memoryId);
    if (memory) {
      this.memoryStore.set(memoryId, memory);
      this.archivedMemories.delete(memoryId);

      if (!this.userMemoriesIndex.has(memory.userId)) {
        this.userMemoriesIndex.set(memory.userId, new Set());
      }
      this.userMemoriesIndex.get(memory.userId)!.add(memoryId);
    }
  }
}
