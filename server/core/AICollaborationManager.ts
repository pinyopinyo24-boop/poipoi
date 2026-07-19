/**
 * AICollaborationManager - AI協調制御基盤
 * 複数AI Managerが協調して問題解決する
 */

import type { CollaborationService } from '../services/CollaborationService';
import type { AgentCommunicationService } from '../services/AgentCommunicationService';
import type { TaskDistributionService } from '../services/TaskDistributionService';
import type { ConsensusService } from '../services/ConsensusService';
import type { CollaborationHistoryService } from '../services/CollaborationHistoryService';
import type { CollaborationValidator } from '../services/CollaborationValidator';
import type { CollaborationRepository } from '../repositories/CollaborationRepository';

export interface AIAgent {
  id: string;
  name: string;
  type: 'reasoning' | 'evolution' | 'memory' | 'agent' | 'automation';
  capabilities: string[];
  status: 'active' | 'inactive' | 'busy';
}

export interface CollaborationTask {
  id: string;
  description: string;
  priority: number;
  assignedAgents: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  results: Record<string, unknown>[];
}

export interface CollaborationResult {
  id: string;
  taskId: string;
  agentResponses: Array<{
    agentId: string;
    response: Record<string, unknown>;
    confidence: number;
  }>;
  consensus: Record<string, unknown>;
  finalRecommendation: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
}

export class AICollaborationManager {
  constructor(
    private collaborationService: CollaborationService,
    private agentCommunication: AgentCommunicationService,
    private taskDistribution: TaskDistributionService,
    private consensusService: ConsensusService,
    private collaborationHistory: CollaborationHistoryService,
    private validator: CollaborationValidator,
    private repository: CollaborationRepository
  ) {}

  /**
   * AI協調を開始
   */
  async startCollaboration(task: CollaborationTask): Promise<CollaborationResult> {
    // ① バリデーション
    if (!this.validator.validateTask(task)) {
      throw new Error('Invalid collaboration task');
    }

    const result: CollaborationResult = {
      id: `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId: task.id,
      agentResponses: [],
      consensus: {},
      finalRecommendation: '',
      timestamp: Date.now(),
      status: 'pending',
    };

    try {
      // ② タスク分配
      const distributedTasks = await this.taskDistribution.distributeTasks(
        task,
        task.assignedAgents
      );

      // ③ AI Manager間通信
      for (const distributedTask of distributedTasks) {
        const response = await this.agentCommunication.communicateWithAgent(
          distributedTask.agentId,
          distributedTask.taskDescription
        );

        result.agentResponses.push({
          agentId: distributedTask.agentId,
          response: response as Record<string, unknown>,
          confidence: this.calculateConfidence(response),
        });
      }

      // ④ 合意形成
      result.consensus = await this.consensusService.formConsensus(
        result.agentResponses
      );

      // ⑤ 複数AI結果統合
      result.finalRecommendation = await this.integrateResults(result);

      // ⑥ 協調履歴保存
      await this.collaborationHistory.saveCollaborationHistory(result);

      // ⑦ リポジトリに保存
      await this.repository.saveCollaborationResult(result);

      result.status = 'completed';
    } catch (error) {
      result.status = 'failed';
      await this.repository.saveCollaborationResult(result);
      throw error;
    }

    return result;
  }

  /**
   * AI役割管理
   */
  async manageAgentRoles(agents: AIAgent[]): Promise<void> {
    for (const agent of agents) {
      if (!this.validator.validateAgent(agent)) {
        throw new Error(`Invalid agent: ${agent.id}`);
      }

      await this.collaborationService.updateAgentRole(agent);
    }
  }

  /**
   * 協調判断を実行
   */
  async executeCollaborativeDecision(
    problem: string,
    agents: AIAgent[]
  ): Promise<Record<string, unknown>> {
    const task: CollaborationTask = {
      id: `task_${Date.now()}`,
      description: problem,
      priority: 1,
      assignedAgents: agents.map((a) => a.id),
      status: 'pending',
      results: [],
    };

    const result = await this.startCollaboration(task);

    return {
      taskId: result.taskId,
      consensus: result.consensus,
      recommendation: result.finalRecommendation,
      agentCount: result.agentResponses.length,
      averageConfidence:
        result.agentResponses.reduce((sum, r) => sum + r.confidence, 0) /
        result.agentResponses.length,
    };
  }

  /**
   * パフォーマンス評価
   */
  async evaluatePerformance(resultId: string): Promise<Record<string, unknown>> {
    const result = await this.repository.getCollaborationResult(resultId);

    if (!result) {
      throw new Error(`Collaboration result not found: ${resultId}`);
    }

    const avgConfidence =
      result.agentResponses.reduce((sum, r) => sum + r.confidence, 0) /
      result.agentResponses.length;

    return {
      resultId,
      agentCount: result.agentResponses.length,
      averageConfidence: avgConfidence,
      consensusQuality: this.calculateConsensusQuality(result),
      executionTime: result.timestamp,
      status: result.status,
    };
  }

  /**
   * 協調履歴を取得
   */
  async getCollaborationHistory(taskId: string): Promise<CollaborationResult[]> {
    return await this.repository.getCollaborationHistory(taskId);
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(response: unknown): number {
    if (!response || typeof response !== 'object') return 0;

    const obj = response as Record<string, unknown>;
    if (typeof obj.confidence === 'number') {
      return Math.min(obj.confidence, 1);
    }

    return 0.7; // デフォルト信頼度
  }

  /**
   * 結果を統合
   */
  private async integrateResults(result: CollaborationResult): Promise<string> {
    if (result.agentResponses.length === 0) {
      return 'No agent responses available';
    }

    const highConfidenceResponses = result.agentResponses.filter(
      (r) => r.confidence > 0.7
    );

    if (highConfidenceResponses.length === 0) {
      return 'Insufficient confidence in responses';
    }

    return `Integrated recommendation from ${highConfidenceResponses.length} agents`;
  }

  /**
   * 合意品質を計算
   */
  private calculateConsensusQuality(result: CollaborationResult): number {
    if (result.agentResponses.length === 0) return 0;

    const avgConfidence =
      result.agentResponses.reduce((sum, r) => sum + r.confidence, 0) /
      result.agentResponses.length;

    return Math.min(avgConfidence, 1);
  }

  /**
   * 協調を取消
   */
  async cancelCollaboration(resultId: string): Promise<void> {
    await this.repository.deleteCollaborationResult(resultId);
  }

  /**
   * 統計を取得
   */
  async getCollaborationStats(): Promise<Record<string, unknown>> {
    return await this.repository.getCollaborationStats();
  }
}
