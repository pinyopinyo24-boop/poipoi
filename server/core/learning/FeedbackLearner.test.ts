import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FeedbackLearner, FeedbackType } from './FeedbackLearner';
import { SecurityEngine } from '../security/SecurityEngine';

describe('FeedbackLearner', () => {
  let feedbackLearner: FeedbackLearner;
  let securityEngine: SecurityEngine;
  let userId: string;

  beforeEach(async () => {
    feedbackLearner = FeedbackLearner.getInstance();
    feedbackLearner.clearAllData();
    securityEngine = (feedbackLearner as any).securityEngine;
    if (!securityEngine.isReady()) {
      await securityEngine.initialize();
    }
    userId = 'test-user-' + Date.now();
    await securityEngine.createContext(userId, 'user');
    await securityEngine.grantPermission(userId, 'learning:read');
    await securityEngine.grantPermission(userId, 'learning:write');
    await securityEngine.grantPermission(userId, 'memory:write');
    await securityEngine.grantPermission(userId, 'memory:read');
  });

  afterEach(async () => {
    feedbackLearner.clearAllData();
    if (securityEngine.isReady()) {
      await securityEngine.shutdown();
    }
  });

  describe('Feedback Recording', () => {
    it('should record approval feedback', async () => {
      const feedback = await feedbackLearner.approveAction(userId, 'target-1', 'Good job');

      expect(feedback.type).toBe(FeedbackType.APPROVAL);
      expect(feedback.comment).toBe('Good job');
      expect(feedback.actionTaken).toBe(false);
    });

    it('should record rejection feedback', async () => {
      const feedback = await feedbackLearner.rejectAction(userId, 'target-1', 'Needs improvement');

      expect(feedback.type).toBe(FeedbackType.REJECTION);
      expect(feedback.comment).toBe('Needs improvement');
    });

    it('should record rating feedback', async () => {
      const feedback = await feedbackLearner.rateAction(userId, 'target-1', 4, 'Good work');

      expect(feedback.type).toBe(FeedbackType.RATING);
      expect(feedback.score).toBe(4);
    });

    it('should record suggestion feedback', async () => {
      const feedback = await feedbackLearner.suggestImprovement(userId, 'target-1', 'Try a different approach');

      expect(feedback.type).toBe(FeedbackType.SUGGESTION);
      expect(feedback.comment).toBe('Try a different approach');
    });

    it('should reject invalid rating score', async () => {
      await expect(feedbackLearner.rateAction(userId, 'target-1', 6)).rejects.toThrow(
        'Score must be between 1 and 5'
      );
    });
  });

  describe('Feedback Retrieval', () => {
    it('should get all feedback', async () => {
      await feedbackLearner.approveAction(userId, 'target-1');
      await feedbackLearner.rejectAction(userId, 'target-2');

      const feedbacks = await feedbackLearner.getAllFeedback(userId);

      expect(feedbacks.length).toBe(2);
    });

    it('should get feedback by type', async () => {
      await feedbackLearner.approveAction(userId, 'target-1');
      await feedbackLearner.approveAction(userId, 'target-2');
      await feedbackLearner.rejectAction(userId, 'target-3');

      const approvals = await feedbackLearner.getFeedbackByType(userId, FeedbackType.APPROVAL);
      const rejections = await feedbackLearner.getFeedbackByType(userId, FeedbackType.REJECTION);

      expect(approvals.length).toBe(2);
      expect(rejections.length).toBe(1);
    });
  });

  describe('Feedback Statistics', () => {
    it('should calculate approval rate', async () => {
      await feedbackLearner.approveAction(userId, 'target-1');
      await feedbackLearner.approveAction(userId, 'target-2');
      await feedbackLearner.rejectAction(userId, 'target-3');

      const stats = await feedbackLearner.getFeedbackStatistics(userId);

      expect(stats.approvalRate).toBe(2 / 3);
      expect(stats.rejectionRate).toBe(1 / 3);
    });

    it('should calculate average rating', async () => {
      await feedbackLearner.rateAction(userId, 'target-1', 5);
      await feedbackLearner.rateAction(userId, 'target-2', 3);
      await feedbackLearner.rateAction(userId, 'target-3', 4);

      const stats = await feedbackLearner.getFeedbackStatistics(userId);

      expect(stats.averageRating).toBe(4);
    });

    it('should count suggestions', async () => {
      await feedbackLearner.suggestImprovement(userId, 'target-1', 'Suggestion 1');
      await feedbackLearner.suggestImprovement(userId, 'target-2', 'Suggestion 2');
      await feedbackLearner.approveAction(userId, 'target-3');

      const stats = await feedbackLearner.getFeedbackStatistics(userId);

      expect(stats.suggestionCount).toBe(2);
    });

    it('should handle empty feedback', async () => {
      const stats = await feedbackLearner.getFeedbackStatistics(userId);

      expect(stats.totalFeedback).toBe(0);
      expect(stats.approvalRate).toBe(0);
      expect(stats.averageRating).toBe(0);
    });
  });

  describe('Feedback Actions', () => {
    it('should mark feedback as acted upon', async () => {
      const feedback = await feedbackLearner.approveAction(userId, 'target-1');

      await feedbackLearner.markAsActedUpon(userId, feedback.id);

      const allFeedback = await feedbackLearner.getAllFeedback(userId);
      const markedFeedback = allFeedback.find((f) => f.id === feedback.id);

      expect(markedFeedback?.actionTaken).toBe(true);
    });

    it('should get unacted feedback', async () => {
      const feedback1 = await feedbackLearner.approveAction(userId, 'target-1');
      const feedback2 = await feedbackLearner.rejectAction(userId, 'target-2');

      await feedbackLearner.markAsActedUpon(userId, feedback1.id);

      const unacted = await feedbackLearner.getUnactedFeedback(userId);

      expect(unacted.length).toBe(1);
      expect(unacted[0].id).toBe(feedback2.id);
    });
  });

  describe('Permission Checks', () => {
    it('should throw error if user lacks write permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(feedbackLearner.approveAction(unauthorizedUser, 'target-1')).rejects.toThrow(
        'User does not have permission to record feedback'
      );
    });

    it('should throw error if user lacks read permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(feedbackLearner.getAllFeedback(unauthorizedUser)).rejects.toThrow(
        'User does not have permission to read feedback'
      );
    });
  });

  describe('Data Clearing', () => {
    it('should clear all data', async () => {
      await feedbackLearner.approveAction(userId, 'target-1');
      await feedbackLearner.rejectAction(userId, 'target-2');

      feedbackLearner.clearAllData();

      const feedbacks = await feedbackLearner.getAllFeedback(userId);

      expect(feedbacks.length).toBe(0);
    });
  });

  describe('Multiple Users', () => {
    it('should isolate feedback by user', async () => {
      const user2 = 'test-user-2-' + Date.now();
      await securityEngine.createContext(user2, 'user');
      await securityEngine.grantPermission(user2, 'learning:read');
      await securityEngine.grantPermission(user2, 'learning:write');
      await securityEngine.grantPermission(user2, 'memory:write');
      await securityEngine.grantPermission(user2, 'memory:read');

      await feedbackLearner.approveAction(userId, 'target-1');
      await feedbackLearner.rejectAction(user2, 'target-2');

      const user1Feedback = await feedbackLearner.getAllFeedback(userId);
      const user2Feedback = await feedbackLearner.getAllFeedback(user2);

      expect(user1Feedback.length).toBe(1);
      expect(user1Feedback[0].type).toBe(FeedbackType.APPROVAL);
      expect(user2Feedback.length).toBe(1);
      expect(user2Feedback[0].type).toBe(FeedbackType.REJECTION);
    });
  });
});
