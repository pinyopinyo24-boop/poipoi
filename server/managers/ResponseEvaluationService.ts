/**
 * ResponseEvaluationService
 * 回答評価・誤回答分析・改善候補生成
 */

export interface ResponseEvaluation {
  evaluationId: string;
  responseId: string;
  timestamp: number;
  accuracy: number; // 0-100
  relevance: number; // 0-100
  completeness: number; // 0-100
  clarity: number; // 0-100
  overallScore: number; // 0-100
  status: 'good' | 'acceptable' | 'poor';
}

export interface ErrorAnalysis {
  analysisId: string;
  responseId: string;
  timestamp: number;
  errorType: 'factual' | 'logical' | 'incomplete' | 'irrelevant' | 'unclear';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  rootCause?: string;
  frequency: number;
}

export interface ImprovementSuggestion {
  suggestionId: string;
  responseId: string;
  timestamp: number;
  category: 'factual' | 'logical' | 'clarity' | 'completeness' | 'relevance';
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: number; // 0-100
  status: 'pending' | 'reviewed' | 'implemented';
}

export class ResponseEvaluationService {
  private evaluations: Map<string, ResponseEvaluation> = new Map();
  private errorAnalyses: Map<string, ErrorAnalysis> = new Map();
  private suggestions: Map<string, ImprovementSuggestion> = new Map();
  private evaluationsByResponse: Map<string, string[]> = new Map();
  private errorsByResponse: Map<string, string[]> = new Map();
  private suggestionsByResponse: Map<string, string[]> = new Map();
  private suggestionsByStatus: Map<string, string[]> = new Map();

  /**
   * 回答を評価
   */
  evaluateResponse(
    responseId: string,
    accuracy: number,
    relevance: number,
    completeness: number,
    clarity: number
  ): ResponseEvaluation {
    const evaluationId = `RE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const overallScore = (accuracy + relevance + completeness + clarity) / 4;

    let status: 'good' | 'acceptable' | 'poor' = 'good';
    if (overallScore < 50) {
      status = 'poor';
    } else if (overallScore < 75) {
      status = 'acceptable';
    }

    const evaluation: ResponseEvaluation = {
      evaluationId,
      responseId,
      timestamp: Date.now(),
      accuracy,
      relevance,
      completeness,
      clarity,
      overallScore,
      status,
    };

    this.evaluations.set(evaluationId, evaluation);

    if (!this.evaluationsByResponse.has(responseId)) {
      this.evaluationsByResponse.set(responseId, []);
    }
    this.evaluationsByResponse.get(responseId)!.push(evaluationId);

    return evaluation;
  }

  /**
   * 評価を取得
   */
  getEvaluation(evaluationId: string): ResponseEvaluation | undefined {
    return this.evaluations.get(evaluationId);
  }

  /**
   * レスポンス別評価を取得
   */
  getEvaluationsByResponse(responseId: string): ResponseEvaluation[] {
    const ids = this.evaluationsByResponse.get(responseId) || [];
    return ids
      .map(id => this.evaluations.get(id))
      .filter((e): e is ResponseEvaluation => e !== undefined);
  }

  /**
   * エラーを分析
   */
  analyzeError(
    responseId: string,
    errorType: 'factual' | 'logical' | 'incomplete' | 'irrelevant' | 'unclear',
    severity: 'critical' | 'high' | 'medium' | 'low',
    description: string,
    rootCause?: string
  ): ErrorAnalysis {
    const analysisId = `EA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const analysis: ErrorAnalysis = {
      analysisId,
      responseId,
      timestamp: Date.now(),
      errorType,
      severity,
      description,
      rootCause,
      frequency: 1,
    };

    this.errorAnalyses.set(analysisId, analysis);

    if (!this.errorsByResponse.has(responseId)) {
      this.errorsByResponse.set(responseId, []);
    }
    this.errorsByResponse.get(responseId)!.push(analysisId);

    return analysis;
  }

  /**
   * エラー分析を取得
   */
  getErrorAnalysis(analysisId: string): ErrorAnalysis | undefined {
    return this.errorAnalyses.get(analysisId);
  }

  /**
   * レスポンス別エラー分析を取得
   */
  getErrorAnalysesByResponse(responseId: string): ErrorAnalysis[] {
    const ids = this.errorsByResponse.get(responseId) || [];
    return ids
      .map(id => this.errorAnalyses.get(id))
      .filter((a): a is ErrorAnalysis => a !== undefined);
  }

