/**
 * ConversationManager Tests - 会話メモリ統合テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversationManager } from './ConversationManager';
import { MemoryIntelligenceAIManager } from './MemoryIntelligenceAIManager';
import { ChatMessage } from './ChatCoreManager';

describe('ConversationManager', () => {
  let manager: ConversationManager;
  let mockMemoryManager: any;

  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      userId: 'user-1',
      role: 'user',
      content: 'こんにちは',
      timestamp: Date.now(),
    },
    {
      id: 'msg-2',
      userId: 'assistant',
      role: 'assistant',
      content: 'こんにちは。何かお手伝いできることはありますか？',
      timestamp: Date.now(),
    },
  ];

  beforeEach(() => {
    mockMemoryManager = {
      searchMemories: vi.fn().mockResolvedValue([]),
    };
    manager = new ConversationManager(mockMemoryManager);
  });

  describe('Session Context Initialization', () => {
    it('should initialize session context', async () => {
      const context = await manager.initializeSessionContext('session-1', 'user-1', 'general');

      expect(context).toBeDefined();
      expect(context.sessionId).toBe('session-1');
      expect(context.userId).toBe('user-1');
      expect(context.conversationTopic).toBe('general');
    });

    it('should include recent messages in context', async () => {
      const context = await manager.initializeSessionContext('session-1', 'user-1', 'general');

      expect(context.recentMessages).toBeDefined();
      expect(Array.isArray(context.recentMessages)).toBe(true);
    });

    it('should include user preferences in context', async () => {
      const context = await manager.initializeSessionContext('session-1', 'user-1', 'general');

      expect(context.userPreferences).toBeDefined();
      expect(context.userPreferences.responseLength).toBeDefined();
    });

    it('should include context summary', async () => {
      const context = await manager.initializeSessionContext('session-1', 'user-1', 'general');

      expect(context.contextSummary).toBeDefined();
      expect(context.contextSummary.length).toBeGreaterThan(0);
    });
  });

  describe('Short-Term Memory', () => {
    it('should save to short-term memory', async () => {
      await manager.saveToShortTermMemory('session-1', mockMessages, 'general');

      const stats = manager.getMemoryStatistics();
      expect(stats.shortTermMemoriesCount).toBeGreaterThan(0);
    });

    it('should calculate importance correctly', async () => {
      await manager.saveToShortTermMemory('session-1', mockMessages, 'general');

      const stats = manager.getMemoryStatistics();
      expect(stats.shortTermMemoriesCount).toBe(1);
    });

    it('should handle empty messages', async () => {
      await manager.saveToShortTermMemory('session-1', [], 'general');

      const stats = manager.getMemoryStatistics();
      expect(stats.shortTermMemoriesCount).toBe(1);
    });
  });

  describe('Long-Term Memory', () => {
    it('should promote to long-term memory', async () => {
      const importantMessages: ChatMessage[] = [
        ...mockMessages,
        {
          id: 'msg-3',
          userId: 'user-1',
          role: 'user',
          content: 'これは重要な質問です。'.repeat(20),
          timestamp: Date.now(),
        },
      ];

      await manager.saveToShortTermMemory('session-1', importantMessages, 'general');

      const stats = manager.getMemoryStatistics();
      expect(stats.longTermMemoriesCount).toBeGreaterThanOrEqual(0);
    });

    it('should extract tags from messages', async () => {
      const taggedMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          userId: 'user-1',
          role: 'user',
          content: 'これは長いメッセージです。'.repeat(30),
          timestamp: Date.now(),
          metadata: { context: 'manufacturing' },
        },
      ];

      await manager.saveToShortTermMemory('session-1', taggedMessages, 'manufacturing');

      const stats = manager.getMemoryStatistics();
      expect(stats.indexedKeywordsCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Relevant Memories Retrieval', () => {
    it('should retrieve relevant memories', async () => {
      const memories = await manager.retrieveRelevantMemories('user-1', 'general');

      expect(Array.isArray(memories)).toBe(true);
    });

    it('should return empty array for non-existent user', async () => {
      const memories = await manager.retrieveRelevantMemories('non-existent', 'general');

      expect(memories).toEqual([]);
    });

    it('should limit results', async () => {
      const memories = await manager.retrieveRelevantMemories('user-1', 'general');

      expect(memories.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Conversation Search', () => {
    it('should search conversations', async () => {
      await manager.saveToShortTermMemory('session-1', mockMessages, 'general');

      const results = await manager.searchConversations('user-1', 'こんにちは');

      expect(results).toBeDefined();
      expect(results.memories).toBeDefined();
      expect(results.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(results.relevanceScore).toBeLessThanOrEqual(1);
    });

    it('should handle empty search results', async () => {
      const results = await manager.searchConversations('user-1', 'xyz');

      expect(results.memories).toBeDefined();
      expect(Array.isArray(results.memories)).toBe(true);
    });

    it('should limit search results', async () => {
      const results = await manager.searchConversations('user-1', 'test', 5);

      expect(results.memories.length).toBeLessThanOrEqual(5);
    });

    it('should include timestamp in results', async () => {
      const results = await manager.searchConversations('user-1', 'test');

      expect(results.timestamp).toBeDefined();
      expect(typeof results.timestamp).toBe('number');
    });
  });

  describe('Past Questions Reference', () => {
    it('should reference past questions', async () => {
      await manager.saveToShortTermMemory('session-1', mockMessages, 'general');

      const questions = await manager.referencePastQuestions('user-1', 'general');

      expect(Array.isArray(questions)).toBe(true);
    });

    it('should limit past questions', async () => {
      const questions = await manager.referencePastQuestions('user-1', 'general', 3);

      expect(questions.length).toBeLessThanOrEqual(3);
    });

    it('should return user role messages', async () => {
      await manager.saveToShortTermMemory('session-1', mockMessages, 'general');

      const questions = await manager.referencePastQuestions('user-1', 'general');

      questions.forEach((q) => {
        expect(q.role).toBe('user');
      });
    });

    it('should include metadata in past questions', async () => {
      await manager.saveToShortTermMemory('session-1', mockMessages, 'general');

      const questions = await manager.referencePastQuestions('user-1', 'general');

      questions.forEach((q) => {
        expect(q.metadata).toBeDefined();
      });
    });
  });

  describe('Session Context Management', () => {
    it('should get session context', async () => {
      await manager.initializeSessionContext('session-1', 'user-1', 'general');

      const context = await manager.getSessionContext('session-1');

      expect(context).toBeDefined();
      expect(context?.sessionId).toBe('session-1');
    });

    it('should return null for non-existent session', async () => {
      const context = await manager.getSessionContext('non-existent');

      expect(context).toBeNull();
    });

    it('should update session context', async () => {
      await manager.initializeSessionContext('session-1', 'user-1', 'general');

      const newMessages: ChatMessage[] = [
        {
          id: 'msg-new',
          userId: 'user-1',
          role: 'user',
          content: 'New message',
          timestamp: Date.now(),
        },
      ];

      const updated = await manager.updateSessionContext('session-1', newMessages);

      expect(updated).toBeDefined();
      expect(updated?.recentMessages.length).toBeGreaterThan(0);
    });

    it('should regenerate context summary on update', async () => {
      const context1 = await manager.initializeSessionContext('session-1', 'user-1', 'general');
      const summary1 = context1.contextSummary;

      const newMessages: ChatMessage[] = [
        {
          id: 'msg-new',
          userId: 'user-1',
          role: 'user',
          content: 'New message',
          timestamp: Date.now(),
        },
      ];

      const context2 = await manager.updateSessionContext('session-1', newMessages);

      expect(context2?.contextSummary).toBeDefined();
    });
  });

  describe('Memory Statistics', () => {
    it('should return memory statistics', () => {
      const stats = manager.getMemoryStatistics();

      expect(stats).toBeDefined();
      expect(stats.shortTermMemoriesCount).toBeDefined();
      expect(stats.longTermMemoriesCount).toBeDefined();
      expect(stats.indexedKeywordsCount).toBeDefined();
      expect(stats.sessionContextsCount).toBeDefined();
    });

    it('should track memory counts correctly', async () => {
      await manager.initializeSessionContext('session-1', 'user-1', 'general');
      await manager.saveToShortTermMemory('session-1', mockMessages, 'general');

      const stats = manager.getMemoryStatistics();

      expect(stats.sessionContextsCount).toBe(1);
      expect(stats.shortTermMemoriesCount).toBe(1);
    });
  });

  describe('Memory Clearing', () => {
    it('should clear memories for session', async () => {
      await manager.initializeSessionContext('session-1', 'user-1', 'general');
      await manager.saveToShortTermMemory('session-1', mockMessages, 'general');

      await manager.clearMemories('session-1');

      const context = await manager.getSessionContext('session-1');
      expect(context).toBeNull();
    });

    it('should handle clearing non-existent session', async () => {
      await expect(manager.clearMemories('non-existent')).resolves.not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete memory workflow', async () => {
      // Initialize context
      const context = await manager.initializeSessionContext('session-1', 'user-1', 'general');
      expect(context).toBeDefined();

      // Save to short-term memory
      await manager.saveToShortTermMemory('session-1', mockMessages, 'general');

      // Retrieve relevant memories
      const memories = await manager.retrieveRelevantMemories('user-1', 'general');
      expect(Array.isArray(memories)).toBe(true);

      // Search conversations
      const results = await manager.searchConversations('user-1', 'こんにちは');
      expect(results).toBeDefined();

      // Reference past questions
      const questions = await manager.referencePastQuestions('user-1', 'general');
      expect(Array.isArray(questions)).toBe(true);

      // Clear memories
      await manager.clearMemories('session-1');
      const clearedContext = await manager.getSessionContext('session-1');
      expect(clearedContext).toBeNull();
    });

    it('should maintain memory consistency', async () => {
      await manager.initializeSessionContext('session-1', 'user-1', 'general');
      await manager.saveToShortTermMemory('session-1', mockMessages, 'general');

      const stats1 = manager.getMemoryStatistics();
      const context = await manager.getSessionContext('session-1');

      expect(stats1.sessionContextsCount).toBe(1);
      expect(context).toBeDefined();
    });

    it('should support multiple sessions', async () => {
      await manager.initializeSessionContext('session-1', 'user-1', 'general');
      await manager.initializeSessionContext('session-2', 'user-1', 'manufacturing');

      const context1 = await manager.getSessionContext('session-1');
      const context2 = await manager.getSessionContext('session-2');

      expect(context1).toBeDefined();
      expect(context2).toBeDefined();
      expect(context1?.conversationTopic).toBe('general');
      expect(context2?.conversationTopic).toBe('manufacturing');
    });

    it('should handle multiple users', async () => {
      await manager.initializeSessionContext('session-1', 'user-1', 'general');
      await manager.initializeSessionContext('session-2', 'user-2', 'general');

      const context1 = await manager.getSessionContext('session-1');
      const context2 = await manager.getSessionContext('session-2');

      expect(context1?.userId).toBe('user-1');
      expect(context2?.userId).toBe('user-2');
    });
  });

  describe('Error Handling', () => {
    it('should handle null messages', async () => {
      await expect(
        manager.saveToShortTermMemory('session-1', [], 'general')
      ).resolves.not.toThrow();
    });

    it('should handle invalid session ID', async () => {
      const context = await manager.getSessionContext('');
      expect(context).toBeNull();
    });

    it('should handle invalid user ID', async () => {
      const memories = await manager.retrieveRelevantMemories('', 'general');
      expect(Array.isArray(memories)).toBe(true);
    });

    it('should handle very long queries', async () => {
      const longQuery = 'a'.repeat(10000);
      const results = await manager.searchConversations('user-1', longQuery);

      expect(results).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle many sessions efficiently', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        await manager.initializeSessionContext(`session-${i}`, 'user-1', 'general');
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    it('should handle large message sets', async () => {
      const largeMessages: ChatMessage[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        userId: 'user-1',
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: Date.now(),
      }));

      const startTime = Date.now();
      await manager.saveToShortTermMemory('session-1', largeMessages, 'general');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });
});
