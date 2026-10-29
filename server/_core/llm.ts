/** PoiPoi local Ollama LLM adapter. No external API key required. */
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

const LOCAL_AI_URL = (process.env.LOCAL_AI_URL || "http://localhost:11434").replace(/\/$/, "");
const DEFAULT_MODEL = process.env.LOCAL_AI_MODEL || "qwen2.5-coder:7b";

function textOf(content: Message["content"]): string {
  if (typeof content === "string") return content;
  const parts = Array.isArray(content) ? content : [content];
  return parts.map(part => typeof part === "string" ? part : part.type === "text" ? part.text : "[Unsupported non-text content]").join("\n");
}

export async function invokeLLM(request: LLMRequest): Promise<LLMResponse> {
  const model = request.model && !/^(gemini|gpt-)/i.test(request.model) ? request.model : DEFAULT_MODEL;
  const messages = request.messages.map(m => ({
    role: m.role === "assistant" || m.role === "system" ? m.role : "user",
    content: textOf(m.content),
  }));
  const response = await fetch(`${LOCAL_AI_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model, messages, stream: false,
      options: { temperature: request.temperature ?? 0.7, top_p: request.top_p ?? 0.9, num_predict: request.max_tokens ?? 2048 },
      ...(request.response_format ? { format: "json" } : {}),
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error(`Local Ollama error ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const data = await response.json() as {
    model?: string; message?: { content?: string }; prompt_eval_count?: number; eval_count?: number;
  };
  const prompt = data.prompt_eval_count ?? 0, completion = data.eval_count ?? 0;
  return {
    id: `local-${Date.now()}`, object: "chat.completion",
    created: Math.floor(Date.now() / 1000), model: data.model || model,
    choices: [{ index: 0, message: { role: "assistant", content: data.message?.content ?? "" }, finish_reason: "stop" }],
    usage: { prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion },
  };
}

export async function listLLMModels(): Promise<{ data: LLMModel[] }> {
  const response = await fetch(`${LOCAL_AI_URL}/api/tags`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Ollama model list error: ${response.status}`);
  const data = await response.json() as { models?: Array<{ name: string }> };
  return { data: (data.models || []).map(m => ({
    id: m.name, object: "model", owned_by: "local", permission: [],
  })) };
}
