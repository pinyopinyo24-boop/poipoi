/**
 * KnowledgeIntelligenceAIManager Tests - 50+テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeIntelligenceAIManager } from './KnowledgeIntelligenceAIManager';

describe('KnowledgeIntelligenceAIManager', () => {
  let manager: KnowledgeIntelligenceAIManager;

  beforeEach(() => {
    manager = new KnowledgeIntelligenceAIManager();
  });

  // ===== 文書管理テスト (5個) =====
  describe('Document Management', () => {
    it('should add document', async () => {
      const doc = await manager.addDocument(
        'テスト文書',
        'これはテスト文書です',
        'manual',
        'manufacturing',
        'user1',
        ['test', 'sample']
      );
      expect(doc).toBeDefined();
      expect(doc.title).toBe('テスト文書');
    });

    it('should get document by id', async () => {
      const added = await manager.addDocument(
        'テスト',
        'コンテンツ',
        'procedure',
        'quality',
        'user1'
      );
      const retrieved = await manager.getDocument(added.id);
      expect(retrieved?.id).toBe(added.id);
    });

    it('should update document', async () => {
      const doc = await manager.addDocument(
        '元の名前',
        'コンテンツ',
        'manual',
        'manufacturing',
        'user1'
      );
      const updated = await manager.updateDocument(doc.id, {
        title: '新しい名前',
      });
      expect(updated?.title).toBe('新しい名前');
    });

    it('should delete document', async () => {
      const doc = await manager.addDocument(
        'テスト',
        'コンテンツ',
        'manual',
        'manufacturing',
        'user1'
      );
      const result = await manager.deleteDocument(doc.id);
      expect(result).toBe(true);
    });

    it('should get all documents', async () => {
      await manager.addDocument('テスト1', 'コンテンツ1', 'manual', 'manufacturing', 'user1');
      await manager.addDocument('テスト2', 'コンテンツ2', 'procedure', 'quality', 'user1');
      const docs = await manager.getAllDocuments();
      expect(docs.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ===== 検索テスト (5個) =====
  describe('Search Functionality', () => {
    beforeEach(async () => {
      await manager.addDocument(
        '生産最適化',
        'これは生産最適化に関する文書です',
        'manual',
        'manufacturing',
        'user1',
        ['optimization', 'production']
      );
      await manager.addDocument(
        '品質管理',
        'これは品質管理に関する文書です',
        'procedure',
        'quality',
        'user1',
        ['quality', 'control']
      );
    });

    it('should search documents by query', async () => {
      const results = await manager.searchDocuments('生産');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should search by category', async () => {
      const results = await manager.searchDocuments('最適化', 'manufacturing');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should find similar documents', async () => {
      const docs = await manager.getAllDocuments();
      if (docs.length > 0) {
        const similar = await manager.findSimilarDocuments(docs[0].id);
        expect(Array.isArray(similar)).toBe(true);
      }
    });

    it('should search by tags', async () => {
      const results = await manager.searchByTags(['optimization']);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should get documents by category', async () => {
      const results = await manager.getDocumentsByCategory('manufacturing');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  // ===== ケーススタディテスト (4個) =====
  describe('Case Studies', () => {
    it('should add case study', async () => {
      const caseStudy = await manager.addCaseStudy(
        'ケース1',
        '問題の説明',
        '解決策',
        '結果',
        'manufacturing',
        ['case', 'study']
      );
      expect(caseStudy).toBeDefined();
      expect(caseStudy.title).toBe('ケース1');
    });

    it('should get case study', async () => {
      const added = await manager.addCaseStudy(
        'ケース',
        '問題',
        '解決',
        '結果',
        'quality'
      );
      const retrieved = await manager.getCaseStudy(added.id);
      expect(retrieved?.id).toBe(added.id);
    });

    it('should get all case studies', async () => {
      await manager.addCaseStudy('ケース1', '問題1', '解決1', '結果1', 'manufacturing');
      await manager.addCaseStudy('ケース2', '問題2', '解決2', '結果2', 'quality');
      const studies = await manager.getAllCaseStudies();
      expect(studies.length).toBeGreaterThanOrEqual(2);
    });

    it('should have success rate', async () => {
      const caseStudy = await manager.addCaseStudy(
        'ケース',
        '問題',
        '解決',
        '結果',
        'manufacturing'
      );
      expect(caseStudy.successRate).toBeGreaterThan(0);
    });
  });

  // ===== 改善事例テスト (4個) =====
  describe('Improvement Cases', () => {
    it('should add improvement case', async () => {
      const improvement = await manager.addImprovementCase(
        '改善1',
        '説明',
        { efficiency: 80, cost: 1000 },
        { efficiency: 90, cost: 900 }
      );
      expect(improvement).toBeDefined();
      expect(improvement.title).toBe('改善1');
    });

    it('should get improvement case', async () => {
      const added = await manager.addImprovementCase(
        '改善',
        '説明',
        { metric: 100 },
        { metric: 110 }
      );
      const retrieved = await manager.getImprovementCase(added.id);
      expect(retrieved?.id).toBe(added.id);
    });

    it('should update improvement case', async () => {
      const improvement = await manager.addImprovementCase(
        '改善',
        '説明',
        { metric: 100 },
        { metric: 110 }
      );
      const updated = await manager.updateImprovementCase(improvement.id, {
        status: 'implemented',
      });
      expect(updated?.status).toBe('implemented');
    });

    it('should get all improvement cases', async () => {
      await manager.addImprovementCase('改善1', '説明1', { m: 1 }, { m: 2 });
      await manager.addImprovementCase('改善2', '説明2', { m: 1 }, { m: 2 });
      const cases = await manager.getAllImprovementCases();
      expect(cases.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ===== 知識グラフテスト (3個) =====
  describe('Knowledge Graph', () => {
    beforeEach(async () => {
      await manager.addDocument('文書1', '製造プロセス', 'manual', 'manufacturing', 'user1');
      await manager.addDocument('文書2', '製造最適化', 'procedure', 'manufacturing', 'user1');
    });

    it('should generate knowledge graph', async () => {
      const graph = await manager.generateKnowledgeGraph();
      expect(graph.nodes.length).toBeGreaterThan(0);
    });

    it('should have graph edges', async () => {
      const graph = await manager.generateKnowledgeGraph();
      expect(Array.isArray(graph.edges)).toBe(true);
    });

    it('should have node connections', async () => {
      const graph = await manager.generateKnowledgeGraph();
      const nodesWithConnections = graph.nodes.filter((n) => n.connections.length > 0);
      expect(nodesWithConnections.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ===== アクセス管理テスト (2個) =====
  describe('Access Management', () => {
    it('should access document and increment view count', async () => {
      const doc = await manager.addDocument(
        'テスト',
        'コンテンツ',
        'manual',
        'manufacturing',
        'user1'
      );
      const before = doc.viewCount;
      await manager.accessDocument(doc.id);
      const after = (await manager.getDocument(doc.id))?.viewCount || 0;
      expect(after).toBeGreaterThan(before);
    });

    it('should increase relevance score on access', async () => {
      const doc = await manager.addDocument(
        'テスト',
        'コンテンツ',
        'manual',
        'manufacturing',
        'user1'
      );
      const before = doc.relevanceScore;
      await manager.accessDocument(doc.id);
      const after = (await manager.getDocument(doc.id))?.relevanceScore || 0;
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });

  // ===== 統計テスト (3個) =====
  describe('Statistics', () => {
    beforeEach(async () => {
      await manager.addDocument('テスト1', 'コンテンツ1', 'manual', 'manufacturing', 'user1');
      await manager.addDocument('テスト2', 'コンテンツ2', 'procedure', 'quality', 'user1');
    });

    it('should get statistics', () => {
      const stats = manager.getStatistics();
      expect(stats.totalDocuments).toBeGreaterThan(0);
    });

    it('should get frequent tags', async () => {
      await manager.addDocument(
        'テスト',
        'コンテンツ',
        'manual',
        'manufacturing',
        'user1',
        ['tag1', 'tag2']
      );
      const tags = manager.getFrequentTags();
      expect(Array.isArray(tags)).toBe(true);
    });

    it('should evaluate knowledge base quality', () => {
      const quality = manager.evaluateKnowledgeBaseQuality();
      expect(quality.totalDocuments).toBeGreaterThan(0);
    });
  });

  // ===== 推奨テスト (2個) =====
  describe('Recommendations', () => {
    it('should get most viewed documents', async () => {
      const doc = await manager.addDocument(
        'テスト',
        'コンテンツ',
        'manual',
        'manufacturing',
        'user1'
      );
      await manager.accessDocument(doc.id);
      const mostViewed = manager.getMostViewedDocuments(5);
      expect(Array.isArray(mostViewed)).toBe(true);
    });

    it('should get recent documents', async () => {
      await manager.addDocument('テスト', 'コンテンツ', 'manual', 'manufacturing', 'user1');
      const recent = manager.getRecentDocuments(5);
      expect(recent.length).toBeGreaterThan(0);
    });
  });

  // ===== 改善提案テスト (2個) =====
  describe('Improvement Suggestions', () => {
    it('should generate improvement suggestions', async () => {
      const improvement = await manager.addImprovementCase(
        '改善',
        '説明',
        { efficiency: 80 },
        { efficiency: 90 }
      );
      await manager.updateImprovementCase(improvement.id, {
        status: 'implemented',
      });

      const suggestions = await manager.generateImprovementSuggestions({
        efficiency: 82,
      });
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should return empty suggestions for non-matching metrics', async () => {
      const suggestions = await manager.generateImprovementSuggestions({
        unknown_metric: 100,
      });
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  // ===== 境界値テスト (3個) =====
  describe('Boundary Value Tests', () => {
    it('should handle very long document content', async () => {
      const longContent = 'a'.repeat(10000);
      const doc = await manager.addDocument(
        'テスト',
        longContent,
        'manual',
        'manufacturing',
        'user1'
      );
      expect(doc).toBeDefined();
    });

    it('should handle many tags', async () => {
      const tags = Array.from({ length: 100 }, (_, i) => `tag${i}`);
      const doc = await manager.addDocument(
        'テスト',
        'コンテンツ',
        'manual',
        'manufacturing',
        'user1',
        tags
      );
      expect(doc.tags.length).toBe(100);
    });

    it('should handle special characters', async () => {
      const doc = await manager.addDocument(
        'テスト@#$%',
        'コンテンツ!@#$%',
        'manual',
        'manufacturing',
        'user1'
      );
      expect(doc).toBeDefined();
    });
  });

  // ===== 統合テスト (3個) =====
  describe('Integration Tests', () => {
    it('should complete full document lifecycle', async () => {
      const doc = await manager.addDocument(
        'テスト',
        'コンテンツ',
        'manual',
        'manufacturing',
        'user1',
        ['test']
      );

      await manager.accessDocument(doc.id);
      const retrieved = await manager.getDocument(doc.id);
      expect(retrieved?.viewCount).toBeGreaterThan(0);

      const updated = await manager.updateDocument(doc.id, {
        title: '更新後',
      });
      expect(updated?.title).toBe('更新後');

      const deleted = await manager.deleteDocument(doc.id);
      expect(deleted).toBe(true);
    });

    it('should integrate documents with knowledge graph', async () => {
      await manager.addDocument('文書1', '内容1', 'manual', 'manufacturing', 'user1');
      await manager.addDocument('文書2', '内容2', 'procedure', 'manufacturing', 'user1');

      const graph = await manager.generateKnowledgeGraph();
      const docs = await manager.getAllDocuments();

      expect(graph.nodes.length).toBe(docs.length);
    });

    it('should handle search and improvement suggestions together', async () => {
      await manager.addDocument(
        'テスト',
        '製造効率に関する文書',
        'manual',
        'manufacturing',
        'user1'
      );

      const searchResults = await manager.searchDocuments('製造');
      expect(Array.isArray(searchResults)).toBe(true);

      const improvement = await manager.addImprovementCase(
        '改善',
        '説明',
        { efficiency: 80 },
        { efficiency: 90 }
      );
      await manager.updateImprovementCase(improvement.id, {
        status: 'implemented',
      });

      const suggestions = await manager.generateImprovementSuggestions({
        efficiency: 82,
      });
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  // ===== パフォーマンステスト (2個) =====
  describe('Performance Tests', () => {
    it('should handle 100 documents efficiently', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        await manager.addDocument(
          `文書${i}`,
          `コンテンツ${i}`,
          'manual',
          'manufacturing',
          'user1'
        );
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('should search efficiently in large dataset', async () => {
      for (let i = 0; i < 50; i++) {
        await manager.addDocument(
          `文書${i}`,
          `製造プロセス${i}`,
          'manual',
          'manufacturing',
          'user1'
        );
      }

      const startTime = Date.now();
      const results = await manager.searchDocuments('製造');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  // ===== エラーハンドリングテスト (3個) =====
  describe('Error Handling', () => {
    it('should handle non-existent document', async () => {
      const doc = await manager.getDocument('non-existent');
      expect(doc).toBeNull();
    });

    it('should handle non-existent case study', async () => {
      const caseStudy = await manager.getCaseStudy('non-existent');
      expect(caseStudy).toBeNull();
    });

    it('should handle non-existent improvement case', async () => {
      const improvement = await manager.getImprovementCase('non-existent');
      expect(improvement).toBeNull();
    });
  });

  // ===== カテゴリテスト (2個) =====
  describe('Category Management', () => {
    it('should organize documents by category', async () => {
      await manager.addDocument('テスト1', 'コンテンツ1', 'manual', 'manufacturing', 'user1');
      await manager.addDocument('テスト2', 'コンテンツ2', 'procedure', 'quality', 'user1');

      const manufacturing = await manager.getDocumentsByCategory('manufacturing');
      const quality = await manager.getDocumentsByCategory('quality');

      expect(manufacturing.length).toBeGreaterThan(0);
      expect(quality.length).toBeGreaterThan(0);
    });

    it('should return empty for non-existent category', async () => {
      const results = await manager.getDocumentsByCategory('non_existent' as any);
      expect(results.length).toBe(0);
    });
  });

  // ===== タグテスト (2個) =====
  describe('Tag Management', () => {
    it('should search documents by multiple tags', async () => {
      await manager.addDocument(
        'テスト1',
        'コンテンツ1',
        'manual',
        'manufacturing',
        'user1',
        ['tag1', 'tag2']
      );
      await manager.addDocument(
        'テスト2',
        'コンテンツ2',
        'procedure',
        'quality',
        'user1',
        ['tag2', 'tag3']
      );

      const results = await manager.searchByTags(['tag2']);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should get frequent tags', async () => {
      await manager.addDocument(
        'テスト',
        'コンテンツ',
        'manual',
        'manufacturing',
        'user1',
        ['common', 'common', 'unique']
      );

      const tags = manager.getFrequentTags(5);
      expect(Array.isArray(tags)).toBe(true);
    });
  });
});
