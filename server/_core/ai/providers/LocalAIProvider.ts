import type { AIMessage } from "../AIProviderManager";

export class LocalAIProvider {
  private readonly baseUrl =
    process.env.LOCAL_AI_URL || "http://localhost:11434";

  async invoke(messages: AIMessage[]): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.LOCAL_AI_MODEL || "qwen2.5-coder:7b",
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Local AI HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "LLM応答なし";
  }
}
