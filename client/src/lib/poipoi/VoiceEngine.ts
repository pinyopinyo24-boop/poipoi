/**
 * Voice Engine - PoiPoi AI Core
 * 音声処理エンジン
 */

export interface VoiceConfig {
  language?: string;
  rate?: number;
  pitch?: number;
}

class VoiceEngine {
  private isSupported: boolean;
  private config: VoiceConfig = {
    language: "ja-JP",
    rate: 1,
    pitch: 1,
  };

  constructor() {
    this.isSupported =
      typeof window !== "undefined" &&
      ("speechSynthesis" in window || "webkitSpeechSynthesis" in window);
  }

  speak(text: string, config?: VoiceConfig): void {
    if (!this.isSupported) {
      console.warn("🔊 音声合成がサポートされていません");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const finalConfig = { ...this.config, ...config };

    utterance.lang = finalConfig.language || "ja-JP";
    utterance.rate = finalConfig.rate || 1;
    utterance.pitch = finalConfig.pitch || 1;

    window.speechSynthesis.speak(utterance);
    console.log(`🔊 音声再生: ${text}`);
  }

  stop(): void {
    if (this.isSupported) {
      window.speechSynthesis.cancel();
      console.log("⏹️ 音声再生を停止しました");
    }
  }

  setConfig(config: VoiceConfig): void {
    this.config = { ...this.config, ...config };
    console.log("⚙️ 音声設定を更新しました");
  }

  getConfig(): VoiceConfig {
    return { ...this.config };
  }

  isAvailable(): boolean {
    return this.isSupported;
  }
}

export default VoiceEngine;
