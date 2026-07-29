import { KnowledgeEngine, KnowledgeEntity } from './KnowledgeEngine';
import { MemoryEngine } from '../memory/MemoryEngine';
import { SecurityEngine } from '../security/SecurityEngine';

/**
 * Memory to Knowledge Extraction
 */
export interface MemoryToKnowledgeMapping {
  memoryId: string;
  knowledgeId: string;
  extractedAt: number;
  confidence: number;
  category: string;
}

/**
 * Knowledge to Memory Reference
 */
export interface KnowledgeMemoryReference {
  knowledgeId: string;
  memoryIds: string[];
  referencedAt: number;
}

/**
 * Self-Evolution History Entry
 */
export interface EvolutionHistoryEntry {
  id: string;
  timestamp: number;
  type: 'success' | 'failure' | 'improvement';
  pattern: string;
  details: Record<string, any>;
  userId: string;
}

/**
 * Knowledge-Memory Integration Engine
 */
export class KnowledgeMemoryIntegration {
  private static instance: KnowledgeMemoryIntegration;
  private knowledgeEngine: KnowledgeEngine;
  private memoryEngine: MemoryEngine;
  private securityEngine: SecurityEngine;
  private memoryToKnowledgeMap: Map<string, MemoryToKnowledgeMapping>;
  private knowledgeToMemoryMap: Map<string, KnowledgeMemoryReference>;
  private evolutionHistory: EvolutionHistoryEntry[];

  private constructor() {
    this.knowledgeEngine = KnowledgeEngine.getInstance();
    this.memoryEngine = MemoryEngine.getInstance();
    this.securityEngine = new SecurityEngine();
    this.memoryToKnowledgeMap = new Map();
    this.knowledgeToMemoryMap = new Map();
    this.evolutionHistory = [];
  }

  public static getInstance(): KnowledgeMemoryIntegration {
    if (!KnowledgeMemoryIntegration.instance) {
      KnowledgeMemoryIntegration.instance = new KnowledgeMemoryIntegration();
    }
    return KnowledgeMemoryIntegration.instance;
  }

  /**
   * Extract knowledge from memory
   */
  public async extractKnowledgeFromMemory(
    userId: string,
    memoryId: string,
    title: string,
    category: string,
    tags: string[] = [],
    confidence: number = 0.7
  ): Promise<KnowledgeEntity> {
    // Ensure KnowledgeEngine is initialized
    if (!(this.knowledgeEngine as any).securityEngine.isReady()) {
      await (this.knowledgeEngine as any).securityEngine.initialize();
    }

    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to extract knowledge from memory');
    }

    // Get memory content
    const memory = this.memoryEngine.getMemory(userId, memoryId);
    if (!memory) {
      throw new Error('Memory not found');
    }

    // Create knowledge from memory
    const knowledge = await this.knowledgeEngine.saveKnowledge(
      userId,
      title,
      JSON.stringify(memory),
      category,
      tags,
      'memory_extraction',
      confidence
    );

    // Record mapping
    const mapping: MemoryToKnowledgeMapping = {
      memoryId,
      knowledgeId: knowledge.id,
      extractedAt: Date.now(),
      confidence,
      category,
    };
    this.memoryToKnowledgeMap.set(knowledge.id, mapping);

    // Record reference
    const references = this.knowledgeToMemoryMap.get(knowledge.id) || {
      knowledgeId: knowledge.id,
      memoryIds: [],
      referencedAt: Date.now(),
    };
    references.memoryIds.push(memoryId);
    this.knowledgeToMemoryMap.set(knowledge.id, references);

    // Log evolution
    await this.recordEvolutionHistory(userId, 'success', 'memory_extraction', {
      memoryId,
      knowledgeId: knowledge.id,
    });

