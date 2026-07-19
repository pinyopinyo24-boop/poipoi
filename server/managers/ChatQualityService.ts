/**
 * ChatQualityService
 * チャット品質管理・応答品質評価・会話分析
 */

export interface ChatQualityMetric {
  metricId: string;
  timestamp: number;
  messageId: string;
  userId: string;
  responseTime: number;
  relevanceScore: number;
  clarityScore: number;
  helpfulnessScore: number;
  userSatisfaction: number;
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface ConversationAnalysis {
  analysisId: string;
  timestamp: number;
  conversationId: string;
  messageCount: number;
  averageResponseTime: number;
  contextMaintenance: number;
  topicCoherence: number;
  userEngagement: number;
  overallScore: number;
}

export interface ChatIssue {
  issueId: string;
  timestamp: number;
  messageId: string;
  issueType: 'slow_response' | 'irrelevant' | 'unclear' | 'unhelpful' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolved: boolean;
}

export class ChatQualityService {
  private metrics: Map<string, ChatQualityMetric> = new Map();
  private analyses: Map<string, ConversationAnalysis> = new Map();
  private issues: Map<string, ChatIssue> = new Map();
  private metricsByUser: Map<string, string[]> = new Map();
  private issuesByType: Map<string, string[]> = new Map();

  /**
   * チャット品質メトリクスを記録
   */
  recordChatQualityMetric(
    messageId: string,
    userId: string,
    responseTime: number,
    relevanceScore: number,
    clarityScore: number,
    helpfulnessScore: number,
    userSatisfaction: number
  ): ChatQualityMetric {
    const metricId = `CQM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const overallQuality = this.calculateOverallQuality(relevanceScore, clarityScore, helpfulnessScore);

    const metric: ChatQualityMetric = {
      metricId,
      timestamp: Date.now(),
      messageId,
      userId,
      responseTime,
      relevanceScore,
      clarityScore,
      helpfulnessScore,
      userSatisfaction,
      overallQuality,
    };

    this.metrics.set(metricId, metric);

    if (!this.metricsByUser.has(userId)) {
      this.metricsByUser.set(userId, []);
    }
    this.metricsByUser.get(userId)!.push(metricId);

    return metric;
  }

  /**
   * チャット品質メトリクスを取得
   */
  getChatQualityMetric(metricId: string): ChatQualityMetric | undefined {
    return this.metrics.get(metricId);
  }

  /**
   * ユーザー別メトリクスを取得
   */
  getMetricsByUser(userId: string): ChatQualityMetric[] {
    const ids = this.metricsByUser.get(userId) || [];
    return ids
      .map(id => this.metrics.get(id))
      .filter((m): m is ChatQualityMetric => m !== undefined);
  }

  /**
   * 会話分析を記録
   */
  recordConversationAnalysis(
    conversationId: string,
    messageCount: number,
    averageResponseTime: number,
    contextMaintenance: number,
    topicCoherence: number,
    userEngagement: number
  ): ConversationAnalysis {
    const analysisId = `CA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const overallScore = (contextMaintenance + topicCoherence + userEngagement) / 3;

    const analysis: ConversationAnalysis = {
      analysisId,
      timestamp: Date.now(),
      conversationId,
      messageCount,
      averageResponseTime,
      contextMaintenance,
      topicCoherence,
      userEngagement,
      overallScore,
    };

    this.analyses.set(analysisId, analysis);
    return analysis;
  }

  /**
   * 会話分析を取得
   */
  getConversationAnalysis(analysisId: string): ConversationAnalysis | undefined {
    return this.analyses.get(analysisId);
  }

