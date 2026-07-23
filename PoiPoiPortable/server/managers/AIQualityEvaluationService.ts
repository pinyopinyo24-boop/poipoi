/**
 * AIQualityEvaluationService
 * AI回答品質・会話継続性・推論精度評価
 */

export interface QualityScore {
  scoreId: string;
  timestamp: number;
  evaluationType: 'response_quality' | 'conversation_continuity' | 'memory_accuracy' | 'inference_accuracy' | 'manufacturing_ai';
  score: number;
  maxScore: number;
  percentage: number;
  details: string;
  feedback?: string;
}

export interface EvaluationResult {
  resultId: string;
  timestamp: number;
  conversationId: string;
  responseId: string;
  scores: QualityScore[];
  overallScore: number;
  status: 'passed' | 'warning' | 'failed';
  recommendations: string[];
}

export interface AIMetrics {
  metricsId: string;
  timestamp: number;
  totalEvaluations: number;
  averageScore: number;
  passRate: number;
  warningRate: number;
  failureRate: number;
  byEvaluationType: Record<string, { count: number; avgScore: number }>;
}

export class AIQualityEvaluationService {
  private scores: Map<string, QualityScore> = new Map();
  private results: Map<string, EvaluationResult> = new Map();
  private metrics: Map<string, AIMetrics> = new Map();
  private scoresByType: Map<string, string[]> = new Map();
  private resultsByConversation: Map<string, string[]> = new Map();

  /**
   * 品質スコアを記録
   */
  recordScore(
    evaluationType: QualityScore['evaluationType'],
    score: number,
    maxScore: number,
    details: string,
    feedback?: string
  ): QualityScore {
    const scoreId = `QS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const percentage = (score / maxScore) * 100;

    const qualityScore: QualityScore = {
      scoreId,
      timestamp: Date.now(),
      evaluationType,
      score,
      maxScore,
      percentage,
      details,
      feedback,
    };

    this.scores.set(scoreId, qualityScore);

    if (!this.scoresByType.has(evaluationType)) {
      this.scoresByType.set(evaluationType, []);
    }
    this.scoresByType.get(evaluationType)!.push(scoreId);

    return qualityScore;
  }

  /**
   * スコアを取得
   */
  getScore(scoreId: string): QualityScore | undefined {
    return this.scores.get(scoreId);
  }

  /**
   * 評価タイプ別スコアを取得
   */
  getScoresByType(evaluationType: QualityScore['evaluationType']): QualityScore[] {
    const ids = this.scoresByType.get(evaluationType) || [];
    return ids
      .map(id => this.scores.get(id))
      .filter((s): s is QualityScore => s !== undefined);
  }

  /**
   * 評価結果を生成
   */
  generateEvaluationResult(
    conversationId: string,
    responseId: string,
    scores: QualityScore[],
    recommendations: string[] = []
  ): EvaluationResult {
    const resultId = `EVL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 全体スコアを計算
    const totalScore = scores.reduce((sum, s) => sum + s.percentage, 0);
    const overallScore = scores.length > 0 ? totalScore / scores.length : 0;

    // ステータスを判定
    let status: EvaluationResult['status'] = 'passed';
    if (overallScore < 70) {
      status = 'failed';
    } else if (overallScore < 85) {
      status = 'warning';
    }

    const result: EvaluationResult = {
      resultId,
      timestamp: Date.now(),
      conversationId,
      responseId,
      scores,
      overallScore,
      status,
      recommendations,
    };

    this.results.set(resultId, result);

    if (!this.resultsByConversation.has(conversationId)) {
      this.resultsByConversation.set(conversationId, []);
    }
    this.resultsByConversation.get(conversationId)!.push(resultId);

    return result;
  }

  /**
   * 評価結果を取得
   */
  getEvaluationResult(resultId: string): EvaluationResult | undefined {
    return this.results.get(resultId);
  }

  /**
   * 会話別評価結果を取得
   */
  getEvaluationsByConversation(conversationId: string): EvaluationResult[] {
    const ids = this.resultsByConversation.get(conversationId) || [];
    return ids
      .map(id => this.results.get(id))
      .filter((r): r is EvaluationResult => r !== undefined);
  }

  /**
   * 回答品質を評価
   */
  evaluateResponseQuality(
    relevance: number,
    accuracy: number,
    completeness: number,
    clarity: number
  ): QualityScore {
    const totalScore = relevance + accuracy + completeness + clarity;
    const maxScore = 40;
    const percentage = (totalScore / maxScore) * 100;

    return this.recordScore(
      'response_quality',
      totalScore,
      maxScore,
      `関連性: ${relevance}/10, 正確性: ${accuracy}/10, 完全性: ${completeness}/10, 明確性: ${clarity}/10`,
      percentage >= 85 ? undefined : '改善が必要です'
    );
  }

  /**
   * 会話継続性を評価
   */
  evaluateConversationContinuity(
    contextUnderstanding: number,
    topicCoherence: number,
    referenceAccuracy: number
  ): QualityScore {
    const totalScore = contextUnderstanding + topicCoherence + referenceAccuracy;
    const maxScore = 30;

    return this.recordScore(
      'conversation_continuity',
      totalScore,
      maxScore,
      `文脈理解: ${contextUnderstanding}/10, トピック一貫性: ${topicCoherence}/10, 参照精度: ${referenceAccuracy}/10`
    );
  }

