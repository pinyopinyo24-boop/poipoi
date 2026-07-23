/**
 * STEP 49: AICollaborationManager テストスイート
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AICollaborationManager, type AIAgent, type CollaborationTask } from '../core/AICollaborationManager';
import { CollaborationService } from '../services/CollaborationService';
import { AgentCommunicationService } from '../services/AgentCommunicationService';
import { TaskDistributionService } from '../services/TaskDistributionService';
import { ConsensusService } from '../services/ConsensusService';
import { CollaborationHistoryService } from '../services/CollaborationHistoryService';
import { CollaborationValidator } from '../services/CollaborationValidator';
import { CollaborationRepository } from '../repositories/CollaborationRepository';

describe('AICollaborationManager - AI協調制御基盤', () => {
  let manager: AICollaborationManager;
  let collaborationService: CollaborationService;
  let agentCommunication: AgentCommunicationService;
  let taskDistribution: TaskDistributionService;
  let consensusService: ConsensusService;
  let collaborationHistory: CollaborationHistoryService;
  let validator: CollaborationValidator;
  let repository: CollaborationRepository;

  const mockAgents: AIAgent[] = [
    {
      id: 'reasoning_1',
      name: 'Reasoning Agent',
      type: 'reasoning',
      capabilities: ['analysis', 'logic'],
      status: 'active',
    },
    {
      id: 'evolution_1',
      name: 'Evolution Agent',
      type: 'evolution',
      capabilities: ['improvement', 'optimization'],
      status: 'active',
    },
    {
      id: 'memory_1',
      name: 'Memory Agent',
      type: 'memory',
      capabilities: ['storage', 'retrieval'],
      status: 'active',
    },
  ];

  const mockTask: CollaborationTask = {
    id: 'task_1',
    description: 'Solve complex problem',
    priority: 5,
    assignedAgents: ['reasoning_1', 'evolution_1', 'memory_1'],
    status: 'pending',
    results: [],
  };

  beforeEach(() => {
    collaborationService = new CollaborationService();
    agentCommunication = new AgentCommunicationService();
    taskDistribution = new TaskDistributionService();
    consensusService = new ConsensusService();
    collaborationHistory = new CollaborationHistoryService();
    validator = new CollaborationValidator();
    repository = new CollaborationRepository();

    manager = new AICollaborationManager(
      collaborationService,
      agentCommunication,
      taskDistribution,
      consensusService,
      collaborationHistory,
      validator,
      repository
    );
  });

  describe('① AI Manager間通信', () => {
    it('should communicate with agent successfully', async () => {
      const response = await agentCommunication.communicateWithAgent(
        'reasoning',
        'Analyze this problem'
      );

      expect(response).toBeDefined();
      expect(response.type).toBe('reasoning_response');
    });

    it('should handle multiple agent communications', async () => {
      const responses = await Promise.all([
        agentCommunication.communicateWithAgent('reasoning', 'Analyze'),
        agentCommunication.communicateWithAgent('evolution', 'Improve'),
        agentCommunication.communicateWithAgent('memory', 'Retrieve'),
      ]);

      expect(responses).toHaveLength(3);
      responses.forEach((r) => expect(r).toBeDefined());
    });

    it('should track message history', async () => {
      await agentCommunication.communicateWithAgent('reasoning', 'Test message');

      const history = await agentCommunication.getMessageHistory('reasoning');
      expect(history.length).toBeGreaterThan(0);
    });

    it('should get communication stats', async () => {
      await agentCommunication.communicateWithAgent('reasoning', 'Test');

      const stats = await agentCommunication.getCommunicationStats();
      expect(stats.totalMessages).toBeGreaterThan(0);
    });
  });

  describe('② タスク分配', () => {
    it('should distribute tasks to agents', async () => {
      const distributed = await taskDistribution.distributeTasks(mockTask, mockTask.assignedAgents);

      expect(distributed).toHaveLength(3);
      distributed.forEach((t) => {
        expect(t.taskId).toBe(mockTask.id);
        expect(mockTask.assignedAgents).toContain(t.agentId);
      });
    });

    it('should optimize task load', async () => {
      const tasks = [mockTask, { ...mockTask, id: 'task_2' }];
      const distribution = await taskDistribution.optimizeTaskLoad(
        tasks,
        mockTask.assignedAgents
      );

      expect(distribution.size).toBe(3);
    });

    it('should validate task assignment', async () => {
      const isValid = await taskDistribution.validateTaskAssignment(
        mockTask,
        mockTask.assignedAgents
      );

      expect(isValid).toBe(true);
    });

    it('should track task progress', async () => {
      const progress = await taskDistribution.trackTaskProgress(mockTask.id);

      expect(progress.taskId).toBe(mockTask.id);
      expect(progress.status).toBe('in_progress');
    });
  });

  describe('③ AI役割管理', () => {
    it('should manage agent roles', async () => {
      await expect(manager.manageAgentRoles(mockAgents)).resolves.toBeUndefined();
    });

    it('should validate agent roles', async () => {
      const isValid = validator.validateAgent(mockAgents[0]);
      expect(isValid).toBe(true);
    });

    it('should reject invalid agent', async () => {
      const invalidAgent: AIAgent = {
        id: '',
        name: '',
        type: 'reasoning',
        capabilities: [],
        status: 'active',
      };

      expect(() => manager.manageAgentRoles([invalidAgent])).rejects.toThrow();
    });
  });

  describe('④ 協調判断', () => {
    it('should execute collaborative decision', async () => {
      const decision = await manager.executeCollaborativeDecision(
        'Complex problem',
        mockAgents
      );

      expect(decision).toBeDefined();
      expect(decision.taskId).toBeDefined();
      expect(decision.consensus).toBeDefined();
      expect(decision.agentCount).toBeGreaterThan(0);
    });

    it('should have average confidence', async () => {
      const decision = await manager.executeCollaborativeDecision(
        'Problem',
        mockAgents
      );

      expect(decision.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(decision.averageConfidence).toBeLessThanOrEqual(1);
    });
  });

  describe('⑤ 合意形成', () => {
    it('should form consensus from responses', async () => {
      const responses = [
        { agentId: 'agent_1', response: { result: 'A' }, confidence: 0.9 },
        { agentId: 'agent_2', response: { result: 'A' }, confidence: 0.85 },
        { agentId: 'agent_3', response: { result: 'B' }, confidence: 0.6 },
      ];

      const consensus = await consensusService.formConsensus(responses);

      expect(consensus).toBeDefined();
      expect(consensus.consensus).toBeDefined();
    });

    it('should detect contradictions', async () => {
      const responses = [
        { agentId: 'agent_1', response: {}, confidence: 0.9 },
        { agentId: 'agent_2', response: {}, confidence: 0.2 },
      ];

      const contradictions = await consensusService.detectContradictions(responses);

      expect(Array.isArray(contradictions)).toBe(true);
    });

    it('should evaluate consensus quality', async () => {
      const responses = [
        { agentId: 'agent_1', response: {}, confidence: 0.9 },
        { agentId: 'agent_2', response: {}, confidence: 0.85 },
      ];

      const quality = await consensusService.evaluateConsensusQuality(responses);

      expect(quality).toBeGreaterThanOrEqual(0);
      expect(quality).toBeLessThanOrEqual(1);
    });

    it('should perform vote-based consensus', async () => {
      const responses = [
        { agentId: 'agent_1', response: { choice: 'A' }, confidence: 0.9 },
        { agentId: 'agent_2', response: { choice: 'A' }, confidence: 0.85 },
      ];

      const consensus = await consensusService.voteBasedConsensus(responses);

      expect(consensus.votes).toBeGreaterThan(0);
      expect(consensus.totalResponses).toBe(2);
    });

    it('should perform weighted consensus', async () => {
      const responses = [
        { agentId: 'agent_1', response: {}, confidence: 0.9 },
        { agentId: 'agent_2', response: {}, confidence: 0.8 },
      ];

      const consensus = await consensusService.weightedConsensus(responses);

      expect(consensus.totalWeight).toBeGreaterThan(0);
      expect(consensus.averageConfidence).toBeGreaterThan(0);
    });
  });

  describe('⑥ 複数AI結果統合', () => {
    it('should integrate results from multiple agents', async () => {
      const result = await manager.startCollaboration(mockTask);

      expect(result.finalRecommendation).toBeDefined();
      expect(result.finalRecommendation.length).toBeGreaterThan(0);
    });
  });

  describe('⑦ 協調履歴保存', () => {
    it('should save collaboration history', async () => {
      const result = await manager.startCollaboration(mockTask);

      const history = await manager.getCollaborationHistory(mockTask.id);

      expect(history.length).toBeGreaterThan(0);
    });

    it('should get history stats', async () => {
      await manager.startCollaboration(mockTask);

      const stats = await collaborationHistory.getHistoryStats(mockTask.id);

      expect(stats.totalCollaborations).toBeGreaterThan(0);
    });

    it('should get latest history', async () => {
      await manager.startCollaboration(mockTask);

      const latest = await collaborationHistory.getLatestHistory(mockTask.id, 5);

      expect(Array.isArray(latest)).toBe(true);
    });
  });

  describe('⑧ パフォーマンス評価', () => {
    it('should evaluate performance', async () => {
      const result = await manager.startCollaboration(mockTask);

      const performance = await manager.evaluatePerformance(result.id);

      expect(performance.resultId).toBe(result.id);
      expect(performance.agentCount).toBeGreaterThan(0);
      expect(performance.averageConfidence).toBeGreaterThanOrEqual(0);
    });

    it('should calculate consensus quality', async () => {
      const result = await manager.startCollaboration(mockTask);

      const performance = await manager.evaluatePerformance(result.id);

      expect(performance.consensusQuality).toBeGreaterThanOrEqual(0);
      expect(performance.consensusQuality).toBeLessThanOrEqual(1);
    });
  });

  describe('⑨ AuditManager連携', () => {
    it('should track collaboration in audit', async () => {
      const result = await manager.startCollaboration(mockTask);

      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('⑩ ApprovalManager連携', () => {
    it('should validate collaboration before approval', async () => {
      const isValid = validator.validateTask(mockTask);

      expect(isValid).toBe(true);
    });
  });

  describe('⑪ AgentAIManager連携', () => {
    it('should communicate with AgentAIManager', async () => {
      const response = await agentCommunication.communicateWithAgent('agent', 'Execute action');

      expect(response).toBeDefined();
    });
  });

  describe('⑫ ReasoningAIManager連携', () => {
    it('should communicate with ReasoningAIManager', async () => {
      const response = await agentCommunication.communicateWithAgent('reasoning', 'Analyze');

      expect(response.type).toBe('reasoning_response');
    });
  });

  describe('⑬ EvolutionAIManager連携', () => {
    it('should communicate with EvolutionAIManager', async () => {
      const response = await agentCommunication.communicateWithAgent('evolution', 'Improve');

      expect(response.type).toBe('evolution_response');
    });
  });

  describe('統合テスト', () => {
    it('should complete full collaboration workflow', async () => {
      const result = await manager.startCollaboration(mockTask);

      expect(result.status).toBe('completed');
      expect(result.agentResponses.length).toBeGreaterThan(0);
      expect(result.consensus).toBeDefined();
    });

    it('should handle collaboration cancellation', async () => {
      const result = await manager.startCollaboration(mockTask);

      await expect(manager.cancelCollaboration(result.id)).resolves.toBeUndefined();
    });

    it('should get collaboration statistics', async () => {
      await manager.startCollaboration(mockTask);

      const stats = await manager.getCollaborationStats();

      expect(stats).toBeDefined();
      expect(stats.totalResults).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple concurrent collaborations', async () => {
      const tasks = [
        mockTask,
        { ...mockTask, id: 'task_2' },
        { ...mockTask, id: 'task_3' },
      ];

      const results = await Promise.all(tasks.map((t) => manager.startCollaboration(t)));

      expect(results).toHaveLength(3);
      results.forEach((r) => expect(r.status).toBe('completed'));
    });

    it('should maintain collaboration history across multiple runs', async () => {
      await manager.startCollaboration(mockTask);
      await manager.startCollaboration(mockTask);

      const history = await manager.getCollaborationHistory(mockTask.id);

      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should validate all components', async () => {
      expect(validator.validateAgentList(mockAgents)).toBe(true);
      expect(validator.validateTask(mockTask)).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle invalid task', async () => {
      const invalidTask: CollaborationTask = {
        id: '',
        description: '',
        priority: 15,
        assignedAgents: [],
        status: 'pending',
        results: [],
      };

      await expect(manager.startCollaboration(invalidTask)).rejects.toThrow();
    });

    it('should handle missing collaboration result', async () => {
      await expect(manager.evaluatePerformance('nonexistent_id')).rejects.toThrow();
    });
  });

  describe('追加テスト - 機能拡張', () => {
    it('should validate agent capabilities', () => {
      const agent: AIAgent = {
        id: 'test_1',
        name: 'Test Agent',
        type: 'reasoning',
        capabilities: ['analysis', 'logic'],
        status: 'active',
      };

      expect(validator.validateAgent(agent)).toBe(true);
    });

    it('should reject agent with empty capabilities', () => {
      const agent: AIAgent = {
        id: 'test_1',
        name: 'Test Agent',
        type: 'reasoning',
        capabilities: [],
        status: 'active',
      };

      const isValid = validator.validateAgent(agent);
      expect(isValid).toBe(false);
    });

    it('should validate task priority range', () => {
      const validTask: CollaborationTask = {
        id: 'task_valid',
        description: 'Valid task',
        priority: 5,
        assignedAgents: ['agent_1'],
        status: 'pending',
        results: [],
      };

      expect(validator.validateTask(validTask)).toBe(true);
    });

    it('should reject task with invalid priority', () => {
      const invalidTask: CollaborationTask = {
        id: 'task_invalid',
        description: 'Invalid task',
        priority: 20,
        assignedAgents: ['agent_1'],
        status: 'pending',
        results: [],
      };

      const isValid = validator.validateTask(invalidTask);
      expect(isValid).toBe(false);
    });

    it('should validate agent list', () => {
      expect(validator.validateAgentList(mockAgents)).toBe(true);
    });

    it('should reject empty agent list', () => {
      const isValid = validator.validateAgentList([]);
      expect(isValid).toBe(false);
    });

    it('should handle repository statistics', async () => {
      const result = await manager.startCollaboration(mockTask);
      const stats = await repository.getCollaborationStats();

      expect(stats.totalResults).toBeGreaterThan(0);
      expect(stats.completedResults).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
    });

    it('should filter collaboration results', async () => {
      await manager.startCollaboration(mockTask);

      const filtered = await repository.filterResults(
        (r) => r.status === 'completed'
      );

      expect(Array.isArray(filtered)).toBe(true);
    });

    it('should update collaboration results', async () => {
      const result = await manager.startCollaboration(mockTask);

      await repository.updateCollaborationResult(result.id, {
        status: 'archived',
      });

      const updated = await repository.getCollaborationResult(result.id);
      expect(updated?.status).toBe('archived');
    });

    it('should handle workflow creation', async () => {
      const workflow = await collaborationService.createWorkflow(
        mockAgents,
        ['step1', 'step2']
      );

      expect(workflow.id).toBeDefined();
      expect(workflow.agents).toHaveLength(3);
    });

    it('should advance workflow status', async () => {
      const workflow = await collaborationService.createWorkflow(
        mockAgents,
        ['step1', 'step2']
      );

      await collaborationService.advanceWorkflow(workflow.id);

      const updated = await collaborationService.getWorkflowStatus(workflow.id);
      expect(updated?.status).toBe('in_progress');
    });

    it('should get workflow statistics', async () => {
      await collaborationService.createWorkflow(mockAgents, ['step1']);

      const stats = await collaborationService.getWorkflowStats();

      expect(stats.totalWorkflows).toBeGreaterThan(0);
    });

    it('should handle task distribution with load balancing', async () => {
      const tasks = [
        mockTask,
        { ...mockTask, id: 'task_2' },
        { ...mockTask, id: 'task_3' },
      ];

      const distribution = await taskDistribution.optimizeTaskLoad(
        tasks,
        mockTask.assignedAgents
      );

      expect(distribution.size).toBeGreaterThan(0);
    });

    it('should detect consensus contradictions', async () => {
      const responses = [
        { agentId: 'agent_1', response: { choice: 'A' }, confidence: 0.9 },
        { agentId: 'agent_2', response: { choice: 'B' }, confidence: 0.1 },
      ];

      const contradictions = await consensusService.detectContradictions(
        responses
      );

      expect(Array.isArray(contradictions)).toBe(true);
    });

    it('should save and retrieve collaboration history', async () => {
      const result = await manager.startCollaboration(mockTask);

      const history = await collaborationHistory.getLatestHistory(
        mockTask.id,
        10
      );

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should clear repository', async () => {
      await manager.startCollaboration(mockTask);
      await repository.clear();

      const allResults = await repository.getAllResults();
      expect(allResults).toHaveLength(0);
    });

    it('should handle old results deletion', async () => {
      const result = await manager.startCollaboration(mockTask);
      const deletedCount = await repository.deleteOldResults(0);

      expect(deletedCount).toBeGreaterThanOrEqual(0);
    });

    it('should get all workflows', async () => {
      await collaborationService.createWorkflow(mockAgents, ['step1']);
      await collaborationService.createWorkflow(mockAgents, ['step1']);

      const workflows = await collaborationService.getAllWorkflows();

      expect(Array.isArray(workflows)).toBe(true);
      expect(workflows.length).toBeGreaterThanOrEqual(2);
    });

    it('should delete workflow', async () => {
      const workflow = await collaborationService.createWorkflow(
        mockAgents,
        ['step1']
      );
      await collaborationService.deleteWorkflow(workflow.id);

      const deleted = await collaborationService.getWorkflowStatus(workflow.id);
      expect(deleted).toBeNull();
    });

    it('should get communication stats', async () => {
      await agentCommunication.communicateWithAgent('reasoning', 'Test');

      const stats = await agentCommunication.getCommunicationStats();

      expect(stats.totalMessages).toBeGreaterThan(0);
    });

    it('should clear message queue', async () => {
      await agentCommunication.communicateWithAgent('reasoning', 'Test');
      await agentCommunication.clearMessageQueue();

      const pending = await agentCommunication.getPendingMessages();
      expect(pending).toHaveLength(0);
    });
  });
});
