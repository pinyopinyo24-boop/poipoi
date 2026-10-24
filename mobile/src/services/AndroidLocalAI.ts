import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AndroidAIModelManager, QWEN_MODEL_URLS } from './AndroidAIModelManager';

type ChatTurn = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export class AndroidLocalAI {
  private static context: any = null;
  private static initializationPromise: Promise<boolean> | null = null;
  private static modelPath: string | null = null;
  private static history: ChatTurn[] = [];
  private static historyLoaded = false;
  private static historyLoading: Promise<void> | null = null;
  private static completionQueue: Promise<void> = Promise.resolve();
  private static readonly historyKey = 'POIPOI_ANDROID_AI_HISTORY_V1';

  private static async restoreHistory(): Promise<void> {
    if (this.historyLoaded) return;
    if (!this.historyLoading) {
      this.historyLoading = (async () => {
        const saved = await AsyncStorage.getItem(this.historyKey)
          .catch(error => {
            console.warn('[PoiPoi] 履歴読み込み失敗:', error);
            return null;
          });
        if (saved) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(saved);
          } catch {
            console.warn('[PoiPoi] 保存履歴を読み取れません。現在の会話を維持します。');
            parsed = null;
          }
          if (Array.isArray(parsed)) {
            this.history = parsed.filter(
              (turn): turn is ChatTurn =>
                !!turn &&
                typeof turn === 'object' &&
                (turn.role === 'user' || turn.role === 'assistant') &&
                typeof turn.content === 'string'
            ).slice(-40);
          }
        }
        this.historyLoaded = true;
      })().finally(() => {
        this.historyLoading = null;
      });
    }
    await this.historyLoading;
  }

  private static async saveHistory(): Promise<void> {
    await AsyncStorage.setItem(
      this.historyKey,
      JSON.stringify(this.history.slice(-40))
    );
  }

  static async initialize(): Promise<boolean> {
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this.initializeInternal();
    try {
      return await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private static async initializeInternal(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      throw new Error('Android専用のローカルAIです');
    }

    let path: string;
   try {
     path = await AndroidAIModelManager.ensureModel(QWEN_MODEL_URLS);
   } catch (error) {
     const reason = error instanceof Error ? error.message : String(error);
     throw new Error(`AIモデルの準備に失敗しました: ${reason}`);
   }

    if (!path) {
      throw new Error('AIモデルが未ダウンロードです');
    }

    if (this.context && this.modelPath === path) {
      return true;
    }

    await this.release();

    const { initLlama } = require('llama.rn');

    this.context = await initLlama({
      model: path.replace(/^file:\/\//, ''),
      n_ctx: 2048,
      n_batch: 128,
      n_threads: 4,
      use_mlock: false,
    });

    this.modelPath = path;
    return true;
  }

  static async sendMessage(message: string): Promise<string> {
    const previous = this.completionQueue;
    let unlock!: () => void;
    this.completionQueue = new Promise<void>(resolve => {
      unlock = resolve;
    });

    await previous;
    try {
      return await this.sendMessageInternal(message);
    } finally {
      unlock();
    }
  }

  private static async sendMessageInternal(message: string): Promise<string> {
    if (!message.trim()) {
      throw new Error('メッセージが空です');
    }

    await this.restoreHistory();
    await this.initialize();

    const messages: ChatTurn[] = [
      {
        role: 'system',
        content: 'あなたはPoiPoi AIです。日本語で正確かつ簡潔に回答してください。',
      },
      ...this.history.slice(-10),
      { role: 'user', content: message },
    ];

    const result = await this.context.completion({
      messages,
      n_predict: 512,
      temperature: 0.7,
      stop: ['<|im_end|>', '<|endoftext|>'],
    });

    const answer = String(result?.text ?? '').trim();

    if (!answer) {
      throw new Error('ローカルAIから応答がありません');
    }

    this.history.push(
      { role: 'user', content: message },
      { role: 'assistant', content: answer },
    );
    this.history = this.history.slice(-40);
    try {
      await this.saveHistory();
    } catch (error) {
      console.warn('[PoiPoi] 会話保存失敗:', error);
    }

    return answer;
  }

  static clearHistory(): void {
    this.history = [];
    this.historyLoaded = true;
    void AsyncStorage.removeItem(this.historyKey).catch(console.warn);
  }

  static async release(): Promise<void> {
    if (this.context) {
      const current = this.context;
      this.context = null;
      await current.release();
    }
    this.modelPath = null;
  }
}