import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationQualityService } from './ConversationQualityService';

describe('ConversationQualityService', () => {
  let service: ConversationQualityService;

  beforeEach(() => {
    service = new ConversationQualityService();
  });

  describe('recordConversationQuality', () => {
    it('should record conversation quality', () => {
      const quality = service.recordConversationQuality('conv-1', 85, 90, 88, 92);

      expect(quality).toBeDefined();
      expect(quality.qualityId).toMatch(/^CQ-/);
      expect(quality.overallScore).toBeCloseTo(88.75, 1);
    });
  });

  describe('getConversationQuality', () => {
    it('should retrieve conversation quality', () => {
      const created = service.recordConversationQuality('conv-1', 85, 90, 88, 92);
      const retrieved = service.getConversationQuality(created.qualityId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.contextMaintenance).toBe(85);
    });
  });

  describe('getQualitiesByConversation', () => {
    it('should retrieve qualities by conversation', () => {
      service.recordConversationQuality('conv-1', 85, 90, 88, 92);
      service.recordConversationQuality('conv-1', 87, 92, 90, 94);

      const qualities = service.getQualitiesByConversation('conv-1');
      expect(qualities.length).toBe(2);
    });
  });

  describe('analyzeContext', () => {
    it('should analyze context', () => {
      const analysis = service.analyzeContext('conv-1', 8, 85, 10);

      expect(analysis).toBeDefined();
      expect(analysis.analysisId).toMatch(/^CA-/);
      expect(analysis.status).toBe('maintained');
    });
  });

  describe('analyzeContext status', () => {
    it('should detect degrading context', () => {
      const analysis = service.analyzeContext('conv-1', 5, 60, 30);

      expect(analysis.status).toBe('degrading');
    });

    it('should detect lost context', () => {
      const analysis = service.analyzeContext('conv-1', 2, 30, 70);

      expect(analysis.status).toBe('lost');
    });
  });

  describe('getContextAnalysis', () => {
    it('should retrieve context analysis', () => {
      const created = service.analyzeContext('conv-1', 8, 85, 10);
      const retrieved = service.getContextAnalysis(created.analysisId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.contextDepth).toBe(8);
    });
  });

  describe('getContextAnalysesByConversation', () => {
    it('should retrieve context analyses by conversation', () => {
      service.analyzeContext('conv-1', 8, 85, 10);
      service.analyzeContext('conv-1', 7, 80, 15);

      const analyses = service.getContextAnalysesByConversation('conv-1');
      expect(analyses.length).toBe(2);
    });
  });

  describe('analyzeIntent', () => {
    it('should analyze intent', () => {
      const analysis = service.analyzeIntent('conv-1', 85, 90, 88);

      expect(analysis).toBeDefined();
      expect(analysis.analysisId).toMatch(/^IA-/);
      expect(analysis.status).toBe('clear');
    });
  });

  describe('analyzeIntent status', () => {
    it('should detect ambiguous intent', () => {
      const analysis = service.analyzeIntent('conv-1', 60, 70, 65);

      expect(analysis.status).toBe('ambiguous');
    });

    it('should detect unclear intent', () => {
      const analysis = service.analyzeIntent('conv-1', 30, 40, 35);

      expect(analysis.status).toBe('unclear');
    });
  });

  describe('getIntentAnalysis', () => {
    it('should retrieve intent analysis', () => {
      const created = service.analyzeIntent('conv-1', 85, 90, 88);
      const retrieved = service.getIntentAnalysis(created.analysisId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.userIntentClarity).toBe(85);
    });
  });

  describe('getIntentAnalysesByConversation', () => {
    it('should retrieve intent analyses by conversation', () => {
      service.analyzeIntent('conv-1', 85, 90, 88);
      service.analyzeIntent('conv-1', 87, 92, 90);

      const analyses = service.getIntentAnalysesByConversation('conv-1');
      expect(analyses.length).toBe(2);
    });
  });

  describe('getAllQualitiesRecords', () => {
    it('should retrieve all quality records', () => {
      service.recordConversationQuality('conv-1', 85, 90, 88, 92);
      service.recordConversationQuality('conv-2', 87, 92, 90, 94);

      const all = service.getAllQualitiesRecords();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllContextAnalyses', () => {
    it('should retrieve all context analyses', () => {
      service.analyzeContext('conv-1', 8, 85, 10);
      service.analyzeContext('conv-2', 7, 80, 15);

      const all = service.getAllContextAnalyses();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllIntentAnalyses', () => {
    it('should retrieve all intent analyses', () => {
      service.analyzeIntent('conv-1', 85, 90, 88);
      service.analyzeIntent('conv-2', 87, 92, 90);

      const all = service.getAllIntentAnalyses();
      expect(all.length).toBe(2);
    });
  });

  describe('getConversationStats', () => {
    it('should calculate conversation statistics', () => {
      service.recordConversationQuality('conv-1', 85, 90, 88, 92);
      service.analyzeContext('conv-1', 8, 85, 10);
      service.analyzeIntent('conv-1', 85, 90, 88);

      const stats = service.getConversationStats();

      expect(stats.totalQualityRecords).toBe(1);
      expect(stats.averageContextMaintenance).toBe(85);
      expect(stats.totalContextAnalyses).toBe(1);
      expect(stats.totalIntentAnalyses).toBe(1);
    });
  });

  describe('deleteQuality', () => {
    it('should delete a quality record', () => {
      const quality = service.recordConversationQuality('conv-1', 85, 90, 88, 92);
      const result = service.deleteQuality(quality.qualityId);

      expect(result).toBe(true);
      expect(service.getConversationQuality(quality.qualityId)).toBeUndefined();
    });
  });

  describe('deleteContextAnalysis', () => {
    it('should delete a context analysis', () => {
      const analysis = service.analyzeContext('conv-1', 8, 85, 10);
      const result = service.deleteContextAnalysis(analysis.analysisId);

      expect(result).toBe(true);
      expect(service.getContextAnalysis(analysis.analysisId)).toBeUndefined();
    });
  });

  describe('deleteIntentAnalysis', () => {
    it('should delete an intent analysis', () => {
      const analysis = service.analyzeIntent('conv-1', 85, 90, 88);
      const result = service.deleteIntentAnalysis(analysis.analysisId);

      expect(result).toBe(true);
      expect(service.getIntentAnalysis(analysis.analysisId)).toBeUndefined();
    });
  });
});
