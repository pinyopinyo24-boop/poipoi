/**
 * ポイポイ AIエージェント - リアルタイムコラボレーション機能
 * 
 * 複数ユーザーによる同時編集・協働作業
 */

import { EventEmitter } from "events";

/**
 * コラボレーションセッション
 */
export interface CollaborationSession {
  sessionId: string;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  participants: CollaborationParticipant[];
  documents: CollaborationDocument[];
  isActive: boolean;
}

/**
 * コラボレーション参加者
 */
export interface CollaborationParticipant {
  userId: string;
  username: string;
  role: "owner" | "editor" | "viewer";
  joinedAt: Date;
  lastActiveAt: Date;
  cursorPosition?: { line: number; column: number };
  color: string;
}

/**
 * コラボレーションドキュメント
 */
export interface CollaborationDocument {
  documentId: string;
  title: string;
  content: string;
  version: number;
  lastEditedBy: string;
  lastEditedAt: Date;
  changeHistory: DocumentChange[];
}

/**
 * ドキュメント変更
 */
export interface DocumentChange {
  changeId: string;
  userId: string;
  timestamp: Date;
  type: "insert" | "delete" | "replace";
  position: number;
  content: string;
  oldContent?: string;
}

/**
 * リアルタイムコラボレーションエンジン
 */
export class RealtimeCollaborationEngine extends EventEmitter {
  private sessions: Map<string, CollaborationSession> = new Map();
  private documents: Map<string, CollaborationDocument> = new Map();
  private userSessions: Map<string, string> = new Map(); // userId -> sessionId

  /**
   * セッションを作成
   */
  createSession(
    title: string,
    description?: string,
    ownerId?: string
  ): CollaborationSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: CollaborationSession = {
      sessionId,
      title,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      participants: ownerId
        ? [
            {
              userId: ownerId,
              username: `User_${ownerId}`,
              role: "owner",
              joinedAt: new Date(),
              lastActiveAt: new Date(),
              color: this.generateColor(),
            },
          ]
        : [],
      documents: [],
      isActive: true,
    };

    this.sessions.set(sessionId, session);
    if (ownerId) {
      this.userSessions.set(ownerId, sessionId);
    }

