import { SecurityEngine } from '../security/SecurityEngine';
import { MemoryEngine } from '../memory/MemoryEngine';
import { KnowledgeEngine } from '../knowledge/KnowledgeEngine';

/**
 * Learning Cycle Status
 */
export enum LearningCycleStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Learning Data
 */
export interface LearningData {
  id: string;
  userId: string;
  cycleId: string;
  timestamp: number;
  input: any;
  output: any;
  result: 'success' | 'failure';
  duration: number;
  metadata: Record<string, any>;
}

/**
 * Learning Cycle
 */
export interface LearningCycle {
  id: string;
  userId: string;
  startTime: number;
  endTime?: number;
  status: LearningCycleStatus;
  dataPoints: LearningData[];
  patterns: Pattern[];
  improvements: string[];
}

/**
 * Pattern
 */
export interface Pattern {
  id: string;
  type: 'success' | 'failure' | 'improvement';
  frequency: number;
  confidence: number;
  description: string;
  examples: any[];
}

/**
 * Learning Result
 */
export interface LearningResult {
  cycleId: string;
  totalDataPoints: number;
  successRate: number;
  failureRate: number;
  patterns: Pattern[];
  recommendations: string[];
  generatedAt: number;
}

/**
 * Self Learning Engine
 */
export class SelfLearningEngine {
  private static instance: SelfLearningEngine;
  private securityEngine: SecurityEngine;
  private memoryEngine: MemoryEngine;
  private knowledgeEngine: KnowledgeEngine;
  private learningCycles: Map<string, LearningCycle>;
  private learningData: LearningData[];

  private constructor() {
    this.securityEngine = new SecurityEngine();
    this.memoryEngine = MemoryEngine.getInstance();
    this.knowledgeEngine = KnowledgeEngine.getInstance();
    this.learningCycles = new Map();
    this.learningData = [];
  }

  public static getInstance(): SelfLearningEngine {
    if (!SelfLearningEngine.instance) {
      SelfLearningEngine.instance = new SelfLearningEngine();
    }
    return SelfLearningEngine.instance;
  }

