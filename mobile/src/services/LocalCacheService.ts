/**
 * LocalCacheService - モバイルアプリのローカルキャッシュ管理
 * 
 * 機能:
 * - チャット履歴キャッシュ
 * - ユーザー設定キャッシュ
 * - ファイルメタデータキャッシュ
 * - セッション情報キャッシュ
 * - キャッシュの有効期限管理
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // ミリ秒
}

export interface ChatCacheEntry {
  sessionId: string;
  messages: any[];
  lastUpdated: number;
}

export interface UserSettingsCache {
  userId: string;
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
  lastUpdated: number;
}

export class LocalCacheService {
  private static readonly CACHE_PREFIX = 'poipoi_cache_';
  private static readonly CHAT_HISTORY_PREFIX = 'chat_history_';
  private static readonly USER_SETTINGS_KEY = 'user_settings';
  private static readonly SESSION_INFO_KEY = 'session_info';
  private static readonly FILE_METADATA_PREFIX = 'file_metadata_';

  /**
   * キャッシュに保存
   */
  static async set<T>(key: string, data: T, ttl: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      await AsyncStorage.setItem(
        `${this.CACHE_PREFIX}${key}`,
        JSON.stringify(entry)
      );
    } catch (error) {
      console.error(`Failed to cache ${key}:`, error);
    }
  }

  /**
   * キャッシュから取得
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const item = await AsyncStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      const now = Date.now();

      // 有効期限チェック
      if (now - entry.timestamp > entry.ttl) {
        await this.remove(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error(`Failed to retrieve cache ${key}:`, error);
      return null;
    }
  }

  /**
   * キャッシュから削除
   */
  static async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
    } catch (error) {
      console.error(`Failed to remove cache ${key}:`, error);
    }
  }

  /**
   * すべてのキャッシュをクリア
   */
  static async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Failed to clear all cache:', error);
    }
  }

  /**
   * チャット履歴をキャッシュに保存
   */
  static async saveChatHistory(
    sessionId: string,
    messages: any[],
    ttl: number = 7 * 24 * 60 * 60 * 1000 // 7日
  ): Promise<void> {
    try {
      const entry: ChatCacheEntry = {
        sessionId,
        messages,
        lastUpdated: Date.now(),
      };
      await this.set(
        `${this.CHAT_HISTORY_PREFIX}${sessionId}`,
        entry,
        ttl
      );
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }

  /**
   * チャット履歴をキャッシュから取得
   */
  static async getChatHistory(sessionId: string): Promise<any[] | null> {
    try {
      const entry = await this.get<ChatCacheEntry>(
        `${this.CHAT_HISTORY_PREFIX}${sessionId}`
      );
      return entry?.messages || null;
    } catch (error) {
      console.error('Failed to get chat history:', error);
      return null;
    }
  }

  /**
   * チャット履歴をクリア
   */
  static async clearChatHistory(sessionId: string): Promise<void> {
    try {
      await this.remove(`${this.CHAT_HISTORY_PREFIX}${sessionId}`);
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  }

  /**
   * ユーザー設定をキャッシュに保存
   */
  static async saveUserSettings(settings: UserSettingsCache): Promise<void> {
    try {
      const entry: UserSettingsCache = {
        ...settings,
        lastUpdated: Date.now(),
      };
      await this.set(this.USER_SETTINGS_KEY, entry, 30 * 24 * 60 * 60 * 1000); // 30日
    } catch (error) {
      console.error('Failed to save user settings:', error);
    }
  }

  /**
   * ユーザー設定をキャッシュから取得
   */
  static async getUserSettings(): Promise<UserSettingsCache | null> {
    try {
      return await this.get<UserSettingsCache>(this.USER_SETTINGS_KEY);
    } catch (error) {
      console.error('Failed to get user settings:', error);
      return null;
    }
  }

  /**
   * セッション情報をキャッシュに保存
   */
  static async saveSessionInfo(sessionId: string, token: string): Promise<void> {
    try {
      await this.set(
        this.SESSION_INFO_KEY,
        { sessionId, token, createdAt: Date.now() },
        24 * 60 * 60 * 1000 // 24時間
      );
    } catch (error) {
      console.error('Failed to save session info:', error);
    }
  }

  /**
   * セッション情報をキャッシュから取得
   */
  static async getSessionInfo(): Promise<{ sessionId: string; token: string } | null> {
    try {
      return await this.get<{ sessionId: string; token: string }>(
        this.SESSION_INFO_KEY
      );
    } catch (error) {
      console.error('Failed to get session info:', error);
      return null;
    }
  }

  /**
   * セッション情報をクリア
   */
  static async clearSessionInfo(): Promise<void> {
    try {
      await this.remove(this.SESSION_INFO_KEY);
    } catch (error) {
      console.error('Failed to clear session info:', error);
    }
  }

  /**
   * ファイルメタデータをキャッシュに保存
   */
  static async saveFileMetadata(fileId: string, metadata: any): Promise<void> {
    try {
      await this.set(
        `${this.FILE_METADATA_PREFIX}${fileId}`,
        metadata,
        7 * 24 * 60 * 60 * 1000 // 7日
      );
    } catch (error) {
      console.error('Failed to save file metadata:', error);
    }
  }

  /**
   * ファイルメタデータをキャッシュから取得
   */
  static async getFileMetadata(fileId: string): Promise<any | null> {
    try {
      return await this.get(`${this.FILE_METADATA_PREFIX}${fileId}`);
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      return null;
    }
  }

  /**
   * ファイルメタデータをクリア
   */
  static async clearFileMetadata(fileId: string): Promise<void> {
    try {
      await this.remove(`${this.FILE_METADATA_PREFIX}${fileId}`);
    } catch (error) {
      console.error('Failed to clear file metadata:', error);
    }
  }

  /**
   * キャッシュの統計情報を取得
   */
  static async getCacheStats(): Promise<{
    totalEntries: number;
    cacheSize: number;
    expiredEntries: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let totalSize = 0;
      let expiredCount = 0;

      for (const key of cacheKeys) {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          totalSize += item.length;
          
          try {
            const entry = JSON.parse(item);
            const now = Date.now();
            if (now - entry.timestamp > entry.ttl) {
              expiredCount++;
            }
          } catch (e) {
            // パース失敗
          }
        }
      }

      return {
        totalEntries: cacheKeys.length,
        cacheSize: totalSize,
        expiredEntries: expiredCount,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return { totalEntries: 0, cacheSize: 0, expiredEntries: 0 };
    }
  }

  /**
   * 期限切れのキャッシュをクリア
   */
  static async cleanupExpired(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let cleanedCount = 0;
      const now = Date.now();

      for (const key of cacheKeys) {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          try {
            const entry = JSON.parse(item);
            if (now - entry.timestamp > entry.ttl) {
              await AsyncStorage.removeItem(key);
              cleanedCount++;
            }
          } catch (e) {
            // パース失敗
          }
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup expired cache:', error);
      return 0;
    }
  }
}

export default LocalCacheService;
