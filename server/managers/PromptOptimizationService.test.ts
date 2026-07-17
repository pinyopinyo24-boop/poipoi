import { describe, it, expect, beforeEach } from 'vitest';
import { PromptOptimizationService } from './PromptOptimizationService';

describe('PromptOptimizationService', () => {
  let service: PromptOptimizationService;

  beforeEach(() => {
    service = new PromptOptimizationService();
  });

  describe('createPromptTemplate', () => {
    it('should create a prompt template', () => {
      const template = service.createPromptTemplate(
        'General Template',
        'A general purpose template',
        'general',
        'Answer the question: {question}'
      );

      expect(template).toBeDefined();
      expect(template.templateId).toMatch(/^PT-/);
      expect(template.status).toBe('experimental');
    });
  });

  describe('getPromptTemplate', () => {
    it('should retrieve a prompt template', () => {
      const created = service.createPromptTemplate(
        'General Template',
        'A general purpose template',
        'general',
        'Answer: {question}'
      );
      const retrieved = service.getPromptTemplate(created.templateId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('General Template');
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should retrieve templates by category', () => {
      service.createPromptTemplate('Template 1', 'Desc 1', 'general', 'Prompt 1');
      service.createPromptTemplate('Template 2', 'Desc 2', 'general', 'Prompt 2');

      const templates = service.getTemplatesByCategory('general');
      expect(templates.length).toBe(2);
    });
  });

  describe('createPromptVariation', () => {
    it('should create a prompt variation', () => {
      const template = service.createPromptTemplate(
        'Template',
        'Desc',
        'general',
        'Original prompt'
      );
      const variation = service.createPromptVariation(
        template.templateId,
        'Original prompt',
        'Optimized prompt',
        'clarity',
        85
      );

      expect(variation).toBeDefined();
      expect(variation.variationId).toMatch(/^PV-/);
      expect(variation.status).toBe('pending');
    });
  });

  describe('getPromptVariation', () => {
    it('should retrieve a prompt variation', () => {
      const template = service.createPromptTemplate('Template', 'Desc', 'general', 'Prompt');
      const created = service.createPromptVariation(
        template.templateId,
        'Original',
        'Optimized',
        'clarity',
        85
      );
      const retrieved = service.getPromptVariation(created.variationId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.improvementType).toBe('clarity');
    });
  });

  describe('getVariationsByTemplate', () => {
    it('should retrieve variations by template', () => {
      const template = service.createPromptTemplate('Template', 'Desc', 'general', 'Prompt');
      service.createPromptVariation(template.templateId, 'Original 1', 'Optimized 1', 'clarity', 85);
      service.createPromptVariation(template.templateId, 'Original 2', 'Optimized 2', 'specificity', 90);

      const variations = service.getVariationsByTemplate(template.templateId);
      expect(variations.length).toBe(2);
    });
  });

  describe('getVariationsByStatus', () => {
    it('should retrieve variations by status', () => {
      const template = service.createPromptTemplate('Template', 'Desc', 'general', 'Prompt');
      service.createPromptVariation(template.templateId, 'Original 1', 'Optimized 1', 'clarity', 85);
      service.createPromptVariation(template.templateId, 'Original 2', 'Optimized 2', 'specificity', 90);

      const pending = service.getVariationsByStatus('pending');
      expect(pending.length).toBe(2);
    });
  });

  describe('testPromptVariation', () => {
    it('should test a prompt variation', () => {
      const template = service.createPromptTemplate('Template', 'Desc', 'general', 'Prompt');
      const variation = service.createPromptVariation(
        template.templateId,
        'Original',
        'Optimized',
        'clarity',
        85
      );

      const result = service.testPromptVariation(variation.variationId, 82);

      expect(result).toBe(true);

      const updated = service.getPromptVariation(variation.variationId);
      expect(updated?.status).toBe('tested');
      expect(updated?.actualImprovement).toBe(82);
    });
  });

  describe('approvePromptVariation', () => {
    it('should approve a prompt variation', () => {
      const template = service.createPromptTemplate('Template', 'Desc', 'general', 'Prompt');
      const variation = service.createPromptVariation(
        template.templateId,
        'Original',
        'Optimized',
        'clarity',
        85
      );
      service.testPromptVariation(variation.variationId, 82);

      const result = service.approvePromptVariation(variation.variationId);

      expect(result).toBe(true);

      const updated = service.getPromptVariation(variation.variationId);
      expect(updated?.status).toBe('approved');
    });
  });

  describe('deployPromptVariation', () => {
    it('should deploy a prompt variation', () => {
      const template = service.createPromptTemplate('Template', 'Desc', 'general', 'Original prompt');
      const variation = service.createPromptVariation(
        template.templateId,
        'Original prompt',
        'Optimized prompt',
        'clarity',
        85
      );
      service.testPromptVariation(variation.variationId, 82);
      service.approvePromptVariation(variation.variationId);

      const result = service.deployPromptVariation(variation.variationId);

      expect(result).toBe(true);

      const updated = service.getPromptVariation(variation.variationId);
      expect(updated?.status).toBe('deployed');

      const updatedTemplate = service.getPromptTemplate(template.templateId);
      expect(updatedTemplate?.template).toBe('Optimized prompt');
      expect(updatedTemplate?.version).toBe(2);
    });
  });

  describe('recordPromptPerformance', () => {
    it('should record prompt performance', () => {
      const template = service.createPromptTemplate('Template', 'Desc', 'general', 'Prompt');
      const performance = service.recordPromptPerformance(
        template.templateId,
        90,
        88,
        92,
        85,
        95
      );

      expect(performance).toBeDefined();
      expect(performance.performanceId).toMatch(/^PP-/);
      expect(performance.averageScore).toBeCloseTo(88.75, 1);
    });
  });

  describe('getPromptPerformance', () => {
    it('should retrieve prompt performance', () => {
      const template = service.createPromptTemplate('Template', 'Desc', 'general', 'Prompt');
      const created = service.recordPromptPerformance(template.templateId, 90, 88, 92, 85, 95);
      const retrieved = service.getPromptPerformance(created.performanceId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.responseQuality).toBe(90);
    });
  });

  describe('getPerformancesByTemplate', () => {
    it('should retrieve performances by template', () => {
      const template = service.createPromptTemplate('Template', 'Desc', 'general', 'Prompt');
      service.recordPromptPerformance(template.templateId, 90, 88, 92, 85, 95);
      service.recordPromptPerformance(template.templateId, 85, 87, 89, 88, 92);

      const performances = service.getPerformancesByTemplate(template.templateId);
      expect(performances.length).toBe(2);
    });
  });

  describe('getAllTemplates', () => {
    it('should retrieve all templates', () => {
      service.createPromptTemplate('Template 1', 'Desc 1', 'general', 'Prompt 1');
      service.createPromptTemplate('Template 2', 'Desc 2', 'technical', 'Prompt 2');

      const all = service.getAllTemplates();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllVariations', () => {
    it('should retrieve all variations', () => {
      const template = service.createPromptTemplate('Template', 'Desc', 'general', 'Prompt');
      service.createPromptVariation(template.templateId, 'Original 1', 'Optimized 1', 'clarity', 85);
      service.createPromptVariation(template.templateId, 'Original 2', 'Optimized 2', 'specificity', 90);

      const all = service.getAllVariations();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllPerformances', () => {
    it('should retrieve all performances', () => {
      const template = service.createPromptTemplate('Template', 'Desc', 'general', 'Prompt');
      service.recordPromptPerformance(template.templateId, 90, 88, 92, 85, 95);
      service.recordPromptPerformance(template.templateId, 85, 87, 89, 88, 92);

      const all = service.getAllPerformances();
      expect(all.length).toBe(2);
    });
  });

  describe('getOptimizationStats', () => {
    it('should calculate optimization statistics', () => {
      const template = service.createPromptTemplate('Template', 'Desc', 'general', 'Prompt');
      service.createPromptVariation(template.templateId, 'Original', 'Optimized', 'clarity', 85);
      service.recordPromptPerformance(template.templateId, 90, 88, 92, 85, 95);

      const stats = service.getOptimizationStats();

      expect(stats.totalTemplates).toBe(1);
      expect(stats.totalVariations).toBe(1);
      expect(stats.totalPerformances).toBe(1);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template', () => {
      const template = service.createPromptTemplate('Template', 'Desc', 'general', 'Prompt');
      const result = service.deleteTemplate(template.templateId);

      expect(result).toBe(true);
      expect(service.getPromptTemplate(template.templateId)).toBeUndefined();
    });
  });

  describe('deleteVariation', () => {
    it('should delete a variation', () => {
      const template = service.createPromptTemplate('Template', 'Desc', 'general', 'Prompt');
      const variation = service.createPromptVariation(
        template.templateId,
        'Original',
        'Optimized',
        'clarity',
        85
      );

      const result = service.deleteVariation(variation.variationId);

      expect(result).toBe(true);
      expect(service.getPromptVariation(variation.variationId)).toBeUndefined();
    });
  });

  describe('deletePerformance', () => {
    it('should delete a performance', () => {
      const template = service.createPromptTemplate('Template', 'Desc', 'general', 'Prompt');
      const performance = service.recordPromptPerformance(template.templateId, 90, 88, 92, 85, 95);

      const result = service.deletePerformance(performance.performanceId);

      expect(result).toBe(true);
      expect(service.getPromptPerformance(performance.performanceId)).toBeUndefined();
    });
  });
});
