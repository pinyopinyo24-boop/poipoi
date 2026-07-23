import { v4 as uuidv4 } from 'uuid';
import { MemoryEngine } from '../memory/MemoryEngine';
import { SecurityEngine } from '../security/SecurityEngine';

/**
 * Knowledge Entity Interface
 */
export interface KnowledgeEntity {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source: string;
  confidence: number; // 0-1
  version: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  relatedKnowledgeIds: string[];
  metadata: Record<string, any>;
  isActive: boolean;
}

/**
 * Knowledge Graph Edge
 */
export interface KnowledgeEdge {
  sourceId: string;
  targetId: string;
  relationship: string;
  strength: number; // 0-1
  metadata: Record<string, any>;
}

/**
 * Knowledge Search Result
 */
export interface KnowledgeSearchResult {
  knowledge: KnowledgeEntity;
  relevanceScore: number;
  matchedFields: string[];
}

/**
 * Knowledge Engine - Manages knowledge storage, retrieval, and relationships
 */
export class KnowledgeEngine {
  private static instance: KnowledgeEngine;
  private knowledgeStore: Map<string, KnowledgeEntity>;
  private knowledgeGraph: Map<string, KnowledgeEdge[]>;
  private categoryIndex: Map<string, Set<string>>;
  private tagIndex: Map<string, Set<string>>;
  private memoryEngine: MemoryEngine;
  private securityEngine: SecurityEngine;
  private versionHistory: Map<string, KnowledgeEntity[]>;

  private constructor() {
    this.knowledgeStore = new Map();
    this.knowledgeGraph = new Map();
    this.categoryIndex = new Map();
    this.tagIndex = new Map();
    this.versionHistory = new Map();
    this.memoryEngine = MemoryEngine.getInstance();
    this.securityEngine = new SecurityEngine();
    this.initializeSecurityEngine();
  }

  private async initializeSecurityEngine(): Promise<void> {
    if (!this.securityEngine.isReady()) {
      await this.securityEngine.initialize();
    }
  }

  public static getInstance(): KnowledgeEngine {
    if (!KnowledgeEngine.instance) {
      KnowledgeEngine.instance = new KnowledgeEngine();
    }
    return KnowledgeEngine.instance;
  }

  public async initialize(): Promise<void> {
    if (!this.securityEngine.isReady()) {
      await this.securityEngine.initialize();
    }
  }

  /**
   * Save knowledge to the engine
   */
  public async saveKnowledge(
    userId: string,
    title: string,
    content: string,
    category: string,
    tags: string[] = [],
    source: string = 'manual',
    confidence: number = 0.8,
    metadata: Record<string, any> = {}
  ): Promise<KnowledgeEntity> {
    // Ensure security engine is initialized
    if (!this.securityEngine.isReady()) {
      await this.securityEngine.initialize();
    }

    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to save knowledge');
    }

    const knowledgeId = uuidv4();
    const now = Date.now();

    const knowledge: KnowledgeEntity = {
      id: knowledgeId,
      title,
      content,
      category,
      tags,
      source,
      confidence: Math.max(0, Math.min(1, confidence)),
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      relatedKnowledgeIds: [],
      metadata,
      isActive: true,
    };

    this.knowledgeStore.set(knowledgeId, knowledge);

    // Update indexes
    this.updateCategoryIndex(category, knowledgeId);
    this.updateTagIndex(tags, knowledgeId);

    // Initialize version history
    this.versionHistory.set(knowledgeId, [knowledge]);

    // Log to audit
    await this.securityEngine.logSecurityEvent('KNOWLEDGE_CREATED', userId, {
      knowledgeId,
      title,
      category,
    });

