import { getDevicesByPlatform, addNotificationHistory } from "../../db.recurrence";

export interface AndroidNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
  android?: {
    priority?: "high" | "normal";
    ttl?: string;
    notification?: {
      sound?: string;
      click_action?: string;
    };
  };
}

/**
 * Android Notification Service - Manages FCM notifications for Android devices
 */
export class AndroidNotificationService {
  /**
   * Send notification to Android device via FCM
   */
  static async sendNotification(
    userId: number,
    deviceId: string,
    fcmToken: string,
    notification: AndroidNotification,
    scheduleId?: string
  ): Promise<boolean> {
    try {
      const payload = {
        message: {
          token: fcmToken,
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: notification.data || {},
          android: {
            priority: notification.android?.priority || "high",
            ttl: notification.android?.ttl || "3600s",
            notification: {
              sound: notification.android?.notification?.sound || "default",
              click_action: notification.android?.notification?.click_action || "FLUTTER_NOTIFICATION_CLICK",
            },
          },
        },
      };

      // Call FCM API (Firebase Cloud Messaging)
      const response = await fetch("https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.FCM_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("[AndroidNotificationService] FCM error:", error);
        await addNotificationHistory(userId, scheduleId || null, "push", "failed", error);
        return false;
      }

      const result = await response.json();
      await addNotificationHistory(userId, scheduleId || null, "push", "sent", result);
      return true;
    } catch (error) {
      console.error("[AndroidNotificationService] Error sending notification:", error);
      await addNotificationHistory(userId, scheduleId || null, "push", "failed", { error: String(error) });
      return false;
    }
  }

  /**
   * Send batch notifications to all Android devices
   */
  static async sendBatchNotifications(
    userId: number,
    notification: AndroidNotification,
    scheduleId?: string
  ): Promise<{ sent: number; failed: number }> {
    try {
      const devices = await getDevicesByPlatform(userId, "android");

      if (!devices || devices.length === 0) {
        console.warn("[AndroidNotificationService] No Android devices found for user:", userId);
        return { sent: 0, failed: 0 };
      }

      let sent = 0;
      let failed = 0;

      for (const device of devices) {
        const success = await this.sendNotification(
          userId,
          device.deviceId,
          device.fcmToken,
          notification,
          scheduleId
        );
        if (success) {
          sent++;
        } else {
          failed++;
        }
      }

      return { sent, failed };
    } catch (error) {
      console.error("[AndroidNotificationService] Error sending batch notifications:", error);
      return { sent: 0, failed: 0 };
    }
  }

  /**
   * Send reminder notification
   */
  static async sendReminderNotification(
    userId: number,
    scheduleTitle: string,
    scheduleId: string,
    minutesBefore: number = 15
  ): Promise<{ sent: number; failed: number }> {
    const notification: AndroidNotification = {
      title: "予定のリマインダー",
      body: `${scheduleTitle} が ${minutesBefore} 分後に始まります`,
      data: {
        scheduleId,
        type: "reminder",
        minutesBefore: String(minutesBefore),
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
        },
      },
    };

    return await this.sendBatchNotifications(userId, notification, scheduleId);
  }

  /**
   * Send priority alert notification
   */
  static async sendPriorityAlertNotification(
    userId: number,
    scheduleTitle: string,
    priority: "critical" | "high" | "medium" | "low",
    scheduleId: string
  ): Promise<{ sent: number; failed: number }> {
    const priorityLabels: Record<string, string> = {
      critical: "🔴 緊急",
      high: "🟠 高優先度",
      medium: "🟡 中優先度",
      low: "🟢 低優先度",
    };

    const notification: AndroidNotification = {
      title: `${priorityLabels[priority]} - ${scheduleTitle}`,
      body: "優先度の高い予定があります",
      data: {
        scheduleId,
        type: "priority_alert",
        priority,
      },
      android: {
        priority: priority === "critical" || priority === "high" ? "high" : "normal",
        notification: {
          sound: priority === "critical" ? "default" : undefined,
        },
      },
    };

    return await this.sendBatchNotifications(userId, notification, scheduleId);
  }

  /**
   * Send daily summary notification
   */
  static async sendDailySummaryNotification(
    userId: number,
    summary: string,
    scheduleCount: number
  ): Promise<{ sent: number; failed: number }> {
    const notification: AndroidNotification = {
      title: "📅 本日のスケジュール",
      body: `${scheduleCount} 件の予定があります。${summary}`,
      data: {
        type: "daily_summary",
        scheduleCount: String(scheduleCount),
      },
      android: {
        priority: "normal",
      },
    };

    return await this.sendBatchNotifications(userId, notification);
  }

  /**
   * Send test notification
   */
  static async sendTestNotification(userId: number, deviceId: string, fcmToken: string): Promise<boolean> {
    const notification: AndroidNotification = {
      title: "PoiPoi テスト通知",
      body: "通知が正常に受信されました",
      data: {
        type: "test",
      },
    };

    return await this.sendNotification(userId, deviceId, fcmToken, notification);
  }
}
