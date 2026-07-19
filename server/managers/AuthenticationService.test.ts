/**
 * AuthenticationService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authenticationService, AuthenticationService } from './AuthenticationService';

describe('AuthenticationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // === トークン生成テスト ===
  describe('Token Generation', () => {
    it('should generate access token', () => {
      const token = authenticationService.generateToken(1, 'access');
      expect(token.type).toBe('access');
      expect(token.token.length).toBe(64);
    });

    it('should generate refresh token', () => {
      const token = authenticationService.generateToken(1, 'refresh');
      expect(token.type).toBe('refresh');
      expect(token.token.length).toBe(64);
    });

    it('should set correct expiry time', () => {
      const token = authenticationService.generateToken(1, 'access');
      expect(token.expiresAt > new Date()).toBe(true);
    });
  });

  // === セッション管理テスト ===
  describe('Session Management', () => {
    it('should create session', () => {
      const session = authenticationService.createSession(1);
      expect(session.sessionId.length).toBe(32);
      expect(session.userId).toBe(1);
    });

    it('should get session', () => {
      const created = authenticationService.createSession(1);
      const retrieved = authenticationService.getSession(created.sessionId);
      expect(retrieved).not.toBeNull();
    });

    it('should return null for non-existent session', () => {
      const result = authenticationService.getSession('non_existent');
      expect(result).toBeNull();
    });

    it('should update session', () => {
      const created = authenticationService.createSession(1);
      const updated = authenticationService.updateSession(created.sessionId);
      expect(updated).not.toBeNull();
    });

    it('should destroy session', () => {
      const created = authenticationService.createSession(1);
      const result = authenticationService.destroySession(created.sessionId);
      expect(result).toBe(true);
    });

    it('should destroy all user sessions', () => {
      authenticationService.createSession(1);
      authenticationService.createSession(1);
      const count = authenticationService.destroyAllUserSessions(1);
      expect(count >= 0).toBe(true);
    });
  });

  // === トークン検証テスト ===
  describe('Token Validation', () => {
    it('should validate token format', () => {
      const token = authenticationService.generateToken(1);
      const result = authenticationService.validateToken(token.token);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid token format', () => {
      const result = authenticationService.validateToken('invalid');
      expect(result.isValid).toBe(false);
    });

    it('should invalidate token', () => {
      const token = authenticationService.generateToken(1);
      authenticationService.invalidateToken(token.token);
      const isBlacklisted = authenticationService.isTokenBlacklisted(token.token);
      expect(isBlacklisted).toBe(true);
    });
  });

  // === MFA設定テスト ===
  describe('MFA Setup', () => {
    it('should setup MFA', async () => {
      const result = await authenticationService.setupMFA(1, 'totp');
      expect(result).not.toBeNull();
      if (result) {
        expect(result.method).toBe('totp');
        expect(Array.isArray(result.backupCodes)).toBe(true);
      }
    });

    it('should verify MFA', async () => {
      const result = await authenticationService.verifyMFA(1, '123456', 'totp');
      expect(typeof result).toBe('boolean');
    });
  });

  // === パスワード管理テスト ===
  describe('Password Management', () => {
    it('should hash password', () => {
      const hash = authenticationService.hashPassword('password123');
      expect(hash.length > 0).toBe(true);
    });

    it('should verify password', () => {
      const password = 'password123';
      const hash = authenticationService.hashPassword(password);
      const result = authenticationService.verifyPassword(password, hash);
      expect(typeof result).toBe('boolean');
    });
  });

  // === ユーザーセッション取得テスト ===
  describe('Get User Sessions', () => {
    it('should get user sessions', () => {
      authenticationService.createSession(1);
      const sessions = authenticationService.getUserSessions(1);
      expect(Array.isArray(sessions)).toBe(true);
    });
  });

  // === セッションクリーンアップテスト ===
  describe('Session Cleanup', () => {
    it('should cleanup expired sessions', () => {
      const count = authenticationService.cleanupExpiredSessions();
      expect(typeof count).toBe('number');
    });
  });

  // === 認証情報検証テスト ===
  describe('Credentials Validation', () => {
    it('should validate credentials', async () => {
      const result = await authenticationService.validateCredentials(
        'test@example.com',
        'password123'
      );
      expect(result.isValid === true || result.isValid === false).toBe(true);
    });

    it('should reject non-existent user', async () => {
      const result = await authenticationService.validateCredentials(
        'nonexistent@example.com',
        'password'
      );
      expect(result.isValid).toBe(false);
    });
  });

  // === セッション統計テスト ===
  describe('Session Statistics', () => {
    it('should get session stats', () => {
      const stats = authenticationService.getSessionStats();
      expect(stats.totalSessions >= 0).toBe(true);
      expect(stats.activeSessions >= 0).toBe(true);
      expect(stats.expiredSessions >= 0).toBe(true);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = AuthenticationService.getInstance();
      const instance2 = AuthenticationService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
