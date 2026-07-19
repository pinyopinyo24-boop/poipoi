/**
 * PersonalizationAIManager - 個人化AI管理
 * ユーザー行動学習、個人化推奨、適応型体験提供
 */

export interface UserProfile {
  userId: string;
  preferences: UserPreferences;
  behaviorPatterns: BehaviorPattern[];
  interactionHistory: Interaction[];
  learningScore: number;
  lastUpdated: number;
}

export interface UserPreferences {
  responseLength: 'short' | 'medium' | 'long';
  communicationStyle: 'formal' | 'casual' | 'technical';
  topics: string[];
  languages: string[];
  timezone: string;
  notificationPreference: 'high' | 'medium' | 'low';
}

export interface BehaviorPattern {
  pattern: string;
  frequency: number;
  lastOccurred: number;
  confidence: number;
  context: string;
}

export interface Interaction {
  id: string;
  timestamp: number;
  type: string;
  topic: string;
  duration: number;
  satisfaction: number;
  outcome: 'success' | 'partial' | 'failure';
}

export interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  relevance: number;
  reasoning: string;
  suggestedAction: string;
}

export interface PersonalizationSettings {
  userId: string;
  adaptiveUI: boolean;
  contentFiltering: boolean;
  autoSuggestions: boolean;
  learningMode: 'active' | 'passive' | 'disabled';
  privacyLevel: 'high' | 'medium' | 'low';
}

export class PersonalizationAIManager {
  private userProfiles: Map<string, UserProfile> = new Map();
  private recommendations: Map<string, Recommendation[]> = new Map();
  private settings: Map<string, PersonalizationSettings> = new Map();
  private behaviorCache: Map<string, BehaviorPattern[]> = new Map();

  /**
   * ユーザープロファイルを初期化
   */
  async initializeUserProfile(userId: string): Promise<UserProfile> {
    const profile: UserProfile = {
      userId,
      preferences: {
        responseLength: 'medium',
        communicationStyle: 'casual',
        topics: [],
        languages: ['ja'],
        timezone: 'Asia/Tokyo',
        notificationPreference: 'medium',
      },
      behaviorPatterns: [],
      interactionHistory: [],
      learningScore: 0,
      lastUpdated: Date.now(),
    };

    this.userProfiles.set(userId, profile);

    // デフォルト設定を作成
    this.settings.set(userId, {
      userId,
      adaptiveUI: true,
      contentFiltering: true,
      autoSuggestions: true,
      learningMode: 'active',
      privacyLevel: 'medium',
    });

    return profile;
  }

  /**
   * ユーザーの行動を記録
   */
  async recordInteraction(
    userId: string,
    interaction: Omit<Interaction, 'id'>
  ): Promise<Interaction> {
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = await this.initializeUserProfile(userId);
    }

    const fullInteraction: Interaction = {
      id: `interaction-${Date.now()}-${Math.random()}`,
      ...interaction,
    };

    profile.interactionHistory.push(fullInteraction);
    profile.interactionHistory = profile.interactionHistory.slice(-100); // 最新100個を保持

    // 行動パターンを更新
    await this.updateBehaviorPatterns(userId, fullInteraction);

    // 学習スコアを更新
    profile.learningScore = this.calculateLearningScore(profile);
    profile.lastUpdated = Date.now();

