/**
 * ReasoningRepository - 推論データ永続化層
 */

import type { ReasoningResult } from '../core/ReasoningAIManager';

export class ReasoningRepository {
  private results: Map<string, ReasoningResult> = new Map();
  private userHistory: Map<string, string[]> = new Map();
  private feedback: Map<string, Array<{ rating: number; comments?: string }>> = new Map();

  /**
   * 推論結果を保存
   */
  async saveReasoningResult(result: ReasoningResult): Promise<void> {
    this.results.set(result.id, result);

    // ユーザーの履歴に追加
    if (!this.userHistory.has(result.userId)) {
      this.userHistory.set(result.userId, []);
    }
    this.userHistory.get(result.userId)!.push(result.id);
  }

  /**
   * 推論結果を取得
   */
  async getReasoningResult(resultId: string): Promise<ReasoningResult | null> {
    return this.results.get(resultId) || null;
  }

  /**
   * ユーザーの推論履歴を取得
   */
  async getUserReasoningHistory(userId: string): Promise<ReasoningResult[]> {
    const resultIds = this.userHistory.get(userId) || [];
    const results: ReasoningResult[] = [];

    for (const id of resultIds) {
      const result = this.results.get(id);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 推論結果を評価
   */
  async evaluateResult(
    resultId: string,
    evaluation: { rating: number; comments?: string }
  ): Promise<void> {
    if (!this.feedback.has(resultId)) {
      this.feedback.set(resultId, []);
    }
    this.feedback.get(resultId)!.push(evaluation);
  }

  /**
   * フィードバックを記録
   */
  async recordFeedback(resultId: string, feedback: string): Promise<void> {
    if (!this.feedback.has(resultId)) {
      this.feedback.set(resultId, []);
    }
    this.feedback.get(resultId)!.push({
      rating: 0,
      comments: feedback,
    });
  }

  /**
   * 推論統計を取得
   */
  async getReasoningStats(userId: string): Promise<Record<string, unknown>> {
    const history = await this.getUserReasoningHistory(userId);
    const completedCount = history.filter((r) => r.status === 'completed').length;
    const failedCount = history.filter((r) => r.status === 'failed').length;
    const avgRecommendationConfidence =
      history.length > 0
        ? history.reduce((sum, r) => sum + r.recommendation.confidence, 0) /
          history.length
        : 0;

    return {
      totalReasonings: history.length,
      completedReasonings: completedCount,
      failedReasonings: failedCount,
      successRate: history.length > 0 ? completedCount / history.length : 0,
      averageRecommendationConfidence: avgRecommendationConfidence,
    };
  }

  /**
   * 結果を削除
   */
  async deleteResult(resultId: string): Promise<void> {
    this.results.delete(resultId);
    this.feedback.delete(resultId);
  }

  /**
   * ユーザーの全データを削除
   */
  async deleteUserData(userId: string): Promise<void> {
    const resultIds = this.userHistory.get(userId) || [];
    for (const id of resultIds) {
      this.results.delete(id);
      this.feedback.delete(id);
    }
    this.userHistory.delete(userId);
  }
}
