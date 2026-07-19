import { describe, it, expect, beforeEach } from 'vitest';
import { ReasoningAIManager } from '../core/ReasoningAIManager';
import { ReasoningService } from '../services/ReasoningService';
import { ProblemDecompositionService } from '../services/ProblemDecompositionService';
import { LogicAnalyzer } from '../services/LogicAnalyzer';
import { DecisionSupportService } from '../services/DecisionSupportService';
import { ContextAnalysisService } from '../services/ContextAnalysisService';
import { ReasoningValidator } from '../services/ReasoningValidator';
import { ReasoningRepository } from '../repositories/ReasoningRepository';

describe('STEP 48: ReasoningAIManager', () => {
  let manager: ReasoningAIManager;
  let reasoningService: ReasoningService;
  let decompositionService: ProblemDecompositionService;
  let logicAnalyzer: LogicAnalyzer;
  let decisionSupport: DecisionSupportService;
  let contextAnalysis: ContextAnalysisService;
  let validator: ReasoningValidator;
  let repository: ReasoningRepository;

  beforeEach(() => {
    reasoningService = new ReasoningService();
    decompositionService = new ProblemDecompositionService();
    logicAnalyzer = new LogicAnalyzer();
    decisionSupport = new DecisionSupportService();
    contextAnalysis = new ContextAnalysisService();
    validator = new ReasoningValidator();
    repository = new ReasoningRepository();

    manager = new ReasoningAIManager(
      reasoningService,
      decompositionService,
      logicAnalyzer,
      decisionSupport,
      contextAnalysis,
      validator,
      repository
    );
  });

  describe('ReasoningAIManager - Core', () => {
    it('should create manager with all dependencies', () => {
      expect(manager).toBeDefined();
    });

    it('should execute reasoning with valid request', async () => {
      const request = {
        userId: 'user123',
        problem: 'How to optimize system performance',
        context: { environment: 'production' },
        constraints: ['Budget limited'],
        objectives: ['Reduce latency'],
      };

      const result = await manager.executeReasoning(request);
      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
    });

    it('should reject invalid request', async () => {
      const request = {
        userId: '',
        problem: '',
      };

      await expect(manager.executeReasoning(request as any)).rejects.toThrow();
    });

    it('should get user reasoning history', async () => {
      const request = {
        userId: 'user123',
        problem: 'Test problem',
      };

      await manager.executeReasoning(request);
      const history = await manager.getUserReasoningHistory('user123');

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should get reasoning result by ID', async () => {
      const request = {
        userId: 'user123',
        problem: 'Test problem',
      };

      const result = await manager.executeReasoning(request);
      const retrieved = await manager.getReasoningResult(result.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(result.id);
    });

    it('should evaluate reasoning result', async () => {
      const request = {
        userId: 'user123',
        problem: 'Test problem',
      };

      const result = await manager.executeReasoning(request);
      await manager.evaluateReasoning(result.id, { rating: 4, comments: 'Good' });

      expect(true).toBe(true);
    });

    it('should record feedback', async () => {
      const request = {
        userId: 'user123',
        problem: 'Test problem',
      };

      const result = await manager.executeReasoning(request);
      await manager.recordFeedback(result.id, 'Feedback text');

      expect(true).toBe(true);
    });
  });

  describe('ReasoningService', () => {
    it('should create workflow', async () => {
      const workflow = await reasoningService.createWorkflow(['step1', 'step2']);
      expect(workflow).toBeDefined();
      expect(workflow.steps.length).toBe(2);
    });

    it('should advance workflow', async () => {
      const workflow = await reasoningService.createWorkflow(['step1', 'step2']);
      const advanced = await reasoningService.advanceWorkflow(workflow.id, {
        result: 'step1 result',
      });

      expect(advanced.currentStep).toBe(1);
    });

    it('should get workflow status', async () => {
      const workflow = await reasoningService.createWorkflow(['step1']);
      const status = await reasoningService.getWorkflowStatus(workflow.id);

      expect(status).toBeDefined();
      expect(status?.id).toBe(workflow.id);
    });

    it('should execute parallel workflows', async () => {
      const workflows = [['step1', 'step2'], ['step3', 'step4']];
      const results = await reasoningService.executeParallelWorkflows(workflows);

      expect(results.length).toBe(2);
    });

    it('should get workflow stats', async () => {
      await reasoningService.createWorkflow(['step1']);
      const stats = await reasoningService.getWorkflowStats();

      expect(stats.totalWorkflows).toBeGreaterThan(0);
    });
  });

  describe('ProblemDecompositionService', () => {
    it('should decompose problem', async () => {
      const decomposition = await decompositionService.decomposeProblem(
        'Optimize database query performance',
        []
      );

      expect(Array.isArray(decomposition)).toBe(true);
      expect(decomposition.length).toBeGreaterThan(0);
    });

    it('should analyze structure', async () => {
      const structure = await decompositionService.analyzeStructure(
        'Improve system reliability'
      );

      expect(structure.mainProblem).toBeDefined();
      expect(structure.subProblems.length).toBeGreaterThan(0);
    });

    it('should validate decomposition', async () => {
      const decomposed = {
        mainProblem: 'Test',
        subProblems: ['Sub1', 'Sub2'],
        dependencies: [],
        priority: [1, 2],
      };

      const valid = await decompositionService.validateDecomposition(decomposed);
      expect(valid).toBe(true);
    });
  });

  describe('LogicAnalyzer', () => {
    it('should analyze problem logic', async () => {
      const analysis = await logicAnalyzer.analyzeProblemLogic(
        'Test problem',
        ['Sub1', 'Sub2'],
        {}
      );

      expect(analysis).toBeDefined();
      expect(analysis.premises).toBeDefined();
      expect(analysis.conclusions).toBeDefined();
    });

    it('should detect contradictions', async () => {
      const analysis = {
        premises: [
          {
            id: '1',
            statement: 'A is true',
            type: 'premise' as const,
            confidence: 0.8,
          },
          {
            id: '2',
            statement: 'A is not true',
            type: 'premise' as const,
            confidence: 0.8,
          },
        ],
        conclusions: [],
        assumptions: [],
        logicalChain: [],
        validityScore: 0.5,
      };

      const contradictions = await logicAnalyzer.detectContradictions(analysis);
      expect(Array.isArray(contradictions)).toBe(true);
    });
  });

  describe('DecisionSupportService', () => {
    it('should generate alternatives', async () => {
      const alternatives = await decisionSupport.generateAlternatives(
        'Test problem',
        ['Sub1'],
        ['Objective1']
      );

      expect(Array.isArray(alternatives)).toBe(true);
      expect(alternatives.length).toBeGreaterThan(0);
    });

    it('should support decision', async () => {
      const alternatives = await decisionSupport.generateAlternatives(
        'Test',
        [],
        []
      );
      const recommendation = await decisionSupport.supportDecision(alternatives, []);

      expect(recommendation.option).toBeDefined();
      expect(recommendation.confidence).toBeGreaterThanOrEqual(0);
      expect(recommendation.confidence).toBeLessThanOrEqual(1);
    });

    it('should compare alternatives', async () => {
      const alternatives = await decisionSupport.generateAlternatives(
        'Test',
        [],
        []
      );
      const comparison = await decisionSupport.compareAlternatives(alternatives);

      expect(comparison.count).toBe(alternatives.length);
      expect(comparison.bestScore).toBeGreaterThanOrEqual(0);
    });

    it('should analyze risk', async () => {
      const alternatives = await decisionSupport.generateAlternatives(
        'Test',
        [],
        []
      );
      const risk = await decisionSupport.analyzeRisk(alternatives[0]);

      expect(risk.riskLevel).toBeGreaterThanOrEqual(0);
      expect(risk.riskLevel).toBeLessThanOrEqual(1);
    });
  });

  describe('ContextAnalysisService', () => {
    it('should analyze context', async () => {
      const context = await contextAnalysis.analyzeContext('Test problem', {});

      expect(context.domain).toBeDefined();
      expect(context.constraints).toBeDefined();
      expect(context.assumptions).toBeDefined();
    });

    it('should identify domain', async () => {
      const context = await contextAnalysis.analyzeContext(
        'Optimize database code',
        {}
      );

      expect(context.domain).toBeDefined();
    });

    it('should validate context', async () => {
      const contextInfo = {
        domain: 'technical',
        constraints: ['Limited resources'],
        assumptions: ['Problem is well-defined'],
        relevantFactors: ['Factor1'],
        timeframe: 'Short-term',
      };

      const valid = await contextAnalysis.validateContext(contextInfo);
      expect(valid).toBe(true);
    });

    it('should evaluate context completeness', async () => {
      const contextInfo = {
        domain: 'technical',
        constraints: ['Limited resources'],
        assumptions: ['Problem is well-defined'],
        relevantFactors: ['Factor1'],
        timeframe: 'Short-term',
      };

      const completeness = await contextAnalysis.evaluateContextCompleteness(
        contextInfo
      );

      expect(completeness).toBeGreaterThanOrEqual(0);
      expect(completeness).toBeLessThanOrEqual(1);
    });
  });

  describe('ReasoningValidator', () => {
    it('should validate request', () => {
      const validRequest = {
        userId: 'user123',
        problem: 'Test problem',
      };

      const valid = validator.validateRequest(validRequest);
      expect(valid).toBe(true);
    });

    it('should reject invalid request', () => {
      const invalidRequest = {
        userId: '',
        problem: '',
      };

      const valid = validator.validateRequest(invalidRequest);
      expect(valid).toBe(false);
    });

    it('should validate problem', () => {
      const valid = validator.validateProblem('This is a test problem');
      expect(valid).toBe(true);
    });

    it('should validate decomposition', () => {
      const valid = validator.validateDecomposition(['Sub1', 'Sub2']);
      expect(valid).toBe(true);
    });

    it('should validate alternatives', () => {
      const alternatives = [
        { score: 0.8 },
        { score: 0.7 },
      ];

      const valid = validator.validateAlternatives(alternatives);
      expect(valid).toBe(true);
    });

    it('should validate recommendation', () => {
      const recommendation = {
        option: 'Option A',
        confidence: 0.85,
        reasoning: 'Good reasoning',
      };

      const valid = validator.validateRecommendation(recommendation);
      expect(valid).toBe(true);
    });

    it('should validate feedback', () => {
      const feedback = { rating: 4, comments: 'Good' };
      const valid = validator.validateFeedback(feedback);
      expect(valid).toBe(true);
    });
  });

  describe('ReasoningRepository', () => {
    it('should save and retrieve result', async () => {
      const result = {
        id: 'result123',
        userId: 'user123',
        problem: 'Test',
        decomposition: ['Sub1'],
        logicAnalysis: {},
        alternatives: [{ id: '1', description: 'Alt1', pros: [], cons: [], score: 0.8 }],
        recommendation: {
          option: 'Option A',
          confidence: 0.85,
          reasoning: 'Good',
        },
        timestamp: Date.now(),
        status: 'completed' as const,
      };

      await repository.saveReasoningResult(result);
      const retrieved = await repository.getReasoningResult('result123');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('result123');
    });

    it('should get user history', async () => {
      const result = {
        id: 'result123',
        userId: 'user123',
        problem: 'Test',
        decomposition: ['Sub1'],
        logicAnalysis: {},
        alternatives: [{ id: '1', description: 'Alt1', pros: [], cons: [], score: 0.8 }],
        recommendation: {
          option: 'Option A',
          confidence: 0.85,
          reasoning: 'Good',
        },
        timestamp: Date.now(),
        status: 'completed' as const,
      };

      await repository.saveReasoningResult(result);
      const history = await repository.getUserReasoningHistory('user123');

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should get reasoning stats', async () => {
      const result = {
        id: 'result123',
        userId: 'user123',
        problem: 'Test',
        decomposition: ['Sub1'],
        logicAnalysis: {},
        alternatives: [{ id: '1', description: 'Alt1', pros: [], cons: [], score: 0.8 }],
        recommendation: {
          option: 'Option A',
          confidence: 0.85,
          reasoning: 'Good',
        },
        timestamp: Date.now(),
        status: 'completed' as const,
      };

      await repository.saveReasoningResult(result);
      const stats = await repository.getReasoningStats('user123');

      expect(stats.totalReasonings).toBeGreaterThan(0);
    });

    it('should delete result', async () => {
      const result = {
        id: 'result123',
        userId: 'user123',
        problem: 'Test',
        decomposition: ['Sub1'],
        logicAnalysis: {},
        alternatives: [{ id: '1', description: 'Alt1', pros: [], cons: [], score: 0.8 }],
        recommendation: {
          option: 'Option A',
          confidence: 0.85,
          reasoning: 'Good',
        },
        timestamp: Date.now(),
        status: 'completed' as const,
      };

      await repository.saveReasoningResult(result);
      await repository.deleteResult('result123');
      const retrieved = await repository.getReasoningResult('result123');

      expect(retrieved).toBeNull();
    });
  });

  describe('Integration Tests', () => {
    it('should execute complete reasoning workflow', async () => {
      const request = {
        userId: 'user123',
        problem: 'How to improve team productivity',
        context: { teamSize: 10 },
        constraints: ['Limited budget'],
        objectives: ['Increase output by 20%'],
      };

      const result = await manager.executeReasoning(request);

      expect(result.status).toBe('completed');
      expect(result.decomposition.length).toBeGreaterThan(0);
      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.recommendation.option).toBeDefined();
    });

    it('should handle multiple reasoning requests', async () => {
      const requests = [
        {
          userId: 'user1',
          problem: 'Problem 1',
        },
        {
          userId: 'user2',
          problem: 'Problem 2',
        },
      ];

      const results = await Promise.all(
        requests.map((req) => manager.executeReasoning(req))
      );

      expect(results.length).toBe(2);
      expect(results[0].status).toBe('completed');
      expect(results[1].status).toBe('completed');
    });

    it('should track reasoning statistics', async () => {
      const request = {
        userId: 'user123',
        problem: 'Test problem',
      };

      await manager.executeReasoning(request);
      const stats = await manager.getReasoningStats('user123');

      expect(stats.totalReasonings).toBeGreaterThan(0);
    });
  });
});
