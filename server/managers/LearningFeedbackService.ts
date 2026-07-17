/**
 * LearningFeedbackService
 * ユーザーフィードバック学習・回答改善・知識更新
 */

export interface UserFeedback {
  feedbackId: string;
  responseId: string;
  timestamp: number;
  userId: string;
  rating: number; // 1-5
  comment?: string;
  feedbackType: 'positive' | 'negative' | 'neutral';
  category: 'accuracy' | 'relevance' | 'clarity' | 'completeness' | 'other';
}

export interface LearningRecord {
  recordId: string;
  timestamp: number;
  feedbackId: string;
  responseId: string;
  learningType: 'correction' | 'enhancement' | 'clarification' | 'expansion';
  originalContent: string;
  improvedContent: string;
  improvementScore: number; // 0-100
  status: 'pending' | 'applied' | 'rejected';
}

export interface KnowledgeUpdate {
  updateId: string;
  timestamp: number;
  topic: string;
  originalKnowledge: string;
  updatedKnowledge: string;
  source: 'feedback' | 'manual' | 'external';
  confidence: number; // 0-100
  status: 'pending' | 'approved' | 'applied' | 'rejected';
}

export class LearningFeedbackService {
  private feedbacks: Map<string, UserFeedback> = new Map();
  private learnings: Map<string, LearningRecord> = new Map();
  private knowledgeUpdates: Map<string, KnowledgeUpdate> = new Map();
  private feedbacksByResponse: Map<string, string[]> = new Map();
  private learningsByFeedback: Map<string, string[]> = new Map();
  private updatesByTopic: Map<string, string[]> = new Map();
  private updatesByStatus: Map<string, string[]> = new Map();

  /**
   * ユーザーフィードバックを記録
   */
  recordUserFeedback(
    responseId: string,
    userId: string,
    rating: number,
    category: 'accuracy' | 'relevance' | 'clarity' | 'completeness' | 'other',
    comment?: string
  ): UserFeedback {
    const feedbackId = `UF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let feedbackType: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (rating >= 4) {
      feedbackType = 'positive';
    } else if (rating <= 2) {
      feedbackType = 'negative';
    }

    const feedback: UserFeedback = {
      feedbackId,
      responseId,
      timestamp: Date.now(),
      userId,
      rating,
      comment,
      feedbackType,
      category,
    };

    this.feedbacks.set(feedbackId, feedback);

    if (!this.feedbacksByResponse.has(responseId)) {
      this.feedbacksByResponse.set(responseId, []);
    }
    this.feedbacksByResponse.get(responseId)!.push(feedbackId);

    return feedback;
  }

  /**
   * フィードバックを取得
   */
  getUserFeedback(feedbackId: string): UserFeedback | undefined {
    return this.feedbacks.get(feedbackId);
  }

  /**
   * レスポンス別フィードバックを取得
   */
  getFeedbacksByResponse(responseId: string): UserFeedback[] {
    const ids = this.feedbacksByResponse.get(responseId) || [];
    return ids
      .map(id => this.feedbacks.get(id))
      .filter((f): f is UserFeedback => f !== undefined);
  }

  /**
   * 学習記録を作成
   */
  createLearningRecord(
    feedbackId: string,
    responseId: string,
    learningType: 'correction' | 'enhancement' | 'clarification' | 'expansion',
    originalContent: string,
    improvedContent: string,
    improvementScore: number
  ): LearningRecord {
    const recordId = `LR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const record: LearningRecord = {
      recordId,
      timestamp: Date.now(),
      feedbackId,
      responseId,
      learningType,
      originalContent,
      improvedContent,
      improvementScore,
      status: 'pending',
    };

    this.learnings.set(recordId, record);

    if (!this.learningsByFeedback.has(feedbackId)) {
      this.learningsByFeedback.set(feedbackId, []);
    }
    this.learningsByFeedback.get(feedbackId)!.push(recordId);

    return record;
  }

  /**
   * 学習記録を取得
   */
  getLearningRecord(recordId: string): LearningRecord | undefined {
    return this.learnings.get(recordId);
  }

  /**
   * フィードバック別学習記録を取得
   */
  getLearningsByFeedback(feedbackId: string): LearningRecord[] {
    const ids = this.learningsByFeedback.get(feedbackId) || [];
    return ids
      .map(id => this.learnings.get(id))
      .filter((l): l is LearningRecord => l !== undefined);
  }

  /**
   * 学習を適用
   */
  applyLearning(recordId: string): boolean {
    const record = this.learnings.get(recordId);
    if (!record) return false;

    record.status = 'applied';
    return true;
  }

