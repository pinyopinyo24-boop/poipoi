import { LLMRequest, LLMResponse, LLMModel } from "../_core/llm";

export interface IAIChatProvider {
  invokeLLM(request: LLMRequest): Promise<LLMResponse>;
  listLLMModels(): Promise<{ data: LLMModel[] }>;
  getProviderName(): string;
}

export class OpenAIService implements IAIChatProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = "https://api.openai.com/v1") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async invokeLLM(request: LLMRequest): Promise<LLMResponse> {
    console.log(`[OpenAIService] Invoking LLM with model: ${request.model}`);
    const url = `${this.baseUrl}/chat/completions`;
    const response = await globalThis.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || "gpt-3.5-turbo",
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
      const errorData = await response.text();
      const errorMsg = `OpenAI API error: ${response.statusText} - ${errorData}`;
      console.error("[OpenAIService] LLM ERROR:", errorMsg);
      throw new Error(errorMsg);
    }

    const data = await response.json() as LLMResponse;
    return data;
  }

  async listLLMModels(): Promise<{ data: LLMModel[] }> {
    console.log("[OpenAIService] Listing LLM models");
    const url = `${this.baseUrl}/models`;
    const response = await globalThis.fetch(url, {
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.statusText}`);
    }

    const data = await response.json() as { data: LLMModel[] };
    return data;
  }

  getProviderName(): string {
    return "OpenAI";
  }
}

export class GeminiService implements IAIChatProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = "https://generativelanguage.googleapis.com/v1beta") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async invokeLLM(request: LLMRequest): Promise<LLMResponse> {
    console.log(`[GeminiService] Invoking LLM with model: ${request.model}`);
    // Placeholder for actual Gemini API call
    return {
      id: `gemini-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: request.model || "gemini-pro",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: `Gemini (Mock) response to: ${JSON.stringify(request.messages)}`,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }

  async listLLMModels(): Promise<{ data: LLMModel[] }> {
    console.log("[GeminiService] Listing LLM models");
    return {
      data: [
        { id: "gemini-pro", object: "model", owned_by: "google", permission: [] },
        { id: "gemini-ultra", object: "model", owned_by: "google", permission: [] },
      ],
    };
  }

  getProviderName(): string {
    return "Gemini";
  }
}

export class ManusLLMService implements IAIChatProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async invokeLLM(request: LLMRequest): Promise<LLMResponse> {
    console.log(`[ManusLLMService] Invoking LLM with model: ${request.model}`);
    // Actual Manus LLM API call logic
    const url = this.baseUrl.endsWith("/chat/completions") ? this.baseUrl : `${this.baseUrl}/chat/completions`;
    const response = await globalThis.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
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
      console.error("[ManusLLMService] LLM ERROR:", errorMsg);
      throw new Error(errorMsg);
    }

    const data = await response.json() as LLMResponse;
    return data;
  }

  async listLLMModels(): Promise<{ data: LLMModel[] }> {
    console.log("[ManusLLMService] Listing LLM models");
    const url = this.baseUrl.endsWith("/models") ? this.baseUrl : `${this.baseUrl}/models`;
    const response = await globalThis.fetch(url, {
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.statusText}`);
    }

    const data = await response.json() as { data: LLMModel[] };
    return data;
  }

  getProviderName(): string {
    return "Manus";
  }
}

export function getAIProvider(providerName: string, apiKey: string, baseUrl?: string): IAIChatProvider {
  switch (providerName.toLowerCase()) {
    case "openai":
      return new OpenAIService(apiKey, baseUrl);
    case "gemini":
      return new GeminiService(apiKey, baseUrl);
    case "manus":
      if (!baseUrl) throw new Error("Manus LLM Base URL is required");
      return new ManusLLMService(apiKey, baseUrl);
    default:
      throw new Error(`Unsupported AI provider: ${providerName}`);
  }
}
