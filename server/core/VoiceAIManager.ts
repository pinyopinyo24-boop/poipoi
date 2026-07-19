/**
 * VoiceAIManager - 音声AIアシスタント管理
 * 音声入出力、会話管理、ノイズ処理
 */

export interface VoiceSession {
  id: string;
  userId: string;
  startTime: number;
  endTime?: number;
  language: string;
  status: 'active' | 'paused' | 'ended';
}

export interface VoiceMessage {
  id: string;
  sessionId: string;
  type: 'user' | 'assistant';
  audioUrl?: string;
  text: string;
  confidence: number;
  timestamp: number;
  duration?: number;
}

export interface VoiceCommand {
  id: string;
  text: string;
  intent: string;
  parameters: Record<string, unknown>;
  confidence: number;
  timestamp: number;
}

export interface AudioMetrics {
  duration: number;
  sampleRate: number;
  channels: number;
  bitRate: number;
  noiseLevel: number;
  clarity: number;
}

export class VoiceAIManager {
  private sessions: Map<string, VoiceSession> = new Map();
  private messages: VoiceMessage[] = [];
  private commands: VoiceCommand[] = [];
  private audioMetrics: Map<string, AudioMetrics> = new Map();
  private voicePreferences: Map<string, Record<string, unknown>> = new Map();
  private conversationHistory: Map<string, VoiceMessage[]> = new Map();

  /**
   * 音声セッションを作成
   */
  createSession(userId: string, language: string = 'ja'): string {
    const id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const session: VoiceSession = {
      id,
      userId,
      startTime: Date.now(),
      language,
      status: 'active',
    };

    this.sessions.set(id, session);
    this.conversationHistory.set(id, []);
    return id;
  }

