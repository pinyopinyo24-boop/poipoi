import { enrichPromptWithLearning } from "../core/LearningContextIntegration";
/**
 * LLM Integration - Google Gemini API螳溯｣・
 * Google Gemini API繧剃ｽｿ逕ｨ縺励◆LLM邨ｱ蜷・
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
 * Google Gemini API險ｭ螳・
 */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const DEFAULT_MODEL = "gemini-2.0-flash";

/**
 * Invoke LLM - Google Gemini API螳溯｣・
 */
export async function invokeLLM(request: LLMRequest): Promise<LLMResponse> {
  const baseUrl = process.env.LOCAL_AI_URL || "http://localhost:11434";
  const model = request.messages?.[0]?.content?.includes("code generation expert") ? "qwen2.5-coder:7b" : "qwen2.5:7b";

  const messages = [...(request.messages || [])];
  const userIndex = messages.findLastIndex(message => message.role === "user");
  if (userIndex >= 0) {
    const userMessage = messages[userIndex];
    if (typeof userMessage.content === "string") {
      messages[userIndex] = {
        ...userMessage,
        content: await enrichPromptWithLearning(process.cwd(), userMessage.content),
      };
    }
  }

  console.log("[LLM REQUEST] Local AI", {
    model,
    messageCount: messages.length,
    timestamp: new Date().toISOString(),
  });

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Local AI error: ${response.status} - ${errorData}`);
    }

    const rawText = await response.text();

let data: any;
try {
  data = JSON.parse(rawText);
} catch {
  throw new Error(
    `Local AIがJSON以外を返しました: ${rawText.slice(0, 500)}`
  );
}

    return {
      id: data.id || `local-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: data.model || model,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: data.message?.content || "",
        },
        finish_reason: "stop",
      }],
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[LLM ERROR] Local AI call failed:", errorMsg);

    return {
      id: `local-error-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: "現在、ローカルAIサービスに接続できません。",
        },
        finish_reason: "error",
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }
}
export async function listLLMModels(): Promise<{ data: LLMModel[] }> {
  try {
    // Gemini API縺ｧ縺ｯ models 繧ｨ繝ｳ繝峨・繧､繝ｳ繝医′逡ｰ縺ｪ繧九◆繧√√ョ繝輔か繝ｫ繝医Δ繝・Ν繧定ｿ斐☆
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
    // 繝・ヵ繧ｩ繝ｫ繝医Δ繝・Ν繧定ｿ斐☆
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
}





