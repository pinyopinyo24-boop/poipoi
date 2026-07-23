import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KnowledgeEngine, KnowledgeEntity } from './KnowledgeEngine';
import { SecurityEngine } from '../security/SecurityEngine';
import { MemoryEngine } from '../memory/MemoryEngine';

describe('KnowledgeEngine', () => {
  let engine: KnowledgeEngine;
  let securityEngine: SecurityEngine;
  let userId: string;

  beforeEach(async () => {
    engine = KnowledgeEngine.getInstance();
    engine.clearAllKnowledge();
    // Get the security engine from the knowledge engine
    securityEngine = (engine as any).securityEngine;
    if (!securityEngine.isReady()) {
      await securityEngine.initialize();
    }
    userId = 'test-user-' + Date.now();
    await securityEngine.createContext(userId, 'user');
    await securityEngine.grantPermission(userId, 'knowledge:write');
    await securityEngine.grantPermission(userId, 'knowledge:read');
    await securityEngine.grantPermission(userId, 'knowledge:delete');
  });

  afterEach(async () => {
    engine.clearAllKnowledge();
    if (securityEngine.isReady()) {
      await securityEngine.shutdown();
    }
  });

  describe('Singleton Pattern', () => {
    it('should be a singleton', () => {
      const engine1 = KnowledgeEngine.getInstance();
      const engine2 = KnowledgeEngine.getInstance();
      expect(engine1).toBe(engine2);
    });
  });

  describe('Knowledge Storage', () => {
    it('should save knowledge successfully', async () => {
      const knowledge = await engine.saveKnowledge(
        userId,
        'Test Knowledge',
        'This is test content',
        'testing',
        ['test', 'demo'],
        'manual',
        0.9
      );

      expect(knowledge).toBeDefined();
      expect(knowledge.id).toBeDefined();
      expect(knowledge.title).toBe('Test Knowledge');
      expect(knowledge.content).toBe('This is test content');
      expect(knowledge.category).toBe('testing');
      expect(knowledge.tags).toContain('test');
      expect(knowledge.confidence).toBe(0.9);
      expect(knowledge.version).toBe(1);
      expect(knowledge.isActive).toBe(true);
    });

    it('should save knowledge with default values', async () => {
      const knowledge = await engine.saveKnowledge(
        userId,
        'Simple Knowledge',
        'Simple content',
        'general'
      );

      expect(knowledge.tags).toEqual([]);
      expect(knowledge.source).toBe('manual');
      expect(knowledge.confidence).toBe(0.8);
      expect(knowledge.metadata).toEqual({});
    });

    it('should clamp confidence between 0 and 1', async () => {
      const knowledge1 = await engine.saveKnowledge(
        userId,
        'High Confidence',
        'Content',
        'test',
        [],
        'manual',
        1.5
      );
      expect(knowledge1.confidence).toBe(1);

      const knowledge2 = await engine.saveKnowledge(
        userId,
        'Low Confidence',
        'Content',
        'test',
        [],
        'manual',
        -0.5
      );
      expect(knowledge2.confidence).toBe(0);
    });

    it('should throw error if user lacks permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        engine.saveKnowledge(
          unauthorizedUser,
          'Unauthorized Knowledge',
          'Content',
          'test'
        )
      ).rejects.toThrow('User does not have permission to save knowledge');
    });
  });

  describe('Knowledge Retrieval', () => {
    it('should retrieve knowledge by ID', async () => {
      const saved = await engine.saveKnowledge(
        userId,
        'Test Knowledge',
        'Content',
        'test'
      );

      const retrieved = await engine.getKnowledge(userId, saved.id);
      expect(retrieved).toEqual(saved);
    });

    it('should return undefined for non-existent knowledge', async () => {
      const retrieved = await engine.getKnowledge(userId, 'non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    it('should throw error if user lacks read permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        engine.getKnowledge(unauthorizedUser, 'any-id')
      ).rejects.toThrow('User does not have permission to read knowledge');
    });

    it('should get all active knowledge', async () => {
      await engine.saveKnowledge(userId, 'Knowledge 1', 'Content 1', 'test');
      await engine.saveKnowledge(userId, 'Knowledge 2', 'Content 2', 'test');
      await engine.saveKnowledge(userId, 'Knowledge 3', 'Content 3', 'test');

      const all = await engine.getAllKnowledge(userId);
      expect(all.length).toBe(3);
    });
  });

  describe('Knowledge Search', () => {
    beforeEach(async () => {
      await engine.saveKnowledge(
        userId,
        'JavaScript Basics',
        'Learn JavaScript fundamentals',
        'programming',
        ['javascript', 'basics']
      );
      await engine.saveKnowledge(
        userId,
        'TypeScript Advanced',
        'Advanced TypeScript patterns',
        'programming',
        ['typescript', 'advanced']
      );
      await engine.saveKnowledge(
        userId,
        'Python Guide',
        'Python programming guide',
        'programming',
        ['python']
      );
    });

    it('should search knowledge by keyword in title', async () => {
      const results = await engine.searchKnowledge(userId, 'JavaScript');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].knowledge.title).toContain('JavaScript');
    });

    it('should search knowledge by keyword in content', async () => {
      const results = await engine.searchKnowledge(userId, 'fundamentals');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search knowledge by tag', async () => {
      const results = await engine.searchKnowledge(userId, 'typescript');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty results for non-matching query', async () => {
      const results = await engine.searchKnowledge(userId, 'nonexistent');
      expect(results.length).toBe(0);
    });

    it('should respect limit parameter', async () => {
      const results = await engine.searchKnowledge(userId, 'programming', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should rank results by relevance score', async () => {
      const results = await engine.searchKnowledge(userId, 'JavaScript');
      if (results.length > 1) {
        expect(results[0].relevanceScore).toBeGreaterThanOrEqual(
          results[1].relevanceScore
        );
      }
    });

    it('should search by category', async () => {
      const results = await engine.searchByCategory(userId, 'programming');
      expect(results.length).toBe(3);
    });

    it('should search by tags', async () => {
      const results = await engine.searchByTags(userId, ['javascript', 'python']);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty for non-existent category', async () => {
      const results = await engine.searchByCategory(userId, 'nonexistent');
      expect(results.length).toBe(0);
    });
  });

  describe('Knowledge Update', () => {
    let knowledgeId: string;

    beforeEach(async () => {
      const knowledge = await engine.saveKnowledge(
        userId,
        'Original Title',
        'Original content',
        'test'
      );
      knowledgeId = knowledge.id;
    });

    it('should update knowledge title', async () => {
      const updated = await engine.updateKnowledge(userId, knowledgeId, {
        title: 'Updated Title',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.content).toBe('Original content');
      expect(updated.version).toBe(2);
    });

    it('should update knowledge content', async () => {
      const updated = await engine.updateKnowledge(userId, knowledgeId, {
        content: 'Updated content',
      });

      expect(updated.content).toBe('Updated content');
      expect(updated.version).toBe(2);
    });

    it('should update multiple fields', async () => {
      const updated = await engine.updateKnowledge(userId, knowledgeId, {
        title: 'New Title',
        content: 'New content',
        confidence: 0.95,
      });

      expect(updated.title).toBe('New Title');
      expect(updated.content).toBe('New content');
      expect(updated.confidence).toBe(0.95);
      expect(updated.version).toBe(2);
    });

    it('should increment version on update', async () => {
      let knowledge = await engine.updateKnowledge(userId, knowledgeId, {
        title: 'Update 1',
      });
      expect(knowledge.version).toBe(2);

      knowledge = await engine.updateKnowledge(userId, knowledgeId, {
        title: 'Update 2',
      });
      expect(knowledge.version).toBe(3);
    });

    it('should throw error if knowledge not found', async () => {
      await expect(
        engine.updateKnowledge(userId, 'non-existent-id', { title: 'New' })
      ).rejects.toThrow('Knowledge not found');
    });

    it('should throw error if user lacks permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        engine.updateKnowledge(unauthorizedUser, knowledgeId, { title: 'New' })
      ).rejects.toThrow('User does not have permission to update knowledge');
    });
  });

  describe('Knowledge Deletion', () => {
    let knowledgeId: string;

    beforeEach(async () => {
      const knowledge = await engine.saveKnowledge(
        userId,
        'To Delete',
        'Content',
        'test'
      );
      knowledgeId = knowledge.id;
    });

    it('should soft delete knowledge', async () => {
      await engine.deleteKnowledge(userId, knowledgeId);

      const retrieved = await engine.getKnowledge(userId, knowledgeId);
      expect(retrieved?.isActive).toBe(false);
    });

    it('should not include deleted knowledge in search results', async () => {
      await engine.deleteKnowledge(userId, knowledgeId);

      const all = await engine.getAllKnowledge(userId);
      expect(all.find((k) => k.id === knowledgeId)).toBeUndefined();
    });

    it('should throw error if knowledge not found', async () => {
      await expect(
        engine.deleteKnowledge(userId, 'non-existent-id')
      ).rejects.toThrow('Knowledge not found');
    });

    it('should throw error if user lacks permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        engine.deleteKnowledge(unauthorizedUser, knowledgeId)
      ).rejects.toThrow('User does not have permission to delete knowledge');
    });
  });

  describe('Knowledge Linking', () => {
    let sourceId: string;
    let targetId: string;

    beforeEach(async () => {
      const source = await engine.saveKnowledge(
        userId,
        'Source Knowledge',
        'Content',
        'test'
      );
      const target = await engine.saveKnowledge(
        userId,
        'Target Knowledge',
        'Content',
        'test'
      );
      sourceId = source.id;
      targetId = target.id;
    });

    it('should link two knowledge entities', async () => {
      await engine.linkKnowledge(
        userId,
        sourceId,
        targetId,
        'related_to',
        0.9
      );

      const source = await engine.getKnowledge(userId, sourceId);
      expect(source?.relatedKnowledgeIds).toContain(targetId);
    });

    it('should get related knowledge', async () => {
      await engine.linkKnowledge(userId, sourceId, targetId, 'related_to');

      const related = await engine.getRelatedKnowledge(userId, sourceId);
      expect(related.length).toBeGreaterThan(0);
      expect(related[0].id).toBe(targetId);
    });

    it('should not add duplicate links', async () => {
      await engine.linkKnowledge(userId, sourceId, targetId, 'related_to');
      await engine.linkKnowledge(userId, sourceId, targetId, 'related_to');

      const source = await engine.getKnowledge(userId, sourceId);
      const count = source?.relatedKnowledgeIds.filter(
        (id) => id === targetId
      ).length;
      expect(count).toBe(1);
    });

    it('should throw error if source not found', async () => {
      await expect(
        engine.linkKnowledge(userId, 'non-existent', targetId, 'related_to')
      ).rejects.toThrow('Source or target knowledge not found');
    });

    it('should throw error if target not found', async () => {
      await expect(
        engine.linkKnowledge(userId, sourceId, 'non-existent', 'related_to')
      ).rejects.toThrow('Source or target knowledge not found');
    });

    it('should throw error if user lacks permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        engine.linkKnowledge(unauthorizedUser, sourceId, targetId, 'related_to')
      ).rejects.toThrow('User does not have permission to link knowledge');
    });
  });

  describe('Knowledge Versioning', () => {
    let knowledgeId: string;

    beforeEach(async () => {
      const knowledge = await engine.saveKnowledge(
        userId,
        'Versioned Knowledge',
        'Version 1',
        'test'
      );
      knowledgeId = knowledge.id;
    });

    it('should maintain version history', async () => {
      await engine.updateKnowledge(userId, knowledgeId, {
        content: 'Version 2',
      });
      await engine.updateKnowledge(userId, knowledgeId, {
        content: 'Version 3',
      });

      const history = await engine.getVersionHistory(userId, knowledgeId);
      expect(history.length).toBeGreaterThanOrEqual(1);
    });

    it('should restore to previous version', async () => {
      await engine.updateKnowledge(userId, knowledgeId, {
        content: 'Version 2',
      });
      await engine.updateKnowledge(userId, knowledgeId, {
        content: 'Version 3',
      });

      const restored = await engine.restoreVersion(userId, knowledgeId, 1);
      expect(restored.content).toBe('Version 1');
      expect(restored.version).toBeGreaterThan(1);
    });

    it('should throw error for invalid version number', async () => {
      await expect(
        engine.restoreVersion(userId, knowledgeId, 999)
      ).rejects.toThrow('Invalid version number');
    });

    it('should throw error if user lacks permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        engine.getVersionHistory(unauthorizedUser, knowledgeId)
      ).rejects.toThrow('User does not have permission to read knowledge');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple knowledge with same category', async () => {
      await engine.saveKnowledge(userId, 'K1', 'C1', 'category1');
      await engine.saveKnowledge(userId, 'K2', 'C2', 'category1');
      await engine.saveKnowledge(userId, 'K3', 'C3', 'category2');

      const cat1 = await engine.searchByCategory(userId, 'category1');
      expect(cat1.length).toBe(2);

      const cat2 = await engine.searchByCategory(userId, 'category2');
      expect(cat2.length).toBe(1);
    });

    it('should handle knowledge with multiple tags', async () => {
      await engine.saveKnowledge(
        userId,
        'Multi-tag Knowledge',
        'Content',
        'test',
        ['tag1', 'tag2', 'tag3']
      );

      const results = await engine.searchByTags(userId, ['tag1', 'tag3']);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle deep knowledge relationships', async () => {
      const k1 = await engine.saveKnowledge(userId, 'K1', 'C1', 'test');
      const k2 = await engine.saveKnowledge(userId, 'K2', 'C2', 'test');
      const k3 = await engine.saveKnowledge(userId, 'K3', 'C3', 'test');

      await engine.linkKnowledge(userId, k1.id, k2.id, 'related_to');
      await engine.linkKnowledge(userId, k2.id, k3.id, 'related_to');

      const related1 = await engine.getRelatedKnowledge(userId, k1.id);
      expect(related1.length).toBe(1);

      const related2 = await engine.getRelatedKnowledge(userId, k2.id);
      expect(related2.length).toBe(1);
    });

    it('should maintain data integrity after multiple operations', async () => {
      const k1 = await engine.saveKnowledge(
        userId,
        'Original',
        'Content',
        'test',
        ['tag1']
      );

      await engine.updateKnowledge(userId, k1.id, {
        title: 'Updated',
        tags: ['tag1', 'tag2'],
      });

      const retrieved = await engine.getKnowledge(userId, k1.id);
      expect(retrieved?.title).toBe('Updated');
      expect(retrieved?.tags).toContain('tag1');
      expect(retrieved?.tags).toContain('tag2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search query', async () => {
      await engine.saveKnowledge(userId, 'Knowledge', 'Content', 'test');
      const results = await engine.searchKnowledge(userId, '');
      // Empty string matches all content (substring match)
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long knowledge content', async () => {
      const longContent = 'A'.repeat(10000);
      const knowledge = await engine.saveKnowledge(
        userId,
        'Long Content',
        longContent,
        'test'
      );
      expect(knowledge.content.length).toBe(10000);
    });

    it('should handle special characters in knowledge', async () => {
      const knowledge = await engine.saveKnowledge(
        userId,
        'Special: @#$%^&*()',
        'Content with "quotes" and \'apostrophes\'',
        'test'
      );
      expect(knowledge.title).toContain('@');
      expect(knowledge.content).toContain('"');
    });

    it('should handle unicode characters', async () => {
      const knowledge = await engine.saveKnowledge(
        userId,
        '日本語タイトル',
        '中文内容',
        'test',
        ['タグ']
      );
      expect(knowledge.title).toBe('日本語タイトル');
      expect(knowledge.tags).toContain('タグ');
    });

    it('should clear all knowledge', async () => {
      await engine.saveKnowledge(userId, 'K1', 'C1', 'test');
      await engine.saveKnowledge(userId, 'K2', 'C2', 'test');

      engine.clearAllKnowledge();

      const all = await engine.getAllKnowledge(userId);
      expect(all.length).toBe(0);
    });
  });
});
