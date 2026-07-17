/**
 * ChatGPT Integration for PoiPoi
 * PoiPoi の共同開発用 ChatGPT 統合
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatGPTConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

class ChatGPTIntegration {
  private config: ChatGPTConfig;
  private conversationHistory: ChatMessage[] = [];
  private systemPrompt: string;

  constructor(config: ChatGPTConfig) {
    this.config = config;
    this.systemPrompt = `あなたは PoiPoi の共同開発アシスタントです。
ユーザーと一緒に PoiPoi プラットフォームの開発をサポートします。
以下の役割を担当します：
- コード生成とレビュー
- 機能設計のサポート
- バグ修正の提案
- 最適化のアドバイス`;
  }

  async chat(userMessage: string): Promise<string> {
    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    try {
      // Call ChatGPT API
      const response = await this.callChatGPT();

      // Add assistant response to history
      this.conversationHistory.push({
        role: "assistant",
        content: response,
      });

      return response;
    } catch (error) {
      console.error("ChatGPT API Error:", error);
      throw error;
    }
  }

  private async callChatGPT(): Promise<string> {
    // Placeholder for actual API call
    // In production, this would call OpenAI API
    const messages: ChatMessage[] = [
      { role: "system", content: this.systemPrompt },
      ...this.conversationHistory,
    ];

    console.log("📞 ChatGPT に送信:", messages);

    // Simulated response
    return "ChatGPT の応答がここに表示されます。実際の API キーを設定してください。";
  }

  getConversationHistory(): ChatMessage[] {
    return this.conversationHistory;
  }

  clearHistory(): void {
    this.conversationHistory = [];
    console.log("✨ 会話履歴をクリアしました");
  }

  getStats() {
    return {
      messagesCount: this.conversationHistory.length,
      userMessages: this.conversationHistory.filter(
        (m) => m.role === "user"
      ).length,
      assistantMessages: this.conversationHistory.filter(
        (m) => m.role === "assistant"
      ).length,
    };
  }
}

export default ChatGPTIntegration;
