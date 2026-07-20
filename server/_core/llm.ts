/**
 * LLM Integration - Manus Built-in LLM実装
 * Manus プラットフォームの組み込みLLM APIを使用
 */

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
  created?: number;
  root?: string;
  parent?: string | null;
  capabilities?: Record<string, unknown>;
};

/**
 * Manus LLM API設定
 */
const baseUrl = process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.ai";
export const MANUS_LLM_URL = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
export const MANUS_LLM_KEY = process.env.BUILT_IN_FORGE_API_KEY || "";
export const DEFAULT_MODEL = "gpt-4o-mini"; // Manus デフォルトモデル

/**
 * Invoke LLM - Manus Built-in LLM実装
 */
export async function invokeLLM(request: LLMRequest): Promise<LLMResponse> {
  try {
    const model = request.model || DEFAULT_MODEL;

    // [LLM KEY CHECK] Startup verification
    if (typeof process !== 'undefined' && process.env) {
      if (!MANUS_LLM_KEY) {
        console.warn('[LLM KEY CHECK] WARNING: BUILT_IN_FORGE_API_KEY is not set');
      } else {
        console.log('[LLM KEY CHECK] BUILT_IN_FORGE_API_KEY is configured');
      }
      if (!MANUS_LLM_URL) {
        console.warn('[LLM KEY CHECK] WARNING: BUILT_IN_FORGE_API_URL is not set');
      } else {
        console.log('[LLM KEY CHECK] BUILT_IN_FORGE_API_URL is configured:', MANUS_LLM_URL);
      }
    }
    
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

    // Manus LLM APIを呼び出し
    const url = MANUS_LLM_URL.endsWith("/chat/completions") ? MANUS_LLM_URL : `${MANUS_LLM_URL}/chat/completions`;
    const response = await globalThis.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MANUS_LLM_KEY}`,
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
        thinking: request.thinking,
        reasoning: request.reasoning,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      const errorMsg = `Manus LLM API error: ${response.statusText} - ${errorData}`;
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
      id: data.id || `manus-${Date.now()}`,
      object: "chat.completion",
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
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[LLM ERROR] Manus LLM call failed:", errorMsg);
    // フォールバック: ダミー応答を返す
    return {
      id: `manus-${Date.now()}`,
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
  }
}

/**
 * List LLM models - Manus実装
 */
export async function listLLMModels(): Promise<{ data: LLMModel[] }> {
  try {
    

    const response = await globalThis.fetch(`${MANUS_LLM_URL}/models`, {
      headers: {
        "Authorization": `Bearer ${MANUS_LLM_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.statusText}`);
    }

    const data = await response.json() as any;
    return { data: data.data || [] };
  } catch (error) {
    console.error("[LLM] Failed to list models:", error);
    // デフォルトモデルを返す
    return {
      data: [
        {
          id: DEFAULT_MODEL,
          object: "model",
          owned_by: "manus",
          permission: [],
        },
      ],
    };
  }
}
