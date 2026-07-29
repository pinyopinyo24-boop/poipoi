import { SecurityEngine } from '../security/SecurityEngine';
import { MemoryEngine } from '../memory/MemoryEngine';

/**
 * Pattern Type
 */
export enum PatternType {
  SUCCESS = 'success',
  FAILURE = 'failure',
  IMPROVEMENT = 'improvement',
  ANOMALY = 'anomaly',
}

/**
 * Pattern
 */
export interface Pattern {
  id: string;
  type: PatternType;
  frequency: number;
  confidence: number;
  description: string;
  conditions: Record<string, any>;
  outcomes: Record<string, any>;
  examples: any[];
  lastSeen: number;
}

/**
 * Pattern Statistics
 */
export interface PatternStatistics {
  totalPatterns: number;
  patternsByType: Record<string, number>;
  topPatterns: Pattern[];
  anomalyCount: number;
}

/**
 * Pattern Learner
 */
export class PatternLearner {
  private static instance: PatternLearner;
  private securityEngine: SecurityEngine;
  private memoryEngine: MemoryEngine;
  private patterns: Map<string, Pattern[]>;
  private executionHistory: any[];

  private constructor() {
    this.securityEngine = new SecurityEngine();
    this.memoryEngine = MemoryEngine.getInstance();
    this.patterns = new Map();
    this.executionHistory = [];
  }

  public static getInstance(): PatternLearner {
    if (!PatternLearner.instance) {
      PatternLearner.instance = new PatternLearner();
    }
    return PatternLearner.instance;
  }

  /**
   * Record execution
   */
  public async recordExecution(
    userId: string,
    action: string,
    input: any,
    output: any,
    result: 'success' | 'failure',
    duration: number
  ): Promise<void> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'learning:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to record execution');
    }

    const execution = {
      userId,
      action,
      input,
      output,
      result,
      duration,
      timestamp: Date.now(),
    };

    this.executionHistory.push(execution);

    // Keep only last 1000 executions
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(-1000);
    }
  }

  /**
   * Extract patterns from execution history
   */
  public async extractPatterns(userId: string, action: string): Promise<Pattern[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'learning:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read patterns');
    }

    const userExecutions = this.executionHistory.filter(
      (e) => e.userId === userId && e.action === action
    );

    if (userExecutions.length === 0) {
      return [];
    }

    const patterns: Pattern[] = [];

    // Extract success patterns
    const successExecutions = userExecutions.filter((e) => e.result === 'success');
    if (successExecutions.length > 0) {
      patterns.push({
        id: `pattern-success-${Date.now()}`,
        type: PatternType.SUCCESS,
        frequency: successExecutions.length,
        confidence: successExecutions.length / userExecutions.length,
        description: `${action} succeeded ${successExecutions.length} times`,
        conditions: this.extractCommonConditions(successExecutions),
        outcomes: this.extractCommonOutcomes(successExecutions),
        examples: successExecutions.slice(0, 3),
        lastSeen: Date.now(),
      });
    }

    // Extract failure patterns
    const failureExecutions = userExecutions.filter((e) => e.result === 'failure');
    if (failureExecutions.length > 0) {
      patterns.push({
        id: `pattern-failure-${Date.now()}`,
        type: PatternType.FAILURE,
        frequency: failureExecutions.length,
        confidence: failureExecutions.length / userExecutions.length,
        description: `${action} failed ${failureExecutions.length} times`,
        conditions: this.extractCommonConditions(failureExecutions),
        outcomes: this.extractCommonOutcomes(failureExecutions),
        examples: failureExecutions.slice(0, 3),
        lastSeen: Date.now(),
      });
    }

    // Extract improvement patterns
    const improvementPattern = this.detectImprovement(userExecutions);
    if (improvementPattern) {
      patterns.push(improvementPattern);
    }

    // Store patterns
    if (!this.patterns.has(userId)) {
      this.patterns.set(userId, []);
    }
    this.patterns.get(userId)!.push(...patterns);

    return patterns;
  }

  /**
   * Extract common conditions from executions
   */
  private extractCommonConditions(executions: any[]): Record<string, any> {
    if (executions.length === 0) return {};

    const conditions: Record<string, any> = {};

    // Extract input patterns
    if (executions.length > 0 && executions[0].input) {
      const inputKeys = Object.keys(executions[0].input);
      for (const key of inputKeys) {
        const values = executions.map((e) => e.input[key]);
        const uniqueValues = Array.from(new Set(values));
        if (uniqueValues.length <= 3) {
          conditions[`input_${key}`] = uniqueValues;
        }
      }
    }

    return conditions;
  }

  /**
   * Extract common outcomes from executions
   */
  private extractCommonOutcomes(executions: any[]): Record<string, any> {
    if (executions.length === 0) return {};

    const outcomes: Record<string, any> = {};

    // Extract output patterns
    if (executions.length > 0 && executions[0].output) {
      const outputKeys = Object.keys(executions[0].output);
      for (const key of outputKeys) {
        const values = executions.map((e) => e.output[key]);
        const uniqueValues = Array.from(new Set(values));
        if (uniqueValues.length <= 3) {
          outcomes[`output_${key}`] = uniqueValues;
        }
      }
    }

    return outcomes;
  }

  /**
   * Detect improvement pattern
   */
  private detectImprovement(executions: any[]): Pattern | null {
    if (executions.length < 2) return null;

    const durations = executions.map((e) => e.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const lastDuration = durations[durations.length - 1];

    if (lastDuration < avgDuration * 0.8) {
      return {
        id: `pattern-improvement-${Date.now()}`,
        type: PatternType.IMPROVEMENT,
        frequency: 1,
        confidence: 0.8,
        description: `Performance improved by ${Math.round((1 - lastDuration / avgDuration) * 100)}%`,
        conditions: { avg_duration: avgDuration },
        outcomes: { last_duration: lastDuration },
        examples: [{ avgDuration, lastDuration }],
        lastSeen: Date.now(),
      };
    }

    return null;
  }

  /**
   * Get all patterns for user
   */
  public async getAllPatterns(userId: string): Promise<Pattern[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'learning:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read patterns');
    }

    return this.patterns.get(userId) || [];
  }

  /**
   * Get patterns by type
   */
  public async getPatternsByType(userId: string, type: PatternType): Promise<Pattern[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'learning:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read patterns');
    }

    const userPatterns = this.patterns.get(userId) || [];
    return userPatterns.filter((p) => p.type === type);
  }

  /**
   * Get pattern statistics
   */
  public async getPatternStatistics(userId: string): Promise<PatternStatistics> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'learning:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read pattern statistics');
    }

    const userPatterns = this.patterns.get(userId) || [];

    const patternsByType: Record<string, number> = {};
    for (const pattern of userPatterns) {
      patternsByType[pattern.type] = (patternsByType[pattern.type] || 0) + 1;
    }

    const anomalyCount = userPatterns.filter((p) => p.type === PatternType.ANOMALY).length;

    return {
      totalPatterns: userPatterns.length,
      patternsByType,
      topPatterns: userPatterns.sort((a, b) => b.frequency - a.frequency).slice(0, 5),
      anomalyCount,
    };
  }

  /**
   * Clear all data (for testing)
   */
  public clearAllData(): void {
    this.patterns.clear();
    this.executionHistory = [];
  }
}