  /**
   * 改善提案を生成
   */
  generateSuggestion(
    responseId: string,
    category: 'factual' | 'logical' | 'clarity' | 'completeness' | 'relevance',
    suggestion: string,
    priority: 'high' | 'medium' | 'low',
    estimatedImpact: number
  ): ImprovementSuggestion {
    const suggestionId = `IS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const improvementSuggestion: ImprovementSuggestion = {
      suggestionId,
      responseId,
      timestamp: Date.now(),
      category,
      suggestion,
      priority,
      estimatedImpact,
      status: 'pending',
    };

    this.suggestions.set(suggestionId, improvementSuggestion);

    if (!this.suggestionsByResponse.has(responseId)) {
      this.suggestionsByResponse.set(responseId, []);
    }
    this.suggestionsByResponse.get(responseId)!.push(suggestionId);

    if (!this.suggestionsByStatus.has('pending')) {
      this.suggestionsByStatus.set('pending', []);
    }
    this.suggestionsByStatus.get('pending')!.push(suggestionId);

    return improvementSuggestion;
  }

  /**
   * 提案を取得
   */
  getSuggestion(suggestionId: string): ImprovementSuggestion | undefined {
    return this.suggestions.get(suggestionId);
  }

  /**
   * レスポンス別提案を取得
   */
  getSuggestionsByResponse(responseId: string): ImprovementSuggestion[] {
    const ids = this.suggestionsByResponse.get(responseId) || [];
    return ids
      .map(id => this.suggestions.get(id))
      .filter((s): s is ImprovementSuggestion => s !== undefined);
  }

  /**
   * ステータス別提案を取得
   */
  getSuggestionsByStatus(status: 'pending' | 'reviewed' | 'implemented'): ImprovementSuggestion[] {
    const ids = this.suggestionsByStatus.get(status) || [];
    return ids
      .map(id => this.suggestions.get(id))
      .filter((s): s is ImprovementSuggestion => s !== undefined);
  }

  /**
   * 提案をレビュー
   */
  reviewSuggestion(suggestionId: string): boolean {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion) return false;

    const pendingIds = this.suggestionsByStatus.get('pending') || [];
    const index = pendingIds.indexOf(suggestionId);
    if (index > -1) {
      pendingIds.splice(index, 1);
    }

    suggestion.status = 'reviewed';

    if (!this.suggestionsByStatus.has('reviewed')) {
      this.suggestionsByStatus.set('reviewed', []);
    }
    this.suggestionsByStatus.get('reviewed')!.push(suggestionId);

    return true;
  }

  /**
   * 提案を実装
   */
  implementSuggestion(suggestionId: string): boolean {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion) return false;

    const reviewedIds = this.suggestionsByStatus.get('reviewed') || [];
    const index = reviewedIds.indexOf(suggestionId);
    if (index > -1) {
      reviewedIds.splice(index, 1);
    }

    suggestion.status = 'implemented';

    if (!this.suggestionsByStatus.has('implemented')) {
      this.suggestionsByStatus.set('implemented', []);
    }
    this.suggestionsByStatus.get('implemented')!.push(suggestionId);

    return true;
  }

  /**
   * 全評価を取得
   */
  getAllEvaluations(): ResponseEvaluation[] {
    return Array.from(this.evaluations.values());
  }

  /**
   * 全エラー分析を取得
   */
  getAllErrorAnalyses(): ErrorAnalysis[] {
    return Array.from(this.errorAnalyses.values());
  }

  /**
   * 全提案を取得
   */
  getAllSuggestions(): ImprovementSuggestion[] {
    return Array.from(this.suggestions.values());
  }

  /**
   * 評価統計を計算
   */
  getEvaluationStats(): {
    totalEvaluations: number;
    averageAccuracy: number;
    averageRelevance: number;
    averageCompleteness: number;
    averageClarity: number;
    goodResponses: number;
    acceptableResponses: number;
    poorResponses: number;
    totalErrors: number;
    totalSuggestions: number;
    implementedSuggestions: number;
  } {
    const allEvaluations = Array.from(this.evaluations.values());
    const allErrors = Array.from(this.errorAnalyses.values());
    const allSuggestions = Array.from(this.suggestions.values());

    let totalAccuracy = 0;
    let totalRelevance = 0;
    let totalCompleteness = 0;
    let totalClarity = 0;

    for (const evaluation of allEvaluations) {
      totalAccuracy += evaluation.accuracy;
      totalRelevance += evaluation.relevance;
      totalCompleteness += evaluation.completeness;
      totalClarity += evaluation.clarity;
    }

    return {
      totalEvaluations: allEvaluations.length,
      averageAccuracy: allEvaluations.length > 0 ? totalAccuracy / allEvaluations.length : 0,
      averageRelevance: allEvaluations.length > 0 ? totalRelevance / allEvaluations.length : 0,
      averageCompleteness: allEvaluations.length > 0 ? totalCompleteness / allEvaluations.length : 0,
      averageClarity: allEvaluations.length > 0 ? totalClarity / allEvaluations.length : 0,
      goodResponses: allEvaluations.filter(e => e.status === 'good').length,
      acceptableResponses: allEvaluations.filter(e => e.status === 'acceptable').length,
      poorResponses: allEvaluations.filter(e => e.status === 'poor').length,
      totalErrors: allErrors.length,
      totalSuggestions: allSuggestions.length,
      implementedSuggestions: allSuggestions.filter(s => s.status === 'implemented').length,
    };
  }

  /**
   * 評価を削除
   */
  deleteEvaluation(evaluationId: string): boolean {
    const evaluation = this.evaluations.get(evaluationId);
    if (!evaluation) return false;

    const responseIds = this.evaluationsByResponse.get(evaluation.responseId) || [];
    const index = responseIds.indexOf(evaluationId);
    if (index > -1) {
      responseIds.splice(index, 1);
    }

    this.evaluations.delete(evaluationId);
    return true;
  }

  /**
   * エラー分析を削除
   */
  deleteErrorAnalysis(analysisId: string): boolean {
    const analysis = this.errorAnalyses.get(analysisId);
    if (!analysis) return false;

    const responseIds = this.errorsByResponse.get(analysis.responseId) || [];
    const index = responseIds.indexOf(analysisId);
    if (index > -1) {
      responseIds.splice(index, 1);
    }

    this.errorAnalyses.delete(analysisId);
    return true;
  }

  /**
   * 提案を削除
   */
  deleteSuggestion(suggestionId: string): boolean {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion) return false;

    const responseIds = this.suggestionsByResponse.get(suggestion.responseId) || [];
    const index = responseIds.indexOf(suggestionId);
    if (index > -1) {
      responseIds.splice(index, 1);
    }

    const statusIds = this.suggestionsByStatus.get(suggestion.status) || [];
    const statusIndex = statusIds.indexOf(suggestionId);
    if (statusIndex > -1) {
      statusIds.splice(statusIndex, 1);
    }

    this.suggestions.delete(suggestionId);
    return true;
  }
}
