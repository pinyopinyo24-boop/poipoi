/**
 * Collaborative AI Development
 * Manus AI と ChatGPT による共同開発
 */

export interface AIResponse {
  source: "manus" | "chatgpt";
  content: string;
  timestamp: string;
  confidence: number;
}

export interface DevelopmentSession {
  id: string;
  topic: string;
  messages: AIResponse[];
  status: "active" | "completed" | "archived";
  createdAt: string;
}

class CollaborativeAI {
  private sessions: Map<string, DevelopmentSession> = new Map();
  private currentSession: DevelopmentSession | null = null;

  createSession(topic: string): DevelopmentSession {
    const session: DevelopmentSession = {
      id: `session_${Date.now()}`,
      topic,
      messages: [],
      status: "active",
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(session.id, session);
    this.currentSession = session;

    console.log(`🤝 共同開発セッション開始: ${topic}`);

    return session;
  }

  async addManusResponse(content: string): Promise<AIResponse> {
    if (!this.currentSession) {
      throw new Error("セッションがアクティブではありません");
    }

    const response: AIResponse = {
      source: "manus",
      content,
      timestamp: new Date().toISOString(),
      confidence: 0.95,
    };

    this.currentSession.messages.push(response);

    console.log(`🤖 Manus AI: ${content.substring(0, 50)}...`);

    return response;
  }

  async addChatGPTResponse(content: string): Promise<AIResponse> {
    if (!this.currentSession) {
      throw new Error("セッションがアクティブではありません");
    }

    const response: AIResponse = {
      source: "chatgpt",
      content,
      timestamp: new Date().toISOString(),
      confidence: 0.9,
    };

    this.currentSession.messages.push(response);

    console.log(`🧠 ChatGPT: ${content.substring(0, 50)}...`);

    return response;
  }

  async collaborativeThink(topic: string): Promise<string> {
    if (!this.currentSession) {
      this.createSession(topic);
    }

    // Simulate collaborative thinking
    const manusThought = `Manus が ${topic} について分析しました。`;
    const chatgptThought = `ChatGPT が ${topic} について提案しました。`;

    await this.addManusResponse(manusThought);
    await this.addChatGPTResponse(chatgptThought);

    return `共同分析完了: ${manusThought} ${chatgptThought}`;
  }

  getSessionMessages(): AIResponse[] {
    if (!this.currentSession) return [];
    return this.currentSession.messages;
  }

  completeSession(): DevelopmentSession | null {
    if (!this.currentSession) return null;

    this.currentSession.status = "completed";
    const completed = this.currentSession;
    this.currentSession = null;

    console.log(`✅ セッション完了: ${completed.topic}`);

    return completed;
  }

  getSessions(): DevelopmentSession[] {
    return Array.from(this.sessions.values());
  }

  getStats() {
    const sessions = Array.from(this.sessions.values());
    const allMessages = sessions.flatMap((s) => s.messages);

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter((s) => s.status === "active").length,
      completedSessions: sessions.filter((s) => s.status === "completed")
        .length,
      totalMessages: allMessages.length,
      manusMessages: allMessages.filter((m) => m.source === "manus").length,
      chatgptMessages: allMessages.filter((m) => m.source === "chatgpt")
        .length,
    };
  }
}

export default CollaborativeAI;
