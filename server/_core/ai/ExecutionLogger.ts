/**
 * Execution Logger - Track AI Agent execution flows and results
 */

import { v4 as uuidv4 } from 'uuid';

export interface ExecutionLogEntry {
  id: string;
  timestamp: string;
  workflowId: string;
  agentType: string;
  status: 'started' | 'processing' | 'completed' | 'failed';
  provider?: string;
  input?: any;
  output?: any;
  error?: string;
  executionTime?: number;
  tokensUsed?: number;
  mode: 'demo' | 'real';
}

export interface WorkflowExecutionLog {
  workflowId: string;
  startTime: string;
  endTime?: string;
  totalExecutionTime?: number;
  status: 'running' | 'completed' | 'failed';
  entries: ExecutionLogEntry[];
  primaryProvider: string;
  mode: 'demo' | 'real';
}

export class ExecutionLogger {
  private logs: Map<string, WorkflowExecutionLog> = new Map();
  private maxLogs = 100; // Keep last 100 workflows

  /**
   * Start a new workflow execution log
   */
  startWorkflow(workflowId: string, primaryProvider: string, mode: 'demo' | 'real' = 'demo'): WorkflowExecutionLog {
    const log: WorkflowExecutionLog = {
      workflowId,
      startTime: new Date().toISOString(),
      status: 'running',
      entries: [],
      primaryProvider,
      mode,
    };

    this.logs.set(workflowId, log);

    // Keep only last maxLogs
    if (this.logs.size > this.maxLogs) {
      const firstKey = this.logs.keys().next().value as string | undefined;
      if (firstKey) {
        this.logs.delete(firstKey);
      }
    }

    console.log(`[ExecutionLogger] Workflow started: ${workflowId} (${mode} mode, provider: ${primaryProvider})`);
    return log;
  }

  /**
   * Log agent execution start
   */
  logAgentStart(workflowId: string, agentType: string, provider: string, input: any, mode: 'demo' | 'real'): string {
    const log = this.logs.get(workflowId);
    if (!log) {
      console.warn(`[ExecutionLogger] Workflow not found: ${workflowId}`);
      return '';
    }

    const entryId = uuidv4();
    const entry: ExecutionLogEntry = {
      id: entryId,
      timestamp: new Date().toISOString(),
      workflowId,
      agentType,
      status: 'started',
      provider,
      input,
      mode,
    };

    log.entries.push(entry);
    console.log(`[ExecutionLogger] Agent started: ${agentType} (${provider})`);
    return entryId;
  }

  /**
   * Log agent execution processing
   */
  logAgentProcessing(workflowId: string, entryId: string): void {
    const log = this.logs.get(workflowId);
    if (!log) return;

    const entry = log.entries.find((e) => e.id === entryId);
    if (entry) {
      entry.status = 'processing';
    }
  }

  /**
   * Log agent execution completion
   */
  logAgentCompletion(
    workflowId: string,
    entryId: string,
    output: any,
    executionTime: number,
    tokensUsed: number = 0
  ): void {
    const log = this.logs.get(workflowId);
    if (!log) return;

    const entry = log.entries.find((e) => e.id === entryId);
    if (entry) {
      entry.status = 'completed';
      entry.output = output;
      entry.executionTime = executionTime;
      entry.tokensUsed = tokensUsed;
      console.log(
        `[ExecutionLogger] Agent completed: ${entry.agentType} (${executionTime}ms, ${tokensUsed} tokens)`
      );
    }
  }

  /**
   * Log agent execution error
   */
  logAgentError(workflowId: string, entryId: string, error: string, executionTime: number): void {
    const log = this.logs.get(workflowId);
    if (!log) return;

    const entry = log.entries.find((e) => e.id === entryId);
    if (entry) {
      entry.status = 'failed';
      entry.error = error;
      entry.executionTime = executionTime;
      console.log(`[ExecutionLogger] Agent failed: ${entry.agentType} - ${error}`);
    }
  }

  /**
   * Complete workflow execution
   */
  completeWorkflow(workflowId: string, status: 'completed' | 'failed'): WorkflowExecutionLog | undefined {
    const log = this.logs.get(workflowId);
    if (!log) return undefined;

    log.status = status;
    log.endTime = new Date().toISOString();
    log.totalExecutionTime = new Date(log.endTime).getTime() - new Date(log.startTime).getTime();

    console.log(
      `[ExecutionLogger] Workflow ${status}: ${workflowId} (${log.totalExecutionTime}ms, ${log.entries.length} steps)`
    );
    return log;
  }

  /**
   * Get workflow execution log
   */
  getWorkflowLog(workflowId: string): WorkflowExecutionLog | undefined {
    return this.logs.get(workflowId);
  }

  /**
   * Get all logs
   */
  getAllLogs(): WorkflowExecutionLog[] {
    return Array.from(this.logs.values());
  }

  /**
   * Get recent logs (last N)
   */
  getRecentLogs(limit: number = 10): WorkflowExecutionLog[] {
    return Array.from(this.logs.values()).slice(-limit);
  }

  /**
   * Get logs by mode
   */
  getLogsByMode(mode: 'demo' | 'real'): WorkflowExecutionLog[] {
    return Array.from(this.logs.values()).filter((log) => log.mode === mode);
  }

  /**
   * Get logs by provider
   */
  getLogsByProvider(provider: string): WorkflowExecutionLog[] {
    return Array.from(this.logs.values()).filter((log) => log.primaryProvider === provider);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalWorkflows: number;
    completedWorkflows: number;
    failedWorkflows: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
    demoModeCount: number;
    realModeCount: number;
    providerStats: Record<string, number>;
  } {
    const logs = Array.from(this.logs.values());
    const completed = logs.filter((l) => l.status === 'completed');
    const failed = logs.filter((l) => l.status === 'failed');
    const totalTime = logs.reduce((sum, l) => sum + (l.totalExecutionTime || 0), 0);
    const demoMode = logs.filter((l) => l.mode === 'demo');
    const realMode = logs.filter((l) => l.mode === 'real');

    const providerStats: Record<string, number> = {};
    logs.forEach((log) => {
      providerStats[log.primaryProvider] = (providerStats[log.primaryProvider] || 0) + 1;
    });

    return {
      totalWorkflows: logs.length,
      completedWorkflows: completed.length,
      failedWorkflows: failed.length,
      totalExecutionTime: totalTime,
      averageExecutionTime: logs.length > 0 ? totalTime / logs.length : 0,
      demoModeCount: demoMode.length,
      realModeCount: realMode.length,
      providerStats,
    };
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs.clear();
    console.log('[ExecutionLogger] All logs cleared');
  }
}

// Global instance
let executionLogger: ExecutionLogger | null = null;

export function getExecutionLogger(): ExecutionLogger {
  if (!executionLogger) {
    executionLogger = new ExecutionLogger();
  }
  return executionLogger;
}
