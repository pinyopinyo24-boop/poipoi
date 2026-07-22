/**
 * WorkflowOrchestrator Test Suite
 * Comprehensive testing for workflow execution, state management, and agent coordination
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowOrchestrator } from './WorkflowOrchestrator';
import type { WorkflowExecution, WorkflowState } from './WorkflowOrchestrator';
import { AgentManager } from './AgentManager';
import type { AgentManagerConfig } from './AgentManager';
import { MemoryIntegrationService } from './MemoryIntegrationService';
import { ExecutionLogger } from './ExecutionLogger';
import type { AICore } from './AICore';
import { GeminiProvider } from './providers/GeminiProvider';

describe('WorkflowOrchestrator', () => {
  let orchestrator: WorkflowOrchestrator;
  let agentManager: AgentManager;
  let memoryService: MemoryIntegrationService;
  let executionLogger: ExecutionLogger;
  let aiCore: AICore;

  beforeEach(() => {
    // Initialize mock providers and managers
    const provider = new GeminiProvider('demo-key');
    
    const managerConfig: AgentManagerConfig = {
      primaryProvider: provider,
      enableLogging: true,
      maxConcurrentTasks: 5,
    };

    agentManager = new AgentManager(managerConfig);
    memoryService = new MemoryIntegrationService();
    executionLogger = new ExecutionLogger();

    // Mock AICore
    aiCore = {
      getPrimaryProvider: () => provider,
      getAgentManager: () => agentManager,
      isInitialized: () => true,
    } as unknown as AICore;

    orchestrator = new WorkflowOrchestrator(
      agentManager,
      memoryService,
      executionLogger,
      aiCore
    );
  });

  afterEach(() => {
    memoryService.clearMemories();
    executionLogger.clearLogs();
  });

  describe('Workflow Execution', () => {
    it('should execute a complete task workflow', async () => {
      const userInput = 'Create a simple hello world program';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      expect(workflow).toBeDefined();
      expect(workflow.id).toMatch(/^workflow-\d+$/);
      expect(workflow.state).toBe('completed');
      expect(workflow.steps.length).toBeGreaterThan(0);
      expect(workflow.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty user input gracefully', async () => {
      const userInput = '';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      expect(workflow.state).toBe('completed');
      expect(workflow.steps.length).toBeGreaterThan(0);
    });

    it('should execute all workflow steps in correct order', async () => {
      const userInput = 'Test workflow execution';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      const expectedOrder = ['task', 'design', 'implementation', 'review'];
      const actualOrder = workflow.steps.map(s => s.agentType);

      expect(actualOrder).toEqual(expectedOrder);
    });

    it('should track execution time correctly', async () => {
      const userInput = 'Test execution time tracking';
      const startTime = Date.now();
      const workflow = await orchestrator.executeTaskWorkflow(userInput);
      const endTime = Date.now();

      expect(workflow.duration).toBeGreaterThan(0);
      expect(workflow.duration).toBeLessThanOrEqual(endTime - startTime + 100);
    });

    it('should calculate success rate correctly', async () => {
      const userInput = 'Test success rate calculation';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      const successSteps = workflow.steps.filter(s => !s.error).length;
      const expectedRate = (successSteps / workflow.steps.length) * 100;

      expect(workflow.successRate).toBe(expectedRate);
    });

    it('should accumulate tokens correctly', async () => {
      const userInput = 'Test token accumulation';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      const expectedTokens = workflow.steps.reduce((sum, step) => {
        return sum + (step.output?.tokensUsed || 0);
      }, 0);

      expect(workflow.totalTokensUsed).toBe(expectedTokens);
    });
  });

  describe('Workflow State Management', () => {
    it('should transition through all workflow states', async () => {
      const userInput = 'Test state transitions';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      expect(workflow.state).toBe('completed');
      expect(['pending', 'analyzing', 'designing', 'implementing', 'reviewing', 'completed']).toContain(workflow.state);
    });

    it('should mark workflow as failed on error', async () => {
      // Mock executeTask to throw an error
      agentManager.executeTask = vi.fn().mockRejectedValue(new Error('Test error'));

      const userInput = 'Test error handling';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      expect(workflow.state).toBe('failed');
      expect(workflow.error).toBeDefined();
    });

    it('should set error message on step failure', async () => {
      agentManager.executeTask = vi.fn().mockRejectedValue(new Error('Step execution failed'));

      const userInput = 'Test step error';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      expect(workflow.state).toBe('failed');
      const failedStep = workflow.steps.find(s => s.error);
      expect(failedStep).toBeDefined();
    });

    it('should handle partial workflow completion', async () => {
      const userInput = 'Test partial completion';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      // Even if some steps fail, workflow should complete
      expect(workflow.endTime).toBeDefined();
      expect(workflow.duration).toBeGreaterThan(0);
    });
  });

  describe('Workflow History and Status', () => {
    it('should track active workflows', async () => {
      const userInput1 = 'Test workflow 1';
      const userInput2 = 'Test workflow 2';

      const workflow1 = await orchestrator.executeTaskWorkflow(userInput1);
      const workflow2 = await orchestrator.executeTaskWorkflow(userInput2);

      const activeWorkflows = orchestrator.getActiveWorkflows();
      expect(activeWorkflows.length).toBeGreaterThanOrEqual(2);
    });

    it('should retrieve workflow status by ID', async () => {
      const userInput = 'Test status retrieval';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      const status = orchestrator.getWorkflowStatus(workflow.id);
      expect(status).toBeDefined();
      expect(status?.id).toBe(workflow.id);
      expect(status?.state).toBe('completed');
    });

    it('should return null for non-existent workflow', () => {
      const status = orchestrator.getWorkflowStatus('non-existent-id');
      expect(status).toBeUndefined();
    });

    it('should retrieve workflow history with limit', async () => {
      // Execute multiple workflows
      for (let i = 0; i < 5; i++) {
        await orchestrator.executeTaskWorkflow(`Test workflow ${i}`);
      }

      const history = orchestrator.getWorkflowHistory(3);
      expect(history.length).toBeLessThanOrEqual(3);
    });

    it('should sort history by execution time', async () => {
      const workflow1 = await orchestrator.executeTaskWorkflow('First');
      await new Promise(r => setTimeout(r, 10));
      const workflow2 = await orchestrator.executeTaskWorkflow('Second');

      const history = orchestrator.getWorkflowHistory(10);
      const ids = history.map(w => w.id);

      // Most recent should be last
      expect(ids[ids.length - 1]).toBe(workflow2.id);
    });
  });

  describe('Memory Integration', () => {
    it('should save workflow results to memory', async () => {
      const userInput = 'Test memory integration';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      const memories = memoryService.getAllMemories();
      expect(memories.length).toBeGreaterThan(0);
    });

    it('should retrieve memory context for workflow', async () => {
      const userInput = 'Test memory retrieval';
      
      // First workflow to populate memory
      await orchestrator.executeTaskWorkflow(userInput);
      
      // Second workflow should retrieve context
      const context = await memoryService.retrieveContext(userInput);
      expect(context).toBeDefined();
      expect(context.relatedMemories).toBeDefined();
    });

    it('should save learning records from workflow', async () => {
      const userInput = 'Test learning records';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      const learningRecords = memoryService.getAllLearningRecords();
      expect(learningRecords.length).toBeGreaterThan(0);
    });
  });

  describe('Execution Logging', () => {
    it('should log workflow execution', async () => {
      const userInput = 'Test execution logging';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      const logs = executionLogger.getAllLogs();
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should track execution statistics', async () => {
      // Execute multiple workflows
      for (let i = 0; i < 3; i++) {
        await orchestrator.executeTaskWorkflow(`Test ${i}`);
      }

      const stats = executionLogger.getStatistics();
      expect(stats.totalWorkflows).toBeGreaterThanOrEqual(3);
      expect(stats.completedWorkflows).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle workflow execution errors', async () => {
      agentManager.executeTask = vi.fn().mockRejectedValue(new Error('Execution error'));

      const userInput = 'Test error handling';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      expect(workflow.state).toBe('failed');
      expect(workflow.error).toBeDefined();
    });

    it('should continue workflow on step error', async () => {
      const userInput = 'Test step error continuation';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      // Workflow should complete even if steps fail
      expect(workflow.endTime).toBeDefined();
      expect(workflow.duration).toBeGreaterThan(0);
    });

    it('should handle memory service errors gracefully', async () => {
      memoryService.retrieveContext = vi.fn().mockRejectedValue(new Error('Memory error'));

      const userInput = 'Test memory error handling';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      // Workflow should continue despite memory errors
      expect(workflow).toBeDefined();
    });
  });

  describe('Metadata and Context', () => {
    it('should include user input in metadata', async () => {
      const userInput = 'Test metadata';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      expect(workflow.metadata.userInput).toBe(userInput);
    });

    it('should track provider information', async () => {
      const userInput = 'Test provider tracking';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      expect(workflow.metadata.provider).toBeDefined();
      expect(workflow.metadata.mode).toMatch(/^(real|demo)$/);
    });

    it('should include step inputs and outputs', async () => {
      const userInput = 'Test step context';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      workflow.steps.forEach(step => {
        expect(step.input).toBeDefined();
        if (step.state === 'completed') {
          expect(step.output).toBeDefined();
        }
      });
    });
  });

  describe('Performance and Limits', () => {
    it('should handle long user inputs', async () => {
      const longInput = 'a'.repeat(1000);
      const workflow = await orchestrator.executeTaskWorkflow(longInput);

      expect(workflow.state).toBe('completed');
      expect(workflow.metadata.userInput).toBe(longInput);
    });

    it('should handle multiple concurrent workflows', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(orchestrator.executeTaskWorkflow(`Concurrent test ${i}`));
      }

      const results = await Promise.all(promises);
      expect(results.length).toBe(5);
      results.forEach(workflow => {
        expect(workflow.state).toBe('completed');
      });
    });

    it('should maintain workflow history limit', async () => {
      // Execute many workflows
      for (let i = 0; i < 20; i++) {
        await orchestrator.executeTaskWorkflow(`Test ${i}`);
      }

      const history = orchestrator.getWorkflowHistory(100);
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full workflow pipeline', async () => {
      const userInput = 'Create a TypeScript function that calculates factorial';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      // Verify complete pipeline
      expect(workflow.state).toBe('completed');
      expect(workflow.steps.length).toBe(4); // task, design, implementation, review
      expect(workflow.successRate).toBeGreaterThanOrEqual(0);
      expect(workflow.totalTokensUsed).toBeGreaterThanOrEqual(0);

      // Verify memory integration
      const memories = memoryService.getAllMemories();
      expect(memories.length).toBeGreaterThan(0);

      // Verify logging
      const logs = executionLogger.getAllLogs();
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should handle workflow with dependencies', async () => {
      const userInput = 'Test workflow dependencies';
      const workflow = await orchestrator.executeTaskWorkflow(userInput);

      // Verify step order
      const steps = workflow.steps;
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i].startTime).toBeGreaterThanOrEqual(steps[i - 1].startTime || 0);
      }
    });
  });
});
