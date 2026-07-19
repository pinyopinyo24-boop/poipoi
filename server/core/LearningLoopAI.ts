/**
 * LearningLoopAI - 継続学習ループ実装
 * PoiPoi AIが利用結果から継続的に改善する機能
 */

export interface Feedback {
  sessionId: string;
  userId: string;
  questionId: string;
  responseId: string;
  rating: number; // 1-5
  comment?: string;
  timestamp: number;
  category?: string;
}

export interface LearningRecord {
  id: string;
  sessionId: string;
  question: string;
  response: string;
  feedback: Feedback;
  improvement?: string;
  timestamp: number;
}

export interface AIQualityScore {
  sessionId: string;
  accuracy: number;
  relevance: number;
  clarity: number;
  helpfulness: number;
  overallScore: number;
  timestamp: number;
}

export interface KnowledgeGap {
  topic: string;
  frequency: number;
  lastDetected: number;
  suggestedSources?: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface ImprovementSuggestion {
  id: string;
  type: 'knowledge' | 'response' | 'process';
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  suggestedAction?: string;
  timestamp: number;
}

export class LearningLoopAI {
  private feedbackHistory: Feedback[] = [];
  private learningRecords: Map<string, LearningRecord> = new Map();
  private qualityScores: AIQualityScore[] = [];
  private knowledgeGaps: Map<string, KnowledgeGap> = new Map();
  private improvementSuggestions: ImprovementSuggestion[] = [];
  private evolutionMetrics: Map<string, number> = new Map();

  constructor() {
    this.initializeMetrics();
  }

  /**
   * メトリクスを初期化
   */
  private initializeMetrics(): void {
    this.evolutionMetrics.set('totalFeedback', 0);
    this.evolutionMetrics.set('averageRating', 0);
    this.evolutionMetrics.set('improvementRate', 0);
    this.evolutionMetrics.set('knowledgeGapCount', 0);
    this.evolutionMetrics.set('learningCycles', 0);
  }

  /**
   * フィードバックを記録
   */
  recordFeedback(feedback: Omit<Feedback, 'timestamp'>): string {
    const record: Feedback = {
      ...feedback,
      timestamp: Date.now(),
    };

    this.feedbackHistory.push(record);
    this.updateMetrics();

    return `feedback-${Date.now()}`;
  }

