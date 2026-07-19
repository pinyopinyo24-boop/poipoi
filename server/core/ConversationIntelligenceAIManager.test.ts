/**
 * ConversationIntelligenceAIManager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationIntelligenceAIManager } from './ConversationIntelligenceAIManager';
import { ChatMessage } from './ChatCoreManager';

describe('ConversationIntelligenceAIManager', () => {
  let manager: ConversationIntelligenceAIManager;

  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      userId: 'user-1',
      role: 'user',
      content: '生産管理について質問があります',
      timestamp: Date.now(),
    },
    {
      id: 'msg-2',
      userId: 'assistant',
      role: 'assistant',
      content: '生産管理についてお答えします。効率化が重要です。',
      timestamp: Date.now(),
    },
  ];

  beforeEach(() => {
    manager = new ConversationIntelligenceAIManager();
  });

  describe('Intent Recognition', () => {
    it('should recognize question intent', async () => {
      const intent = await manager.recognizeIntent('これは何ですか？');
      expect(intent.primary).toBe('question');
    });

    it('should recognize help request intent', async () => {
      const intent = await manager.recognizeIntent('助けてください');
      expect(intent.primary).toBe('help_request');
    });

    it('should recognize information request intent', async () => {
      const intent = await manager.recognizeIntent('情報を教えてください');
      expect(intent.primary).toBe('information_request');
    });

    it('should recognize advice request intent', async () => {
      const intent = await manager.recognizeIntent('アドバイスをください');
      expect(intent.primary).toBe('advice_request');
    });

    it('should recognize action request intent', async () => {
      const intent = await manager.recognizeIntent('実行してください');
      expect(intent.primary).toBe('action_request');
    });

    it('should calculate confidence score', async () => {
      const intent = await manager.recognizeIntent('これは長いメッセージです。'.repeat(5));
      expect(intent.confidence).toBeGreaterThan(0);
      expect(intent.confidence).toBeLessThanOrEqual(1);
    });

    it('should extract secondary intents', async () => {
      const intent = await manager.recognizeIntent('これは緊急で重要な質問です');
      expect(intent.secondary).toContain('urgent');
      expect(intent.secondary).toContain('important');
    });

    it('should analyze sentiment', async () => {
      const positiveIntent = await manager.recognizeIntent('これは素晴らしいです！');
      expect(positiveIntent.sentiment).toBe('positive');

      const negativeIntent = await manager.recognizeIntent('これは悪いです');
      expect(negativeIntent.sentiment).toBe('negative');
    });
  });

  describe('Context Update', () => {
    it('should update context with new message', async () => {
      const message: ChatMessage = {
        id: 'msg-1',
        userId: 'user-1',
        role: 'user',
        content: '質問があります',
        timestamp: Date.now(),
      };

      const context = await manager.updateContext('session-1', 'user-1', message);

      expect(context).toBeDefined();
      expect(context.sessionId).toBe('session-1');
      expect(context.userId).toBe('user-1');
    });

    it('should track conversation history', async () => {
      const message: ChatMessage = {
        id: 'msg-1',
        userId: 'user-1',
        role: 'user',
        content: 'テストメッセージ',
        timestamp: Date.now(),
      };

      const context = await manager.updateContext('session-1', 'user-1', message);

      expect(context.conversationHistory.length).toBeGreaterThan(0);
      expect(context.conversationHistory[0]).toEqual(message);
    });

    it('should detect topic changes', async () => {
      const message1: ChatMessage = {
        id: 'msg-1',
        userId: 'user-1',
        role: 'user',
        content: '生産について',
        timestamp: Date.now(),
      };

      const context1 = await manager.updateContext('session-1', 'user-1', message1);
      expect(context1.currentTopic).toBe('manufacturing');

      const message2: ChatMessage = {
        id: 'msg-2',
        userId: 'user-1',
        role: 'user',
        content: 'デザインについて',
        timestamp: Date.now(),
      };

      const context2 = await manager.updateContext('session-1', 'user-1', message2, context1);
      expect(context2.currentTopic).toBe('creative');
      expect(context2.previousTopics).toContain('manufacturing');
    });

    it('should generate context summary', async () => {
      const message: ChatMessage = {
        id: 'msg-1',
        userId: 'user-1',
        role: 'user',
        content: '質問があります',
        timestamp: Date.now(),
      };

      const context = await manager.updateContext('session-1', 'user-1', message);

      expect(context.contextSummary).toBeDefined();
      expect(context.contextSummary.length).toBeGreaterThan(0);
    });

    it('should limit conversation history to 10 messages', async () => {
      let context: any;

      for (let i = 0; i < 15; i++) {
        const message: ChatMessage = {
          id: `msg-${i}`,
          userId: 'user-1',
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: Date.now(),
        };

        context = await manager.updateContext('session-1', 'user-1', message, context);
      }

      expect(context.conversationHistory.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Conversation Summarization', () => {
    it('should summarize conversation', async () => {
      const summary = await manager.summarizeConversation('session-1', mockMessages);

      expect(summary).toBeDefined();
      expect(summary.sessionId).toBe('session-1');
      expect(summary.title).toBeDefined();
      expect(summary.summary).toBeDefined();
    });

    it('should extract key points', async () => {
      const summary = await manager.summarizeConversation('session-1', mockMessages);

      expect(Array.isArray(summary.keyPoints)).toBe(true);
    });

    it('should extract topics', async () => {
      const summary = await manager.summarizeConversation('session-1', mockMessages);

      expect(Array.isArray(summary.topics)).toBe(true);
    });

    it('should analyze overall sentiment', async () => {
      const summary = await manager.summarizeConversation('session-1', mockMessages);

      expect(['positive', 'neutral', 'negative']).toContain(summary.sentiment);
    });

    it('should calculate conversation duration', async () => {
      const summary = await manager.summarizeConversation('session-1', mockMessages);

      expect(summary.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty messages', async () => {
      const summary = await manager.summarizeConversation('session-1', []);

      expect(summary.title).toBe('空の会話');
      expect(summary.keyPoints).toEqual([]);
    });
  });

  describe('Topic Flow Tracking', () => {
    it('should get topic flow', async () => {
      const flow = await manager.getTopicFlow('user-1');

      expect(flow).toBeDefined();
      expect(flow.currentTopic).toBe('general');
      expect(Array.isArray(flow.topics)).toBe(true);
    });

    it('should track topic transitions', async () => {
      const flow1 = await manager.getTopicFlow('user-1');
      expect(flow1.currentTopic).toBe('general');

      // Simulate topic change
      const message: ChatMessage = {
        id: 'msg-1',
        userId: 'user-1',
        role: 'user',
        content: '生産について',
        timestamp: Date.now(),
      };

      await manager.updateContext('session-1', 'user-1', message);

      const flow2 = await manager.getTopicFlow('user-1');
      expect(flow2).toBeDefined();
    });
  });

  describe('Follow-Up Questions', () => {
    it('should generate follow-up questions', async () => {
      const message: ChatMessage = {
        id: 'msg-1',
        userId: 'user-1',
        role: 'user',
        content: '生産管理について質問があります',
        timestamp: Date.now(),
      };

      const context = await manager.updateContext('session-1', 'user-1', message);
      const questions = await manager.generateFollowUpQuestions(context, message);

      expect(Array.isArray(questions)).toBe(true);
    });

    it('should include relevance score', async () => {
      const message: ChatMessage = {
        id: 'msg-1',
        userId: 'user-1',
        role: 'user',
        content: '生産管理について',
        timestamp: Date.now(),
      };

      const context = await manager.updateContext('session-1', 'user-1', message);
      const questions = await manager.generateFollowUpQuestions(context, message);

      questions.forEach((q) => {
        expect(q.relevance).toBeGreaterThanOrEqual(0);
        expect(q.relevance).toBeLessThanOrEqual(1);
      });
    });

    it('should limit to 3 questions', async () => {
      const message: ChatMessage = {
        id: 'msg-1',
        userId: 'user-1',
        role: 'user',
        content: 'テスト',
        timestamp: Date.now(),
      };

      const context = await manager.updateContext('session-1', 'user-1', message);
      const questions = await manager.generateFollowUpQuestions(context, message);

      expect(questions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Conversation Validation', () => {
    it('should validate conversation', async () => {
      const result = await manager.validateConversation(mockMessages);

      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should detect empty conversation', async () => {
      const result = await manager.validateConversation([]);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('会話にメッセージがありません');
    });

    it('should detect missing user messages', async () => {
      const assistantOnly: ChatMessage[] = [
        {
          id: 'msg-1',
          userId: 'assistant',
          role: 'assistant',
          content: 'こんにちは',
          timestamp: Date.now(),
        },
      ];

      const result = await manager.validateConversation(assistantOnly);

      expect(result.issues).toContain('ユーザーメッセージがありません');
    });

    it('should suggest improvements', async () => {
      const shortMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          userId: 'user-1',
          role: 'user',
          content: 'hi',
          timestamp: Date.now(),
        },
        {
          id: 'msg-2',
          userId: 'assistant',
          role: 'assistant',
          content: 'ok',
          timestamp: Date.now(),
        },
      ];

      const result = await manager.validateConversation(shortMessages);

      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Entity Extraction', () => {
    it('should extract entities from message', async () => {
      const intent = await manager.recognizeIntent('John Smith is a developer');

      expect(intent.entities).toBeDefined();
      expect(Array.isArray(intent.entities)).toBe(true);
    });

    it('should include entity confidence', async () => {
      const intent = await manager.recognizeIntent('Test entity extraction');

      intent.entities.forEach((entity) => {
        expect(entity.confidence).toBeGreaterThanOrEqual(0);
        expect(entity.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Context Management', () => {
    it('should clear context', () => {
      manager.clearContext('session-1');
      // Should not throw
      expect(true).toBe(true);
    });

    it('should get statistics', () => {
      const stats = manager.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.cachedContextsCount).toBeDefined();
      expect(stats.intentHistoryCount).toBeDefined();
      expect(stats.topicFlowsCount).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete conversation flow', async () => {
      // Recognize intent
      const intent = await manager.recognizeIntent('生産管理について質問があります');
      expect(intent.primary).toBe('question');

      // Update context
      const message: ChatMessage = {
        id: 'msg-1',
        userId: 'user-1',
        role: 'user',
        content: '生産管理について質問があります',
        timestamp: Date.now(),
      };

      const context = await manager.updateContext('session-1', 'user-1', message);
      expect(context.currentTopic).toBe('manufacturing');

      // Generate follow-up questions
      const questions = await manager.generateFollowUpQuestions(context, message);
      expect(Array.isArray(questions)).toBe(true);

      // Validate conversation
      const validation = await manager.validateConversation([message]);
      expect(validation.isValid).toBe(false); // Only one message
    });

    it('should handle multiple turns', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          userId: 'user-1',
          role: 'user',
          content: '生産について',
          timestamp: Date.now(),
        },
        {
          id: 'msg-2',
          userId: 'assistant',
          role: 'assistant',
          content: '生産管理について説明します',
          timestamp: Date.now(),
        },
        {
          id: 'msg-3',
          userId: 'user-1',
          role: 'user',
          content: 'もっと詳しく',
          timestamp: Date.now(),
        },
      ];

      let context: any;
      for (const msg of messages) {
        context = await manager.updateContext('session-1', 'user-1', msg, context);
      }

      expect(context.conversationHistory.length).toBe(3);

      const summary = await manager.summarizeConversation('session-1', messages);
      expect(summary.keyPoints.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Tests', () => {
    it('should process intent recognition quickly', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        await manager.recognizeIntent(`Message ${i}`);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    it('should handle large conversations', async () => {
      const messages: ChatMessage[] = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        userId: 'user-1',
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: Date.now(),
      }));

      const startTime = Date.now();
      const summary = await manager.summarizeConversation('session-1', messages);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
      expect(summary).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty message', async () => {
      const intent = await manager.recognizeIntent('');
      expect(intent).toBeDefined();
    });

    it('should handle very long message', async () => {
      const longMessage = 'a'.repeat(10000);
      const intent = await manager.recognizeIntent(longMessage);
      expect(intent).toBeDefined();
    });

    it('should handle null context', async () => {
      const message: ChatMessage = {
        id: 'msg-1',
        userId: 'user-1',
        role: 'user',
        content: 'test',
        timestamp: Date.now(),
      };

      const context = await manager.updateContext('session-1', 'user-1', message, undefined);
      expect(context).toBeDefined();
    });
  });
});
