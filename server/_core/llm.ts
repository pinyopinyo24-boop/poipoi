/**
<<<<<<< HEAD
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
=======
 * LLM Integration - Google Gemini API実装
 * Google Gemini APIを使用したLLM統合
 */

// [LLM KEY CHECK] Startup verification
if (typeof process !== 'undefined' && process.env) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[LLM KEY CHECK] WARNING: GEMINI_API_KEY is not set');
  } else {
    console.log('[LLM KEY CHECK] GEMINI_API_KEY is configured');
  }
}

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};
export type ToolChoice = ToolChoicePrimitive | ToolChoiceByName | ToolChoiceExplicit;

export type LLMRequest = {
  model?: string;
  messages: Message[];
  tools?: Tool[];
  tool_choice?: ToolChoice;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict?: boolean;
      schema: Record<string, unknown>;
    };
  };
  thinking?: {
    type: "enabled";
    budget_tokens: number;
  };
  reasoning?: {
    effort: "minimal" | "low" | "medium" | "high";
  };
>>>>>>> phase13-18
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
<<<<<<< HEAD
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
=======
  created?: number;
  root?: string;
  parent?: string | null;
  capabilities?: Record<string, unknown>;
};

/**
 * Google Gemini API設定
 */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const DEFAULT_MODEL = "gemini-2.0-flash";

/**
 * Invoke LLM - Google Gemini API実装
 */
export async function invokeLLM(request: LLMRequest): Promise<LLMResponse> {
  try {
    const model = request.model || DEFAULT_MODEL;
    
    // [LLM REQUEST] Log request
    console.log('[LLM REQUEST]', {
      model,
      messageCount: request.messages.length,
      timestamp: new Date().toISOString(),
    });
    
    // メッセージをOpenAI形式に変換
    const messages = request.messages.map(msg => {
      let content: any = "";
      if (typeof msg.content === "string") {
        content = msg.content;
      } else if (Array.isArray(msg.content)) {
        content = msg.content.map((c: any) => {
          if (c.type === "text") {
            return { type: "text", text: c.text };
          }
          if (c.type === "image_url") {
            return { type: "image_url", image_url: c.image_url };
          }
          if (c.type === "file_url") {
            return { type: "file_url", file_url: c.file_url };
          }
          return { type: "text", text: "" };
        });
      } else {
        content = String(msg.content);
      }
      return { role: msg.role, content };
    });

    // Google Gemini APIを呼び出し (OpenAI互換エンドポイント)
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
        temperature: request.temperature ?? 0.7,
        top_p: request.top_p ?? 0.9,
        max_tokens: request.max_tokens ?? 2048,
        tools: request.tools,
        tool_choice: request.tool_choice,
        response_format: request.response_format,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      const errorMsg = `Gemini API error: ${response.statusText} - ${errorData}`;
      console.error('[LLM ERROR]', errorMsg);
      throw new Error(errorMsg);
    }

    const data = await response.json() as any;
    
    // [LLM RESPONSE] Log response
    console.log('[LLM RESPONSE]', {
      id: data.id,
      model: data.model,
      tokensUsed: data.usage?.total_tokens,
      timestamp: new Date().toISOString(),
    });

    return {
      id: data.id || `gemini-${Date.now()}`,
      object: data.object || "chat.completion",
      created: data.created || Math.floor(Date.now() / 1000),
      model: data.model || model,
      choices: data.choices || [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "エラー: 応答がありません",
          },
          finish_reason: "error",
        },
      ],
      usage: data.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[LLM ERROR] Gemini API call failed:", errorMsg);
    // フォールバック: ダミー応答を返す
    return {
      id: `gemini-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: DEFAULT_MODEL,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "申し訳ありません。現在LLMサービスが利用できません。後でもう一度お試しください。",
          },
          finish_reason: "error",
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
>>>>>>> phase13-18
  }
}

/**
<<<<<<< HEAD
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
=======
 * List LLM models - Gemini実装
 */
export async function listLLMModels(): Promise<{ data: LLMModel[] }> {
  try {
    // Gemini APIでは models エンドポイントが異なるため、デフォルトモデルを返す
    return {
      data: [
        {
          id: "gemini-2.0-flash",
          object: "model",
          owned_by: "google",
          permission: [],
          created: Math.floor(Date.now() / 1000),
          capabilities: {
            vision: true,
            function_calling: true,
            json_mode: true,
          },
        },
        {
          id: "gemini-1.5-pro",
          object: "model",
          owned_by: "google",
          permission: [],
          created: Math.floor(Date.now() / 1000),
          capabilities: {
            vision: true,
            function_calling: true,
            json_mode: true,
          },
        },
      ],
    };
  } catch (error) {
    console.error("[LLM] Failed to list models:", error);
    // デフォルトモデルを返す
    return {
      data: [
        {
          id: DEFAULT_MODEL,
          object: "model",
          owned_by: "google",
          permission: [],
        },
      ],
    };
  }
>>>>>>> phase13-18
}
