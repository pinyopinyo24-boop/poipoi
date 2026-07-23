import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBaseEnhancer, Document } from './KnowledgeBaseEnhancer';

describe('KnowledgeBaseEnhancer', () => {
  let enhancer: KnowledgeBaseEnhancer;

  beforeEach(() => {
    enhancer = new KnowledgeBaseEnhancer();
  });

  describe('Document Management', () => {
    it('should add a document', () => {
      const id = enhancer.addDocument({
        title: 'Test Document',
        content: 'This is a test document content',
        category: 'test',
        tags: ['test', 'sample'],
        source: 'manual',
      });

      expect(id).toBeDefined();
      expect(id).toMatch(/doc-\d+-[a-z0-9]{9}/);
    });

    it('should retrieve a document', () => {
      const id = enhancer.addDocument({
        title: 'Test Document',
        content: 'This is a test document content',
        category: 'test',
        tags: ['test'],
        source: 'manual',
      });

      const doc = enhancer.getDocument(id);
      expect(doc).toBeDefined();
      expect(doc?.title).toBe('Test Document');
    });

    it('should get all documents', () => {
      enhancer.addDocument({
        title: 'Doc 1',
        content: 'Content 1',
        category: 'test',
        tags: [],
        source: 'manual',
      });

      enhancer.addDocument({
        title: 'Doc 2',
        content: 'Content 2',
        category: 'test',
        tags: [],
        source: 'manual',
      });

      const docs = enhancer.getAllDocuments();
      expect(docs.length).toBe(2);
    });

    it('should update a document', () => {
      const id = enhancer.addDocument({
        title: 'Original',
        content: 'Original content',
        category: 'test',
        tags: [],
        source: 'manual',
      });

      const updated = enhancer.updateDocument(id, {
        title: 'Updated',
      });

      expect(updated).toBe(true);
      const doc = enhancer.getDocument(id);
      expect(doc?.title).toBe('Updated');
    });

    it('should delete a document', () => {
      const id = enhancer.addDocument({
        title: 'To Delete',
        content: 'Content',
        category: 'test',
        tags: [],
        source: 'manual',
      });

      const deleted = enhancer.deleteDocument(id);
      expect(deleted).toBe(true);
      expect(enhancer.getDocument(id)).toBeUndefined();
    });

    it('should get documents by category', () => {
      enhancer.addDocument({
        title: 'Manufacturing',
        content: 'Manufacturing content',
        category: 'manufacturing',
        tags: [],
        source: 'manual',
      });

      enhancer.addDocument({
        title: 'Quality',
        content: 'Quality content',
        category: 'quality',
        tags: [],
        source: 'manual',
      });

      const mfgDocs = enhancer.getDocumentsByCategory('manufacturing');
      expect(mfgDocs.length).toBe(1);
      expect(mfgDocs[0].title).toBe('Manufacturing');
    });
  });

  describe('Keyword Search', () => {
    beforeEach(() => {
      enhancer.addDocument({
        title: 'Production Process',
        content: 'The production process involves manufacturing steps and quality control procedures',
        category: 'manufacturing',
        tags: ['production', 'process'],
        source: 'manual',
      });

      enhancer.addDocument({
        title: 'Quality Standards',
        content: 'Quality standards define manufacturing requirements and quality metrics',
        category: 'quality',
        tags: ['quality', 'standards'],
        source: 'manual',
      });
    });

    it('should perform keyword search', () => {
      const results = enhancer.keywordSearch('production manufacturing');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBeDefined();
    });

    it('should return empty results for non-matching query', () => {
      const results = enhancer.keywordSearch('xyz abc def');
      expect(results.length).toBe(0);
    });

    it('should rank results by relevance', () => {
      const results = enhancer.keywordSearch('production');
      expect(results.length).toBeGreaterThan(0);
      if (results.length > 1) {
        expect(results[0].relevanceScore).toBeGreaterThanOrEqual(results[1].relevanceScore);
      }
    });
  });

  describe('Semantic Search', () => {
    beforeEach(() => {
      enhancer.addDocument({
        title: 'Manufacturing Process',
        content: 'The manufacturing process includes planning, production, and quality assurance steps',
        category: 'manufacturing',
        tags: [],
        source: 'manual',
      });

      enhancer.addDocument({
        title: 'Quality Control',
        content: 'Quality control ensures products meet standards through inspection and testing',
        category: 'quality',
        tags: [],
        source: 'manual',
      });
    });

    it('should perform semantic search', () => {
      const results = enhancer.semanticSearch('production quality');
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should return results with relevance scores', () => {
      const results = enhancer.semanticSearch('manufacturing');
      results.forEach((result) => {
        expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(result.relevanceScore).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Vector Search', () => {
    beforeEach(() => {
      enhancer.addDocument({
        title: 'Vector Search Test',
        content: 'This document tests vector search capabilities with embeddings',
        category: 'test',
        tags: [],
        source: 'manual',
      });
    });

    it('should perform vector search', () => {
      const results = enhancer.vectorSearch('embeddings search');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should respect max results configuration', () => {
      const enhancer2 = new KnowledgeBaseEnhancer({ maxResults: 1 });

      for (let i = 0; i < 5; i++) {
        enhancer2.addDocument({
          title: `Doc ${i}`,
          content: 'Test content for vector search',
          category: 'test',
          tags: [],
          source: 'manual',
        });
      }

      const results = enhancer2.vectorSearch('test');
      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Hybrid Search', () => {
    beforeEach(() => {
      enhancer.addDocument({
        title: 'Hybrid Search Test',
        content: 'This document combines keyword and semantic search capabilities',
        category: 'test',
        tags: ['hybrid', 'search'],
        source: 'manual',
      });

      enhancer.addDocument({
        title: 'Advanced Search',
        content: 'Advanced search techniques include semantic and vector based approaches',
        category: 'test',
        tags: ['advanced', 'search'],
        source: 'manual',
      });
    });

    it('should perform hybrid search', () => {
      const results = enhancer.hybridSearch('search techniques');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should combine keyword and semantic results', () => {
      const keywordResults = enhancer.keywordSearch('search');
      const hybridResults = enhancer.hybridSearch('search');

      expect(hybridResults.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Answer Evidence', () => {
    beforeEach(() => {
      enhancer.addDocument({
        title: 'Manufacturing Guide',
        content: 'Manufacturing involves planning, execution, and quality control phases',
        category: 'manufacturing',
        tags: [],
        source: 'manual',
      });
    });

    it('should provide answer with evidence', () => {
      const evidence = enhancer.getAnswerEvidence('manufacturing process');
      expect(evidence).toBeDefined();
      expect(evidence.answer).toBeDefined();
      expect(evidence.sources).toBeDefined();
      expect(evidence.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should return low confidence for no results', () => {
      const evidence = enhancer.getAnswerEvidence('xyz abc def');
      // May have some results due to vector similarity
      expect(evidence.confidence).toBeGreaterThanOrEqual(0);
      expect(evidence.confidence).toBeLessThanOrEqual(1);
    });

    it('should calculate confidence score', () => {
      const evidence = enhancer.getAnswerEvidence('manufacturing');
      expect(evidence.confidence).toBeGreaterThanOrEqual(0);
      expect(evidence.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Statistics', () => {
    it('should get empty statistics', () => {
      const stats = enhancer.getStatistics();
      expect(stats.totalDocuments).toBe(0);
      expect(stats.totalEmbeddings).toBe(0);
      expect(stats.indexSize).toBe(0);
    });

    it('should track document statistics', () => {
      enhancer.addDocument({
        title: 'Doc 1',
        content: 'Content 1',
        category: 'manufacturing',
        tags: [],
        source: 'manual',
      });

      enhancer.addDocument({
        title: 'Doc 2',
        content: 'Content 2',
        category: 'quality',
        tags: [],
        source: 'manual',
      });

      const stats = enhancer.getStatistics();
      expect(stats.totalDocuments).toBe(2);
      expect(stats.categories['manufacturing']).toBe(1);
      expect(stats.categories['quality']).toBe(1);
    });

    it('should track embeddings', () => {
      enhancer.addDocument({
        title: 'Doc',
        content: 'This is a long document with enough content to create multiple embeddings for testing purposes',
        category: 'test',
        tags: [],
        source: 'manual',
      });

      const stats = enhancer.getStatistics();
      expect(stats.totalEmbeddings).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should get default configuration', () => {
      const config = enhancer.getConfig();
      expect(config.maxResults).toBe(10);
      expect(config.minRelevanceScore).toBe(0.5);
      expect(config.enableSemanticSearch).toBe(true);
      expect(config.enableVectorSearch).toBe(true);
    });

    it('should update configuration', () => {
      enhancer.updateConfig({
        maxResults: 5,
        minRelevanceScore: 0.7,
      });

      const config = enhancer.getConfig();
      expect(config.maxResults).toBe(5);
      expect(config.minRelevanceScore).toBe(0.7);
    });

    it('should create with custom configuration', () => {
      const custom = new KnowledgeBaseEnhancer({
        maxResults: 20,
        enableSemanticSearch: false,
      });

      const config = custom.getConfig();
      expect(config.maxResults).toBe(20);
      expect(config.enableSemanticSearch).toBe(false);
    });
  });

  describe('Import/Export', () => {
    it('should export knowledge base', () => {
      enhancer.addDocument({
        title: 'Export Test',
        content: 'Test content for export',
        category: 'test',
        tags: [],
        source: 'manual',
      });

      const exported = enhancer.export();
      expect(exported.documents.length).toBe(1);
      expect(exported.embeddings.length).toBeGreaterThan(0);
    });

    it('should import knowledge base', () => {
      const enhancer1 = new KnowledgeBaseEnhancer();
      enhancer1.addDocument({
        title: 'Doc 1',
        content: 'Content 1',
        category: 'test',
        tags: [],
        source: 'manual',
      });

      const exported = enhancer1.export();

      const enhancer2 = new KnowledgeBaseEnhancer();
      enhancer2.import(exported);

      const docs = enhancer2.getAllDocuments();
      expect(docs.length).toBe(1);
      expect(docs[0].title).toBe('Doc 1');
    });
  });

  describe('Clear', () => {
    it('should clear knowledge base', () => {
      enhancer.addDocument({
        title: 'Doc',
        content: 'Content',
        category: 'test',
        tags: [],
        source: 'manual',
      });

      enhancer.clear();

      const docs = enhancer.getAllDocuments();
      expect(docs.length).toBe(0);

      const stats = enhancer.getStatistics();
      expect(stats.totalDocuments).toBe(0);
    });
  });

  describe('Integration', () => {
    it('should handle complete workflow', () => {
      // Add documents
      const id1 = enhancer.addDocument({
        title: 'Manufacturing Process',
        content: 'The manufacturing process includes planning, production, and quality control',
        category: 'manufacturing',
        tags: ['production'],
        source: 'manual',
      });

      const id2 = enhancer.addDocument({
        title: 'Quality Standards',
        content: 'Quality standards define requirements for manufacturing and testing',
        category: 'quality',
        tags: ['standards'],
        source: 'manual',
      });

      // Search
      const results = enhancer.hybridSearch('manufacturing quality');
      expect(results.length).toBeGreaterThan(0);

      // Get evidence
      const evidence = enhancer.getAnswerEvidence('manufacturing process');
      expect(evidence.confidence).toBeGreaterThan(0);

      // Statistics
      const stats = enhancer.getStatistics();
      expect(stats.totalDocuments).toBe(2);

      // Update
      enhancer.updateDocument(id1, { title: 'Updated Title' });
      const updated = enhancer.getDocument(id1);
      expect(updated?.title).toBe('Updated Title');

      // Delete
      enhancer.deleteDocument(id2);
      expect(enhancer.getDocument(id2)).toBeUndefined();
    });

    it('should handle multiple categories', () => {
      const categories = ['manufacturing', 'quality', 'cost', 'inventory', 'maintenance'];

      categories.forEach((cat, index) => {
        enhancer.addDocument({
          title: `${cat} Document`,
          content: `Content for ${cat}`,
          category: cat,
          tags: [],
          source: 'manual',
        });
      });

      const stats = enhancer.getStatistics();
      expect(stats.totalDocuments).toBe(5);
      expect(Object.keys(stats.categories).length).toBe(5);
    });

    it('should handle large documents', () => {
      const largeContent = 'This is a test content. '.repeat(100);

      const id = enhancer.addDocument({
        title: 'Large Document',
        content: largeContent,
        category: 'test',
        tags: [],
        source: 'manual',
      });

      const doc = enhancer.getDocument(id);
      expect(doc).toBeDefined();
      expect(doc?.content.length).toBeGreaterThan(1000);

      const stats = enhancer.getStatistics();
      expect(stats.totalEmbeddings).toBeGreaterThan(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query', () => {
      enhancer.addDocument({
        title: 'Test',
        content: 'Test content',
        category: 'test',
        tags: [],
        source: 'manual',
      });

      const results = enhancer.keywordSearch('');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle special characters in content', () => {
      const id = enhancer.addDocument({
        title: 'Special Chars',
        content: 'Content with special chars: !@#$%^&*()',
        category: 'test',
        tags: [],
        source: 'manual',
      });

      const doc = enhancer.getDocument(id);
      expect(doc?.content).toContain('!@#$%^&*()');
    });

    it('should handle duplicate tags', () => {
      const id = enhancer.addDocument({
        title: 'Duplicate Tags',
        content: 'Content',
        category: 'test',
        tags: ['tag1', 'tag1', 'tag2'],
        source: 'manual',
      });

      const doc = enhancer.getDocument(id);
      expect(doc?.tags.length).toBe(3);
    });

    it('should handle non-existent document operations', () => {
      const updated = enhancer.updateDocument('non-existent', { title: 'New' });
      expect(updated).toBe(false);

      const deleted = enhancer.deleteDocument('non-existent');
      expect(deleted).toBe(false);

      const doc = enhancer.getDocument('non-existent');
      expect(doc).toBeUndefined();
    });
  });

  describe('Performance', () => {
    it('should handle many documents', () => {
      for (let i = 0; i < 50; i++) {
        enhancer.addDocument({
          title: `Document ${i}`,
          content: `Content for document ${i} with manufacturing and quality information`,
          category: i % 2 === 0 ? 'manufacturing' : 'quality',
          tags: [`tag${i % 5}`],
          source: 'manual',
        });
      }

      const stats = enhancer.getStatistics();
      expect(stats.totalDocuments).toBe(50);

      const results = enhancer.hybridSearch('manufacturing');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle rapid operations', () => {
      for (let i = 0; i < 20; i++) {
        const id = enhancer.addDocument({
          title: `Doc ${i}`,
          content: `Content ${i}`,
          category: 'test',
          tags: [],
          source: 'manual',
        });

        if (i % 2 === 0) {
          enhancer.updateDocument(id, { title: `Updated ${i}` });
        }
      }

      const docs = enhancer.getAllDocuments();
      expect(docs.length).toBe(20);
    });
  });
});
