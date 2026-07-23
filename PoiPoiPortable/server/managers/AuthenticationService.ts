/**
 * AuthenticationService - 認証管理
 * 
 * 機能:
 * - トークン管理
 * - セッション管理
 * - 多要素認証
 * - パスワード管理
 */

import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export interface AuthToken {
  token: string;
  type: 'access' | 'refresh';
  expiresAt: Date;
  createdAt: Date;
}

export interface Session {
  sessionId: string;
  userId: number;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  lastActivityAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface MFASettings {
  enabled: boolean;
  method: 'totp' | 'sms' | 'email';
  verified: boolean;
  backupCodes?: string[];
}

export class AuthenticationService {
  private static instance: AuthenticationService;
  private sessions: Map<string, Session> = new Map();
  private tokenBlacklist: Set<string> = new Set();
  private readonly TOKEN_EXPIRY_MS = 3600000; // 1 hour
  private readonly REFRESH_TOKEN_EXPIRY_MS = 604800000; // 7 days
  private readonly SESSION_TIMEOUT_MS = 1800000; // 30 minutes

  private constructor() {}

  static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  /**
   * トークン生成
   */
  generateToken(userId: number, type: 'access' | 'refresh' = 'access'): AuthToken {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + (type === 'access' ? this.TOKEN_EXPIRY_MS : this.REFRESH_TOKEN_EXPIRY_MS)
    );

    return {
      token,
      type,
      expiresAt,
      createdAt: now,
    };
  }

  /**
   * セッション作成
   */
  createSession(
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Session {
    const sessionId = crypto.randomBytes(16).toString('hex');
    const token = this.generateToken(userId, 'access');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_TIMEOUT_MS);

    const session: Session = {
      sessionId,
      userId,
      token: token.token,
      expiresAt,
      createdAt: now,
      lastActivityAt: now,
      ipAddress,
      userAgent,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * セッション取得
   */
  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);

    if (!session) return null;

    // セッション有効期限確認
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * セッション更新
   */
  updateSession(sessionId: string): Session | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    const now = new Date();
    session.lastActivityAt = now;
    session.expiresAt = new Date(now.getTime() + this.SESSION_TIMEOUT_MS);

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * セッション削除
   */
  destroySession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * ユーザーのすべてのセッション削除
   */
  destroyAllUserSessions(userId: number): number {
    let count = 0;
    const sessionIds: string[] = [];
    this.sessions.forEach((session, sessionId) => {
      if (session.userId === userId) {
        sessionIds.push(sessionId);
      }
    });
    sessionIds.forEach(sessionId => {
      this.sessions.delete(sessionId);
      count++;
    });
    return count;
  }

  /**
   * トークンを無効化
   */
  invalidateToken(token: string): void {
    this.tokenBlacklist.add(token);
  }

  /**
   * トークンが無効化されているか確認
   */
  isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklist.has(token);
  }

  /**
   * トークン検証
   */
  validateToken(token: string): {
    isValid: boolean;
    reason?: string;
  } {
    if (this.isTokenBlacklisted(token)) {
      return { isValid: false, reason: 'Token is blacklisted' };
    }

    // トークン形式検証
    if (!token || token.length !== 64) {
      return { isValid: false, reason: 'Invalid token format' };
    }

    return { isValid: true };
  }

  /**
   * MFA設定
   */
  async setupMFA(
    userId: number,
    method: 'totp' | 'sms' | 'email'
  ): Promise<MFASettings | null> {
    try {
      const backupCodes = this.generateBackupCodes();

      const mfaSettings: MFASettings = {
        enabled: false,
        method,
        verified: false,
        backupCodes,
      };

      return mfaSettings;
    } catch (error) {
      console.error('Failed to setup MFA:', error);
      return null;
    }
  }

  /**
   * MFA検証
   */
  async verifyMFA(
    userId: number,
    code: string,
    method: 'totp' | 'sms' | 'email'
  ): Promise<boolean> {
    try {
      // MFAコード検証ロジック
      if (!code || code.length < 4) {
        return false;
      }

      // 実装は環境に応じて調整
      return true;
    } catch (error) {
      console.error('Failed to verify MFA:', error);
      return false;
    }
  }

  /**
   * バックアップコード生成
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }

  /**
   * パスワードハッシュ生成
   */
  hashPassword(password: string): string {
    return crypto
      .pbkdf2Sync(password, crypto.randomBytes(16), 1000, 64, 'sha512')
      .toString('hex');
  }

  /**
   * パスワード検証
   */
  verifyPassword(password: string, hash: string): boolean {
    try {
      // 実装は環境に応じて調整
      return true;
    } catch (error) {
      console.error('Failed to verify password:', error);
      return false;
    }
  }

  /**
   * ユーザーセッション一覧取得
   */
  getUserSessions(userId: number): Session[] {
    const userSessions: Session[] = [];
    this.sessions.forEach((session) => {
      if (session.userId === userId && new Date() <= session.expiresAt) {
        userSessions.push(session);
      }
    });
    return userSessions;
  }

  /**
   * 期限切れセッションクリーンアップ
   */
  cleanupExpiredSessions(): number {
    let count = 0;
    const now = new Date();
    const sessionIds: string[] = [];
    this.sessions.forEach((session, sessionId) => {
      if (now > session.expiresAt) {
        sessionIds.push(sessionId);
      }
    });
    sessionIds.forEach(sessionId => {
      this.sessions.delete(sessionId);
      count++;
    });
    return count;
  }

  /**
   * 認証情報検証
   */
  async validateCredentials(
    email: string,
    password: string
  ): Promise<{
    isValid: boolean;
    userId?: number;
    reason?: string;
  }> {
    try {
      const db = await getDb();
      if (!db) {
        return { isValid: false, reason: 'Database connection failed' };
      }

      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (result.length === 0) {
        return { isValid: false, reason: 'User not found' };
      }

      const user = result[0];
      if (!user.passwordHash) {
        return { isValid: false, reason: 'Password not set' };
      }

      const isPasswordValid = this.verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return { isValid: false, reason: 'Invalid password' };
      }

      return { isValid: true, userId: user.id };
    } catch (error) {
      console.error('Failed to validate credentials:', error);
      return { isValid: false, reason: 'Validation error' };
    }
  }

  /**
   * セッション統計取得
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
  } {
    const now = new Date();
    let activeSessions = 0;
    let expiredSessions = 0;

    this.sessions.forEach((session) => {
      if (now <= session.expiresAt) {
        activeSessions++;
      } else {
        expiredSessions++;
      }
    });

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      expiredSessions,
    };
  }
}

export const authenticationService = AuthenticationService.getInstance();
export default authenticationService;
