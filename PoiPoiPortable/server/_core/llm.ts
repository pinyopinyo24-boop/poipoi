/**
 * LLM Integration - Google Gemini API
 */

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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";

const DEFAULT_MODEL = "gemini-2.0-flash";
export async function invokeLLM(
  request: LLMRequest
): Promise<LLMResponse> {

  const model = request.model || ned_by: string;
  permission: Array<Record<string, unknown>>;
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";

const DEFAULT_MODEL = "gemini-2.0-flash";
export async function invokeLLM(
  request: LLMRequest
): Promise<LLMResponse> {

  const model = request.model || DEFAULT_MODEL;

  const url = `${GEMINI_API_URL}chat/completions`;

  const response = await globalThis.fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GEMINI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      top_p: request.top_p ?? 0.9,
      max_tokens: request.max_tokens ?? 2048,
      tools: request.tools,
      tool_choice: request.tool_choice,
      response_format: request.response_format,
    }),
  });


  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
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


export async function listLLMModels(): Promise<{data: LLMModel[]}> {

  return {
    data: [
      {
        id: "gemini-2.0-flash",
        object: "model",
        owned_by: "google",
        permission: [],
      },
    ],
  };

}