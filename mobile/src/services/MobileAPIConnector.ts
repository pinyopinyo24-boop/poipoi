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
import { LocalCacheService } from './LocalCacheService';

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
  id?: string;
  message: string | { id?: string; content: string; timestamp?: number };
  session?: { id: string };
  sessionId?: string;
  timestamp?: number;
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

  constructor(baseURL: string = 'http://192.168.1.8:3000') {
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
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      const sessionId = await AsyncStorage.getItem('chatSessionId');
      
      if (sessionToken) {
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
      const sessionId = this.sessionId || request.sessionId || await this.createChatSession();
      const response = await this.apiClient.post('/api/trpc/chat.processMessage', {
        json: { userId: 'mobile', sessionId, message: request.message },
      });
      const data = this.getTrpcData(response.data);
      if (!data?.message) throw new Error('チャット応答がありません');
      const assistantText = typeof data.message === 'string' ? data.message : data.message.content;
      const prior = await LocalCacheService.getChatHistory(sessionId) as ChatMessage[] | null;
      const now = Date.now();
      await LocalCacheService.saveChatHistory(sessionId, [
        ...(prior || []),
        { id: `mobile-user-${now}`, role: 'user', content: request.message, timestamp: now },
        { id: data.message.id || `mobile-assistant-${now}`, role: 'assistant', content: assistantText, timestamp: data.message.timestamp || now },
      ].slice(-200));

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
      if (!id) return { success: true, data: [] };
      const cacheKey = `history:${id}`;
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        return { success: true, data: cached };
      }

      const input = encodeURIComponent(JSON.stringify({ json: { userId: 'mobile', sessionId: id } }));
      const response = await this.retryRequest(() => this.apiClient.get(`/api/trpc/chat.getMessages?input=${input}`));

      const data = this.getTrpcData(response.data) || [];
      this.setCache(cacheKey, data);
      await LocalCacheService.saveChatHistory(id, data);

      return {
        success: true,
        data,
      };
    } catch (error) {
      const id = sessionId || this.sessionId;
      if (id) {
        const offlineData = await LocalCacheService.getChatHistory(id) as ChatMessage[] | null;
        if (offlineData) return { success: true, data: offlineData };
      }
      return this.handleError(error, 'Failed to get chat history');
    }
  }

  /**
   * 音声メッセージ送信
   */
  async sendVoiceMessage(request: VoiceRequest): Promise<APIResponse<ChatResponse>> {
    try {
      if (!request.audioUrl.startsWith('data:audio/')) throw new Error('音声データがありません');
      const response = await this.apiClient.post('/api/trpc/aiAssistant.transcribeAudio', {
        json: { audioDataUri: request.audioUrl, language: request.language || 'ja' },
      }, { timeout: 60000 });
      const result = this.getTrpcData<{ transcription: string; timestamp: number }>(response.data);
      if (!result?.transcription?.trim()) throw new Error('文字起こし結果がありません');
      return { success: true, data: { message: result.transcription, timestamp: result.timestamp } };
    } catch (error) {
      return this.handleError(error, '音声を文字起こしできませんでした');
    }
  }

  async analyzeImage(imageDataUri: string, question?: string): Promise<APIResponse<{ analysis: string; timestamp: number }>> {
    try {
      const response = await this.apiClient.post('/api/trpc/aiAssistant.analyzeImage', {
        json: { imageDataUri, question: question || '画像内の文字を可能な限り原文どおりに読み取り、読み取れない箇所と画像の要点を説明してください。' },
      }, { timeout: 60000 });
      const result = this.getTrpcData<{ analysis: string; timestamp: number }>(response.data);
      if (!result?.analysis?.trim()) throw new Error('画像分析結果がありません');
      return { success: true, data: result };
    } catch (error) {
      return this.handleError(error, '画像を分析できませんでした');
    }
  }

  /**
   * ファイルアップロード
   */
  async uploadFile(request: FileUploadRequest, onProgress?: (percent: number) => void): Promise<APIResponse<FileUploadResponse>> {
    try {
      const fileType = request.fileType.startsWith('image/') ? 'image' : request.fileType.startsWith('video/') ? 'video' : null;
      if (!fileType || !Number.isFinite(request.fileSize) || request.fileSize <= 0) {
        throw new Error('対応形式は画像・動画です');
      }
      const response = await this.apiClient.post('/api/trpc/fileUpload.uploadFile', {
        json: { fileName: request.fileName, fileType, fileBase64: request.fileData },
      }, {
        timeout: 120000,
        onUploadProgress: event => {
          if (event.total) onProgress?.(Math.min(99, Math.floor(event.loaded / event.total * 100)));
        },
      });
      const uploaded = this.getTrpcData(response.data);
      if (!uploaded?.filePath) throw new Error('アップロード結果がありません');
      onProgress?.(100);

      return {
        success: true,
        data: { fileId: uploaded.fileName, fileName: uploaded.fileName, fileUrl: uploaded.filePath, timestamp: Date.now() },
      };
    } catch (error) {
      return this.handleError(error, 'Failed to upload file');
    }
  }

  async downloadFile(filePath: string, onProgress?: (percent: number) => void): Promise<APIResponse<{ fileName: string; fileData: string; size: number }>> {
    try {
      const input = encodeURIComponent(JSON.stringify({ json: { filePath } }));
      const response = await this.apiClient.get(`/api/trpc/fileUpload.getFile?input=${input}`, {
        timeout: 120000,
        onDownloadProgress: event => {
          if (event.total) onProgress?.(Math.min(99, Math.floor(event.loaded / event.total * 100)));
        },
      });
      const result = this.getTrpcData<{ success: boolean; data: string; size: number }>(response.data);
      if (!result?.success || typeof result.data !== 'string' || !Number.isFinite(result.size)) throw new Error('ダウンロード結果がありません');
      onProgress?.(100);
      return { success: true, data: { fileName: filePath.split(/[\\/]/).pop() || 'download', fileData: result.data, size: result.size } };
    } catch (error) {
      return this.handleError(error, 'Failed to download file');
    }
  }

  /**
   * セッション作成
   */
  async createSession(): Promise<APIResponse<{ sessionId: string; token?: string }>> {
    try {
      const sessionId = await this.createChatSession();

      return {
        success: true,
        data: { sessionId },
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
      if (!id) return { success: true };
      await this.retryRequest(() =>
        this.apiClient.post('/api/trpc/chat.deleteSession', { json: { userId: 'mobile', sessionId: id } })
      );

      // ローカルセッション情報をクリア
      if (id === this.sessionId) {
        this.sessionId = null;
        this.sessionToken = null;
        await AsyncStorage.removeItem('chatSessionId');
        await LocalCacheService.clearChatHistory(id);
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
    const sessionId = this.sessionId;
    this.sessionId = null;
    this.sessionToken = null;
    await AsyncStorage.removeItem('chatSessionId');
    if (sessionId) await LocalCacheService.clearChatHistory(sessionId);
    await AsyncStorage.removeItem('sessionToken');
    delete this.apiClient.defaults.headers.common['Authorization'];
  }

  private async createChatSession(): Promise<string> {
    if (!this.sessionToken) throw new Error('チャットにはログインが必要です');
    const response = await this.apiClient.post('/api/trpc/chat.createSession', { json: { userId: 'mobile', title: 'モバイルチャット' } });
    const session = this.getTrpcData(response.data);
    const id = typeof session === 'string' ? session : session?.id;
    if (typeof id !== 'string' || !id) throw new Error('チャットセッションを作成できませんでした');
    this.sessionId = id;
    await AsyncStorage.setItem('chatSessionId', id);
    return id;
  }

  private getTrpcData<T = any>(response: any): T | undefined {
    const data = response?.result?.data;
    return (data && typeof data === 'object' && 'json' in data ? data.json : data) as T | undefined;
  }

  async checkAuthentication(): Promise<boolean> {
    if (!this.sessionToken) return false;
    try {
      const response = await this.apiClient.get('/api/trpc/auth.me');
      const user = response.data?.result?.data?.json ?? response.data?.result?.data;
      return !!user?.id;
    } catch {
      return false;
    }
  }
  setAuthToken(token: string): void {
    if (this.sessionToken !== token) {
      this.sessionId = null;
      this.sessionId = null;
    }
    this.sessionToken = token;
    this.apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    void AsyncStorage.multiRemove(['chatSessionId']).then(() => AsyncStorage.setItem('sessionToken', token));
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
  async getChatSessions(): Promise<APIResponse<any[]>> {
    try {
      const response = await this.apiClient.get('/api/trpc/chat.getSessions');
      const sessions = this.getTrpcData<any[]>(response.data);
      if (!Array.isArray(sessions)) throw new Error('履歴一覧を取得できませんでした');
      return { success: true, data: sessions };
    } catch (error) {
      return this.handleError(error, '履歴一覧の取得に失敗しました');
    }
  }

  async selectChatSession(sessionId: string): Promise<void> {
    if (!sessionId) throw new Error('セッションIDがありません');
    this.sessionId = sessionId;
    await AsyncStorage.setItem('chatSessionId', sessionId);
  }
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
