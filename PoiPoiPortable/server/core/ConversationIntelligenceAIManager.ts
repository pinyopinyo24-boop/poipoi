/**
 * ConversationIntelligenceAIManager - 会話知能AI管理
 * 会話の意図理解、コンテキスト管理、応答生成
 */

import { ChatMessage } from './ChatCoreManager';

export interface ConversationIntent {
  primary: string;
  confidence: number;
  secondary: string[];
  entities: Entity[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface Entity {
  type: string;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  currentTopic: string;
  previousTopics: string[];
  userIntent: ConversationIntent;
  conversationHistory: ChatMessage[];
  contextSummary: string;
  metadata: Record<string, any>;
}

export interface ConversationSummary {
  sessionId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  topics: string[];
  sentiment: string;
  duration: number;
}

export interface TopicFlow {
  topics: string[];
  transitions: Map<string, number>;
  currentTopic: string;
  topicChangeCount: number;
}

export interface FollowUpQuestion {
  question: string;
  context: string;
  relevance: number;
  suggestedResponse: string;
}

export class ConversationIntelligenceAIManager {
  private contextCache: Map<string, ConversationContext> = new Map();
  private intentHistory: Map<string, ConversationIntent[]> = new Map();
  private topicFlows: Map<string, TopicFlow> = new Map();

  /**
   * ユーザーメッセージから意図を認識
   */
  async recognizeIntent(message: string): Promise<ConversationIntent> {
    const intent: ConversationIntent = {
      primary: this.classifyPrimaryIntent(message),
      confidence: this.calculateConfidence(message),
      secondary: this.extractSecondaryIntents(message),
      entities: this.extractEntities(message),
      sentiment: this.analyzeSentiment(message),
    };

    return intent;
  }

  /**
   * 会話コンテキストを更新
   */
  async updateContext(
    sessionId: string,
    userId: string,
    message: ChatMessage,
    previousContext?: ConversationContext
  ): Promise<ConversationContext> {
    const intent = await this.recognizeIntent(message.content);

    // 前のコンテキストから情報を継承
    const previousTopics = previousContext?.previousTopics || [];
    const currentTopic = previousContext?.currentTopic || 'general';

    // トピック遷移を追跡
    const newTopic = this.detectTopicChange(message.content, currentTopic);
    if (newTopic !== currentTopic) {
      previousTopics.push(currentTopic);
    }

    const context: ConversationContext = {
      sessionId,
      userId,
      currentTopic: newTopic,
      previousTopics: previousTopics.slice(-5), // 最新5個のトピックを保持
      userIntent: intent,
      conversationHistory: previousContext?.conversationHistory || [],
      contextSummary: this.generateContextSummary(message, intent, newTopic),
      metadata: {
        lastUpdate: Date.now(),
        messageCount: (previousContext?.conversationHistory.length || 0) + 1,
        topicChangeCount: newTopic !== currentTopic ? 1 : 0,
      },
    };

    // 会話履歴に追加
    context.conversationHistory.push(message);
    context.conversationHistory = context.conversationHistory.slice(-10); // 最新10個のメッセージを保持

    this.contextCache.set(sessionId, context);

    // 意図の履歴を記録
    if (!this.intentHistory.has(userId)) {
      this.intentHistory.set(userId, []);
    }
    this.intentHistory.get(userId)!.push(intent);

    return context;
  }

  /**
   * 会話を要約
   */
  async summarizeConversation(
    sessionId: string,
    messages: ChatMessage[]
  ): Promise<ConversationSummary> {
    if (messages.length === 0) {
      return {
        sessionId,
        title: '空の会話',
        summary: '会話がまだ開始されていません',
        keyPoints: [],
        topics: [],
        sentiment: 'neutral',
        duration: 0,
      };
    }

    // キーポイントを抽出
    const keyPoints = this.extractKeyPoints(messages);

    // トピックを抽出
    const topics = this.extractTopics(messages);

    // 全体的なセンチメントを分析
    const sentiment = this.analyzeOverallSentiment(messages);

    // 会話の継続時間を計算
    const duration =
      messages[messages.length - 1].timestamp - messages[0].timestamp;

    // タイトルを生成
    const title = this.generateTitle(topics, keyPoints);

    // 要約を生成
    const summary = this.generateSummaryText(messages, keyPoints, topics);

    return {
      sessionId,
      title,
      summary,
      keyPoints,
      topics,
      sentiment,
      duration,
    };
  }

  /**
   * トピック追跡を取得
   */
  async getTopicFlow(userId: string): Promise<TopicFlow> {
    if (!this.topicFlows.has(userId)) {
      this.topicFlows.set(userId, {
        topics: [],
        transitions: new Map(),
        currentTopic: 'general',
        topicChangeCount: 0,
      });
    }

    return this.topicFlows.get(userId)!;
  }

  /**
   * フォローアップ質問を生成
   */
  async generateFollowUpQuestions(
    context: ConversationContext,
    lastMessage: ChatMessage
  ): Promise<FollowUpQuestion[]> {
    const questions: FollowUpQuestion[] = [];

    // 現在のトピックに関連する質問を生成
    const topicQuestions = this.generateTopicRelatedQuestions(
      context.currentTopic,
      lastMessage.content
    );
    questions.push(...topicQuestions);

    // ユーザーの意図に基づいた質問を生成
    const intentQuestions = this.generateIntentBasedQuestions(
      context.userIntent,
      lastMessage.content
    );
    questions.push(...intentQuestions);

    // 関連性スコアでソート
    questions.sort((a, b) => b.relevance - a.relevance);

    return questions.slice(0, 3); // 上位3個を返す
  }

  /**
   * 会話を検証
   */
  async validateConversation(messages: ChatMessage[]): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // メッセージ数をチェック
    if (messages.length === 0) {
      issues.push('会話にメッセージがありません');
    }

    // ユーザーとアシスタントのバランスをチェック
    const userMessages = messages.filter((m) => m.role === 'user').length;
    const assistantMessages = messages.filter((m) => m.role === 'assistant').length;

    if (userMessages === 0) {
      issues.push('ユーザーメッセージがありません');
    }
    if (assistantMessages === 0) {
      issues.push('アシスタントメッセージがありません');
    }

    // メッセージの長さをチェック
    const avgLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
    if (avgLength < 5) {
      suggestions.push('メッセージがより詳細であることを推奨します');
    }

    // 会話の一貫性をチェック
    const consistency = this.checkConversationConsistency(messages);
    if (consistency < 0.5) {
      suggestions.push('会話の流れがより自然であることを推奨します');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
    };
  }

  /**
   * プライマリ意図を分類
   */
  private classifyPrimaryIntent(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('質問') ||
      lowerMessage.includes('何') ||
      lowerMessage.includes('どう')
    ) {
      return 'question';
    }
    if (
      lowerMessage.includes('助け') ||
      lowerMessage.includes('サポート') ||
      lowerMessage.includes('手伝')
    ) {
      return 'help_request';
    }
    if (
      lowerMessage.includes('情報') ||
      lowerMessage.includes('教え') ||
      lowerMessage.includes('説明')
    ) {
      return 'information_request';
    }
    if (
      lowerMessage.includes('提案') ||
      lowerMessage.includes('推奨') ||
      lowerMessage.includes('アドバイス')
    ) {
      return 'advice_request';
    }
    if (
      lowerMessage.includes('実行') ||
      lowerMessage.includes('開始') ||
      lowerMessage.includes('作成')
    ) {
      return 'action_request';
    }

    return 'general_conversation';
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(message: string): number {
    // メッセージの長さに基づいて信頼度を計算
    const lengthScore = Math.min(message.length / 100, 1.0);

    // キーワードの明確性に基づいて信頼度を計算
    const keywordScore = this.calculateKeywordClarity(message);

    return (lengthScore + keywordScore) / 2;
  }

  /**
   * セカンダリ意図を抽出
   */
  private extractSecondaryIntents(message: string): string[] {
    const intents: string[] = [];
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('緊急')) intents.push('urgent');
    if (lowerMessage.includes('重要')) intents.push('important');
    if (lowerMessage.includes('複雑')) intents.push('complex');
    if (lowerMessage.includes('簡単')) intents.push('simple');

    return intents;
  }

