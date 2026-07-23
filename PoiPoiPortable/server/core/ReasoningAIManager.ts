/**
 * ReasoningAIManager - 高度推論エンジン
 * 複雑な課題を分析し、問題分解・推論・判断補助を行う
 */

import { ReasoningService } from '../services/ReasoningService';
import { ProblemDecompositionService } from '../services/ProblemDecompositionService';
import { LogicAnalyzer } from '../services/LogicAnalyzer';
import { DecisionSupportService } from '../services/DecisionSupportService';
import { ContextAnalysisService } from '../services/ContextAnalysisService';
import { ReasoningValidator } from '../services/ReasoningValidator';
import { ReasoningRepository } from '../repositories/ReasoningRepository';

export interface ReasoningRequest {
  userId: string;
  problem: string;
  context?: Record<string, unknown>;
  constraints?: string[];
  objectives?: string[];
}

export interface ReasoningResult {
  id: string;
  userId: string;
  problem: string;
  decomposition: string[];
  logicAnalysis: Record<string, unknown>;
  alternatives: Array<{
    id: string;
    description: string;
    pros: string[];
    cons: string[];
    score: number;
  }>;
  recommendation: {
    option: string;
    confidence: number;
    reasoning: string;
  };
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
}

export class ReasoningAIManager {
  private reasoningService: ReasoningService;
  private decompositionService: ProblemDecompositionService;
  private logicAnalyzer: LogicAnalyzer;
  private decisionSupport: DecisionSupportService;
  private contextAnalysis: ContextAnalysisService;
  private validator: ReasoningValidator;
  private repository: ReasoningRepository;

  constructor(
    reasoningService: ReasoningService,
    decompositionService: ProblemDecompositionService,
    logicAnalyzer: LogicAnalyzer,
    decisionSupport: DecisionSupportService,
    contextAnalysis: ContextAnalysisService,
    validator: ReasoningValidator,
    repository: ReasoningRepository
  ) {
    this.reasoningService = reasoningService;
    this.decompositionService = decompositionService;
    this.logicAnalyzer = logicAnalyzer;
    this.decisionSupport = decisionSupport;
    this.contextAnalysis = contextAnalysis;
    this.validator = validator;
    this.repository = repository;
  }

  /**
   * 推論処理を実行
   */
  async executeReasoning(request: ReasoningRequest): Promise<ReasoningResult> {
    // 入力検証
    if (!this.validator.validateRequest(request)) {
      throw new Error('Invalid reasoning request');
    }

    const result: ReasoningResult = {
      id: `reasoning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: request.userId,
      problem: request.problem,
      decomposition: [],
      logicAnalysis: {},
      alternatives: [],
      recommendation: {
        option: '',
        confidence: 0,
        reasoning: '',
      },
      timestamp: Date.now(),
      status: 'pending',
    };

    try {
      // ① 問題分解
      result.decomposition = await this.decompositionService.decomposeProblem(
        request.problem,
        request.constraints || []
      );

      // ③ コンテキスト理解
      const contextInfo = await this.contextAnalysis.analyzeContext(
        request.problem,
        request.context || {}
      );
      const context = contextInfo as unknown as Record<string, unknown>;

      // ② 論理分析
      const logicAnalysis = await this.logicAnalyzer.analyzeProblemLogic(
        request.problem,
        result.decomposition,
        context
      );
      result.logicAnalysis = logicAnalysis as unknown as Record<string, unknown>;

      // ④ 複数案生成
      result.alternatives = await this.decisionSupport.generateAlternatives(
        request.problem,
        result.decomposition,
        request.objectives || []
      );

      // ⑤ 判断支援
      result.recommendation = await this.decisionSupport.supportDecision(
        result.alternatives,
        request.objectives || []
      );

      result.status = 'completed';

      // ⑥ 推論履歴保存
      await this.repository.saveReasoningResult(result);

      return result;
    } catch (error) {
      result.status = 'failed';
      await this.repository.saveReasoningResult(result);
      throw error;
    }
  }

  /**
   * 推論結果を評価
   */
  async evaluateReasoning(
    resultId: string,
    feedback: { rating: number; comments?: string }
  ): Promise<void> {
    // ⑦ 推論結果評価
    await this.repository.evaluateResult(resultId, feedback);
  }

  /**
   * 改善フィードバックを記録
   */
  async recordFeedback(
    resultId: string,
    feedback: string
  ): Promise<void> {
    // ⑧ 改善フィードバック
    await this.repository.recordFeedback(resultId, feedback);
  }

  /**
   * ユーザーの推論履歴を取得
   */
  async getUserReasoningHistory(userId: string): Promise<ReasoningResult[]> {
    return this.repository.getUserReasoningHistory(userId);
  }

  /**
   * 推論結果を取得
   */
  async getReasoningResult(resultId: string): Promise<ReasoningResult | null> {
    return this.repository.getReasoningResult(resultId);
  }

  /**
   * 推論統計を取得
   */
  async getReasoningStats(userId: string): Promise<Record<string, unknown>> {
    return this.repository.getReasoningStats(userId);
  }
}
