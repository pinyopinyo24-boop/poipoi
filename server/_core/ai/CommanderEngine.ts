/**
 * Commander Engine - Task Analysis & Agent Selection
 * Analyzes user input and selects optimal agent workflow
 */

import { AgentType } from './agents/BaseAgent';
import { MemoryIntegrationService } from './MemoryIntegrationService';

export type TaskCategory = 
  | 'question'
  | 'design'
  | 'implementation'
  | 'review'
  | 'analysis'
  | 'optimization'
  | 'documentation'
  | 'debugging'
  | 'planning'
  | 'unknown';

export interface TaskAnalysis {
  id: string;
  userInput: string;
  category: TaskCategory;
  confidence: number;
  selectedAgents: AgentType[];
  reasoning: string;
  keywords: string[];
  complexity: 'simple' | 'medium' | 'complex';
  estimatedDuration: number;
  priority: 'low' | 'medium' | 'high';
}

export interface ExecutionPlan {
  id: string;
  taskAnalysisId: string;
  agents: Array<{
    agentType: AgentType;
    order: number;
    dependsOn?: AgentType[];
    input: Record<string, any>;
  }>;
  totalSteps: number;
  estimatedDuration: number;
  createdAt: number;
}

export interface CommanderStatus {
  currentTaskId: string;
  category: TaskCategory;
  selectedAgents: AgentType[];
  executionPhase: 'analyzing' | 'planning' | 'executing' | 'completed' | 'failed';
  progress: number;
  result?: Record<string, any>;
  error?: string;
}

/**
 * CommanderEngine - Analyzes tasks and selects optimal agent workflows
 */
export class CommanderEngine {
  private taskHistory: TaskAnalysis[] = [];
  private executionPlans: ExecutionPlan[] = [];
  private currentStatus: CommanderStatus | null = null;

  // Task category keywords
  private categoryKeywords: Record<TaskCategory, string[]> = {
    question: [
      'what', 'how', 'why', 'when', 'where', 'who', 'explain', 'describe',
      'tell me', 'help', 'understand', 'know', 'learn', 'question', 'ask',
      'clarify', 'meaning', 'definition', 'information'
    ],
    design: [
      'design', 'create', 'build', 'architect', 'plan', 'structure', 'layout',
      'ui', 'ux', 'interface', 'schema', 'model', 'diagram', 'mockup',
      'prototype', 'sketch', 'wireframe', 'component'
    ],
    implementation: [
      'implement', 'code', 'write', 'develop', 'build', 'create', 'generate',
      'function', 'class', 'module', 'script', 'program', 'application',
      'feature', 'fix', 'patch', 'update'
    ],
    review: [
      'review', 'check', 'test', 'validate', 'verify', 'audit', 'inspect',
      'quality', 'error', 'bug', 'issue', 'problem', 'improve', 'optimize',
      'refactor', 'clean', 'best practice'
    ],
    analysis: [
      'analyze', 'analyze', 'examine', 'investigate', 'study', 'research',
      'evaluate', 'assess', 'measure', 'calculate', 'statistics', 'data',
      'pattern', 'trend', 'insight', 'metric', 'performance'
    ],
    optimization: [
      'optimize', 'improve', 'enhance', 'speed up', 'faster', 'efficient',
      'performance', 'reduce', 'minimize', 'maximize', 'scale', 'refactor',
      'streamline', 'simplify', 'better'
    ],
    documentation: [
      'document', 'write', 'explain', 'comment', 'readme', 'guide', 'tutorial',
      'manual', 'specification', 'api', 'reference', 'example', 'description',
      'docstring', 'javadoc', 'jsdoc'
    ],
    debugging: [
      'debug', 'error', 'bug', 'fix', 'crash', 'fail', 'issue', 'problem',
      'not working', 'broken', 'exception', 'trace', 'stack', 'log',
      'troubleshoot', 'diagnose'
    ],
    planning: [
      'plan', 'strategy', 'roadmap', 'timeline', 'schedule', 'milestone',
      'goal', 'objective', 'requirement', 'specification', 'scope',
      'estimate', 'resource', 'task'
    ],
    unknown: []
  };

  constructor(private memoryService: MemoryIntegrationService) {}

  /**
   * Analyze user input and determine task category
   */
  async analyzeTask(userInput: string): Promise<TaskAnalysis> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract keywords
    const keywords = this.extractKeywords(userInput);
    
    // Classify task
    const category = this.classifyTask(userInput, keywords);
    
    // Determine complexity
    const complexity = this.determineComplexity(userInput);
    
    // Select agents
    const selectedAgents = this.selectAgents(category, complexity);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(userInput, category, keywords);
    
