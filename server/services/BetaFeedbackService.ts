/**
 * Beta Feedback Service
 * ベータテスター向けフィードバック管理
 */

export type FeedbackType = 'bug' | 'feature_request' | 'improvement' | 'other';
export type FeedbackPriority = 'critical' | 'high' | 'medium' | 'low';
export type FeedbackStatus = 'pending' | 'reviewed' | 'in_progress' | 'resolved' | 'wontfix';

export interface BetaFeedback {
  id: string;
  userId: string;
  timestamp: number;
  type: FeedbackType;
  title: string;
  description: string;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  attachments?: string[];
  votes: number;
  responses?: FeedbackResponse[];
  tags?: string[];
}

export interface FeedbackResponse {
  id: string;
  userId: string;
  timestamp: number;
  message: string;
  isStaff: boolean;
}

export interface FeedbackStats {
  totalFeedback: number;
  bugCount: number;
  featureRequestCount: number;
  improvementCount: number;
  resolvedCount: number;
  averageVotes: number;
  topIssues: BetaFeedback[];
}

export class BetaFeedbackService {
  private feedback: Map<string, BetaFeedback[]> = new Map();
  private globalFeedback: BetaFeedback[] = [];
  private maxFeedbackPerUser = 1000;

  /**
   * フィードバックを送信
   */
  submitFeedback(feedback: Omit<BetaFeedback, 'id' | 'votes' | 'responses' | 'status'>): BetaFeedback {
    const feedbackEntry: BetaFeedback = {
      id: `feedback-${Date.now()}-${Math.random()}`,
      ...feedback,
      votes: 0,
      responses: [],
      status: 'pending',
    };

    if (!this.feedback.has(feedback.userId)) {
      this.feedback.set(feedback.userId, []);
    }

    const userFeedback = this.feedback.get(feedback.userId)!;
    userFeedback.push(feedbackEntry);

    // グローバルフィードバックリストに追加
    this.globalFeedback.push(feedbackEntry);

    // 古いフィードバックを削除
    if (userFeedback.length > this.maxFeedbackPerUser) {
      const removed = userFeedback.shift();
      if (removed) {
        const globalIndex = this.globalFeedback.indexOf(removed);
        if (globalIndex > -1) {
          this.globalFeedback.splice(globalIndex, 1);
        }
      }
    }

    return feedbackEntry;
  }

  /**
   * ユーザーのフィードバックを取得
   */
  getUserFeedback(userId: string, limit: number = 100): BetaFeedback[] {
    const feedback = this.feedback.get(userId) || [];
    return feedback.slice(-limit);
  }

  /**
   * フィードバックを取得
   */
  getFeedback(feedbackId: string): BetaFeedback | null {
    return this.globalFeedback.find(f => f.id === feedbackId) || null;
  }

  /**
   * タイプ別フィードバックを取得
   */
  getFeedbackByType(type: FeedbackType, limit: number = 100): BetaFeedback[] {
    return this.globalFeedback
      .filter(f => f.type === type)
      .sort((a, b) => b.votes - a.votes)
      .slice(0, limit);
  }

  /**
   * ステータス別フィードバックを取得
   */
  getFeedbackByStatus(status: FeedbackStatus, limit: number = 100): BetaFeedback[] {
    return this.globalFeedback
      .filter(f => f.status === status)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * フィードバックに投票
   */
  voteFeedback(feedbackId: string): BetaFeedback | null {
    const feedback = this.globalFeedback.find(f => f.id === feedbackId);
    if (feedback) {
      feedback.votes++;
    }
    return feedback || null;
  }

  /**
   * フィードバックにレスポンスを追加
   */
  addResponse(feedbackId: string, response: Omit<FeedbackResponse, 'id'>): BetaFeedback | null {
    const feedback = this.globalFeedback.find(f => f.id === feedbackId);
    if (feedback) {
      if (!feedback.responses) {
        feedback.responses = [];
      }
      feedback.responses.push({
        id: `response-${Date.now()}-${Math.random()}`,
        ...response,
      });
    }
    return feedback || null;
  }

  /**
   * フィードバックのステータスを更新
   */
  updateStatus(feedbackId: string, status: FeedbackStatus): BetaFeedback | null {
    const feedback = this.globalFeedback.find(f => f.id === feedbackId);
    if (feedback) {
      feedback.status = status;
    }
    return feedback || null;
  }

  /**
   * フィードバックの優先度を更新
   */
  updatePriority(feedbackId: string, priority: FeedbackPriority): BetaFeedback | null {
    const feedback = this.globalFeedback.find(f => f.id === feedbackId);
    if (feedback) {
      feedback.priority = priority;
    }
    return feedback || null;
  }

  /**
   * タグを追加
   */
  addTag(feedbackId: string, tag: string): BetaFeedback | null {
    const feedback = this.globalFeedback.find(f => f.id === feedbackId);
    if (feedback) {
      if (!feedback.tags) {
        feedback.tags = [];
      }
      if (!feedback.tags.includes(tag)) {
        feedback.tags.push(tag);
      }
    }
    return feedback || null;
  }

  /**
   * 統計情報を取得
   */
  getStats(): FeedbackStats {
    const bugCount = this.globalFeedback.filter(f => f.type === 'bug').length;
    const featureRequestCount = this.globalFeedback.filter(f => f.type === 'feature_request').length;
    const improvementCount = this.globalFeedback.filter(f => f.type === 'improvement').length;
    const resolvedCount = this.globalFeedback.filter(f => f.status === 'resolved').length;

    const totalVotes = this.globalFeedback.reduce((sum, f) => sum + f.votes, 0);
    const averageVotes = this.globalFeedback.length > 0 ? totalVotes / this.globalFeedback.length : 0;

    const topIssues = this.globalFeedback
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 10);

    return {
      totalFeedback: this.globalFeedback.length,
      bugCount,
      featureRequestCount,
      improvementCount,
      resolvedCount,
      averageVotes,
      topIssues,
    };
  }

