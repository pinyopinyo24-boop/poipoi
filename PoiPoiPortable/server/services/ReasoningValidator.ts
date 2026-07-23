/**
 * ReasoningValidator - 推論バリデーター
 * 推論プロセスの入力・出力を検証
 */

import type { ReasoningRequest, ReasoningResult } from '../core/ReasoningAIManager';

export class ReasoningValidator {
  /**
   * リクエストを検証
   */
  validateRequest(request: ReasoningRequest): boolean {
    if (!request.userId || request.userId.length === 0) return false;
    if (!request.problem || request.problem.length === 0) return false;

    return true;
  }

  /**
   * 問題の妥当性を検証
   */
  validateProblem(problem: string): boolean {
    if (!problem || problem.length < 10) return false;
    if (problem.length > 10000) return false;

    return true;
  }

  /**
   * 分解結果を検証
   */
  validateDecomposition(decomposition: string[]): boolean {
    if (!Array.isArray(decomposition)) return false;
    if (decomposition.length === 0) return false;
    if (decomposition.length > 20) return false;

    for (const item of decomposition) {
      if (!item || item.length === 0) return false;
    }

    return true;
  }

  /**
   * 論理分析結果を検証
   */
  validateLogicAnalysis(analysis: Record<string, unknown>): boolean {
    if (!analysis || typeof analysis !== 'object') return false;

    const requiredFields = ['premises', 'conclusions', 'logicalChain'];
    for (const field of requiredFields) {
      if (!(field in analysis)) return false;
    }

    return true;
  }

  /**
   * 選択肢を検証
   */
  validateAlternatives(alternatives: Array<{ score: number }>): boolean {
    if (!Array.isArray(alternatives)) return false;
    if (alternatives.length === 0) return false;
    if (alternatives.length > 10) return false;

    for (const alt of alternatives) {
      if (typeof alt.score !== 'number') return false;
      if (alt.score < 0 || alt.score > 1) return false;
    }

    return true;
  }

  /**
   * 推奨を検証
   */
  validateRecommendation(recommendation: {
    option: string;
    confidence: number;
    reasoning: string;
  }): boolean {
    if (!recommendation.option || recommendation.option.length === 0) return false;
    if (typeof recommendation.confidence !== 'number') return false;
    if (recommendation.confidence < 0 || recommendation.confidence > 1) return false;
    if (!recommendation.reasoning || recommendation.reasoning.length === 0)
      return false;

    return true;
  }

  /**
   * 推論結果を検証
   */
  validateReasoningResult(result: ReasoningResult): boolean {
    if (!result.id || result.id.length === 0) return false;
    if (!result.userId || result.userId.length === 0) return false;
    if (!result.problem || result.problem.length === 0) return false;

    if (!this.validateDecomposition(result.decomposition)) return false;
    if (!this.validateLogicAnalysis(result.logicAnalysis)) return false;
    if (!this.validateAlternatives(result.alternatives)) return false;
    if (!this.validateRecommendation(result.recommendation)) return false;

    if (!['pending', 'completed', 'failed'].includes(result.status)) return false;

    return true;
  }

  /**
   * コンテキストを検証
   */
  validateContext(context: Record<string, unknown>): boolean {
    if (!context || typeof context !== 'object') return false;

    return true;
  }

  /**
   * 制約を検証
   */
  validateConstraints(constraints: string[]): boolean {
    if (!Array.isArray(constraints)) return false;

    for (const constraint of constraints) {
      if (!constraint || typeof constraint !== 'string') return false;
    }

    return true;
  }

  /**
   * 目的を検証
   */
  validateObjectives(objectives: string[]): boolean {
    if (!Array.isArray(objectives)) return false;

    for (const objective of objectives) {
      if (!objective || typeof objective !== 'string') return false;
    }

    return true;
  }

  /**
   * フィードバックを検証
   */
  validateFeedback(feedback: { rating: number; comments?: string }): boolean {
    if (typeof feedback.rating !== 'number') return false;
    if (feedback.rating < 0 || feedback.rating > 5) return false;

    if (feedback.comments && typeof feedback.comments !== 'string') return false;

    return true;
  }
}
