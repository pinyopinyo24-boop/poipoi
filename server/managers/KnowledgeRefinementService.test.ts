import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeRefinementService } from './KnowledgeRefinementService';

describe('KnowledgeRefinementService', () => {
  let service: KnowledgeRefinementService;

  beforeEach(() => {
    service = new KnowledgeRefinementService();
  });

  describe('createKnowledgeEntity', () => {
    it('should create a knowledge entity', () => {
      const entity = service.createKnowledgeEntity(
        'Machine Learning',
        'concept',
        'A field of AI',
        'AI',
        85
      );

      expect(entity).toBeDefined();
      expect(entity.entityId).toMatch(/^KE-/);
      expect(entity.status).toBe('active');
    });
  });

  describe('getKnowledgeEntity', () => {
    it('should retrieve a knowledge entity', () => {
      const created = service.createKnowledgeEntity(
        'Machine Learning',
        'concept',
        'A field of AI',
        'AI',
        85
      );
      const retrieved = service.getKnowledgeEntity(created.entityId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Machine Learning');
    });
  });

  describe('getEntitiesByCategory', () => {
    it('should retrieve entities by category', () => {
      service.createKnowledgeEntity('ML', 'concept', 'Desc 1', 'AI', 85);
      service.createKnowledgeEntity('DL', 'concept', 'Desc 2', 'AI', 90);

      const entities = service.getEntitiesByCategory('AI');
      expect(entities.length).toBe(2);
    });
  });

  describe('getEntitiesByType', () => {
    it('should retrieve entities by type', () => {
      service.createKnowledgeEntity('ML', 'concept', 'Desc 1', 'AI', 85);
      service.createKnowledgeEntity('Rule 1', 'rule', 'Desc 2', 'AI', 90);

      const concepts = service.getEntitiesByType('concept');
      expect(concepts.length).toBe(1);
    });
  });

  describe('createKnowledgeRelation', () => {
    it('should create a knowledge relation', () => {
      const entity1 = service.createKnowledgeEntity('ML', 'concept', 'Desc 1', 'AI', 85);
      const entity2 = service.createKnowledgeEntity('DL', 'concept', 'Desc 2', 'AI', 90);

      const relation = service.createKnowledgeRelation(
        entity1.entityId,
        entity2.entityId,
        'related',
        85,
        'DL is a subset of ML'
      );

      expect(relation).toBeDefined();
      expect(relation.relationId).toMatch(/^KR-/);
      expect(relation.status).toBe('tentative');
    });
  });

  describe('getKnowledgeRelation', () => {
    it('should retrieve a knowledge relation', () => {
      const entity1 = service.createKnowledgeEntity('ML', 'concept', 'Desc 1', 'AI', 85);
      const entity2 = service.createKnowledgeEntity('DL', 'concept', 'Desc 2', 'AI', 90);

      const created = service.createKnowledgeRelation(
        entity1.entityId,
        entity2.entityId,
        'related',
        85,
        'Evidence'
      );
      const retrieved = service.getKnowledgeRelation(created.relationId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.relationType).toBe('related');
    });
  });

  describe('getRelationsBySource', () => {
    it('should retrieve relations by source', () => {
      const entity1 = service.createKnowledgeEntity('ML', 'concept', 'Desc 1', 'AI', 85);
      const entity2 = service.createKnowledgeEntity('DL', 'concept', 'Desc 2', 'AI', 90);
      const entity3 = service.createKnowledgeEntity('NLP', 'concept', 'Desc 3', 'AI', 88);

      service.createKnowledgeRelation(entity1.entityId, entity2.entityId, 'related', 85, 'E1');
      service.createKnowledgeRelation(entity1.entityId, entity3.entityId, 'related', 80, 'E2');

      const relations = service.getRelationsBySource(entity1.entityId);
      expect(relations.length).toBe(2);
    });
  });

  describe('confirmKnowledgeRelation', () => {
    it('should confirm a knowledge relation', () => {
      const entity1 = service.createKnowledgeEntity('ML', 'concept', 'Desc 1', 'AI', 85);
      const entity2 = service.createKnowledgeEntity('DL', 'concept', 'Desc 2', 'AI', 90);

      const relation = service.createKnowledgeRelation(
        entity1.entityId,
        entity2.entityId,
        'related',
        85,
        'Evidence'
      );

      const result = service.confirmKnowledgeRelation(relation.relationId);

      expect(result).toBe(true);

      const updated = service.getKnowledgeRelation(relation.relationId);
      expect(updated?.status).toBe('confirmed');
    });
  });

  describe('createRefinement', () => {
    it('should create a refinement', () => {
      const entity = service.createKnowledgeEntity('ML', 'concept', 'Original', 'AI', 85);
      const refinement = service.createRefinement(
        entity.entityId,
        'clarification',
        'Original',
        'Refined',
        90
      );

      expect(refinement).toBeDefined();
      expect(refinement.refinementId).toMatch(/^KF-/);
      expect(refinement.status).toBe('pending');
    });
  });

  describe('getRefinement', () => {
    it('should retrieve a refinement', () => {
      const entity = service.createKnowledgeEntity('ML', 'concept', 'Original', 'AI', 85);
      const created = service.createRefinement(
        entity.entityId,
        'clarification',
        'Original',
        'Refined',
        90
      );
      const retrieved = service.getRefinement(created.refinementId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.refinementType).toBe('clarification');
    });
  });

  describe('getRefinementsByEntity', () => {
    it('should retrieve refinements by entity', () => {
      const entity = service.createKnowledgeEntity('ML', 'concept', 'Original', 'AI', 85);
      service.createRefinement(entity.entityId, 'clarification', 'Original 1', 'Refined 1', 90);
      service.createRefinement(entity.entityId, 'expansion', 'Original 2', 'Refined 2', 85);

      const refinements = service.getRefinementsByEntity(entity.entityId);
      expect(refinements.length).toBe(2);
    });
  });

  describe('getRefinementsByStatus', () => {
    it('should retrieve refinements by status', () => {
      const entity = service.createKnowledgeEntity('ML', 'concept', 'Original', 'AI', 85);
      service.createRefinement(entity.entityId, 'clarification', 'Original 1', 'Refined 1', 90);
      service.createRefinement(entity.entityId, 'expansion', 'Original 2', 'Refined 2', 85);

      const pending = service.getRefinementsByStatus('pending');
      expect(pending.length).toBe(2);
    });
  });

  describe('approveRefinement', () => {
    it('should approve a refinement', () => {
      const entity = service.createKnowledgeEntity('ML', 'concept', 'Original', 'AI', 85);
      const refinement = service.createRefinement(
        entity.entityId,
        'clarification',
        'Original',
        'Refined',
        90
      );

      const result = service.approveRefinement(refinement.refinementId);

      expect(result).toBe(true);

      const updated = service.getRefinement(refinement.refinementId);
      expect(updated?.status).toBe('approved');
    });
  });

  describe('applyRefinement', () => {
    it('should apply a refinement', () => {
      const entity = service.createKnowledgeEntity('ML', 'concept', 'Original', 'AI', 85);
      const refinement = service.createRefinement(
        entity.entityId,
        'clarification',
        'Original',
        'Refined',
        90
      );
      service.approveRefinement(refinement.refinementId);

      const result = service.applyRefinement(refinement.refinementId);

      expect(result).toBe(true);

      const updated = service.getRefinement(refinement.refinementId);
      expect(updated?.status).toBe('applied');

      const updatedEntity = service.getKnowledgeEntity(entity.entityId);
      expect(updatedEntity?.description).toBe('Refined');
    });
  });

  describe('getAllEntities', () => {
    it('should retrieve all entities', () => {
      service.createKnowledgeEntity('ML', 'concept', 'Desc 1', 'AI', 85);
      service.createKnowledgeEntity('DL', 'concept', 'Desc 2', 'AI', 90);

      const all = service.getAllEntities();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllRelations', () => {
    it('should retrieve all relations', () => {
      const entity1 = service.createKnowledgeEntity('ML', 'concept', 'Desc 1', 'AI', 85);
      const entity2 = service.createKnowledgeEntity('DL', 'concept', 'Desc 2', 'AI', 90);

      service.createKnowledgeRelation(entity1.entityId, entity2.entityId, 'related', 85, 'E1');
      service.createKnowledgeRelation(entity2.entityId, entity1.entityId, 'related', 80, 'E2');

      const all = service.getAllRelations();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllRefinements', () => {
    it('should retrieve all refinements', () => {
      const entity = service.createKnowledgeEntity('ML', 'concept', 'Original', 'AI', 85);
      service.createRefinement(entity.entityId, 'clarification', 'Original 1', 'Refined 1', 90);
      service.createRefinement(entity.entityId, 'expansion', 'Original 2', 'Refined 2', 85);

      const all = service.getAllRefinements();
      expect(all.length).toBe(2);
    });
  });

  describe('getKnowledgeStats', () => {
    it('should calculate knowledge statistics', () => {
      const entity = service.createKnowledgeEntity('ML', 'concept', 'Original', 'AI', 85);
      service.createRefinement(entity.entityId, 'clarification', 'Original', 'Refined', 90);

      const stats = service.getKnowledgeStats();

      expect(stats.totalEntities).toBe(1);
      expect(stats.averageConfidence).toBe(85);
      expect(stats.totalRefinements).toBe(1);
    });
  });

  describe('deleteEntity', () => {
    it('should delete an entity', () => {
      const entity = service.createKnowledgeEntity('ML', 'concept', 'Desc', 'AI', 85);
      const result = service.deleteEntity(entity.entityId);

      expect(result).toBe(true);
      expect(service.getKnowledgeEntity(entity.entityId)).toBeUndefined();
    });
  });

  describe('deleteRelation', () => {
    it('should delete a relation', () => {
      const entity1 = service.createKnowledgeEntity('ML', 'concept', 'Desc 1', 'AI', 85);
      const entity2 = service.createKnowledgeEntity('DL', 'concept', 'Desc 2', 'AI', 90);

      const relation = service.createKnowledgeRelation(
        entity1.entityId,
        entity2.entityId,
        'related',
        85,
        'Evidence'
      );

      const result = service.deleteRelation(relation.relationId);

      expect(result).toBe(true);
      expect(service.getKnowledgeRelation(relation.relationId)).toBeUndefined();
    });
  });

  describe('deleteRefinement', () => {
    it('should delete a refinement', () => {
      const entity = service.createKnowledgeEntity('ML', 'concept', 'Original', 'AI', 85);
      const refinement = service.createRefinement(
        entity.entityId,
        'clarification',
        'Original',
        'Refined',
        90
      );

      const result = service.deleteRefinement(refinement.refinementId);

      expect(result).toBe(true);
      expect(service.getRefinement(refinement.refinementId)).toBeUndefined();
    });
  });
});
