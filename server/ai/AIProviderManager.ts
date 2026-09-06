import { LocalAIProvider } from "./providers/LocalAIProvider";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

class AIProviderManager {
  private static instance: AIProviderManager;
  private readonly localProvider: LocalAIProvider;

  private constructor() {
    this.localProvider = new LocalAIProvider();
  }

  static getInstance(): AIProviderManager {
    if (!AIProviderManager.instance) {
      AIProviderManager.instance = new AIProviderManager();
    }
    return AIProviderManager.instance;
  }

  async invoke(messages: AIMessage[]): Promise<string> {
    const result = await this.localProvider.invoke(messages);

    if (typeof result === "string") {
      return result;
    }

    return result?.choices?.[0]?.message?.content || "LLM応答なし";
  }
}

export const aiProviderManager = AIProviderManager.getInstance();
