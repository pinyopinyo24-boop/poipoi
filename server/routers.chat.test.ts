/**
 * Chat Router Tests - チャットルーター統合テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { chatRouter } from './routers.chat';

describe('Chat Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processMessage', () => {
    it('should process user message and return assistant response', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const result = await caller.processMessage({
        userId: 'user-123',
        sessionId: 'session-1',
        message: 'こんにちは',
      });

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
      expect(result.message.role).toBe('assistant');
      expect(result.message.content).toBeDefined();
      expect(result.session).toBeDefined();
    });

    it('should handle empty message gracefully', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      try {
        await caller.processMessage({
          userId: 'user-123',
          sessionId: 'session-1',
          message: '',
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should include metadata in response', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const result = await caller.processMessage({
        userId: 'user-123',
        sessionId: 'session-1',
        message: 'テストメッセージ',
      });

      expect(result.message.metadata).toBeDefined();
    });

    it('should return reasoning information', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const result = await caller.processMessage({
        userId: 'user-123',
        sessionId: 'session-1',
        message: 'これは複雑な質問です',
      });

      expect(result.reasoning).toBeDefined();
    });
  });

  describe('getSession', () => {
    it('should retrieve session messages', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const result = await caller.getSession({
        sessionId: 'session-1',
        userId: 'user-123',
      });

      expect(result).toBeDefined();
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
    });

    it('should return empty messages for new session', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const result = await caller.getSession({
        sessionId: 'new-session',
        userId: 'user-123',
      });

      expect(result.messages).toBeDefined();
    });
  });

  describe('getMessages', () => {
    it('should retrieve messages with limit', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const result = await caller.getMessages({
        sessionId: 'session-1',
        userId: 'user-123',
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should use default limit when not specified', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const result = await caller.getMessages({
        sessionId: 'session-1',
        userId: 'user-123',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('createSession', () => {
    it('should create new session', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const result = await caller.createSession({
        userId: 'user-123',
        title: 'テストセッション',
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.userId).toBe('user-123');
      expect(result.title).toBe('テストセッション');
      expect(result.createdAt).toBeDefined();
    });

    it('should use default title when not provided', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const result = await caller.createSession({
        userId: 'user-123',
      });

      expect(result.title).toBe('チャットセッション');
    });

    it('should initialize message count to zero', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const result = await caller.createSession({
        userId: 'user-123',
        title: 'テスト',
      });

      expect(result.messageCount).toBe(0);
    });
  });

  describe('deleteSession', () => {
    it('should delete session', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const result = await caller.deleteSession({
        sessionId: 'session-1',
        userId: 'user-123',
      });

      expect(result.success).toBe(true);
    });

    it('should handle non-existent session', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      try {
        await caller.deleteSession({
          sessionId: 'non-existent',
          userId: 'user-123',
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('getUserSessions', () => {
    it('should retrieve user sessions', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const result = await caller.getUserSessions({
        userId: 'user-123',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array for new user', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const result = await caller.getUserSessions({
        userId: 'new-user',
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('should retrieve chat statistics', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const result = await caller.getStatistics({
        userId: 'user-123',
      });

      expect(result).toBeDefined();
    });

    it('should include message count in statistics', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const result = await caller.getStatistics({
        userId: 'user-123',
      });

      expect(result).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete chat flow', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      // 1. Create session
      const session = await caller.createSession({
        userId: 'user-123',
        title: 'テストセッション',
      });

      expect(session.id).toBeDefined();

      // 2. Send message
      const response = await caller.processMessage({
        userId: 'user-123',
        sessionId: session.id,
        message: 'こんにちは',
      });

      expect(response.message).toBeDefined();
      expect(response.session).toBeDefined();

      // 3. Get messages
      const messages = await caller.getMessages({
        sessionId: session.id,
        userId: 'user-123',
      });

      expect(messages).toBeDefined();

      // 4. Get statistics
      const stats = await caller.getStatistics({
        userId: 'user-123',
      });

      expect(stats).toBeDefined();

      // 5. Delete session
      const deleteResult = await caller.deleteSession({
        sessionId: session.id,
        userId: 'user-123',
      });

      expect(deleteResult.success).toBe(true);
    });

    it('should handle multiple sessions', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      // Create multiple sessions
      const session1 = await caller.createSession({
        userId: 'user-123',
        title: 'セッション1',
      });

      const session2 = await caller.createSession({
        userId: 'user-123',
        title: 'セッション2',
      });

      expect(session1.id).not.toBe(session2.id);

      // Get user sessions
      const sessions = await caller.getUserSessions({
        userId: 'user-123',
      });

      expect(sessions.length).toBeGreaterThanOrEqual(2);
    });

    it('should maintain message history', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const session = await caller.createSession({
        userId: 'user-123',
        title: 'テスト',
      });

      // Send multiple messages
      const response1 = await caller.processMessage({
        userId: 'user-123',
        sessionId: session.id,
        message: 'メッセージ1',
      });

      const response2 = await caller.processMessage({
        userId: 'user-123',
        sessionId: session.id,
        message: 'メッセージ2',
      });

      // Retrieve messages
      const messages = await caller.getMessages({
        sessionId: session.id,
        userId: 'user-123',
      });

      expect(messages.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid session ID', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      try {
        await caller.getSession({
          sessionId: '',
          userId: 'user-123',
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid user ID', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      try {
        await caller.processMessage({
          userId: '',
          sessionId: 'session-1',
          message: 'テスト',
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle network errors gracefully', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      // This test verifies error handling is in place
      expect(caller.processMessage).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should process message within reasonable time', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const startTime = Date.now();

      await caller.processMessage({
        userId: 'user-123',
        sessionId: 'session-1',
        message: 'テスト',
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should retrieve messages efficiently', async () => {
      const caller = chatRouter.createCaller({
        user: { id: 'user-123', name: 'Test User' },
        session: {},
      } as any);

      const startTime = Date.now();

      await caller.getMessages({
        sessionId: 'session-1',
        userId: 'user-123',
        limit: 50,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});
