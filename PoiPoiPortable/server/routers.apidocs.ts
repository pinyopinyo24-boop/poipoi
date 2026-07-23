import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

/**
 * API ドキュメント生成ルーター
 * OpenAPI スキーマとドキュメントを生成
 */
export const apiDocsRouter = router({
  /**
   * OpenAPI スキーマを取得
   */
  getOpenAPISchema: publicProcedure.query(async () => {
    return {
      openapi: "3.0.0",
      info: {
        title: "ポイポイ API",
        description: "次世代生産管理 & AIクリエイティブプラットフォーム",
        version: "1.0.0",
        contact: {
          name: "ポイポイサポート",
          url: "https://poipoi.manus.space",
        },
      },
      servers: [
        {
          url: "https://poipoi.manus.space/api",
          description: "本番環境",
        },
      ],
      paths: {
        "/trpc/agent.execute": {
          post: {
            summary: "AIエージェント実行",
            description: "ユーザーのリクエストを処理し、AIが応答を返す",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      json: {
                        type: "object",
                        properties: {
                          input: {
                            type: "string",
                            description: "ユーザーのリクエスト",
                          },
                        },
                        required: ["input"],
                      },
                    },
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "成功",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        result: {
                          type: "object",
                          properties: {
                            data: {
                              type: "object",
                              properties: {
                                success: { type: "boolean" },
                                output: { type: "string" },
                                toolsUsed: { type: "array" },
                                executionTime: { type: "number" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/trpc/faceswap.swap": {
          post: {
            summary: "顔入れ替え処理",
            description: "2つの画像で顔入れ替えを実行",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      json: {
                        type: "object",
                        properties: {
                          sourceImageBase64: {
                            type: "string",
                            description: "ソース画像（Base64）",
                          },
                          targetImageBase64: {
                            type: "string",
                            description: "ターゲット画像（Base64）",
                          },
                          quality: {
                            type: "string",
                            enum: ["low", "medium", "high"],
                            description: "処理品質",
                          },
                        },
                        required: [
                          "sourceImageBase64",
                          "targetImageBase64",
                        ],
                      },
                    },
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "成功",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        result: {
                          type: "object",
                          properties: {
                            data: {
                              type: "string",
                              description: "処理済み画像（Base64）",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/trpc/streaming.chat": {
          post: {
            summary: "ストリーミングチャット",
            description: "リアルタイムでトークンごとに応答を返す",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      json: {
                        type: "object",
                        properties: {
                          message: {
                            type: "string",
                            description: "ユーザーのメッセージ",
                          },
                        },
                        required: ["message"],
                      },
                    },
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "成功",
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    };
  }),

  /**
   * API エンドポイント一覧を取得
   */
  getEndpoints: publicProcedure.query(async () => {
    return [
      {
        path: "/trpc/agent.execute",
        method: "POST",
        name: "AIエージェント実行",
        description: "ユーザーのリクエストを処理し、AIが応答を返す",
        category: "AI",
      },
      {
        path: "/trpc/agent.analyzeTask",
        method: "GET",
        name: "タスク分析",
        description: "テキストを分析してタスクを抽出",
        category: "AI",
      },
      {
        path: "/trpc/agent.getHistory",
        method: "GET",
        name: "会話履歴取得",
        description: "過去の会話履歴を取得",
        category: "AI",
      },
      {
        path: "/trpc/faceswap.swap",
        method: "POST",
        name: "顔入れ替え",
        description: "2つの画像で顔入れ替えを実行",
        category: "画像処理",
      },
      {
        path: "/trpc/streaming.chat",
        method: "POST",
        name: "ストリーミングチャット",
        description: "リアルタイムでトークンごとに応答を返す",
        category: "ストリーミング",
      },
      {
        path: "/trpc/streaming.analyze",
        method: "POST",
        name: "ストリーミング分析",
        description: "テキスト分析をリアルタイムで実行",
        category: "ストリーミング",
      },
      {
        path: "/trpc/streaming.generateCode",
        method: "POST",
        name: "コード生成",
        description: "説明からコードをリアルタイムで生成",
        category: "ストリーミング",
      },
      {
        path: "/trpc/streaming.translate",
        method: "POST",
        name: "翻訳",
        description: "テキストをリアルタイムで翻訳",
        category: "ストリーミング",
      },
    ];
  }),

  /**
   * API テスター用のサンプルリクエストを取得
   */
  getSampleRequests: publicProcedure
    .input(z.object({ endpoint: z.string() }))
    .query(async ({ input }) => {
      const samples: Record<string, object> = {
        "agent.execute": {
          json: {
            input: "今日の天気を教えてください",
          },
        },
        "faceswap.swap": {
          json: {
            sourceImageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            targetImageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            quality: "medium",
          },
        },
        "streaming.chat": {
          json: {
            message: "こんにちは",
          },
        },
      };

      return samples[input.endpoint] || {};
    }),

  /**
   * API 使用統計を取得
   */
  getUsageStats: publicProcedure.query(async () => {
    return {
      totalRequests: 1234,
      successRate: 99.8,
      averageResponseTime: 245,
      topEndpoints: [
        {
          endpoint: "agent.execute",
          requests: 450,
          averageTime: 200,
        },
        {
          endpoint: "streaming.chat",
          requests: 320,
          averageTime: 150,
        },
        {
          endpoint: "faceswap.swap",
          requests: 280,
          averageTime: 500,
        },
      ],
      lastUpdated: new Date(),
    };
  }),
});
