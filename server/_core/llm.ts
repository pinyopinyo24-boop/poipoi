import { enrichPromptWithLearning } from "../core/LearningContextIntegration";
/**
 * LLM Integration - Google Gemini API螳溯｣・
 * Google Gemini API繧剃ｽｿ逕ｨ縺励◆LLM邨ｱ蜷・
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

/** Invoke local Ollama models. */
export async function invokeLLM(request: LLMRequest): Promise<LLMResponse> {
  const baseUrl = (process.env.LOCAL_AI_URL || "http://localhost:11434").replace(/\/+$/, "");
  const isCodeTask = request.messages.some(message =>
    typeof message.content === "string" &&
    /code implementation agent|code generation expert|software implementation agent/i.test(message.content)
  );
  const model = (request.model && !/^(gemini|gpt-)/i.test(request.model) ? request.model : undefined) || (isCodeTask
    ? process.env.LOCAL_CODER_MODEL || "qwen2.5-coder:7b"
    : process.env.LOCAL_CHAT_MODEL || process.env.LOCAL_CODER_MODEL || "qwen2.5-coder:7b");

  const messages = [...(request.messages || [])];
  const userIndex = messages.findLastIndex(message => message.role === "user");
  if (userIndex >= 0 && !request.response_format) {
    const userMessage = messages[userIndex];
    if (typeof userMessage.content === "string") {
      messages[userIndex] = {
        ...userMessage,
        content: userMessage.content.startsWith('Past examples:') ? userMessage.content : await enrichPromptWithLearning(process.cwd(), userMessage.content),
      };
    }
  }

  console.log("[LLM REQUEST] Local AI", {
    model,
    messageCount: messages.length,
    timestamp: new Date().toISOString(),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      signal: controller.signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
          ...(request.top_p !== undefined ? { top_p: request.top_p } : {}),
          ...(request.max_tokens !== undefined ? { num_predict: request.max_tokens } : {}),
        },
        ...(request.response_format ? { format: request.response_format.json_schema.schema } : {}),
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
          content: typeof data.message?.content === "string" ? data.message.content : "",
        },
        finish_reason: "stop",
      }],
      usage: {
        prompt_tokens: data.prompt_eval_count ?? data.usage?.prompt_tokens ?? 0,
        completion_tokens: data.eval_count ?? data.usage?.completion_tokens ?? 0,
        total_tokens: (data.prompt_eval_count ?? data.usage?.prompt_tokens ?? 0) + (data.eval_count ?? data.usage?.completion_tokens ?? 0),
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[LLM ERROR] Local AI call failed:", errorMsg);
    // Callers must be able to distinguish transport failure from a real answer.
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
export async function listLLMModels(): Promise<{ data: LLMModel[] }> {
  const baseUrl = (process.env.LOCAL_AI_URL || "http://localhost:11434").replace(/\/+$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(baseUrl + "/api/tags", { signal: controller.signal });
    if (!response.ok) throw new Error("Local model listing failed: " + response.status);
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || !("models" in payload) ||
        !Array.isArray(payload.models)) throw new Error("Invalid local model listing");
    return {
      data: payload.models.filter((item: unknown): item is { name: string } =>
        !!item && typeof item === "object" && "name" in item &&
        typeof item.name === "string"
      ).map(item => ({
        id: item.name, object: "model", owned_by: "local", permission: [],
      })),
    };
  } catch (error) {
    console.warn("[LLM] Local model discovery unavailable:", error);
    return { data: [] };
  } finally {
    clearTimeout(timer);
  }
}
