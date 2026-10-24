/**
 * ChatRepository - チャットデータ永続化層
 */

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: any;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export class ChatRepository {
  private messages = new Map<string, ChatMessage[]>();
  private sessions = new Map<string, ChatSession>();
  private readonly storagePath = require("path").join(process.cwd(), "data", "chat-history.json");

  constructor() {
    const fs = require("fs");
    if (fs.existsSync(this.storagePath)) {
      const data = JSON.parse(fs.readFileSync(this.storagePath, "utf8"));
      this.sessions = new Map(data.sessions || []);
      this.messages = new Map(data.messages || []);
    }
  }

  private persist(): void {
    const fs = require("fs");
    fs.mkdirSync(require("path").dirname(this.storagePath), { recursive: true });
    const tmp = this.storagePath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify({
      sessions: [...this.sessions],
      messages: [...this.messages]
    }));
    fs.renameSync(tmp, this.storagePath);
  }

  /**
   * メッセージを保存
   */
  async saveMessage(message: ChatMessage, sessionId?: string): Promise<void> {
    const key = sessionId || message.userId;
    const sessionMessages = this.messages.get(key) || [];
    sessionMessages.push(message);
    this.messages.set(key, sessionMessages);
    this.persist();
  }

  /**
   * メッセージを取得
   */
  async getMessages(
    sessionId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    const messages = this.messages.get(sessionId) || [];
    return messages.slice(-limit).map((msg) => ({
      ...msg,
      content: msg.content || '',
    }));
  }

  /**
   * セッションを保存
   */
  async saveSession(session: ChatSession): Promise<void> {
    this.sessions.set(session.id, session);
    this.persist();
  }

  /**
   * セッションを取得
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * ユーザーのセッション一覧を取得
   */
  async getUserSessions(userId: string): Promise<ChatSession[]> {
    const sessions: ChatSession[] = [];
    const sessionsArray = Array.from(this.sessions.values());
    for (const session of sessionsArray) {
      if (session.userId === userId) {
        sessions.push(session);
      }
    }
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * セッションを削除
   */
  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    this.persist();
  }

  /**
   * ユーザー統計を取得
   */
  async getUserStatistics(userId: string): Promise<any> {
    const userSessions = await this.getUserSessions(userId);
    const totalMessages = Array.from(this.messages.values()).reduce(
      (sum, msgs) => sum + msgs.length,
      0
    );

    return {
      totalSessions: userSessions.length,
      totalMessages,
      averageMessagesPerSession:
        userSessions.length > 0
          ? Math.round(totalMessages / userSessions.length)
          : 0,
    };
  }

  /**
   * すべてのメッセージをクリア
   */
  async clearAllMessages(): Promise<void> {
    this.messages.clear();
  }

  /**
   * すべてのセッションをクリア
   */
  async clearAllSessions(): Promise<void> {
    this.sessions.clear();
  }
}

let sharedChatRepository: ChatRepository | undefined;

export function getSharedChatRepository(): ChatRepository {
  return sharedChatRepository ??= new ChatRepository();
}