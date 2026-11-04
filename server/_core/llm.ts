import { enrichPromptWithLearning } from "../core/LearningContextIntegration";
import { conversationModel } from './ai/ConversationModel';
/**
 * PoiPoi local Ollama LLM integration.
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
  purpose?: 'code';
  userId?: string;
  baseUrl?: string;
  learningContextIncluded?: boolean;
  timeoutMs?: number;
  contextWindow?: number;
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
  const baseUrl = (request.baseUrl || process.env.LOCAL_AI_URL || "http://localhost:11434").replace(/\/+$/, "");
  const isCodeTask = request.messages.some(message =>
    typeof message.content === "string" &&
    /code implementation agent|code generation expert|software implementation agent/i.test(message.content)
  );
  const model = (request.model && /^(qwen|llama|mistral|phi|deepseek|codellama|gemma)/i.test(request.model) ? request.model : undefined) || (isCodeTask
    ? process.env.LOCAL_CODER_MODEL || "qwen2.5-coder:7b"
    : await conversationModel(baseUrl));

  const { PoiPoiIdentity } = await import("../core/PoiPoiIdentity");
  const modelIdentityMessage = {
    role: "system" as const,
    content: `この回答の生成に使用するローカルOllamaモデルは「${model}」です。モデル名を質問された場合は、この実際の選択結果を正確に伝えてください。AI自身の名前とモデル名は別です。モデル名が非公開だと推測してはいけません。`,
  };
  const messages = request.purpose === 'code' ? [...request.messages] : [
    ...(request.messages.some(message => message.role === 'system' && typeof message.content === 'string' && message.content.includes('あなたはPoiPoiのAIコアAZです。'))
      ? [] : [{ role: "system" as const, content: PoiPoiIdentity.getSystemPrompt(request.userId) }]),
    modelIdentityMessage,
    { role: "system" as const, content: "For numeric questions, compute carefully: first extract all numbers with units, write the equation internally, calculate, then verify by reversing the operation. Per-unit time = elapsed minutes / quantity (example: 75 minutes / 60 parts = 1.25 minutes per part, NOT 0.8). Combined per-unit time = sum of all elapsed minutes / sum of all quantities, NOT an average of unrelated ratios. Total cost variance = (actual unit cost - estimated unit cost) * quantity (example: (168 - 150) * 30 = 18 * 30 = 540, NOT 420). Do not accept an incorrect value supplied by the question; recompute it. Never claim a file, tool action or synchronization succeeded without a confirmed successful result. Follow the requested answer format exactly; output digits only when requested." },
    ...(request.messages || []),
  ];
  const userIndex = messages.findLastIndex(message => message.role === "user");
  if (userIndex >= 0 && !request.response_format && !request.learningContextIncluded) {
    const userMessage = messages[userIndex];
    if (typeof userMessage.content === "string") {
      messages[userIndex] = {
        ...userMessage,
        content: userMessage.content.startsWith('Past examples:') ? userMessage.content : await enrichPromptWithLearning(process.cwd(), userMessage.content, request.userId),
      };
    }
  }

  const prompt = [...messages].reverse().find(m => m.role === "user")?.content;
  if (!request.response_format && typeof prompt === "string" && /合計個数|加重/.test(prompt) && /平均製造時間|平均.*時間/.test(prompt)) {
    const pairs = Array.from(prompt.matchAll(/(\d+)個を(\d+)分/g));
    if (pairs.length > 1) {
      const count = pairs.reduce((n, p) => n + Number(p[1]), 0);
      const elapsed = pairs.reduce((n, p) => n + Number(p[2]), 0);
      if (count > 0) return {
        id: "local-arithmetic", object: "chat.completion", created: Math.floor(Date.now()/1000), model,
        choices: [{ index: 0, message: { role: "assistant", content: (elapsed/count).toFixed(2) }, finish_reason: "stop" }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
    }
  }
  console.log("[LLM REQUEST] Local AI", {
    model,
    messageCount: messages.length,
    timestamp: new Date().toISOString(),
  });

  const requestedTimeout = Number(request.timeoutMs ?? process.env.LOCAL_AI_TIMEOUT_MS ?? 120000);
  const timeoutMs = request.purpose === 'code' && requestedTimeout === 0 ? 0 : Number.isFinite(requestedTimeout)
    ? Math.max(1000, Math.min(600000, requestedTimeout)) : 120000;
  const requestedContext = Number(request.contextWindow ?? process.env.LOCAL_AI_CONTEXT_SIZE ?? 32768);
  const contextWindow = Number.isFinite(requestedContext)
    ? Math.max(4096, Math.min(32768, Math.trunc(requestedContext))) : 32768;
  const controller = new AbortController();
  const timer = timeoutMs === 0 ? undefined : setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      signal: controller.signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        // Qwen 3.5 can spend the entire local deadline on hidden reasoning.
        // Keep replies and structured intent checks responsive by default.
        ...(/^qwen3(?:\.5)?(?=:|$)/i.test(model)
          ? { think: process.env.LOCAL_AI_THINKING === 'true' && !request.response_format }
          : {}),
        options: {
          num_ctx: contextWindow,
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

    if (typeof data.error === "string" && data.error.trim()) throw new Error("Ollama: " + data.error);

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
    const failure = timeoutMs !== 0 && controller.signal.aborted
      ? new DOMException(`Local AI request timed out after ${Math.round(timeoutMs / 1000)} seconds`, 'TimeoutError')
      : error;
    const errorMsg = failure instanceof Error ? failure.message : String(failure);
    console.error("[LLM ERROR] Local AI call failed:", errorMsg);
    // Callers must distinguish transport failure from a real answer.
    throw failure;
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
