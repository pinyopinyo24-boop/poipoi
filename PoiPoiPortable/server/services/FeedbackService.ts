/**
 * FeedbackService - ユーザーフィードバック管理
 */
export interface UserFeedback {
  id: string;
  userId: string;
  rating: number; // 1-5
  comment: string;
  category: 'feature' | 'performance' | 'ui' | 'security' | 'other';
  tags: string[];
  createdAt: Date;
  isAnonymous: boolean;
}

export class FeedbackService {
  /**
   * フィードバックを収集
   */
  async collectFeedback(userId: string): Promise<UserFeedback[]> {
    // ここで実際のデータベースクエリを実行
    // デモンストレーション用のダミーデータを返す
    return [
      {
        id: '1',
        userId,
        rating: 4,
        comment: 'Great AI features, but sometimes slow',
        category: 'performance',
        tags: ['speed', 'ai'],
        createdAt: new Date(Date.now() - 86400000),
        isAnonymous: false,
      },
      {
        id: '2',
        userId,
        rating: 5,
        comment: 'Love the document generation feature',
        category: 'feature',
        tags: ['documents', 'productivity'],
        createdAt: new Date(Date.now() - 172800000),
        isAnonymous: false,
      },
      {
        id: '3',
        userId,
        rating: 3,
        comment: 'UI could be more intuitive',
        category: 'ui',
        tags: ['ux', 'design'],
        createdAt: new Date(Date.now() - 259200000),
        isAnonymous: false,
      },
    ];
  }

  /**
   * フィードバックを作成
   */
  async createFeedback(
    userId: string,
    rating: number,
    comment: string,
    category: string,
    tags: string[] = [],
    isAnonymous = false
  ): Promise<UserFeedback> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    return {
      id: `feedback_${Date.now()}`,
      userId,
      rating,
      comment,
      category: category as any,
      tags,
      createdAt: new Date(),
      isAnonymous,
    };
  }

  /**
   * フィードバックを取得
   */
  async getFeedback(feedbackId: string): Promise<UserFeedback | null> {
    // ここで実際のデータベースクエリを実行
    return null;
  }

  /**
   * ユーザーのフィードバック履歴を取得
   */
  async getUserFeedbackHistory(userId: string, limit = 50): Promise<UserFeedback[]> {
    const feedback = await this.collectFeedback(userId);
    return feedback.slice(0, limit);
  }

  /**
   * フィードバックを更新
   */
  async updateFeedback(
    feedbackId: string,
    updates: Partial<UserFeedback>
  ): Promise<UserFeedback | null> {
    // ここで実際のデータベース更新を実行
    return null;
  }

  /**
   * フィードバックを削除
   */
  async deleteFeedback(feedbackId: string): Promise<boolean> {
    // ここで実際のデータベース削除を実行
    return true;
  }

  /**
   * カテゴリ別フィードバックを取得
   */
  async getFeedbackByCategory(userId: string, category: string): Promise<UserFeedback[]> {
    const feedback = await this.collectFeedback(userId);
    return feedback.filter(f => f.category === category);
  }

  /**
   * 高評価フィードバックを取得
   */
  async getPositiveFeedback(userId: string): Promise<UserFeedback[]> {
    const feedback = await this.collectFeedback(userId);
    return feedback.filter(f => f.rating >= 4);
  }

  /**
   * 低評価フィードバックを取得
   */
  async getNegativeFeedback(userId: string): Promise<UserFeedback[]> {
    const feedback = await this.collectFeedback(userId);
    return feedback.filter(f => f.rating <= 2);
  }

  /**
   * タグでフィードバックを検索
   */
  async searchFeedbackByTag(userId: string, tag: string): Promise<UserFeedback[]> {
    const feedback = await this.collectFeedback(userId);
    return feedback.filter(f => f.tags.includes(tag));
  }

  /**
   * フィードバック統計を取得
   */
  async getFeedbackStats(userId: string) {
    const feedback = await this.collectFeedback(userId);

    const stats = {
      totalFeedback: feedback.length,
      averageRating: feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length,
      ratingDistribution: {
        5: feedback.filter(f => f.rating === 5).length,
        4: feedback.filter(f => f.rating === 4).length,
        3: feedback.filter(f => f.rating === 3).length,
        2: feedback.filter(f => f.rating === 2).length,
        1: feedback.filter(f => f.rating === 1).length,
      },
      categoryDistribution: {} as Record<string, number>,
      topTags: this.getTopTags(feedback),
    };

    // カテゴリ分布を計算
    feedback.forEach(f => {
      stats.categoryDistribution[f.category] = (stats.categoryDistribution[f.category] || 0) + 1;
    });

    return stats;
  }

  /**
   * トップタグを取得
   */
  private getTopTags(feedback: UserFeedback[], limit = 10): string[] {
    const tagCounts: Record<string, number> = {};

    feedback.forEach(f => {
      f.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag);
  }

  /**
   * フィードバック要約を生成
   */
  async generateSummary(userId: string): Promise<string> {
    const feedback = await this.collectFeedback(userId);
    const stats = await this.getFeedbackStats(userId);

    return `
Feedback Summary for ${userId}:
- Total Feedback: ${stats.totalFeedback}
- Average Rating: ${stats.averageRating.toFixed(2)}/5
- Most Common Category: ${Object.entries(stats.categoryDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
- Top Tags: ${stats.topTags.join(', ')}
- Positive Feedback: ${stats.ratingDistribution[5] + stats.ratingDistribution[4]} items
- Negative Feedback: ${stats.ratingDistribution[1] + stats.ratingDistribution[2]} items
    `.trim();
  }
}
