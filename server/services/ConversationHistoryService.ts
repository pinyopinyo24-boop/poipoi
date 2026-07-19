/**
 * ConversationHistoryService - 会話履歴管理サービス
 * ユーザーとポイポイの会話履歴を管理・分析
 */

import { ChatMessage, ChatSession } from '../core/ChatCoreManager';

export interface ConversationAnalysis {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  averageMessageLength: number;
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  engagementScore: number;
}

export interface ConversationSummary {
  sessionId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  timestamp: number;
}

export interface ConversationContext {
  recentMessages: ChatMessage[];
  previousTopics: string[];
  userPreferences: Record<string, any>;
  conversationFlow: string;
}

export class ConversationHistoryService {
  private conversationCache: Map<string, ChatMessage[]> = new Map();
  private summaryCache: Map<string, ConversationSummary> = new Map();

  /**
   * 会話履歴を保存
   */
  async saveConversation(sessionId: string, messages: ChatMessage[]): Promise<void> {
    this.conversationCache.set(sessionId, messages);
  }

  /**
   * 会話履歴を取得
   */
  async getConversation(sessionId: string): Promise<ChatMessage[]> {
    return this.conversationCache.get(sessionId) || [];
  }

  /**
   * 会話を分析
   */
  async analyzeConversation(messages: ChatMessage[]): Promise<ConversationAnalysis> {
    const userMessages = messages.filter((m) => m.role === 'user');
    const assistantMessages = messages.filter((m) => m.role === 'assistant');

    const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
    const averageMessageLength = messages.length > 0 ? totalLength / messages.length : 0;

    // トピックを抽出（簡易版）
    const topics = this.extractTopics(messages);

    // センチメント分析（簡易版）
    const sentiment = this.analyzeSentiment(messages);

    // エンゲージメントスコアを計算
    const engagementScore = this.calculateEngagementScore(messages);

    return {
      totalMessages: messages.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      averageMessageLength,
      topics,
      sentiment,
      engagementScore,
    };
  }

  /**
   * 会話を要約
   */
  async summarizeConversation(
    sessionId: string,
    messages: ChatMessage[],
    session: ChatSession
  ): Promise<ConversationSummary> {
    // キャッシュをチェック
    if (this.summaryCache.has(sessionId)) {
      return this.summaryCache.get(sessionId)!;
    }

    // キーポイントを抽出
    const keyPoints = this.extractKeyPoints(messages);

    // 要約を生成
    const summary = this.generateSummary(messages, keyPoints);

    const conversationSummary: ConversationSummary = {
      sessionId,
      title: session.title,
      summary,
      keyPoints,
      timestamp: Date.now(),
    };

    this.summaryCache.set(sessionId, conversationSummary);
    return conversationSummary;
  }

  /**
   * 会話コンテキストを取得
   */
  async getConversationContext(
    messages: ChatMessage[],
    limit: number = 5
  ): Promise<ConversationContext> {
    const recentMessages = messages.slice(-limit);
    const previousTopics = this.extractTopics(messages.slice(0, -limit));
    const userPreferences = this.extractUserPreferences(messages);
    const conversationFlow = this.analyzeConversationFlow(messages);

    return {
      recentMessages,
      previousTopics,
      userPreferences,
      conversationFlow,
    };
  }

  /**
   * トピックを抽出
   */
  private extractTopics(messages: ChatMessage[]): string[] {
    const topics: Set<string> = new Set();

    messages.forEach((msg) => {
      // メタデータからコンテキストを取得
      if (msg.metadata && 'context' in msg.metadata && msg.metadata.context) {
        topics.add(msg.metadata.context as string);
      }

      // メッセージ内容から主要なキーワードを抽出（簡易版）
      const keywords = this.extractKeywords(msg.content);
      keywords.forEach((k) => topics.add(k));
    });

    return Array.from(topics).slice(0, 5);
  }

  /**
   * キーワードを抽出
   */
  private extractKeywords(text: string): string[] {
    // 簡易的なキーワード抽出
    const words = text.split(/\s+/);
    const stopWords = new Set(['は', 'を', 'に', 'が', 'の', 'で', 'と', 'も', 'から', 'まで']);

    return words
      .filter((w) => w.length > 2 && !stopWords.has(w))
      .slice(0, 3);
  }

  /**
   * センチメント分析
   */
  private analyzeSentiment(
    messages: ChatMessage[]
  ): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['素晴らしい', '良い', '最高', '素敵', '嬉しい', '感謝'];
    const negativeWords = ['悪い', '最悪', '困った', '悲しい', '怒った', '不満'];

    let positiveCount = 0;
    let negativeCount = 0;

