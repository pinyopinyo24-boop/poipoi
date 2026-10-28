import * as fs from "node:fs";
import * as path from "node:path";
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
  private readonly storagePath = path.join(process.cwd(), "data", "chat-history.json");

  constructor() {
    
    if (fs.existsSync(this.storagePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.storagePath, "utf8"));
        this.sessions = new Map(data.sessions || []);
        this.messages = new Map(data.messages || []);
      } catch (error) {
        console.error("[PoiPoi] Unable to read saved chat history:", error);
      }
    }
  }

  private persist(): void {
    
    fs.mkdirSync(path.dirname(this.storagePath), { recursive: true });
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
    const session = this.sessions.get(key);
    if (session && session.userId !== message.userId) {
      throw new Error('Chat session owner mismatch');
    }
    const sessionMessages = this.messages.get(key) || [];
    if (sessionMessages.some(existing => existing.id === message.id)) return;
    sessionMessages.push(message);
    this.messages.set(key, sessionMessages);
    if (session) {
      session.updatedAt = message.timestamp;
      session.messageCount = sessionMessages.length;
      this.sessions.set(key, session);
    }
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
    this.messages.delete(sessionId);
    this.persist();
  }

  /**
   * ユーザー統計を取得
   */
  async getUserStatistics(userId: string): Promise<any> {
    const userSessions = await this.getUserSessions(userId);
    const totalMessages = userSessions.reduce(
      (sum, session) => sum + (this.messages.get(session.id)?.length ?? 0),
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
    this.persist();
  }

  /**
   * すべてのセッションをクリア
   */
  async clearAllSessions(): Promise<void> {
    this.sessions.clear();
    this.persist();
  }
}

let sharedChatRepository: ChatRepository | undefined;

export function getSharedChatRepository(): ChatRepository {
  return sharedChatRepository ??= new ChatRepository();
}