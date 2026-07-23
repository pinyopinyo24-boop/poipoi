/**
 * CollaborationRepository - 協調データ永続化層
 */

import type { CollaborationResult } from '../core/AICollaborationManager';

export class CollaborationRepository {
  private results: Map<string, CollaborationResult> = new Map();
  private taskHistory: Map<string, CollaborationResult[]> = new Map();

  /**
   * 協調結果を保存
   */
  async saveCollaborationResult(result: CollaborationResult): Promise<void> {
    this.results.set(result.id, result);

    if (!this.taskHistory.has(result.taskId)) {
      this.taskHistory.set(result.taskId, []);
    }

    this.taskHistory.get(result.taskId)!.push(result);
  }

  /**
   * 協調結果を取得
   */
  async getCollaborationResult(resultId: string): Promise<CollaborationResult | null> {
    return this.results.get(resultId) || null;
  }

  /**
   * タスク履歴を取得
   */
  async getCollaborationHistory(taskId: string): Promise<CollaborationResult[]> {
    return this.taskHistory.get(taskId) || [];
  }

  /**
   * 協調結果を削除
   */
  async deleteCollaborationResult(resultId: string): Promise<void> {
    const result = this.results.get(resultId);
    if (result) {
      this.results.delete(resultId);

      const history = this.taskHistory.get(result.taskId);
      if (history) {
        const index = history.findIndex((r) => r.id === resultId);
        if (index > -1) {
          history.splice(index, 1);
        }
      }
    }
  }

  /**
   * 全結果を取得
   */
  async getAllResults(): Promise<CollaborationResult[]> {
    const results: CollaborationResult[] = [];
    const valuesIterator = this.results.values();
    let item = valuesIterator.next();
    while (!item.done) {
      results.push(item.value);
      item = valuesIterator.next();
    }
    return results;
  }

  /**
   * 統計を取得
   */
  async getCollaborationStats(): Promise<Record<string, unknown>> {
    const results = Array.from(this.results.values());
    const completed = results.filter((r) => r.status === 'completed').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    const avgConfidence =
      results.length > 0
        ? results.reduce(
            (sum, r) =>
              sum +
              r.agentResponses.reduce((s, ar) => s + ar.confidence, 0) /
                (r.agentResponses.length || 1),
            0
          ) / results.length
        : 0;

    return {
      totalResults: results.length,
      completedResults: completed,
      failedResults: failed,
      successRate: results.length > 0 ? completed / results.length : 0,
      averageConfidence: avgConfidence,
      averageAgentCount:
        results.length > 0
          ? results.reduce((sum, r) => sum + r.agentResponses.length, 0) / results.length
          : 0,
    };
  }

  /**
   * 結果をフィルタリング
   */
  async filterResults(predicate: (result: CollaborationResult) => boolean): Promise<CollaborationResult[]> {
    const results: CollaborationResult[] = [];
    const valuesIterator = this.results.values();
    let item = valuesIterator.next();
    while (!item.done) {
      if (predicate(item.value)) {
        results.push(item.value);
      }
      item = valuesIterator.next();
    }
    return results;
  }

  /**
   * 結果を更新
   */
  async updateCollaborationResult(resultId: string, updates: Partial<CollaborationResult>): Promise<void> {
    const result = this.results.get(resultId);
    if (result) {
      Object.assign(result, updates);
    }
  }

  /**
   * 古い結果を削除
   */
  async deleteOldResults(olderThanMs: number): Promise<number> {
    const now = Date.now();
    let deletedCount = 0;
    const idsToDelete: string[] = [];

    const entriesIterator = this.results.entries();
    let entry = entriesIterator.next();
    while (!entry.done) {
      const id = entry.value[0];
      const result = entry.value[1];
      if (now - result.timestamp > olderThanMs) {
        idsToDelete.push(id);
      }
      entry = entriesIterator.next();
    }

    for (const id of idsToDelete) {
      await this.deleteCollaborationResult(id);
      deletedCount++;
    }

    return deletedCount;
  }

  /**
   * リポジトリをクリア
   */
  async clear(): Promise<void> {
    this.results.clear();
    this.taskHistory.clear();
  }
}
