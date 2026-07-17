import { z } from 'zod';
import { router, protectedProcedure } from './_core/trpc';
import { PreviewAIAssistant } from './_core/previewAIAssistant';

export const aiAssistantRouter = router({
  // テキスト要約
  summarizeText: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10, 'テキストは10文字以上である必要があります'),
        level: z.enum(['short', 'medium', 'long']).default('medium')
      })
    )
    .mutation(async ({ input }) => {
      return await PreviewAIAssistant.summarizeText(input.text, {
        level: input.level
      });
    }),

  // テキストブラッシュアップ
  refineText: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10),
        style: z.enum(['formal', 'casual', 'academic', 'creative']).default('formal'),
        tone: z.enum(['professional', 'friendly', 'authoritative', 'conversational']).default('professional')
      })
    )
    .mutation(async ({ input }) => {
      return await PreviewAIAssistant.refineText(input.text, {
        style: input.style,
        tone: input.tone
      });
    }),

  // テキスト拡張
  expandText: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10),
        targetLength: z.enum(['medium', 'long']).default('medium'),
        focusArea: z.string().optional()
      })
    )
    .mutation(async ({ input }) => {
      return await PreviewAIAssistant.expandText(input.text, {
        targetLength: input.targetLength,
        focusArea: input.focusArea
      });
    }),

  // テキスト簡潔化
  simplifyText: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10),
        targetAudience: z.string().default('一般的な読者')
      })
    )
    .mutation(async ({ input }) => {
      return await PreviewAIAssistant.simplifyText(input.text, {
        targetAudience: input.targetAudience
      });
    }),

  // トーン調整
  adjustTone: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10),
        targetTone: z.enum(['professional', 'friendly', 'authoritative', 'conversational', 'humorous'])
      })
    )
    .mutation(async ({ input }) => {
      return await PreviewAIAssistant.adjustTone(input.text, input.targetTone);
    }),

  // 複数操作同時実行
  processMultiple: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10),
        operations: z.array(z.enum(['summary', 'refinement', 'expansion', 'simplification']))
      })
    )
    .mutation(async ({ input }) => {
      return await PreviewAIAssistant.processMultiple(input.text, input.operations);
    }),

  // 文法チェック＆修正
  checkGrammar: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10)
      })
    )
    .mutation(async ({ input }) => {
      const response = await PreviewAIAssistant.refineText(input.text, {
        style: 'formal',
        tone: 'professional'
      });

      return {
        ...response,
        type: 'grammar-check' as const,
        explanation: '文法をチェックし、修正しました'
      };
    }),

  // キーワード抽出
  extractKeywords: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10),
        count: z.number().min(3).max(20).default(5)
      })
    )
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import('./_core/llm');

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: 'あなたはテキスト分析の専門家です。重要なキーワードを抽出します。'
          },
          {
            role: 'user',
            content: `以下のテキストから${input.count}個の最も重要なキーワードをJSON形式で抽出してください。\n\nテキスト:\n${input.text}\n\nJSON形式: {"keywords": ["keyword1", "keyword2", ...]}`
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'keywords_extraction',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                keywords: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '抽出されたキーワード'
                }
              },
              required: ['keywords'],
              additionalProperties: false
            }
          }
        }
      });

      const content = typeof response.choices[0].message.content === 'string'
        ? response.choices[0].message.content
        : '{}';

      const parsed = JSON.parse(content);

      return {
        keywords: parsed.keywords || [],
        originalText: input.text,
        count: input.count,
        processingTime: 0
      };
    }),

  // センチメント分析
  analyzeSentiment: protectedProcedure
    .input(
      z.object({
        text: z.string().min(10)
      })
    )
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import('./_core/llm');

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: 'あなたはセンチメント分析の専門家です。テキストの感情を分析します。'
          },
          {
            role: 'user',
            content: `以下のテキストのセンチメントを分析してください。JSON形式で、sentiment（positive/negative/neutral）、confidence（0-1）、explanation を返してください。\n\nテキスト:\n${input.text}\n\nJSON形式: {"sentiment": "positive", "confidence": 0.8, "explanation": "..."}`
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'sentiment_analysis',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                sentiment: {
                  type: 'string',
                  enum: ['positive', 'negative', 'neutral'],
                  description: 'センチメント'
                },
                confidence: {
                  type: 'number',
                  description: '信頼度（0-1）'
                },
                explanation: {
                  type: 'string',
                  description: '説明'
                }
              },
              required: ['sentiment', 'confidence', 'explanation'],
              additionalProperties: false
            }
          }
        }
      });

      const content = typeof response.choices[0].message.content === 'string'
        ? response.choices[0].message.content
        : '{}';

      const parsed = JSON.parse(content);

      return {
        sentiment: parsed.sentiment || 'neutral',
        confidence: parsed.confidence || 0,
        explanation: parsed.explanation || '',
        originalText: input.text
      };
    })
});
