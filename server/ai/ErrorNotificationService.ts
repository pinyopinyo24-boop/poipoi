/**
 * Error Notification Service
 * エラー通知サービス
 */

export type NotificationChannelType = 'email' | 'slack' | 'webhook' | 'log' | 'database';
export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface ErrorNotification {
  id: string;
  timestamp: number;
  provider: string;
  errorType: string;
  message: string;
  severity: ErrorSeverity;
  stackTrace?: string;
  context?: Record<string, any>;
  channels: NotificationChannelType[];
  sent: boolean;
  sentAt?: number;
  retryCount: number;
  maxRetries: number;
}

export interface NotificationChannelConfig {
  name: NotificationChannelType;
  enabled: boolean;
  config: Record<string, any>;
}

export interface ErrorThreshold {
  provider: string;
  errorType: string;
  countThreshold: number;
  timeWindowMs: number;
  severity: ErrorSeverity;
  notificationChannels: NotificationChannelType[];
}

export interface ErrorMetrics {
  provider: string;
  totalErrors: number;
  criticalErrors: number;
  highErrors: number;
  mediumErrors: number;
  lowErrors: number;
  infoErrors: number;
  lastErrorTime?: number;
  errorRate: number;
}

/**
 * Error Notification Service
 */
export class ErrorNotificationService {
  private notifications: Map<string, ErrorNotification> = new Map();
  private channels: Map<NotificationChannelType, any> = new Map();
  private thresholds: Map<string, ErrorThreshold> = new Map();
  private metrics: Map<string, ErrorMetrics> = new Map();
  private errorHistory: ErrorNotification[] = [];
  private notificationQueue: ErrorNotification[] = [];

  constructor() {
    this.initializeChannels();
    this.initializeThresholds();
    this.startNotificationProcessor();
  }

  /**
   * 通知チャネルを初期化
   */
  private initializeChannels(): void {
    const defaultChannels: Array<{ name: NotificationChannelType; enabled: boolean; config: any }> = [
      {
        name: 'log',
        enabled: true,
        config: { level: 'error' },
      },
      {
        name: 'database',
        enabled: true,
        config: { table: 'error_notifications' },
      },
      {
        name: 'email',
        enabled: false,
        config: { recipients: [], subject: 'PoiPoi Error Alert' },
      },
      {
        name: 'slack',
        enabled: false,
        config: { webhookUrl: '', channel: '#alerts' },
      },
      {
        name: 'webhook',
        enabled: false,
        config: { url: '', timeout: 5000 },
      },
    ];

    for (const channel of defaultChannels) {
      this.channels.set(channel.name, channel);
    }
  }

  /**
   * エラー閾値を初期化
   */
  private initializeThresholds(): void {
    const defaultThresholds: ErrorThreshold[] = [
      {
        provider: 'openai',
        errorType: 'RateLimitError',
        countThreshold: 5,
        timeWindowMs: 60000,
        severity: 'high',
        notificationChannels: ['log', 'database'],
      },
      {
        provider: 'openai',
        errorType: 'AuthenticationError',
        countThreshold: 3,
        timeWindowMs: 60000,
        severity: 'critical',
        notificationChannels: ['log', 'database', 'email'],
      },
      {
        provider: 'claude',
        errorType: 'TimeoutError',
        countThreshold: 10,
        timeWindowMs: 300000,
        severity: 'medium',
        notificationChannels: ['log', 'database'],
      },
    ];

    for (const threshold of defaultThresholds) {
      const key = `${threshold.provider}:${threshold.errorType}`;
      this.thresholds.set(key, threshold);
    }
  }

  /**
   * エラーを報告
   */
  reportError(
    provider: string,
    errorType: string,
    message: string,
    severity: ErrorSeverity = 'medium',
    stackTrace?: string,
    context?: Record<string, any>
  ): ErrorNotification {
    const notification: ErrorNotification = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      provider,
      errorType,
      message,
      severity,
      stackTrace,
      context,
      channels: this.getNotificationChannels(provider, errorType, severity),
      sent: false,
      retryCount: 0,
      maxRetries: 3,
    };

    this.notifications.set(notification.id, notification);
    this.errorHistory.push(notification);
    this.notificationQueue.push(notification);

    // Update metrics
    this.updateMetrics(provider, severity);

    // Check thresholds
    this.checkThresholds(provider, errorType);

    // Keep only last 10000 errors
    if (this.errorHistory.length > 10000) {
      this.errorHistory = this.errorHistory.slice(-10000);
    }

