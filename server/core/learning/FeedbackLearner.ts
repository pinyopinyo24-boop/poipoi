import { SecurityEngine } from '../security/SecurityEngine';
import { MemoryEngine } from '../memory/MemoryEngine';

/**
 * Feedback Type
 */
export enum FeedbackType {
  APPROVAL = 'approval',
  REJECTION = 'rejection',
  SUGGESTION = 'suggestion',
  RATING = 'rating',
}

/**
 * Feedback
 */
export interface Feedback {
  id: string;
  userId: string;
  targetId: string;
  type: FeedbackType;
  score?: number; // 1-5 for rating
  comment?: string;
  timestamp: number;
  actionTaken?: boolean;
}

/**
 * Feedback Statistics
 */
export interface FeedbackStatistics {
  totalFeedback: number;
  approvalRate: number;
  rejectionRate: number;
  averageRating: number;
  suggestionCount: number;
}

/**
 * Feedback Learner
 */
export class FeedbackLearner {
  private static instance: FeedbackLearner;
  private securityEngine: SecurityEngine;
  private memoryEngine: MemoryEngine;
  private feedbacks: Map<string, Feedback[]>;

  private constructor() {
    this.securityEngine = new SecurityEngine();
    this.memoryEngine = MemoryEngine.getInstance();
    this.feedbacks = new Map();
  }

  public static getInstance(): FeedbackLearner {
    if (!FeedbackLearner.instance) {
      FeedbackLearner.instance = new FeedbackLearner();
    }
    return FeedbackLearner.instance;
  }

  /**
   * Record feedback
   */
  public async recordFeedback(
    userId: string,
    targetId: string,
    type: FeedbackType,
    score?: number,
    comment?: string
  ): Promise<Feedback> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'learning:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to record feedback');
    }

    const feedback: Feedback = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      targetId,
      type,
      score,
      comment,
      timestamp: Date.now(),
      actionTaken: false,
    };

    if (!this.feedbacks.has(userId)) {
      this.feedbacks.set(userId, []);
    }
    this.feedbacks.get(userId)!.push(feedback);

    // Save to memory
    await this.memoryEngine.setMemory(userId, `feedback_${feedback.id}`, feedback);

    return feedback;
  }

  /**
   * Approve action
   */
  public async approveAction(userId: string, targetId: string, comment?: string): Promise<Feedback> {
    return this.recordFeedback(userId, targetId, FeedbackType.APPROVAL, undefined, comment);
  }

  /**
   * Reject action
   */
  public async rejectAction(userId: string, targetId: string, comment?: string): Promise<Feedback> {
    return this.recordFeedback(userId, targetId, FeedbackType.REJECTION, undefined, comment);
  }

  /**
   * Rate action
   */
  public async rateAction(userId: string, targetId: string, score: number, comment?: string): Promise<Feedback> {
    if (score < 1 || score > 5) {
      throw new Error('Score must be between 1 and 5');
    }
    return this.recordFeedback(userId, targetId, FeedbackType.RATING, score, comment);
  }

  /**
   * Suggest improvement
   */
  public async suggestImprovement(userId: string, targetId: string, suggestion: string): Promise<Feedback> {
    return this.recordFeedback(userId, targetId, FeedbackType.SUGGESTION, undefined, suggestion);
  }

  /**
   * Mark feedback as acted upon
   */
  public async markAsActedUpon(userId: string, feedbackId: string): Promise<void> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'learning:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to mark feedback');
    }

    const userFeedbacks = this.feedbacks.get(userId);
    if (!userFeedbacks) {
      throw new Error('No feedbacks found for user');
    }

    const feedback = userFeedbacks.find((f) => f.id === feedbackId);
    if (!feedback) {
      throw new Error('Feedback not found');
    }

    feedback.actionTaken = true;
  }

  /**
   * Get all feedback for user
   */
  public async getAllFeedback(userId: string): Promise<Feedback[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'learning:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read feedback');
    }

    return this.feedbacks.get(userId) || [];
  }

  /**
   * Get feedback by type
   */
  public async getFeedbackByType(userId: string, type: FeedbackType): Promise<Feedback[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'learning:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read feedback');
    }

    const userFeedbacks = this.feedbacks.get(userId) || [];
    return userFeedbacks.filter((f) => f.type === type);
  }

  /**
   * Get feedback statistics
   */
  public async getFeedbackStatistics(userId: string): Promise<FeedbackStatistics> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'learning:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read feedback statistics');
    }

    const userFeedbacks = this.feedbacks.get(userId) || [];

    if (userFeedbacks.length === 0) {
      return {
        totalFeedback: 0,
        approvalRate: 0,
        rejectionRate: 0,
        averageRating: 0,
        suggestionCount: 0,
      };
    }

    const approvalCount = userFeedbacks.filter((f) => f.type === FeedbackType.APPROVAL).length;
    const rejectionCount = userFeedbacks.filter((f) => f.type === FeedbackType.REJECTION).length;
    const ratings = userFeedbacks.filter((f) => f.type === FeedbackType.RATING && f.score);
    const suggestionCount = userFeedbacks.filter((f) => f.type === FeedbackType.SUGGESTION).length;

    const averageRating =
      ratings.length > 0 ? ratings.reduce((sum, f) => sum + (f.score || 0), 0) / ratings.length : 0;

    return {
      totalFeedback: userFeedbacks.length,
      approvalRate: approvalCount / userFeedbacks.length,
      rejectionRate: rejectionCount / userFeedbacks.length,
      averageRating,
      suggestionCount,
    };
  }

  /**
   * Get unacted feedback
   */
  public async getUnactedFeedback(userId: string): Promise<Feedback[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'learning:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read feedback');
    }

    const userFeedbacks = this.feedbacks.get(userId) || [];
    return userFeedbacks.filter((f) => !f.actionTaken);
  }

  /**
   * Clear all data (for testing)
   */
  public clearAllData(): void {
    this.feedbacks.clear();
  }
}
