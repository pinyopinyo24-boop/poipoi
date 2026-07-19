/**
 * ポイポイ AIエージェント - ストリーミング応答機能
 * 
 * リアルタイムでAI応答をストリーミング配信
 * WebSocket + Server-Sent Events (SSE)
 */

import { invokeLLM } from "./llm";

/**
 * ストリーミング応答設定
 */
export interface StreamingConfig {
  chunkSize?: number; // 文字数
  flushInterval?: number; // ミリ秒
  enableTokenCounting?: boolean;
}

/**
 * ストリーミング応答エンジン
 */
export class StreamingResponseEngine {
  private defaultConfig: StreamingConfig = {
    chunkSize: 50,
    flushInterval: 100,
    enableTokenCounting: true,
  };

  /**
   * LLM応答をストリーミング配信
   */
  async *streamLLMResponse(
    messages: any[],
    config?: StreamingConfig
  ): AsyncGenerator<string, void, unknown> {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      // LLM呼び出し（ストリーミング対応）
      const response = await invokeLLM({
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true, // ストリーミング有効化
      } as any);

      let buffer = "";
      let tokenCount = 0;

      // ストリーミングレスポンスを処理
      if (response instanceof ReadableStream) {
        const reader = response.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // チャンクサイズに達したら送信
            const chunkSize = finalConfig.chunkSize || 50;
            if (buffer.length >= chunkSize) {
              const toSend = buffer.substring(0, chunkSize);
              buffer = buffer.substring(chunkSize);

              if (finalConfig.enableTokenCounting) {
                tokenCount += Math.ceil(toSend.length / 4); // 概算トークン数
              }

              yield toSend;
            }
          }

          // 残りのバッファを送信
          if (buffer.length > 0) {
            yield buffer;
          }
        } finally {
          reader.releaseLock();
        }
      } else {
        // フォールバック：通常の応答
        const content = response.choices?.[0]?.message?.content || "";
        for (let i = 0; i < content.length; i += finalConfig.chunkSize || 50) {
          yield content.substring(i, i + (finalConfig.chunkSize || 50));
        }
      }
    } catch (error) {
      console.error("Streaming error:", error);
      throw error;
    }
  }

  /**
   * エージェント実行結果をストリーミング配信
   */
  async *streamAgentExecution(
    taskDescription: string,
    config?: StreamingConfig
  ): AsyncGenerator<
    {
      type: "step" | "output" | "tool" | "error" | "complete";
      content: string;
      timestamp: Date;
    },
    void,
    unknown
  > {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      // ステップ1: タスク分析
      yield {
        type: "step",
        content: "タスク分析中...",
        timestamp: new Date(),
      };

      // ステップ2: ツール選択
      yield {
        type: "step",
        content: "最適なツールを選択中...",
        timestamp: new Date(),
      };

      // ステップ3: 実行
      yield {
        type: "step",
        content: "実行中...",
        timestamp: new Date(),
      };

      // LLM応答をストリーミング
      for await (const chunk of this.streamLLMResponse(
        [
          {
            role: "user",
            content: taskDescription,
          },
        ],
        finalConfig
      )) {
        yield {
          type: "output",
          content: chunk,
          timestamp: new Date(),
        };
      }

      // 完了
      yield {
        type: "complete",
        content: "実行完了",
        timestamp: new Date(),
      };
    } catch (error) {
      yield {
        type: "error",
        content: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      };
    }
  }

  /**
   * テキスト生成をストリーミング配信（リアルタイム）
   */
  async *streamTextGeneration(
    prompt: string,
    config?: StreamingConfig
  ): AsyncGenerator<string, void, unknown> {
    const finalConfig = { ...this.defaultConfig, ...config };

    const messages = [
      {
        role: "system",
        content: "あなたは高速テキスト生成エキスパートです。",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    for await (const chunk of this.streamLLMResponse(messages, finalConfig)) {
      yield chunk;
    }
  }

  /**
   * コード生成をストリーミング配信
   */
  async *streamCodeGeneration(
    requirements: string,
    language: string = "typescript",
    config?: StreamingConfig
  ): AsyncGenerator<string, void, unknown> {
    const finalConfig = { ...this.defaultConfig, ...config };

    const messages = [
      {
        role: "system",
        content: `あなたは${language}のコード生成エキスパートです。高品質で効率的なコードを生成します。`,
      },
      {
        role: "user",
        content: `以下の要件に基づいて${language}コードを生成してください：\n\n${requirements}`,
      },
    ];

    for await (const chunk of this.streamLLMResponse(messages, finalConfig)) {
      yield chunk;
    }
  }

  /**
   * 翻訳をストリーミング配信
   */
  async *streamTranslation(
    text: string,
    targetLanguage: string = "English",
    config?: StreamingConfig
  ): AsyncGenerator<string, void, unknown> {
    const finalConfig = { ...this.defaultConfig, ...config };

    const messages = [
      {
        role: "system",
        content: `あなたは翻訳エキスパートです。正確で自然な${targetLanguage}への翻訳を提供します。`,
      },
      {
        role: "user",
        content: `以下のテキストを${targetLanguage}に翻訳してください：\n\n${text}`,
      },
    ];

    for await (const chunk of this.streamLLMResponse(messages, finalConfig)) {
      yield chunk;
    }
  }

  /**
   * 要約をストリーミング配信
   */
  async *streamSummarization(
    text: string,
    summaryLength: "short" | "medium" | "long" = "medium",
    config?: StreamingConfig
  ): AsyncGenerator<string, void, unknown> {
    const finalConfig = { ...this.defaultConfig, ...config };

    const lengthGuide = {
      short: "1-2段落",
      medium: "3-4段落",
      long: "5-6段落",
    };

    const messages = [
      {
        role: "system",
        content: "あなたは要約エキスパートです。正確で簡潔な要約を提供します。",
      },
      {
        role: "user",
        content: `以下のテキストを${lengthGuide[summaryLength]}で要約してください：\n\n${text}`,
      },
    ];

    for await (const chunk of this.streamLLMResponse(messages, finalConfig)) {
      yield chunk;
    }
  }
}

// グローバルインスタンス
export const streamingEngine = new StreamingResponseEngine();