  /**
   * 知識更新を作成
   */
  createKnowledgeUpdate(
    topic: string,
    originalKnowledge: string,
    updatedKnowledge: string,
    source: 'feedback' | 'manual' | 'external',
    confidence: number
  ): KnowledgeUpdate {
    const updateId = `KU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const update: KnowledgeUpdate = {
      updateId,
      timestamp: Date.now(),
      topic,
      originalKnowledge,
      updatedKnowledge,
      source,
      confidence,
      status: 'pending',
    };

    this.knowledgeUpdates.set(updateId, update);

    if (!this.updatesByTopic.has(topic)) {
      this.updatesByTopic.set(topic, []);
    }
    this.updatesByTopic.get(topic)!.push(updateId);

    if (!this.updatesByStatus.has('pending')) {
      this.updatesByStatus.set('pending', []);
    }
    this.updatesByStatus.get('pending')!.push(updateId);

    return update;
  }

  /**
   * 知識更新を取得
   */
  getKnowledgeUpdate(updateId: string): KnowledgeUpdate | undefined {
    return this.knowledgeUpdates.get(updateId);
  }

  /**
   * トピック別更新を取得
   */
  getUpdatesByTopic(topic: string): KnowledgeUpdate[] {
    const ids = this.updatesByTopic.get(topic) || [];
    return ids
      .map(id => this.knowledgeUpdates.get(id))
      .filter((u): u is KnowledgeUpdate => u !== undefined);
  }

  /**
   * ステータス別更新を取得
   */
  getUpdatesByStatus(status: 'pending' | 'approved' | 'applied' | 'rejected'): KnowledgeUpdate[] {
    const ids = this.updatesByStatus.get(status) || [];
    return ids
      .map(id => this.knowledgeUpdates.get(id))
      .filter((u): u is KnowledgeUpdate => u !== undefined);
  }

  /**
   * 知識更新を承認
   */
  approveKnowledgeUpdate(updateId: string): boolean {
    const update = this.knowledgeUpdates.get(updateId);
    if (!update) return false;

    const pendingIds = this.updatesByStatus.get('pending') || [];
    const index = pendingIds.indexOf(updateId);
    if (index > -1) {
      pendingIds.splice(index, 1);
    }

    update.status = 'approved';

    if (!this.updatesByStatus.has('approved')) {
      this.updatesByStatus.set('approved', []);
    }
    this.updatesByStatus.get('approved')!.push(updateId);

    return true;
  }

  /**
   * 知識更新を適用
   */
  applyKnowledgeUpdate(updateId: string): boolean {
    const update = this.knowledgeUpdates.get(updateId);
    if (!update) return false;

    const approvedIds = this.updatesByStatus.get('approved') || [];
    const index = approvedIds.indexOf(updateId);
    if (index > -1) {
      approvedIds.splice(index, 1);
    }

    update.status = 'applied';

    if (!this.updatesByStatus.has('applied')) {
      this.updatesByStatus.set('applied', []);
    }
    this.updatesByStatus.get('applied')!.push(updateId);

    return true;
  }

  /**
   * 全フィードバックを取得
   */
  getAllFeedbacks(): UserFeedback[] {
    return Array.from(this.feedbacks.values());
  }

  /**
   * 全学習記録を取得
   */
  getAllLearnings(): LearningRecord[] {
    return Array.from(this.learnings.values());
  }

  /**
   * 全知識更新を取得
   */
  getAllKnowledgeUpdates(): KnowledgeUpdate[] {
    return Array.from(this.knowledgeUpdates.values());
  }

  /**
   * 学習統計を計算
   */
  getLearningStats(): {
    totalFeedbacks: number;
    positiveFeedbacks: number;
    negativeFeedbacks: number;
    averageRating: number;
    totalLearnings: number;
    appliedLearnings: number;
    totalKnowledgeUpdates: number;
    appliedUpdates: number;
    averageConfidence: number;
  } {
    const allFeedbacks = Array.from(this.feedbacks.values());
    const allLearnings = Array.from(this.learnings.values());
    const allUpdates = Array.from(this.knowledgeUpdates.values());

    let totalRating = 0;
    let totalConfidence = 0;

    for (const feedback of allFeedbacks) {
      totalRating += feedback.rating;
    }

    for (const update of allUpdates) {
      totalConfidence += update.confidence;
    }

    return {
      totalFeedbacks: allFeedbacks.length,
      positiveFeedbacks: allFeedbacks.filter(f => f.feedbackType === 'positive').length,
      negativeFeedbacks: allFeedbacks.filter(f => f.feedbackType === 'negative').length,
      averageRating: allFeedbacks.length > 0 ? totalRating / allFeedbacks.length : 0,
      totalLearnings: allLearnings.length,
      appliedLearnings: allLearnings.filter(l => l.status === 'applied').length,
      totalKnowledgeUpdates: allUpdates.length,
      appliedUpdates: allUpdates.filter(u => u.status === 'applied').length,
      averageConfidence: allUpdates.length > 0 ? totalConfidence / allUpdates.length : 0,
    };
  }

  /**
   * フィードバックを削除
   */
  deleteFeedback(feedbackId: string): boolean {
    const feedback = this.feedbacks.get(feedbackId);
    if (!feedback) return false;

    const responseIds = this.feedbacksByResponse.get(feedback.responseId) || [];
    const index = responseIds.indexOf(feedbackId);
    if (index > -1) {
      responseIds.splice(index, 1);
    }

    this.feedbacks.delete(feedbackId);
    return true;
  }

  /**
   * 学習記録を削除
   */
  deleteLearning(recordId: string): boolean {
    const record = this.learnings.get(recordId);
    if (!record) return false;

    const feedbackIds = this.learningsByFeedback.get(record.feedbackId) || [];
    const index = feedbackIds.indexOf(recordId);
    if (index > -1) {
      feedbackIds.splice(index, 1);
    }

    this.learnings.delete(recordId);
    return true;
  }

  /**
   * 知識更新を削除
   */
  deleteKnowledgeUpdate(updateId: string): boolean {
    const update = this.knowledgeUpdates.get(updateId);
    if (!update) return false;

    const topicIds = this.updatesByTopic.get(update.topic) || [];
    const topicIndex = topicIds.indexOf(updateId);
    if (topicIndex > -1) {
      topicIds.splice(topicIndex, 1);
    }

    const statusIds = this.updatesByStatus.get(update.status) || [];
    const statusIndex = statusIds.indexOf(updateId);
    if (statusIndex > -1) {
      statusIds.splice(statusIndex, 1);
    }

    this.knowledgeUpdates.delete(updateId);
    return true;
  }
}