    return fullInteraction;
  }

  /**
   * 行動パターンを更新
   */
  private async updateBehaviorPatterns(
    userId: string,
    interaction: Interaction
  ): Promise<void> {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;

    // 既存のパターンを検索
    const existingPattern = profile.behaviorPatterns.find(
      (p) => p.pattern === interaction.type && p.context === interaction.topic
    );

    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastOccurred = interaction.timestamp;
      existingPattern.confidence = Math.min(
        1.0,
        existingPattern.confidence + 0.05
      );
    } else {
      profile.behaviorPatterns.push({
        pattern: interaction.type,
        frequency: 1,
        lastOccurred: interaction.timestamp,
        confidence: 0.5,
        context: interaction.topic,
      });
    }

    // 信頼度でソート
    profile.behaviorPatterns.sort((a, b) => b.confidence - a.confidence);
    profile.behaviorPatterns = profile.behaviorPatterns.slice(0, 20); // 上位20個を保持
  }

  /**
   * 推奨を生成
   */
  async generateRecommendations(userId: string): Promise<Recommendation[]> {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      return [];
    }

    const recommendations: Recommendation[] = [];

    // 行動パターンに基づいた推奨
    profile.behaviorPatterns.forEach((pattern, index) => {
      if (pattern.confidence > 0.6) {
        recommendations.push({
          id: `rec-${Date.now()}-${index}`,
          type: 'behavior_based',
          title: `${pattern.context}に関する推奨`,
          description: `あなたの行動パターンから、${pattern.context}についてのコンテンツをお勧めします`,
          relevance: pattern.confidence,
          reasoning: `このトピックについて${pattern.frequency}回のインタラクションがあります`,
          suggestedAction: `${pattern.context}の詳細を確認`,
        });
      }
    });

    // ユーザープリファレンスに基づいた推奨
    if (profile.preferences.topics.length > 0) {
      profile.preferences.topics.forEach((topic, index) => {
        recommendations.push({
          id: `rec-${Date.now()}-topic-${index}`,
          type: 'preference_based',
          title: `${topic}に関する新しい情報`,
          description: `あなたが興味のある${topic}についての最新情報です`,
          relevance: 0.8,
          reasoning: `あなたのプリファレンスに一致しています`,
          suggestedAction: `${topic}の詳細を確認`,
        });
      });
    }

    // 関連性でソート
    recommendations.sort((a, b) => b.relevance - a.relevance);

    // 上位5個を返す
    const topRecommendations = recommendations.slice(0, 5);
    this.recommendations.set(userId, topRecommendations);

    return topRecommendations;
  }

  /**
   * ユーザープリファレンスを更新
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserProfile | null> {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      return null;
    }

    profile.preferences = {
      ...profile.preferences,
      ...preferences,
    };

    profile.lastUpdated = Date.now();

    return profile;
  }

  /**
   * 個人化設定を更新
   */
  async updatePersonalizationSettings(
    userId: string,
    settings: Partial<PersonalizationSettings>
  ): Promise<PersonalizationSettings | null> {
    let userSettings = this.settings.get(userId);
    if (!userSettings) {
      userSettings = {
        userId,
        adaptiveUI: true,
        contentFiltering: true,
        autoSuggestions: true,
        learningMode: 'active',
        privacyLevel: 'medium',
      };
    }

    const updated = {
      ...userSettings,
      ...settings,
    };

    this.settings.set(userId, updated);

    return updated;
  }

  /**
   * ユーザープロファイルを取得
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * 推奨を取得
   */
  async getRecommendations(userId: string): Promise<Recommendation[]> {
    return this.recommendations.get(userId) || [];
  }

  /**
   * 個人化設定を取得
   */
  async getPersonalizationSettings(userId: string): Promise<PersonalizationSettings | null> {
    return this.settings.get(userId) || null;
  }

  /**
   * 行動パターンを分析
   */
  async analyzeBehaviorPatterns(userId: string): Promise<{
    topPatterns: BehaviorPattern[];
    insights: string[];
    recommendations: string[];
  }> {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      return {
        topPatterns: [],
        insights: [],
        recommendations: [],
      };
    }

    const topPatterns = profile.behaviorPatterns.slice(0, 5);
    const insights = this.generateInsights(profile);
    const recommendations = this.generateBehaviorRecommendations(profile);

    return {
      topPatterns,
      insights,
      recommendations,
    };
  }

  /**
   * インサイトを生成
   */
  private generateInsights(profile: UserProfile): string[] {
    const insights: string[] = [];

    if (profile.behaviorPatterns.length === 0) {
      insights.push('まだ行動パターンが分析されていません');
      return insights;
    }

    const topPattern = profile.behaviorPatterns[0];
    insights.push(
      `あなたの最も一般的な行動は「${topPattern.pattern}」です（信頼度: ${(topPattern.confidence * 100).toFixed(0)}%）`
    );

    if (profile.interactionHistory.length > 0) {
      const successRate =
        (profile.interactionHistory.filter((i) => i.outcome === 'success').length /
          profile.interactionHistory.length) *
        100;
      insights.push(`成功率: ${successRate.toFixed(0)}%`);
    }

    if (profile.preferences.responseLength) {
      insights.push(
        `推奨される応答長: ${profile.preferences.responseLength}`
      );
    }

    return insights;
  }

  /**
   * 行動推奨を生成
   */
  private generateBehaviorRecommendations(profile: UserProfile): string[] {
    const recommendations: string[] = [];

    if (profile.interactionHistory.length < 5) {
      recommendations.push('より多くのインタラクションを記録してください');
    }

    if (profile.behaviorPatterns.length > 0) {
      const lowConfidencePatterns = profile.behaviorPatterns.filter(
        (p) => p.confidence < 0.5
      );
      if (lowConfidencePatterns.length > 0) {
        recommendations.push('パターン認識の精度を向上させるために、より多くのデータが必要です');
      }
    }

    if (profile.preferences.topics.length === 0) {
      recommendations.push('興味のあるトピックを設定してください');
    }

    return recommendations;
  }

  /**
   * 学習スコアを計算
   */
  private calculateLearningScore(profile: UserProfile): number {
    let score = 0;

    // インタラクション数に基づくスコア
    score += Math.min(profile.interactionHistory.length * 2, 30);

    // 行動パターン数に基づくスコア
    score += Math.min(profile.behaviorPatterns.length * 5, 30);

    // パターン信頼度に基づくスコア
    const avgConfidence =
      profile.behaviorPatterns.length > 0
        ? profile.behaviorPatterns.reduce((sum, p) => sum + p.confidence, 0) /
          profile.behaviorPatterns.length
        : 0;
    score += avgConfidence * 40;

    return Math.min(score, 100);
  }

  /**
   * 適応型UIの推奨を取得
   */
  async getAdaptiveUIRecommendations(userId: string): Promise<Record<string, any>> {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      return {};
    }

    const settings = this.settings.get(userId);
    if (!settings || !settings.adaptiveUI) {
      return {};
    }

    return {
      layout: this.recommendLayout(profile),
      colorScheme: this.recommendColorScheme(profile),
      fontSize: this.recommendFontSize(profile),
      contentDensity: this.recommendContentDensity(profile),
    };
  }

  /**
   * レイアウトを推奨
   */
  private recommendLayout(profile: UserProfile): string {
    if (profile.behaviorPatterns.length > 5) {
      return 'compact';
    }
    return 'standard';
  }

  /**
   * カラースキームを推奨
   */
  private recommendColorScheme(profile: UserProfile): string {
    const avgSatisfaction =
      profile.interactionHistory.length > 0
        ? profile.interactionHistory.reduce((sum, i) => sum + i.satisfaction, 0) /
          profile.interactionHistory.length
        : 0.5;

    return avgSatisfaction > 0.7 ? 'light' : 'dark';
  }

  /**
   * フォントサイズを推奨
   */
  private recommendFontSize(profile: UserProfile): string {
    if (profile.preferences.responseLength === 'long') {
      return 'small';
    }
    if (profile.preferences.responseLength === 'short') {
      return 'large';
    }
    return 'medium';
  }

  /**
   * コンテンツ密度を推奨
   */
  private recommendContentDensity(profile: UserProfile): string {
    if (profile.preferences.communicationStyle === 'technical') {
      return 'high';
    }
    if (profile.preferences.communicationStyle === 'casual') {
      return 'low';
    }
    return 'medium';
  }

  /**
   * ユーザープロファイルをクリア
   */
  async clearUserProfile(userId: string): Promise<void> {
    this.userProfiles.delete(userId);
    this.recommendations.delete(userId);
    this.settings.delete(userId);
    this.behaviorCache.delete(userId);
  }

  /**
   * 統計を取得
   */
  getStatistics(): Record<string, any> {
    return {
      totalUsers: this.userProfiles.size,
      totalRecommendations: Array.from(this.recommendations.values()).reduce(
        (sum, recs) => sum + recs.length,
        0
      ),
      totalInteractions: Array.from(this.userProfiles.values()).reduce(
        (sum, profile) => sum + profile.interactionHistory.length,
        0
      ),
      avgLearningScore:
        this.userProfiles.size > 0
          ? Array.from(this.userProfiles.values()).reduce(
              (sum, profile) => sum + profile.learningScore,
              0
            ) / this.userProfiles.size
          : 0,
    };
  }

  /**
   * 複数ユーザーの推奨を一括生成
   */
  async generateRecommendationsForAllUsers(): Promise<Map<string, Recommendation[]>> {
    const allRecommendations = new Map<string, Recommendation[]>();

    const userIds = Array.from(this.userProfiles.keys());
    for (const userId of userIds) {
      const recs = await this.generateRecommendations(userId);
      allRecommendations.set(userId, recs);
    }

    return allRecommendations;
  }

  /**
   * ユーザー満足度を計算
   */
  async calculateUserSatisfaction(userId: string): Promise<number> {
    const profile = this.userProfiles.get(userId);
    if (!profile || profile.interactionHistory.length === 0) {
      return 0;
    }

    const avgSatisfaction =
      profile.interactionHistory.reduce((sum, i) => sum + i.satisfaction, 0) /
      profile.interactionHistory.length;

    return avgSatisfaction;
  }

  /**
   * ユーザーセグメンテーション
   */
  async segmentUsers(): Promise<{
    highEngagement: string[];
    mediumEngagement: string[];
    lowEngagement: string[];
  }> {
    const segments = {
      highEngagement: [] as string[],
      mediumEngagement: [] as string[],
      lowEngagement: [] as string[],
    };

    const entries = Array.from(this.userProfiles.entries());
    for (const [userId, profile] of entries) {
      if (profile.learningScore > 70) {
        segments.highEngagement.push(userId);
      } else if (profile.learningScore > 40) {
        segments.mediumEngagement.push(userId);
      } else {
        segments.lowEngagement.push(userId);
      }
    }

    return segments;
  }
}
