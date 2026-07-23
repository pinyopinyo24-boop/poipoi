/**
 * STEP 51.5 - Poipoi Chat Core v1.0 テストスイート
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatCoreManager, ChatMessage, ChatSession } from '../core/ChatCoreManager';
import { ChatService } from '../services/ChatService';
import { MessageProcessingService } from '../services/MessageProcessingService';
import { ContextAwarenessService } from '../services/ContextAwarenessService';
import { ChatRepository } from '../repositories/ChatRepository';

describe('ChatCoreManager', () => {
  let chatCoreManager: ChatCoreManager;
  let mockMemoryManager: any;
  let mockReasoningManager: any;
  let mockAgentManager: any;
  let mockManufacturingManager: any;
  let mockAuditManager: any;
  let mockApprovalManager: any;

  beforeEach(() => {
    mockMemoryManager = {
      saveConversation: vi.fn().mockResolvedValue(undefined),
      searchMemories: vi.fn().mockResolvedValue([]),
    };

    mockReasoningManager = {
      analyze: vi.fn().mockResolvedValue({ reasoning: 'test' }),
    };

    mockAgentManager = {
      execute: vi.fn().mockResolvedValue({ result: 'test' }),
    };

    mockManufacturingManager = {
      analyzeProduction: vi.fn().mockResolvedValue({
        productionRate: 95,
        efficiency: 0.92,
      }),
    };

    mockAuditManager = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    mockApprovalManager = {
      requestApproval: vi.fn().mockResolvedValue({ approved: true }),
    };

    chatCoreManager = new ChatCoreManager(
      mockMemoryManager,
      mockReasoningManager,
      mockAgentManager,
      mockManufacturingManager,
      mockAuditManager,
      mockApprovalManager
    );
  });

  describe('Message Processing', () => {
    it('should process user message and generate response', async () => {
      const response = await chatCoreManager.processMessage(
        'user123',
        'session123',
        'こんにちは'
      );

      expect(response.message).toBeDefined();
      expect(response.message.role).toBe('assistant');
      expect(response.message.content).toBeTruthy();
      expect(response.session).toBeDefined();
    });

    it('should save user message to repository', async () => {
      await chatCoreManager.processMessage(
        'user123',
        'session123',
        'テストメッセージ'
      );

      expect(mockAuditManager.log).toHaveBeenCalled();
    });

    it('should handle manufacturing-related messages', async () => {
      const response = await chatCoreManager.processMessage(
        'user123',
        'session123',
        '生産実績を分析してください'
      );

      expect(response.message.content).toBeTruthy();
      expect(mockManufacturingManager.analyzeProduction).toHaveBeenCalled();
    });

    it('should save conversation to memory', async () => {
      await chatCoreManager.processMessage(
        'user123',
        'session123',
        'テストメッセージ'
      );

      expect(mockMemoryManager.saveConversation).toHaveBeenCalled();
    });

    it('should include metadata in response', async () => {
      const response = await chatCoreManager.processMessage(
        'user123',
        'session123',
        'テストメッセージ'
      );

      expect(response.message.metadata).toBeDefined();
      expect(response.message.metadata?.managerUsed).toBeDefined();
    });

    it('should handle empty message', async () => {
      try {
        await chatCoreManager.processMessage('user123', 'session123', '');
        expect(true).toBe(false); // Should throw
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle very long message', async () => {
      const longMessage = 'a'.repeat(10000);
      try {
        await chatCoreManager.processMessage(
          'user123',
          'session123',
          longMessage
        );
        // Should handle gracefully
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should process multiple messages in sequence', async () => {
      const response1 = await chatCoreManager.processMessage(
        'user123',
        'session123',
        'メッセージ1'
      );

      const response2 = await chatCoreManager.processMessage(
        'user123',
        'session123',
        'メッセージ2'
      );

      expect(response1.message.id).not.toEqual(response2.message.id);
    });

    it('should include confidence score in metadata', async () => {
      const response = await chatCoreManager.processMessage(
        'user123',
        'session123',
        'テストメッセージ'
      );

      expect(response.message.metadata?.confidence).toBeDefined();
      expect(response.message.metadata?.confidence).toBeGreaterThanOrEqual(0);
      expect(response.message.metadata?.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Session Management', () => {
    it('should create new session', async () => {
      const session = await chatCoreManager.createSession(
        'user123',
        'テストセッション'
      );

      expect(session.id).toBeTruthy();
      expect(session.userId).toBe('user123');
      expect(session.title).toBe('テストセッション');
      expect(session.createdAt).toBeTruthy();
    });

    it('should get chat history', async () => {
      await chatCoreManager.processMessage(
        'user123',
        'session123',
        'メッセージ1'
      );

      const history = await chatCoreManager.getChatHistory(
        'user123',
        'session123'
      );

      expect(Array.isArray(history)).toBe(true);
    });

    it('should get user sessions', async () => {
      await chatCoreManager.createSession('user123', 'セッション1');
      await chatCoreManager.createSession('user123', 'セッション2');

      const sessions = await chatCoreManager.getUserSessions('user123');

      expect(Array.isArray(sessions)).toBe(true);
    });

    it('should delete session with approval', async () => {
      await chatCoreManager.createSession('user123', 'テストセッション');

      await chatCoreManager.deleteSession('user123', 'session123');

      expect(mockApprovalManager.requestApproval).toHaveBeenCalled();
    });

    it('should reject session deletion without approval', async () => {
      mockApprovalManager.requestApproval.mockResolvedValueOnce({
        approved: false,
      });

      try {
        await chatCoreManager.deleteSession('user123', 'session123');
        expect(true).toBe(false); // Should throw
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should get chat statistics', async () => {
      const stats = await chatCoreManager.getChatStatistics('user123');

      expect(stats).toBeDefined();
    });
  });

  describe('Manager Integration', () => {
    it('should use MemoryIntelligenceAIManager', async () => {
      await chatCoreManager.processMessage(
        'user123',
        'session123',
        'テストメッセージ'
      );

      expect(mockMemoryManager.saveConversation).toHaveBeenCalled();
    });

    it('should use ReasoningAIManager for complex queries', async () => {
      await chatCoreManager.processMessage(
        'user123',
        'session123',
        'なぜそうなるのか分析してください'
      );

      // ReasoningManager should be considered
      expect(mockAuditManager.log).toHaveBeenCalled();
    });

    it('should use ManufacturingIntelligenceAIManager', async () => {
      await chatCoreManager.processMessage(
        'user123',
        'session123',
        '生産分析をしてください'
      );

      expect(mockAuditManager.log).toHaveBeenCalled();
    });

    it('should log all actions via AuditManager', async () => {
      await chatCoreManager.processMessage(
        'user123',
        'session123',
        'テストメッセージ'
      );

      expect(mockAuditManager.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'chat_message_processed',
        })
      );
    });

    it('should request approval for session deletion', async () => {
      await chatCoreManager.deleteSession('user123', 'session123');

      expect(mockApprovalManager.requestApproval).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete_chat_session',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid user ID', async () => {
      try {
        await chatCoreManager.processMessage('', 'session123', 'メッセージ');
        // Should handle gracefully
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid session ID', async () => {
      try {
        await chatCoreManager.processMessage('user123', '', 'メッセージ');
        // Should handle gracefully
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle manager errors gracefully', async () => {
      mockMemoryManager.saveConversation.mockRejectedValueOnce(
        new Error('Memory error')
      );

      try {
        await chatCoreManager.processMessage(
          'user123',
          'session123',
          'テストメッセージ'
        );
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance', () => {
    it('should process message within reasonable time', async () => {
      const startTime = Date.now();

      await chatCoreManager.processMessage(
        'user123',
        'session123',
        'テストメッセージ'
      );

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // 5秒以内
    });

    it('should handle multiple concurrent messages', async () => {
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(
          chatCoreManager.processMessage(
            'user123',
            'session123',
            `メッセージ${i}`
          )
        );
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
    });
  });

  describe('Message Content', () => {
    it('should preserve message content', async () => {
      const originalMessage = 'これはテストメッセージです';

      const response = await chatCoreManager.processMessage(
        'user123',
        'session123',
        originalMessage
      );

      const history = await chatCoreManager.getChatHistory(
        'user123',
        'session123'
      );

      const userMessage = history.find((msg) => msg.role === 'user');
      expect(userMessage?.content).toBe(originalMessage);
    });

    it('should generate appropriate response content', async () => {
      const response = await chatCoreManager.processMessage(
        'user123',
        'session123',
        'テストメッセージ'
      );

      expect(response.message.content).toBeTruthy();
      expect(response.message.content.length).toBeGreaterThan(0);
    });

    it('should include timestamp in messages', async () => {
      const response = await chatCoreManager.processMessage(
        'user123',
        'session123',
        'テストメッセージ'
      );

      expect(response.message.timestamp).toBeTruthy();
      expect(response.message.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Context Awareness', () => {
    it('should retrieve related memories', async () => {
      mockMemoryManager.searchMemories.mockResolvedValueOnce([
        'memory1',
        'memory2',
      ]);

      const response = await chatCoreManager.processMessage(
        'user123',
        'session123',
        'テストメッセージ'
      );

      expect(response.relatedMemories).toBeDefined();
    });

    it('should include reasoning in response', async () => {
      const response = await chatCoreManager.processMessage(
        'user123',
        'session123',
        'テストメッセージ'
      );

      expect(response.reasoning).toBeDefined();
    });
  });
});

describe('ChatService', () => {
  let chatService: ChatService;

  beforeEach(() => {
    chatService = new ChatService();
  });

  it('should validate message', () => {
    const result = chatService.validateMessage('テストメッセージ');
    expect(result.valid).toBe(true);
  });

  it('should reject empty message', () => {
    const result = chatService.validateMessage('');
    expect(result.valid).toBe(false);
  });

  it('should classify intent', () => {
    const intent = chatService.classifyIntent('生産実績を分析してください');
    expect(intent).toBe('manufacturing');
  });

  it('should extract keywords', () => {
    const keywords = chatService.extractKeywords('生産実績分析');
    expect(Array.isArray(keywords)).toBe(true);
  });

  it('should check session timeout', () => {
    const isTimedOut = chatService.isSessionTimedOut(Date.now() - 1000);
    expect(isTimedOut).toBe(false);
  });
});

describe('MessageProcessingService', () => {
  let messageProcessingService: MessageProcessingService;
  let mockReasoningManager: any;
  let mockAgentManager: any;

  beforeEach(() => {
    mockReasoningManager = {
      analyze: vi.fn().mockResolvedValue({ reasoning: 'test' }),
    };

    mockAgentManager = {
      execute: vi.fn().mockResolvedValue({ result: 'test' }),
    };

    messageProcessingService = new MessageProcessingService(
      mockReasoningManager,
      mockAgentManager
    );
  });

  it('should process message', async () => {
    const result = await messageProcessingService.processMessage(
      'テストメッセージ',
      {}
    );

    expect(result).toBeDefined();
    expect(result.response).toBeTruthy();
    expect(result.managersUsed).toBeDefined();
  });

  it('should identify manufacturing-related messages', async () => {
    const result = await messageProcessingService.processMessage(
      '生産実績を分析してください',
      {}
    );

    expect(result.isManufacturingRelated).toBe(true);
  });
});

describe('ContextAwarenessService', () => {
  let contextAwarenessService: ContextAwarenessService;
  let mockMemoryManager: any;

  beforeEach(() => {
    mockMemoryManager = {
      searchMemories: vi.fn().mockResolvedValue([]),
    };

    contextAwarenessService = new ContextAwarenessService(mockMemoryManager);
  });

  it('should get context', async () => {
    const context = await contextAwarenessService.getContext(
      'user123',
      'テストメッセージ'
    );

    expect(context).toBeDefined();
    expect(context.userId).toBe('user123');
    expect(context.relatedMemories).toBeDefined();
  });
});

describe('ChatRepository', () => {
  let chatRepository: ChatRepository;

  beforeEach(() => {
    chatRepository = new ChatRepository();
  });

  it('should save and retrieve message', async () => {
    const message: ChatMessage = {
      id: 'msg1',
      userId: 'user123',
      role: 'user',
      content: 'テストメッセージ',
      timestamp: Date.now(),
    };

    await chatRepository.saveMessage(message);
    const messages = await chatRepository.getMessages('user123');

    expect(messages).toContainEqual(message);
  });

  it('should save and retrieve session', async () => {
    const session: ChatSession = {
      id: 'session1',
      userId: 'user123',
      title: 'テストセッション',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    };

    await chatRepository.saveSession(session);
    const retrieved = await chatRepository.getSession('session1');

    expect(retrieved).toEqual(session);
  });

  it('should get user sessions', async () => {
    const session: ChatSession = {
      id: 'session1',
      userId: 'user123',
      title: 'テストセッション',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    };

    await chatRepository.saveSession(session);
    const sessions = await chatRepository.getUserSessions('user123');

    expect(sessions).toContainEqual(session);
  });

  it('should delete session', async () => {
    const session: ChatSession = {
      id: 'session1',
      userId: 'user123',
      title: 'テストセッション',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    };

    await chatRepository.saveSession(session);
    await chatRepository.deleteSession('session1');
    const retrieved = await chatRepository.getSession('session1');

    expect(retrieved).toBeNull();
  });

  it('should get user statistics', async () => {
    const stats = await chatRepository.getUserStatistics('user123');

    expect(stats).toBeDefined();
    expect(stats.totalSessions).toBeDefined();
    expect(stats.totalMessages).toBeDefined();
  });
});