  /**
   * Start learning cycle
   */
  public async startLearningCycle(userId: string): Promise<LearningCycle> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'learning:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to start learning cycle');
    }

    const cycle: LearningCycle = {
      id: `cycle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      startTime: Date.now(),
      status: LearningCycleStatus.RUNNING,
      dataPoints: [],
      patterns: [],
      improvements: [],
    };

    this.learningCycles.set(cycle.id, cycle);

    // Log to security
    await this.securityEngine.logSecurityEvent('LEARNING_CYCLE_START', userId, {
      cycleId: cycle.id,
    });

    return cycle;
  }

  /**
   * Record learning data point
   */
  public async recordDataPoint(
    userId: string,
    cycleId: string,
    input: any,
    output: any,
    result: 'success' | 'failure',
    duration: number,
    metadata?: Record<string, any>
  ): Promise<LearningData> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'learning:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to record learning data');
    }

    const cycle = this.learningCycles.get(cycleId);
    if (!cycle) {
      throw new Error('Learning cycle not found');
    }

    const dataPoint: LearningData = {
      id: `data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      cycleId,
      timestamp: Date.now(),
      input,
      output,
      result,
      duration,
      metadata: metadata || {},
    };

    this.learningData.push(dataPoint);
    cycle.dataPoints.push(dataPoint);

    return dataPoint;
  }

  /**
   * Complete learning cycle
   */
  public async completeLearningCycle(userId: string, cycleId: string): Promise<LearningResult> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'learning:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to complete learning cycle');
    }

    const cycle = this.learningCycles.get(cycleId);
    if (!cycle) {
      throw new Error('Learning cycle not found');
    }

    cycle.endTime = Date.now();
    cycle.status = LearningCycleStatus.COMPLETED;

    // Extract patterns
    const patterns = this.extractPatterns(cycle);
    cycle.patterns = patterns;

    // Generate result
    const result: LearningResult = {
      cycleId,
      totalDataPoints: cycle.dataPoints.length,
      successRate: this.calculateSuccessRate(cycle),
      failureRate: this.calculateFailureRate(cycle),
      patterns,
      recommendations: this.generateRecommendations(cycle),
      generatedAt: Date.now(),
    };

    // Save to memory
    await this.memoryEngine.setMemory(userId, `learning_result_${cycleId}`, result);

    // Save patterns as knowledge (deferred for now)
    // Will be implemented in Knowledge integration phase

    // Log to security
    await this.securityEngine.logSecurityEvent('LEARNING_CYCLE_COMPLETE', userId, {
      cycleId,
      successRate: result.successRate,
      patternCount: patterns.length,
    });

    return result;
  }

  /**
   * Extract patterns from learning cycle
   */
  private extractPatterns(cycle: LearningCycle): Pattern[] {
    const patterns: Pattern[] = [];

    // Count successes and failures
    const successCount = cycle.dataPoints.filter((d) => d.result === 'success').length;
    const failureCount = cycle.dataPoints.filter((d) => d.result === 'failure').length;

    // Success pattern
    if (successCount > 0) {
      patterns.push({
        id: `pattern-success-${Date.now()}`,
        type: 'success',
        frequency: successCount,
        confidence: successCount / cycle.dataPoints.length,
        description: `Successfully completed ${successCount} operations`,
        examples: cycle.dataPoints
          .filter((d) => d.result === 'success')
          .slice(0, 3)
          .map((d) => d.input),
      });
    }

    // Failure pattern
    if (failureCount > 0) {
      patterns.push({
        id: `pattern-failure-${Date.now()}`,
        type: 'failure',
        frequency: failureCount,
        confidence: failureCount / cycle.dataPoints.length,
        description: `Failed ${failureCount} operations`,
        examples: cycle.dataPoints
          .filter((d) => d.result === 'failure')
          .slice(0, 3)
          .map((d) => d.input),
      });
    }

    // Performance improvement pattern
    if (cycle.dataPoints.length > 1) {
      const durations = cycle.dataPoints.map((d) => d.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const lastDuration = durations[durations.length - 1];

      if (lastDuration < avgDuration * 0.8) {
        patterns.push({
          id: `pattern-improvement-${Date.now()}`,
          type: 'improvement',
          frequency: 1,
          confidence: 0.8,
          description: `Performance improved by ${Math.round((1 - lastDuration / avgDuration) * 100)}%`,
          examples: [{ avgDuration, lastDuration }],
        });
      }
    }

    return patterns;
  }

  /**
   * Calculate success rate
   */
  private calculateSuccessRate(cycle: LearningCycle): number {
    if (cycle.dataPoints.length === 0) return 0;
    const successCount = cycle.dataPoints.filter((d) => d.result === 'success').length;
    return successCount / cycle.dataPoints.length;
  }

  /**
   * Calculate failure rate
   */
  private calculateFailureRate(cycle: LearningCycle): number {
    if (cycle.dataPoints.length === 0) return 0;
    const failureCount = cycle.dataPoints.filter((d) => d.result === 'failure').length;
    return failureCount / cycle.dataPoints.length;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(cycle: LearningCycle): string[] {
    const recommendations: string[] = [];

    const successRate = this.calculateSuccessRate(cycle);
    const failureRate = this.calculateFailureRate(cycle);

    if (failureRate > 0.3) {
      recommendations.push('High failure rate detected - review error patterns');
    }

    if (successRate > 0.8) {
      recommendations.push('Strong success pattern - continue current approach');
    }

    if (cycle.dataPoints.length > 0) {
      const avgDuration =
        cycle.dataPoints.reduce((sum, d) => sum + d.duration, 0) / cycle.dataPoints.length;
      if (avgDuration > 1000) {
        recommendations.push('Performance optimization recommended');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring and learning');
    }

    return recommendations;
  }

  /**
   * Get learning cycle
   */
  public async getLearningCycle(userId: string, cycleId: string): Promise<LearningCycle | null> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'learning:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read learning data');
    }

    return this.learningCycles.get(cycleId) || null;
  }

  /**
   * Get all learning cycles
   */
  public async getAllLearningCycles(userId: string): Promise<LearningCycle[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'learning:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read learning data');
    }

    return Array.from(this.learningCycles.values()).filter((c) => c.userId === userId);
  }

  /**
   * Clear all data (for testing)
   */
  public clearAllData(): void {
    this.learningCycles.clear();
    this.learningData = [];
  }
}
