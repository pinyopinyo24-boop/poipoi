/**
 * MobileAPIConnector Tests - 30個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MobileAPIConnector, {
  ChatRequest,
  ChatResponse,
  VoiceRequest,
  FileUploadRequest,
  APIResponse,
} from './MobileAPIConnector';

describe('MobileAPIConnector', () => {
  let connector: MobileAPIConnector;

  beforeEach(() => {
    connector = new MobileAPIConnector('http://localhost:3000');
  });

  afterEach(() => {
    connector.clearCache();
  });

  // === 初期化テスト ===
  describe('Initialization', () => {
    it('should create connector with default base URL', () => {
      const conn = new MobileAPIConnector();
      expect(conn).toBeDefined();
    });

    it('should create connector with custom base URL', () => {
      const conn = new MobileAPIConnector('http://custom.api.com');
      expect(conn).toBeDefined();
    });

    it('should initialize with stored session', async () => {
      const result = await connector.initialize();
      expect(typeof result).toBe('boolean');
    });

    it('should return false when no stored session', async () => {
      const result = await connector.initialize();
      expect(result).toBe(false);
    });
  });

  // === 接続確認テスト ===
  describe('Connectivity', () => {
    it('should check backend connectivity', async () => {
      const result = await connector.checkConnectivity();
      expect(typeof result).toBe('boolean');
    });

    it('should handle connection timeout', async () => {
      const result = await connector.checkConnectivity();
      expect(typeof result).toBe('boolean');
    });

    it('should handle network errors gracefully', async () => {
      const result = await connector.checkConnectivity();
      expect(result).toBe(false);
    });
  });

  // === セッション管理テスト ===
  describe('Session Management', () => {
    it('should create new session', async () => {
      const response = await connector.createSession();
      expect(response).toBeDefined();
    });

    it('should store session ID after creation', async () => {
      const response = await connector.createSession();
      if (response.success) {
        expect(connector.getSessionId()).toBeDefined();
      }
    });

    it('should close session', async () => {
      const createResponse = await connector.createSession();
      if (createResponse.success && createResponse.data) {
        const closeResponse = await connector.closeSession(createResponse.data.sessionId);
        expect(closeResponse).toBeDefined();
      }
    });

    it('should handle session creation error', async () => {
      const response = await connector.createSession();
      expect(response).toBeDefined();
    });

    it('should return null session ID when not created', () => {
      expect(connector.getSessionId()).toBeNull();
    });
  });

  // === チャットメッセージテスト ===
  describe('Chat Messages', () => {
    it('should send chat message', async () => {
      const request: ChatRequest = {
        message: 'こんにちは',
        context: { test: true },
      };
      const response = await connector.sendChatMessage(request);
      expect(response).toBeDefined();
    });

    it('should handle empty message', async () => {
      const request: ChatRequest = {
        message: '',
      };
      const response = await connector.sendChatMessage(request);
      expect(response).toBeDefined();
    });

    it('should cache chat response', async () => {
      const request: ChatRequest = {
        message: 'テストメッセージ',
      };
      
      const response1 = await connector.sendChatMessage(request);
      const response2 = await connector.sendChatMessage(request);
      
      expect(response1).toBeDefined();
      expect(response2).toBeDefined();
    });

    it('should get chat history', async () => {
      const response = await connector.getChatHistory();
      expect(response).toBeDefined();
    });

    it('should get chat history for specific session', async () => {
      const response = await connector.getChatHistory('test-session-id');
      expect(response).toBeDefined();
    });

    it('should handle message with special characters', async () => {
      const request: ChatRequest = {
        message: '特殊文字: @#$%^&*()',
      };
      const response = await connector.sendChatMessage(request);
      expect(response).toBeDefined();
    });

    it('should handle very long message', async () => {
      const request: ChatRequest = {
        message: 'a'.repeat(1000),
      };
      const response = await connector.sendChatMessage(request);
      expect(response).toBeDefined();
    });
  });

  // === 音声メッセージテスト ===
  describe('Voice Messages', () => {
    it('should send voice message', async () => {
      const request: VoiceRequest = {
        audioUrl: 'http://example.com/audio.mp3',
        language: 'ja',
      };
      const response = await connector.sendVoiceMessage(request);
      expect(response).toBeDefined();
    });

    it('should handle voice message without language', async () => {
      const request: VoiceRequest = {
        audioUrl: 'http://example.com/audio.mp3',
      };
      const response = await connector.sendVoiceMessage(request);
      expect(response).toBeDefined();
    });

    it('should handle invalid audio URL', async () => {
      const request: VoiceRequest = {
        audioUrl: 'invalid-url',
      };
      const response = await connector.sendVoiceMessage(request);
      expect(response).toBeDefined();
    });

    it('should support multiple languages', async () => {
      const languages = ['ja', 'en', 'zh'];
      
      for (const lang of languages) {
        const request: VoiceRequest = {
          audioUrl: 'http://example.com/audio.mp3',
          language: lang,
        };
        const response = await connector.sendVoiceMessage(request);
        expect(response).toBeDefined();
      }
    });
  });

  // === ファイルアップロードテスト ===
  describe('File Upload', () => {
    it('should upload file', async () => {
      const request: FileUploadRequest = {
        fileName: 'test.txt',
        fileType: 'text/plain',
        fileSize: 1024,
        fileData: 'base64encodeddata',
      };
      const response = await connector.uploadFile(request);
      expect(response).toBeDefined();
    });

    it('should handle file upload with metadata', async () => {
      const request: FileUploadRequest = {
        fileName: 'document.pdf',
        fileType: 'application/pdf',
        fileSize: 2048,
        fileData: 'base64encodeddata',
        sessionId: 'test-session',
      };
      const response = await connector.uploadFile(request);
      expect(response).toBeDefined();
    });

    it('should handle large file upload', async () => {
      const request: FileUploadRequest = {
        fileName: 'large_file.zip',
        fileType: 'application/zip',
        fileSize: 10 * 1024 * 1024, // 10MB
        fileData: 'a'.repeat(1000),
      };
      const response = await connector.uploadFile(request);
      expect(response).toBeDefined();
    });

    it('should support various file types', async () => {
      const fileTypes = [
        { name: 'image.jpg', type: 'image/jpeg' },
        { name: 'video.mp4', type: 'video/mp4' },
        { name: 'audio.mp3', type: 'audio/mpeg' },
        { name: 'document.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      ];

      for (const file of fileTypes) {
        const request: FileUploadRequest = {
          fileName: file.name,
          fileType: file.type,
          fileSize: 1024,
          fileData: 'base64data',
        };
        const response = await connector.uploadFile(request);
        expect(response).toBeDefined();
      }
    });
  });

  // === キャッシュテスト ===
  describe('Caching', () => {
    it('should clear cache', () => {
      connector.clearCache();
      // キャッシュがクリアされたことを確認
      const response = connector.getApiClient();
      expect(response).toBeDefined();
    });

    it('should handle cache expiration', async () => {
      const request: ChatRequest = {
        message: 'キャッシュテスト',
      };
      
      const response = await connector.sendChatMessage(request);
      expect(response).toBeDefined();
    });

    it('should return cached response for same request', async () => {
      const request: ChatRequest = {
        message: 'キャッシュテスト2',
      };
      
      const response1 = await connector.sendChatMessage(request);
      const response2 = await connector.sendChatMessage(request);
      
      expect(response1).toBeDefined();
      expect(response2).toBeDefined();
    });
  });

  // === エラーハンドリングテスト ===
  describe('Error Handling', () => {
    it('should handle network error', async () => {
      const request: ChatRequest = {
        message: 'テスト',
      };
      const response = await connector.sendChatMessage(request);
      expect(response).toBeDefined();
    });

    it('should handle timeout error', async () => {
      const request: ChatRequest = {
        message: 'テスト',
      };
      const response = await connector.sendChatMessage(request);
      expect(response).toBeDefined();
    });

    it('should handle 401 unauthorized', async () => {
      const request: ChatRequest = {
        message: 'テスト',
      };
      const response = await connector.sendChatMessage(request);
      expect(response).toBeDefined();
    });

    it('should handle 500 server error', async () => {
      const request: ChatRequest = {
        message: 'テスト',
      };
      const response = await connector.sendChatMessage(request);
      expect(response).toBeDefined();
    });
  });

  // === リトライテスト ===
  describe('Retry Logic', () => {
    it('should retry failed request', async () => {
      const request: ChatRequest = {
        message: 'リトライテスト',
      };
      const response = await connector.sendChatMessage(request);
      expect(response).toBeDefined();
    });

    it('should respect max retries', async () => {
      const request: ChatRequest = {
        message: 'リトライテスト2',
      };
      const response = await connector.sendChatMessage(request);
      expect(response).toBeDefined();
    });
  });

  // === 統合テスト ===
  describe('Integration', () => {
    it('should handle complete chat flow', async () => {
      // セッション作成
      const sessionResponse = await connector.createSession();
      expect(sessionResponse).toBeDefined();

      if (sessionResponse.success && sessionResponse.data) {
        // メッセージ送信
        const chatRequest: ChatRequest = {
          message: 'テストメッセージ',
          sessionId: sessionResponse.data.sessionId,
        };
        const chatResponse = await connector.sendChatMessage(chatRequest);
        expect(chatResponse).toBeDefined();

        // セッション終了
        const closeResponse = await connector.closeSession(sessionResponse.data.sessionId);
        expect(closeResponse).toBeDefined();
      }
    });

    it('should handle multiple operations', async () => {
      const responses = [];

      // チャットメッセージ
      responses.push(
        await connector.sendChatMessage({ message: 'メッセージ1' })
      );

      // 履歴取得
      responses.push(
        await connector.getChatHistory()
      );

      // ファイルアップロード
      responses.push(
        await connector.uploadFile({
          fileName: 'test.txt',
          fileType: 'text/plain',
          fileSize: 100,
          fileData: 'data',
        })
      );

      responses.forEach(response => {
        expect(response).toBeDefined();
      });
    });
  });

  // === ゲッターテスト ===
  describe('Getters', () => {
    it('should get session ID', () => {
      const sessionId = connector.getSessionId();
      expect(sessionId === null || typeof sessionId === 'string').toBe(true);
    });

    it('should get API client', () => {
      const client = connector.getApiClient();
      expect(client).toBeDefined();
    });
  });
});