    return knowledge;
  }

  /**
   * Get knowledge referenced memories
   */
  public async getKnowledgeReferencedMemories(
    userId: string,
    knowledgeId: string
  ): Promise<string[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read knowledge references');
    }

    const references = this.knowledgeToMemoryMap.get(knowledgeId);
    return references?.memoryIds || [];
  }

  /**
   * Get memory extracted knowledge
   */
  public async getMemoryExtractedKnowledge(
    userId: string,
    memoryId: string
  ): Promise<KnowledgeEntity | undefined> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read knowledge');
    }

    // Find knowledge extracted from this memory
    for (const [knowledgeId, mapping] of Array.from(this.memoryToKnowledgeMap)) {
      if (mapping.memoryId === memoryId) {
        return await this.knowledgeEngine.getKnowledge(userId, knowledgeId);
      }
    }

    return undefined;
  }

  /**
   * Record success pattern
   */
  public async recordSuccessPattern(
    userId: string,
    pattern: string,
    details: Record<string, any> = {}
  ): Promise<EvolutionHistoryEntry> {
    // Ensure security engine is initialized
    if (!this.securityEngine.isReady()) {
      await this.securityEngine.initialize();
    }

    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to record evolution history');
    }

    const entry: EvolutionHistoryEntry = {
      id: `success-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'success',
      pattern,
      details,
      userId,
    };

    this.evolutionHistory.push(entry);

    // Store as knowledge (ensure KnowledgeEngine is initialized)
    try {
      await this.knowledgeEngine.saveKnowledge(
        userId,
        `Success Pattern: ${pattern}`,
        JSON.stringify(details),
        'evolution_success',
        ['pattern', 'success'],
        'evolution_tracking',
        0.95
      );
    } catch (e) {
      // Log but don't fail if knowledge storage fails
      console.error('Failed to store success pattern as knowledge:', e);
    }

    await this.securityEngine.logSecurityEvent('SUCCESS_PATTERN_RECORDED', userId, {
      pattern,
      details,
    });

    return entry;
  }

  /**
   * Record failure pattern
   */
  public async recordFailurePattern(
    userId: string,
    pattern: string,
    details: Record<string, any> = {}
  ): Promise<EvolutionHistoryEntry> {
    // Ensure security engine is initialized
    if (!this.securityEngine.isReady()) {
      await this.securityEngine.initialize();
    }

    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to record evolution history');
    }

    const entry: EvolutionHistoryEntry = {
      id: `failure-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'failure',
      pattern,
      details,
      userId,
    };

    this.evolutionHistory.push(entry);

    // Store as knowledge (ensure KnowledgeEngine is initialized)
    try {
      await this.knowledgeEngine.saveKnowledge(
        userId,
        `Failure Pattern: ${pattern}`,
        JSON.stringify(details),
        'evolution_failure',
        ['pattern', 'failure'],
        'evolution_tracking',
        0.8
      );
    } catch (e) {
      // Log but don't fail if knowledge storage fails
      console.error('Failed to store failure pattern as knowledge:', e);
    }

    await this.securityEngine.logSecurityEvent('FAILURE_PATTERN_RECORDED', userId, {
      pattern,
      details,
    });

    return entry;
  }

  /**
   * Record improvement
   */
  public async recordImprovement(
    userId: string,
    pattern: string,
    details: Record<string, any> = {}
  ): Promise<EvolutionHistoryEntry> {
    // Ensure security engine is initialized
    if (!this.securityEngine.isReady()) {
      await this.securityEngine.initialize();
    }

    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to record evolution history');
    }

    const entry: EvolutionHistoryEntry = {
      id: `improvement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'improvement',
      pattern,
      details,
      userId,
    };

    this.evolutionHistory.push(entry);

    // Store as knowledge (ensure KnowledgeEngine is initialized)
    try {
      await this.knowledgeEngine.saveKnowledge(
        userId,
        `Improvement: ${pattern}`,
        JSON.stringify(details),
        'evolution_improvement',
        ['pattern', 'improvement'],
        'evolution_tracking',
        0.9
      );
    } catch (e) {
      // Log but don't fail if knowledge storage fails
      console.error('Failed to store improvement as knowledge:', e);
    }

    await this.securityEngine.logSecurityEvent('IMPROVEMENT_RECORDED', userId, {
      pattern,
      details,
    });

    return entry;
  }

  /**
   * Get evolution history
   */
  public async getEvolutionHistory(
    userId: string,
    type?: 'success' | 'failure' | 'improvement'
  ): Promise<EvolutionHistoryEntry[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read evolution history');
    }

    if (type) {
      return this.evolutionHistory.filter(
        (entry) => entry.type === type && entry.userId === userId
      );
    }

    return this.evolutionHistory.filter((entry) => entry.userId === userId);
  }

  /**
   * Get pattern statistics
   */
  public async getPatternStatistics(userId: string): Promise<{
    totalPatterns: number;
    successPatterns: number;
    failurePatterns: number;
    improvements: number;
    successRate: number;
  }> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'knowledge:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read pattern statistics');
    }

    const userHistory = this.evolutionHistory.filter((entry) => entry.userId === userId);

    const successPatterns = userHistory.filter((e) => e.type === 'success').length;
    const failurePatterns = userHistory.filter((e) => e.type === 'failure').length;
    const improvements = userHistory.filter((e) => e.type === 'improvement').length;
    const totalPatterns = userHistory.length;

    const successRate =
      totalPatterns > 0 ? (successPatterns + improvements) / totalPatterns : 0;

    return {
      totalPatterns,
      successPatterns,
      failurePatterns,
      improvements,
      successRate,
    };
  }

  /**
   * Record evolution history (internal)
   */
  private async recordEvolutionHistory(
    userId: string,
    type: 'success' | 'failure' | 'improvement',
    pattern: string,
    details: Record<string, any>
  ): Promise<void> {
    const entry: EvolutionHistoryEntry = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      pattern,
      details,
      userId,
    };

    this.evolutionHistory.push(entry);
  }

  /**
   * Clear all data (for testing)
   */
  public clearAllData(): void {
    this.memoryToKnowledgeMap.clear();
    this.knowledgeToMemoryMap.clear();
    this.evolutionHistory = [];
  }
}
