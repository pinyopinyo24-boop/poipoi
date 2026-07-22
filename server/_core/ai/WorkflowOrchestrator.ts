/**
 * Workflow Orchestrator - Manages multi-agent workflow execution
 * Coordinates task flow through multiple agents with state management
 */

import { AgentManager } from './AgentManager';
import { MemoryIntegrationService } from './MemoryIntegrationService';
import { ExecutionLogger } from './ExecutionLogger';
import { AICore } from './AICore';
import { AgentType } from './agents/BaseAgent';

export type WorkflowState = 'pending' | 'analyzing' | 'designing' | 'implementing' | 'reviewing' | 'completed' | 'failed';

export interface WorkflowStep {
  id: string;
  agentType: AgentType;
  state: WorkflowState;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
}

export interface WorkflowExecution {
  id: string;
  state: WorkflowState;
  steps: WorkflowStep[];
  startTime: number;
  endTime?: number;
  duration?: number;
  totalTokensUsed: number;
  successRate: number;
  error?: string;
  metadata: {
    userInput: string;
    provider: string;
    mode: 'real' | 'demo';
  };
}

/**
 * WorkflowOrchestrator - Orchestrates multi-agent workflow execution
 */
export class WorkflowOrchestrator {
  private workflows: Map<string, WorkflowExecution> = new Map();
  private workflowHistory: WorkflowExecution[] = [];
  private activeWorkflows: Set<string> = new Set();

  constructor(
    private agentManager: AgentManager,
    private memoryService: MemoryIntegrationService,
    private executionLogger: ExecutionLogger,
    private aiCore: AICore
  ) {}

  /**
   * Execute task workflow
   * Main workflow: Task -> Design -> Implementation -> Review
   */
  async executeTaskWorkflow(userInput: string): Promise<WorkflowExecution> {
    const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const workflow: WorkflowExecution = {
      id: workflowId,
      state: 'pending',
      steps: [],
      startTime,
      totalTokensUsed: 0,
      successRate: 0,
      metadata: {
        userInput,
        provider: this.aiCore.getPrimaryProvider()?.constructor.name || 'unknown',
        mode: process.env.DEMO_MODE === 'true' ? 'demo' : 'real',
      },
    };

    this.workflows.set(workflowId, workflow);
    this.activeWorkflows.add(workflowId);

    try {
      // Step 1: Task Analysis
      workflow.state = 'analyzing';
      const taskStep = await this.executeStep(workflow, 'task', userInput, {
        userInput,
      });
      workflow.steps.push(taskStep);

      // Step 2: Design Generation
      workflow.state = 'designing';
      const designStep = await this.executeStep(workflow, 'design', userInput, {
        userInput,
        taskAnalysis: taskStep.output,
      });
      workflow.steps.push(designStep);

      // Step 3: Implementation
      workflow.state = 'implementing';
      const implementationStep = await this.executeStep(
        workflow,
        'implementation',
        userInput,
        {
          userInput,
          design: designStep.output,
        }
      );
      workflow.steps.push(implementationStep);

      // Step 4: Review
      workflow.state = 'reviewing';
      const reviewStep = await this.executeStep(workflow, 'review', userInput, {
        userInput,
        implementation: implementationStep.output,
      });
      workflow.steps.push(reviewStep);

      // Calculate final metrics
      workflow.state = 'completed';
      workflow.endTime = Date.now();
      workflow.duration = workflow.endTime - startTime;

      const successSteps = workflow.steps.filter(s => !s.error).length;
      workflow.successRate = (successSteps / workflow.steps.length) * 100;

      workflow.totalTokensUsed = workflow.steps.reduce((sum, step) => {
        return sum + (step.output?.tokensUsed || 0);
      }, 0);

      // Save to memory and logs
      try {
        console.log(`[WorkflowOrchestrator] Workflow ${workflow.id} completed with ${workflow.successRate}% success rate`);
      } catch (e) {
        console.error('[WorkflowOrchestrator] Failed to log workflow execution:', e);
      }

      this.workflowHistory.push(workflow);
      if (this.workflowHistory.length > 100) {
        this.workflowHistory.shift();
      }
    } catch (error) {
      workflow.state = 'failed';
      workflow.error = error instanceof Error ? error.message : 'Unknown error';
      workflow.endTime = Date.now();
      workflow.duration = workflow.endTime - startTime;

      console.error(`[WorkflowOrchestrator] Workflow ${workflowId} failed:`, error);
    } finally {
      this.activeWorkflows.delete(workflowId);
    }

    return workflow;
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    workflow: WorkflowExecution,
    agentType: AgentType,
    userInput: string,
    input: Record<string, any>
  ): Promise<WorkflowStep> {
    const stepId = `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const step: WorkflowStep = {
      id: stepId,
      agentType,
      state: 'pending',
      input,
    };

    try {
      step.state = 'analyzing';

      // Get agent from manager
      const agent = this.agentManager.getAgent(agentType);
      if (!agent) {
        throw new Error(`Agent ${agentType} not found`);
      }

      // Execute agent task
      const result = await this.agentManager.executeTask(agentType, userInput, input);

      step.state = 'completed';
      step.output = result.output;
      step.output.tokensUsed = result.tokensUsed || 0;
    } catch (error) {
      step.state = 'failed';
      step.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[WorkflowOrchestrator] Step ${agentType} failed:`, error);
    } finally {
      step.endTime = Date.now();
      step.duration = step.endTime - startTime;
      step.startTime = startTime;
    }

    return step;
  }

  /**
   * Get workflow status by ID
   */
  getWorkflowStatus(workflowId: string): WorkflowExecution | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get active workflows
   */
  getActiveWorkflows(): WorkflowExecution[] {
    return Array.from(this.activeWorkflows)
      .map(id => this.workflows.get(id))
      .filter((w): w is WorkflowExecution => w !== undefined);
  }

  /**
   * Get workflow history
   */
  getWorkflowHistory(limit: number = 10): WorkflowExecution[] {
    return this.workflowHistory.slice(-limit).reverse();
  }

  /**
   * Get workflow statistics
   */
  getWorkflowStatistics(): {
    totalWorkflows: number;
    completedWorkflows: number;
    failedWorkflows: number;
    averageSuccessRate: number;
    averageDuration: number;
  } {
    const total = this.workflowHistory.length;
    const completed = this.workflowHistory.filter(w => w.state === 'completed').length;
    const failed = this.workflowHistory.filter(w => w.state === 'failed').length;

    const avgSuccessRate = total > 0
      ? this.workflowHistory.reduce((sum, w) => sum + w.successRate, 0) / total
      : 0;

    const avgDuration = total > 0
      ? this.workflowHistory.reduce((sum, w) => sum + (w.duration || 0), 0) / total
      : 0;

    return {
      totalWorkflows: total,
      completedWorkflows: completed,
      failedWorkflows: failed,
      averageSuccessRate: avgSuccessRate,
      averageDuration: avgDuration,
    };
  }

  /**
   * Clear workflow history
   */
  clearHistory(): void {
    this.workflows.clear();
    this.workflowHistory = [];
    this.activeWorkflows.clear();
  }
}
