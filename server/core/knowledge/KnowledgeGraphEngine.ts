import { SecurityEngine } from '../security/SecurityEngine';

/**
 * Knowledge Graph Node
 */
export interface KnowledgeGraphNode {
  id: string;
  label: string;
  category: string;
  confidence: number;
  metadata: Record<string, any>;
}

/**
 * Knowledge Graph Edge
 */
export interface KnowledgeGraphEdgeData {
  sourceId: string;
  targetId: string;
  relationship: string;
  strength: number;
  metadata: Record<string, any>;
}

/**
 * Confidence Evaluation Result
 */
export interface ConfidenceEvaluation {
  knowledgeId: string;
  confidence: number;
  factors: {
    sourceReliability: number;
    supportingEvidence: number;
    contradictions: number;
    userFeedback: number;
  };
  timestamp: number;
  evaluatedBy: string;
}

/**
 * Knowledge Graph Engine - Manages knowledge relationships and confidence
 */
export class KnowledgeGraphEngine {
  private static instance: KnowledgeGraphEngine;
  private nodes: Map<string, KnowledgeGraphNode>;
  private edges: Map<string, KnowledgeGraphEdgeData[]>;
  private confidenceHistory: Map<string, ConfidenceEvaluation[]>;
  private securityEngine: SecurityEngine;