    this.emit("session-created", session);
    return session;
  }

  /**
   * セッションに参加
   */
  joinSession(
    sessionId: string,
    userId: string,
    username: string,
    role: "editor" | "viewer" = "editor"
  ): CollaborationSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // 既に参加しているか確認
    const existingParticipant = session.participants.find(
      (p) => p.userId === userId
    );
    if (existingParticipant) {
      existingParticipant.lastActiveAt = new Date();
      return session;
    }

    // 新しい参加者を追加
    const participant: CollaborationParticipant = {
      userId,
      username,
      role,
      joinedAt: new Date(),
      lastActiveAt: new Date(),
      color: this.generateColor(),
    };

    session.participants.push(participant);
    session.updatedAt = new Date();
    this.userSessions.set(userId, sessionId);

    this.emit("user-joined", { sessionId, participant });
    return session;
  }

  /**
   * セッションから退出
   */
  leaveSession(sessionId: string, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const index = session.participants.findIndex((p) => p.userId === userId);
    if (index === -1) return false;

    session.participants.splice(index, 1);
    session.updatedAt = new Date();
    this.userSessions.delete(userId);

    this.emit("user-left", { sessionId, userId });

    // セッションが空になった場合、クローズ
    if (session.participants.length === 0) {
      session.isActive = false;
    }

    return true;
  }

  /**
   * ドキュメントを作成
   */
  createDocument(
    sessionId: string,
    title: string,
    initialContent: string = ""
  ): CollaborationDocument | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const document: CollaborationDocument = {
      documentId,
      title,
      content: initialContent,
      version: 1,
      lastEditedBy: "system",
      lastEditedAt: new Date(),
      changeHistory: [],
    };

    this.documents.set(documentId, document);
    session.documents.push(document);
    session.updatedAt = new Date();

    this.emit("document-created", { sessionId, document });
    return document;
  }

  /**
   * ドキュメントを編集（変更を記録）
   */
  editDocument(
    documentId: string,
    userId: string,
    type: "insert" | "delete" | "replace",
    position: number,
    content: string,
    oldContent?: string
  ): DocumentChange | null {
    const document = this.documents.get(documentId);
    if (!document) return null;

    // 変更を適用
    if (type === "insert") {
      document.content =
        document.content.slice(0, position) +
        content +
        document.content.slice(position);
    } else if (type === "delete") {
      document.content =
        document.content.slice(0, position) +
        document.content.slice(position + content.length);
    } else if (type === "replace") {
      document.content =
        document.content.slice(0, position) +
        content +
        document.content.slice(position + (oldContent?.length || 0));
    }

    // 変更を記録
    const change: DocumentChange = {
      changeId: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      timestamp: new Date(),
      type,
      position,
      content,
      oldContent,
    };

    document.changeHistory.push(change);
    document.version++;
    document.lastEditedBy = userId;
    document.lastEditedAt = new Date();

    this.emit("document-changed", { documentId, change });
    return change;
  }

  /**
   * ドキュメントの変更履歴を取得
   */
  getDocumentHistory(documentId: string): DocumentChange[] {
    const document = this.documents.get(documentId);
    return document ? document.changeHistory : [];
  }

  /**
   * ドキュメントを特定のバージョンに戻す
   */
  revertDocument(documentId: string, toVersion: number): boolean {
    const document = this.documents.get(documentId);
    if (!document) return false;

    // バージョン1から指定バージョンまでの変更を再適用
    let content = "";
    for (let i = 0; i < document.changeHistory.length && i < toVersion - 1; i++) {
      const change = document.changeHistory[i];
      if (change.type === "insert") {
        content =
          content.slice(0, change.position) +
          change.content +
          content.slice(change.position);
      } else if (change.type === "delete") {
        content =
          content.slice(0, change.position) +
          content.slice(change.position + change.content.length);
      }
    }

    document.content = content;
    document.version = toVersion;
    document.lastEditedAt = new Date();

    this.emit("document-reverted", { documentId, toVersion });
    return true;
  }

  /**
   * セッション内の全ユーザーにメッセージを配信
   */
  broadcastToSession(
    sessionId: string,
    message: any,
    excludeUserId?: string
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.participants.forEach((participant) => {
      if (excludeUserId && participant.userId === excludeUserId) return;
      this.emit(`user-message-${participant.userId}`, message);
    });
  }

  /**
   * ユーザーのカーソル位置を更新
   */
  updateUserCursor(
    sessionId: string,
    userId: string,
    line: number,
    column: number
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.find((p) => p.userId === userId);
    if (participant) {
      participant.cursorPosition = { line, column };
      this.emit("cursor-updated", { sessionId, userId, line, column });
    }
  }

  /**
   * セッション情報を取得
   */
  getSession(sessionId: string): CollaborationSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * ドキュメント情報を取得
   */
  getDocument(documentId: string): CollaborationDocument | null {
    return this.documents.get(documentId) || null;
  }

  /**
   * ユーザーが参加しているセッションを取得
   */
  getUserSession(userId: string): CollaborationSession | null {
    const sessionId = this.userSessions.get(userId);
    return sessionId ? this.sessions.get(sessionId) || null : null;
  }

  /**
   * 色を生成
   */
  private generateColor(): string {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA07A",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E2",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 全セッションを取得
   */
  getAllSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * セッションをクローズ
   */
  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.isActive = false;
    session.participants.forEach((p) => {
      this.userSessions.delete(p.userId);
    });

    this.emit("session-closed", { sessionId });
    return true;
  }
}

// グローバルインスタンス
export const collaborationEngine = new RealtimeCollaborationEngine();
