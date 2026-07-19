/**
 * ConversationHistoryService Tests - 会話履歴管理テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationHistoryService, getConversationHistoryService } from './ConversationHistoryService';
import { ChatMessage, ChatSession } from '../core/ChatCoreManager';

describe('ConversationHistoryService', () => {
  let service: ConversationHistoryService;

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
    {
      id: 'msg-3',
      userId: 'user-1',
      role: 'user',
      content: '生産管理について教えてください',
      timestamp: Date.now(),
      metadata: { context: 'manufacturing' },
    },
    {
      id: 'msg-4',
      userId: 'assistant',
      role: 'assistant',
      content: '生産管理は重要なプロセスです。効率化と品質管理が重要です。',
      timestamp: Date.now(),
      metadata: { context: 'manufacturing', confidence: 0.95 },
    },
  ];

  const mockSession: ChatSession = {
    id: 'session-1',
    userId: 'user-1',
    title: 'テストセッション',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 4,
  };

  beforeEach(() => {
    service = new ConversationHistoryService();
  });

  describe('Conversation Storage', () => {
    it('should save conversation', async () => {
      await service.saveConversation('session-1', mockMessages);
      const retrieved = await service.getConversation('session-1');
      expect(retrieved).toEqual(mockMessages);
    });

    it('should retrieve empty array for non-existent session', async () => {
      const retrieved = await service.getConversation('non-existent');
      expect(retrieved).toEqual([]);
    });

    it('should overwrite previous conversation', async () => {
      const messages1 = [mockMessages[0]];
      const messages2 = mockMessages;

      await service.saveConversation('session-1', messages1);
      await service.saveConversation('session-1', messages2);

      const retrieved = await service.getConversation('session-1');
      expect(retrieved).toEqual(messages2);
    });
  });

  describe('Conversation Analysis', () => {
    it('should analyze conversation', async () => {
      const analysis = await service.analyzeConversation(mockMessages);

      expect(analysis).toBeDefined();
      expect(analysis.totalMessages).toBe(4);
      expect(analysis.userMessages).toBe(2);
      expect(analysis.assistantMessages).toBe(2);
    });

    it('should calculate average message length', async () => {
      const analysis = await service.analyzeConversation(mockMessages);
      expect(analysis.averageMessageLength).toBeGreaterThan(0);
    });

    it('should extract topics', async () => {
      const analysis = await service.analyzeConversation(mockMessages);
      expect(analysis.topics).toBeDefined();
      expect(Array.isArray(analysis.topics)).toBe(true);
    });

    it('should analyze sentiment', async () => {
      const analysis = await service.analyzeConversation(mockMessages);
      expect(['positive', 'neutral', 'negative']).toContain(analysis.sentiment);
    });

    it('should calculate engagement score', async () => {
      const analysis = await service.analyzeConversation(mockMessages);
      expect(analysis.engagementScore).toBeGreaterThanOrEqual(0);
      expect(analysis.engagementScore).toBeLessThanOrEqual(100);
    });

    it('should handle empty messages', async () => {
      const analysis = await service.analyzeConversation([]);
      expect(analysis.totalMessages).toBe(0);
      expect(analysis.engagementScore).toBe(0);
    });
  });

  describe('Conversation Summarization', () => {
    it('should summarize conversation', async () => {
      const summary = await service.summarizeConversation('session-1', mockMessages, mockSession);

      expect(summary).toBeDefined();
      expect(summary.sessionId).toBe('session-1');
      expect(summary.title).toBe('テストセッション');
      expect(summary.summary).toBeDefined();
      expect(summary.keyPoints).toBeDefined();
    });

    it('should extract key points', async () => {
      const summary = await service.summarizeConversation('session-1', mockMessages, mockSession);
      expect(Array.isArray(summary.keyPoints)).toBe(true);
    });

    it('should cache summary', async () => {
      const summary1 = await service.summarizeConversation('session-1', mockMessages, mockSession);
      const summary2 = await service.summarizeConversation('session-1', mockMessages, mockSession);

      expect(summary1).toEqual(summary2);
    });

    it('should handle empty messages', async () => {
      const summary = await service.summarizeConversation('session-1', [], mockSession);
      expect(summary.summary).toContain('開始されていません');
    });
  });

  describe('Conversation Context', () => {
    it('should get conversation context', async () => {
      const context = await service.getConversationContext(mockMessages);

      expect(context).toBeDefined();
      expect(context.recentMessages).toBeDefined();
      expect(context.previousTopics).toBeDefined();
      expect(context.userPreferences).toBeDefined();
      expect(context.conversationFlow).toBeDefined();
    });

    it('should include recent messages', async () => {
      const context = await service.getConversationContext(mockMessages, 2);
      expect(context.recentMessages.length).toBeLessThanOrEqual(2);
    });

    it('should extract user preferences', async () => {
      const context = await service.getConversationContext(mockMessages);
      expect(context.userPreferences).toBeDefined();
      expect(context.userPreferences.preferredContext).toBeDefined();
      expect(context.userPreferences.responseLength).toBeDefined();
    });

    it('should analyze conversation flow', async () => {
      const context = await service.getConversationContext(mockMessages);
      expect(context.conversationFlow).toBeDefined();
      expect(context.conversationFlow.length).toBeGreaterThan(0);
    });
  });

  describe('Conversation Clearing', () => {
    it('should clear specific conversation', async () => {
      await service.saveConversation('session-1', mockMessages);
      await service.clearConversation('session-1');

      const retrieved = await service.getConversation('session-1');
      expect(retrieved).toEqual([]);
    });

    it('should clear all conversations', async () => {
      await service.saveConversation('session-1', mockMessages);
      await service.saveConversation('session-2', mockMessages);

      await service.clearAllConversations();

      const retrieved1 = await service.getConversation('session-1');
      const retrieved2 = await service.getConversation('session-2');

      expect(retrieved1).toEqual([]);
      expect(retrieved2).toEqual([]);
    });
  });

  describe('Conversation Statistics', () => {
    it('should get conversation statistics', async () => {
      await service.saveConversation('session-1', mockMessages);
      const stats = await service.getConversationStatistics('session-1');

      expect(stats).toBeDefined();
      expect(stats.sessionId).toBe('session-1');
      expect(stats.totalMessages).toBe(4);
      expect(stats.userMessages).toBe(2);
      expect(stats.assistantMessages).toBe(2);
    });

    it('should include all statistics fields', async () => {
      await service.saveConversation('session-1', mockMessages);
      const stats = await service.getConversationStatistics('session-1');

      expect(stats.totalMessages).toBeDefined();
      expect(stats.userMessages).toBeDefined();
      expect(stats.assistantMessages).toBeDefined();
      expect(stats.averageMessageLength).toBeDefined();
      expect(stats.topics).toBeDefined();
      expect(stats.sentiment).toBeDefined();
      expect(stats.engagementScore).toBeDefined();
      expect(stats.timestamp).toBeDefined();
    });
  });

  describe('Sentiment Analysis', () => {
    it('should detect positive sentiment', async () => {
      const positiveMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          userId: 'user-1',
          role: 'user',
          content: 'これは素晴らしい！最高です！',
          timestamp: Date.now(),
        },
      ];

      const analysis = await service.analyzeConversation(positiveMessages);
      expect(analysis.sentiment).toBe('positive');
    });

    it('should detect negative sentiment', async () => {
      const negativeMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          userId: 'user-1',
          role: 'user',
          content: 'これは悪い。最悪です。困った。',
          timestamp: Date.now(),
        },
      ];

      const analysis = await service.analyzeConversation(negativeMessages);
      expect(analysis.sentiment).toBe('negative');
    });

    it('should detect neutral sentiment', async () => {
      const neutralMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          userId: 'user-1',
          role: 'user',
          content: 'これについて教えてください。',
          timestamp: Date.now(),
        },
      ];

      const analysis = await service.analyzeConversation(neutralMessages);
      expect(analysis.sentiment).toBe('neutral');
    });
  });

  describe('Engagement Scoring', () => {
    it('should score high engagement for long conversations', async () => {
      const longMessages = Array.from({ length: 20 }, (_, i) => ({
        id: `msg-${i}`,
        userId: i % 2 === 0 ? 'user-1' : 'assistant',
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: 'これは長いメッセージです。'.repeat(10),
        timestamp: Date.now(),
      }));

      const analysis = await service.analyzeConversation(longMessages);
      expect(analysis.engagementScore).toBeGreaterThanOrEqual(50);
    });

    it('should score low engagement for short conversations', async () => {
      const shortMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          userId: 'user-1',
          role: 'user',
          content: 'はい',
          timestamp: Date.now(),
        },
      ];

      const analysis = await service.analyzeConversation(shortMessages);
      expect(analysis.engagementScore).toBeLessThan(50);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = getConversationHistoryService();
      const instance2 = getConversationHistoryService();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete conversation workflow', async () => {
      // Save conversation
      await service.saveConversation('session-1', mockMessages);

      // Analyze conversation
      const analysis = await service.analyzeConversation(mockMessages);
      expect(analysis.totalMessages).toBe(4);

      // Summarize conversation
      const summary = await service.summarizeConversation('session-1', mockMessages, mockSession);
      expect(summary.sessionId).toBe('session-1');

      // Get context
      const context = await service.getConversationContext(mockMessages);
      expect(context.recentMessages).toBeDefined();

      // Get statistics
      const stats = await service.getConversationStatistics('session-1');
      expect(stats.totalMessages).toBe(4);

      // Clear conversation
      await service.clearConversation('session-1');
      const retrieved = await service.getConversation('session-1');
      expect(retrieved).toEqual([]);
    });

    it('should maintain data consistency', async () => {
      await service.saveConversation('session-1', mockMessages);

      const retrieved1 = await service.getConversation('session-1');
      const analysis = await service.analyzeConversation(retrieved1);
      const stats = await service.getConversationStatistics('session-1');

      expect(retrieved1.length).toBe(analysis.totalMessages);
      expect(stats.totalMessages).toBe(analysis.totalMessages);
    });
  });
});
