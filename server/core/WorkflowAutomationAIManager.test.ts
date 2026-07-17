/**
 * WorkflowAutomationAIManager Tests - 50+テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowAutomationAIManager } from './WorkflowAutomationAIManager';

describe('WorkflowAutomationAIManager', () => {
  let manager: WorkflowAutomationAIManager;

  beforeEach(() => {
    manager = new WorkflowAutomationAIManager();
  });

  // ===== ワークフロー生成テスト (5個) =====
  describe('Workflow Generation', () => {
    it('should generate workflow from request', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'データを取得して処理して保存してください'
      );
      expect(workflow).toBeDefined();
      expect(workflow?.steps.length).toBeGreaterThan(0);
    });

    it('should extract workflow name from request', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'データ処理ワークフローを実行'
      );
      expect(workflow?.name).toBeDefined();
      expect(workflow?.name.length).toBeGreaterThan(0);
    });

    it('should determine priority from request', async () => {
      const highPriorityWf = await manager.generateWorkflowFromRequest(
        'user-1',
        '緊急でデータを処理してください'
      );
      expect(highPriorityWf?.priority).toBe('high');

      const lowPriorityWf = await manager.generateWorkflowFromRequest(
        'user-1',
        'データを処理してください'
      );
      expect(lowPriorityWf?.priority).toBeDefined();
    });

    it('should handle empty request', async () => {
      const workflow = await manager.generateWorkflowFromRequest('user-1', '');
      // Empty request generates default workflow
      expect(workflow).toBeDefined();
    });

    it('should create workflow with default steps', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'テスト'
      );
      expect(workflow?.steps.length).toBeGreaterThan(0);
    });
  });

  // ===== ワークフロー実行テスト (5個) =====
  describe('Workflow Execution', () => {
    it('should execute workflow', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'データを取得して処理してください'
      );
      if (!workflow) return;

      const result = await manager.executeWorkflow(workflow.id);
      expect(result).toBe(true);
    });

    it('should update workflow status during execution', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'データを処理してください'
      );
      if (!workflow) return;

      await manager.executeWorkflow(workflow.id);
      const updated = await manager.getWorkflow(workflow.id);
      expect(updated?.status).toBe('completed');
    });

    it('should record execution history', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'データを処理してください'
      );
      if (!workflow) return;

      await manager.executeWorkflow(workflow.id);
      const history = await manager.getExecutionHistory(workflow.id);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should handle non-existent workflow', async () => {
      const result = await manager.executeWorkflow('non-existent');
      expect(result).toBe(false);
    });

    it('should set timestamps during execution', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'データを処理してください'
      );
      if (!workflow) return;

      await manager.executeWorkflow(workflow.id);
      const updated = await manager.getWorkflow(workflow.id);
      expect(updated?.startedAt).toBeDefined();
      expect(updated?.completedAt).toBeDefined();
    });
  });

  // ===== テンプレート管理テスト (5個) =====
  describe('Template Management', () => {
    it('should create template', async () => {
      const template = await manager.createTemplate(
        'データ処理テンプレート',
        'データを処理するテンプレート',
        'data_processing',
        []
      );
      expect(template).toBeDefined();
      expect(template.name).toBe('データ処理テンプレート');
    });

    it('should get templates by category', async () => {
      await manager.createTemplate(
        'テンプレート1',
        '説明1',
        'category1',
        []
      );
      await manager.createTemplate(
        'テンプレート2',
        '説明2',
        'category2',
        []
      );

      const templates = await manager.getTemplates('category1');
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should get all templates', async () => {
      await manager.createTemplate('テンプレート1', '説明1', 'cat1', []);
      const templates = await manager.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should create workflow from template', async () => {
      const template = await manager.createTemplate(
        'テンプレート',
        '説明',
        'category',
        []
      );

      const workflow = await manager.createWorkflowFromTemplate(
        'user-1',
        template.id
      );
      expect(workflow).toBeDefined();
      expect(workflow?.name).toBe('テンプレート');
    });

    it('should handle non-existent template', async () => {
      const workflow = await manager.createWorkflowFromTemplate(
        'user-1',
        'non-existent'
      );
      expect(workflow).toBeNull();
    });
  });

  // ===== ワークフロー取得テスト (3個) =====
  describe('Workflow Retrieval', () => {
    it('should get workflow by id', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'データを処理してください'
      );
      if (!workflow) return;

      const retrieved = await manager.getWorkflow(workflow.id);
      expect(retrieved?.id).toBe(workflow.id);
    });

    it('should get user workflows', async () => {
      await manager.generateWorkflowFromRequest('user-1', 'ワークフロー1');
      await manager.generateWorkflowFromRequest('user-1', 'ワークフロー2');

      const workflows = await manager.getUserWorkflows('user-1');
      expect(workflows.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty list for non-existent user', async () => {
      const workflows = await manager.getUserWorkflows('non-existent-user');
      expect(workflows.length).toBe(0);
    });
  });

  // ===== ロールバック機能テスト (3個) =====
  describe('Rollback Functionality', () => {
    it('should rollback workflow', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'データを処理してください'
      );
      if (!workflow) return;

      await manager.executeWorkflow(workflow.id);
      const result = await manager.rollbackWorkflow(workflow.id);
      expect(result).toBe(true);
    });

    it('should update status to rolled_back', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'データを処理してください'
      );
      if (!workflow) return;

      await manager.executeWorkflow(workflow.id);
      await manager.rollbackWorkflow(workflow.id);
      const updated = await manager.getWorkflow(workflow.id);
      expect(updated?.status).toBe('rolled_back');
    });

    it('should handle non-existent workflow rollback', async () => {
      const result = await manager.rollbackWorkflow('non-existent');
      expect(result).toBe(false);
    });
  });

  // ===== 条件分岐テスト (3個) =====
  describe('Conditional Branching', () => {
    it('should evaluate condition', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'データを処理してください'
      );
      if (!workflow) return;

      const condition = {
        id: 'cond-1',
        type: 'if' as const,
        condition: 'true',
        trueSteps: ['step-1'],
        falseSteps: ['step-2'],
        timestamp: Date.now(),
      };

      const steps = await manager.evaluateCondition(workflow, condition);
      expect(steps).toBeDefined();
    });

    it('should handle if_else condition', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'テスト'
      );
      if (!workflow) return;

      const condition = {
        id: 'cond-1',
        type: 'if_else' as const,
        condition: 'test',
        trueSteps: ['step-1'],
        falseSteps: ['step-2'],
        timestamp: Date.now(),
      };

      const steps = await manager.evaluateCondition(workflow, condition);
      expect(Array.isArray(steps)).toBe(true);
    });

    it('should handle switch condition', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'テスト'
      );
      if (!workflow) return;

      const condition = {
        id: 'cond-1',
        type: 'switch' as const,
        condition: 'test',
        trueSteps: ['step-1', 'step-2'],
        timestamp: Date.now(),
      };

      const steps = await manager.evaluateCondition(workflow, condition);
      expect(Array.isArray(steps)).toBe(true);
    });
  });

  // ===== 実行履歴テスト (2個) =====
  describe('Execution History', () => {
    it('should record execution history', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'データを処理してください'
      );
      if (!workflow) return;

      await manager.executeWorkflow(workflow.id);
      const history = await manager.getExecutionHistory(workflow.id);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should maintain execution history limit', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'テスト'
      );
      if (!workflow) return;

      for (let i = 0; i < 150; i++) {
        await manager.executeWorkflow(workflow.id);
      }

      const history = await manager.getExecutionHistory(workflow.id);
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  // ===== ワークフロー検証テスト (3個) =====
  describe('Workflow Validation', () => {
    it('should validate workflow', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'データを処理してください'
      );
      if (!workflow) return;

      const validation = await manager.validateWorkflow(workflow);
      expect(validation.valid).toBe(true);
    });

    it('should detect missing workflow name', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'テスト'
      );
      if (!workflow) return;

      workflow.name = '';
      const validation = await manager.validateWorkflow(workflow);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should detect missing steps', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'テスト'
      );
      if (!workflow) return;

      workflow.steps = [];
      const validation = await manager.validateWorkflow(workflow);
      expect(validation.valid).toBe(false);
    });
  });

  // ===== 統計テスト (2個) =====
  describe('Statistics', () => {
    it('should get statistics', async () => {
      await manager.generateWorkflowFromRequest('user-1', 'ワークフロー1');
      const stats = manager.getStatistics();
      expect(stats.totalWorkflows).toBeGreaterThan(0);
    });

    it('should calculate success rate', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'テスト'
      );
      if (!workflow) return;

      await manager.executeWorkflow(workflow.id);
      const stats = manager.getStatistics();
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
    });
  });

  // ===== 並列実行テスト (2個) =====
  describe('Parallel Execution', () => {
    it('should execute workflows in parallel', async () => {
      const wf1 = await manager.generateWorkflowFromRequest('user-1', 'ワークフロー1');
      const wf2 = await manager.generateWorkflowFromRequest('user-1', 'ワークフロー2');

      if (!wf1 || !wf2) return;

      const results = await manager.executeWorkflowsInParallel([wf1.id, wf2.id]);
      expect(results.length).toBe(2);
    });

    it('should handle mixed results in parallel execution', async () => {
      const wf1 = await manager.generateWorkflowFromRequest('user-1', 'ワークフロー1');
      const wf2 = await manager.generateWorkflowFromRequest('user-1', 'ワークフロー2');

      if (!wf1 || !wf2) return;

      const results = await manager.executeWorkflowsInParallel([wf1.id, wf2.id]);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  // ===== ワークフロー削除テスト (2個) =====
  describe('Workflow Deletion', () => {
    it('should delete workflow', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'テスト'
      );
      if (!workflow) return;

      const result = await manager.deleteWorkflow(workflow.id);
      expect(result).toBe(true);
    });

    it('should not delete running workflow', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'テスト'
      );
      if (!workflow) return;

      workflow.status = 'running';
      const result = await manager.deleteWorkflow(workflow.id);
      expect(result).toBe(false);
    });
  });

  // ===== テンプレート削除テスト (1個) =====
  describe('Template Deletion', () => {
    it('should delete template', async () => {
      const template = await manager.createTemplate(
        'テンプレート',
        '説明',
        'category',
        []
      );

      const result = await manager.deleteTemplate(template.id);
      expect(result).toBe(true);
    });
  });

  // ===== 実行時間計算テスト (2個) =====
  describe('Execution Time Calculation', () => {
    it('should calculate execution time', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'テスト'
      );
      if (!workflow) return;

      await manager.executeWorkflow(workflow.id);
      const time = await manager.calculateExecutionTime(workflow.id);
      expect(time).toBeGreaterThanOrEqual(0);
    });

    it('should return null for incomplete workflow', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'テスト'
      );
      if (!workflow) return;

      const time = await manager.calculateExecutionTime(workflow.id);
      expect(time).toBeNull();
    });
  });

  // ===== ステップ成功率テスト (1個) =====
  describe('Step Success Rate', () => {
    it('should calculate step success rate', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'テスト'
      );
      if (!workflow) return;

      await manager.executeWorkflow(workflow.id);
      const rate = await manager.calculateStepSuccessRate(workflow.id);
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });
  });

  // ===== アクション分析テスト (2個) =====
  describe('Action Analysis', () => {
    it('should get frequent actions', async () => {
      await manager.generateWorkflowFromRequest('user-1', 'データを処理してください');
      const actions = manager.getFrequentActions();
      expect(typeof actions).toBe('object');
    });

    it('should generate workflow recommendations', async () => {
      await manager.generateWorkflowFromRequest('user-1', 'データを処理してください');
      const recommendations = await manager.generateWorkflowRecommendations('user-1');
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  // ===== キュー処理テスト (2個) =====
  describe('Queue Processing', () => {
    it('should process workflow queue', async () => {
      await manager.generateWorkflowFromRequest('user-1', 'ワークフロー1');
      await manager.generateWorkflowFromRequest('user-1', 'ワークフロー2');

      await manager.processWorkflowQueue();
      const stats = manager.getStatistics();
      expect(stats.queueLength).toBe(0);
    });

    it('should handle empty queue', async () => {
      await expect(manager.processWorkflowQueue()).resolves.toBeUndefined();
    });
  });

  // ===== 境界値テスト (3個) =====
  describe('Boundary Value Tests', () => {
    it('should handle very long workflow name', async () => {
      const longName = 'a'.repeat(1000);
      const workflow = await manager.generateWorkflowFromRequest('user-1', longName);
      expect(workflow).toBeDefined();
    });

    it('should handle many steps', async () => {
      const request = 'データを処理して保存して通知して '.repeat(50);
      const workflow = await manager.generateWorkflowFromRequest('user-1', request);
      expect(workflow?.steps.length).toBeGreaterThan(0);
    });

    it('should handle special characters in request', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'データ@#$%を処理してください'
      );
      expect(workflow).toBeDefined();
    });
  });

  // ===== 統合テスト (3個) =====
  describe('Integration Tests', () => {
    it('should complete full workflow lifecycle', async () => {
      const workflow = await manager.generateWorkflowFromRequest(
        'user-1',
        'データを取得して処理してください'
      );
      if (!workflow) return;

      expect(workflow.status).toBe('pending');

      const executed = await manager.executeWorkflow(workflow.id);
      expect(executed).toBe(true);

      const updated = await manager.getWorkflow(workflow.id);
      expect(updated?.status).toBe('completed');

      const history = await manager.getExecutionHistory(workflow.id);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should handle template-based workflow execution', async () => {
      const template = await manager.createTemplate(
        'テンプレート',
        '説明',
        'category',
        []
      );

      const workflow = await manager.createWorkflowFromTemplate(
        'user-1',
        template.id
      );
      if (!workflow) return;

      const result = await manager.executeWorkflow(workflow.id);
      expect(result).toBe(true);
    });

    it('should handle multiple users workflows', async () => {
      await manager.generateWorkflowFromRequest('user-1', 'ワークフロー1');
      await manager.generateWorkflowFromRequest('user-2', 'ワークフロー2');

      const user1Wfs = await manager.getUserWorkflows('user-1');
      const user2Wfs = await manager.getUserWorkflows('user-2');

      expect(user1Wfs.length).toBeGreaterThan(0);
      expect(user2Wfs.length).toBeGreaterThan(0);
    });
  });

  // ===== パフォーマンステスト (2個) =====
  describe('Performance Tests', () => {
    it('should handle 100 workflow generations efficiently', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        await manager.generateWorkflowFromRequest('user-1', `ワークフロー${i}`);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000);
    });

    it('should handle 50 concurrent executions', async () => {
      const workflows = [];
      for (let i = 0; i < 50; i++) {
        const wf = await manager.generateWorkflowFromRequest('user-1', `ワークフロー${i}`);
        if (wf) workflows.push(wf.id);
      }

      const startTime = Date.now();
      await manager.executeWorkflowsInParallel(workflows);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(30000);
    });
  });
});
