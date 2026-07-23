import { describe, it, expect, beforeEach } from 'vitest';
import { AIQualityEvaluationService } from './AIQualityEvaluationService';

describe('AIQualityEvaluationService', () => {
  let service: AIQualityEvaluationService;

  beforeEach(() => {
    service = new AIQualityEvaluationService();
  });

  describe('recordScore', () => {
    it('should record a quality score', () => {
      const score = service.recordScore('response_quality', 35, 40, 'Good response');

      expect(score).toBeDefined();
      expect(score.percentage).toBe(87.5);
      expect(score.scoreId).toMatch(/^QS-/);
    });
  });

  describe('getScore', () => {
    it('should retrieve a score', () => {
      const created = service.recordScore('response_quality', 35, 40, 'Good');
      const retrieved = service.getScore(created.scoreId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.evaluationType).toBe('response_quality');
    });

    it('should return undefined for non-existent score', () => {
      expect(service.getScore('non-existent')).toBeUndefined();
    });
  });

  describe('getScoresByType', () => {
    it('should retrieve scores by type', () => {
      service.recordScore('response_quality', 35, 40, 'Good');
      service.recordScore('response_quality', 32, 40, 'OK');
      service.recordScore('memory_accuracy', 25, 30, 'Good');

      const quality = service.getScoresByType('response_quality');
      expect(quality.length).toBe(2);
    });
  });

  describe('generateEvaluationResult', () => {
    it('should generate an evaluation result', () => {
      const score = service.recordScore('response_quality', 35, 40, 'Good');
      const result = service.generateEvaluationResult('conv1', 'resp1', [score]);

      expect(result).toBeDefined();
      expect(result.conversationId).toBe('conv1');
      expect(result.overallScore).toBe(87.5);
      expect(result.resultId).toMatch(/^EVL-/);
    });

    it('should set status to passed for high score', () => {
      const score = service.recordScore('response_quality', 35, 40, 'Good');
      const result = service.generateEvaluationResult('conv1', 'resp1', [score]);

      expect(result.status).toBe('passed');
    });

    it('should set status to warning for medium score', () => {
      const score = service.recordScore('response_quality', 28, 40, 'OK');
      const result = service.generateEvaluationResult('conv1', 'resp1', [score]);

      expect(result.status).toBe('warning');
    });

    it('should set status to failed for low score', () => {
      const score = service.recordScore('response_quality', 20, 40, 'Poor');
      const result = service.generateEvaluationResult('conv1', 'resp1', [score]);

      expect(result.status).toBe('failed');
    });
  });

  describe('getEvaluationResult', () => {
    it('should retrieve an evaluation result', () => {
      const score = service.recordScore('response_quality', 35, 40, 'Good');
      const created = service.generateEvaluationResult('conv1', 'resp1', [score]);
      const retrieved = service.getEvaluationResult(created.resultId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.conversationId).toBe('conv1');
    });
  });

  describe('getEvaluationsByConversation', () => {
    it('should retrieve evaluations by conversation', () => {
      const score1 = service.recordScore('response_quality', 35, 40, 'Good');
      const score2 = service.recordScore('response_quality', 32, 40, 'OK');

      service.generateEvaluationResult('conv1', 'resp1', [score1]);
      service.generateEvaluationResult('conv1', 'resp2', [score2]);
      service.generateEvaluationResult('conv2', 'resp3', [score1]);

      const conv1Results = service.getEvaluationsByConversation('conv1');
      expect(conv1Results.length).toBe(2);
    });
  });

  describe('evaluateResponseQuality', () => {
    it('should evaluate response quality', () => {
      const score = service.evaluateResponseQuality(9, 9, 9, 9);

      expect(score).toBeDefined();
      expect(score.evaluationType).toBe('response_quality');
      expect(score.percentage).toBe(90);
    });
  });

  describe('evaluateConversationContinuity', () => {
    it('should evaluate conversation continuity', () => {
      const score = service.evaluateConversationContinuity(9, 9, 9);

      expect(score).toBeDefined();
      expect(score.evaluationType).toBe('conversation_continuity');
      expect(score.percentage).toBe(90);
    });
  });

  describe('evaluateMemoryAccuracy', () => {
    it('should evaluate memory accuracy', () => {
      const score = service.evaluateMemoryAccuracy(9, 9, 9);

      expect(score).toBeDefined();
      expect(score.evaluationType).toBe('memory_accuracy');
      expect(score.percentage).toBe(90);
    });
  });

  describe('evaluateInferenceAccuracy', () => {
    it('should evaluate inference accuracy', () => {
      const score = service.evaluateInferenceAccuracy(9, 9, 9);

      expect(score).toBeDefined();
      expect(score.evaluationType).toBe('inference_accuracy');
      expect(score.percentage).toBe(90);
    });
  });

  describe('evaluateManufacturingAI', () => {
    it('should evaluate manufacturing AI', () => {
      const score = service.evaluateManufacturingAI(9, 9, 9);

      expect(score).toBeDefined();
      expect(score.evaluationType).toBe('manufacturing_ai');
      expect(score.percentage).toBe(90);
    });
  });

  describe('calculateAIMetrics', () => {
    it('should calculate AI metrics', () => {
      const score1 = service.recordScore('response_quality', 35, 40, 'Good');
      const score2 = service.recordScore('response_quality', 28, 40, 'OK');

      service.generateEvaluationResult('conv1', 'resp1', [score1]);
      service.generateEvaluationResult('conv2', 'resp2', [score2]);

      const metrics = service.calculateAIMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalEvaluations).toBe(2);
      expect(metrics.averageScore).toBeGreaterThan(0);
    });

    it('should calculate metrics with no results', () => {
      const metrics = service.calculateAIMetrics();

      expect(metrics.totalEvaluations).toBe(0);
      expect(metrics.averageScore).toBe(0);
    });
  });

  describe('getAllResults', () => {
    it('should retrieve all results', () => {
      const score1 = service.recordScore('response_quality', 35, 40, 'Good');
      const score2 = service.recordScore('response_quality', 32, 40, 'OK');

      service.generateEvaluationResult('conv1', 'resp1', [score1]);
      service.generateEvaluationResult('conv2', 'resp2', [score2]);

      const all = service.getAllResults();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllScores', () => {
    it('should retrieve all scores', () => {
      service.recordScore('response_quality', 35, 40, 'Good');
      service.recordScore('memory_accuracy', 25, 30, 'Good');

      const all = service.getAllScores();
      expect(all.length).toBe(2);
    });
  });

  describe('getLowQualityResults', () => {
    it('should retrieve low quality results', () => {
      const score1 = service.recordScore('response_quality', 35, 40, 'Good');
      const score2 = service.recordScore('response_quality', 20, 40, 'Poor');

      service.generateEvaluationResult('conv1', 'resp1', [score1]);
      service.generateEvaluationResult('conv2', 'resp2', [score2]);

      const low = service.getLowQualityResults(85);
      expect(low.length).toBeGreaterThan(0);
    });
  });

  describe('getHighQualityResults', () => {
    it('should retrieve high quality results', () => {
      const score1 = service.recordScore('response_quality', 35, 40, 'Good');
      const score2 = service.recordScore('response_quality', 20, 40, 'Poor');

      service.generateEvaluationResult('conv1', 'resp1', [score1]);
      service.generateEvaluationResult('conv2', 'resp2', [score2]);

      const high = service.getHighQualityResults(85);
      expect(high.length).toBeGreaterThan(0);
    });
  });

  describe('deleteResult', () => {
    it('should delete a result', () => {
      const score = service.recordScore('response_quality', 35, 40, 'Good');
      const result = service.generateEvaluationResult('conv1', 'resp1', [score]);

      const deleted = service.deleteResult(result.resultId);
      expect(deleted).toBe(true);
      expect(service.getEvaluationResult(result.resultId)).toBeUndefined();
    });

    it('should return false for non-existent result', () => {
      expect(service.deleteResult('non-existent')).toBe(false);
    });
  });

  describe('deleteScore', () => {
    it('should delete a score', () => {
      const score = service.recordScore('response_quality', 35, 40, 'Good');

      const deleted = service.deleteScore(score.scoreId);
      expect(deleted).toBe(true);
      expect(service.getScore(score.scoreId)).toBeUndefined();
    });
  });
});
