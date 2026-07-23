import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KnowledgeMemoryIntegration } from './KnowledgeMemoryIntegration';
import { KnowledgeEngine } from './KnowledgeEngine';
import { MemoryEngine } from '../memory/MemoryEngine';
import { SecurityEngine } from '../security/SecurityEngine';

describe('KnowledgeMemoryIntegration', () => {
  let integration: KnowledgeMemoryIntegration;
  let knowledgeEngine: KnowledgeEngine;
  let memoryEngine: MemoryEngine;
  let securityEngine: SecurityEngine;
  let userId: string;

  beforeEach(async () => {
    integration = KnowledgeMemoryIntegration.getInstance();
    integration.clearAllData();
    knowledgeEngine = KnowledgeEngine.getInstance();
    knowledgeEngine.clearAllKnowledge();
    memoryEngine = MemoryEngine.getInstance();
    memoryEngine.clearAllMemory();
    securityEngine = (integration as any).securityEngine;
    if (!securityEngine.isReady()) {
      await securityEngine.initialize();
    }
    userId = 'test-user-' + Date.now();
    await securityEngine.createContext(userId, 'user');
    await securityEngine.grantPermission(userId, 'knowledge:write');
    await securityEngine.grantPermission(userId, 'knowledge:read');
  });

  afterEach(async () => {
    integration.clearAllData();
    knowledgeEngine.clearAllKnowledge();
    memoryEngine.clearAllMemory();
    if (securityEngine.isReady()) {
      await securityEngine.shutdown();
    }
  });

  describe('Singleton Pattern', () => {
    it('should be a singleton', () => {
      const integration1 = KnowledgeMemoryIntegration.getInstance();
      const integration2 = KnowledgeMemoryIntegration.getInstance();
      expect(integration1).toBe(integration2);
    });
  });

  describe('Success Pattern Recording', () => {
    it('should record success pattern', async () => {
      const pattern = 'test_success_pattern';
      const details = { metric: 'value', score: 0.95 };

      const entry = await integration.recordSuccessPattern(userId, pattern, details);

      expect(entry).toBeDefined();
      expect(entry.type).toBe('success');
      expect(entry.pattern).toBe(pattern);
      expect(entry.details).toEqual(details);
      expect(entry.userId).toBe(userId);
    });

    it('should throw error if user lacks permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        integration.recordSuccessPattern(unauthorizedUser, 'pattern', {})
      ).rejects.toThrow('User does not have permission to record evolution history');
    });
  });

  describe('Failure Pattern Recording', () => {
    it('should record failure pattern', async () => {
      const pattern = 'test_failure_pattern';
      const details = { error: 'test error', code: 'ERR_001' };

      const entry = await integration.recordFailurePattern(userId, pattern, details);

      expect(entry).toBeDefined();
      expect(entry.type).toBe('failure');
      expect(entry.pattern).toBe(pattern);
      expect(entry.details).toEqual(details);
    });
  });

  describe('Improvement Recording', () => {
    it('should record improvement', async () => {
      const pattern = 'test_improvement';
      const details = { before: 0.5, after: 0.95 };

      const entry = await integration.recordImprovement(userId, pattern, details);

      expect(entry).toBeDefined();
      expect(entry.type).toBe('improvement');
      expect(entry.pattern).toBe(pattern);
      expect(entry.details).toEqual(details);
    });
  });

  describe('Evolution History', () => {
    it('should get all evolution history', async () => {
      await integration.recordSuccessPattern(userId, 'success1', {});
      await integration.recordFailurePattern(userId, 'failure1', {});
      await integration.recordImprovement(userId, 'improvement1', {});

      const history = await integration.getEvolutionHistory(userId);

      expect(history.length).toBe(3);
    });

    it('should filter evolution history by type', async () => {
      await integration.recordSuccessPattern(userId, 'success1', {});
      await integration.recordSuccessPattern(userId, 'success2', {});
      await integration.recordFailurePattern(userId, 'failure1', {});

      const successHistory = await integration.getEvolutionHistory(userId, 'success');
      expect(successHistory.length).toBe(2);

      const failureHistory = await integration.getEvolutionHistory(userId, 'failure');
      expect(failureHistory.length).toBe(1);
    });

    it('should throw error if user lacks permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        integration.getEvolutionHistory(unauthorizedUser)
      ).rejects.toThrow('User does not have permission to read evolution history');
    });
  });

  describe('Pattern Statistics', () => {
    it('should calculate pattern statistics', async () => {
      await integration.recordSuccessPattern(userId, 'success1', {});
      await integration.recordSuccessPattern(userId, 'success2', {});
      await integration.recordFailurePattern(userId, 'failure1', {});
      await integration.recordImprovement(userId, 'improvement1', {});

      const stats = await integration.getPatternStatistics(userId);

      expect(stats.totalPatterns).toBe(4);
      expect(stats.successPatterns).toBe(2);
      expect(stats.failurePatterns).toBe(1);
      expect(stats.improvements).toBe(1);
      expect(stats.successRate).toBeCloseTo(0.75, 2);
    });

    it('should handle empty history', async () => {
      const stats = await integration.getPatternStatistics(userId);

      expect(stats.totalPatterns).toBe(0);
      expect(stats.successPatterns).toBe(0);
      expect(stats.failurePatterns).toBe(0);
      expect(stats.improvements).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('should throw error if user lacks permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        integration.getPatternStatistics(unauthorizedUser)
      ).rejects.toThrow('User does not have permission to read pattern statistics');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in patterns', async () => {
      const pattern = 'pattern_@#$%^&*()';
      const entry = await integration.recordSuccessPattern(userId, pattern, {});

      expect(entry.pattern).toBe(pattern);
    });

    it('should handle unicode in patterns', async () => {
      const pattern = '日本語パターン';
      const entry = await integration.recordSuccessPattern(userId, pattern, {});

      expect(entry.pattern).toBe(pattern);
    });

    it('should handle large detail objects', async () => {
      const largeDetails: Record<string, any> = {};
      for (let i = 0; i < 100; i++) {
        largeDetails[`field_${i}`] = `value_${i}`;
      }

      const entry = await integration.recordSuccessPattern(userId, 'pattern', largeDetails);
      expect(Object.keys(entry.details).length).toBe(100);
    });

    it('should clear all data', async () => {
      await integration.recordSuccessPattern(userId, 'pattern1', {});
      await integration.recordFailurePattern(userId, 'pattern2', {});

      integration.clearAllData();

      const history = await integration.getEvolutionHistory(userId);
      expect(history.length).toBe(0);
    });
  });

  describe('Multiple Users', () => {
    it('should isolate history by user', async () => {
      const user2 = 'test-user-2-' + Date.now();
      await securityEngine.createContext(user2, 'user');
      await securityEngine.grantPermission(user2, 'knowledge:write');
      await securityEngine.grantPermission(user2, 'knowledge:read');

      await integration.recordSuccessPattern(userId, 'pattern1', {});
      await integration.recordSuccessPattern(user2, 'pattern2', {});

      const history1 = await integration.getEvolutionHistory(userId);
      const history2 = await integration.getEvolutionHistory(user2);

      expect(history1.length).toBe(1);
      expect(history2.length).toBe(1);
      expect(history1[0].pattern).toBe('pattern1');
      expect(history2[0].pattern).toBe('pattern2');
    });
  });

  describe('Pattern Recording Sequence', () => {
    it('should record patterns in sequence', async () => {
      const patterns = ['pattern1', 'pattern2', 'pattern3'];

      for (const pattern of patterns) {
        await integration.recordSuccessPattern(userId, pattern, { index: patterns.indexOf(pattern) });
      }

      const history = await integration.getEvolutionHistory(userId, 'success');
      expect(history.length).toBe(3);
      expect(history[0].pattern).toBe('pattern1');
      expect(history[1].pattern).toBe('pattern2');
      expect(history[2].pattern).toBe('pattern3');
    });

    it('should track pattern statistics over time', async () => {
      for (let i = 0; i < 5; i++) {
        await integration.recordSuccessPattern(userId, `success_${i}`, {});
      }

      for (let i = 0; i < 3; i++) {
        await integration.recordFailurePattern(userId, `failure_${i}`, {});
      }

      const stats = await integration.getPatternStatistics(userId);
      expect(stats.totalPatterns).toBe(8);
      expect(stats.successPatterns).toBe(5);
      expect(stats.failurePatterns).toBe(3);
      expect(stats.successRate).toBeCloseTo(0.625, 2);
    });
  });
});
