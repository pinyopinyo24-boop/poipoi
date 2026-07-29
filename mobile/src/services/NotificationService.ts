/**
 * NotificationService - Mobile Notification Management
 * 
 * 機能:
 * - Push Notification管理
 * - Local Notification管理
 * - 通知権限管理
 * - 通知スケジューリング
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: boolean;
  badge?: number;
}

export interface ScheduledNotification extends NotificationPayload {
  trigger: {
    seconds?: number;
    repeats?: boolean;
  };
}

export class NotificationService {
  private static initialized = false;
  private static notificationListener: any;
  private static responseListener: any;

  /**
   * 初期化
   */
  static async initialize(): Promise<boolean> {
    try {
      if (this.initialized) {
        return true;
      }

      // 権限リクエスト
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }

      // 通知ハンドラー設定
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // リスナー登録
      this.registerListeners();

      // Android チャネル設定
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * リスナー登録
   */
  private static registerListeners(): void {
    // 通知受信時
    this.notificationListener = Notifications.addNotificationReceivedListener(
      notification => {
        if (__DEV__) console.log('Notification received:', notification);
      }
    );

    // 通知タップ時
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      response => {
        if (__DEV__) console.log('Notification response:', response);
      }
    );
  }

  /**
   * ローカル通知を送信
   */
  static async sendLocalNotification(
    notification: NotificationPayload
  ): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: notification.sound !== false ? 'default' : undefined,
          badge: notification.badge,
        },
        trigger: { seconds: 1 },
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to send local notification:', error);
      return null;
    }
  }

  /**
   * スケジュール通知を送信
   */
  static async sendScheduledNotification(
    notification: ScheduledNotification
  ): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: notification.sound !== false ? 'default' : undefined,
          badge: notification.badge,
        },
        trigger: {
          seconds: notification.trigger.seconds || 60,
          repeats: notification.trigger.repeats || false,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to send scheduled notification:', error);
      return null;
    }
  }

  /**
   * 通知をキャンセル
   */
  static async cancelNotification(notificationId: string): Promise<boolean> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      return true;
    } catch (error) {
      console.error('Failed to cancel notification:', error);
      return false;
    }
  }

  /**
   * すべての通知をキャンセル
   */
  static async cancelAllNotifications(): Promise<boolean> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return true;
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
      return false;
    }
  }

  /**
   * スケジュール済み通知一覧を取得
   */
  static async getScheduledNotifications(): Promise<any[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  /**
   * メッセージ受信通知
   */
  static async notifyMessageReceived(
    senderName: string,
    messagePreview: string
  ): Promise<string | null> {
    return this.sendLocalNotification({
      title: `新しいメッセージ: ${senderName}`,
      body: messagePreview,
      data: {
        type: 'message',
        sender: senderName,
      },
      sound: true,
      badge: 1,
    });
  }

  /**
   * アップロード完了通知
   */
  static async notifyUploadComplete(
    fileName: string
  ): Promise<string | null> {
    return this.sendLocalNotification({
      title: 'ファイルアップロード完了',
      body: `${fileName} がアップロードされました`,
      data: {
        type: 'upload',
        fileName,
      },
      sound: true,
    });
  }

  /**
   * エラー通知
   */
  static async notifyError(
    errorTitle: string,
    errorMessage: string
  ): Promise<string | null> {
    return this.sendLocalNotification({
      title: `エラー: ${errorTitle}`,
      body: errorMessage,
      data: {
        type: 'error',
      },
      sound: true,
    });
  }

  /**
   * 音声認識完了通知
   */
  static async notifyVoiceRecognitionComplete(
    recognizedText: string
  ): Promise<string | null> {
    return this.sendLocalNotification({
      title: '音声認識完了',
      body: recognizedText.substring(0, 50),
      data: {
        type: 'voice_recognition',
        text: recognizedText,
      },
      sound: true,
    });
  }

  /**
   * リマインダー通知
   */
  static async sendReminder(
    title: string,
    delaySeconds: number = 60
  ): Promise<string | null> {
    return this.sendScheduledNotification({
      title: 'リマインダー',
      body: title,
      data: {
        type: 'reminder',
      },
      sound: true,
      trigger: {
        seconds: delaySeconds,
        repeats: false,
      },
    });
  }

  /**
   * クリーンアップ
   */
  static cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export default NotificationService;
