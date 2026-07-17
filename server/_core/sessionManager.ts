import crypto from 'crypto';

interface Session {
  sessionId: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
  encrypted: boolean;
  data: Map<string, any>;
}

interface SessionAuditLog {
  sessionId: string;
  userId: string;
  action: string;
  timestamp: number;
  ipAddress: string;
  details: Record<string, any>;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private auditLogs: SessionAuditLog[] = [];
  private maxConcurrentSessions: Map<string, number> = new Map();
  private sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
  private inactivityTimeout = 30 * 60 * 1000; // 30 minutes

  /**
   * Create new session
   */
  createSession(userId: string, ipAddress: string, userAgent: string): string {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const now = Date.now();

    const session: Session = {
      sessionId,
      userId,
      createdAt: now,
      expiresAt: now + this.sessionTimeout,
      lastActivity: now,
      ipAddress,
      userAgent,
      encrypted: true,
      data: new Map(),
    };

    this.sessions.set(sessionId, session);
    this.logAudit(sessionId, userId, 'SESSION_CREATED', ipAddress, { userAgent });

    // Check concurrent session limit
    this.enforceConcurrentSessionLimit(userId);

    return sessionId;
  }

  /**
   * Validate session
   */
  validateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const now = Date.now();

    // Check expiration
    if (now > session.expiresAt) {
      this.sessions.delete(sessionId);
      return false;
    }

    // Check inactivity
    if (now - session.lastActivity > this.inactivityTimeout) {
      this.sessions.delete(sessionId);
      return false;
    }

    // Update last activity
    session.lastActivity = now;
    return true;
  }

  /**
   * Get session data
   */
  getSessionData(sessionId: string, key: string): any {
    const session = this.sessions.get(sessionId);
    return session?.data.get(key);
  }

  /**
   * Set session data
   */
  setSessionData(sessionId: string, key: string, value: any): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.data.set(key, value);
      this.logAudit(sessionId, session.userId, 'SESSION_DATA_SET', session.ipAddress, { key });
    }
  }

  /**
   * Destroy session
   */
  destroySession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.logAudit(sessionId, session.userId, 'SESSION_DESTROYED', session.ipAddress, {});
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Destroy all sessions for user
   */
  destroyAllUserSessions(userId: string): void {
    const sessionsToDelete: string[] = [];
    this.sessions.forEach((session, sessionId) => {
      if (session.userId === userId) {
        sessionsToDelete.push(sessionId);
      }
    });

    sessionsToDelete.forEach(sessionId => this.destroySession(sessionId));
  }

  /**
   * Get active sessions for user
   */
  getUserActiveSessions(userId: string): Session[] {
    const userSessions: Session[] = [];
    this.sessions.forEach((session) => {
      if (session.userId === userId && this.validateSession(session.sessionId)) {
        userSessions.push(session);
      }
    });
    return userSessions;
  }

  /**
   * Set concurrent session limit
   */
  setConcurrentSessionLimit(userId: string, limit: number): void {
    this.maxConcurrentSessions.set(userId, limit);
  }

  /**
   * Enforce concurrent session limit
   */
  private enforceConcurrentSessionLimit(userId: string): void {
    const limit = this.maxConcurrentSessions.get(userId) || 5;
    const userSessions = this.getUserActiveSessions(userId);

    if (userSessions.length > limit) {
      // Remove oldest sessions
      const sessionsToRemove = userSessions.length - limit;
      userSessions
        .sort((a, b) => a.lastActivity - b.lastActivity)
        .slice(0, sessionsToRemove)
        .forEach(session => this.destroySession(session.sessionId));
    }
  }

  /**
   * Log audit entry
   */
  private logAudit(
    sessionId: string,
    userId: string,
    action: string,
    ipAddress: string,
    details: Record<string, any>
  ): void {
    const auditLog: SessionAuditLog = {
      sessionId,
      userId,
      action,
      timestamp: Date.now(),
      ipAddress,
      details,
    };

    this.auditLogs.push(auditLog);

    // Keep only last 10000 logs
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }
  }

  /**
   * Get audit logs for user
   */
  getUserAuditLogs(userId: string, limit = 100): SessionAuditLog[] {
    return this.auditLogs
      .filter(log => log.userId === userId)
      .slice(-limit);
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId: string): Session | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions(): number {
    const now = Date.now();
    let count = 0;

    const sessionsToDelete: string[] = [];
    this.sessions.forEach((session, sessionId) => {
      if (now > session.expiresAt) {
        sessionsToDelete.push(sessionId);
      }
    });

    sessionsToDelete.forEach(sessionId => {
      this.sessions.delete(sessionId);
      count++;
    });

    return count;
  }
}

export const sessionManager = new SessionManager();