  /**
   * 学習記録を追加
   */
  addLearningRecord(record: Omit<LearningRecord, 'id' | 'timestamp'>): string {
    const id = `learning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const learningRecord: LearningRecord = {
      ...record,
      id,
      timestamp: Date.now(),
    };

    this.learningRecords.set(id, learningRecord);
    return id;
  }

  /**
   * 品質スコアを計算
   */
  calculateQualityScore(sessionId: string): AIQualityScore {
    const sessionFeedback = this.feedbackHistory.filter((f) => f.sessionId === sessionId);

    if (sessionFeedback.length === 0) {
      return {
        sessionId,
        accuracy: 0,
        relevance: 0,
        clarity: 0,
        helpfulness: 0,
        overallScore: 0,
        timestamp: Date.now(),
      };
    }

    const avgRating = sessionFeedback.reduce((sum, f) => sum + f.rating, 0) / sessionFeedback.length;

    // 各指標を計算（簡略版）
    const accuracy = Math.min(avgRating * 0.8, 5);
    const relevance = Math.min(avgRating * 0.85, 5);
    const clarity = Math.min(avgRating * 0.9, 5);
    const helpfulness = avgRating;

    const overallScore = (accuracy + relevance + clarity + helpfulness) / 4;

    const score: AIQualityScore = {
      sessionId,
      accuracy,
      relevance,
      clarity,
      helpfulness,
      overallScore,
      timestamp: Date.now(),
    };

    this.qualityScores.push(score);
    return score;
  }

  /**
   * 知識ギャップを検出
   */
  detectKnowledgeGaps(): KnowledgeGap[] {
    const gapMap = new Map<string, { count: number; lastTime: number }>();

    this.feedbackHistory.forEach((feedback) => {
      if (feedback.rating <= 2) {
        const category = feedback.category || 'unknown';
        const existing = gapMap.get(category) || { count: 0, lastTime: 0 };
        gapMap.set(category, {
          count: existing.count + 1,
          lastTime: feedback.timestamp,
        });
      }
    });

    const gaps: KnowledgeGap[] = [];
    gapMap.forEach((data, topic) => {
      const gap: KnowledgeGap = {
        topic,
        frequency: data.count,
        lastDetected: data.lastTime,
        priority: data.count > 5 ? 'high' : data.count > 2 ? 'medium' : 'low',
      };
      gaps.push(gap);
      this.knowledgeGaps.set(topic, gap);
    });

    return gaps.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * 改善提案を生成
   */
  generateImprovementSuggestions(): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    // 知識ギャップに基づく提案
    const gaps = this.detectKnowledgeGaps();
    gaps.forEach((gap) => {
      if (gap.priority === 'high') {
        suggestions.push({
          id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'knowledge',
          description: `High-frequency knowledge gap detected in ${gap.topic}`,
          impact: 'high',
          confidence: Math.min(gap.frequency / 10, 1),
          suggestedAction: `Add more training data for ${gap.topic}`,
          timestamp: Date.now(),
        });
      }
    });

    // 品質スコアに基づく提案
    if (this.qualityScores.length > 0) {
      const recentScores = this.qualityScores.slice(-10);
      const avgScore = recentScores.reduce((sum, s) => sum + s.overallScore, 0) / recentScores.length;

      if (avgScore < 3) {
        suggestions.push({
          id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'response',
          description: 'Overall response quality is below target',
          impact: 'high',
          confidence: 0.8,
          suggestedAction: 'Review and improve response generation logic',
          timestamp: Date.now(),
        });
      }
    }

    // フィードバック分析に基づく提案
    const lowRatingCount = this.feedbackHistory.filter((f) => f.rating <= 2).length;
    if (lowRatingCount > this.feedbackHistory.length * 0.2) {
      suggestions.push({
        id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'process',
        description: 'High rate of low-quality responses detected',
        impact: 'high',
        confidence: 0.9,
        suggestedAction: 'Implement quality control improvements',
        timestamp: Date.now(),
      });
    }

    this.improvementSuggestions = suggestions;
    return suggestions;
  }

  /**
   * フィードバックを分析
   */
  analyzeFeedback(): {
    averageRating: number;
    totalFeedback: number;
    ratingDistribution: Record<number, number>;
    improvementRate: number;
  } {
    if (this.feedbackHistory.length === 0) {
      return {
        averageRating: 0,
        totalFeedback: 0,
        ratingDistribution: {},
        improvementRate: 0,
      };
    }

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    this.feedbackHistory.forEach((feedback) => {
      distribution[feedback.rating]++;
      totalRating += feedback.rating;
    });

    const averageRating = totalRating / this.feedbackHistory.length;

    // 改善率を計算（最新フィードバックと最初のフィードバックを比較）
    let improvementRate = 0;
    if (this.feedbackHistory.length > 1) {
      const first = this.feedbackHistory[0].rating;
      const latest = this.feedbackHistory[this.feedbackHistory.length - 1].rating;
      improvementRate = ((latest - first) / first) * 100;
    }

    return {
      averageRating,
      totalFeedback: this.feedbackHistory.length,
      ratingDistribution: distribution,
      improvementRate,
    };
  }

  /**
   * 学習サイクルを実行
   */
  executeLearningCycle(): {
    cycleId: string;
    qualityImprovement: number;
    suggestionsGenerated: number;
    gapsIdentified: number;
  } {
    const cycleId = `cycle-${Date.now()}`;

    const gaps = this.detectKnowledgeGaps();
    const suggestions = this.generateImprovementSuggestions();

    // 品質改善を計算
    let qualityImprovement = 0;
    if (this.qualityScores.length > 1) {
      const recent = this.qualityScores.slice(-5);
      const older = this.qualityScores.slice(-10, -5);

      if (older.length > 0) {
        const recentAvg = recent.reduce((sum, s) => sum + s.overallScore, 0) / recent.length;
        const olderAvg = older.reduce((sum, s) => sum + s.overallScore, 0) / older.length;
        qualityImprovement = recentAvg - olderAvg;
      }
    }

    this.evolutionMetrics.set('learningCycles', (this.evolutionMetrics.get('learningCycles') || 0) + 1);

    return {
      cycleId,
      qualityImprovement,
      suggestionsGenerated: suggestions.length,
      gapsIdentified: gaps.length,
    };
  }

  /**
   * 進化メトリクスを取得
   */
  getEvolutionMetrics(): Record<string, number> {
    const metrics = new Map(this.evolutionMetrics);

    // 最新メトリクスを更新
    metrics.set('totalFeedback', this.feedbackHistory.length);

    if (this.feedbackHistory.length > 0) {
      const avgRating = this.feedbackHistory.reduce((sum, f) => sum + f.rating, 0) / this.feedbackHistory.length;
      metrics.set('averageRating', avgRating);
    }

    if (this.qualityScores.length > 0) {
      const recentScores = this.qualityScores.slice(-10);
      const avgScore = recentScores.reduce((sum, s) => sum + s.overallScore, 0) / recentScores.length;
      metrics.set('currentQualityScore', avgScore);
    }

    metrics.set('knowledgeGapCount', this.knowledgeGaps.size);

    return Object.fromEntries(metrics);
  }

  /**
   * 学習記録を取得
   */
  getLearningRecords(limit: number = 10): LearningRecord[] {
    return Array.from(this.learningRecords.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * フィードバック履歴を取得
   */
  getFeedbackHistory(limit: number = 10): Feedback[] {
    return this.feedbackHistory.slice(-limit).reverse();
  }

  /**
   * 品質スコア履歴を取得
   */
  getQualityScoreHistory(limit: number = 10): AIQualityScore[] {
    return this.qualityScores.slice(-limit);
  }

  /**
   * 知識ギャップを取得
   */
  getKnowledgeGaps(): KnowledgeGap[] {
    return Array.from(this.knowledgeGaps.values()).sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * 改善提案を取得
   */
  getImprovementSuggestions(): ImprovementSuggestion[] {
    return this.improvementSuggestions.sort((a, b) => {
      const impactScore = { high: 3, medium: 2, low: 1 };
      return impactScore[b.impact] - impactScore[a.impact];
    });
  }

  /**
   * メトリクスを更新
   */
  private updateMetrics(): void {
    if (this.feedbackHistory.length > 0) {
      const avgRating = this.feedbackHistory.reduce((sum, f) => sum + f.rating, 0) / this.feedbackHistory.length;
      this.evolutionMetrics.set('averageRating', avgRating);
    }

    this.evolutionMetrics.set('totalFeedback', this.feedbackHistory.length);
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): {
    totalFeedback: number;
    totalLearningRecords: number;
    totalQualityScores: number;
    totalKnowledgeGaps: number;
    totalSuggestions: number;
    averageQualityScore: number;
  } {
    let avgQualityScore = 0;
    if (this.qualityScores.length > 0) {
      avgQualityScore = this.qualityScores.reduce((sum, s) => sum + s.overallScore, 0) / this.qualityScores.length;
    }

    return {
      totalFeedback: this.feedbackHistory.length,
      totalLearningRecords: this.learningRecords.size,
      totalQualityScores: this.qualityScores.length,
      totalKnowledgeGaps: this.knowledgeGaps.size,
      totalSuggestions: this.improvementSuggestions.length,
      averageQualityScore: avgQualityScore,
    };
  }

  /**
   * データをエクスポート
   */
  export(): {
    feedback: Feedback[];
    learningRecords: LearningRecord[];
    qualityScores: AIQualityScore[];
    knowledgeGaps: KnowledgeGap[];
    suggestions: ImprovementSuggestion[];
  } {
    return {
      feedback: this.feedbackHistory,
      learningRecords: Array.from(this.learningRecords.values()),
      qualityScores: this.qualityScores,
      knowledgeGaps: Array.from(this.knowledgeGaps.values()),
      suggestions: this.improvementSuggestions,
    };
  }

  /**
   * データをインポート
   */
  import(data: {
    feedback?: Feedback[];
    learningRecords?: LearningRecord[];
    qualityScores?: AIQualityScore[];
    knowledgeGaps?: KnowledgeGap[];
    suggestions?: ImprovementSuggestion[];
  }): void {
    if (data.feedback) {
      this.feedbackHistory = data.feedback;
    }
    if (data.learningRecords) {
      this.learningRecords.clear();
      data.learningRecords.forEach((record) => {
        this.learningRecords.set(record.id, record);
      });
    }
    if (data.qualityScores) {
      this.qualityScores = data.qualityScores;
    }
    if (data.knowledgeGaps) {
      this.knowledgeGaps.clear();
      data.knowledgeGaps.forEach((gap) => {
        this.knowledgeGaps.set(gap.topic, gap);
      });
    }
    if (data.suggestions) {
      this.improvementSuggestions = data.suggestions;
    }
  }

  /**
   * データをクリア
   */
  clear(): void {
    this.feedbackHistory = [];
    this.learningRecords.clear();
    this.qualityScores = [];
    this.knowledgeGaps.clear();
    this.improvementSuggestions = [];
    this.initializeMetrics();
  }
}
