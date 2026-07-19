import { describe, it, expect, beforeEach } from 'vitest';
import { ResponseEvaluationService } from './ResponseEvaluationService';

describe('ResponseEvaluationService', () => {
  let service: ResponseEvaluationService;

  beforeEach(() => {
    service = new ResponseEvaluationService();
  });

  describe('evaluateResponse', () => {
    it('should evaluate a response', () => {
      const evaluation = service.evaluateResponse('resp-1', 85, 90, 88, 92);

      expect(evaluation).toBeDefined();
      expect(evaluation.evaluationId).toMatch(/^RE-/);
      expect(evaluation.status).toBe('good');
    });

    it('should mark poor responses', () => {
      const evaluation = service.evaluateResponse('resp-1', 30, 35, 40, 45);

      expect(evaluation.status).toBe('poor');
    });

    it('should mark acceptable responses', () => {
      const evaluation = service.evaluateResponse('resp-1', 70, 75, 72, 78);

      expect(evaluation.status).toBe('acceptable');
    });
  });

  describe('getEvaluation', () => {
    it('should retrieve an evaluation', () => {
      const created = service.evaluateResponse('resp-1', 85, 90, 88, 92);
      const retrieved = service.getEvaluation(created.evaluationId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.accuracy).toBe(85);
    });
  });

  describe('getEvaluationsByResponse', () => {
    it('should retrieve evaluations by response', () => {
      service.evaluateResponse('resp-1', 85, 90, 88, 92);
      service.evaluateResponse('resp-1', 87, 92, 90, 94);

      const evaluations = service.getEvaluationsByResponse('resp-1');
      expect(evaluations.length).toBe(2);
    });
  });

  describe('analyzeError', () => {
    it('should analyze an error', () => {
      const analysis = service.analyzeError('resp-1', 'factual', 'high', 'Incorrect fact', 'Data source issue');

      expect(analysis).toBeDefined();
      expect(analysis.analysisId).toMatch(/^EA-/);
      expect(analysis.errorType).toBe('factual');
    });
  });

  describe('getErrorAnalysis', () => {
    it('should retrieve an error analysis', () => {
      const created = service.analyzeError('resp-1', 'factual', 'high', 'Incorrect fact');
      const retrieved = service.getErrorAnalysis(created.analysisId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.severity).toBe('high');
    });
  });

  describe('getErrorAnalysesByResponse', () => {
    it('should retrieve error analyses by response', () => {
      service.analyzeError('resp-1', 'factual', 'high', 'Error 1');
      service.analyzeError('resp-1', 'logical', 'medium', 'Error 2');

      const analyses = service.getErrorAnalysesByResponse('resp-1');
      expect(analyses.length).toBe(2);
    });
  });

  describe('generateSuggestion', () => {
    it('should generate a suggestion', () => {
      const suggestion = service.generateSuggestion('resp-1', 'factual', 'Add more details', 'high', 85);

      expect(suggestion).toBeDefined();
      expect(suggestion.suggestionId).toMatch(/^IS-/);
      expect(suggestion.status).toBe('pending');
    });
  });

  describe('getSuggestion', () => {
    it('should retrieve a suggestion', () => {
      const created = service.generateSuggestion('resp-1', 'factual', 'Add details', 'high', 85);
      const retrieved = service.getSuggestion(created.suggestionId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.priority).toBe('high');
    });
  });

  describe('getSuggestionsByResponse', () => {
    it('should retrieve suggestions by response', () => {
      service.generateSuggestion('resp-1', 'factual', 'Suggestion 1', 'high', 85);
      service.generateSuggestion('resp-1', 'clarity', 'Suggestion 2', 'medium', 75);

      const suggestions = service.getSuggestionsByResponse('resp-1');
      expect(suggestions.length).toBe(2);
    });
  });

  describe('getSuggestionsByStatus', () => {
    it('should retrieve suggestions by status', () => {
      service.generateSuggestion('resp-1', 'factual', 'Suggestion 1', 'high', 85);
      service.generateSuggestion('resp-2', 'clarity', 'Suggestion 2', 'medium', 75);

      const pending = service.getSuggestionsByStatus('pending');
      expect(pending.length).toBe(2);
    });
  });

  describe('reviewSuggestion', () => {
    it('should review a suggestion', () => {
      const suggestion = service.generateSuggestion('resp-1', 'factual', 'Add details', 'high', 85);
      const result = service.reviewSuggestion(suggestion.suggestionId);

      expect(result).toBe(true);

      const updated = service.getSuggestion(suggestion.suggestionId);
      expect(updated?.status).toBe('reviewed');
    });
  });

  describe('implementSuggestion', () => {
    it('should implement a suggestion', () => {
      const suggestion = service.generateSuggestion('resp-1', 'factual', 'Add details', 'high', 85);
      service.reviewSuggestion(suggestion.suggestionId);

      const result = service.implementSuggestion(suggestion.suggestionId);

      expect(result).toBe(true);

      const implemented = service.getSuggestion(suggestion.suggestionId);
      expect(implemented?.status).toBe('implemented');
    });
  });

  describe('getAllEvaluations', () => {
    it('should retrieve all evaluations', () => {
      service.evaluateResponse('resp-1', 85, 90, 88, 92);
      service.evaluateResponse('resp-2', 87, 92, 90, 94);

      const all = service.getAllEvaluations();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllErrorAnalyses', () => {
    it('should retrieve all error analyses', () => {
      service.analyzeError('resp-1', 'factual', 'high', 'Error 1');
      service.analyzeError('resp-2', 'logical', 'medium', 'Error 2');

      const all = service.getAllErrorAnalyses();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllSuggestions', () => {
    it('should retrieve all suggestions', () => {
      service.generateSuggestion('resp-1', 'factual', 'Suggestion 1', 'high', 85);
      service.generateSuggestion('resp-2', 'clarity', 'Suggestion 2', 'medium', 75);

      const all = service.getAllSuggestions();
      expect(all.length).toBe(2);
    });
  });

  describe('getEvaluationStats', () => {
    it('should calculate evaluation statistics', () => {
      service.evaluateResponse('resp-1', 85, 90, 88, 92);
      service.analyzeError('resp-1', 'factual', 'high', 'Error');
      service.generateSuggestion('resp-1', 'factual', 'Suggestion', 'high', 85);

      const stats = service.getEvaluationStats();

      expect(stats.totalEvaluations).toBe(1);
      expect(stats.averageAccuracy).toBe(85);
      expect(stats.goodResponses).toBe(1);
      expect(stats.totalErrors).toBe(1);
      expect(stats.totalSuggestions).toBe(1);
    });
  });

  describe('deleteEvaluation', () => {
    it('should delete an evaluation', () => {
      const evaluation = service.evaluateResponse('resp-1', 85, 90, 88, 92);
      const result = service.deleteEvaluation(evaluation.evaluationId);

      expect(result).toBe(true);
      expect(service.getEvaluation(evaluation.evaluationId)).toBeUndefined();
    });
  });

  describe('deleteErrorAnalysis', () => {
    it('should delete an error analysis', () => {
      const analysis = service.analyzeError('resp-1', 'factual', 'high', 'Error');
      const result = service.deleteErrorAnalysis(analysis.analysisId);

      expect(result).toBe(true);
      expect(service.getErrorAnalysis(analysis.analysisId)).toBeUndefined();
    });
  });

  describe('deleteSuggestion', () => {
    it('should delete a suggestion', () => {
      const suggestion = service.generateSuggestion('resp-1', 'factual', 'Suggestion', 'high', 85);
      const result = service.deleteSuggestion(suggestion.suggestionId);

      expect(result).toBe(true);
      expect(service.getSuggestion(suggestion.suggestionId)).toBeUndefined();
    });
  });
});
