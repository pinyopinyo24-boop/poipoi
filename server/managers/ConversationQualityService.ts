/**
 * ConversationQualityService
 * 会話品質・文脈維持・意図理解・継続率管理
 */

export interface ConversationQuality {
  qualityId: string;
  conversationId: string;
  timestamp: number;
  contextMaintenance: number; // 0-100
  intentUnderstanding: number; // 0-100
  coherence: number; // 0-100
  continuationRate: number; // 0-100
  overallScore: number; // 0-100
}

export interface ContextAnalysis {
  analysisId: string;
  conversationId: string;
  timestamp: number;
  contextDepth: number; // 0-10
  contextRelevance: number; // 0-100
  contextLoss: number; // 0-100
  status: 'maintained' | 'degrading' | 'lost';
}

export interface IntentAnalysis {
  analysisId: string;
  conversationId: string;
  timestamp: number;
  userIntentClarity: number; // 0-100
  intentRecognitionAccuracy: number; // 0-100
  intentAlignment: number; // 0-100
  status: 'clear' | 'ambiguous' | 'unclear';
}

export class ConversationQualityService {
  private qualities: Map<string, ConversationQuality> = new Map();
  private contextAnalyses: Map<string, ContextAnalysis> = new Map();
  private intentAnalyses: Map<string, IntentAnalysis> = new Map();
  private qualitiesByConversation: Map<string, string[]> = new Map();
  private contextByConversation: Map<string, string[]> = new Map();
  private intentByConversation: Map<string, string[]> = new Map();

  /**
   * 会話品質を記録
   */
  recordConversationQuality(
    conversationId: string,
    contextMaintenance: number,
    intentUnderstanding: number,
    coherence: number,
    continuationRate: number
  ): ConversationQuality {
    const qualityId = `CQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const overallScore = (contextMaintenance + intentUnderstanding + coherence + continuationRate) / 4;

    const quality: ConversationQuality = {
      qualityId,
      conversationId,
      timestamp: Date.now(),
      contextMaintenance,
      intentUnderstanding,
      coherence,
      continuationRate,
      overallScore,
    };

    this.qualities.set(qualityId, quality);

    if (!this.qualitiesByConversation.has(conversationId)) {
      this.qualitiesByConversation.set(conversationId, []);
    }
    this.qualitiesByConversation.get(conversationId)!.push(qualityId);

    return quality;
  }

  /**
   * 会話品質を取得
   */
  getConversationQuality(qualityId: string): ConversationQuality | undefined {
    return this.qualities.get(qualityId);
  }

  /**
   * 会話別品質を取得
   */
  getQualitiesByConversation(conversationId: string): ConversationQuality[] {
    const ids = this.qualitiesByConversation.get(conversationId) || [];
    return ids
      .map(id => this.qualities.get(id))
      .filter((q): q is ConversationQuality => q !== undefined);
  }

  /**
   * 文脈分析を実行
   */
  analyzeContext(
    conversationId: string,
    contextDepth: number,
    contextRelevance: number,
    contextLoss: number
  ): ContextAnalysis {
    const analysisId = `CA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let status: 'maintained' | 'degrading' | 'lost' = 'maintained';
    if (contextLoss > 50) {
      status = 'lost';
    } else if (contextLoss > 25) {
      status = 'degrading';
    }

    const analysis: ContextAnalysis = {
      analysisId,
      conversationId,
      timestamp: Date.now(),
      contextDepth,
      contextRelevance,
      contextLoss,
      status,
    };

    this.contextAnalyses.set(analysisId, analysis);

    if (!this.contextByConversation.has(conversationId)) {
      this.contextByConversation.set(conversationId, []);
    }
    this.contextByConversation.get(conversationId)!.push(analysisId);

    return analysis;
  }

  /**
   * 文脈分析を取得
   */
  getContextAnalysis(analysisId: string): ContextAnalysis | undefined {
    return this.contextAnalyses.get(analysisId);
  }

  /**
   * 会話別文脈分析を取得
   */
  getContextAnalysesByConversation(conversationId: string): ContextAnalysis[] {
    const ids = this.contextByConversation.get(conversationId) || [];
    return ids
      .map(id => this.contextAnalyses.get(id))
      .filter((a): a is ContextAnalysis => a !== undefined);
  }

