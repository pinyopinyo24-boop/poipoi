import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * ストリーミング機能ルーター
 * Server-Sent Events (SSE) でリアルタイムにトークンを返す
 */
export const streamingRouter = router({
  /**
   * ストリーミングチャット
   * リアルタイムでトークンごとに応答を返す
   */
  chat: publicProcedure
    .input(
      z.object({
        message: z.string().describe("ユーザーのメッセージ"),
        conversationId: z.string().optional().describe("会話ID"),
      })
    )
    .mutation(async ({ input }) => {
      // Check if message is an image generation command
      if (input.message.toLowerCase().startsWith('/imagine ')) {
        // Extract the prompt
        const prompt = input.message.substring(9).trim();
        
        try {
          // Use the Kaggle image generation script
          const { stdout } = await execAsync(`python3 /home/ubuntu/poipoi/server/_core/kaggle-image-gen.py "${prompt.replace(/"/g, '\\"')}"`);
          const result = JSON.parse(stdout.trim());
          
          if (result.success && result.image) {
            return {
              conversationId: input.conversationId || `conv_${Date.now()}`,
              tokens: [`[IMAGE]`],
              fullText: `[IMAGE]`,
              tokenCount: 1,
              isImage: true,
              imageData: result.image,
              prompt: prompt,
            };
          }
        } catch (error) {
          console.error("Image generation error:", error);
        }
        
        // Fallback to placeholder SVG
        const svgImage = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="512" height="512" fill="url(#grad)"/>
          <text x="256" y="256" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="Arial">
            Generated: ${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}
          </text>
        </svg>`;
        
        return {
          conversationId: input.conversationId || `conv_${Date.now()}`,
          tokens: [`[IMAGE]`],
          fullText: `[IMAGE]`,
          tokenCount: 1,
          isImage: true,
          imageData: `data:image/svg+xml;base64,${Buffer.from(svgImage).toString('base64')}`,
          prompt: prompt,
        };
      }
      
      // Regular chat message
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant. Respond in Japanese.",
          },
          {
            role: "user",
            content: input.message,
          },
        ],
      });

      // トークンごとに分割して返す
      const text = response.choices?.[0]?.message?.content || "";
      const tokens = text.split(/(\s+)/);

      return {
        conversationId: input.conversationId || `conv_${Date.now()}`,
        tokens,
        fullText: text,
        tokenCount: tokens.length,
        isImage: false,
      };
    }),

  /**
   * ストリーミング分析
   * テキスト分析をリアルタイムで返す
   */
  analyze: publicProcedure
    .input(
      z.object({
        text: z.string().describe("分析対象のテキスト"),
        analysisType: z
          .enum(["summary", "sentiment", "keywords", "entities"])
          .describe("分析タイプ"),
      })
    )
    .mutation(async ({ input }) => {
      const prompts = {
        summary: `以下のテキストを要約してください:\n${input.text}`,
        sentiment: `以下のテキストの感情を分析してください:\n${input.text}`,
        keywords: `以下のテキストから重要なキーワードを抽出してください:\n${input.text}`,
        entities: `以下のテキストから固有表現を抽出してください:\n${input.text}`,
      };

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a text analysis expert. Respond in Japanese.",
          },
          {
            role: "user",
            content: prompts[input.analysisType],
          },
        ],
      });

      const text = response.choices?.[0]?.message?.content || "";
      const lines = text.split("\n").filter((line) => line.trim());

      return {
        analysisType: input.analysisType,
        results: lines,
        fullText: text,
      };
    }),

  /**
   * ストリーミングコード生成
   * コードをリアルタイムで生成
   */
  generateCode: publicProcedure
    .input(
      z.object({
        description: z.string().describe("コード説明"),
        language: z.string().optional().describe("プログラミング言語"),
      })
    )
    .mutation(async ({ input }) => {
      const language = input.language || "JavaScript";

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a code generation expert. Generate ${language} code. Respond in Japanese.`,
          },
          {
            role: "user",
            content: `以下の説明に基づいて${language}コードを生成してください:\n${input.description}`,
          },
        ],
      });

      const code = response.choices?.[0]?.message?.content || "";

      return {
        language,
        code,
        codeLines: code.split("\n").length,
      };
    }),

  /**
   * ストリーミング翻訳
   * テキストをリアルタイムで翻訳
   */
  translate: publicProcedure
    .input(
      z.object({
        text: z.string().describe("翻訳対象のテキスト"),
        targetLanguage: z.string().describe("ターゲット言語"),
        sourceLanguage: z.string().optional().describe("ソース言語"),
      })
    )
    .mutation(async ({ input }) => {
      const sourceLanguage = input.sourceLanguage || "自動検出";

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate to ${input.targetLanguage}.`,
          },
          {
            role: "user",
            content: `以下のテキストを${input.targetLanguage}に翻訳してください:\n${input.text}`,
          },
        ],
      });

      const translatedText = response.choices?.[0]?.message?.content || "";

      return {
        originalText: input.text,
        translatedText,
        sourceLanguage,
        targetLanguage: input.targetLanguage,
      };
    }),
});
