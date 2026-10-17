/**
 * ポイポイ AIエージェント - マルチモーダル入力処理
 * 
 * 画像、音声、テキストの複合入力を処理
 */

import { invokeLLM } from "./llm";
import fs from "fs";
import path from "path";

/**
 * マルチモーダル入力タイプ
 */
export type MediaType = "image" | "audio" | "video" | "text";

/**
 * マルチモーダルメッセージ
 */
export interface MultimodalMessage {
  role: "user" | "assistant" | "system";
  content: string | Array<{
    type: "text" | "image_url" | "file_url";
    text?: string;
    image_url?: { url: string; detail?: "auto" | "low" | "high" };
    file_url?: { url: string; mime_type?: string };
  }>;
}

/**
 * マルチモーダル処理エンジン
 */
export class MultimodalProcessor {
  /**
   * 画像を分析
   */
  async analyzeImage(imageUrl: string, question?: string): Promise<string> {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたは画像分析エキスパートです。画像の内容を詳しく説明します。",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
            {
              type: "text",
              text: question || "この画像について詳しく説明してください。",
            },
          ] as any,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    return response.choices[0].message.content || "";
  }

  /**
   * 複数の画像を比較
   */
  async compareImages(
    imageUrls: string[],
    question?: string
  ): Promise<string> {
    const imageContent = imageUrls.map((url) => ({
      type: "image_url" as const,
      image_url: {
        url,
        detail: "high" as const,
      },
    }));

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたは画像比較エキスパートです。複数の画像を比較分析します。",
        },
        {
          role: "user",
          content: [
            ...imageContent,
            {
              type: "text",
              text:
                question ||
                "これらの画像を比較して、違いと共通点を説明してください。",
            },
          ] as any,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "";
  }

  /**
   * 音声ファイルを転写（Whisper API使用）
   */
  async transcribeAudio(audioUrl: string, language?: string): Promise<string> {
    try {
      const endpoint = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/$/, '');
      const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!endpoint || !apiKey) throw new Error('音声文字起こし用の既存AI接続が設定されていません');
      const audioData = audioUrl.match(/^data:(audio\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+=*)$/i);
      const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };
      let body: BodyInit;
      if (audioData) {
        const bytes = Buffer.from(audioData[2], 'base64');
        if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) throw new Error('音声ファイルは10MB以下にしてください');
        const form = new FormData();
        form.append('model', 'whisper-1');
        form.append('language', language || 'ja');
        form.append('file', new Blob([Uint8Array.from(bytes)], { type: audioData[1] }), `recording.${audioData[1].split('/')[1] || 'm4a'}`);
        body = form;
      } else {
        if (!/^https:\/\//i.test(audioUrl)) throw new Error('音声URLはHTTPSまたは音声data URIを指定してください');
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ model: 'whisper-1', audio_url: audioUrl, language: language || 'ja' });
      }
      const response = await fetch(
        `${endpoint}/v1/audio/transcriptions`,
        {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(45_000),
        }
      );

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const data = (await response.json()) as { text: string };
      if (typeof data.text !== 'string' || !data.text.trim()) throw new Error('文字起こし結果が空です');
      return data.text;
    } catch (error) {
      console.error("Audio transcription error:", error);
      throw error;
    }
  }

  /**
   * 音声ファイルを分析
   */
  async analyzeAudio(audioUrl: string, question?: string): Promise<string> {
    // 音声を転写
    const transcript = await this.transcribeAudio(audioUrl);

    // 転写内容を分析
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたは音声分析エキスパートです。音声の内容を分析します。",
        },
        {
          role: "user",
          content: `以下は音声ファイルの転写内容です：\n\n${transcript}\n\n${question || "この音声について分析してください。"}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    return response.choices[0].message.content || "";
  }

  /**
   * テキスト + 画像の複合入力を処理
   */
  async processTextWithImage(
    text: string,
    imageUrl: string,
    task?: string
  ): Promise<string> {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはマルチモーダル処理エキスパートです。テキストと画像を組み合わせて処理します。",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
            {
              type: "text",
              text: `テキスト：${text}\n\nタスク：${task || "テキストと画像の関連性を分析してください。"}`,
            },
          ] as any,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    return response.choices[0].message.content || "";
  }

  /**
   * テキスト + 音声の複合入力を処理
   */
  async processTextWithAudio(
    text: string,
    audioUrl: string,
    task?: string
  ): Promise<string> {
    // 音声を転写
    const audioTranscript = await this.transcribeAudio(audioUrl);

    // 複合処理
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはマルチモーダル処理エキスパートです。テキストと音声を組み合わせて処理します。",
        },
        {
          role: "user",
          content: `テキスト：${text}\n\n音声転写：${audioTranscript}\n\nタスク：${task || "テキストと音声の内容を統合して分析してください。"}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    return response.choices[0].message.content || "";
  }

  /**
   * 複数メディアの複合処理
   */
  async processMultipleMedia(
    inputs: Array<{
      type: MediaType;
      content: string; // URL or text
      description?: string;
    }>,
    task?: string
  ): Promise<string> {
    const messageContent: any[] = [];

    // 各メディアを処理
    for (const input of inputs) {
      if (input.type === "image") {
        messageContent.push({
          type: "image_url",
          image_url: {
            url: input.content,
            detail: "high",
          },
        });
      } else if (input.type === "audio") {
        const transcript = await this.transcribeAudio(input.content);
        messageContent.push({
          type: "text",
          text: `[音声転写] ${input.description || "音声"}：${transcript}`,
        });
      } else if (input.type === "text") {
        messageContent.push({
          type: "text",
          text: `${input.description || "テキスト"}：${input.content}`,
        });
      }
    }

    // タスク説明を追加
    messageContent.push({
      type: "text",
      text: task || "提供されたすべてのメディアを分析して統合してください。",
    });

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはマルチモーダル処理エキスパートです。複数のメディアを統合して処理します。",
        },
        {
          role: "user",
          content: messageContent,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "";
  }

  /**
   * OCR - 画像からテキストを抽出
   */
  async extractTextFromImage(imageUrl: string): Promise<string> {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはOCRエキスパートです。画像から正確にテキストを抽出します。",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
            {
              type: "text",
              text: "この画像に含まれるすべてのテキストを正確に抽出してください。",
            },
          ] as any,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "";
  }

  /**
   * 画像から表を抽出
   */
  async extractTableFromImage(imageUrl: string): Promise<string> {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはテーブル抽出エキスパートです。画像から表をMarkdown形式で抽出します。",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
            {
              type: "text",
              text: "この画像に含まれる表をMarkdown形式で抽出してください。",
            },
          ] as any,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "";
  }
}

// グローバルインスタンス
export const multimodalProcessor = new MultimodalProcessor();
