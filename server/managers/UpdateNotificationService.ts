/**
 * UpdateNotificationService - アップデート通知機能
 */

export type UpdatePriority = 'low' | 'medium' | 'high' | 'critical';
export type UpdateType = 'feature' | 'bugfix' | 'security' | 'performance';
export type NotificationStatus = 'pending' | 'sent' | 'dismissed' | 'installed';

export interface AppVersion {
  version: string;
  versionCode: number;
  releaseDate: number;
  updateType: UpdateType;
  priority: UpdatePriority;
  changelog: string;
  minOSVersion: string;
  downloadUrl: string;
  fileSize: number;
  checksum: string;
  isForced: boolean;
}

export interface UpdateNotification {
  id: string;
  userId: string;
  deviceId: string;
  version: string;
  status: NotificationStatus;
  sentAt: number;
  dismissedAt?: number;
  installedAt?: number;
  remindLaterAt?: number;
}

export class UpdateNotificationService {
  private static instance: UpdateNotificationService;
  private versions: Map<string, AppVersion> = new Map();
  private notifications: Map<string, UpdateNotification> = new Map();
  private versionCounter: number = 0;
  private notificationCounter: number = 0;

  private constructor() {
    this.initializeDefaultVersions();
  }

  static getInstance(): UpdateNotificationService {
    if (!UpdateNotificationService.instance) {
      UpdateNotificationService.instance = new UpdateNotificationService();
    }
    return UpdateNotificationService.instance;
  }

  /**
   * デフォルトバージョン初期化
   */
  private initializeDefaultVersions(): void {
    this.registerVersion({
      version: '1.0.0',
      versionCode: 1,
      releaseDate: Date.now(),
      updateType: 'feature',
      priority: 'low',
      changelog: 'Initial release',
      minOSVersion: '14.0',
      downloadUrl: 'https://example.com/app-1.0.0.apk',
      fileSize: 50000000,
      checksum: 'abc123',
      isForced: false,
    });
  }

  /**
   * バージョン登録
   */
  registerVersion(version: AppVersion): AppVersion {
    this.versions.set(version.version, version);
    return version;
  }

  /**
   * バージョン取得
   */
  getVersion(versionString: string): AppVersion | null {
    return this.versions.get(versionString) || null;
  }

  /**
   * 最新バージョン取得
   */
  getLatestVersion(): AppVersion | null {
    let latest: AppVersion | null = null;

    this.versions.forEach((version) => {
      if (!latest || version.versionCode > latest.versionCode) {
        latest = version;
      }
    });

    return latest;
  }

  /**
   * 利用可能なアップデート確認
   */
  getAvailableUpdate(currentVersion: string, minOSVersion?: string): AppVersion | null {
    const latest = this.getLatestVersion();
    if (!latest) return null;

    const currentCode = this.parseVersionCode(currentVersion);
    if (latest.versionCode <= currentCode) return null;

    if (minOSVersion && latest.minOSVersion > minOSVersion) return null;

    return latest;
  }

  /**
   * バージョンコード解析
   */
  private parseVersionCode(version: string): number {
    const parts = version.split('.').map((p) => parseInt(p, 10));
    return (parts[0] || 0) * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
  }

  /**
   * 通知送信
   */
  sendNotification(userId: string, deviceId: string, version: string): UpdateNotification {
    const id = `notif_${++this.notificationCounter}_${Date.now()}`;

    const notification: UpdateNotification = {
      id,
      userId,
      deviceId,
      version,
      status: 'pending',
      sentAt: Date.now(),
    };

    this.notifications.set(id, notification);
    return notification;
  }

  /**
   * 通知取得
   */
  getNotification(notificationId: string): UpdateNotification | null {
    return this.notifications.get(notificationId) || null;
  }

  /**
   * ユーザーの通知取得
   */
  getUserNotifications(userId: string): UpdateNotification[] {
    return Array.from(this.notifications.values()).filter((n) => n.userId === userId);
  }

  /**
   * デバイスの通知取得
   */
  getDeviceNotifications(deviceId: string): UpdateNotification[] {
    return Array.from(this.notifications.values()).filter((n) => n.deviceId === deviceId);
  }

  /**
   * 通知を却下
   */
  dismissNotification(notificationId: string): UpdateNotification | null {
    const notification = this.notifications.get(notificationId);
    if (!notification) return null;

    notification.status = 'dismissed';
    notification.dismissedAt = Date.now();
    return notification;
  }

  /**
   * 通知を後で通知
   */
  remindLater(notificationId: string, delayMs: number): UpdateNotification | null {
    const notification = this.notifications.get(notificationId);
    if (!notification) return null;

    notification.remindLaterAt = Date.now() + delayMs;
    return notification;
  }

  /**
   * インストール完了
   */
  markAsInstalled(notificationId: string): UpdateNotification | null {
    const notification = this.notifications.get(notificationId);
    if (!notification) return null;

    notification.status = 'installed';
    notification.installedAt = Date.now();
    return notification;
  }

  /**
   * 強制更新チェック
   */
  isForcedUpdate(version: string): boolean {
    const appVersion = this.getVersion(version);
    return appVersion?.isForced || false;
  }

  /**
   * 更新統計
   */
  getUpdateStatistics(): {
    totalVersions: number;
    totalNotifications: number;
    sentNotifications: number;
    dismissedNotifications: number;
    installedNotifications: number;
  } {
    const notifications = Array.from(this.notifications.values());

    return {
      totalVersions: this.versions.size,
      totalNotifications: notifications.length,
      sentNotifications: notifications.filter((n) => n.status === 'sent').length,
      dismissedNotifications: notifications.filter((n) => n.status === 'dismissed').length,
      installedNotifications: notifications.filter((n) => n.status === 'installed').length,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.versions.clear();
    this.notifications.clear();
  }
}

export const updateNotificationService = UpdateNotificationService.getInstance();
export default updateNotificationService;
