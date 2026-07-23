/**
 * ChatService - チャット処理サービス
 */

export interface ChatConfig {
  maxMessageLength: number;
  maxSessionMessages: number;
  sessionTimeout: number;
}

export class ChatService {
  private config: ChatConfig = {
    maxMessageLength: 5000,
    maxSessionMessages: 1000,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24時間
  };

  /**
   * メッセージを検証
   */
  validateMessage(message: string): { valid: boolean; error?: string } {
    if (!message || message.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (message.length > this.config.maxMessageLength) {
      return {
        valid: false,
        error: `Message exceeds maximum length of ${this.config.maxMessageLength}`,
      };
    }

    return { valid: true };
  }

  /**
   * メッセージを前処理
   */
  preprocessMessage(message: string): string {
    return message.trim();
  }

  /**
   * メッセージをトークン化
   */
  tokenizeMessage(message: string): string[] {
    return message
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 0);
  }

  /**
   * キーワードを抽出
   */
  extractKeywords(message: string): string[] {
    const tokens = this.tokenizeMessage(message);
    // 一般的なストップワードを除外
    const stopwords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
    ]);
    return tokens.filter((token) => !stopwords.has(token) && token.length > 2);
  }

  /**
   * メッセージの意図を分類
   */
  classifyIntent(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('生産') ||
      lowerMessage.includes('製造') ||
      lowerMessage.includes('工程')
    ) {
      return 'manufacturing';
    }

    if (
      lowerMessage.includes('分析') ||
      lowerMessage.includes('統計') ||
      lowerMessage.includes('データ')
    ) {
      return 'analysis';
    }

    if (
      lowerMessage.includes('提案') ||
      lowerMessage.includes('改善') ||
      lowerMessage.includes('最適化')
    ) {
      return 'improvement';
    }

    if (
      lowerMessage.includes('質問') ||
      lowerMessage.includes('教えて') ||
      lowerMessage.includes('?')
    ) {
      return 'question';
    }

    return 'general';
  }

  /**
   * セッションがタイムアウトしているかチェック
   */
  isSessionTimedOut(lastActivityTime: number): boolean {
    return Date.now() - lastActivityTime > this.config.sessionTimeout;
  }

  /**
   * メッセージ数が制限を超えているかチェック
   */
  exceedsMessageLimit(messageCount: number): boolean {
    return messageCount > this.config.maxSessionMessages;
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<ChatConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
