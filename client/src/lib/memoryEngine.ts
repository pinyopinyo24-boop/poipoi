/**
 * Memory Engine for PoiPoi AI
 * Stores and retrieves conversation history, settings, and learning data
 */

export interface Memory {
  category: string;
  key: string;
  value: any;
  createdAt: string;
  accessCount: number;
  lastAccess: string | null;
  lastUpdated?: string;
}

class MemoryEngine {
  private memories: Memory[] = [];
  private maxMemories = 10000;

  /**
   * Add a new memory
   */
  add(category: string, key: string, value: any): void {
    // Prevent duplicate keys
    if (this.memories.some((m) => m.key === key)) {
      this.update(key, value);
      return;
    }

    // Check size limit
    if (this.memories.length >= this.maxMemories) {
      this.cleanup(2); // Remove low-access memories
    }

    this.memories.push({
      category,
      key,
      value,
      createdAt: new Date().toISOString(),
      accessCount: 0,
      lastAccess: null,
    });

    console.log(`📝 記憶を追加: ${category}/${key}`);
  }

  /**
   * Get memory by key
   */
  get(key: string): any {
    const memory = this.memories.find((m) => m.key === key);

    if (!memory) {
      console.log(`❌ 記憶が見つかりません: ${key}`);
      return null;
    }

    memory.accessCount++;
    memory.lastAccess = new Date().toISOString();

    console.log(`✅ 記憶を取得: ${key} (アクセス数: ${memory.accessCount})`);

    return memory.value;
  }

  /**
   * Search memories by category
   */
  search(category: string): Memory[] {
    const results = this.memories.filter((m) => m.category === category);
    console.log(`🔍 検索: ${category} (${results.length}件)`);
    return results;
  }

  /**
   * Update existing memory
   */
  update(key: string, value: any): boolean {
    const memory = this.memories.find((m) => m.key === key);

    if (memory) {
      memory.value = value;
      memory.lastUpdated = new Date().toISOString();
      memory.accessCount++;
      memory.lastAccess = new Date().toISOString();

      console.log(`🔄 記憶を更新: ${key}`);
      return true;
    }

    console.log(`❌ 記憶の更新に失敗: ${key} が見つかりません`);
    return false;
  }

  /**
   * Remove memory by key
   */
  remove(key: string): boolean {
    const initialLength = this.memories.length;
    this.memories = this.memories.filter((m) => m.key !== key);

    if (this.memories.length < initialLength) {
      console.log(`🗑️ 記憶を削除: ${key}`);
      return true;
    }

    return false;
  }

  /**
   * Get all memories
   */
  getAll(): Memory[] {
    return [...this.memories];
  }

  /**
   * Get memories by category with pagination
   */
  getByCategory(category: string, limit: number = 100, offset: number = 0): Memory[] {
    const results = this.memories.filter((m) => m.category === category);
    return results.slice(offset, offset + limit);
  }

  /**
   * Cleanup low-access memories
   */
  cleanup(minAccess: number = 1): void {
    const beforeLength = this.memories.length;
    this.memories = this.memories.filter((m) => m.accessCount >= minAccess);
    const removed = beforeLength - this.memories.length;

    console.log(`🧹 クリーンアップ: ${removed}件の記憶を削除`);
  }

  /**
   * Get statistics
   */
  stats() {
    const categorySet = new Set(this.memories.map((m) => m.category));
    const categories = Array.from(categorySet);
    const totalAccess = this.memories.reduce((sum, m) => sum + m.accessCount, 0);
    const avgAccess = this.memories.length > 0 ? totalAccess / this.memories.length : 0;

    return {
      total: this.memories.length,
      categories: categories,
      categoryCount: categories.length,
      totalAccess,
      avgAccess: avgAccess.toFixed(2),
      maxMemories: this.maxMemories,
      usagePercent: ((this.memories.length / this.maxMemories) * 100).toFixed(2),
    };
  }

  /**
   * Export memories as JSON
   */
  export(): string {
    return JSON.stringify(this.memories, null, 2);
  }

  /**
   * Import memories from JSON
   */
  import(jsonData: string): boolean {
    try {
      const imported = JSON.parse(jsonData);
      if (Array.isArray(imported)) {
        this.memories = imported;
        console.log(`📥 記憶をインポート: ${imported.length}件`);
        return true;
      }
    } catch (error) {
      console.error("❌ インポート失敗:", error);
    }
    return false;
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.memories = [];
    console.log("🧹 すべての記憶をクリア");
  }

  /**
   * Get most accessed memories
   */
  getMostAccessed(limit: number = 10): Memory[] {
    return [...this.memories]
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Get recent memories
   */
  getRecent(limit: number = 10): Memory[] {
    return [...this.memories]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
}

export default MemoryEngine;
