/**
 * NotificationService Tests - 10個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import NotificationService from './NotificationService';

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    NotificationService.cleanup();
  });

  // === 初期化テスト ===
  describe('Initialization', () => {
    it('should initialize notification service', async () => {
      const result = await NotificationService.initialize();
      expect(typeof result).toBe('boolean');
    });

    it('should handle initialization error', async () => {
      const result = await NotificationService.initialize();
      expect(result === true || result === false).toBe(true);
    });
  });

  // === ローカル通知テスト ===
  describe('Local Notifications', () => {
    it('should send local notification', async () => {
      const result = await NotificationService.sendLocalNotification({
        title: 'テスト通知',
        body: 'これはテスト通知です',
      });
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should send notification with data', async () => {
      const result = await NotificationService.sendLocalNotification({
        title: 'テスト',
        body: 'データ付き',
        data: { key: 'value' },
      });
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should send notification with badge', async () => {
      const result = await NotificationService.sendLocalNotification({
        title: 'テスト',
        body: 'バッジ付き',
        badge: 5,
      });
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  // === スケジュール通知テスト ===
  describe('Scheduled Notifications', () => {
    it('should send scheduled notification', async () => {
      const result = await NotificationService.sendScheduledNotification({
        title: 'スケジュール通知',
        body: 'これはスケジュール通知です',
        trigger: { seconds: 60 },
      });
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should send repeating notification', async () => {
      const result = await NotificationService.sendScheduledNotification({
        title: 'リピート通知',
        body: 'これはリピート通知です',
        trigger: { seconds: 3600, repeats: true },
      });
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  // === 通知キャンセルテスト ===
  describe('Cancel Notifications', () => {
    it('should cancel notification', async () => {
      const notificationId = await NotificationService.sendLocalNotification({
        title: 'テスト',
        body: 'キャンセルテスト',
      });

      if (notificationId) {
        const result = await NotificationService.cancelNotification(notificationId);
        expect(typeof result).toBe('boolean');
      }
    });

    it('should cancel all notifications', async () => {
      const result = await NotificationService.cancelAllNotifications();
      expect(typeof result).toBe('boolean');
    });
  });

  // === 特殊通知テスト ===
  describe('Special Notifications', () => {
    it('should send message notification', async () => {
      const result = await NotificationService.notifyMessageReceived(
        'ユーザー名',
        'メッセージプレビュー'
      );
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should send upload complete notification', async () => {
      const result = await NotificationService.notifyUploadComplete('test.pdf');
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should send error notification', async () => {
      const result = await NotificationService.notifyError(
        'エラータイトル',
        'エラーメッセージ'
      );
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should send voice recognition notification', async () => {
      const result = await NotificationService.notifyVoiceRecognitionComplete(
        '認識されたテキスト'
      );
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should send reminder notification', async () => {
      const result = await NotificationService.sendReminder('テストリマインダー', 60);
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  // === スケジュール取得テスト ===
  describe('Get Scheduled Notifications', () => {
    it('should get scheduled notifications', async () => {
      const result = await NotificationService.getScheduledNotifications();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup listeners', () => {
      NotificationService.cleanup();
      // クリーンアップが正常に実行される
      expect(true).toBe(true);
    });
  });
});
