/**
 * AgentManager - Manages and coordinates all agents
 * Handles agent lifecycle, task distribution, and result aggregation
 */

import { BaseAgent, AgentType, AgentStatus, AgentTask, AgentContext, AgentExecutionResult } from './agents/BaseAgent';
import { DesignAgent } from './agents/DesignAgent';
import { ImplementationAgent } from './agents/ImplementationAgent';
import { ReviewAgent } from './agents/ReviewAgent';
import { TaskAgent } from './agents/TaskAgent';
import { IAIProvider, AIProviderType } from './providers/AIProvider';
import { getExecutionLogger } from './ExecutionLogger';

export interface AgentManagerConfig {
  primaryProvider: IAIProvider;
  secondaryProvider?: IAIProvider;
  enableLogging: boolean;
  maxConcurrentTasks: number;
}

export interface WorkflowStep {
  agentType: AgentType;
  description: string;
  input: Record<string, any>;
  dependsOn?: AgentType[];
}

export interface WorkflowResult {
  workflowId: string;
  status: 'completed' | 'failed' | 'in_progress';
  steps: AgentExecutionResult[];
  aggregatedResults: Record<string, any>;
  executionTime: number;
  totalTokensUsed: number;
  error?: string;
}

/**
 * AgentManager - Coordinates all agents
 */
export class AgentManager {
  private agents: Map<AgentType, BaseAgent> = new Map();
  private config: AgentManagerConfig;
  private taskQueue: AgentTask[] = [];
  private executionHistory: AgentExecutionResult[] = [];
  private activeWorkflows: Map<string, WorkflowResult> = new Map();
  private executionLogger = getExecutionLogger();
  private mode: 'demo' | 'real' = 'demo';

  constructor(config: AgentManagerConfig) {
    this.config = config;
    this.initializeAgents();
  }

  /**
   * Initialize all agents
   */
  private initializeAgents(): void {
    const provider = this.config.primaryProvider;

    this.agents.set('design', new DesignAgent(provider));
    this.agents.set('implementation', new ImplementationAgent(provider));
    this.agents.set('review', new ReviewAgent(provider));
    this.agents.set('task', new TaskAgent(provider));

    this.log('Agents initialized', {
      agentCount: this.agents.size,
      primaryProvider: provider.getProviderType(),
    });
  }

  /**
   * Get agent by type
   */
  getAgent(agentType: AgentType): BaseAgent | undefined {
    return this.agents.get(agentType);
  }

