import { MemoryAnalysisService } from '../services/MemoryAnalysisService';
import { ImportanceScoreService } from '../services/ImportanceScoreService';
import { MemoryCleanupService } from '../services/MemoryCleanupService';
import { MemorySearchOptimizer } from '../services/MemorySearchOptimizer';
import { ExperienceLearningService } from '../services/ExperienceLearningService';
import { MemoryValidator } from '../services/MemoryValidator';
import { MemoryIntelligenceRepository } from '../repositories/MemoryIntelligenceRepository';

export interface MemoryItem {
  id: string;
  userId: string;
  content: string;
  timestamp: number;
  importance: number;
  category: string;
  metadata: Record<string, unknown>;
  accessCount: number;
  lastAccessed: number;
  compressed: boolean;
  compressedData?: string;
}

export interface MemoryAnalysis {
  totalMemories: number;
  importantMemories: number;
  redundantMemories: number;
  compressionRatio: number;
  averageImportance: number;
  memoryHealth: number;
}

export interface ImportanceScore {
  memoryId: string;
  score: number;
  factors: {
    frequency: number;
    recency: number;
    relevance: number;
    uniqueness: number;
  };
  recommendation: string;
}

export interface MemoryCleanupResult {
  removedCount: number;
  freedMemory: number;
  remainingMemories: number;
  cleanupTime: number;
}

export interface MemorySearchResult {
  memoryId: string;
  similarity: number;
  content: string;
  relevanceScore: number;
}

export interface ExperienceData {
  userId: string;
  patterns: string[];
  insights: string[];
  recommendations: string[];
  learningScore: number;
  generatedAt: number;
}

export class MemoryIntelligenceAIManager {
  private memoryAnalysisService: MemoryAnalysisService;
  private importanceScoreService: ImportanceScoreService;
  private memoryCleanupService: MemoryCleanupService;
  private memorySearchOptimizer: MemorySearchOptimizer;
  private experienceLearningService: ExperienceLearningService;
  private memoryValidator: MemoryValidator;
  private repository: MemoryIntelligenceRepository;

  constructor(
    memoryAnalysisService: MemoryAnalysisService,
    importanceScoreService: ImportanceScoreService,
    memoryCleanupService: MemoryCleanupService,
    memorySearchOptimizer: MemorySearchOptimizer,
    experienceLearningService: ExperienceLearningService,
    memoryValidator: MemoryValidator,
    repository: MemoryIntelligenceRepository
  ) {
    this.memoryAnalysisService = memoryAnalysisService;
    this.importanceScoreService = importanceScoreService;
    this.memoryCleanupService = memoryCleanupService;
    this.memorySearchOptimizer = memorySearchOptimizer;
    this.experienceLearningService = experienceLearningService;
    this.memoryValidator = memoryValidator;
    this.repository = repository;
  }

  /**
   * 記憶重要度判定
   */
  async evaluateMemoryImportance(memoryId: string): Promise<ImportanceScore> {
    const memory = await this.repository.getMemory(memoryId);
    if (!memory) {
      throw new Error(`Memory not found: ${memoryId}`);
    }

    const score = await this.importanceScoreService.calculateImportanceScore(memory);
    await this.repository.saveImportanceScore(score);
    return score;
  }

  /**
   * 不要メモリ削除
   */
  async removeRedundantMemories(userId: string): Promise<MemoryCleanupResult> {
    const memories = await this.repository.getUserMemories(userId);
    const redundant = await this.memoryCleanupService.identifyRedundantMemories(memories);
    
    const result = await this.memoryCleanupService.cleanupMemories(redundant);
    await this.repository.saveCleanupResult(userId, result);
    
    return result;
  }

