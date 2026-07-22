/**
 * Self Improvement Engine - Analyzes workflow results and generates improvement suggestions
 * PoiPoi learns from execution patterns to improve Agent performance
 */

import { WorkflowExecution } from './WorkflowOrchestrator';
import { MemoryIntegrationService } from './MemoryIntegrationService';

export interface ImprovementSuggestion {
  id: string;
  workflowId: string;
  type: 'agent_performance' | 'workflow_optimization' | 'error_prevention' | 'efficiency_improvement';
  category: string;
  suggestion: string;
  reason: string;
  confidence: number; // 0-100
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: number; // 0-100
  actionItems: string[];
  createdAt: number;
}

export interface PerformanceMetrics {
  agentType: string;
  successRate: number;
  averageDuration: number;
  errorCount: number;
  lastErrors: string[];
  improvementOpportunities: string[];
}

export interface ImprovementAnalysis {
  workflowId: string;
  overallSuccessRate: number;
  agentMetrics: PerformanceMetrics[];
  bottlenecks: string[];
  suggestions: ImprovementSuggestion[];
  learningPoints: string[];
  nextSteps: string[];
}

/**
 * SelfImprovementEngine - Analyzes workflows and generates improvement suggestions
 */
export class SelfImprovementEngine {
  private suggestions: ImprovementSuggestion[] = [];
  private performanceHistory: Map<string, PerformanceMetrics[]> = new Map();
  private analysisHistory: ImprovementAnalysis[] = [];

  constructor(private memoryService: MemoryIntegrationService) {}

  /**
   * Analyze workflow execution and generate improvement suggestions
   */
  async analyzeWorkflow(workflow: WorkflowExecution): Promise<ImprovementAnalysis> {
    const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate success rate
    const overallSuccessRate = workflow.state === 'completed' ? 100 : 0;

    // Analyze each agent's performance
    const agentMetrics = this.analyzeAgentPerformance(workflow);

    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(workflow, agentMetrics);

    // Generate suggestions
    const suggestions = await this.generateSuggestions(workflow, agentMetrics, bottlenecks);

    // Extract learning points
    const learningPoints = this.extractLearningPoints(workflow, suggestions);

    // Generate next steps
    const nextSteps = this.generateNextSteps(suggestions, learningPoints);

    const analysis: ImprovementAnalysis = {
      workflowId: workflow.id,
      overallSuccessRate,
      agentMetrics,
      bottlenecks,
      suggestions,
      learningPoints,
      nextSteps,
    };

    this.analysisHistory.push(analysis);

    // Save suggestions to memory
    for (const suggestion of suggestions) {
      try {
        await this.saveToMemory(suggestion);
      } catch (error) {
        console.error('[SelfImprovementEngine] Failed to save suggestion to memory:', error);
      }
    }

    return analysis;
  }