  /**
   * Get all agents
   */
  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentType: AgentType): AgentStatus | undefined {
    const agent = this.agents.get(agentType);
    return agent?.getStatus();
  }

  /**
   * Get all agent statuses
   */
  getAllAgentStatuses(): Record<AgentType, AgentStatus> {
    const statuses: Record<string, AgentStatus> = {};
    this.agents.forEach((agent, type) => {
      statuses[type] = agent.getStatus();
    });
    return statuses as Record<AgentType, AgentStatus>;
  }

  /**
   * Execute a single task with an agent
   */
  async executeTask(
    agentType: AgentType,
    description: string,
    input: Record<string, any>,
    context?: AgentContext
  ): Promise<AgentExecutionResult> {
    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new Error(`Agent type '${agentType}' not found`);
    }

    this.log('Task execution started', { agentType, description });

    try {
      const result = await agent.execute(description, input, context);
      this.executionHistory.push(result);
      return result;
    } catch (error) {
      this.logError('Task execution failed', { agentType, error });
      throw error;
    }
  }

  /**
   * Execute a workflow with multiple agents
   */
  async executeWorkflow(
    workflowId: string,
    steps: WorkflowStep[]
  ): Promise<WorkflowResult> {
    const startTime = Date.now();
    const results: AgentExecutionResult[] = [];
    const aggregatedResults: Record<string, any> = {};
    let totalTokensUsed = 0;

    this.log('Workflow started', { workflowId, stepCount: steps.length });

    // Start execution logging
    this.executionLogger.startWorkflow(
      workflowId,
      this.config.primaryProvider.getProviderType(),
      this.mode
    );

    const workflow: WorkflowResult = {
      workflowId,
      status: 'in_progress',
      steps: [],
      aggregatedResults: {},
      executionTime: 0,
      totalTokensUsed: 0,
    };

    this.activeWorkflows.set(workflowId, workflow);

    try {
      // Execute steps in order
      for (const step of steps) {
        // Check dependencies
        if (step.dependsOn && step.dependsOn.length > 0) {
          const previousResults: Record<string, any> = {};
          for (const depType of step.dependsOn) {
            const depResult = results.find(r => r.agentType === depType);
            if (depResult) {
              previousResults[depType] = depResult.output;
            }
          }
          step.input.previousResults = previousResults;
        }

        // Execute step
        const context: AgentContext = {
          taskId: `${workflowId}-${step.agentType}`,
          previousResults: aggregatedResults,
          dependencies: step.dependsOn,
        };

        const stepStartTime = Date.now();
        const entryId = this.executionLogger.logAgentStart(
          workflowId,
          step.agentType,
          this.config.primaryProvider.getProviderType(),
          step.input,
          this.mode
        );

        try {
          this.executionLogger.logAgentProcessing(workflowId, entryId);

          const result = await this.executeTask(
            step.agentType,
            step.description,
            step.input,
            context
          );

          const stepExecutionTime = Date.now() - stepStartTime;
          this.executionLogger.logAgentCompletion(
            workflowId,
            entryId,
            result.output,
            stepExecutionTime,
            result.tokensUsed || 0
          );

          results.push(result);
          aggregatedResults[step.agentType] = result.output;
          totalTokensUsed += result.tokensUsed || 0;
        } catch (stepError) {
          const stepExecutionTime = Date.now() - stepStartTime;
          const errorMessage = stepError instanceof Error ? stepError.message : String(stepError);
          this.executionLogger.logAgentError(
            workflowId,
            entryId,
            errorMessage,
            stepExecutionTime
          );
          throw stepError;
        }

        // Note: result is from the try block above
        const lastResult = results[results.length - 1];
        this.log('Workflow step completed', {
          workflowId,
          agentType: step.agentType,
          success: lastResult?.success || false,
        });
      }

      const executionTime = Date.now() - startTime;

      workflow.status = 'completed';
      workflow.steps = results;
      workflow.aggregatedResults = aggregatedResults;
      workflow.executionTime = executionTime;
      workflow.totalTokensUsed = totalTokensUsed;

      // Complete execution logging
      this.executionLogger.completeWorkflow(workflowId, 'completed');

      this.log('Workflow completed', {
        workflowId,
        executionTime,
        totalTokens: totalTokensUsed,
      });

      return workflow;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      workflow.status = 'failed';
      workflow.error = errorMessage;
      workflow.executionTime = executionTime;

      // Complete execution logging
      this.executionLogger.completeWorkflow(workflowId, 'failed');

      this.logError('Workflow failed', { workflowId, error });

      return workflow;
    }
  }

  /**
   * Get workflow result
   */
  getWorkflowResult(workflowId: string): WorkflowResult | undefined {
    return this.activeWorkflows.get(workflowId);
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit?: number): AgentExecutionResult[] {
    if (limit) {
      return this.executionHistory.slice(-limit);
    }
    return this.executionHistory;
  }

  /**
   * Get manager status
   */
  getManagerStatus(): Record<string, any> {
    return {
      agents: this.getAllAgentStatuses(),
      taskQueueLength: this.taskQueue.length,
      activeWorkflows: this.activeWorkflows.size,
      executionHistoryLength: this.executionHistory.length,
      primaryProvider: this.config.primaryProvider.getProviderType(),
      secondaryProvider: this.config.secondaryProvider?.getProviderType(),
    };
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory(): void {
    this.executionHistory = [];
    this.log('Execution history cleared', {});
  }

  /**
   * Log message
   */
  private log(message: string, data: any): void {
    if (this.config.enableLogging) {
      console.log(`[AgentManager] ${message}:`, {
        timestamp: new Date().toISOString(),
        ...data,
      });
    }
  }

  /**
   * Log error
   */
  private logError(message: string, data: any): void {
    console.error(`[AgentManager] ${message}:`, {
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  /**
   * Set mode (demo or real)
   */
  setMode(mode: 'demo' | 'real'): void {
    this.mode = mode;
  }

  /**
   * Get mode
   */
  getMode(): 'demo' | 'real' {
    return this.mode;
  }

  /**
   * Get execution logs
   */
  getExecutionLogs() {
    return this.executionLogger.getAllLogs();
  }

  /**
   * Get workflow log
   */
  getWorkflowLog(workflowId: string) {
    return this.executionLogger.getWorkflowLog(workflowId);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return this.executionLogger.getStatistics();
  }
}
