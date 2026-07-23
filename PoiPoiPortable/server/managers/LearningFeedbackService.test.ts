import { describe, it, expect, beforeEach } from 'vitest';
import { LearningFeedbackService } from './LearningFeedbackService';

describe('LearningFeedbackService', () => {
  let service: LearningFeedbackService;

  beforeEach(() => {
    service = new LearningFeedbackService();
  });

  describe('recordUserFeedback', () => {
    it('should record user feedback', () => {
      const feedback = service.recordUserFeedback('resp-1', 'user-1', 5, 'accuracy', 'Great answer');

      expect(feedback).toBeDefined();
      expect(feedback.feedbackId).toMatch(/^UF-/);
      expect(feedback.feedbackType).toBe('positive');
    });

    it('should classify negative feedback', () => {
      const feedback = service.recordUserFeedback('resp-1', 'user-1', 1, 'accuracy', 'Wrong answer');

      expect(feedback.feedbackType).toBe('negative');
    });

    it('should classify neutral feedback', () => {
      const feedback = service.recordUserFeedback('resp-1', 'user-1', 3, 'accuracy', 'Okay');

      expect(feedback.feedbackType).toBe('neutral');
    });
  });

  describe('getUserFeedback', () => {
    it('should retrieve user feedback', () => {
      const created = service.recordUserFeedback('resp-1', 'user-1', 5, 'accuracy');
      const retrieved = service.getUserFeedback(created.feedbackId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.rating).toBe(5);
    });
  });

  describe('getFeedbacksByResponse', () => {
    it('should retrieve feedbacks by response', () => {
      service.recordUserFeedback('resp-1', 'user-1', 5, 'accuracy');
      service.recordUserFeedback('resp-1', 'user-2', 4, 'clarity');

      const feedbacks = service.getFeedbacksByResponse('resp-1');
      expect(feedbacks.length).toBe(2);
    });
  });

  describe('createLearningRecord', () => {
    it('should create a learning record', () => {
      const feedback = service.recordUserFeedback('resp-1', 'user-1', 5, 'accuracy');
      const record = service.createLearningRecord(
        feedback.feedbackId,
        'resp-1',
        'enhancement',
        'Original',
        'Enhanced',
        85
      );

      expect(record).toBeDefined();
      expect(record.recordId).toMatch(/^LR-/);
      expect(record.status).toBe('pending');
    });
  });

  describe('getLearningRecord', () => {
    it('should retrieve a learning record', () => {
      const feedback = service.recordUserFeedback('resp-1', 'user-1', 5, 'accuracy');
      const created = service.createLearningRecord(
        feedback.feedbackId,
        'resp-1',
        'enhancement',
        'Original',
        'Enhanced',
        85
      );
      const retrieved = service.getLearningRecord(created.recordId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.learningType).toBe('enhancement');
    });
  });

  describe('applyLearning', () => {
    it('should apply learning', () => {
      const feedback = service.recordUserFeedback('resp-1', 'user-1', 5, 'accuracy');
      const record = service.createLearningRecord(
        feedback.feedbackId,
        'resp-1',
        'enhancement',
        'Original',
        'Enhanced',
        85
      );

      const result = service.applyLearning(record.recordId);

      expect(result).toBe(true);

      const updated = service.getLearningRecord(record.recordId);
      expect(updated?.status).toBe('applied');
    });
  });

  describe('createKnowledgeUpdate', () => {
    it('should create a knowledge update', () => {
      const update = service.createKnowledgeUpdate(
        'AI',
        'Old knowledge',
        'New knowledge',
        'feedback',
        90
      );

      expect(update).toBeDefined();
      expect(update.updateId).toMatch(/^KU-/);
      expect(update.status).toBe('pending');
    });
  });

  describe('getKnowledgeUpdate', () => {
    it('should retrieve a knowledge update', () => {
      const created = service.createKnowledgeUpdate(
        'AI',
        'Old knowledge',
        'New knowledge',
        'feedback',
        90
      );
      const retrieved = service.getKnowledgeUpdate(created.updateId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.topic).toBe('AI');
    });
  });

  describe('getUpdatesByTopic', () => {
    it('should retrieve updates by topic', () => {
      service.createKnowledgeUpdate('AI', 'Old1', 'New1', 'feedback', 90);
      service.createKnowledgeUpdate('AI', 'Old2', 'New2', 'manual', 85);

      const updates = service.getUpdatesByTopic('AI');
      expect(updates.length).toBe(2);
    });
  });

  describe('getUpdatesByStatus', () => {
    it('should retrieve updates by status', () => {
      service.createKnowledgeUpdate('AI', 'Old1', 'New1', 'feedback', 90);
      service.createKnowledgeUpdate('ML', 'Old2', 'New2', 'manual', 85);

      const pending = service.getUpdatesByStatus('pending');
      expect(pending.length).toBe(2);
    });
  });

  describe('approveKnowledgeUpdate', () => {
    it('should approve a knowledge update', () => {
      const update = service.createKnowledgeUpdate(
        'AI',
        'Old knowledge',
        'New knowledge',
        'feedback',
        90
      );

      const result = service.approveKnowledgeUpdate(update.updateId);

      expect(result).toBe(true);

      const approved = service.getKnowledgeUpdate(update.updateId);
      expect(approved?.status).toBe('approved');
    });
  });

  describe('applyKnowledgeUpdate', () => {
    it('should apply a knowledge update', () => {
      const update = service.createKnowledgeUpdate(
        'AI',
        'Old knowledge',
        'New knowledge',
        'feedback',
        90
      );
      service.approveKnowledgeUpdate(update.updateId);

      const result = service.applyKnowledgeUpdate(update.updateId);

      expect(result).toBe(true);

      const applied = service.getKnowledgeUpdate(update.updateId);
      expect(applied?.status).toBe('applied');
    });
  });

  describe('getAllFeedbacks', () => {
    it('should retrieve all feedbacks', () => {
      service.recordUserFeedback('resp-1', 'user-1', 5, 'accuracy');
      service.recordUserFeedback('resp-2', 'user-2', 4, 'clarity');

      const all = service.getAllFeedbacks();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllLearnings', () => {
    it('should retrieve all learnings', () => {
      const feedback1 = service.recordUserFeedback('resp-1', 'user-1', 5, 'accuracy');
      const feedback2 = service.recordUserFeedback('resp-2', 'user-2', 4, 'clarity');

      service.createLearningRecord(feedback1.feedbackId, 'resp-1', 'enhancement', 'Old', 'New', 85);
      service.createLearningRecord(feedback2.feedbackId, 'resp-2', 'correction', 'Old', 'New', 90);

      const all = service.getAllLearnings();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllKnowledgeUpdates', () => {
    it('should retrieve all knowledge updates', () => {
      service.createKnowledgeUpdate('AI', 'Old1', 'New1', 'feedback', 90);
      service.createKnowledgeUpdate('ML', 'Old2', 'New2', 'manual', 85);

      const all = service.getAllKnowledgeUpdates();
      expect(all.length).toBe(2);
    });
  });

  describe('getLearningStats', () => {
    it('should calculate learning statistics', () => {
      service.recordUserFeedback('resp-1', 'user-1', 5, 'accuracy');
      service.recordUserFeedback('resp-2', 'user-2', 1, 'clarity');
      service.createKnowledgeUpdate('AI', 'Old', 'New', 'feedback', 90);

      const stats = service.getLearningStats();

      expect(stats.totalFeedbacks).toBe(2);
      expect(stats.positiveFeedbacks).toBe(1);
      expect(stats.negativeFeedbacks).toBe(1);
      expect(stats.averageRating).toBe(3);
      expect(stats.totalKnowledgeUpdates).toBe(1);
    });
  });

  describe('deleteFeedback', () => {
    it('should delete feedback', () => {
      const feedback = service.recordUserFeedback('resp-1', 'user-1', 5, 'accuracy');
      const result = service.deleteFeedback(feedback.feedbackId);

      expect(result).toBe(true);
      expect(service.getUserFeedback(feedback.feedbackId)).toBeUndefined();
    });
  });

  describe('deleteLearning', () => {
    it('should delete learning', () => {
      const feedback = service.recordUserFeedback('resp-1', 'user-1', 5, 'accuracy');
      const record = service.createLearningRecord(
        feedback.feedbackId,
        'resp-1',
        'enhancement',
        'Old',
        'New',
        85
      );

      const result = service.deleteLearning(record.recordId);

      expect(result).toBe(true);
      expect(service.getLearningRecord(record.recordId)).toBeUndefined();
    });
  });

  describe('deleteKnowledgeUpdate', () => {
    it('should delete knowledge update', () => {
      const update = service.createKnowledgeUpdate('AI', 'Old', 'New', 'feedback', 90);
      const result = service.deleteKnowledgeUpdate(update.updateId);

      expect(result).toBe(true);
      expect(service.getKnowledgeUpdate(update.updateId)).toBeUndefined();
    });
  });
});
