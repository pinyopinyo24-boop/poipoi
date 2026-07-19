/**
 * MobileAPIConnector - Mobile App Backend API接続管理
 * 
 * 機能:
 * - Backend API接続管理
 * - リクエスト/レスポンス処理
 * - エラーハンドリング
 * - セッション管理
 * - リトライ機能
 * - キャッシング
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  context?: Record<string, any>;
}

export interface ChatResponse {
  id: string;
  message: string;
  sessionId: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface VoiceRequest {
  audioUrl: string;
  language?: string;
  sessionId?: string;
}

export interface VoiceResponse {
  transcription: string;
  confidence: number;
  sessionId: string;
  timestamp: number;
}

export interface FileUploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData: string; // base64
  sessionId?: string;
}

export interface FileUploadResponse {
  fileId: string;
  fileName: string;
  fileUrl: string;
  timestamp: number;
}

export class MobileAPIConnector {
  private apiClient: AxiosInstance;
  private baseURL: string;
  private sessionId: string | null = null;
  private sessionToken: string | null = null;
  private requestCache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5分
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(baseURL: string = 'https://3000-iocr6xxkalzfajqrgw1vp-917fb80f.sg1.manus.computer') {
    this.baseURL = baseURL;
    this.apiClient = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PoiPoi-Mobile/1.0',
      },
    });

    // レスポンスインターセプター
    this.apiClient.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401) {
          await this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 初期化 - セッション情報を復元
   */
  async initialize(): Promise<boolean> {
    try {
      const sessionId = await AsyncStorage.getItem('sessionId');
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      
      if (sessionId && sessionToken) {
        this.sessionId = sessionId;
        this.sessionToken = sessionToken;
        this.apiClient.defaults.headers.common['Authorization'] = `Bearer ${sessionToken}`;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to initialize API connector:', error);
      return false;
    }
  }

  /**
   * Backend接続確認
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      const response = await this.apiClient.get('/api/health', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.error('Backend connectivity check failed:', error);
      return false;
    }
  }

  /**
   * チャットメッセージ送信
   */
  async sendChatMessage(request: ChatRequest): Promise<APIResponse<ChatResponse>> {
    try {
      const cacheKey = `chat:${request.message}`;
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        return { success: true, data: cached };
      }

      // Generate or use existing session ID
      const sessionId = request.sessionId || `session_${Date.now()}`;
      const userId = this.sessionId || `mobile_${Date.now()}`;
      
      // tRPC standard format: wrap input in 'json' key
      // publicProcedure: no authentication required
      const response = await this.retryRequest(() =>
        this.apiClient.post('/api/trpc/chat.processMessage', {
          json: {
            userId,
            sessionId,
            message: request.message,
          }
        })
      );

      // Extract data from tRPC response
      // tRPC response format: { result: { data: {...} } }
      const data = response.data?.result?.data;
      
      if (!data) {
        throw new Error('No data in tRPC response: ' + JSON.stringify(response.data));
      }
      this.setCache(cacheKey, data);

      return {
        success: true,
        data,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to send chat message');
    }
  }

  /**
   * チャット履歴取得
   */
  async getChatHistory(sessionId?: string): Promise<APIResponse<ChatMessage[]>> {
    try {
      const id = sessionId || this.sessionId;
      const cacheKey = `history:${id}`;
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        return { success: true, data: cached };
      }

      const response = await this.retryRequest(() =>
        this.apiClient.get(`/api/trpc/chat.getHistory?sessionId=${id}`)
      );

      const data = response.data.result?.data || [];
      this.setCache(cacheKey, data);

      return {
        success: true,
        data,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get chat history');
    }
  }

  /**
   * 音声メッセージ送信
   */
  async sendVoiceMessage(request: VoiceRequest): Promise<APIResponse<ChatResponse>> {
    try {
      const response = await this.retryRequest(() =>
        this.apiClient.post('/api/trpc/voice.sendMessage', {
          audioUrl: request.audioUrl,
          language: request.language || 'ja',
          sessionId: request.sessionId || this.sessionId,
        })
      );

      return {
        success: true,
        data: response.data.result?.data,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to send voice message');
    }
  }

  /**
   * ファイルアップロード
   */
  async uploadFile(request: FileUploadRequest): Promise<APIResponse<FileUploadResponse>> {
    try {
      const response = await this.retryRequest(() =>
        this.apiClient.post('/api/trpc/file.upload', {
          fileName: request.fileName,
          fileType: request.fileType,
          fileSize: request.fileSize,
          fileData: request.fileData,
          sessionId: request.sessionId || this.sessionId,
        })
      );

      return {
        success: true,
        data: response.data.result?.data,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to upload file');
    }
  }

  /**
   * セッション作成
   */
  async createSession(): Promise<APIResponse<{ sessionId: string; token: string }>> {
    try {
      const response = await this.retryRequest(() =>
        this.apiClient.post('/api/trpc/session.create', {})
      );

      const { sessionId, token } = response.data.result?.data;
      
      // セッション情報を保存
      this.sessionId = sessionId;
      this.sessionToken = token;
      await AsyncStorage.setItem('sessionId', sessionId);
      await AsyncStorage.setItem('sessionToken', token);
      this.apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return {
        success: true,
        data: { sessionId, token },
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create session');
    }
  }

  /**
   * セッション終了
   */
  async closeSession(sessionId?: string): Promise<APIResponse<void>> {
    try {
      const id = sessionId || this.sessionId;
      await this.retryRequest(() =>
        this.apiClient.post(`/api/trpc/session.close`, { sessionId: id })
      );

      // ローカルセッション情報をクリア
      if (id === this.sessionId) {
        this.sessionId = null;
        this.sessionToken = null;
        await AsyncStorage.removeItem('sessionId');
        await AsyncStorage.removeItem('sessionToken');
        delete this.apiClient.defaults.headers.common['Authorization'];
      }

      return { success: true };
    } catch (error) {
      return this.handleError(error, 'Failed to close session');
    }
  }

  /**
   * キャッシュから取得
   */
  private getFromCache(key: string): any | null {
    const cached = this.requestCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTTL) {
      this.requestCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * キャッシュに保存
   */
  private setCache(key: string, data: any): void {
    this.requestCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * リトライ機能付きリクエスト
   */
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.retryRequest(requestFn, retries - 1);
      }
      throw error;
    }
  }

  /**
   * リトライ可能なエラーか判定
   */
  private isRetryableError(error: any): boolean {
    if (!error.response) return true; // ネットワークエラー
    const status = error.response.status;
    return status === 408 || status === 429 || status >= 500;
  }

  /**
   * 認可失敗時の処理
   */
  private async handleUnauthorized(): Promise<void> {
    this.sessionId = null;
    this.sessionToken = null;
    await AsyncStorage.removeItem('sessionId');
    await AsyncStorage.removeItem('sessionToken');
    delete this.apiClient.defaults.headers.common['Authorization'];
  }

  /**
   * エラーハンドリング
   */
  private handleError(error: any, defaultMessage: string): APIResponse {
    console.error(defaultMessage, error);

    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error || defaultMessage,
        code: error.response.status.toString(),
      };
    }

    if (error.request) {
      return {
        success: false,
        error: 'Network error - no response from server',
        code: 'NETWORK_ERROR',
      };
    }

    return {
      success: false,
      error: defaultMessage,
      code: 'UNKNOWN_ERROR',
    };
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.requestCache.clear();
  }

  /**
   * 現在のセッションID取得
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * APIクライアント取得
   */
  getApiClient(): AxiosInstance {
    return this.apiClient;
  }
}

export default MobileAPIConnector;