  /**
   * Analyze individual agent performance
   */
  private analyzeAgentPerformance(workflow: WorkflowExecution): PerformanceMetrics[] {
    const metrics: PerformanceMetrics[] = [];

    for (const step of workflow.steps) {
      const agentType = step.agentType;

      // Get or initialize metrics for this agent
      if (!this.performanceHistory.has(agentType)) {
        this.performanceHistory.set(agentType, []);
      }

      const agentHistory = this.performanceHistory.get(agentType) || [];

      // Calculate metrics
      const successCount = agentHistory.filter((m) => m.successRate === 100).length;
      const successRate = agentHistory.length > 0 ? (successCount / agentHistory.length) * 100 : 0;

      const avgDuration =
        agentHistory.length > 0
          ? agentHistory.reduce((sum, m) => sum + m.averageDuration, 0) / agentHistory.length
          : (step.duration || 0);

      const errorCount = agentHistory.reduce((sum, m) => sum + m.errorCount, 0);

      const lastErrors = agentHistory
        .filter((m) => m.lastErrors.length > 0)
        .slice(-3)
        .flatMap((m) => m.lastErrors);

      const improvementOpportunities = this.identifyAgentImprovements(agentType, successRate, errorCount);

      const metric: PerformanceMetrics = {
        agentType,
        successRate,
        averageDuration: avgDuration,
        errorCount,
        lastErrors: Array.from(new Set(lastErrors)),
        improvementOpportunities,
      };

      metrics.push(metric);

      // Update history
      agentHistory.push(metric);
    }

    return metrics;
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(workflow: WorkflowExecution, metrics: PerformanceMetrics[]): string[] {
    const bottlenecks: string[] = [];

    // Check for slow agents
    const avgDuration = workflow.steps.reduce((sum, s) => sum + (s.duration || 0), 0) / workflow.steps.length;
    for (const step of workflow.steps) {
      if ((step.duration || 0) > avgDuration * 1.5) {
        bottlenecks.push(`${step.agentType} Agent が遅い 
(${step.duration}ms)`);
      }
    }

    // Check for error patterns
    for (const metric of metrics) {
      if (metric.errorCount > 0) {
        bottlenecks.push(`${metric.agentType} Agent でエラーが発生 (${metric.errorCount}回)`);
      }

      if (metric.successRate < 80) {
        bottlenecks.push(`${metric.agentType} Agent の成功率が低い (${metric.successRate.toFixed(1)}%)`);
      }
    }

    // Check for dependency issues
    if (workflow.steps.length > 1) {
      for (let i = 1; i < workflow.steps.length; i++) {
        const prevStep = workflow.steps[i - 1];
        const currentStep = workflow.steps[i];

        if (prevStep.state === 'failed') {
          bottlenecks.push(`${prevStep.agentType} Agent の失敗が ${currentStep.agentType} Agent に影響`);
        }
      }
    }

    return Array.from(new Set(bottlenecks));
  }

  /**
   * Generate improvement suggestions
   */
  private async generateSuggestions(
    workflow: WorkflowExecution,
    metrics: PerformanceMetrics[],
    bottlenecks: string[]
  ): Promise<ImprovementSuggestion[]> {
    const suggestions: ImprovementSuggestion[] = [];

    // Agent performance suggestions
    for (const metric of metrics) {
      if (metric.successRate < 100) {
        const suggestion: ImprovementSuggestion = {
          id: `sugg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          workflowId: workflow.id,
          type: 'agent_performance',
          category: `${metric.agentType}_performance`,
          suggestion: `${metric.agentType} Agent の入力検証を強化してください`,
          reason: `成功率が ${metric.successRate.toFixed(1)}% です。エラーハンドリングを改善することで精度が向上します。`,
          confidence: Math.min(100, 50 + metric.successRate),
          priority: metric.successRate < 70 ? 'high' : 'medium',
          estimatedImpact: 100 - metric.successRate,
          actionItems: [
            'エラーログを分析',
            '入力バリデーション強化',
            'リトライロジック追加',
            'テストケース追加',
          ],
          createdAt: Date.now(),
        };

        suggestions.push(suggestion);
      }

      // Duration optimization
      if (metric.averageDuration > 1000) {
        const suggestion: ImprovementSuggestion = {
          id: `sugg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          workflowId: workflow.id,
          type: 'efficiency_improvement',
          category: `${metric.agentType}_speed`,
          suggestion: `${metric.agentType} Agent の処理を最適化してください`,
          reason: `平均実行時間が ${metric.averageDuration.toFixed(0)}ms です。キャッシング等で高速化できます。`,
          confidence: 75,
          priority: 'medium',
          estimatedImpact: Math.min(50, metric.averageDuration / 20),
          actionItems: [
            '処理フローの見直し',
            'キャッシング導入',
            'バッチ処理検討',
            'API呼び出し最適化',
          ],
          createdAt: Date.now(),
        };

        suggestions.push(suggestion);
      }
    }

    // Workflow optimization
    if ((workflow.duration || 0) > 5000) {
      const suggestion: ImprovementSuggestion = {
        id: `sugg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workflowId: workflow.id,
        type: 'workflow_optimization',
        category: 'workflow_duration',
        suggestion: 'ワークフロー全体の処理時間を短縮してください',
        reason: `総実行時間が ${workflow.duration || 0}ms です。並列処理やプリフェッチで改善できます。`,
        confidence: 80,
        priority: 'medium',
        estimatedImpact: 30,
        actionItems: [
          'Agent 間の依存関係を見直し',
          '並列実行可能な処理を検出',
          'プリフェッチ機能追加',
          'リソース配分最適化',
        ],
        createdAt: Date.now(),
      };

      suggestions.push(suggestion);
    }

    // Error prevention
    if (workflow.state === 'failed') {
      const suggestion: ImprovementSuggestion = {
        id: `sugg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workflowId: workflow.id,
        type: 'error_prevention',
        category: 'error_handling',
        suggestion: 'エラーハンドリングを強化してください',
        reason: `ワークフローが失敗しました。エラー検出と回復メカニズムを改善します。`,
        confidence: 90,
        priority: 'high',
        estimatedImpact: 50,
        actionItems: [
          'エラーログ詳細化',
          '自動リトライ機能追加',
          'フォールバック処理実装',
          'エラー分類の精密化',
        ],
        createdAt: Date.now(),
      };

      suggestions.push(suggestion);
    }

    return suggestions;
  }

  /**
   * Identify agent-specific improvement opportunities
   */
  private identifyAgentImprovements(agentType: string, successRate: number, errorCount: number): string[] {
    const opportunities: string[] = [];

    if (successRate < 80) {
      opportunities.push('入力検証強化');
      opportunities.push('エラーハンドリング改善');
    }

    if (errorCount > 5) {
      opportunities.push('エラー原因分析');
      opportunities.push('リトライロジック追加');
    }

    if (agentType === 'task') {
      opportunities.push('質問解析精度向上');
      opportunities.push('コンテキスト理解改善');
    }

    if (agentType === 'design') {
      opportunities.push('設計パターン拡張');
      opportunities.push('制約条件の考慮');
    }

    if (agentType === 'implementation') {
      opportunities.push('コード品質チェック');
      opportunities.push('ベストプラクティス適用');
    }

    if (agentType === 'review') {
      opportunities.push('レビュー基準の明確化');
      opportunities.push('自動チェック項目追加');
    }

    return opportunities;
  }

  /**
   * Extract learning points from workflow
   */
  private extractLearningPoints(workflow: WorkflowExecution, suggestions: ImprovementSuggestion[]): string[] {
    const learningPoints: string[] = [];

    if (workflow.state === 'completed') {
      learningPoints.push('ワークフロー完了 - 成功パターンを記憶');
    }

    if (suggestions.length > 0) {
      learningPoints.push(`${suggestions.length}個の改善機会を検出`);

      const highPriority = suggestions.filter((s) => s.priority === 'high');
      if (highPriority.length > 0) {
        learningPoints.push(`${highPriority.length}個の重要な改善項目あり`);
      }
    }

    if ((workflow.duration || 0) < 2000) {
      learningPoints.push('高速実行パターン - キャッシュ対象');
    }

    if (workflow.steps.every((s) => s.state === 'completed')) {
      learningPoints.push('全 Agent 成功 - テンプレート化検討');
    }

    return learningPoints;
  }

  /**
   * Generate next steps for improvement
   */
  private generateNextSteps(suggestions: ImprovementSuggestion[], learningPoints: string[]): string[] {
    const nextSteps: string[] = [];

    // Prioritize high-confidence, high-priority suggestions
    const prioritySuggestions = suggestions
      .filter((s) => s.priority === 'high' && s.confidence > 80)
      .sort((a, b) => b.estimatedImpact - a.estimatedImpact)
      .slice(0, 3);

    for (const suggestion of prioritySuggestions) {
      nextSteps.push(`[優先] ${suggestion.suggestion}`);
    }

    // Add medium priority items
    const mediumSuggestions = suggestions
      .filter((s) => s.priority === 'medium')
      .slice(0, 2);

    for (const suggestion of mediumSuggestions) {
      nextSteps.push(`[通常] ${suggestion.suggestion}`);
    }

    // Add learning-based next steps
    if (learningPoints.includes('全 Agent 成功 - テンプレート化検討')) {
      nextSteps.push('[学習] このパターンをテンプレート化');
    }

    return nextSteps;
  }

  /**
   * Save suggestion to memory
   */
  private async saveToMemory(suggestion: ImprovementSuggestion): Promise<void> {
    const memory = {
      id: `memory_${suggestion.id}`,
      timestamp: new Date().toISOString(),
      type: 'self_improvement',
      content: JSON.stringify(suggestion),
      importance: suggestion.priority === 'high' ? 'high' : 'medium',
      tags: [
        'self_improvement',
        suggestion.type,
        suggestion.category,
        `confidence_${Math.floor(suggestion.confidence / 10) * 10}`,
      ],
      metadata: {
        workflowId: suggestion.workflowId,
        suggestionId: suggestion.id,
        source: 'SelfImprovementEngine',
      },
    };

    console.log('[SelfImprovementEngine] Suggestion saved to memory:', suggestion.id);
  }

  /**
   * Get suggestions for a workflow
   */
  getSuggestions(workflowId?: string): ImprovementSuggestion[] {
    if (workflowId) {
      return this.suggestions.filter((s) => s.workflowId === workflowId);
    }
    return this.suggestions;
  }

  /**
   * Get analysis history
   */
  getAnalysisHistory(limit: number = 10): ImprovementAnalysis[] {
    return this.analysisHistory.slice(-limit).reverse();
  }

  /**
   * Get performance metrics for an agent
   */
  getAgentMetrics(agentType: string): PerformanceMetrics[] {
    return this.performanceHistory.get(agentType) || [];
  }

  /**
   * Get overall improvement statistics
   */
  getStatistics(): {
    totalAnalyzed: number;
    totalSuggestions: number;
    averageConfidence: number;
    highPrioritySuggestions: number;
    agentCount: number;
  } {
    const avgConfidence =
      this.suggestions.length > 0
        ? this.suggestions.reduce((sum, s) => sum + s.confidence, 0) / this.suggestions.length
        : 0;

    const highPriority = this.suggestions.filter((s) => s.priority === 'high').length;

    return {
      totalAnalyzed: this.analysisHistory.length,
      totalSuggestions: this.suggestions.length,
      averageConfidence: avgConfidence,
      highPrioritySuggestions: highPriority,
      agentCount: this.performanceHistory.size,
    };
  }

  /**
   * Apply suggestion (mark as applied)
   */
  applySuggestion(suggestionId: string): boolean {
    const suggestion = this.suggestions.find((s) => s.id === suggestionId);
    if (!suggestion) return false;

    // In a real system, this would trigger actual improvements
    console.log('[SelfImprovementEngine] Suggestion applied:', suggestionId);
    return true;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.suggestions = [];
    this.performanceHistory.clear();
    this.analysisHistory = [];
  }
}
