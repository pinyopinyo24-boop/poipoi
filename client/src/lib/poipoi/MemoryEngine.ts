/**
 * Memory Engine - PoiPoi AI Core
 * 長期記憶管理システム
 */

export interface Memory {
  category: string;
  key: string;
  value: any;
  createdAt: string;
  accessCount: number;
  lastAccess: string | null;
}

export interface MemoryStats {
  total: number;
  categories: string[];
  categoryCount: number;
  avgAccess: number;
  usagePercent: number;
}

class MemoryEngine {
  private memories: Memory[] = [];

  add(category: string, key: string, value: any): void {
    this.memories.push({
      category,
      key,
      value,
      createdAt: new Date().toISOString(),
      accessCount: 0,
      lastAccess: null,
    });
  }

  get(key: string): any {
    const memory = this.memories.find((m) => m.key === key);

    if (!memory) return null;

    memory.accessCount++;
    memory.lastAccess = new Date().toISOString();

    return memory.value;
  }

  search(category: string): Memory[] {
    return this.memories.filter((m) => m.category === category);
  }

  update(key: string, value: any): boolean {
    const memory = this.memories.find((m) => m.key === key);

    if (memory) {
      memory.value = value;
      return true;
    }

    return false;
  }

  remove(key: string): void {
    this.memories = this.memories.filter((m) => m.key !== key);
  }

  getAll(): Memory[] {
    return [...this.memories];
  }

  cleanup(minAccess: number = 1): void {
    this.memories = this.memories.filter((m) => m.accessCount >= minAccess);
  }

  stats(): MemoryStats {
    const categories = Array.from(new Set(this.memories.map((m) => m.category)));
    const totalAccess = this.memories.reduce((sum, m) => sum + m.accessCount, 0);
    const avgAccess = this.memories.length > 0 ? totalAccess / this.memories.length : 0;

    return {
      total: this.memories.length,
      categories,
      categoryCount: categories.length,
      avgAccess: Math.round(avgAccess * 100) / 100,
      usagePercent: Math.min(Math.round((this.memories.length / 10000) * 100), 100),
    };
  }
}

export default MemoryEngine;
