import { describe, it, expect, beforeEach } from 'vitest';
import { LearningLoopAI, Feedback } from './LearningLoopAI';

describe('LearningLoopAI', () => {
  let ai: LearningLoopAI;

  beforeEach(() => {
    ai = new LearningLoopAI();
  });

  describe('Feedback Recording', () => {
    it('should record feedback', () => {
      const id = ai.recordFeedback({
        sessionId: 'session-1',
        userId: 'user-1',
        questionId: 'q-1',
        responseId: 'r-1',
        rating: 4,
        comment: 'Good response',
      });

      expect(id).toBeDefined();
      expect(id).toMatch(/feedback-\d+/);
    });

    it('should record multiple feedbacks', () => {
      for (let i = 0; i < 5; i++) {
        ai.recordFeedback({
          sessionId: `session-${i}`,
          userId: 'user-1',
          questionId: `q-${i}`,
          responseId: `r-${i}`,
          rating: Math.floor(Math.random() * 5) + 1,
        });
      }

      const history = ai.getFeedbackHistory(10);
      expect(history.length).toBe(5);
    });

    it('should handle different rating values', () => {
      const ratings = [1, 2, 3, 4, 5];

      ratings.forEach((rating) => {
        ai.recordFeedback({
          sessionId: 'session-1',
          userId: 'user-1',
          questionId: `q-${rating}`,
          responseId: `r-${rating}`,
          rating,
        });
      });

      const history = ai.getFeedbackHistory(10);
      expect(history.length).toBe(5);
    });
  });

  describe('Learning Records', () => {
    it('should add learning record', () => {
      const id = ai.addLearningRecord({
        sessionId: 'session-1',
        question: 'What is manufacturing?',
        response: 'Manufacturing is the process...',
        feedback: {
          sessionId: 'session-1',
          userId: 'user-1',
          questionId: 'q-1',
          responseId: 'r-1',
          rating: 4,
          timestamp: Date.now(),
        },
      });

      expect(id).toBeDefined();
      expect(id).toMatch(/learning-\d+-[a-z0-9]{9}/);
    });

    it('should retrieve learning records', () => {
      for (let i = 0; i < 3; i++) {
        ai.addLearningRecord({
          sessionId: `session-${i}`,
          question: `Question ${i}`,
          response: `Response ${i}`,
          feedback: {
            sessionId: `session-${i}`,
            userId: 'user-1',
            questionId: `q-${i}`,
            responseId: `r-${i}`,
            rating: 3,
            timestamp: Date.now(),
          },
        });
      }

      const records = ai.getLearningRecords(10);
      expect(records.length).toBe(3);
    });

    it('should limit learning records', () => {
      for (let i = 0; i < 20; i++) {
        ai.addLearningRecord({
          sessionId: `session-${i}`,
          question: `Question ${i}`,
          response: `Response ${i}`,
          feedback: {
            sessionId: `session-${i}`,
            userId: 'user-1',
            questionId: `q-${i}`,
            responseId: `r-${i}`,
            rating: 3,
            timestamp: Date.now(),
          },
        });
      }

      const records = ai.getLearningRecords(5);
      expect(records.length).toBe(5);
    });
  });

  describe('Quality Score Calculation', () => {
    it('should calculate quality score', () => {
      ai.recordFeedback({
        sessionId: 'session-1',
        userId: 'user-1',
        questionId: 'q-1',
        responseId: 'r-1',
        rating: 4,
      });

      const score = ai.calculateQualityScore('session-1');
      expect(score).toBeDefined();
      expect(score.overallScore).toBeGreaterThan(0);
      expect(score.overallScore).toBeLessThanOrEqual(5);
    });

    it('should return zero score for no feedback', () => {
      const score = ai.calculateQualityScore('non-existent');
      expect(score.overallScore).toBe(0);
    });

    it('should calculate average quality score', () => {
      for (let i = 1; i <= 5; i++) {
        ai.recordFeedback({
          sessionId: 'session-1',
          userId: 'user-1',
          questionId: `q-${i}`,
          responseId: `r-${i}`,
          rating: i,
        });
      }

      const score = ai.calculateQualityScore('session-1');
      expect(score.overallScore).toBeGreaterThan(0);
    });
  });

  describe('Knowledge Gap Detection', () => {
    it('should detect knowledge gaps', () => {
      for (let i = 0; i < 5; i++) {
        ai.recordFeedback({
          sessionId: 'session-1',
          userId: 'user-1',
          questionId: `q-${i}`,
          responseId: `r-${i}`,
          rating: 1,
          category: 'manufacturing',
        });
      }

      const gaps = ai.detectKnowledgeGaps();
      expect(gaps.length).toBeGreaterThan(0);
      expect(gaps[0].topic).toBe('manufacturing');
      expect(gaps[0].frequency).toBe(5);
    });

    it('should prioritize gaps by frequency', () => {
      for (let i = 0; i < 3; i++) {
        ai.recordFeedback({
          sessionId: 'session-1',
          userId: 'user-1',
          questionId: `q-${i}`,
          responseId: `r-${i}`,
          rating: 1,
          category: 'quality',
        });
      }

      for (let i = 0; i < 7; i++) {
        ai.recordFeedback({
          sessionId: 'session-1',
          userId: 'user-1',
          questionId: `q-${i}`,
          responseId: `r-${i}`,
          rating: 1,
          category: 'manufacturing',
        });
      }

      const gaps = ai.detectKnowledgeGaps();
      expect(gaps[0].topic).toBe('manufacturing');
      expect(gaps[0].frequency).toBe(7);
    });

    it('should assign priority levels', () => {
      // High priority (>5)
      for (let i = 0; i < 6; i++) {
        ai.recordFeedback({
          sessionId: 'session-1',
          userId: 'user-1',
          questionId: `q-${i}`,
          responseId: `r-${i}`,
          rating: 1,
          category: 'high-gap',
        });
      }

      const gaps = ai.detectKnowledgeGaps();
      const highGap = gaps.find((g) => g.topic === 'high-gap');
      expect(highGap?.priority).toBe('high');
    });
  });

  describe('Improvement Suggestions', () => {
    it('should generate improvement suggestions', () => {
      for (let i = 0; i < 6; i++) {
        ai.recordFeedback({
          sessionId: 'session-1',
          userId: 'user-1',
          questionId: `q-${i}`,
          responseId: `r-${i}`,
          rating: 1,
          category: 'manufacturing',
        });
      }

      const suggestions = ai.generateImprovementSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should include knowledge-based suggestions', () => {
      for (let i = 0; i < 6; i++) {
        ai.recordFeedback({
          sessionId: 'session-1',
          userId: 'user-1',
          questionId: `q-${i}`,
          responseId: `r-${i}`,
          rating: 1,
          category: 'manufacturing',
        });
      }

      const suggestions = ai.generateImprovementSuggestions();
      const knowledgeSuggestion = suggestions.find((s) => s.type === 'knowledge');
      expect(knowledgeSuggestion).toBeDefined();
    });

    it('should include process-based suggestions for low quality', () => {
      for (let i = 0; i < 10; i++) {
        ai.recordFeedback({
          sessionId: 'session-1',
          userId: 'user-1',
          questionId: `q-${i}`,
          responseId: `r-${i}`,
          rating: 1,
        });
      }

      const suggestions = ai.generateImprovementSuggestions();
      const processSuggestion = suggestions.find((s) => s.type === 'process');
      expect(processSuggestion).toBeDefined();
    });
  });

  describe('Feedback Analysis', () => {
    it('should analyze feedback', () => {
      ai.recordFeedback({
        sessionId: 'session-1',
        userId: 'user-1',
        questionId: 'q-1',
        responseId: 'r-1',
        rating: 4,
      });

      ai.recordFeedback({
        sessionId: 'session-1',
        userId: 'user-1',
        questionId: 'q-2',
        responseId: 'r-2',
        rating: 5,
      });

      const analysis = ai.analyzeFeedback();
      expect(analysis.averageRating).toBe(4.5);
      expect(analysis.totalFeedback).toBe(2);
    });

    it('should calculate rating distribution', () => {
      const ratings = [1, 2, 3, 4, 5];
      ratings.forEach((rating) => {
        ai.recordFeedback({
          sessionId: 'session-1',
          userId: 'user-1',
          questionId: `q-${rating}`,
          responseId: `r-${rating}`,
          rating,
        });
      });

      const analysis = ai.analyzeFeedback();
      expect(analysis.ratingDistribution[1]).toBe(1);
      expect(analysis.ratingDistribution[5]).toBe(1);
    });

    it('should calculate improvement rate', () => {
      ai.recordFeedback({
        sessionId: 'session-1',
        userId: 'user-1',
        questionId: 'q-1',
        responseId: 'r-1',
        rating: 2,
      });

      ai.recordFeedback({
        sessionId: 'session-1',
        userId: 'user-1',
        questionId: 'q-2',
        responseId: 'r-2',
        rating: 4,
      });

      const analysis = ai.analyzeFeedback();
      expect(analysis.improvementRate).toBeGreaterThan(0);
    });
  });

  describe('Learning Cycle', () => {
    it('should execute learning cycle', () => {
      for (let i = 0; i < 5; i++) {
        ai.recordFeedback({
          sessionId: 'session-1',
          userId: 'user-1',
          questionId: `q-${i}`,
          responseId: `r-${i}`,
          rating: Math.floor(Math.random() * 5) + 1,
          category: 'test',
        });
      }

      const cycle = ai.executeLearningCycle();
      expect(cycle.cycleId).toBeDefined();
      expect(cycle.gapsIdentified).toBeGreaterThanOrEqual(0);
    });

    it('should track learning cycles', () => {
      const metrics1 = ai.getEvolutionMetrics();
      const initialCycles = metrics1['learningCycles'] || 0;

      ai.executeLearningCycle();
      const metrics2 = ai.getEvolutionMetrics();
      const newCycles = metrics2['learningCycles'] || 0;

      expect(newCycles).toBeGreaterThan(initialCycles);
    });
  });

  describe('Evolution Metrics', () => {
    it('should get evolution metrics', () => {
      const metrics = ai.getEvolutionMetrics();
      expect(metrics).toBeDefined();
      expect(metrics['totalFeedback']).toBe(0);
    });

    it('should update metrics with feedback', () => {
      ai.recordFeedback({
        sessionId: 'session-1',
        userId: 'user-1',
        questionId: 'q-1',
        responseId: 'r-1',
        rating: 4,
      });

      const metrics = ai.getEvolutionMetrics();
      expect(metrics['totalFeedback']).toBe(1);
      expect(metrics['averageRating']).toBe(4);
    });

    it('should track quality score in metrics', () => {
      ai.recordFeedback({
        sessionId: 'session-1',
        userId: 'user-1',
        questionId: 'q-1',
        responseId: 'r-1',
        rating: 4,
      });

      ai.calculateQualityScore('session-1');

      const metrics = ai.getEvolutionMetrics();
      expect(metrics['currentQualityScore']).toBeGreaterThan(0);
    });
  });

  describe('Data Management', () => {
    it('should export data', () => {
      ai.recordFeedback({
        sessionId: 'session-1',
        userId: 'user-1',
        questionId: 'q-1',
        responseId: 'r-1',
        rating: 4,
      });

      const exported = ai.export();
      expect(exported.feedback.length).toBe(1);
      expect(exported.feedback[0].rating).toBe(4);
    });

    it('should import data', () => {
      const ai1 = new LearningLoopAI();
      ai1.recordFeedback({
        sessionId: 'session-1',
        userId: 'user-1',
        questionId: 'q-1',
        responseId: 'r-1',
        rating: 4,
      });

      const exported = ai1.export();

      const ai2 = new LearningLoopAI();
      ai2.import(exported);

      const history = ai2.getFeedbackHistory(10);
      expect(history.length).toBe(1);
      expect(history[0].rating).toBe(4);
    });

    it('should clear data', () => {
      ai.recordFeedback({
        sessionId: 'session-1',
        userId: 'user-1',
        questionId: 'q-1',
        responseId: 'r-1',
        rating: 4,
      });

      ai.clear();

      const history = ai.getFeedbackHistory(10);
      expect(history.length).toBe(0);

      const metrics = ai.getEvolutionMetrics();
      expect(metrics['totalFeedback']).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should get statistics', () => {
      const stats = ai.getStatistics();
      expect(stats.totalFeedback).toBe(0);
      expect(stats.totalLearningRecords).toBe(0);
    });

    it('should track statistics', () => {
      ai.recordFeedback({
        sessionId: 'session-1',
        userId: 'user-1',
        questionId: 'q-1',
        responseId: 'r-1',
        rating: 4,
      });

      ai.addLearningRecord({
        sessionId: 'session-1',
        question: 'Test',
        response: 'Response',
        feedback: {
          sessionId: 'session-1',
          userId: 'user-1',
          questionId: 'q-1',
          responseId: 'r-1',
          rating: 4,
          timestamp: Date.now(),
        },
      });

      const stats = ai.getStatistics();
      expect(stats.totalFeedback).toBe(1);
      expect(stats.totalLearningRecords).toBe(1);
    });
  });

  describe('Integration', () => {
    it('should handle complete learning workflow', () => {
      // Record feedback
      for (let i = 0; i < 10; i++) {
        ai.recordFeedback({
          sessionId: 'session-1',
          userId: 'user-1',
          questionId: `q-${i}`,
          responseId: `r-${i}`,
          rating: Math.floor(Math.random() * 5) + 1,
          category: i % 2 === 0 ? 'manufacturing' : 'quality',
        });
      }

      // Calculate quality
      const score = ai.calculateQualityScore('session-1');
      expect(score.overallScore).toBeGreaterThan(0);

      // Detect gaps
      const gaps = ai.detectKnowledgeGaps();
      expect(gaps.length).toBeGreaterThanOrEqual(0);

      // Generate suggestions
      const suggestions = ai.generateImprovementSuggestions();
      expect(suggestions.length).toBeGreaterThanOrEqual(0);

      // Analyze feedback
      const analysis = ai.analyzeFeedback();
      expect(analysis.totalFeedback).toBe(10);

      // Execute learning cycle
      const cycle = ai.executeLearningCycle();
      expect(cycle.cycleId).toBeDefined();

      // Get metrics
      const metrics = ai.getEvolutionMetrics();
      expect(metrics['totalFeedback']).toBe(10);
    });

    it('should handle multiple sessions', () => {
      for (let session = 1; session <= 3; session++) {
        for (let i = 0; i < 5; i++) {
          ai.recordFeedback({
            sessionId: `session-${session}`,
            userId: `user-${session}`,
            questionId: `q-${i}`,
            responseId: `r-${i}`,
            rating: Math.floor(Math.random() * 5) + 1,
          });
        }
      }

      const history = ai.getFeedbackHistory(20);
      expect(history.length).toBe(15);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty feedback history', () => {
      const analysis = ai.analyzeFeedback();
      expect(analysis.totalFeedback).toBe(0);
      expect(analysis.averageRating).toBe(0);
    });

    it('should handle single feedback', () => {
      ai.recordFeedback({
        sessionId: 'session-1',
        userId: 'user-1',
        questionId: 'q-1',
        responseId: 'r-1',
        rating: 3,
      });

      const analysis = ai.analyzeFeedback();
      expect(analysis.averageRating).toBe(3);
      expect(analysis.improvementRate).toBe(0);
    });

    it('should handle all same ratings', () => {
      for (let i = 0; i < 5; i++) {
        ai.recordFeedback({
          sessionId: 'session-1',
          userId: 'user-1',
          questionId: `q-${i}`,
          responseId: `r-${i}`,
          rating: 4,
        });
      }

      const analysis = ai.analyzeFeedback();
      expect(analysis.averageRating).toBe(4);
    });

    it('should handle missing category', () => {
      ai.recordFeedback({
        sessionId: 'session-1',
        userId: 'user-1',
        questionId: 'q-1',
        responseId: 'r-1',
        rating: 1,
      });

      const gaps = ai.detectKnowledgeGaps();
      expect(gaps.length).toBeGreaterThan(0);
    });
  });
});