    return knowledge;
  }

  /**
   * Retrieve knowledge by ID
   */
  public async getKnowledge(userId: string, knowledgeId: string): Promise<KnowledgeEntity | undefined> {
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read knowledge');
    }

    const knowledge = this.knowledgeStore.get(knowledgeId);
    if (knowledge) {
      await this.securityEngine.logSecurityEvent('KNOWLEDGE_ACCESSED', userId, { knowledgeId });
    }
    return knowledge;
  }

  /**
   * Search knowledge by keyword
   */
  public async searchKnowledge(userId: string, query: string, limit: number = 10): Promise<KnowledgeSearchResult[]> {
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to search knowledge');
    }

    const results: KnowledgeSearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const knowledge of Array.from(this.knowledgeStore.values())) {
      if (!knowledge.isActive) continue;

      const matchedFields: string[] = [];
      let relevanceScore = 0;

      // Title match
      if (knowledge.title.toLowerCase().includes(queryLower)) {
        matchedFields.push('title');
        relevanceScore += 0.5;
      }

      // Content match
      if (knowledge.content.toLowerCase().includes(queryLower)) {
        matchedFields.push('content');
        relevanceScore += 0.3;
      }

      // Tag match
      for (const tag of knowledge.tags) {
        if (tag.toLowerCase().includes(queryLower)) {
          matchedFields.push('tags');
          relevanceScore += 0.2;
          break;
        }
      }

      if (relevanceScore > 0) {
        results.push({
          knowledge,
          relevanceScore: Math.min(1, relevanceScore),
          matchedFields,
        });
      }
    }

    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    await this.securityEngine.logSecurityEvent('KNOWLEDGE_SEARCHED', userId, { query, resultCount: results.length });

    return results.slice(0, limit);
  }

  /**
   * Search knowledge by category
   */
  public async searchByCategory(userId: string, category: string): Promise<KnowledgeEntity[]> {
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to search knowledge');
    }

    const knowledgeIds = this.categoryIndex.get(category);
    if (!knowledgeIds) return [];

    const results: KnowledgeEntity[] = [];
    for (const id of Array.from(knowledgeIds)) {
      const knowledge = this.knowledgeStore.get(id);
      if (knowledge && knowledge.isActive) {
        results.push(knowledge);
      }
    }

    return results;
  }

  /**
   * Search knowledge by tags
   */
  public async searchByTags(userId: string, tags: string[]): Promise<KnowledgeEntity[]> {
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to search knowledge');
    }

    const resultMap = new Map<string, number>();

    for (const tag of tags) {
      const knowledgeIds = this.tagIndex.get(tag);
      if (knowledgeIds) {
        for (const id of Array.from(knowledgeIds)) {
          resultMap.set(id, (resultMap.get(id) || 0) + 1);
        }
      }
    }

    const results: KnowledgeEntity[] = [];
    for (const [id, count] of Array.from(resultMap)) {
      const knowledge = this.knowledgeStore.get(id);
      if (knowledge && knowledge.isActive) {
        results.push(knowledge);
      }
    }

    // Sort by tag match count
    results.sort((a, b) => (resultMap.get(b.id) || 0) - (resultMap.get(a.id) || 0));

    return results;
  }

  /**
   * Update knowledge
   */
  public async updateKnowledge(
    userId: string,
    knowledgeId: string,
    updates: Partial<KnowledgeEntity>
  ): Promise<KnowledgeEntity> {
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to update knowledge');
    }

    const knowledge = this.knowledgeStore.get(knowledgeId);
    if (!knowledge) {
      throw new Error('Knowledge not found');
    }

    // Save current version to history
    const history = this.versionHistory.get(knowledgeId) || [];
    history.push(JSON.parse(JSON.stringify(knowledge)));
    this.versionHistory.set(knowledgeId, history);

    // Update knowledge
    const updatedKnowledge: KnowledgeEntity = {
      ...knowledge,
      ...updates,
      id: knowledge.id,
      createdAt: knowledge.createdAt,
      createdBy: knowledge.createdBy,
      version: knowledge.version + 1,
      updatedAt: Date.now(),
    };

    this.knowledgeStore.set(knowledgeId, updatedKnowledge);

    // Update indexes if category or tags changed
    if (updates.category && updates.category !== knowledge.category) {
      this.removeCategoryIndex(knowledge.category, knowledgeId);
      this.updateCategoryIndex(updates.category, knowledgeId);
    }

    if (updates.tags) {
      this.removeTagIndex(knowledge.tags, knowledgeId);
      this.updateTagIndex(updates.tags, knowledgeId);
    }

    await this.securityEngine.logSecurityEvent('KNOWLEDGE_UPDATED', userId, {
      knowledgeId,
      version: updatedKnowledge.version,
    });

    return updatedKnowledge;
  }

  /**
   * Delete knowledge
   */
  public async deleteKnowledge(userId: string, knowledgeId: string): Promise<void> {
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:delete');
    if (!hasPermission) {
      throw new Error('User does not have permission to delete knowledge');
    }

    const knowledge = this.knowledgeStore.get(knowledgeId);
    if (!knowledge) {
      throw new Error('Knowledge not found');
    }

    // Soft delete
    knowledge.isActive = false;
    knowledge.updatedAt = Date.now();

    await this.securityEngine.logSecurityEvent('KNOWLEDGE_DELETED', userId, { knowledgeId });
  }

  /**
   * Link related knowledge
   */
  public async linkKnowledge(
    userId: string,
    sourceId: string,
    targetId: string,
    relationship: string,
    strength: number = 0.8
  ): Promise<void> {
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to link knowledge');
    }

    const source = this.knowledgeStore.get(sourceId);
    const target = this.knowledgeStore.get(targetId);

    if (!source || !target) {
      throw new Error('Source or target knowledge not found');
    }

    // Add edge to graph
    const edges = this.knowledgeGraph.get(sourceId) || [];
    edges.push({
      sourceId,
      targetId,
      relationship,
      strength: Math.max(0, Math.min(1, strength)),
      metadata: {},
    });
    this.knowledgeGraph.set(sourceId, edges);

    // Update related knowledge IDs
    if (!source.relatedKnowledgeIds.includes(targetId)) {
      source.relatedKnowledgeIds.push(targetId);
    }

    await this.securityEngine.logSecurityEvent('KNOWLEDGE_LINKED', userId, {
      sourceId,
      targetId,
      relationship,
    });
  }

  /**
   * Get related knowledge
   */
  public async getRelatedKnowledge(userId: string, knowledgeId: string): Promise<KnowledgeEntity[]> {
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read knowledge');
    }

    const knowledge = this.knowledgeStore.get(knowledgeId);
    if (!knowledge) return [];

    const related: KnowledgeEntity[] = [];
    for (const relatedId of knowledge.relatedKnowledgeIds) {
      const relatedKnowledge = this.knowledgeStore.get(relatedId);
      if (relatedKnowledge && relatedKnowledge.isActive) {
        related.push(relatedKnowledge);
      }
    }

    return related;
  }

  /**
   * Get knowledge version history
   */
  public async getVersionHistory(userId: string, knowledgeId: string): Promise<KnowledgeEntity[]> {
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read knowledge');
    }

    return this.versionHistory.get(knowledgeId) || [];
  }

  /**
   * Restore knowledge to a specific version
   */
  public async restoreVersion(userId: string, knowledgeId: string, version: number): Promise<KnowledgeEntity> {
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to restore knowledge');
    }

    const history = this.versionHistory.get(knowledgeId);
    if (!history || version < 1 || version > history.length) {
      throw new Error('Invalid version number');
    }

    const restoredKnowledge = history[version - 1];
    const currentKnowledge = this.knowledgeStore.get(knowledgeId);

    if (currentKnowledge) {
      const updated = await this.updateKnowledge(userId, knowledgeId, restoredKnowledge);
      await this.securityEngine.logSecurityEvent('KNOWLEDGE_RESTORED', userId, {
        knowledgeId,
        restoredVersion: version,
      });
      return updated;
    }

    throw new Error('Knowledge not found');
  }

  /**
   * Get all knowledge
   */
  public async getAllKnowledge(userId: string): Promise<KnowledgeEntity[]> {
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read knowledge');
    }

    const results: KnowledgeEntity[] = [];
    for (const knowledge of Array.from(this.knowledgeStore.values())) {
      if (knowledge.isActive) {
        results.push(knowledge);
      }
    }

    return results;
  }

  /**
   * Clear all knowledge (for testing)
   */
  public clearAllKnowledge(): void {
    this.knowledgeStore.clear();
    this.knowledgeGraph.clear();
    this.categoryIndex.clear();
    this.tagIndex.clear();
    this.versionHistory.clear();
  }

  /**
   * Private helper methods
   */
  private updateCategoryIndex(category: string, knowledgeId: string): void {
    const ids = this.categoryIndex.get(category) || new Set();
    ids.add(knowledgeId);
    this.categoryIndex.set(category, ids);
  }

  private removeCategoryIndex(category: string, knowledgeId: string): void {
    const ids = this.categoryIndex.get(category);
    if (ids) {
      ids.delete(knowledgeId);
    }
  }

  private updateTagIndex(tags: string[], knowledgeId: string): void {
    for (const tag of tags) {
      const ids = this.tagIndex.get(tag) || new Set();
      ids.add(knowledgeId);
      this.tagIndex.set(tag, ids);
    }
  }

  private removeTagIndex(tags: string[], knowledgeId: string): void {
    for (const tag of tags) {
      const ids = this.tagIndex.get(tag);
      if (ids) {
        ids.delete(knowledgeId);
      }
    }
  }
}