  /**
   * 長期記憶精度を評価
   */
  evaluateMemoryAccuracy(
    recallAccuracy: number,
    contextRetention: number,
    userPreferenceAccuracy: number
  ): QualityScore {
    const totalScore = recallAccuracy + contextRetention + userPreferenceAccuracy;
    const maxScore = 30;

    return this.recordScore(
      'memory_accuracy',
      totalScore,
      maxScore,
      `想起精度: ${recallAccuracy}/10, 文脈保持: ${contextRetention}/10, ユーザー設定精度: ${userPreferenceAccuracy}/10`
    );
  }

  /**
   * 推論精度を評価
   */
  evaluateInferenceAccuracy(
    logicalValidity: number,
    conclusionAccuracy: number,
    assumptionCorrectness: number
  ): QualityScore {
    const totalScore = logicalValidity + conclusionAccuracy + assumptionCorrectness;
    const maxScore = 30;

    return this.recordScore(
      'inference_accuracy',
      totalScore,
      maxScore,
      `論理的妥当性: ${logicalValidity}/10, 結論精度: ${conclusionAccuracy}/10, 前提正確性: ${assumptionCorrectness}/10`
    );
  }

  /**
   * 製造AI精度を評価
   */
  evaluateManufacturingAI(
    processAccuracy: number,
    optimizationAccuracy: number,
    predictionAccuracy: number
  ): QualityScore {
    const totalScore = processAccuracy + optimizationAccuracy + predictionAccuracy;
    const maxScore = 30;

    return this.recordScore(
      'manufacturing_ai',
      totalScore,
      maxScore,
      `プロセス精度: ${processAccuracy}/10, 最適化精度: ${optimizationAccuracy}/10, 予測精度: ${predictionAccuracy}/10`
    );
  }

  /**
   * AIメトリクスを計算
   */
  calculateAIMetrics(): AIMetrics {
    const metricsId = `AIM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const results = Array.from(this.results.values());

    const metrics: AIMetrics = {
      metricsId,
      timestamp: Date.now(),
      totalEvaluations: results.length,
      averageScore: 0,
      passRate: 0,
      warningRate: 0,
      failureRate: 0,
      byEvaluationType: {},
    };

    if (results.length === 0) {
      this.metrics.set(metricsId, metrics);
      return metrics;
    }

    let totalScore = 0;
    let passCount = 0;
    let warningCount = 0;
    let failureCount = 0;

    for (const result of results) {
      totalScore += result.overallScore;
      if (result.status === 'passed') passCount++;
      if (result.status === 'warning') warningCount++;
      if (result.status === 'failed') failureCount++;
    }

    metrics.averageScore = totalScore / results.length;
    metrics.passRate = (passCount / results.length) * 100;
    metrics.warningRate = (warningCount / results.length) * 100;
    metrics.failureRate = (failureCount / results.length) * 100;

    // 評価タイプ別メトリクス
    for (const [type, ids] of Array.from(this.scoresByType)) {
      const typeScores = ids
        .map(id => this.scores.get(id))
        .filter((s): s is QualityScore => s !== undefined);

      if (typeScores.length > 0) {
        const avgScore = typeScores.reduce((sum, s) => sum + s.percentage, 0) / typeScores.length;
        metrics.byEvaluationType[type] = {
          count: typeScores.length,
          avgScore,
        };
      }
    }

    this.metrics.set(metricsId, metrics);
    return metrics;
  }

  /**
   * 全評価結果を取得
   */
  getAllResults(): EvaluationResult[] {
    return Array.from(this.results.values());
  }

  /**
   * 全スコアを取得
   */
  getAllScores(): QualityScore[] {
    return Array.from(this.scores.values());
  }

  /**
   * 低品質な結果を取得
   */
  getLowQualityResults(threshold: number = 70): EvaluationResult[] {
    return Array.from(this.results.values()).filter(r => r.overallScore < threshold);
  }

  /**
   * 高品質な結果を取得
   */
  getHighQualityResults(threshold: number = 85): EvaluationResult[] {
    return Array.from(this.results.values()).filter(r => r.overallScore >= threshold);
  }

  /**
   * 評価結果を削除
   */
  deleteResult(resultId: string): boolean {
    const result = this.results.get(resultId);
    if (!result) return false;

    const conversationIds = this.resultsByConversation.get(result.conversationId) || [];
    const index = conversationIds.indexOf(resultId);
    if (index > -1) {
      conversationIds.splice(index, 1);
    }

    this.results.delete(resultId);
    return true;
  }

  /**
   * スコアを削除
   */
  deleteScore(scoreId: string): boolean {
    const score = this.scores.get(scoreId);
    if (!score) return false;

    const typeIds = this.scoresByType.get(score.evaluationType) || [];
    const index = typeIds.indexOf(scoreId);
    if (index > -1) {
      typeIds.splice(index, 1);
    }

    this.scores.delete(scoreId);
    return true;
  }
}