  /**
   * チャット問題を報告
   */
  reportChatIssue(
    messageId: string,
    issueType: 'slow_response' | 'irrelevant' | 'unclear' | 'unhelpful' | 'error',
    description: string
  ): ChatIssue {
    const issueId = `CI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (issueType === 'error') severity = 'critical';
    else if (issueType === 'slow_response') severity = 'high';
    else if (issueType === 'irrelevant') severity = 'high';

    const issue: ChatIssue = {
      issueId,
      timestamp: Date.now(),
      messageId,
      issueType,
      severity,
      description,
      resolved: false,
    };

    this.issues.set(issueId, issue);

    if (!this.issuesByType.has(issueType)) {
      this.issuesByType.set(issueType, []);
    }
    this.issuesByType.get(issueType)!.push(issueId);

    return issue;
  }

  /**
   * チャット問題を取得
   */
  getChatIssue(issueId: string): ChatIssue | undefined {
    return this.issues.get(issueId);
  }

  /**
   * 問題タイプ別に取得
   */
  getIssuesByType(issueType: string): ChatIssue[] {
    const ids = this.issuesByType.get(issueType) || [];
    return ids
      .map(id => this.issues.get(id))
      .filter((i): i is ChatIssue => i !== undefined);
  }

  /**
   * 問題を解決
   */
  resolveIssue(issueId: string): ChatIssue | undefined {
    const issue = this.issues.get(issueId);
    if (issue) {
      issue.resolved = true;
    }
    return issue;
  }

  /**
   * 全チャット品質メトリクスを取得
   */
  getAllChatQualityMetrics(): ChatQualityMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * 全会話分析を取得
   */
  getAllConversationAnalyses(): ConversationAnalysis[] {
    return Array.from(this.analyses.values());
  }

  /**
   * 全チャット問題を取得
   */
  getAllChatIssues(): ChatIssue[] {
    return Array.from(this.issues.values());
  }

  /**
   * チャット品質統計を計算
   */
  getChatQualityStats(): {
    totalMetrics: number;
    totalAnalyses: number;
    totalIssues: number;
    excellentCount: number;
    goodCount: number;
    fairCount: number;
    poorCount: number;
    averageResponseTime: number;
    averageUserSatisfaction: number;
    unresolvedIssues: number;
  } {
    const allMetrics = Array.from(this.metrics.values());
    const allAnalyses = Array.from(this.analyses.values());
    const allIssues = Array.from(this.issues.values());

    const excellentCount = allMetrics.filter(m => m.overallQuality === 'excellent').length;
    const goodCount = allMetrics.filter(m => m.overallQuality === 'good').length;
    const fairCount = allMetrics.filter(m => m.overallQuality === 'fair').length;
    const poorCount = allMetrics.filter(m => m.overallQuality === 'poor').length;

    const averageResponseTime = allMetrics.length > 0 ? allMetrics.reduce((sum, m) => sum + m.responseTime, 0) / allMetrics.length : 0;
    const averageUserSatisfaction = allMetrics.length > 0 ? allMetrics.reduce((sum, m) => sum + m.userSatisfaction, 0) / allMetrics.length : 0;
    const unresolvedIssues = allIssues.filter(i => !i.resolved).length;

    return {
      totalMetrics: allMetrics.length,
      totalAnalyses: allAnalyses.length,
      totalIssues: allIssues.length,
      excellentCount,
      goodCount,
      fairCount,
      poorCount,
      averageResponseTime,
      averageUserSatisfaction,
      unresolvedIssues,
    };
  }

  /**
   * 低品質メッセージを取得
   */
  getLowQualityMessages(threshold: number = 60): ChatQualityMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.userSatisfaction < threshold);
  }

  /**
   * 高速応答メッセージを取得
   */
  getFastResponseMessages(threshold: number = 1000): ChatQualityMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.responseTime < threshold);
  }

  /**
   * チャット品質メトリクスを削除
   */
  deleteChatQualityMetric(metricId: string): boolean {
    const metric = this.metrics.get(metricId);
    if (!metric) return false;

    const userIds = this.metricsByUser.get(metric.userId) || [];
    const index = userIds.indexOf(metricId);
    if (index > -1) userIds.splice(index, 1);

    this.metrics.delete(metricId);
    return true;
  }

  /**
   * チャット問題を削除
   */
  deleteChatIssue(issueId: string): boolean {
    const issue = this.issues.get(issueId);
    if (!issue) return false;

    const typeIds = this.issuesByType.get(issue.issueType) || [];
    const index = typeIds.indexOf(issueId);
    if (index > -1) typeIds.splice(index, 1);

    this.issues.delete(issueId);
    return true;
  }

  /**
   * 全体品質を計算
   */
  private calculateOverallQuality(relevance: number, clarity: number, helpfulness: number): 'excellent' | 'good' | 'fair' | 'poor' {
    const average = (relevance + clarity + helpfulness) / 3;
    if (average >= 85) return 'excellent';
    if (average >= 70) return 'good';
    if (average >= 55) return 'fair';
    return 'poor';
  }
}
