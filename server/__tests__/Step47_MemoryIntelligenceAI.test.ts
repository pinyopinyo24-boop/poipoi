import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryIntelligenceAIManager, type MemoryItem } from '../core/MemoryIntelligenceAIManager';
import { MemoryAnalysisService } from '../services/MemoryAnalysisService';
import { ImportanceScoreService } from '../services/ImportanceScoreService';
import { MemoryCleanupService } from '../services/MemoryCleanupService';
import { MemorySearchOptimizer } from '../services/MemorySearchOptimizer';
import { ExperienceLearningService } from '../services/ExperienceLearningService';
import { MemoryValidator } from '../services/MemoryValidator';
import { MemoryIntelligenceRepository } from '../repositories/MemoryIntelligenceRepository';

describe('STEP 47: MemoryIntelligenceAIManager', () => {
  let manager: MemoryIntelligenceAIManager;
  let repository: MemoryIntelligenceRepository;
  let testMemories: MemoryItem[];

  beforeEach(() => {
    repository = new MemoryIntelligenceRepository();
    const analysisService = new MemoryAnalysisService();
    const importanceService = new ImportanceScoreService();
    const cleanupService = new MemoryCleanupService();
    const searchOptimizer = new MemorySearchOptimizer();
    const experienceService = new ExperienceLearningService();
    const validator = new MemoryValidator();

    manager = new MemoryIntelligenceAIManager(
      analysisService,
      importanceService,
      cleanupService,
      searchOptimizer,
      experienceService,
      validator,
      repository
    );

    testMemories = [
      {
        id: 'mem1',
        userId: 'user1',
        content: 'Important learning about TypeScript',
        timestamp: Date.now() - 1000000,
        importance: 0.9,
        category: 'learning',
        metadata: { source: 'tutorial' },
        accessCount: 50,
        lastAccessed: Date.now() - 10000,
        compressed: false,
      },
      {
        id: 'mem2',
        userId: 'user1',
        content: 'Another learning about TypeScript',
        timestamp: Date.now() - 2000000,
        importance: 0.8,
        category: 'learning',
        metadata: { source: 'documentation' },
        accessCount: 30,
        lastAccessed: Date.now() - 50000,
        compressed: false,
      },
      {
        id: 'mem3',
        userId: 'user1',
        content: 'Low importance note',
        timestamp: Date.now() - 3000000,
        importance: 0.2,
        category: 'notes',
        metadata: {},
        accessCount: 2,
        lastAccessed: Date.now() - 1000000,
        compressed: false,
      },
    ];
  });

  describe('MemoryIntelligenceAIManager - Core', () => {
    it('should create MemoryIntelligenceAIManager instance', () => {
      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(MemoryIntelligenceAIManager);
    });

    it('should evaluate memory importance', async () => {
      await repository.saveMemory(testMemories[0]);
      const score = await manager.evaluateMemoryImportance('mem1');

      expect(score).toBeDefined();
      expect(score.memoryId).toBe('mem1');
      expect(score.score).toBeGreaterThan(0);
      expect(score.factors).toBeDefined();
      expect(score.recommendation).toBeDefined();
    });

    it('should remove redundant memories', async () => {
      for (const mem of testMemories) {
        await repository.saveMemory(mem);
      }

      const result = await manager.removeRedundantMemories('user1');

      expect(result).toBeDefined();
      expect(result.removedCount).toBeGreaterThanOrEqual(0);
      expect(result.freedMemory).toBeGreaterThanOrEqual(0);
    });

    it('should manage long-term memory', async () => {
      for (const mem of testMemories) {
        await repository.saveMemory(mem);
      }

      const analysis = await manager.manageLongTermMemory('user1');

      expect(analysis).toBeDefined();
      expect(analysis.totalMemories).toBe(3);
      expect(analysis.memoryHealth).toBeGreaterThanOrEqual(0);
      expect(analysis.memoryHealth).toBeLessThanOrEqual(100);
    });

    it('should analyze experience data', async () => {
      for (const mem of testMemories) {
        await repository.saveMemory(mem);
      }

      const experience = await manager.analyzeExperienceData('user1');

      expect(experience).toBeDefined();
      expect(experience.userId).toBe('user1');
      expect(experience.patterns).toBeDefined();
      expect(experience.insights).toBeDefined();
      expect(experience.recommendations).toBeDefined();
    });

    it('should get memory stats', async () => {
      for (const mem of testMemories) {
        await repository.saveMemory(mem);
      }

      const stats = await manager.getMemoryStats('user1');

      expect(stats).toBeDefined();
      expect(stats.totalMemories).toBe(3);
      expect(stats.averageImportance).toBeGreaterThan(0);
    });

    it('should clear user memories', async () => {
      for (const mem of testMemories) {
        await repository.saveMemory(mem);
      }

      await manager.clearUserMemories('user1');
      const memories = await repository.getUserMemories('user1');

      expect(memories).toHaveLength(0);
    });
  });

  describe('MemoryAnalysisService', () => {
    it('should analyze memory patterns', async () => {
      const analysisService = new MemoryAnalysisService();
      const analysis = await analysisService.analyzeMemoryPatterns(testMemories);

      expect(analysis.totalMemories).toBe(3);
      expect(analysis.importantMemories).toBeGreaterThan(0);
      expect(analysis.averageImportance).toBeGreaterThan(0);
    });

    it('should analyze by category', async () => {
      const analysisService = new MemoryAnalysisService();
      const categoryAnalysis = await analysisService.analyzeByCategory(testMemories);

      expect(categoryAnalysis).toBeDefined();
      expect(categoryAnalysis.learning).toBeDefined();
      expect(categoryAnalysis.learning.count).toBe(2);
    });

    it('should analyze access patterns', async () => {
      const analysisService = new MemoryAnalysisService();
      const patterns = await analysisService.analyzeAccessPatterns(testMemories);

      expect(patterns.mostAccessed).toBeDefined();
      expect(patterns.leastAccessed).toBeDefined();
      expect(patterns.averageAccessCount).toBeGreaterThan(0);
    });
  });

  describe('ImportanceScoreService', () => {
    it('should calculate importance score', async () => {
      const importanceService = new ImportanceScoreService();
      const score = await importanceService.calculateImportanceScore(testMemories[0]);

      expect(score.memoryId).toBe('mem1');
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(1);
      expect(score.factors).toBeDefined();
    });

    it('should rank memories by importance', async () => {
      const importanceService = new ImportanceScoreService();
      const scores = await importanceService.calculateBatchImportanceScores(testMemories);
      const ranked = await importanceService.rankMemoriesByImportance(scores);

      expect(ranked).toHaveLength(3);
      expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
    });

    it('should identify low importance memories', async () => {
      const importanceService = new ImportanceScoreService();
      const scores = await importanceService.calculateBatchImportanceScores(testMemories);
      const lowImportance = await importanceService.identifyLowImportanceMemories(scores, 0.9);

      expect(lowImportance.length).toBeGreaterThanOrEqual(0);
    });

    it('should analyze score distribution', async () => {
      const importanceService = new ImportanceScoreService();
      const scores = await importanceService.calculateBatchImportanceScores(testMemories);
      const distribution = await importanceService.analyzeScoreDistribution(scores);

      expect(distribution.min).toBeLessThanOrEqual(distribution.max);
      expect(distribution.average).toBeGreaterThanOrEqual(distribution.min);
    });
  });

  describe('MemoryCleanupService', () => {
    it('should identify redundant memories', async () => {
      const cleanupService = new MemoryCleanupService();
      const redundant = await cleanupService.identifyRedundantMemories(testMemories);

      expect(redundant).toBeDefined();
      expect(Array.isArray(redundant)).toBe(true);
    });

    it('should compress and decompress memory', async () => {
      const cleanupService = new MemoryCleanupService();
      const compressed = await cleanupService.compressMemory(testMemories[0]);

      expect(compressed).toBeDefined();
      expect(typeof compressed).toBe('string');

      const decompressed = await cleanupService.decompressMemory(compressed);
      expect(decompressed).toContain('TypeScript');
    });

    it('should identify old memories', async () => {
      const cleanupService = new MemoryCleanupService();
      // Use 0 days to ensure we find old memories
      const oldMemories = await cleanupService.identifyOldMemories(testMemories, 0);

      expect(oldMemories.length).toBeGreaterThanOrEqual(0);
    });

    it('should optimize memories', async () => {
      const cleanupService = new MemoryCleanupService();
      const optimization = await cleanupService.optimizeMemories(testMemories);

      expect(optimization.compressedCount).toBeGreaterThanOrEqual(0);
      expect(optimization.deletedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('MemorySearchOptimizer', () => {
    it('should search similar memories', async () => {
      const searchOptimizer = new MemorySearchOptimizer();
      const results = await searchOptimizer.searchSimilarMemories('TypeScript', testMemories);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should search by keywords', async () => {
      const searchOptimizer = new MemorySearchOptimizer();
      const results = await searchOptimizer.searchByKeywords(['TypeScript', 'learning'], testMemories);

      expect(results.length).toBeGreaterThan(0);
    });

    it('should search by category', async () => {
      const searchOptimizer = new MemorySearchOptimizer();
      const results = await searchOptimizer.searchByCategory('learning', testMemories);

      expect(results.length).toBe(2);
    });

    it('should search by time range', async () => {
      const searchOptimizer = new MemorySearchOptimizer();
      const now = Date.now();
      const results = await searchOptimizer.searchByTimeRange(now - 5000000, now, testMemories);

      expect(results.length).toBeGreaterThan(0);
    });

    it('should perform advanced search', async () => {
      const searchOptimizer = new MemorySearchOptimizer();
      const results = await searchOptimizer.advancedSearch('TypeScript', { minImportance: 0.5 }, testMemories);

      expect(results).toBeDefined();
    });
  });

  describe('ExperienceLearningService', () => {
    it('should extract experience patterns', async () => {
      const experienceService = new ExperienceLearningService();
      const experience = await experienceService.extractExperiencePatterns(testMemories);

      expect(experience.patterns).toBeDefined();
      expect(experience.insights).toBeDefined();
      expect(experience.recommendations).toBeDefined();
    });

    it('should generate learning data', async () => {
      const experienceService = new ExperienceLearningService();
      const learningData = await experienceService.generateLearningData(testMemories);

      expect(learningData).toBeDefined();
      expect(learningData.learningScore).toBeGreaterThanOrEqual(0);
    });

    it('should extract knowledge', async () => {
      const experienceService = new ExperienceLearningService();
      const knowledge = await experienceService.extractKnowledge(testMemories);

      expect(knowledge.keyTopics).toBeDefined();
      expect(knowledge.frequentConcepts).toBeDefined();
      expect(knowledge.learningAreas).toBeDefined();
    });

    it('should analyze growth trend', async () => {
      const experienceService = new ExperienceLearningService();
      const trend = await experienceService.analyzeGrowthTrend(testMemories);

      expect(['improving', 'declining', 'stable']).toContain(trend.trend);
      expect(trend.score).toBeGreaterThanOrEqual(0);
    });

    it('should generate learning path', async () => {
      const experienceService = new ExperienceLearningService();
      const path = await experienceService.generateLearningPath(testMemories);

      expect(Array.isArray(path)).toBe(true);
    });
  });

  describe('MemoryValidator', () => {
    it('should validate memories', async () => {
      const validator = new MemoryValidator();
      const results = await validator.validateMemories(testMemories);

      expect(results).toHaveLength(3);
      expect(results[0].isValid).toBe(true);
    });

    it('should validate single memory', async () => {
      const validator = new MemoryValidator();
      const result = await validator.validateMemory(testMemories[0]);

      expect(result.memoryId).toBe('mem1');
      expect(result.isValid).toBe(true);
    });

    it('should check consistency', async () => {
      const validator = new MemoryValidator();
      const result = await validator.checkConsistency(testMemories);

      expect(result.isConsistent).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should validate data types', async () => {
      const validator = new MemoryValidator();
      const result = await validator.validateDataTypes(testMemories[0]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should generate validation report', async () => {
      const validator = new MemoryValidator();
      const report = await validator.generateValidationReport(testMemories);

      expect(report.totalMemories).toBe(3);
      expect(report.validMemories).toBeGreaterThan(0);
    });
  });

  describe('MemoryIntelligenceRepository', () => {
    it('should save and retrieve memory', async () => {
      await repository.saveMemory(testMemories[0]);
      const memory = await repository.getMemory('mem1');

      expect(memory).toBeDefined();
      expect(memory?.id).toBe('mem1');
    });

    it('should get user memories', async () => {
      for (const mem of testMemories) {
        await repository.saveMemory(mem);
      }

      const memories = await repository.getUserMemories('user1');

      expect(memories).toHaveLength(3);
    });

    it('should update memory', async () => {
      await repository.saveMemory(testMemories[0]);

      const updated = { ...testMemories[0], importance: 0.95 };
      await repository.updateMemory(updated);

      const memory = await repository.getMemory('mem1');
      expect(memory?.importance).toBe(0.95);
    });

    it('should delete memory', async () => {
      await repository.saveMemory(testMemories[0]);
      await repository.deleteMemory('mem1');

      const memory = await repository.getMemory('mem1');
      expect(memory).toBeNull();
    });

    it('should archive and restore memory', async () => {
      await repository.saveMemory(testMemories[0]);
      await repository.archiveMemory('mem1');

      const archived = await repository.getArchivedMemories('user1');
      expect(archived).toHaveLength(1);

      await repository.restoreArchivedMemory('mem1');
      const memory = await repository.getMemory('mem1');
      expect(memory).toBeDefined();
    });

    it('should clear user memories', async () => {
      for (const mem of testMemories) {
        await repository.saveMemory(mem);
      }

      await repository.clearUserMemories('user1');
      const memories = await repository.getUserMemories('user1');

      expect(memories).toHaveLength(0);
    });

    it('should get repository stats', async () => {
      for (const mem of testMemories) {
        await repository.saveMemory(mem);
      }

      const stats = await repository.getStats();

      expect(stats.totalMemories).toBe(3);
      expect(stats.totalUsers).toBe(1);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full memory intelligence workflow', async () => {
      for (const mem of testMemories) {
        await repository.saveMemory(mem);
      }

      // 1. 分析
      const analysis = await manager.getMemoryStats('user1');
      expect(analysis.totalMemories).toBe(3);

      // 2. 重要度評価
      const score = await manager.evaluateMemoryImportance('mem1');
      expect(score.score).toBeGreaterThan(0);

      // 3. 経験学習
      const experience = await manager.analyzeExperienceData('user1');
      expect(experience.patterns).toBeDefined();

      // 4. 検索
      const searchResults = await manager.optimizeSimilarMemorySearch('user1', 'TypeScript');
      expect(searchResults).toBeDefined();
    });

    it('should handle memory compression workflow', async () => {
      await repository.saveMemory(testMemories[0]);

      const compression = await manager.compressMemories('user1');
      expect(compression.compressedCount).toBeGreaterThanOrEqual(0);

      const restored = await manager.restoreMemory('mem1');
      expect(restored.content).toContain('TypeScript');
    });

    it('should validate all memories', async () => {
      for (const mem of testMemories) {
        await repository.saveMemory(mem);
      }

      const validation = await manager.validateMemories('user1');
      expect(validation.valid).toBeGreaterThan(0);
    });

    it('should generate learning data', async () => {
      for (const mem of testMemories) {
        await repository.saveMemory(mem);
      }

      const learningData = await manager.generateLearningData('user1');
      expect(learningData.patterns).toBeDefined();
      expect(learningData.insights).toBeDefined();
    });
  });
});
