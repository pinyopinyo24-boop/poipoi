import { appendPoiPoiMemory, getPoiPoiMemoryHistory, searchPoiPoiMemory } from "./core/PoiPoiLongTermMemory";
import { recordLearningFeedback } from "./core/LearningContextIntegration";
import { enrichPromptWithLearning } from "./core/LearningContextIntegration";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { exec } from "child_process";
import { promisify } from "util";
import { PoipoiCodeAgent } from "./core/PoipoiCodeAgent";
const conversationMemory = new Map<string, { question: string; answer: string }[]>();

const execAsync = promisify(exec);
const lastChats = new Map<string, {question:string;answer:string}>();

/**
 * ストリーミング機能ルーター
 * Server-Sent Events (SSE) でリアルタイムにトークンを返す
 */
export const streamingRouter = router({
  /**
   * ストリーミングチャット
   * リアルタイムでトークンごとに応答を返す
   */
  memorySearch: publicProcedure.input(z.object({query:z.string().min(1).max(500),conversationId:z.string().optional(),limit:z.number().int().min(1).max(50).optional()})).query(({input})=>searchPoiPoiMemory(input.query,input.limit??20,input.conversationId)),
  chat: publicProcedure
    .input(
      z.object({
        message: z.string(),
        conversationId: z.string().optional(),
        history: z.array(z.object({role:z.enum(["user","assistant"]),content:z.string()})).max(20).optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (input.message.toLowerCase().startsWith("/imagine ")) {
        const prompt = input.message.substring(9).trim();

        try {
          const { stdout } = await execAsync(
            `python3 /home/ubuntu/poipoi/server/_core/kaggle-image-gen.py "\${prompt.replace(/"/g, '\\\\"')}"`
          );
          const result = JSON.parse(stdout.trim());

          if (result.success && result.image) {
            return {
              conversationId: input.conversationId || "conv_" + Date.now(),
              tokens: ["[IMAGE]"],
              fullText: "[IMAGE]",
              tokenCount: 1,
              isImage: true,
              imageData: result.image,
              prompt,
            };
          }
        } catch (error) {
          console.error("Image generation error:", error);
        }

        const svgImage =
          '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">' +
          '<rect width="512" height="512" fill="#667eea"/>' +
          '<text x="256" y="256" font-size="24" fill="white" ' +
          'text-anchor="middle" dominant-baseline="middle">' +
          `Generated: \${prompt.substring(0, 30)}` +
          `</text></svg>`;

        return {
          conversationId: input.conversationId || "conv_" + Date.now(),
          tokens: ["[IMAGE]"],
          fullText: "[IMAGE]",
          tokenCount: 1,
          isImage: true,
          imageData:
            "data:image/svg+xml;base64," +
            Buffer.from(svgImage).toString("base64"),
          prompt,
        };
      }

      const codeRequest =
        /(?:\u5B9F\u88C5|\u8FFD\u52A0|\u4FEE\u6B63|\u5909\u66F4|\u4F5C\u6210|\u958B\u767A|\u76F4\u3057\u3066|\u6539\u4FEE)/.test(input.message) &&
        /(?:\u30D5\u30A1\u30A4\u30EB|\u30B3\u30FC\u30C9|\u6A5F\u80FD|\u5B9A\u6570|\u95A2\u6570|\u5B9F\u88C5)/.test(input.message);

      if (false && codeRequest) {
        const result = await PoipoiCodeAgent.getInstance().execute(
          input.message
        );

        let text = "Code implementation failed.";

        if (result.success) {
          if (result.changes && result.changes.length > 0) {
            text = result.changes
              .map((change) => "Implementation complete: " + change.path)
              .join("\\n");
          } else {
            text = "Code implementation completed.";
          }
        } else if (result.error) {
          text = "Code implementation failed: " + result.error;
        }

        const tokens = text.split(/(\\s+)/);

        return {
          conversationId: input.conversationId || "conv_" + Date.now(),
          tokens,
          fullText: text,
          tokenCount: tokens.length,
          isImage: false,
          codeAgent: true,
          success: result.success,
          changes: result.changes || [],
        };
      }

      if (/^(正解|せいかい|合ってる|あってる)[！!。.\s]*$/u.test(input.message.trim())) {
        const previous = lastChats.get(input.conversationId || "default");
        if (previous?.question && previous?.answer) {
          await recordLearningFeedback(previous.question, previous.answer, true);
        }
        const text = previous?.answer ? "正解として学習しました。" : "評価する直前の回答が見つかりません。";
        return {
          conversationId: input.conversationId || "conv_" + Date.now(),
          tokens: [text],
          fullText: text,
          tokenCount: 1,
          isImage: false,
        };
      }

      if (/^(違う|ちがう|不正解)[！!。.\s]*$/u.test(input.message.trim())) { const previous = lastChats.get(input.conversationId || "default"); if (previous?.question && previous?.answer) { await recordLearningFeedback(previous.question,previous.answer,false); } const text = previous?.answer ? "不正解として記録しました。正しくは、〇〇 と入力してください。" : "直前の回答が見つかりません。"; return {conversationId:input.conversationId || "conv_"+Date.now(),tokens:[text],fullText:text,tokenCount:1,isImage:false}; }
      const correction = input.message.match(/^正しくは[、,：:\s]*([\s\S]+)/u);
      if (correction?.[1]?.trim()) {
        const previous = lastChats.get(input.conversationId || "default");
        if (previous?.question && previous?.answer) {
          await recordLearningFeedback(
            previous.question,
            previous.answer,
            false,
            correction[1].trim()
          );
        }
      }
      if (/^正しくは[、,：:\s]*/u.test(input.message)) {
        const text = "訂正内容を覚えました。";
        return {
          conversationId: input.conversationId || "conv_" + Date.now(),
          tokens: [text],
          fullText: text,
          tokenCount: 1,
          isImage: false,
        };
      }

      const history = conversationMemory.get(input.conversationId || "default") || [];
      const savedHistory = getPoiPoiMemoryHistory(input.conversationId || "default");
      // STEP35_CROSS_CHAT_MEMORY
      const memoryKeywords = input.message.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}A-Za-z0-9.]+/gu) || [];
      // STEP37_RECENT_MEMORY
      const relatedMemories = memoryKeywords.flatMap(word => word.length >= 2 ? searchPoiPoiMemory(word, 10) : []).filter(item => item.conversationId !== (input.conversationId || "default")).sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp)).filter((item,index,array)=>array.findIndex(x=>x.question===item.question)===index).slice(0,5);
      // STEP38_MEMORY_UPDATE
      const latestFacts = new Map<string,string>();
      for(const item of relatedMemories){
        const match=item.question.match(/(?:私の|僕の|俺の)?好きな数字は\s*(\d+)/);
        if(match && !latestFacts.has("favoriteNumber"))latestFacts.set("favoriteNumber",match[1]);
      }
      const currentFact=input.message.match(/(?:私の|僕の|俺の)?好きな数字は\s*(\d+)/);
      if(currentFact)latestFacts.set("favoriteNumber",currentFact[1]);
      const updatedMemory=latestFacts.has("favoriteNumber") ? "最新の好きな数字: "+latestFacts.get("favoriteNumber") : "";
      const memoryContext = updatedMemory + "\n" + relatedMemories.map(item => "過去の質問: " + item.question + "\n過去の回答: " + item.answer).join("\n");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are Poi, the PoiPoi AI. Reply in Japanese. PoiPoi has Excel analysis, PowerPoint generation, PDF analysis, production, cost, inventory, code generation and self-evolution implementations. Do not claim unverified features work. Do not modify code just because someone asks about a feature.",
          },
          {
            role: "user",
            content: (memoryContext ? "関連する過去の会話（参考情報）:\n" + memoryContext + "\n\n" : "") + (input.history?.length ? input.history : savedHistory.length ? savedHistory : history.flatMap(h => [{role:"user" as const,content:h.question},{role:"assistant" as const,content:h.answer}])).map(h => (h.role === "user" ? "ユーザー：" : "AI：") + h.content).join("\n") + "\n" + await enrichPromptWithLearning(process.cwd(), input.message),
          },
        ],
      });

      if (!input.message.match(/^正しくは[、,：:\s]*/u)) {
        const key = input.conversationId || "default";
        const previousHistory = conversationMemory.get(key) || [];
        conversationMemory.set(key, [...previousHistory, { question: input.message, answer: response.choices?.[0]?.message?.content || "" }].slice(-10));
        appendPoiPoiMemory(input.conversationId || "default", input.message, response.choices?.[0]?.message?.content || "");
        lastChats.set(input.conversationId || "default", {
          question: input.message,
          answer: response.choices?.[0]?.message?.content || ""
        });
      }
      const text = response.choices?.[0]?.message?.content || "";
      const tokens = text.split(/(\\s+)/);

      return {
        conversationId: input.conversationId || "conv_" + Date.now(),
        tokens,
        fullText: text,
        tokenCount: tokens.length,
        isImage: false,
      };
    }),

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

      if (/^正しくは[、,：:\s]*/u.test(input.message)) {
        const text = "訂正内容を覚えました。";
        return {
          conversationId: input.conversationId || "conv_" + Date.now(),
          tokens: [text],
          fullText: text,
          tokenCount: 1,
          isImage: false,
        };
      }


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

      if (/^正しくは[、,：:\s]*/u.test(input.message)) {
        const text = "訂正内容を覚えました。";
        return {
          conversationId: input.conversationId || "conv_" + Date.now(),
          tokens: [text],
          fullText: text,
          tokenCount: 1,
          isImage: false,
        };
      }


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

      if (/^正しくは[、,：:\s]*/u.test(input.message)) {
        const text = "訂正内容を覚えました。";
        return {
          conversationId: input.conversationId || "conv_" + Date.now(),
          tokens: [text],
          fullText: text,
          tokenCount: 1,
          isImage: false,
        };
      }


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
