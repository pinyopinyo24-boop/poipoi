/**
 * CollaborationHistoryService - 協調履歴管理
 */

import type { CollaborationResult } from '../core/AICollaborationManager';

export interface CollaborationHistoryEntry {
  id: string;
  resultId: string;
  timestamp: number;
  agentCount: number;
  consensusQuality: number;
  status: string;
}

export class CollaborationHistoryService {
  private history: Map<string, CollaborationHistoryEntry[]> = new Map();

  /**
   * 協調履歴を保存
   */
  async saveCollaborationHistory(result: CollaborationResult): Promise<void> {
    const entry: CollaborationHistoryEntry = {
      id: `history_${Date.now()}`,
      resultId: result.id,
      timestamp: result.timestamp,
      agentCount: result.agentResponses.length,
      consensusQuality: this.calculateQuality(result),
      status: result.status,
    };

    if (!this.history.has(result.taskId)) {
      this.history.set(result.taskId, []);
    }

    this.history.get(result.taskId)!.push(entry);
  }

  /**
   * 履歴を取得
   */
  async getHistory(taskId: string): Promise<CollaborationHistoryEntry[]> {
    return this.history.get(taskId) || [];
  }

  /**
   * 履歴統計を取得
   */
  async getHistoryStats(taskId: string): Promise<Record<string, unknown>> {
    const entries = this.history.get(taskId) || [];

    if (entries.length === 0) {
      return {
        totalCollaborations: 0,
        averageQuality: 0,
        averageAgentCount: 0,
      };
    }

    const avgQuality = entries.reduce((sum, e) => sum + e.consensusQuality, 0) / entries.length;
    const avgAgentCount = entries.reduce((sum, e) => sum + e.agentCount, 0) / entries.length;

    return {
      totalCollaborations: entries.length,
      averageQuality: avgQuality,
      averageAgentCount: avgAgentCount,
      successRate: entries.filter((e) => e.status === 'completed').length / entries.length,
    };
  }

  /**
   * 履歴をクリア
   */
  async clearHistory(taskId: string): Promise<void> {
    this.history.delete(taskId);
  }

  /**
   * 全履歴を取得
   */
  async getAllHistory(): Promise<Map<string, CollaborationHistoryEntry[]>> {
    return new Map(this.history);
  }

  /**
   * 品質を計算
   */
  private calculateQuality(result: CollaborationResult): number {
    if (result.agentResponses.length === 0) return 0;

    const avgConfidence =
      result.agentResponses.reduce((sum, r) => sum + r.confidence, 0) /
      result.agentResponses.length;

    return Math.min(avgConfidence, 1);
  }

  /**
   * 最新の履歴を取得
   */
  async getLatestHistory(taskId: string, limit: number = 10): Promise<CollaborationHistoryEntry[]> {
    const entries = this.history.get(taskId) || [];
    return entries.slice(-limit);
  }

  /**
   * 期間内の履歴を取得
   */
  async getHistoryByDateRange(
    taskId: string,
    startTime: number,
    endTime: number
  ): Promise<CollaborationHistoryEntry[]> {
    const entries = this.history.get(taskId) || [];
    return entries.filter((e) => e.timestamp >= startTime && e.timestamp <= endTime);
  }
}
