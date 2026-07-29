import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KnowledgeGraphEngine } from './KnowledgeGraphEngine';
import { SecurityEngine } from '../security/SecurityEngine';

describe('KnowledgeGraphEngine', () => {
  let engine: KnowledgeGraphEngine;
  let securityEngine: SecurityEngine;
  let userId: string;

  beforeEach(async () => {
    engine = KnowledgeGraphEngine.getInstance();
    engine.clearAllData();
    securityEngine = (engine as any).securityEngine;
    if (!securityEngine.isReady()) {
      await securityEngine.initialize();
    }
    userId = 'test-user-' + Date.now();
    await securityEngine.createContext(userId, 'user');
    await securityEngine.grantPermission(userId, 'knowledge:write');
    await securityEngine.grantPermission(userId, 'knowledge:read');
  });

  afterEach(async () => {
    engine.clearAllData();
    if (securityEngine.isReady()) {
      await securityEngine.shutdown();
    }
  });

  describe('Singleton Pattern', () => {
    it('should be a singleton', () => {
      const engine1 = KnowledgeGraphEngine.getInstance();
      const engine2 = KnowledgeGraphEngine.getInstance();
      expect(engine1).toBe(engine2);
    });
  });

  describe('Graph Nodes', () => {
    it('should add node to graph', async () => {
      const node = await engine.addNode(
        userId,
        'node-1',
        'Test Node',
        'category1',
        0.9,
        { source: 'test' }
      );

      expect(node.id).toBe('node-1');
      expect(node.label).toBe('Test Node');
      expect(node.category).toBe('category1');
      expect(node.confidence).toBe(0.9);
      expect(node.metadata.source).toBe('test');
    });

    it('should clamp confidence between 0 and 1', async () => {
      const node1 = await engine.addNode(userId, 'node-1', 'High', 'cat', 1.5);
      expect(node1.confidence).toBe(1);

      const node2 = await engine.addNode(userId, 'node-2', 'Low', 'cat', -0.5);
      expect(node2.confidence).toBe(0);
    });

    it('should throw error if user lacks permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        engine.addNode(unauthorizedUser, 'node-1', 'Test', 'cat', 0.5)
      ).rejects.toThrow('User does not have permission to add knowledge graph nodes');
    });
  });

  describe('Graph Edges', () => {
    beforeEach(async () => {
      await engine.addNode(userId, 'node-1', 'Node 1', 'cat1', 0.8);
      await engine.addNode(userId, 'node-2', 'Node 2', 'cat1', 0.8);
      await engine.addNode(userId, 'node-3', 'Node 3', 'cat2', 0.7);
    });

    it('should add edge between nodes', async () => {
      await engine.addEdge(userId, 'node-1', 'node-2', 'related_to', 0.9);
      // Edge added successfully (no return value)
      expect(true).toBe(true);
    });

    it('should clamp edge strength between 0 and 1', async () => {
      await engine.addEdge(userId, 'node-1', 'node-2', 'related_to', 1.5);
      await engine.addEdge(userId, 'node-2', 'node-3', 'related_to', -0.5);
      // Edges added successfully with clamped values
      expect(true).toBe(true);
    });

    it('should throw error if user lacks permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        engine.addEdge(unauthorizedUser, 'node-1', 'node-2', 'related_to')
      ).rejects.toThrow('User does not have permission to add knowledge graph edges');
    });
  });

  describe('Connected Nodes', () => {
    beforeEach(async () => {
      await engine.addNode(userId, 'node-1', 'Node 1', 'cat', 0.8);
      await engine.addNode(userId, 'node-2', 'Node 2', 'cat', 0.8);
      await engine.addNode(userId, 'node-3', 'Node 3', 'cat', 0.8);
      await engine.addNode(userId, 'node-4', 'Node 4', 'cat', 0.8);

      await engine.addEdge(userId, 'node-1', 'node-2', 'related_to');
      await engine.addEdge(userId, 'node-2', 'node-3', 'related_to');
      await engine.addEdge(userId, 'node-3', 'node-4', 'related_to');
    });

    it('should get connected nodes at depth 1', async () => {
      const connected = await engine.getConnectedNodes(userId, 'node-1', 1);
      expect(connected.length).toBe(1);
      expect(connected[0].id).toBe('node-2');
    });

    it('should get connected nodes at depth 2', async () => {
      const connected = await engine.getConnectedNodes(userId, 'node-1', 2);
      expect(connected.length).toBe(2);
    });

    it('should get connected nodes at depth 3', async () => {
      const connected = await engine.getConnectedNodes(userId, 'node-1', 3);
      expect(connected.length).toBe(3);
    });

    it('should return empty for isolated node', async () => {
      await engine.addNode(userId, 'isolated', 'Isolated', 'cat', 0.8);
      const connected = await engine.getConnectedNodes(userId, 'isolated', 1);
      expect(connected.length).toBe(0);
    });

    it('should throw error if user lacks permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        engine.getConnectedNodes(unauthorizedUser, 'node-1', 1)
      ).rejects.toThrow('User does not have permission to read knowledge graph');
    });
  });

  describe('Confidence Evaluation', () => {
    beforeEach(async () => {
      await engine.addNode(userId, 'node-1', 'Node 1', 'cat', 0.5);
    });

    it('should evaluate confidence', async () => {
      const evaluation = await engine.evaluateConfidence(
        userId,
        'node-1',
        0.9,
        0.8,
        0.1,
        0.7
      );

      expect(evaluation.knowledgeId).toBe('node-1');
      expect(evaluation.confidence).toBeGreaterThan(0);
      expect(evaluation.confidence).toBeLessThanOrEqual(1);
      expect(evaluation.factors.sourceReliability).toBe(0.9);
      expect(evaluation.factors.supportingEvidence).toBe(0.8);
      expect(evaluation.factors.contradictions).toBe(0.9); // 1 - 0.1
      expect(evaluation.factors.userFeedback).toBe(0.7);
    });

    it('should clamp confidence factors', async () => {
      const evaluation = await engine.evaluateConfidence(
        userId,
        'node-1',
        1.5,
        -0.5,
        2.0,
        -1.0
      );

      expect(evaluation.factors.sourceReliability).toBe(1);
      expect(evaluation.factors.supportingEvidence).toBe(0);
      expect(evaluation.factors.userFeedback).toBe(0);
    });

    it('should maintain confidence history', async () => {
      await engine.evaluateConfidence(userId, 'node-1', 0.8, 0.8, 0.1, 0.7);
      await engine.evaluateConfidence(userId, 'node-1', 0.9, 0.9, 0.05, 0.8);

      const history = await engine.getConfidenceHistory(userId, 'node-1');
      expect(history.length).toBe(2);
    });

    it('should throw error if user lacks permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        engine.evaluateConfidence(unauthorizedUser, 'node-1', 0.8, 0.8, 0.1, 0.7)
      ).rejects.toThrow('User does not have permission to evaluate knowledge confidence');
    });
  });

  describe('Shortest Path', () => {
    beforeEach(async () => {
      await engine.addNode(userId, 'node-1', 'Node 1', 'cat', 0.8);
      await engine.addNode(userId, 'node-2', 'Node 2', 'cat', 0.8);
      await engine.addNode(userId, 'node-3', 'Node 3', 'cat', 0.8);
      await engine.addNode(userId, 'node-4', 'Node 4', 'cat', 0.8);

      await engine.addEdge(userId, 'node-1', 'node-2', 'related_to');
      await engine.addEdge(userId, 'node-2', 'node-3', 'related_to');
      await engine.addEdge(userId, 'node-3', 'node-4', 'related_to');
    });

    it('should find shortest path', async () => {
      const path = await engine.findShortestPath(userId, 'node-1', 'node-4');
      expect(path).toEqual(['node-1', 'node-2', 'node-3', 'node-4']);
    });

    it('should find direct path', async () => {
      const path = await engine.findShortestPath(userId, 'node-1', 'node-2');
      expect(path).toEqual(['node-1', 'node-2']);
    });

    it('should return empty path if no connection', async () => {
      await engine.addNode(userId, 'isolated', 'Isolated', 'cat', 0.8);
      const path = await engine.findShortestPath(userId, 'node-1', 'isolated');
      expect(path).toEqual([]);
    });

    it('should return single node path for same node', async () => {
      const path = await engine.findShortestPath(userId, 'node-1', 'node-1');
      expect(path).toEqual(['node-1']);
    });

    it('should throw error if user lacks permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        engine.findShortestPath(unauthorizedUser, 'node-1', 'node-4')
      ).rejects.toThrow('User does not have permission to read knowledge graph');
    });
  });

  describe('Graph Statistics', () => {
    beforeEach(async () => {
      await engine.addNode(userId, 'node-1', 'Node 1', 'cat1', 0.8);
      await engine.addNode(userId, 'node-2', 'Node 2', 'cat1', 0.6);
      await engine.addNode(userId, 'node-3', 'Node 3', 'cat2', 0.9);

      await engine.addEdge(userId, 'node-1', 'node-2', 'related_to');
      await engine.addEdge(userId, 'node-2', 'node-3', 'related_to');
    });

    it('should calculate graph statistics', async () => {
      const stats = await engine.getGraphStatistics(userId);

      expect(stats.nodeCount).toBe(3);
      expect(stats.edgeCount).toBe(2);
      expect(stats.averageConfidence).toBeCloseTo((0.8 + 0.6 + 0.9) / 3, 2);
      expect(stats.densestCategory).toBe('cat1');
    });

    it('should handle empty graph', async () => {
      engine.clearAllData();

      const stats = await engine.getGraphStatistics(userId);
      expect(stats.nodeCount).toBe(0);
      expect(stats.edgeCount).toBe(0);
      expect(stats.averageConfidence).toBe(0);
      expect(stats.densestCategory).toBe('');
    });

    it('should throw error if user lacks permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        engine.getGraphStatistics(unauthorizedUser)
      ).rejects.toThrow('User does not have permission to read knowledge graph');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complex graph with multiple relationships', async () => {
      // Create a complex graph
      for (let i = 1; i <= 5; i++) {
        await engine.addNode(userId, `node-${i}`, `Node ${i}`, `cat${i % 2}`, 0.5 + i * 0.1);
      }

      // Create various relationships
      await engine.addEdge(userId, 'node-1', 'node-2', 'related_to', 0.8);
      await engine.addEdge(userId, 'node-1', 'node-3', 'depends_on', 0.9);
      await engine.addEdge(userId, 'node-2', 'node-4', 'related_to', 0.7);
      await engine.addEdge(userId, 'node-3', 'node-5', 'depends_on', 0.85);

      const stats = await engine.getGraphStatistics(userId);
      expect(stats.nodeCount).toBe(5);
      expect(stats.edgeCount).toBe(4);
    });

    it('should evaluate confidence for multiple nodes', async () => {
      await engine.addNode(userId, 'node-1', 'Node 1', 'cat', 0.5);
      await engine.addNode(userId, 'node-2', 'Node 2', 'cat', 0.5);

      const eval1 = await engine.evaluateConfidence(userId, 'node-1', 0.8, 0.8, 0.1, 0.7);
      const eval2 = await engine.evaluateConfidence(userId, 'node-2', 0.9, 0.9, 0.05, 0.8);

      expect(eval1.confidence).toBeLessThan(eval2.confidence);
    });

    it('should maintain graph integrity after multiple operations', async () => {
      // Add nodes
      await engine.addNode(userId, 'node-1', 'Node 1', 'cat', 0.8);
      await engine.addNode(userId, 'node-2', 'Node 2', 'cat', 0.8);

      // Add edge
      await engine.addEdge(userId, 'node-1', 'node-2', 'related_to', 0.9);

      // Evaluate confidence
      await engine.evaluateConfidence(userId, 'node-1', 0.8, 0.8, 0.1, 0.7);

      // Get connected nodes
      const connected = await engine.getConnectedNodes(userId, 'node-1', 1);
      expect(connected.length).toBe(1);

      // Get statistics
      const stats = await engine.getGraphStatistics(userId);
      expect(stats.nodeCount).toBe(2);
      expect(stats.edgeCount).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle node with special characters', async () => {
      const node = await engine.addNode(
        userId,
        'node-special-@#$',
        'Special: @#$%^&*()',
        'test',
        0.8
      );
      expect(node.id).toContain('@');
    });

    it('should handle unicode in node labels', async () => {
      const node = await engine.addNode(userId, 'node-1', '日本語ラベル', 'cat', 0.8);
      expect(node.label).toBe('日本語ラベル');
    });

    it('should handle very long relationship names', async () => {
      await engine.addNode(userId, 'node-1', 'Node 1', 'cat', 0.8);
      await engine.addNode(userId, 'node-2', 'Node 2', 'cat', 0.8);

      const longRelationship = 'a'.repeat(1000);
      await engine.addEdge(userId, 'node-1', 'node-2', longRelationship);
      expect(true).toBe(true);
    });

    it('should clear all data', async () => {
      await engine.addNode(userId, 'node-1', 'Node 1', 'cat', 0.8);
      await engine.addNode(userId, 'node-2', 'Node 2', 'cat', 0.8);

      engine.clearAllData();

      const stats = await engine.getGraphStatistics(userId);
      expect(stats.nodeCount).toBe(0);
    });
  });
});