    // Estimate duration
    const estimatedDuration = this.estimateDuration(selectedAgents, complexity);
    
    // Determine priority
    const priority = this.determinePriority(userInput, category);
    
    // Generate reasoning
    const reasoning = this.generateReasoning(category, selectedAgents, confidence);
    
    const analysis: TaskAnalysis = {
      id: taskId,
      userInput,
      category,
      confidence,
      selectedAgents,
      reasoning,
      keywords,
      complexity,
      estimatedDuration,
      priority,
    };
    
    this.taskHistory.push(analysis);
    
    // Save to memory
    try {
      console.log('[CommanderEngine] Task analysis saved:', analysis.id);
    } catch (error) {
      console.error('[CommanderEngine] Failed to save task analysis to memory:', error);
    }
    
    return analysis;
  }

  /**
   * Create execution plan based on task analysis
   */
  async executePlan(analysis: TaskAnalysis): Promise<ExecutionPlan> {
    const planId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const agents = this.buildAgentSequence(analysis.selectedAgents, analysis.userInput);
    
    const plan: ExecutionPlan = {
      id: planId,
      taskAnalysisId: analysis.id,
      agents,
      totalSteps: agents.length,
      estimatedDuration: analysis.estimatedDuration,
      createdAt: Date.now(),
    };
    
    this.executionPlans.push(plan);
    
    // Update status
    this.currentStatus = {
      currentTaskId: analysis.id,
      category: analysis.category,
      selectedAgents: analysis.selectedAgents,
      executionPhase: 'planning',
      progress: 0,
    };
    
    return plan;
  }

  /**
   * Get current commander status
   */
  getStatus(): CommanderStatus | null {
    return this.currentStatus;
  }

  /**
   * Update execution status
   */
  updateStatus(phase: CommanderStatus['executionPhase'], progress: number, result?: Record<string, any>, error?: string): void {
    if (this.currentStatus) {
      this.currentStatus.executionPhase = phase;
      this.currentStatus.progress = progress;
      if (result) this.currentStatus.result = result;
      if (error) this.currentStatus.error = error;
    }
  }

  /**
   * Extract keywords from user input
   */
  private extractKeywords(input: string): string[] {
    const words = input.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !this.isStopWord(w));
    
    return Array.from(new Set(words));
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
      'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
      'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where'
    ];
    return stopWords.includes(word);
  }

  /**
   * Classify task into category
   */
  private classifyTask(input: string, keywords: string[]): TaskCategory {
    const inputLower = input.toLowerCase();
    let maxScore = 0;
    let bestCategory: TaskCategory = 'unknown';
    
    for (const [category, categoryKeywords] of Object.entries(this.categoryKeywords)) {
      if (category === 'unknown') continue;
      
      let score = 0;
      for (const keyword of categoryKeywords) {
        if (inputLower.includes(keyword)) {
          score += 2;
        }
      }
      
      for (const extractedKeyword of keywords) {
        if (categoryKeywords.includes(extractedKeyword)) {
          score += 1;
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category as TaskCategory;
      }
    }
    
    return bestCategory;
  }

  /**
   * Determine task complexity
   */
  private determineComplexity(input: string): 'simple' | 'medium' | 'complex' {
    const length = input.length;
    const wordCount = input.split(/\s+/).length;
    const hasCodeKeywords = /code|function|class|algorithm|database|api/i.test(input);
    const hasMultipleRequirements = (input.match(/and|also|plus|additionally/gi) || []).length > 2;
    
    let complexityScore = 0;
    
    if (length > 200) complexityScore += 2;
    if (wordCount > 30) complexityScore += 2;
    if (hasCodeKeywords) complexityScore += 3;
    if (hasMultipleRequirements) complexityScore += 2;
    
    if (complexityScore >= 7) return 'complex';
    if (complexityScore >= 4) return 'medium';
    return 'simple';
  }

  /**
   * Select appropriate agents for task
   */
  private selectAgents(category: TaskCategory, complexity: string): AgentType[] {
    const agents: AgentType[] = [];
    
    switch (category) {
      case 'question':
        agents.push('task');
        break;
      case 'design':
        agents.push('design');
        if (complexity === 'complex') agents.push('review');
        break;
      case 'implementation':
        agents.push('implementation');
        agents.push('review');
        break;
      case 'review':
        agents.push('review');
        break;
      case 'analysis':
        agents.push('task');
        if (complexity === 'complex') agents.push('review');
        break;
      case 'optimization':
        agents.push('implementation');
        agents.push('review');
        break;
      case 'documentation':
        agents.push('design');
        break;
      case 'debugging':
        agents.push('task');
        agents.push('implementation');
        agents.push('review');
        break;
      case 'planning':
        agents.push('design');
        if (complexity === 'complex') agents.push('task');
        break;
      default:
        agents.push('task');
    }
    
    return Array.from(new Set(agents));
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(input: string, category: TaskCategory, keywords: string[]): number {
    if (category === 'unknown') return 0.3;
    
    let confidence = 0.7;
    
    // Increase confidence for clear keywords
    if (keywords.length > 3) confidence += 0.1;
    
    // Increase confidence for longer input
    if (input.length > 100) confidence += 0.1;
    
    // Decrease confidence for ambiguous input
    if (input.includes('?') && input.includes('or')) confidence -= 0.1;
    
    return Math.min(1.0, confidence);
  }

  /**
   * Estimate execution duration
   */
  private estimateDuration(agents: AgentType[], complexity: string): number {
    let baseDuration = 1000; // 1 second per agent
    
    const agentDurations: Partial<Record<AgentType, number>> = {
      task: 600,
      design: 800,
      implementation: 1200,
      review: 700,
    };
    
    let totalDuration = agents.reduce((sum, agent) => sum + ((agentDurations[agent] as number) || 500), 0);
    
    if (complexity === 'complex') totalDuration *= 1.5;
    if (complexity === 'medium') totalDuration *= 1.2;
    
    return Math.round(totalDuration);
  }

  /**
   * Determine task priority
   */
  private determinePriority(input: string, category: TaskCategory): 'low' | 'medium' | 'high' {
    const urgentKeywords = ['urgent', 'critical', 'asap', 'immediately', 'emergency', 'now', 'quickly'];
    const isUrgent = urgentKeywords.some(kw => input.toLowerCase().includes(kw));
    
    if (isUrgent) return 'high';
    if (category === 'debugging' || category === 'review') return 'high';
    if (category === 'documentation' || category === 'planning') return 'low';
    
    return 'medium';
  }

  /**
   * Generate reasoning explanation
   */
  private generateReasoning(category: TaskCategory, agents: AgentType[], confidence: number): string {
    const categoryDescriptions: Record<TaskCategory, string> = {
      question: 'ユーザーの質問に答えるため',
      design: 'デザイン・設計が必要なため',
      implementation: 'コード実装が必要なため',
      review: 'コードレビュー・検証が必要なため',
      analysis: 'データ分析が必要なため',
      optimization: 'パフォーマンス最適化が必要なため',
      documentation: 'ドキュメント作成が必要なため',
      debugging: 'バグ修正が必要なため',
      planning: '計画・戦略が必要なため',
      unknown: 'タスク内容が不明確なため',
    };
    
    const agentNames = agents.map(a => `${a}Agent`).join(' → ');
    const confidencePercent = Math.round(confidence * 100);
    
    return `${categoryDescriptions[category]} ${agentNames} を選択しました（確信度: ${confidencePercent}%）`;
  }

  /**
   * Build agent sequence with dependencies
   */
  private buildAgentSequence(agents: AgentType[], userInput: string): ExecutionPlan['agents'] {
    return agents.map((agent, index) => ({
      agentType: agent,
      order: index + 1,
      dependsOn: index > 0 ? [agents[index - 1]] : undefined,
      input: {
        userInput,
        agentType: agent,
      },
    }));
  }

  /**
   * Get task history
   */
  getTaskHistory(limit: number = 10): TaskAnalysis[] {
    return this.taskHistory.slice(-limit).reverse();
  }

  /**
   * Get execution plans
   */
  getExecutionPlans(limit: number = 10): ExecutionPlan[] {
    return this.executionPlans.slice(-limit).reverse();
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalTasks: number;
    categoryDistribution: Record<TaskCategory, number>;
    averageConfidence: number;
    mostCommonCategory: TaskCategory;
  } {
    const categoryDistribution: Record<TaskCategory, number> = {
      question: 0,
      design: 0,
      implementation: 0,
      review: 0,
      analysis: 0,
      optimization: 0,
      documentation: 0,
      debugging: 0,
      planning: 0,
      unknown: 0,
    };
    
    for (const task of this.taskHistory) {
      categoryDistribution[task.category]++;
    }
    
    const avgConfidence = this.taskHistory.length > 0
      ? this.taskHistory.reduce((sum, t) => sum + t.confidence, 0) / this.taskHistory.length
      : 0;
    
    const mostCommonCategory = Object.entries(categoryDistribution)
      .sort(([, a], [, b]) => b - a)[0]?.[0] as TaskCategory || 'unknown';
    
    return {
      totalTasks: this.taskHistory.length,
      categoryDistribution,
      averageConfidence: avgConfidence,
      mostCommonCategory,
    };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.taskHistory = [];
    this.executionPlans = [];
    this.currentStatus = null;
  }
}
