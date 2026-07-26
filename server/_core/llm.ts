/**
 * LLM Integration - Google Gemini API with Ollama Fallback via AIProviderManager
 */

import { aiProviderManager, type AIProvider } from "../ai/AIProviderManager";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type Message = {
  role: Role;
  content: any;
};

export type LLMRequest = {
  model?: string;
  messages: Message[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  tools?: any;
  tool_choice?: any;
  response_format?: any;
};

export type LLMResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type LLMModel = {
  id: string;
  object: string;
  owned_by: string;
  permission: Array<Record<string, unknown>>;
};

const DEFAULT_MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const LOCAL_AI_URL = process.env.LOCAL_AI_URL || "http://localhost:11434";
const LOCAL_AI_MODEL = process.env.LOCAL_AI_MODEL || "qwen2.5:7b";

/**
 * Gemini API を呼び出す
 */
async function callGeminiAPI(
  messages: Message[],
  model: string,
  temperature: number,
  top_p: number,
  max_tokens: number,
  tools?: any,
  tool_choice?: any,
  response_format?: any
): Promise<LLMResponse> {
  const url = `${GEMINI_API_URL}chat/completions`;

  const response = await globalThis.fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GEMINI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      top_p,
      max_tokens,
      tools,
      tool_choice,
      response_format,
    }),
  });

  if (!response.ok) {
    const statusCode = response.status;
    const errorText = await response.text();
    const error = new Error(`Gemini API error: ${statusCode} - ${errorText}`);
    (error as any).statusCode = statusCode;
    throw error;
  }

  const data = await response.json() as any;

  return {
    id: data.id || `gemini-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: data.choices || [],
    usage: data.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}

/**
 * Ollama API を呼び出す
 */
async function callOllamaAPI(
  messages: Message[],
  model: string,
  temperature: number,
  top_p: number,
  max_tokens: number
): Promise<LLMResponse> {
  const url = `${LOCAL_AI_URL}/api/chat`;

  // Ollama API形式に変換
  const ollamaMessages = messages.map(msg => ({
    role: msg.role === "tool" ? "assistant" : msg.role,
    content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
  }));

  const response = await globalThis.fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: ollamaMessages,
      stream: false,
      options: {
        temperature,
        top_p,
        num_predict: max_tokens,
      },
    }),
  });

  if (!response.ok) {
    const statusCode = response.status;
    const errorText = await response.text();
    const error = new Error(`Ollama API error: ${statusCode} - ${errorText}`);
    (error as any).statusCode = statusCode;
    throw error;
  }

  const data = await response.json() as any;

  return {
    id: `ollama-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: data.message?.content || "",
        },
        finish_reason: data.done ? "stop" : "length",
      },
    ],
    usage: {
      prompt_tokens: data.prompt_eval_count || 0,
      completion_tokens: data.eval_count || 0,
      total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
    },
  };
}

/**
 * Gemini失敗時にfailoverするかどうかを判定
 */
function shouldFailover(error: any): boolean {
  const statusCode = error?.statusCode;
  // 429: Rate limit, 401: Unauthorized, timeout も含める
  return statusCode === 429 || statusCode === 401 || error?.message?.includes("timeout");
}

/**
 * LLM を呼び出す（AIProviderManager経由でGemini→Ollama自動切替）
 */
export async function invokeLLM(
  request: LLMRequest
): Promise<LLMResponse> {
  const model = request.model || DEFAULT_MODEL;
  const temperature = request.temperature ?? 0.7;
  const top_p = request.top_p ?? 0.9;
  const max_tokens = request.max_tokens ?? 2048;

  // AIProviderManagerから最適なプロバイダーを取得
  const primaryProvider = aiProviderManager.selectBestProvider();
  
  if (!primaryProvider) {
    throw new Error("No LLM provider available");
  }

  console.log(`[LLM] Using primary provider: ${primaryProvider.provider}`);

  // primaryProvider.provider を判定
  if (primaryProvider.provider === "gemini") {
    // Gemini を試す
    try {
      console.log(`[LLM] Invoking Gemini with model: ${model}`);
      const result = await callGeminiAPI(
        request.messages,
        model,
        temperature,
        top_p,
        max_tokens,
        request.tools,
        request.tool_choice,
        request.response_format
      );
      console.log(`[LLM] Gemini succeeded`);
      return result;
    } catch (geminiError) {
      console.warn(`[LLM] Gemini failed:`, geminiError instanceof Error ? geminiError.message : geminiError);

      // Failover判定（429/401/timeout）
      if (!shouldFailover(geminiError)) {
        throw geminiError;
      }

      console.log(`[LLM] Gemini failover triggered (${(geminiError as any)?.statusCode}), trying Ollama...`);
    }

    // Gemini 失敗時、Ollama へ failover
    try {
      // AIProviderManagerからfallbackプロバイダーを取得
      const fallbackProvider = aiProviderManager.selectFallbackProvider("gemini");
      
      if (!fallbackProvider || fallbackProvider.provider !== "local") {
        throw new Error("Ollama provider not available for fallback");
      }

      console.log(`[LLM] Falling back to Ollama with model: ${LOCAL_AI_MODEL}`);
      const result = await callOllamaAPI(
        request.messages,
        LOCAL_AI_MODEL,
        temperature,
        top_p,
        max_tokens
      );
      console.log(`[LLM] Ollama succeeded`);
      return result;
    } catch (ollamaError) {
      console.error(`[LLM] Ollama also failed:`, ollamaError instanceof Error ? ollamaError.message : ollamaError);
      throw new Error(
        `All LLM providers failed. Gemini failed and Ollama fallback also failed: ${ollamaError instanceof Error ? ollamaError.message : "unknown error"}`
      );
    }
  } else if (primaryProvider.provider === "local") {
    // local(Ollama) が primary なら最初から Ollama を実行
    try {
      console.log(`[LLM] Using local provider (Ollama) with model: ${LOCAL_AI_MODEL}`);
      const result = await callOllamaAPI(
        request.messages,
        LOCAL_AI_MODEL,
        temperature,
        top_p,
        max_tokens
      );
      console.log(`[LLM] Ollama succeeded`);
      return result;
    } catch (ollamaError) {
      console.error(`[LLM] Ollama failed:`, ollamaError instanceof Error ? ollamaError.message : ollamaError);
      throw ollamaError;
    }
  } else {
    // その他のプロバイダーはサポートしていない
    throw new Error(`Unsupported LLM provider: ${primaryProvider.provider}`);
  }
}

/**
 * LLM モデル一覧を取得
 */
export async function listLLMModels(): Promise<{data: LLMModel[]}> {
  return {
    data: [
      {
        id: "gemini-2.0-flash",
        object: "model",
        owned_by: "google",
        permission: [],
      },
      {
        id: LOCAL_AI_MODEL,
        object: "model",
        owned_by: "ollama",
        permission: [],
      },
    ],
  };
}
