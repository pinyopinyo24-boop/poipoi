import type { MemoryItem, MemoryCleanupResult } from '../core/MemoryIntelligenceAIManager';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export class MemoryCleanupService {
  /**
   * 重複メモリを特定
   */
  async identifyRedundantMemories(memories: MemoryItem[]): Promise<MemoryItem[]> {
    const seen = new Map<string, MemoryItem>();
    const redundant: MemoryItem[] = [];

    for (const memory of memories) {
      const normalized = memory.content.toLowerCase().trim();
      
      if (seen.has(normalized)) {
        // 古い方を削除対象にする
        const existing = seen.get(normalized)!;
        if (existing.timestamp > memory.timestamp) {
          redundant.push(memory);
        } else {
          redundant.push(existing);
          seen.set(normalized, memory);
        }
      } else {
        seen.set(normalized, memory);
      }
    }

    return redundant;
  }

  /**
   * メモリをクリーンアップ
   */
  async cleanupMemories(memories: MemoryItem[]): Promise<MemoryCleanupResult> {
    const startTime = Date.now();
    let freedMemory = 0;

    for (const memory of memories) {
      freedMemory += memory.content.length;
    }

    const cleanupTime = Date.now() - startTime;
    const remainingMemories = 0; // 削除されたメモリ数

    return {
      removedCount: memories.length,
      freedMemory,
      remainingMemories,
      cleanupTime,
    };
  }

  /**
   * メモリを圧縮
   */
  async compressMemory(memory: MemoryItem): Promise<string> {
    try {
      const buffer = Buffer.from(memory.content, 'utf-8');
      const compressed = await gzip(buffer);
      return compressed.toString('base64');
    } catch (error) {
      console.error('Compression error:', error);
      return memory.content;
    }
  }

  /**
   * メモリを解凍
   */
  async decompressMemory(compressedData: string): Promise<string> {
    try {
      const buffer = Buffer.from(compressedData, 'base64');
      const decompressed = await gunzip(buffer);
      return decompressed.toString('utf-8');
    } catch (error) {
      console.error('Decompression error:', error);
      return compressedData;
    }
  }

  /**
   * メモリサイズを計算
   */
  calculateMemorySize(memory: MemoryItem): number {
    if (memory.compressed && memory.compressedData) {
      return Buffer.byteLength(memory.compressedData, 'base64');
    }
    return Buffer.byteLength(memory.content, 'utf-8');
  }

  /**
   * 圧縮率を計算
   */
  async calculateCompressionRatio(memory: MemoryItem): Promise<number> {
    const originalSize = Buffer.byteLength(memory.content, 'utf-8');
    
    if (memory.compressed && memory.compressedData) {
      const compressedSize = Buffer.byteLength(memory.compressedData, 'base64');
      return compressedSize / originalSize;
    }

    return 1;
  }

  /**
   * 古いメモリを特定
   */
  async identifyOldMemories(memories: MemoryItem[], daysOld: number = 365): Promise<MemoryItem[]> {
    const now = Date.now();
    const threshold = daysOld * 24 * 60 * 60 * 1000;

    return memories.filter(memory => {
      const age = now - memory.timestamp;
      return age > threshold;
    });
  }

  /**
   * アクセスされていないメモリを特定
   */
  async identifyUnusedMemories(memories: MemoryItem[], daysUnused: number = 90): Promise<MemoryItem[]> {
    const now = Date.now();
    const threshold = daysUnused * 24 * 60 * 60 * 1000;

    return memories.filter(memory => {
      const timeSinceAccess = now - memory.lastAccessed;
      return timeSinceAccess > threshold && memory.accessCount === 0;
    });
  }

  /**
   * 低優先度メモリを特定
   */
  async identifyLowPriorityMemories(memories: MemoryItem[], threshold: number = 0.3): Promise<MemoryItem[]> {
    return memories.filter(memory => memory.importance < threshold);
  }

  /**
   * メモリ最適化を実行
   */
  async optimizeMemories(memories: MemoryItem[]): Promise<{
    compressedCount: number;
    archivedCount: number;
    deletedCount: number;
    totalFreedMemory: number;
  }> {
    let compressedCount = 0;
    let archivedCount = 0;
    let deletedCount = 0;
    let totalFreedMemory = 0;

    for (const memory of memories) {
      // 低優先度メモリは削除
      if (memory.importance < 0.2) {
        deletedCount++;
        totalFreedMemory += this.calculateMemorySize(memory);
      }
      // 古いメモリはアーカイブ
      else if (Date.now() - memory.timestamp > 365 * 24 * 60 * 60 * 1000) {
        archivedCount++;
      }
      // その他は圧縮
      else if (!memory.compressed) {
        compressedCount++;
      }
    }

    return {
      compressedCount,
      archivedCount,
      deletedCount,
      totalFreedMemory,
    };
  }

  /**
   * バッチ圧縮を実行
   */
  async batchCompress(memories: MemoryItem[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const memory of memories) {
      if (!memory.compressed) {
        const compressed = await this.compressMemory(memory);
        results.set(memory.id, compressed);
      }
    }

    return results;
  }

  /**
   * バッチ解凍を実行
   */
  async batchDecompress(memories: MemoryItem[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const memory of memories) {
      if (memory.compressed && memory.compressedData) {
        const decompressed = await this.decompressMemory(memory.compressedData);
        results.set(memory.id, decompressed);
      }
    }

    return results;
  }
}
