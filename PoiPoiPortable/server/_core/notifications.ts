import { getDb } from '../db';
import { notifications, users } from '../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'ai-event';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationSettings {
  userId: string;
  inAppNotifications: boolean;
  emailNotifications: boolean;
  aiEventNotifications: boolean;
  trainingNotifications: boolean;
  collaborationNotifications: boolean;
  apiTestNotifications: boolean;
}

/**
 * 通知を作成する
 */
export async function createNotification(payload: NotificationPayload): Promise<any> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const result = await db.insert(notifications).values({
      id: uuidv4(),
      userId: parseInt(payload.userId),
      title: payload.title,
      message: payload.message,
      type: payload.type,
      actionUrl: payload.actionUrl,
      metadata: payload.metadata as any,
      read: false,
    });
    return result;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

/**
 * ユーザーの通知を取得する
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, parseInt(userId)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
    return userNotifications;
  } catch (error) {
    console.error('Failed to get user notifications:', error);
    throw error;
  }
}

/**
 * 未読通知を取得する
 */
export async function getUnreadNotifications(userId: string): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const unreadNotifications = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, parseInt(userId)), eq(notifications.read, false)))
      .orderBy(desc(notifications.createdAt));
    return unreadNotifications;
  } catch (error) {
    console.error('Failed to get unread notifications:', error);
    throw error;
  }
}

/**
 * 通知を既読にする
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId));
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}

/**
 * 複数の通知を既読にする
 */
export async function markNotificationsAsRead(notificationIds: string[]): Promise<void> {
  try {
    if (notificationIds.length === 0) return;
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    for (const id of notificationIds) {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, id));
    }
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
    throw error;
  }
}

/**
 * 通知を削除する
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    await db
      .delete(notifications)
      .where(eq(notifications.id, notificationId));
  } catch (error) {
    console.error('Failed to delete notification:', error);
    throw error;
  }
}

/**
 * ユーザーの通知設定を取得する
 */
export async function getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(userId)))
      .limit(1);
    
    if (user.length === 0) return null;

    const userData = user[0];
    const metadata = (userData as any).metadata ? JSON.parse((userData as any).metadata as string) : {};

    return {
      userId,
      inAppNotifications: metadata.inAppNotifications !== false,
      emailNotifications: metadata.emailNotifications === true,
      aiEventNotifications: metadata.aiEventNotifications !== false,
      trainingNotifications: metadata.trainingNotifications !== false,
      collaborationNotifications: metadata.collaborationNotifications !== false,
      apiTestNotifications: metadata.apiTestNotifications !== false,
    };
  } catch (error) {
    console.error('Failed to get notification settings:', error);
    throw error;
  }
}

/**
 * ユーザーの通知設定を更新する
 */
export async function updateNotificationSettings(
  userId: string,
  settings: Partial<NotificationSettings>
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(userId)))
      .limit(1);
    
    if (user.length === 0) throw new Error('User not found');

    const userData = user[0];
    const metadata = (userData as any).metadata ? JSON.parse((userData as any).metadata as string) : {};

    const updatedMetadata = {
      ...metadata,
      inAppNotifications: settings.inAppNotifications ?? metadata.inAppNotifications ?? true,
      emailNotifications: settings.emailNotifications ?? metadata.emailNotifications ?? false,
      aiEventNotifications: settings.aiEventNotifications ?? metadata.aiEventNotifications ?? true,
      trainingNotifications: settings.trainingNotifications ?? metadata.trainingNotifications ?? true,
      collaborationNotifications: settings.collaborationNotifications ?? metadata.collaborationNotifications ?? true,
      apiTestNotifications: settings.apiTestNotifications ?? metadata.apiTestNotifications ?? true,
    };

    await db
      .update(users)
      .set({ metadata: JSON.stringify(updatedMetadata) as any })
      .where(eq(users.id, parseInt(userId)));
  } catch (error) {
    console.error('Failed to update notification settings:', error);
    throw error;
  }
}

