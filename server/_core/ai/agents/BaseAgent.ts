/**
 * BaseAgent - Base class for all AI agents
 * Provides common functionality for agent coordination
 */

import { IAIProvider, AIMessage, AIResponse, AIInvokeOptions } from '../providers/AIProvider';

export type AgentType = 'design' | 'implementation' | 'review' | 'task' | 'coordinator';
export type AgentStatus = 'idle' | 'processing' | 'completed' | 'failed' | 'waiting';

export interface AgentTask {
  id: string;
  type: AgentType;
  description: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  status: AgentStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AgentContext {
  taskId: string;
  previousResults?: Record<string, any>;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface AgentExecutionResult {
  success: boolean;
  agentType: AgentType;
  taskId: string;
  output: Record<string, any>;
  executionTime: number;
  tokensUsed?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Base class for all agents
 */
export abstract class BaseAgent {
  protected agentType: AgentType;
  protected provider: IAIProvider;
  protected status: AgentStatus = 'idle';
  protected currentTask?: AgentTask;
  protected taskHistory: AgentTask[] = [];
  protected systemPrompt: string;

  constructor(agentType: AgentType, provider: IAIProvider, systemPrompt: string) {
    this.agentType = agentType;
    this.provider = provider;
    this.systemPrompt = systemPrompt;
  }

  /**
   * Get agent type
   */
  getAgentType(): AgentType {
    return this.agentType;
  }

  /**
   * Get current status
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Get current task
   */
  getCurrentTask(): AgentTask | undefined {
    return this.currentTask;
  }

  /**
   * Get task history
   */
  getTaskHistory(): AgentTask[] {
    return this.taskHistory;
  }

  /**
   * Execute a task
   */
  async execute(
    description: string,
    input: Record<string, any>,
    context?: AgentContext
  ): Promise<AgentExecutionResult> {
    const taskId = context?.taskId || this.generateTaskId();
    const startTime = Date.now();

    this.currentTask = {
      id: taskId,
      type: this.agentType,
      description,
      input,
      status: 'processing',
      createdAt: new Date(),
      startedAt: new Date(),
      metadata: context?.metadata,
    };

    this.status = 'processing';
    this.logExecution('start', { taskId, description });

    try {
      // Build messages for AI
      const messages = this.buildMessages(description, input, context);

      // Invoke AI provider
      const options = this.getInvokeOptions();
      const aiResponse = await this.provider.invoke(messages, options);

      // Process AI response
      const output = this.processResponse(aiResponse, input);

      // Update task
      this.currentTask.status = 'completed';
      this.currentTask.output = output;
      this.currentTask.completedAt = new Date();

      const executionTime = Date.now() - startTime;

      this.status = 'idle';
      this.taskHistory.push(this.currentTask);

      this.logExecution('success', {
        taskId,
        executionTime,
        tokens: aiResponse.usage?.totalTokens,
      });

      return {
        success: true,
        agentType: this.agentType,
        taskId,
        output,
        executionTime,
        tokensUsed: aiResponse.usage?.totalTokens,
        metadata: {
          aiProvider: aiResponse.provider,
          aiModel: aiResponse.model,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (this.currentTask) {
        this.currentTask.status = 'failed';
        this.currentTask.error = errorMessage;
        this.currentTask.completedAt = new Date();
        this.taskHistory.push(this.currentTask);
      }

      this.status = 'idle';

      this.logExecution('error', {
        taskId,
        error: errorMessage,
        executionTime,
      });

      return {
        success: false,
        agentType: this.agentType,
        taskId,
        output: {},
        executionTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Build messages for AI invocation
   * Override in subclasses for specific behavior
   */
  protected buildMessages(
    description: string,
    input: Record<string, any>,
    context?: AgentContext
  ): AIMessage[] {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: this.systemPrompt,
      },
      {
        role: 'user',
        content: this.formatUserMessage(description, input, context),
      },
    ];

    return messages;
  }

  /**
   * Format user message
   */
  protected formatUserMessage(
    description: string,
    input: Record<string, any>,
    context?: AgentContext
  ): string {
    let message = `Task: ${description}\n\n`;

    if (Object.keys(input).length > 0) {
      message += `Input:\n${JSON.stringify(input, null, 2)}\n\n`;
    }

    if (context?.previousResults) {
      message += `Previous Results:\n${JSON.stringify(context.previousResults, null, 2)}\n\n`;
    }

    message += 'Please provide a detailed response with actionable output.';

    return message;
  }

  /**
   * Process AI response
   * Override in subclasses for specific processing
   */
  protected processResponse(aiResponse: AIResponse, input: Record<string, any>): Record<string, any> {
    return {
      content: aiResponse.content,
      model: aiResponse.model,
      provider: aiResponse.provider,
      timestamp: aiResponse.timestamp,
    };
  }

  /**
   * Get invoke options for AI provider
   * Override in subclasses for specific options
   */
  protected getInvokeOptions(): AIInvokeOptions {
    return {
      temperature: 0.7,
      maxTokens: 2048,
      topP: 0.9,
    };
  }

  /**
   * Generate task ID
   */
  protected generateTaskId(): string {
    return `${this.agentType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Log execution
   */
  protected logExecution(phase: string, data: any): void {
    console.log(`[Agent: ${this.agentType}] ${phase}:`, {
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  /**
   * Get agent name
   */
  abstract getName(): string;

  /**
   * Get agent description
   */
  abstract getDescription(): string;
}
