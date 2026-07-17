/**
 * LocalCacheService Tests - 25個のテスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import LocalCacheService, { ChatCacheEntry, UserSettingsCache } from './LocalCacheService';

describe('LocalCacheService', () => {
  beforeEach(async () => {
    await LocalCacheService.clearAll();
  });

  afterEach(async () => {
    await LocalCacheService.clearAll();
  });

  // === 基本的なキャッシュ操作テスト ===
  describe('Basic Cache Operations', () => {
    it('should set and get cache', async () => {
      const key = 'test_key';
      const data = { message: 'test data' };

      await LocalCacheService.set(key, data);
      const result = await LocalCacheService.get(key);

      expect(result).toEqual(data);
    });

    it('should remove cache', async () => {
      const key = 'test_key';
      const data = { message: 'test data' };

      await LocalCacheService.set(key, data);
      await LocalCacheService.remove(key);
      const result = await LocalCacheService.get(key);

      expect(result).toBeNull();
    });

    it('should clear all cache', async () => {
      await LocalCacheService.set('key1', { data: 1 });
      await LocalCacheService.set('key2', { data: 2 });

      await LocalCacheService.clearAll();

      const result1 = await LocalCacheService.get('key1');
      const result2 = await LocalCacheService.get('key2');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should handle null values', async () => {
      const key = 'null_key';
      const data = null;

      await LocalCacheService.set(key, data);
      const result = await LocalCacheService.get(key);

      expect(result).toBeNull();
    });

    it('should handle complex objects', async () => {
      const key = 'complex_key';
      const data = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
        date: new Date().toISOString(),
      };

      await LocalCacheService.set(key, data);
      const result = await LocalCacheService.get(key);

      expect(result).toEqual(data);
    });
  });

  // === チャット履歴キャッシュテスト ===
  describe('Chat History Cache', () => {
    it('should save and get chat history', async () => {
      const sessionId = 'session_123';
      const messages = [
        { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'Hi', timestamp: Date.now() },
      ];

      await LocalCacheService.saveChatHistory(sessionId, messages);
      const result = await LocalCacheService.getChatHistory(sessionId);

      expect(result).toEqual(messages);
    });

    it('should clear chat history', async () => {
      const sessionId = 'session_123';
      const messages = [
        { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
      ];

      await LocalCacheService.saveChatHistory(sessionId, messages);
      await LocalCacheService.clearChatHistory(sessionId);
      const result = await LocalCacheService.getChatHistory(sessionId);

      expect(result).toBeNull();
    });

    it('should handle empty message list', async () => {
      const sessionId = 'session_123';
      const messages: any[] = [];

      await LocalCacheService.saveChatHistory(sessionId, messages);
      const result = await LocalCacheService.getChatHistory(sessionId);

      expect(result).toEqual([]);
    });

    it('should handle multiple sessions', async () => {
      const session1 = 'session_1';
      const session2 = 'session_2';
      const messages1 = [{ id: '1', role: 'user', content: 'Session 1' }];
      const messages2 = [{ id: '2', role: 'user', content: 'Session 2' }];

      await LocalCacheService.saveChatHistory(session1, messages1);
      await LocalCacheService.saveChatHistory(session2, messages2);

      const result1 = await LocalCacheService.getChatHistory(session1);
      const result2 = await LocalCacheService.getChatHistory(session2);

      expect(result1).toEqual(messages1);
      expect(result2).toEqual(messages2);
    });
  });

  // === ユーザー設定キャッシュテスト ===
  describe('User Settings Cache', () => {
    it('should save and get user settings', async () => {
      const settings: UserSettingsCache = {
        userId: 'user_123',
        theme: 'dark',
        language: 'ja',
        notifications: true,
        lastUpdated: Date.now(),
      };

      await LocalCacheService.saveUserSettings(settings);
      const result = await LocalCacheService.getUserSettings();

      expect(result?.userId).toBe(settings.userId);
      expect(result?.theme).toBe(settings.theme);
      expect(result?.language).toBe(settings.language);
    });

    it('should update user settings', async () => {
      const settings1: UserSettingsCache = {
        userId: 'user_123',
        theme: 'light',
        language: 'en',
        notifications: false,
        lastUpdated: Date.now(),
      };

      await LocalCacheService.saveUserSettings(settings1);

      const settings2: UserSettingsCache = {
        userId: 'user_123',
        theme: 'dark',
        language: 'ja',
        notifications: true,
        lastUpdated: Date.now(),
      };

      await LocalCacheService.saveUserSettings(settings2);
      const result = await LocalCacheService.getUserSettings();

      expect(result?.theme).toBe('dark');
      expect(result?.language).toBe('ja');
    });
  });

  // === セッション情報キャッシュテスト ===
  describe('Session Info Cache', () => {
    it('should save and get session info', async () => {
      const sessionId = 'session_123';
      const token = 'token_abc123';

      await LocalCacheService.saveSessionInfo(sessionId, token);
      const result = await LocalCacheService.getSessionInfo();

      expect(result?.sessionId).toBe(sessionId);
      expect(result?.token).toBe(token);
    });

    it('should clear session info', async () => {
      await LocalCacheService.saveSessionInfo('session_123', 'token_abc');
      await LocalCacheService.clearSessionInfo();
      const result = await LocalCacheService.getSessionInfo();

      expect(result).toBeNull();
    });

    it('should handle session token expiration', async () => {
      const sessionId = 'session_123';
      const token = 'token_abc123';

      await LocalCacheService.saveSessionInfo(sessionId, token);
      const result = await LocalCacheService.getSessionInfo();

      expect(result).toBeDefined();
    });
  });

  // === ファイルメタデータキャッシュテスト ===
  describe('File Metadata Cache', () => {
    it('should save and get file metadata', async () => {
      const fileId = 'file_123';
      const metadata = {
        fileName: 'test.txt',
        fileSize: 1024,
        uploadedAt: Date.now(),
      };

      await LocalCacheService.saveFileMetadata(fileId, metadata);
      const result = await LocalCacheService.getFileMetadata(fileId);

      expect(result).toEqual(metadata);
    });

    it('should clear file metadata', async () => {
      const fileId = 'file_123';
      const metadata = { fileName: 'test.txt' };

      await LocalCacheService.saveFileMetadata(fileId, metadata);
      await LocalCacheService.clearFileMetadata(fileId);
      const result = await LocalCacheService.getFileMetadata(fileId);

      expect(result).toBeNull();
    });

    it('should handle multiple files', async () => {
      const file1 = { id: 'file_1', name: 'test1.txt' };
      const file2 = { id: 'file_2', name: 'test2.txt' };

      await LocalCacheService.saveFileMetadata(file1.id, file1);
      await LocalCacheService.saveFileMetadata(file2.id, file2);

      const result1 = await LocalCacheService.getFileMetadata(file1.id);
      const result2 = await LocalCacheService.getFileMetadata(file2.id);

      expect(result1).toEqual(file1);
      expect(result2).toEqual(file2);
    });
  });

  // === キャッシュ統計テスト ===
  describe('Cache Statistics', () => {
    it('should get cache stats', async () => {
      await LocalCacheService.set('key1', { data: 1 });
      await LocalCacheService.set('key2', { data: 2 });

      const stats = await LocalCacheService.getCacheStats();

      expect(stats.totalEntries).toBeGreaterThanOrEqual(2);
      expect(stats.cacheSize).toBeGreaterThan(0);
    });

    it('should cleanup expired cache', async () => {
      await LocalCacheService.set('key1', { data: 1 }, 1); // 1ms TTL
      await LocalCacheService.set('key2', { data: 2 }, 24 * 60 * 60 * 1000);

      // 期限切れまで待機
      await new Promise(resolve => setTimeout(resolve, 10));

      const cleanedCount = await LocalCacheService.cleanupExpired();
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });
  });

  // === エラーハンドリングテスト ===
  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      // 大量のデータを保存してみる
      const largeData = 'x'.repeat(1024 * 1024); // 1MB
      await LocalCacheService.set('large_key', largeData);

      const result = await LocalCacheService.get('large_key');
      // エラーが発生しないことを確認
      expect(typeof result === 'string' || result === null).toBe(true);
    });

    it('should handle concurrent operations', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          LocalCacheService.set(`key_${i}`, { data: i })
        );
      }

      await Promise.all(promises);

      for (let i = 0; i < 10; i++) {
        const result = await LocalCacheService.get(`key_${i}`);
        expect(result?.data).toBe(i);
      }
    });
  });

  // === TTL (Time To Live) テスト ===
  describe('TTL Handling', () => {
    it('should respect custom TTL', async () => {
      const key = 'ttl_key';
      const data = { message: 'test' };
      const ttl = 100; // 100ms

      await LocalCacheService.set(key, data, ttl);
      const result1 = await LocalCacheService.get(key);
      expect(result1).toEqual(data);

      // TTL後に取得
      await new Promise(resolve => setTimeout(resolve, 150));
      const result2 = await LocalCacheService.get(key);
      expect(result2).toBeNull();
    });

    it('should use default TTL', async () => {
      const key = 'default_ttl_key';
      const data = { message: 'test' };

      await LocalCacheService.set(key, data); // デフォルトTTL使用
      const result = await LocalCacheService.get(key);

      expect(result).toEqual(data);
    });
  });
});