    messages.forEach((msg) => {
      positiveWords.forEach((word) => {
        if (msg.content.includes(word)) positiveCount++;
      });
      negativeWords.forEach((word) => {
        if (msg.content.includes(word)) negativeCount++;
      });
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * エンゲージメントスコアを計算
   */
  private calculateEngagementScore(messages: ChatMessage[]): number {
    if (messages.length === 0) return 0;

    // メッセージ数（最大100）
    const messageScore = Math.min(messages.length * 10, 100);

    // メッセージの長さ（最大50）
    const avgLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
    const lengthScore = Math.min((avgLength / 100) * 50, 50);

    // ユーザーとアシスタントのバランス（最大50）
    const userMessages = messages.filter((m) => m.role === 'user').length;
    const assistantMessages = messages.filter((m) => m.role === 'assistant').length;
    const balanceScore =
      userMessages > 0 && assistantMessages > 0
        ? Math.min(Math.abs(userMessages - assistantMessages) / messages.length, 1) * 50
        : 0;

    return Math.round((messageScore + lengthScore + balanceScore) / 3);
  }

  /**
   * キーポイントを抽出
   */
  private extractKeyPoints(messages: ChatMessage[]): string[] {
    const keyPoints: string[] = [];

    messages.forEach((msg) => {
      if (msg.role === 'assistant' && msg.content.length > 50) {
        // 最初の文を抽出
        const firstSentence = msg.content.split('。')[0];
        if (firstSentence.length > 10) {
          keyPoints.push(firstSentence);
        }
      }
    });

    return keyPoints.slice(0, 5);
  }

  /**
   * 要約を生成
   */
  private generateSummary(messages: ChatMessage[], keyPoints: string[]): string {
    if (messages.length === 0) {
      return '会話がまだ開始されていません';
    }

    const userMessageCount = messages.filter((m) => m.role === 'user').length;
    const assistantMessageCount = messages.filter((m) => m.role === 'assistant').length;

    let summary = `この会話では、ユーザーが${userMessageCount}個のメッセージを送信し、ポイポイが${assistantMessageCount}個の回答を提供しました。`;

    if (keyPoints.length > 0) {
      summary += `\n\n主なポイント:\n`;
      keyPoints.forEach((point, index) => {
        summary += `${index + 1}. ${point}\n`;
      });
    }

    return summary;
  }

  /**
   * ユーザーの好みを抽出
   */
  private extractUserPreferences(messages: ChatMessage[]): Record<string, any> {
    const preferences: Record<string, any> = {
      preferredContext: 'general',
      responseLength: 'medium',
      detailLevel: 'standard',
    };

    // ユーザーメッセージの平均長から応答長の好みを推測
    const userMessages = messages.filter((m) => m.role === 'user');
    if (userMessages.length > 0) {
      const avgLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length;
      if (avgLength < 50) {
        preferences.responseLength = 'short';
      } else if (avgLength > 150) {
        preferences.responseLength = 'long';
      }
    }

    // コンテキストの好みを抽出
    const contexts = messages
      .filter((m) => m.metadata && 'context' in m.metadata && m.metadata.context)
      .map((m) => (m.metadata && 'context' in m.metadata ? m.metadata.context : 'general') as string);
    if (contexts.length > 0) {
      const contextCounts = contexts.reduce(
        (acc, ctx) => {
          acc[ctx] = (acc[ctx] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      preferences.preferredContext = Object.keys(contextCounts).sort(
        (a, b) => contextCounts[b] - contextCounts[a]
      )[0];
    }

    return preferences;
  }

  /**
   * 会話フローを分析
   */
  private analyzeConversationFlow(messages: ChatMessage[]): string {
    if (messages.length === 0) {
      return '会話が開始されていません';
    }

    const userMessages = messages.filter((m) => m.role === 'user').length;
    const assistantMessages = messages.filter((m) => m.role === 'assistant').length;

    if (userMessages > assistantMessages) {
      return 'ユーザーが積極的に質問を続けている';
    } else if (assistantMessages > userMessages) {
      return 'ポイポイが詳細な情報を提供している';
    } else {
      return '自然な対話が進行している';
    }
  }

  /**
   * 会話履歴をクリア
   */
  async clearConversation(sessionId: string): Promise<void> {
    this.conversationCache.delete(sessionId);
    this.summaryCache.delete(sessionId);
  }

  /**
   * すべての会話履歴をクリア
   */
  async clearAllConversations(): Promise<void> {
    this.conversationCache.clear();
    this.summaryCache.clear();
  }

  /**
   * 会話統計を取得
   */
  async getConversationStatistics(sessionId: string): Promise<Record<string, any>> {
    const messages = await this.getConversation(sessionId);
    const analysis = await this.analyzeConversation(messages);

    return {
      sessionId,
      totalMessages: analysis.totalMessages,
      userMessages: analysis.userMessages,
      assistantMessages: analysis.assistantMessages,
      averageMessageLength: analysis.averageMessageLength,
      topics: analysis.topics,
      sentiment: analysis.sentiment,
      engagementScore: analysis.engagementScore,
      timestamp: Date.now(),
    };
  }
}

// シングルトンインスタンス
let historyServiceInstance: ConversationHistoryService | null = null;

export function getConversationHistoryService(): ConversationHistoryService {
  if (!historyServiceInstance) {
    historyServiceInstance = new ConversationHistoryService();
  }
  return historyServiceInstance;
}
