import { describe, it, expect, beforeEach } from 'vitest';
import { EvolutionAIManager, createEvolutionAIManager } from '../core/EvolutionAIManager';
import { EvolutionService } from '../services/EvolutionService';
import { LearningAnalyzer } from '../services/LearningAnalyzer';
import { FeedbackService, UserFeedback } from '../services/FeedbackService';
import { ImprovementEngine } from '../services/ImprovementEngine';
import { VersionManager } from '../services/VersionManager';
import { EvolutionValidator } from '../services/EvolutionValidator';
import { EvolutionRepository } from '../repositories/EvolutionRepository';

describe('STEP 46: EvolutionAIManager', () => {
  let manager: EvolutionAIManager;
  let evolutionService: EvolutionService;
  let learningAnalyzer: LearningAnalyzer;
  let feedbackService: FeedbackService;
  let improvementEngine: ImprovementEngine;
  let versionManager: VersionManager;
  let evolutionValidator: EvolutionValidator;
  let repository: EvolutionRepository;

  beforeEach(() => {
    evolutionService = new EvolutionService();
    learningAnalyzer = new LearningAnalyzer();
    feedbackService = new FeedbackService();
    improvementEngine = new ImprovementEngine();
    versionManager = new VersionManager();
    evolutionValidator = new EvolutionValidator();
    repository = new EvolutionRepository();

    manager = createEvolutionAIManager(
      evolutionService,
      learningAnalyzer,
      feedbackService,
      improvementEngine,
      versionManager,
      evolutionValidator,
      repository
    );
  });

  describe('EvolutionAIManager - Core', () => {
    it('should create EvolutionAIManager instance', () => {
      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(EvolutionAIManager);
    });

    it('should analyze usage patterns', async () => {
      const userId = 'test_user_1';
      const analysis = await manager.analyzeUsage(userId, 'week');
      
      expect(analysis).toBeDefined();
      expect(analysis.userId).toBe(userId);
      expect(analysis.totalSessions).toBeGreaterThan(0);
      expect(analysis.topFeatures).toBeDefined();
      expect(Array.isArray(analysis.topFeatures)).toBe(true);
    });

    it('should analyze user feedback', async () => {
      const userId = 'test_user_1';
      const analysis = await manager.analyzeFeedback(userId);
      
      expect(analysis).toBeDefined();
      expect(analysis.userId).toBe(userId);
      expect(analysis.totalFeedback).toBeGreaterThanOrEqual(0);
      expect(analysis.averageRating).toBeGreaterThanOrEqual(0);
    });

    it('should generate improvement proposals', async () => {
      const userId = 'test_user_1';
      const proposals = await manager.generateImprovementProposals(userId);
      
      expect(Array.isArray(proposals)).toBe(true);
      expect(proposals.length).toBeGreaterThan(0);
      
      proposals.forEach(proposal => {
        expect(proposal.id).toBeDefined();
        expect(proposal.userId).toBe(userId);
        expect(proposal.title).toBeDefined();
        expect(proposal.description).toBeDefined();
        expect(['performance', 'feature', 'security', 'ux', 'other']).toContain(proposal.type);
      });
    });

    it('should get evolution history', async () => {
      const userId = 'test_user_1';
      const history = await manager.getEvolutionHistory(userId);
      
      expect(Array.isArray(history)).toBe(true);
    });

    it('should get evolution stats', async () => {
      const userId = 'test_user_1';
      const stats = await manager.getEvolutionStats(userId);
      
      expect(stats).toBeDefined();
      expect(stats.totalOptimizations).toBeGreaterThanOrEqual(0);
      expect(stats.totalProposals).toBeGreaterThanOrEqual(0);
      expect(stats.totalVersions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('EvolutionService', () => {
    it('should execute optimization', async () => {
      const proposal = {
        id: 'test_proposal',
        userId: 'test_user',
        title: 'Test Optimization',
        description: 'Test description',
        type: 'performance' as const,
        priority: 'high' as const,
        estimatedImpact: 50,
        estimatedEffort: 40,
        status: 'pending' as const,
        createdAt: new Date(),
      };

      const result = await evolutionService.executeOptimization(proposal);
      
      expect(result).toBeDefined();
      expect(result.proposalId).toBe(proposal.id);
      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should resolve dependencies', async () => {
      const proposals = [
        {
          id: '1',
          priority: 'low' as const,
          title: 'Low Priority',
          description: 'Test',
          type: 'feature' as const,
          estimatedImpact: 10,
          estimatedEffort: 10,
          status: 'pending' as const,
          createdAt: new Date(),
        },
        {
          id: '2',
          priority: 'high' as const,
          title: 'High Priority',
          description: 'Test',
          type: 'feature' as const,
          estimatedImpact: 50,
          estimatedEffort: 50,
          status: 'pending' as const,
          createdAt: new Date(),
        },
      ];

      const resolved = await evolutionService.resolveDependencies(proposals);
      
      expect(resolved[0].priority).toBe('high');
      expect(resolved[1].priority).toBe('low');
    });

    it('should predict impact', async () => {
      const proposal = {
        id: 'test',
        userId: 'test_user',
        title: 'Test',
        description: 'Test',
        type: 'performance' as const,
        priority: 'high' as const,
        estimatedImpact: 50,
        estimatedEffort: 40,
        status: 'pending' as const,
        createdAt: new Date(),
      };

      const impact = await evolutionService.predictImpact(proposal);
      
      expect(impact).toBeGreaterThan(0);
      expect(impact).toBeLessThanOrEqual(50);
    });
  });

  describe('LearningAnalyzer', () => {
    it('should analyze usage patterns', async () => {
      const analysis = await learningAnalyzer.analyzeUsagePatterns('test_user', 'week');
      
      expect(analysis).toBeDefined();
      expect(analysis.totalSessions).toBeGreaterThan(0);
      expect(analysis.topFeatures).toBeDefined();
      expect(analysis.underutilizedFeatures).toBeDefined();
    });

    it('should analyze feedback', async () => {
      const feedback: UserFeedback[] = [
        {
          id: '1',
          userId: 'test_user',
          rating: 5,
          comment: 'Great!',
          category: 'feature',
          tags: ['good'],
          createdAt: new Date(),
          isAnonymous: false,
        },
        {
          id: '2',
          userId: 'test_user',
          rating: 3,
          comment: 'OK',
          category: 'ui',
          tags: ['ux'],
          createdAt: new Date(),
          isAnonymous: false,
        },
      ];

      const analysis = await learningAnalyzer.analyzeFeedback(feedback);
      
      expect(analysis.totalFeedback).toBe(2);
      expect(analysis.averageRating).toBe(4);
    });

    it('should calculate metrics', async () => {
      const analysis = await learningAnalyzer.analyzeUsagePatterns('test_user', 'week');
      const metrics = await learningAnalyzer.calculateMetrics(analysis);
      
      expect(metrics.engagement).toBeGreaterThanOrEqual(0);
      expect(metrics.engagement).toBeLessThanOrEqual(100);
      expect(metrics.featureAdoption).toBeGreaterThanOrEqual(0);
      expect(metrics.sessionQuality).toBeGreaterThanOrEqual(0);
      expect(metrics.sessionQuality).toBeLessThanOrEqual(100);
    });

    it('should generate recommendations', async () => {
      const usageAnalysis = await learningAnalyzer.analyzeUsagePatterns('test_user', 'week');
      const feedbackAnalysis = await learningAnalyzer.analyzeFeedback([]);
      const recommendations = await learningAnalyzer.generateRecommendations(usageAnalysis, feedbackAnalysis);
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('FeedbackService', () => {
    it('should create feedback', async () => {
      const feedback = await feedbackService.createFeedback(
        'test_user',
        5,
        'Great product!',
        'feature',
        ['good', 'useful']
      );
      
      expect(feedback).toBeDefined();
      expect(feedback.userId).toBe('test_user');
      expect(feedback.rating).toBe(5);
      expect(feedback.comment).toBe('Great product!');
    });

    it('should collect feedback', async () => {
      const feedback = await feedbackService.collectFeedback('test_user');
      
      expect(Array.isArray(feedback)).toBe(true);
      expect(feedback.length).toBeGreaterThan(0);
    });

    it('should get feedback stats', async () => {
      const stats = await feedbackService.getFeedbackStats('test_user');
      
      expect(stats).toBeDefined();
      expect(stats.totalFeedback).toBeGreaterThanOrEqual(0);
      expect(stats.averageRating).toBeGreaterThanOrEqual(0);
      expect(stats.ratingDistribution).toBeDefined();
    });

    it('should get positive feedback', async () => {
      const feedback = await feedbackService.getPositiveFeedback('test_user');
      
      expect(Array.isArray(feedback)).toBe(true);
      feedback.forEach(f => {
        expect(f.rating).toBeGreaterThanOrEqual(4);
      });
    });

    it('should get negative feedback', async () => {
      const feedback = await feedbackService.getNegativeFeedback('test_user');
      
      expect(Array.isArray(feedback)).toBe(true);
      feedback.forEach(f => {
        expect(f.rating).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('ImprovementEngine', () => {
    it('should generate proposals', async () => {
      const usageAnalysis = await learningAnalyzer.analyzeUsagePatterns('test_user', 'week');
      const feedbackAnalysis = await learningAnalyzer.analyzeFeedback([]);
      
      const proposals = await improvementEngine.generateProposals({
        usageAnalysis,
        feedbackAnalysis,
        userId: 'test_user',
      });
      
      expect(Array.isArray(proposals)).toBe(true);
      expect(proposals.length).toBeGreaterThan(0);
    });

    it('should estimate impact', async () => {
      const proposal = {
        id: 'test',
        userId: 'test_user',
        title: 'Test',
        description: 'Test',
        type: 'performance' as const,
        priority: 'high' as const,
        estimatedImpact: 50,
        estimatedEffort: 40,
        status: 'pending' as const,
        createdAt: new Date(),
      };

      const impact = await improvementEngine.estimateImpact(proposal);
      
      expect(impact).toBeGreaterThan(0);
      expect(impact).toBeLessThanOrEqual(100);
    });

    it('should rank proposals', async () => {
      const usageAnalysis = await learningAnalyzer.analyzeUsagePatterns('test_user', 'week');
      const feedbackAnalysis = await learningAnalyzer.analyzeFeedback([]);
      const proposals = await improvementEngine.generateProposals({
        usageAnalysis,
        feedbackAnalysis,
        userId: 'test_user',
      });

      const ranked = await improvementEngine.rankProposals(proposals);
      
      expect(Array.isArray(ranked)).toBe(true);
      expect(ranked.length).toBe(proposals.length);
    });

    it('should assess feasibility', async () => {
      const proposal = {
        id: 'test',
        userId: 'test_user',
        title: 'Test',
        description: 'Test',
        type: 'performance' as const,
        priority: 'high' as const,
        estimatedImpact: 50,
        estimatedEffort: 40,
        status: 'pending' as const,
        createdAt: new Date(),
      };

      const feasibility = await improvementEngine.assessFeasibility(proposal);
      
      expect(feasibility.score).toBeGreaterThanOrEqual(0);
      expect(feasibility.score).toBeLessThanOrEqual(100);
      expect(feasibility.recommendation).toBeDefined();
    });
  });

  describe('VersionManager', () => {
    it('should create version', async () => {
      const version = await versionManager.createVersion({
        userId: 'test_user',
        description: 'Test version',
        data: { test: 'data' },
        timestamp: new Date(),
      });
      
      expect(version).toBeDefined();
      expect(version.userId).toBe('test_user');
      expect(version.description).toBe('Test version');
      expect(version.checksum).toBeDefined();
    });

    it('should validate version', async () => {
      const version = await versionManager.createVersion({
        userId: 'test_user',
        description: 'Test version',
        data: { test: 'data' },
        timestamp: new Date(),
      });
      
      const isValid = await versionManager.validateVersion(version);
      expect(isValid).toBe(true);
    });

    it('should restore version', async () => {
      const version = await versionManager.createVersion({
        userId: 'test_user',
        description: 'Test version',
        data: { test: 'data' },
        timestamp: new Date(),
      });
      
      const restored = await versionManager.restoreVersion(version);
      
      expect(restored).toBeDefined();
      expect(restored.test).toBe('data');
      expect(restored.restoredAt).toBeDefined();
    });

    it('should calculate diff', async () => {
      const version1 = await versionManager.createVersion({
        userId: 'test_user',
        description: 'Version 1',
        data: { a: 1, b: 2 },
        timestamp: new Date(),
      });
      
      const version2 = await versionManager.createVersion({
        userId: 'test_user',
        description: 'Version 2',
        data: { a: 1, c: 3 },
        timestamp: new Date(),
      });
      
      const diff = await versionManager.calculateDiff(version1, version2);
      
      expect(diff.added).toContain('c');
      expect(diff.removed).toContain('b');
    });

    it('should get version stats', async () => {
      const versions = [];
      for (let i = 0; i < 3; i++) {
        const version = await versionManager.createVersion({
          userId: 'test_user',
          description: `Version ${i}`,
          data: { index: i },
          timestamp: new Date(),
        });
        versions.push(version);
      }
      
      const stats = await versionManager.getVersionStats(versions);
      
      expect(stats.totalVersions).toBe(3);
      expect(stats.newestVersion).toBeDefined();
      expect(stats.oldestVersion).toBeDefined();
    });
  });

  describe('EvolutionValidator', () => {
    it('should validate proposals', async () => {
      const proposals = [
        {
          id: '1',
          userId: 'test_user',
          title: 'Valid Proposal',
          description: 'This is a valid proposal',
          type: 'performance' as const,
          priority: 'high' as const,
          estimatedImpact: 50,
          estimatedEffort: 40,
          status: 'pending' as const,
          createdAt: new Date(),
        },
      ];

      const validated = await evolutionValidator.validateProposals(proposals);
      
      expect(Array.isArray(validated)).toBe(true);
      expect(validated.length).toBeGreaterThan(0);
    });

    it('should calculate quality score', async () => {
      const proposal = {
        id: '1',
        userId: 'test_user',
        title: 'Valid Proposal with Good Length',
        description: 'This is a valid proposal with good description length for quality assessment',
        type: 'performance' as const,
        priority: 'high' as const,
        estimatedImpact: 50,
        estimatedEffort: 40,
        status: 'pending' as const,
        createdAt: new Date(),
      };

      const score = await evolutionValidator.calculateQualityScore(proposal);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should detect duplicates', async () => {
      const proposals = [
        {
          id: '1',
          userId: 'test_user',
          title: 'Optimize Performance',
          description: 'Optimize system performance',
          type: 'performance' as const,
          priority: 'high' as const,
          estimatedImpact: 50,
          estimatedEffort: 40,
          status: 'pending' as const,
          createdAt: new Date(),
        },
        {
          id: '2',
          userId: 'test_user',
          title: 'Optimize Performance',
          description: 'Optimize system performance',
          type: 'performance' as const,
          priority: 'high' as const,
          estimatedImpact: 50,
          estimatedEffort: 40,
          status: 'pending' as const,
          createdAt: new Date(),
        },
      ];

      const duplicates = await evolutionValidator.detectDuplicates(proposals);
      
      expect(Array.isArray(duplicates)).toBe(true);
    });

    it('should evaluate feasibility', async () => {
      const proposal = {
        id: '1',
        userId: 'test_user',
        title: 'Valid Proposal',
        description: 'This is a valid proposal',
        type: 'performance' as const,
        priority: 'high' as const,
        estimatedImpact: 50,
        estimatedEffort: 40,
        status: 'pending' as const,
        createdAt: new Date(),
      };

      const feasibility = await evolutionValidator.evaluateFeasibility(proposal);
      
      expect(feasibility.feasible).toBeDefined();
      expect(feasibility.score).toBeGreaterThanOrEqual(0);
      expect(feasibility.issues).toBeDefined();
    });

    it('should validate proposal set', async () => {
      const proposals = [
        {
          id: '1',
          userId: 'test_user',
          title: 'Valid Proposal',
          description: 'This is a valid proposal',
          type: 'performance' as const,
          priority: 'high' as const,
          estimatedImpact: 50,
          estimatedEffort: 40,
          status: 'pending' as const,
          createdAt: new Date(),
        },
      ];

      const result = await evolutionValidator.validateProposalSet(proposals);
      
      expect(result.valid).toBeDefined();
      expect(result.validProposals).toBeDefined();
      expect(result.invalidProposals).toBeDefined();
      expect(result.issues).toBeDefined();
    });
  });

  describe('EvolutionRepository', () => {
    it('should save and retrieve analysis', async () => {
      const analysis = {
        userId: 'test_user',
        type: 'usage' as const,
        data: { test: 'data' },
        timestamp: new Date(),
      };

      await repository.saveAnalysis(analysis);
      const learningData = await repository.getLearningData('test_user');
      
      expect(learningData.analyses.length).toBeGreaterThan(0);
    });

    it('should save and retrieve proposals', async () => {
      const record = {
        userId: 'test_user',
        proposals: [
          {
            id: '1',
            userId: 'test_user',
            title: 'Test',
            description: 'Test',
            type: 'performance' as const,
            priority: 'high' as const,
            estimatedImpact: 50,
            estimatedEffort: 40,
            status: 'pending' as const,
            createdAt: new Date(),
          },
        ],
        timestamp: new Date(),
      };

      await repository.saveProposals(record);
      const proposals = await repository.getProposals('test_user');
      
      expect(proposals.length).toBeGreaterThan(0);
    });

    it('should save and retrieve versions', async () => {
      const version = {
        id: 'v1',
        userId: 'test_user',
        description: 'Test version',
        data: { test: 'data' },
        timestamp: new Date(),
      };

      await repository.saveVersion(version);
      const retrieved = await repository.getVersion('v1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('v1');
    });

    it('should clear user data', async () => {
      const analysis = {
        userId: 'test_user_2',
        type: 'usage' as const,
        data: { test: 'data' },
        timestamp: new Date(),
      };

      await repository.saveAnalysis(analysis);
      await repository.clearUserData('test_user_2');
      const learningData = await repository.getLearningData('test_user_2');
      
      expect(learningData.analyses.length).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full evolution workflow', async () => {
      const userId = 'integration_test_user';

      // 1. 利用状況を分析
      const usageAnalysis = await manager.analyzeUsage(userId);
      expect(usageAnalysis).toBeDefined();

      // 2. フィードバックを分析
      const feedbackAnalysis = await manager.analyzeFeedback(userId);
      expect(feedbackAnalysis).toBeDefined();

      // 3. 改善提案を生成
      const proposals = await manager.generateImprovementProposals(userId);
      expect(proposals.length).toBeGreaterThan(0);

      // 4. 提案の詳細を取得
      if (proposals.length > 0) {
        const details = await manager.getProposalDetails(proposals[0].id);
        expect(details).toBeDefined();
      }

      // 5. 統計を取得
      const stats = await manager.getEvolutionStats(userId);
      expect(stats.totalProposals).toBeGreaterThan(0);
    });

    it('should handle version management workflow', async () => {
      const userId = 'version_test_user';

      // 1. バージョンを作成
      const version1 = await manager.createVersion(userId, 'Initial version', { data: 'v1' });
      expect(version1).toBeDefined();

      // 2. バージョン履歴を取得
      const history = await manager.getVersionHistory(userId);
      expect(history.length).toBeGreaterThan(0);

      // 3. バージョンを復元
      const restored = await manager.restoreVersion(userId, version1.id);
      expect(restored).toBeDefined();
    });

    it('should handle proposal approval workflow', async () => {
      const userId = 'approval_test_user';

      // 1. 提案を生成
      const proposals = await manager.generateImprovementProposals(userId);
      expect(proposals.length).toBeGreaterThan(0);

      if (proposals.length > 0) {
        // 2. 提案を承認
        const approved = await manager.approveProposal(userId, proposals[0].id);
        expect(approved.status).toBe('accepted');

        // 3. 別の提案を却下
        if (proposals.length > 1) {
          const rejected = await manager.rejectProposal(userId, proposals[1].id, 'Not feasible');
          expect(rejected.status).toBe('rejected');
        }
      }
    });

    it('should export and analyze learning data', async () => {
      const userId = 'export_test_user';

      // 1. 複数の分析を実行
      await manager.analyzeUsage(userId);
      await manager.analyzeFeedback(userId);
      await manager.generateImprovementProposals(userId);

      // 2. 学習データをエクスポート
      const exported = await manager.exportLearningData(userId);
      
      expect(exported).toBeDefined();
      expect(exported.userId).toBe(userId);
      expect(exported.history).toBeDefined();
      expect(exported.proposals).toBeDefined();
      expect(exported.versions).toBeDefined();
      expect(exported.stats).toBeDefined();
    });
  });
});