  /**
   * セッションを終了
   */
  endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = Date.now();
      session.status = 'ended';
      return true;
    }
    return false;
  }

  /**
   * セッションを取得
   */
  getSession(sessionId: string): VoiceSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 音声メッセージを記録
   */
  recordVoiceMessage(
    sessionId: string,
    type: 'user' | 'assistant',
    text: string,
    confidence: number = 0.95,
    audioUrl?: string,
    duration?: number
  ): string {
    const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const message: VoiceMessage = {
      id,
      sessionId,
      type,
      audioUrl,
      text,
      confidence,
      timestamp: Date.now(),
      duration,
    };

    this.messages.push(message);

    const history = this.conversationHistory.get(sessionId) || [];
    history.push(message);
    this.conversationHistory.set(sessionId, history);

    return id;
  }

  /**
   * 音声コマンドを解析
   */
  parseVoiceCommand(text: string): VoiceCommand {
    const id = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 簡単なコマンド解析
    let intent = 'unknown';
    const parameters: Record<string, unknown> = {};
    let confidence = 0.8;

    if (text.includes('製造')) {
      intent = 'manufacturing';
      confidence = 0.9;
    } else if (text.includes('品質')) {
      intent = 'quality';
      confidence = 0.9;
    } else if (text.includes('原価')) {
      intent = 'cost';
      confidence = 0.85;
    } else if (text.includes('在庫')) {
      intent = 'inventory';
      confidence = 0.85;
    } else if (text.includes('改善')) {
      intent = 'improvement';
      confidence = 0.9;
    } else if (text.includes('検索')) {
      intent = 'search';
      confidence = 0.85;
    } else if (text.includes('報告')) {
      intent = 'report';
      confidence = 0.85;
    }

    const command: VoiceCommand = {
      id,
      text,
      intent,
      parameters,
      confidence,
      timestamp: Date.now(),
    };

    this.commands.push(command);
    return command;
  }

  /**
   * 音声会話履歴を取得
   */
  getConversationHistory(sessionId: string, limit: number = 10): VoiceMessage[] {
    const history = this.conversationHistory.get(sessionId) || [];
    return history.slice(-limit);
  }

  /**
   * 音声品質メトリクスを記録
   */
  recordAudioMetrics(
    sessionId: string,
    metrics: Omit<AudioMetrics, 'clarity'>
  ): void {
    // 音声品質スコアを計算 (0-100)
    let clarity = 100;
    clarity -= Math.min(metrics.noiseLevel * 10, 30);
    clarity = Math.max(clarity, 0);

    const fullMetrics: AudioMetrics = {
      ...metrics,
      clarity,
    };

    this.audioMetrics.set(sessionId, fullMetrics);
  }

  /**
   * 音声品質メトリクスを取得
   */
  getAudioMetrics(sessionId: string): AudioMetrics | undefined {
    return this.audioMetrics.get(sessionId);
  }

  /**
   * ユーザーの音声設定を保存
   */
  setVoicePreference(userId: string, preferences: Record<string, unknown>): void {
    this.voicePreferences.set(userId, preferences);
  }

  /**
   * ユーザーの音声設定を取得
   */
  getVoicePreference(userId: string): Record<string, unknown> | undefined {
    return this.voicePreferences.get(userId);
  }

  /**
   * ノイズレベルを分析
   */
  analyzeNoiseLevel(audioData: number[]): number {
    if (audioData.length === 0) return 0;

    const mean = audioData.reduce((a, b) => a + b, 0) / audioData.length;
    const variance =
      audioData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / audioData.length;
    const stdDev = Math.sqrt(variance);

    // ノイズレベルを0-1の範囲に正規化
    return Math.min(stdDev / 100, 1);
  }

  /**
   * 音声コマンドの実行可能性を検証
   */
  validateVoiceCommand(command: VoiceCommand): {
    valid: boolean;
    reason?: string;
  } {
    if (command.confidence < 0.7) {
      return { valid: false, reason: 'Low confidence score' };
    }

    if (command.intent === 'unknown') {
      return { valid: false, reason: 'Unknown intent' };
    }

    return { valid: true };
  }

  /**
   * 音声セッション統計を取得
   */
  getSessionStatistics(sessionId: string): {
    duration: number;
    messageCount: number;
    userMessages: number;
    assistantMessages: number;
    averageConfidence: number;
    commandCount: number;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        duration: 0,
        messageCount: 0,
        userMessages: 0,
        assistantMessages: 0,
        averageConfidence: 0,
        commandCount: 0,
      };
    }

    const messages = this.conversationHistory.get(sessionId) || [];
    const userMessages = messages.filter((m) => m.type === 'user').length;
    const assistantMessages = messages.filter((m) => m.type === 'assistant').length;
    const avgConfidence =
      messages.length > 0
        ? messages.reduce((sum, m) => sum + m.confidence, 0) / messages.length
        : 0;

    const sessionCommands = this.commands.filter(
      (c) => c.timestamp >= session.startTime && (!session.endTime || c.timestamp <= session.endTime)
    );

    const duration = (session.endTime || Date.now()) - session.startTime;

    return {
      duration,
      messageCount: messages.length,
      userMessages,
      assistantMessages,
      averageConfidence: avgConfidence,
      commandCount: sessionCommands.length,
    };
  }

  /**
   * 音声認識精度を計算
   */
  calculateRecognitionAccuracy(): number {
    if (this.messages.length === 0) return 0;

    const totalConfidence = this.messages.reduce((sum, m) => sum + m.confidence, 0);
    return totalConfidence / this.messages.length;
  }

  /**
   * 音声コマンド履歴を取得
   */
  getCommandHistory(limit: number = 10): VoiceCommand[] {
    return this.commands.slice(-limit).reverse();
  }

  /**
   * インテント別コマンド統計
   */
  getIntentStatistics(): Record<string, number> {
    const stats: Record<string, number> = {};

    this.commands.forEach((cmd) => {
      stats[cmd.intent] = (stats[cmd.intent] || 0) + 1;
    });

    return stats;
  }

  /**
   * 音声セッション一覧を取得
   */
  getActiveSessions(): VoiceSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.status === 'active');
  }

  /**
   * 音声メッセージ一覧を取得
   */
  getVoiceMessages(sessionId: string, limit: number = 20): VoiceMessage[] {
    return this.messages
      .filter((m) => m.sessionId === sessionId)
      .slice(-limit)
      .reverse();
  }

  /**
   * 音声レポートを生成
   */
  generateVoiceReport(sessionId: string): {
    sessionId: string;
    duration: number;
    messageCount: number;
    accuracy: number;
    commandCount: number;
    topIntents: string[];
    recommendations: string[];
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        sessionId,
        duration: 0,
        messageCount: 0,
        accuracy: 0,
        commandCount: 0,
        topIntents: [],
        recommendations: [],
      };
    }

    const stats = this.getSessionStatistics(sessionId);
    const accuracy = this.calculateRecognitionAccuracy();
    const intentStats = this.getIntentStatistics();
    const topIntents = Object.entries(intentStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((e) => e[0]);

    const recommendations: string[] = [];

    if (accuracy < 0.8) {
      recommendations.push('Improve audio quality or speak more clearly');
    }

    if (stats.messageCount === 0) {
      recommendations.push('No messages recorded in session');
    }

    if (stats.commandCount === 0) {
      recommendations.push('No commands executed in session');
    }

    return {
      sessionId,
      duration: stats.duration,
      messageCount: stats.messageCount,
      accuracy,
      commandCount: stats.commandCount,
      topIntents,
      recommendations,
    };
  }

  /**
   * データをエクスポート
   */
  export(): {
    sessions: VoiceSession[];
    messages: VoiceMessage[];
    commands: VoiceCommand[];
  } {
    return {
      sessions: Array.from(this.sessions.values()),
      messages: this.messages,
      commands: this.commands,
    };
  }

  /**
   * データをインポート
   */
  import(data: {
    sessions?: VoiceSession[];
    messages?: VoiceMessage[];
    commands?: VoiceCommand[];
  }): void {
    if (data.sessions) {
      this.sessions.clear();
      data.sessions.forEach((s) => this.sessions.set(s.id, s));
    }

    if (data.messages) {
      this.messages = data.messages;
    }

    if (data.commands) {
      this.commands = data.commands;
    }
  }

  /**
   * データをクリア
   */
  clear(): void {
    this.sessions.clear();
    this.messages = [];
    this.commands = [];
    this.audioMetrics.clear();
    this.voicePreferences.clear();
    this.conversationHistory.clear();
  }
}