    return notification;
  }

  /**
   * 通知チャネルを取得
   */
  private getNotificationChannels(
    provider: string,
    errorType: string,
    severity: ErrorSeverity
  ): NotificationChannelType[] {
    const key = `${provider}:${errorType}`;
    const threshold = this.thresholds.get(key);

    if (threshold) {
      return threshold.notificationChannels;
    }

    // Default channels based on severity
    switch (severity) {
      case 'critical':
        return ['log', 'database', 'email', 'webhook'];
      case 'high':
        return ['log', 'database', 'email'];
      case 'medium':
        return ['log', 'database'];
      default:
        return ['log'];
    }
  }

  /**
   * メトリクスを更新
   */
  private updateMetrics(provider: string, severity: ErrorSeverity): void {
    if (!this.metrics.has(provider)) {
      this.metrics.set(provider, {
        provider,
        totalErrors: 0,
        criticalErrors: 0,
        highErrors: 0,
        mediumErrors: 0,
        lowErrors: 0,
        infoErrors: 0,
        errorRate: 0,
      });
    }

    const metrics = this.metrics.get(provider)!;
    metrics.totalErrors++;
    metrics.lastErrorTime = Date.now();

    switch (severity) {
      case 'critical':
        metrics.criticalErrors++;
        break;
      case 'high':
        metrics.highErrors++;
        break;
      case 'medium':
        metrics.mediumErrors++;
        break;
      case 'low':
        metrics.lowErrors++;
        break;
      case 'info':
        metrics.infoErrors++;
        break;
    }

    // Calculate error rate (errors per minute)
    metrics.errorRate = metrics.totalErrors / (Date.now() / 60000);
  }

  /**
   * 閾値をチェック
   */
  private checkThresholds(provider: string, errorType: string): void {
    const key = `${provider}:${errorType}`;
    const threshold = this.thresholds.get(key);

    if (!threshold) return;

    const now = Date.now();
    const recentErrors = this.errorHistory.filter(
      e =>
        e.provider === provider &&
        e.errorType === errorType &&
        now - e.timestamp < threshold.timeWindowMs
    );

    if (recentErrors.length >= threshold.countThreshold) {
      // Threshold exceeded - escalate notification
      console.warn(
        `Error threshold exceeded for ${provider}:${errorType} (${recentErrors.length}/${threshold.countThreshold})`
      );
    }
  }

  /**
   * 通知プロセッサーを開始
   */
  private startNotificationProcessor(): void {
    setInterval(() => {
      this.processNotificationQueue();
    }, 5000); // Process every 5 seconds
  }

  /**
   * 通知キューを処理
   */
  private async processNotificationQueue(): Promise<void> {
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      if (!notification) break;

      if (notification.sent) continue;

      try {
        await this.sendNotification(notification);
        notification.sent = true;
        notification.sentAt = Date.now();
      } catch (error) {
        notification.retryCount++;

        if (notification.retryCount < notification.maxRetries) {
          // Re-queue for retry
          this.notificationQueue.push(notification);
        } else {
          console.error(`Failed to send notification ${notification.id} after ${notification.maxRetries} retries`);
        }
      }
    }
  }

  /**
   * 通知を送信
   */
  private async sendNotification(notification: ErrorNotification): Promise<void> {
    const promises: Promise<void>[] = [];

    const channels = notification.channels as NotificationChannelType[];
    for (const channel of channels) {
      const channelConfig = this.channels.get(channel);
      if (!channelConfig || !channelConfig.enabled) continue;

      promises.push(this.sendToChannel(channel, notification, channelConfig));
    }

    await Promise.all(promises);
  }

  /**
   * チャネルに送信
   */
  private async sendToChannel(
    channel: NotificationChannelType,
    notification: ErrorNotification,
    config: any
  ): Promise<void> {
    switch (channel) {
      case 'log':
        this.sendToLog(notification);
        break;
      case 'database':
        await this.sendToDatabase(notification);
        break;
      case 'email':
        await this.sendToEmail(notification, config);
        break;
      case 'slack':
        await this.sendToSlack(notification, config);
        break;
      case 'webhook':
        await this.sendToWebhook(notification, config);
        break;
    }
  }

  /**
   * ログに送信
   */
  private sendToLog(notification: ErrorNotification): void {
    const logLevel = notification.severity === 'critical' ? 'error' : 'warn';
    const logger = console as any;
    logger[logLevel](
      `[${notification.provider}] ${notification.errorType}: ${notification.message}`,
      notification.context
    );
  }

  /**
   * データベースに送信
   */
  private async sendToDatabase(notification: ErrorNotification): Promise<void> {
    // In a real implementation, this would save to database
    // For now, we just log it
    console.log(`[DB] Saved error notification: ${notification.id}`);
  }

  /**
   * メールに送信
   */
  private async sendToEmail(notification: ErrorNotification, config: any): Promise<void> {
    // In a real implementation, this would send an email
    console.log(`[EMAIL] Sent error notification to ${config.recipients.join(', ')}`);
  }

  /**
   * Slackに送信
   */
  private async sendToSlack(notification: ErrorNotification, config: any): Promise<void> {
    if (!config.webhookUrl) return;

    try {
      const payload = {
        channel: config.channel,
        text: `PoiPoi Error Alert`,
        attachments: [
          {
            color: this.getSeverityColor(notification.severity),
            title: `${notification.provider} - ${notification.errorType}`,
            text: notification.message,
            fields: [
              {
                title: 'Severity',
                value: notification.severity,
                short: true,
              },
              {
                title: 'Timestamp',
                value: new Date(notification.timestamp).toISOString(),
                short: true,
              },
            ],
          },
        ],
      };

      // In a real implementation, this would make an HTTP request
      console.log(`[SLACK] Sent notification to ${config.channel}`);
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      throw error;
    }
  }

  /**
   * Webhookに送信
   */
  private async sendToWebhook(notification: ErrorNotification, config: any): Promise<void> {
    if (!config.url) return;

    try {
      // In a real implementation, this would make an HTTP POST request
      console.log(`[WEBHOOK] Sent notification to ${config.url}`);
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
      throw error;
    }
  }

  /**
   * 重大度の色を取得
   */
  private getSeverityColor(severity: ErrorSeverity): string {
    switch (severity) {
      case 'critical':
        return '#FF0000';
      case 'high':
        return '#FF6600';
      case 'medium':
        return '#FFCC00';
      case 'low':
        return '#00CC00';
      case 'info':
        return '#0099FF';
      default:
        return '#CCCCCC';
    }
  }

  /**
   * チャネルを有効化
   */
  enableChannel(channel: NotificationChannelType, config?: Record<string, any>): void {
    const channelConfig = this.channels.get(channel);
    if (channelConfig) {
      channelConfig.enabled = true;
      if (config) {
        channelConfig.config = { ...channelConfig.config, ...config };
      }
    }
  }

  /**
   * チャネルを無効化
   */
  disableChannel(channel: NotificationChannelType): void {
    const channelConfig = this.channels.get(channel);
    if (channelConfig) {
      channelConfig.enabled = false;
    }
  }

  /**
   * 通知を取得
   */
  getNotification(id: string): ErrorNotification | null {
    return this.notifications.get(id) || null;
  }

  /**
   * 通知履歴を取得
   */
  getNotificationHistory(provider?: string, limit: number = 100): ErrorNotification[] {
    const history = provider
      ? this.errorHistory.filter(e => e.provider === provider)
      : this.errorHistory;

    return history.slice(-limit);
  }

  /**
   * メトリクスを取得
   */
  getMetrics(provider: string): ErrorMetrics | null {
    return this.metrics.get(provider) || null;
  }

  /**
   * すべてのメトリクスを取得
   */
  getAllMetrics(): ErrorMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * エラー閾値を設定
   */
  setErrorThreshold(threshold: ErrorThreshold): void {
    const key = `${threshold.provider}:${threshold.errorType}`;
    this.thresholds.set(key, threshold);
  }

  /**
   * エラー閾値を取得
   */
  getErrorThreshold(provider: string, errorType: string): ErrorThreshold | null {
    const key = `${provider}:${errorType}`;
    return this.thresholds.get(key) || null;
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): {
    totalNotifications: number;
    sentNotifications: number;
    failedNotifications: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
    averageResponseTime: number;
  } {
    const allNotifications = Array.from(this.notifications.values());
    const sent = allNotifications.filter(n => n.sent).length;
    const failed = allNotifications.filter(n => !n.sent && n.retryCount >= n.maxRetries).length;

    const critical = this.errorHistory.filter(e => e.severity === 'critical').length;
    const high = this.errorHistory.filter(e => e.severity === 'high').length;
    const medium = this.errorHistory.filter(e => e.severity === 'medium').length;
    const low = this.errorHistory.filter(e => e.severity === 'low').length;
    const info = this.errorHistory.filter(e => e.severity === 'info').length;

    const sentNotifications = allNotifications.filter(n => n.sent && n.sentAt);
    const avgResponseTime =
      sentNotifications.length > 0
        ? sentNotifications.reduce((sum, n) => sum + (n.sentAt! - n.timestamp), 0) / sentNotifications.length
        : 0;

    return {
      totalNotifications: allNotifications.length,
      sentNotifications: sent,
      failedNotifications: failed,
      criticalCount: critical,
      highCount: high,
      mediumCount: medium,
      lowCount: low,
      infoCount: info,
      averageResponseTime: avgResponseTime,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    // Clear old notifications (older than 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const keysToDelete: string[] = [];

    const entries = Array.from(this.notifications.entries());
    for (const [key, notification] of entries) {
      if (notification.timestamp < sevenDaysAgo) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.notifications.delete(key);
    }
  }
}

/**
 * グローバルエラー通知サービスインスタンス
 */
export const errorNotificationService = new ErrorNotificationService();