/**
 * 通知統計を取得する
 */
export async function getNotificationStats(userId: string): Promise<{
  total: number;
  unread: number;
  byType: Record<string, number>;
}> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const allNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, parseInt(userId)));

    const unreadNotifications = allNotifications.filter((n: any) => !n.read);
    
    const byType: Record<string, number> = {};
    allNotifications.forEach((n: any) => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });

    return {
      total: allNotifications.length,
      unread: unreadNotifications.length,
      byType,
    };
  } catch (error) {
    console.error('Failed to get notification stats:', error);
    throw error;
  }
}

/**
 * 古い通知を削除する（30日以上前）
 */
export async function cleanupOldNotifications(daysOld: number = 30): Promise<number> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const allNotifications = await db
      .select()
      .from(notifications);
    
    let deletedCount = 0;
    for (const notification of allNotifications) {
      const notifDate = new Date(notification.createdAt as any);
      if (notifDate < cutoffDate) {
        await db
          .delete(notifications)
          .where(eq(notifications.id, notification.id));
        deletedCount++;
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('Failed to cleanup old notifications:', error);
    throw error;
  }
}

/**
 * AIイベント通知を送信する
 */
export async function notifyAIEvent(
  userId: string,
  eventType: string,
  eventData: Record<string, any>
): Promise<void> {
  try {
    const settings = await getNotificationSettings(userId);
    if (!settings?.aiEventNotifications) return;

    const title = `AI ${eventType} 完了`;
    const message = eventData.message || `${eventType}処理が完了しました`;

    await createNotification({
      userId,
      title,
      message,
      type: 'ai-event',
      actionUrl: eventData.actionUrl,
      metadata: eventData,
    });
  } catch (error) {
    console.error('Failed to notify AI event:', error);
  }
}

/**
 * トレーニング完了通知を送信する
 */
export async function notifyTrainingComplete(
  userId: string,
  modelName: string,
  accuracy: number
): Promise<void> {
  try {
    const settings = await getNotificationSettings(userId);
    if (!settings?.trainingNotifications) return;

    await createNotification({
      userId,
      title: 'モデルトレーニング完了',
      message: `${modelName} のトレーニングが完了しました。精度: ${(accuracy * 100).toFixed(2)}%`,
      type: 'success',
      metadata: { modelName, accuracy },
    });
  } catch (error) {
    console.error('Failed to notify training complete:', error);
  }
}

/**
 * コラボレーション通知を送信する
 */
export async function notifyCollaborationEvent(
  userId: string,
  eventType: string,
  collaboratorName: string,
  documentName: string
): Promise<void> {
  try {
    const settings = await getNotificationSettings(userId);
    if (!settings?.collaborationNotifications) return;

    let message = '';
    if (eventType === 'invited') {
      message = `${collaboratorName} があなたを ${documentName} に招待しました`;
    } else if (eventType === 'joined') {
      message = `${collaboratorName} が ${documentName} に参加しました`;
    } else if (eventType === 'edited') {
      message = `${collaboratorName} が ${documentName} を編集しました`;
    }

    await createNotification({
      userId,
      title: 'コラボレーション通知',
      message,
      type: 'info',
      metadata: { eventType, collaboratorName, documentName },
    });
  } catch (error) {
    console.error('Failed to notify collaboration event:', error);
  }
}

/**
 * API テスト結果通知を送信する
 */
export async function notifyAPITestResult(
  userId: string,
  apiName: string,
  success: boolean,
  message: string
): Promise<void> {
  try {
    const settings = await getNotificationSettings(userId);
    if (!settings?.apiTestNotifications) return;

    await createNotification({
      userId,
      title: `API テスト: ${apiName}`,
      message,
      type: success ? 'success' : 'error',
      metadata: { apiName, success },
    });
  } catch (error) {
    console.error('Failed to notify API test result:', error);
  }
}