  private constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.confidenceHistory = new Map();
    this.securityEngine = new SecurityEngine();
  }

  public static getInstance(): KnowledgeGraphEngine {
    if (!KnowledgeGraphEngine.instance) {
      KnowledgeGraphEngine.instance = new KnowledgeGraphEngine();
    }
    return KnowledgeGraphEngine.instance;
  }

  /**
   * Add node to knowledge graph
   */
  public async addNode(
    userId: string,
    knowledgeId: string,
    label: string,
    category: string,
    confidence: number,
    metadata: Record<string, any> = {}
  ): Promise<KnowledgeGraphNode> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to add knowledge graph nodes');
    }

    const node: KnowledgeGraphNode = {
      id: knowledgeId,
      label,
      category,
      confidence: Math.max(0, Math.min(1, confidence)),
      metadata,
    };

    this.nodes.set(knowledgeId, node);
    await this.securityEngine.logSecurityEvent('GRAPH_NODE_ADDED', userId, {
      nodeId: knowledgeId,
      label,
      category,
    });

    return node;
  }

  /**
   * Add edge to knowledge graph
   */
  public async addEdge(
    userId: string,
    sourceId: string,
    targetId: string,
    relationship: string,
    strength: number = 0.8,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to add knowledge graph edges');
    }

    const edge: KnowledgeGraphEdgeData = {
      sourceId,
      targetId,
      relationship,
      strength: Math.max(0, Math.min(1, strength)),
      metadata,
    };

    const edges = this.edges.get(sourceId) || [];
    edges.push(edge);
    this.edges.set(sourceId, edges);

    await this.securityEngine.logSecurityEvent('GRAPH_EDGE_ADDED', userId, {
      sourceId,
      targetId,
      relationship,
    });
  }

  /**
   * Get connected nodes
   */
  public async getConnectedNodes(
    userId: string,
    nodeId: string,
    depth: number = 1
  ): Promise<KnowledgeGraphNode[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read knowledge graph');
    }

    const connected = new Set<string>();
    const queue: Array<{ id: string; d: number }> = [{ id: nodeId, d: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.d >= depth) continue;

      const edges = this.edges.get(current.id) || [];
      for (const edge of edges) {
        if (!connected.has(edge.targetId)) {
          connected.add(edge.targetId);
          queue.push({ id: edge.targetId, d: current.d + 1 });
        }
      }
    }

    const nodes: KnowledgeGraphNode[] = [];
    for (const id of Array.from(connected)) {
      const node = this.nodes.get(id);
      if (node) {
        nodes.push(node);
      }
    }

    return nodes;
  }

  /**
   * Evaluate knowledge confidence
   */
  public async evaluateConfidence(
    userId: string,
    knowledgeId: string,
    sourceReliability: number = 0.8,
    supportingEvidence: number = 0.8,
    contradictions: number = 0.1,
    userFeedback: number = 0.5
  ): Promise<ConfidenceEvaluation> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to evaluate knowledge confidence');
    }

    // Normalize factors
    const factors = {
      sourceReliability: Math.max(0, Math.min(1, sourceReliability)),
      supportingEvidence: Math.max(0, Math.min(1, supportingEvidence)),
      contradictions: Math.max(0, Math.min(1, 1 - contradictions)),
      userFeedback: Math.max(0, Math.min(1, userFeedback)),
    };

    // Calculate weighted confidence
    const confidence =
      factors.sourceReliability * 0.3 +
      factors.supportingEvidence * 0.3 +
      factors.contradictions * 0.2 +
      factors.userFeedback * 0.2;

    const evaluation: ConfidenceEvaluation = {
      knowledgeId,
      confidence: Math.max(0, Math.min(1, confidence)),
      factors,
      timestamp: Date.now(),
      evaluatedBy: userId,
    };

    // Store evaluation
    const history = this.confidenceHistory.get(knowledgeId) || [];
    history.push(evaluation);
    this.confidenceHistory.set(knowledgeId, history);

    // Update node confidence
    const node = this.nodes.get(knowledgeId);
    if (node) {
      node.confidence = evaluation.confidence;
    }

    await this.securityEngine.logSecurityEvent('CONFIDENCE_EVALUATED', userId, {
      knowledgeId,
      confidence: evaluation.confidence,
    });

    return evaluation;
  }

  /**
   * Get confidence history
   */
  public async getConfidenceHistory(
    userId: string,
    knowledgeId: string
  ): Promise<ConfidenceEvaluation[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read knowledge graph');
    }

    return this.confidenceHistory.get(knowledgeId) || [];
  }

  /**
   * Find shortest path between two nodes
   */
  public async findShortestPath(
    userId: string,
    sourceId: string,
    targetId: string
  ): Promise<string[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read knowledge graph');
    }

    const queue: Array<{ id: string; path: string[] }> = [
      { id: sourceId, path: [sourceId] },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.id === targetId) {
        return current.path;
      }

      if (visited.has(current.id)) continue;
      visited.add(current.id);

      const edges = this.edges.get(current.id) || [];
      for (const edge of edges) {
        if (!visited.has(edge.targetId)) {
          queue.push({
            id: edge.targetId,
            path: [...current.path, edge.targetId],
          });
        }
      }
    }

    return [];
  }

  /**
   * Get graph statistics
   */
  public async getGraphStatistics(userId: string): Promise<{
    nodeCount: number;
    edgeCount: number;
    averageConfidence: number;
    densestCategory: string;
  }> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read knowledge graph');
    }

    const nodeCount = this.nodes.size;
    let edgeCount = 0;
    for (const edges of Array.from(this.edges.values())) {
      edgeCount += edges.length;
    }

    let totalConfidence = 0;
    for (const node of Array.from(this.nodes.values())) {
      totalConfidence += node.confidence;
    }
    const averageConfidence = nodeCount > 0 ? totalConfidence / nodeCount : 0;

    // Find densest category
    const categoryCount = new Map<string, number>();
    for (const node of Array.from(this.nodes.values())) {
      categoryCount.set(node.category, (categoryCount.get(node.category) || 0) + 1);
    }

    let densestCategory = '';
    let maxCount = 0;
    for (const [category, count] of Array.from(categoryCount)) {
      if (count > maxCount) {
        maxCount = count;
        densestCategory = category;
      }
    }

    return {
      nodeCount,
      edgeCount,
      averageConfidence,
      densestCategory,
    };
  }

  /**
   * Clear all graph data (for testing)
   */
  public clearAllData(): void {
    this.nodes.clear();
    this.edges.clear();
    this.confidenceHistory.clear();
  }
}