  /**
   * エンティティを抽出
   */
  private extractEntities(message: string): Entity[] {
    const entities: Entity[] = [];

    // 簡易的なエンティティ抽出
    const words = message.split(/\s+/);
    words.forEach((word, index) => {
      if (word.length > 3 && this.isEntity(word)) {
        entities.push({
          type: this.classifyEntityType(word),
          value: word,
          confidence: 0.8,
          startIndex: message.indexOf(word),
          endIndex: message.indexOf(word) + word.length,
        });
      }
    });

    return entities;
  }

  /**
   * センチメントを分析
   */
  private analyzeSentiment(message: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['良い', '素晴らしい', '最高', '感謝', '嬉しい'];
    const negativeWords = ['悪い', '最悪', '困った', '悲しい', '怒った'];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach((word) => {
      if (message.includes(word)) positiveCount++;
    });
    negativeWords.forEach((word) => {
      if (message.includes(word)) negativeCount++;
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * トピック変更を検出
   */
  private detectTopicChange(message: string, currentTopic: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('生産') || lowerMessage.includes('製造')) return 'manufacturing';
    if (lowerMessage.includes('クリエイティブ') || lowerMessage.includes('デザイン'))
      return 'creative';
    if (lowerMessage.includes('技術') || lowerMessage.includes('プログラミング'))
      return 'technical';
    if (lowerMessage.includes('分析') || lowerMessage.includes('統計')) return 'analysis';
    if (lowerMessage.includes('チーム') || lowerMessage.includes('協力')) return 'collaboration';

    return currentTopic;
  }

  /**
   * コンテキスト要約を生成
   */
  private generateContextSummary(
    message: ChatMessage,
    intent: ConversationIntent,
    topic: string
  ): string {
    return `トピック: ${topic}, 意図: ${intent.primary}, センチメント: ${intent.sentiment}`;
  }

  /**
   * キーポイントを抽出
   */
  private extractKeyPoints(messages: ChatMessage[]): string[] {
    const keyPoints: string[] = [];

    messages.forEach((msg) => {
      if (msg.role === 'assistant' && msg.content.length > 50) {
        const firstSentence = msg.content.split('。')[0];
        if (firstSentence.length > 10) {
          keyPoints.push(firstSentence);
        }
      }
    });

    return keyPoints.slice(0, 5);
  }

  /**
   * トピックを抽出
   */
  private extractTopics(messages: ChatMessage[]): string[] {
    const topics: Set<string> = new Set();

    messages.forEach((msg) => {
      const detected = this.detectTopicChange(msg.content, 'general');
      if (detected !== 'general') {
        topics.add(detected);
      }
    });

    return Array.from(topics);
  }

  /**
   * 全体的なセンチメントを分析
   */
  private analyzeOverallSentiment(messages: ChatMessage[]): string {
    let positiveCount = 0;
    let negativeCount = 0;

    messages.forEach((msg) => {
      const sentiment = this.analyzeSentiment(msg.content);
      if (sentiment === 'positive') positiveCount++;
      if (sentiment === 'negative') negativeCount++;
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * タイトルを生成
   */
  private generateTitle(topics: string[], keyPoints: string[]): string {
    if (topics.length > 0) {
      return `${topics[0]}に関する会話`;
    }
    if (keyPoints.length > 0) {
      return keyPoints[0].substring(0, 30);
    }
    return '一般的な会話';
  }

  /**
   * 要約テキストを生成
   */
  private generateSummaryText(
    messages: ChatMessage[],
    keyPoints: string[],
    topics: string[]
  ): string {
    let summary = `この会話では${messages.length}個のメッセージが交わされました。`;

    if (topics.length > 0) {
      summary += `\n主なトピック: ${topics.join(', ')}`;
    }

    if (keyPoints.length > 0) {
      summary += `\n\n主要なポイント:\n`;
      keyPoints.forEach((point, index) => {
        summary += `${index + 1}. ${point}\n`;
      });
    }

    return summary;
  }

  /**
   * トピック関連の質問を生成
   */
  private generateTopicRelatedQuestions(topic: string, lastMessage: string): FollowUpQuestion[] {
    const questions: FollowUpQuestion[] = [];

    if (topic === 'manufacturing') {
      questions.push({
        question: '生産効率についてもっと詳しく知りたいですか？',
        context: topic,
        relevance: 0.9,
        suggestedResponse: '生産効率の向上には複数のアプローチがあります。',
      });
    }

    if (topic === 'creative') {
      questions.push({
        question: 'デザインのトレンドについて知りたいですか？',
        context: topic,
        relevance: 0.85,
        suggestedResponse: 'クリエイティブなアプローチについて説明します。',
      });
    }

    return questions;
  }

  /**
   * 意図ベースの質問を生成
   */
  private generateIntentBasedQuestions(
    intent: ConversationIntent,
    lastMessage: string
  ): FollowUpQuestion[] {
    const questions: FollowUpQuestion[] = [];

    if (intent.primary === 'question') {
      questions.push({
        question: 'この質問についてさらに詳しく説明できますか？',
        context: 'clarification',
        relevance: 0.8,
        suggestedResponse: 'もちろんです。詳しく説明させていただきます。',
      });
    }

    if (intent.primary === 'help_request') {
      questions.push({
        question: 'どのような方法でお手伝いできますか？',
        context: 'assistance',
        relevance: 0.85,
        suggestedResponse: '複数のサポート方法があります。',
      });
    }

    return questions;
  }

  /**
   * 会話の一貫性をチェック
   */
  private checkConversationConsistency(messages: ChatMessage[]): number {
    if (messages.length < 2) return 1.0;

    let consistencyScore = 0;
    let comparisons = 0;

    for (let i = 1; i < messages.length; i++) {
      const prevMessage = messages[i - 1];
      const currentMessage = messages[i];

      // 同じユーザーが連続して話していないかチェック
      if (prevMessage.role === currentMessage.role) {
        consistencyScore -= 0.1;
      }

      comparisons++;
    }

    return Math.max(0, 1.0 + consistencyScore / comparisons);
  }

  /**
   * キーワードの明確性を計算
   */
  private calculateKeywordClarity(message: string): number {
    const keywords = ['質問', '助け', '情報', '提案', '実行'];
    let clarity = 0;

    keywords.forEach((keyword) => {
      if (message.includes(keyword)) clarity += 0.2;
    });

    return Math.min(clarity, 1.0);
  }

  /**
   * エンティティかどうかを判定
   */
  private isEntity(word: string): boolean {
    const entityPatterns = [/^[A-Z]/, /[0-9]+/];
    return entityPatterns.some((pattern) => pattern.test(word));
  }

  /**
   * エンティティタイプを分類
   */
  private classifyEntityType(word: string): string {
    if (/^[A-Z]/.test(word)) return 'proper_noun';
    if (/[0-9]+/.test(word)) return 'number';
    return 'unknown';
  }

  /**
   * コンテキストをクリア
   */
  clearContext(sessionId: string): void {
    this.contextCache.delete(sessionId);
  }

  /**
   * 統計を取得
   */
  getStatistics(): Record<string, any> {
    return {
      cachedContextsCount: this.contextCache.size,
      intentHistoryCount: this.intentHistory.size,
      topicFlowsCount: this.topicFlows.size,
    };
  }
}