  /**
   * 意図分析を実行
   */
  analyzeIntent(
    conversationId: string,
    userIntentClarity: number,
    intentRecognitionAccuracy: number,
    intentAlignment: number
  ): IntentAnalysis {
    const analysisId = `IA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let status: 'clear' | 'ambiguous' | 'unclear' = 'clear';
    if (userIntentClarity < 40) {
      status = 'unclear';
    } else if (userIntentClarity < 70) {
      status = 'ambiguous';
    }

    const analysis: IntentAnalysis = {
      analysisId,
      conversationId,
      timestamp: Date.now(),
      userIntentClarity,
      intentRecognitionAccuracy,
      intentAlignment,
      status,
    };

    this.intentAnalyses.set(analysisId, analysis);

    if (!this.intentByConversation.has(conversationId)) {
      this.intentByConversation.set(conversationId, []);
    }
    this.intentByConversation.get(conversationId)!.push(analysisId);

    return analysis;
  }

  /**
   * 意図分析を取得
   */
  getIntentAnalysis(analysisId: string): IntentAnalysis | undefined {
    return this.intentAnalyses.get(analysisId);
  }

  /**
   * 会話別意図分析を取得
   */
  getIntentAnalysesByConversation(conversationId: string): IntentAnalysis[] {
    const ids = this.intentByConversation.get(conversationId) || [];
    return ids
      .map(id => this.intentAnalyses.get(id))
      .filter((a): a is IntentAnalysis => a !== undefined);
  }

  /**
   * 全会話品質を取得
   */
  getAllQualitiesRecords(): ConversationQuality[] {
    return Array.from(this.qualities.values());
  }

  /**
   * 全文脈分析を取得
   */
  getAllContextAnalyses(): ContextAnalysis[] {
    return Array.from(this.contextAnalyses.values());
  }

  /**
   * 全意図分析を取得
   */
  getAllIntentAnalyses(): IntentAnalysis[] {
    return Array.from(this.intentAnalyses.values());
  }

  /**
   * 会話品質統計を計算
   */
  getConversationStats(): {
    totalQualityRecords: number;
    averageContextMaintenance: number;
    averageIntentUnderstanding: number;
    averageCoherence: number;
    averageContinuationRate: number;
    totalContextAnalyses: number;
    maintainedContexts: number;
    totalIntentAnalyses: number;
    clearIntents: number;
  } {
    const allQualities = Array.from(this.qualities.values());
    const allContexts = Array.from(this.contextAnalyses.values());
    const allIntents = Array.from(this.intentAnalyses.values());

    let totalContext = 0;
    let totalIntent = 0;
    let totalCoherence = 0;
    let totalContinuation = 0;

    for (const quality of allQualities) {
      totalContext += quality.contextMaintenance;
      totalIntent += quality.intentUnderstanding;
      totalCoherence += quality.coherence;
      totalContinuation += quality.continuationRate;
    }

    return {
      totalQualityRecords: allQualities.length,
      averageContextMaintenance: allQualities.length > 0 ? totalContext / allQualities.length : 0,
      averageIntentUnderstanding: allQualities.length > 0 ? totalIntent / allQualities.length : 0,
      averageCoherence: allQualities.length > 0 ? totalCoherence / allQualities.length : 0,
      averageContinuationRate: allQualities.length > 0 ? totalContinuation / allQualities.length : 0,
      totalContextAnalyses: allContexts.length,
      maintainedContexts: allContexts.filter(c => c.status === 'maintained').length,
      totalIntentAnalyses: allIntents.length,
      clearIntents: allIntents.filter(i => i.status === 'clear').length,
    };
  }

  /**
   * 品質を削除
   */
  deleteQuality(qualityId: string): boolean {
    const quality = this.qualities.get(qualityId);
    if (!quality) return false;

    const conversationIds = this.qualitiesByConversation.get(quality.conversationId) || [];
    const index = conversationIds.indexOf(qualityId);
    if (index > -1) {
      conversationIds.splice(index, 1);
    }

    this.qualities.delete(qualityId);
    return true;
  }

  /**
   * 文脈分析を削除
   */
  deleteContextAnalysis(analysisId: string): boolean {
    const analysis = this.contextAnalyses.get(analysisId);
    if (!analysis) return false;

    const conversationIds = this.contextByConversation.get(analysis.conversationId) || [];
    const index = conversationIds.indexOf(analysisId);
    if (index > -1) {
      conversationIds.splice(index, 1);
    }

    this.contextAnalyses.delete(analysisId);
    return true;
  }

  /**
   * 意図分析を削除
   */
  deleteIntentAnalysis(analysisId: string): boolean {
    const analysis = this.intentAnalyses.get(analysisId);
    if (!analysis) return false;

    const conversationIds = this.intentByConversation.get(analysis.conversationId) || [];
    const index = conversationIds.indexOf(analysisId);
    if (index > -1) {
      conversationIds.splice(index, 1);
    }

    this.intentAnalyses.delete(analysisId);
    return true;
  }
}