  /**
   * 日別フィードバック統計を取得
   */
  getDailyStats(days: number = 7): Record<string, Omit<FeedbackStats, 'topIssues'>> {
    const stats: Record<string, Omit<FeedbackStats, 'topIssues'>> = {};

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = 0; i < days; i++) {
      const dayStart = now - (i + 1) * dayMs;
      const dayEnd = now - i * dayMs;
      const dateKey = new Date(dayStart).toISOString().split('T')[0];

      const dayFeedback = this.globalFeedback.filter(
        f => f.timestamp >= dayStart && f.timestamp < dayEnd
      );

      if (dayFeedback.length > 0) {
        const bugCount = dayFeedback.filter(f => f.type === 'bug').length;
        const featureRequestCount = dayFeedback.filter(f => f.type === 'feature_request').length;
        const improvementCount = dayFeedback.filter(f => f.type === 'improvement').length;
        const resolvedCount = dayFeedback.filter(f => f.status === 'resolved').length;

        const totalVotes = dayFeedback.reduce((sum, f) => sum + f.votes, 0);
        const averageVotes = dayFeedback.length > 0 ? totalVotes / dayFeedback.length : 0;

        stats[dateKey] = {
          totalFeedback: dayFeedback.length,
          bugCount,
          featureRequestCount,
          improvementCount,
          resolvedCount,
          averageVotes,
        };
      }
    }

    return stats;
  }

  /**
   * 高優先度のバグを取得
   */
  getCriticalBugs(): BetaFeedback[] {
    return this.globalFeedback
      .filter(f => f.type === 'bug' && f.priority === 'critical' && f.status !== 'resolved')
      .sort((a, b) => b.votes - a.votes);
  }

  /**
   * 人気のある機能リクエストを取得
   */
  getPopularFeatureRequests(limit: number = 10): BetaFeedback[] {
    return this.globalFeedback
      .filter(f => f.type === 'feature_request')
      .sort((a, b) => b.votes - a.votes)
      .slice(0, limit);
  }

  /**
   * タグ別フィードバックを取得
   */
  getFeedbackByTag(tag: string): BetaFeedback[] {
    return this.globalFeedback.filter(f => f.tags && f.tags.includes(tag));
  }

  /**
   * フィードバックを削除
   */
  deleteFeedback(feedbackId: string): boolean {
    const index = this.globalFeedback.findIndex(f => f.id === feedbackId);
    if (index > -1) {
      const feedback = this.globalFeedback[index];
      this.globalFeedback.splice(index, 1);

      // ユーザーのフィードバックリストからも削除
      const userFeedback = this.feedback.get(feedback.userId);
      if (userFeedback) {
        const userIndex = userFeedback.findIndex(f => f.id === feedbackId);
        if (userIndex > -1) {
          userFeedback.splice(userIndex, 1);
        }
      }

      return true;
    }
    return false;
  }

  /**
   * フィードバックをエクスポート
   */
  exportFeedback(): string {
    return JSON.stringify(this.globalFeedback, null, 2);
  }

  /**
   * フィードバックをインポート
   */
  importFeedback(jsonData: string): number {
    try {
      const feedback = JSON.parse(jsonData) as BetaFeedback[];
      this.globalFeedback = feedback;

      // ユーザー別にグループ化
      this.feedback.clear();
      feedback.forEach(f => {
        if (!this.feedback.has(f.userId)) {
          this.feedback.set(f.userId, []);
        }
        this.feedback.get(f.userId)!.push(f);
      });

      return feedback.length;
    } catch (e) {
      throw new Error('Invalid feedback data format');
    }
  }

  /**
   * 古いフィードバックを削除
   */
  cleanupOldFeedback(daysToKeep: number = 90): number {
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    const initialLength = this.globalFeedback.length;

    this.globalFeedback = this.globalFeedback.filter(f => f.timestamp > cutoffTime);

    // ユーザー別リストも更新
    this.feedback.forEach((feedback, userId) => {
      const filtered = feedback.filter(f => f.timestamp > cutoffTime);
      this.feedback.set(userId, filtered);
    });

    return initialLength - this.globalFeedback.length;
  }
}

// Singleton instance
export const betaFeedbackService = new BetaFeedbackService();