  /**
   * 長期記憶管理
   */
  async manageLongTermMemory(userId: string): Promise<MemoryAnalysis> {
    const memories = await this.repository.getUserMemories(userId);
    const analysis = await this.memoryAnalysisService.analyzeMemoryPatterns(memories);
    
    // 重要度が低いメモリを特定
    const lowImportanceMemories = memories.filter(m => m.importance < 0.3);
    
    // 低重要度メモリをアーカイブ
    for (const memory of lowImportanceMemories) {
      await this.repository.archiveMemory(memory.id);
    }

    await this.repository.saveMemoryAnalysis(userId, analysis);
    return analysis;
  }

  /**
   * 経験データ分析
   */
  async analyzeExperienceData(userId: string): Promise<ExperienceData> {
    const memories = await this.repository.getUserMemories(userId);
    const experienceData = await this.experienceLearningService.extractExperiencePatterns(memories);
    
    await this.repository.saveExperienceData(userId, experienceData);
    return experienceData;
  }

  /**
   * 類似記憶検索最適化
   */
  async optimizeSimilarMemorySearch(userId: string, query: string): Promise<MemorySearchResult[]> {
    const memories = await this.repository.getUserMemories(userId);
    const results = await this.memorySearchOptimizer.searchSimilarMemories(query, memories);
    
    await this.repository.saveSearchQuery(userId, query, results);
    return results;
  }

  /**
   * 記憶圧縮
   */
  async compressMemories(userId: string): Promise<{ compressedCount: number; compressionRatio: number }> {
    const memories = await this.repository.getUserMemories(userId);
    let compressedCount = 0;
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    for (const memory of memories) {
      if (!memory.compressed) {
        const compressed = await this.memoryCleanupService.compressMemory(memory);
        totalOriginalSize += memory.content.length;
        totalCompressedSize += compressed.length;
        
        await this.repository.updateMemory({
          ...memory,
          compressed: true,
          compressedData: compressed,
        });
        
        compressedCount++;
      }
    }

    const compressionRatio = totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 0;
    return { compressedCount, compressionRatio };
  }

  /**
   * 記憶復元
   */
  async restoreMemory(memoryId: string): Promise<MemoryItem> {
    const memory = await this.repository.getMemory(memoryId);
    if (!memory) {
      throw new Error(`Memory not found: ${memoryId}`);
    }

    if (memory.compressed && memory.compressedData) {
      const decompressed = await this.memoryCleanupService.decompressMemory(memory.compressedData);
      const restored = {
        ...memory,
        content: decompressed,
        compressed: false,
        compressedData: undefined,
      };
      
      await this.repository.updateMemory(restored);
      return restored;
    }

    return memory;
  }

  /**
   * 学習データ生成
   */
  async generateLearningData(userId: string): Promise<ExperienceData> {
    const memories = await this.repository.getUserMemories(userId);
    const experienceData = await this.experienceLearningService.generateLearningData(memories);
    
    await this.repository.saveLearningData(userId, experienceData);
    return experienceData;
  }

  /**
   * 記憶バリデーション
   */
  async validateMemories(userId: string): Promise<{ valid: number; invalid: number; errors: string[] }> {
    const memories = await this.repository.getUserMemories(userId);
    const validationResults = await this.memoryValidator.validateMemories(memories);
    
    const valid = validationResults.filter(r => r.isValid).length;
    const invalid = validationResults.filter(r => !r.isValid).length;
    const errors = validationResults.filter(r => !r.isValid).map(r => r.error || '');

    await this.repository.saveValidationResults(userId, { valid, invalid, errors });
    return { valid, invalid, errors };
  }

  /**
   * 全メモリ統計情報取得
   */
  async getMemoryStats(userId: string): Promise<MemoryAnalysis> {
    const memories = await this.repository.getUserMemories(userId);
    return this.memoryAnalysisService.analyzeMemoryPatterns(memories);
  }

  /**
   * ユーザーメモリクリア
   */
  async clearUserMemories(userId: string): Promise<void> {
    await this.repository.clearUserMemories(userId);
  }
}
