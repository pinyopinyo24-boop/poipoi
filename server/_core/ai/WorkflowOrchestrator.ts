/**
 * Workflow Orchestrator - Manages multi-agent workflow execution
 */

import { AgentManager } from './AgentManager';
import { MemoryIntegrationService } from './MemoryIntegrationService';
import { ExecutionLogger } from './ExecutionLogger';
import { AICore } from './AICore';
import { AgentType } from './agents/BaseAgent';

export type WorkflowState =
  | 'pending'
  | 'analyzing'
  | 'designing'
  | 'implementing'
  | 'reviewing'
  | 'completed'
  | 'failed';

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

export class WorkflowOrchestrator {

  private workflows = new Map<string, WorkflowExecution>();
  private workflowHistory: WorkflowExecution[] = [];
  private activeWorkflows = new Set<string>();

  constructor(
    private agentManager: AgentManager,
    private memoryService: MemoryIntegrationService,
    private executionLogger: ExecutionLogger,
    private aiCore: AICore
  ) {}

  async executeTaskWorkflow(
    userInput: string
  ): Promise<WorkflowExecution> {

    const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
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
        provider:
          this.aiCore.getPrimaryProvider()?.constructor.name || 'unknown',
        mode:
          process.env.DEMO_MODE === 'true'
            ? 'demo'
            : 'real'
      }
    };

    this.workflows.set(workflowId, workflow);
    this.activeWorkflows.add(workflowId);

    try {

      const steps = [
        ['task', { userInput }],
        ['design', { userInput }],
        ['implementation', { userInput }],
        ['review', { userInput }]
      ] as const;

      for (const [agentType, input] of steps) {

        const step = await this.executeStep(
          workflow,
          agentType,
          userInput,
          input
        );

        workflow.steps.push(step);
      }

      workflow.endTime = Date.now();
      workflow.duration = Math.max(
        1,
        workflow.endTime - startTime
      );

      const successSteps = workflow.steps.filter(s => s.state === 'completed').length;
      const totalSteps = workflow.steps.length;
      workflow.successRate = totalSteps > 0 ? (successSteps / totalSteps) * 100 : 0;

      if (successSteps === 0 && totalSteps > 0) {
        workflow.state = 'failed';
        workflow.error = workflow.steps.find(s => s.error)?.error;
      } else {
        workflow.state = 'completed';
      }

      await this.saveWorkflowData(workflow);

      this.workflowHistory.push(workflow);

    } catch(error) {

      workflow.state = 'failed';

      workflow.error =
        error instanceof Error
          ? error.message
          : 'Unknown error';

      console.log(
        '[Workflow ERROR]',
        workflow.error
      );

      workflow.endTime = Date.now();
      workflow.duration =
        workflow.endTime - startTime;

      await this.saveWorkflowData(workflow);

      this.workflowHistory.push(workflow);
    }

    return workflow;
  }
  private async executeStep(
    workflow: WorkflowExecution,
    agentType: AgentType,
    userInput: string,
    input: Record<string, any>
  ): Promise<WorkflowStep> {

    const stepId = `step-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const startTime = Date.now();

    const step: WorkflowStep = {
      id: stepId,
      agentType,
      state: 'pending',
      input
    };

    try {

      step.state = 'analyzing';

      const agent =
        this.agentManager.getAgent(agentType);

      if (!agent) {

        console.warn(
          `[Workflow] Agent ${agentType} not found. Test simulation mode.`
        );

        step.state = 'completed';

        step.output = {
          simulated: true,
          agentType,
          tokensUsed: 0
        };

        return step;
      }


      const result =
        await this.agentManager.executeTask(
          agentType,
          userInput,
          input
        );


      if (!result) {
        throw new Error(
          `Agent ${agentType} returned empty result`
        );
      }


      if (result.error) {
        throw new Error(
          result.error
        );
      }


      step.state = 'completed';

      step.output =
        result.output || {};

      step.output.tokensUsed =
        result.tokensUsed || 0


    } catch(error) {

      step.state = 'failed';

      step.error =
        error instanceof Error
          ? error.message
          : 'Unknown error';


      console.log(
        '[STEP ERROR]',
        agentType,
        step.error
      );

    } finally {

      step.startTime = startTime;

      step.endTime = Date.now();

      step.duration =
        step.endTime - startTime;
    }


    return step;
  }


  private async saveWorkflowData(
    workflow: WorkflowExecution
  ): Promise<void> {

    try {

  // ← ここはログ保存
  if (this.executionLogger) {

    this.executionLogger.startWorkflow(
      workflow.id,
      workflow.metadata.provider,
      workflow.metadata.mode
    );

    this.executionLogger.completeWorkflow(
      workflow.id,
      workflow.state === 'completed'
        ? 'completed'
        : 'failed'
    );
  }


  // ← ここはメモリ保存
  if (this.memoryService) {

    this.memoryService.saveAgentExecution(
      'workflow',
      workflow.id,
      workflow.metadata.userInput,
      JSON.stringify(workflow),
      'medium'
    );

    this.memoryService.saveLearningRecord(
      'workflow',
      workflow.id,
      workflow.metadata.userInput,
      JSON.stringify(workflow),
      workflow.state === 'completed',
      workflow.duration ?? 0,
      workflow.metadata.provider,
      workflow.metadata.mode
    );
  } 
  

      console.log(
        `[WorkflowOrchestrator] Saved workflow ${workflow.id}`
      );

    } catch(error) {

      console.error(
        '[WorkflowOrchestrator] Save failed:',
        error
      );

    }
  }

　getWorkflowStatus(
    workflowId: string
  ): WorkflowExecution | undefined {

    return this.workflows.get(workflowId);
  }


  getActiveWorkflows(): WorkflowExecution[] {

    return Array.from(this.activeWorkflows)
      .map(id => this.workflows.get(id))
      .filter(
        (workflow): workflow is WorkflowExecution =>
          workflow !== undefined
      );
  }


  getWorkflowHistory(
    limit: number = 10
  ): WorkflowExecution[] {

    return this.workflowHistory
      .slice(-limit);
  }


  clearHistory(): void {

    this.workflows.clear();

    this.workflowHistory = [];

    this.activeWorkflows.clear();
  }

}