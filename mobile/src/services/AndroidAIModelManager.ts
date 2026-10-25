import * as FileSystem from 'expo-file-system';
import { getDeviceAIProfile, AIModelTier } from './DeviceAIProfile';

export type ModelDefinition = {
  tier: AIModelTier;
  fileName: string;
  downloadUrl: string;
};

const MODEL_FILES: Record<AIModelTier, string> = {
  small: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
  medium: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
  large: 'qwen2.5-3b-instruct-q4_k_m.gguf',
};

export const QWEN_MODEL_URLS: Record<AIModelTier, string> = {
  small: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
  medium: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
  large: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf',
};
export class AndroidAIModelManager {
  private static modelProgressListener: ((percent: number) => void) | null = null;

  static setProgressListener(listener: ((percent: number) => void) | null): void {
    this.modelProgressListener = listener;
  }
  private static modelDirectory =
    `${FileSystem.documentDirectory}ai-models/`;

  static getRecommendedTier(): AIModelTier {
    return getDeviceAIProfile().tier;
  }

  static getModelPath(tier: AIModelTier): string {
    return `${this.modelDirectory}${MODEL_FILES[tier]}`;
  }

  static async getInstalledModel(): Promise<string | null> {
    const preferred = this.getRecommendedTier();
    const order: AIModelTier[] =
      preferred === 'large'
        ? ['large', 'medium', 'small']
        : preferred === 'medium'
          ? ['medium', 'small']
          : ['small'];

    for (const tier of order) {
      const path = this.getModelPath(tier);
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists && info.size > 0) return path;
    }
    return null;
  }

  static async ensureModel(urls: Record<AIModelTier, string>): Promise<string> {
    const installed = await this.getInstalledModel();
    if (installed) return installed;

    const preferred = this.getRecommendedTier();
    const order: AIModelTier[] =
      preferred === 'large' ? ['large', 'medium', 'small'] :
      preferred === 'medium' ? ['medium', 'small'] : ['small'];

    let lastError: unknown;
    for (const tier of order) {
      const url = urls[tier];
      if (!url) continue;
      try {
        return await this.downloadModel({
          tier,
          fileName: MODEL_FILES[tier],
          downloadUrl: url,
        });
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error('AIモデルのダウンロードURLが未設定です');
  }
  static async downloadModel(model: ModelDefinition): Promise<string> {
    if (!model.downloadUrl.startsWith('https://')) {
      throw new Error('HTTPSのモデルURLが必要です');
    }

    await FileSystem.makeDirectoryAsync(this.modelDirectory, {
      intermediates: true,
    });

    const destination = this.getModelPath(model.tier);
    const temporary = `${destination}.download`;

    // POIPOI_MODEL_RESUME_V2
    const resumePath = `${temporary}.resume`;

    const onProgress = (progress: FileSystem.DownloadProgressData) => {
      const total = progress.totalBytesExpectedToWrite;
      if (total > 0) {
        const percent = Math.floor(
          (progress.totalBytesWritten / total) * 100
        );
        AndroidAIModelManager.modelProgressListener?.(percent);
      }
    };

    const saved = await FileSystem.getInfoAsync(resumePath);
    let resumeData = saved.exists
      ? await FileSystem.readAsStringAsync(resumePath)
      : undefined;

    let download = FileSystem.createDownloadResumable(
      model.downloadUrl,
      temporary,
      {},
      onProgress,
      resumeData
    );

    try {
      let result;

      try {
        result = resumeData
          ? await download.resumeAsync()
          : await download.downloadAsync();
      } catch (error) {
        if (!resumeData) throw error;

        // 保存済みの再開情報が無効な場合は最初から取得
        await FileSystem.deleteAsync(temporary, { idempotent: true });
        await FileSystem.deleteAsync(resumePath, { idempotent: true });

        resumeData = undefined;
        download = FileSystem.createDownloadResumable(
          model.downloadUrl,
          temporary,
          {},
          onProgress
        );
        result = await download.downloadAsync();
      }

      if (!result || result.status !== 200) {
        throw new Error(`モデル取得失敗: HTTP ${result?.status ?? '不明'}`);
      }

      const info = await FileSystem.getInfoAsync(temporary);
      if (!info.exists || info.size === 0) {
        throw new Error('ダウンロードしたモデルが空です');
      }

      await FileSystem.moveAsync({
        from: temporary,
        to: destination,
      });

      await FileSystem.deleteAsync(resumePath, { idempotent: true });
      return destination;
    } catch (error) {
      try {
        const data = download.savable();
        if (data?.resumeData) {
          await FileSystem.writeAsStringAsync(
            resumePath,
            data.resumeData
          );
        }
      } catch {
        // 再開情報を取得できない場合は元のエラーを維持
      }
      throw error;
    }
  }
}