/**
 * CollaborationValidator - 協調バリデーター
 */

import type { AIAgent, CollaborationTask } from '../core/AICollaborationManager';

export class CollaborationValidator {
  /**
   * タスクを検証
   */
  validateTask(task: CollaborationTask): boolean {
    if (!task || !task.id) return false;
    if (!task.description || task.description.length === 0) return false;
    if (!task.assignedAgents || task.assignedAgents.length === 0) return false;
    if (task.priority < 0 || task.priority > 10) return false;

    return true;
  }

  /**
   * エージェントを検証
   */
  validateAgent(agent: AIAgent): boolean {
    if (!agent || !agent.id) return false;
    if (!agent.name || agent.name.length === 0) return false;
    if (!['reasoning', 'evolution', 'memory', 'agent', 'automation'].includes(agent.type))
      return false;
    if (!agent.capabilities || agent.capabilities.length === 0) return false;
    if (!['active', 'inactive', 'busy'].includes(agent.status)) return false;

    return true;
  }

  /**
   * エージェントリストを検証
   */
  validateAgentList(agents: AIAgent[]): boolean {
    if (!Array.isArray(agents)) return false;
    if (agents.length === 0) return false;

    for (const agent of agents) {
      if (!this.validateAgent(agent)) return false;
    }

    return true;
  }

  /**
   * 応答を検証
   */
  validateResponse(response: Record<string, unknown>): boolean {
    if (!response || typeof response !== 'object') return false;

    return true;
  }

  /**
   * 合意を検証
   */
  validateConsensus(consensus: Record<string, unknown>): boolean {
    if (!consensus || typeof consensus !== 'object') return false;

    return true;
  }

  /**
   * 協調結果を検証
   */
  validateCollaborationResult(result: {
    id: string;
    taskId: string;
    agentResponses: Array<{ agentId: string; response: Record<string, unknown>; confidence: number }>;
    consensus: Record<string, unknown>;
    finalRecommendation: string;
    timestamp: number;
    status: string;
  }): boolean {
    if (!result.id || result.id.length === 0) return false;
    if (!result.taskId || result.taskId.length === 0) return false;
    if (!Array.isArray(result.agentResponses)) return false;
    if (!this.validateConsensus(result.consensus)) return false;
    if (!result.finalRecommendation || result.finalRecommendation.length === 0) return false;
    if (typeof result.timestamp !== 'number') return false;
    if (!['pending', 'completed', 'failed'].includes(result.status)) return false;

    return true;
  }

  /**
   * 信頼度を検証
   */
  validateConfidence(confidence: number): boolean {
    return typeof confidence === 'number' && confidence >= 0 && confidence <= 1;
  }

  /**
   * メッセージを検証
   */
  validateMessage(message: string): boolean {
    if (!message || typeof message !== 'string') return false;
    if (message.length === 0 || message.length > 10000) return false;

    return true;
  }
}
