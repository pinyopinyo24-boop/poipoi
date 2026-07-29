import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PatternLearner, PatternType } from './PatternLearner';
import { SecurityEngine } from '../security/SecurityEngine';

describe('PatternLearner', () => {
  let patternLearner: PatternLearner;
  let securityEngine: SecurityEngine;
  let userId: string;

  beforeEach(async () => {
    patternLearner = PatternLearner.getInstance();
    patternLearner.clearAllData();
    securityEngine = (patternLearner as any).securityEngine;
    if (!securityEngine.isReady()) {
      await securityEngine.initialize();
    }
    userId = 'test-user-' + Date.now();
    await securityEngine.createContext(userId, 'user');
    await securityEngine.grantPermission(userId, 'learning:read');
    await securityEngine.grantPermission(userId, 'learning:write');
  });

  afterEach(async () => {
    patternLearner.clearAllData();
    if (securityEngine.isReady()) {
      await securityEngine.shutdown();
    }
  });

  describe('Execution Recording', () => {
    it('should record execution', async () => {
      await patternLearner.recordExecution(userId, 'test_action', { input: 'test' }, { output: 'result' }, 'success', 100);

      const patterns = await patternLearner.extractPatterns(userId, 'test_action');

      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should record multiple executions', async () => {
      for (let i = 0; i < 5; i++) {
        await patternLearner.recordExecution(userId, 'test_action', { input: i }, { output: i * 2 }, 'success', 100 + i * 10);
      }

      const patterns = await patternLearner.extractPatterns(userId, 'test_action');

      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern Extraction', () => {
    it('should extract success patterns', async () => {
      for (let i = 0; i < 5; i++) {
        await patternLearner.recordExecution(userId, 'action', {}, {}, 'success', 100);
      }

      const patterns = await patternLearner.extractPatterns(userId, 'action');
      const successPattern = patterns.find((p) => p.type === PatternType.SUCCESS);

      expect(successPattern).toBeDefined();
      expect(successPattern?.frequency).toBe(5);
    });

    it('should extract failure patterns', async () => {
      for (let i = 0; i < 3; i++) {
        await patternLearner.recordExecution(userId, 'action', {}, {}, 'failure', 200);
      }

      const patterns = await patternLearner.extractPatterns(userId, 'action');
      const failurePattern = patterns.find((p) => p.type === PatternType.FAILURE);

      expect(failurePattern).toBeDefined();
      expect(failurePattern?.frequency).toBe(3);
    });

    it('should calculate confidence', async () => {
      for (let i = 0; i < 4; i++) {
        await patternLearner.recordExecution(userId, 'action', {}, {}, 'success', 100);
      }
      for (let i = 0; i < 1; i++) {
        await patternLearner.recordExecution(userId, 'action', {}, {}, 'failure', 200);
      }

      const patterns = await patternLearner.extractPatterns(userId, 'action');
      const successPattern = patterns.find((p) => p.type === PatternType.SUCCESS);

      expect(successPattern?.confidence).toBe(0.8);
    });
  });

  describe('Pattern Retrieval', () => {
    it('should get all patterns', async () => {
      for (let i = 0; i < 3; i++) {
        await patternLearner.recordExecution(userId, 'action', {}, {}, 'success', 100);
      }
      await patternLearner.extractPatterns(userId, 'action');

      const patterns = await patternLearner.getAllPatterns(userId);

      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should get patterns by type', async () => {
      for (let i = 0; i < 3; i++) {
        await patternLearner.recordExecution(userId, 'action', {}, {}, 'success', 100);
      }
      for (let i = 0; i < 2; i++) {
        await patternLearner.recordExecution(userId, 'action', {}, {}, 'failure', 200);
      }
      await patternLearner.extractPatterns(userId, 'action');

      const successPatterns = await patternLearner.getPatternsByType(userId, PatternType.SUCCESS);
      const failurePatterns = await patternLearner.getPatternsByType(userId, PatternType.FAILURE);

      expect(successPatterns.length).toBeGreaterThan(0);
      expect(failurePatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern Statistics', () => {
    it('should get pattern statistics', async () => {
      for (let i = 0; i < 5; i++) {
        await patternLearner.recordExecution(userId, 'action', {}, {}, 'success', 100);
      }
      await patternLearner.extractPatterns(userId, 'action');

      const stats = await patternLearner.getPatternStatistics(userId);

      expect(stats.totalPatterns).toBeGreaterThan(0);
      expect(stats.patternsByType[PatternType.SUCCESS]).toBeGreaterThan(0);
    });

    it('should include top patterns', async () => {
      for (let i = 0; i < 10; i++) {
        await patternLearner.recordExecution(userId, 'action', {}, {}, 'success', 100);
      }
      await patternLearner.extractPatterns(userId, 'action');

      const stats = await patternLearner.getPatternStatistics(userId);

      expect(stats.topPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Permission Checks', () => {
    it('should throw error if user lacks write permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        patternLearner.recordExecution(unauthorizedUser, 'action', {}, {}, 'success', 100)
      ).rejects.toThrow('User does not have permission to record execution');
    });

    it('should throw error if user lacks read permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(patternLearner.extractPatterns(unauthorizedUser, 'action')).rejects.toThrow(
        'User does not have permission to read patterns'
      );
    });
  });

  describe('Data Clearing', () => {
    it('should clear all data', async () => {
      for (let i = 0; i < 5; i++) {
        await patternLearner.recordExecution(userId, 'action', {}, {}, 'success', 100);
      }
      await patternLearner.extractPatterns(userId, 'action');

      patternLearner.clearAllData();

      const patterns = await patternLearner.getAllPatterns(userId);

      expect(patterns.length).toBe(0);
    });
  });

  describe('Multiple Actions', () => {
    it('should isolate patterns by action', async () => {
      for (let i = 0; i < 3; i++) {
        await patternLearner.recordExecution(userId, 'action1', {}, {}, 'success', 100);
      }
      for (let i = 0; i < 2; i++) {
        await patternLearner.recordExecution(userId, 'action2', {}, {}, 'failure', 200);
      }

      const patterns1 = await patternLearner.extractPatterns(userId, 'action1');
      const patterns2 = await patternLearner.extractPatterns(userId, 'action2');

      expect(patterns1.some((p) => p.type === PatternType.SUCCESS)).toBe(true);
      expect(patterns2.some((p) => p.type === PatternType.FAILURE)).toBe(true);
    });
  });

  describe('Multiple Users', () => {
    it('should isolate patterns by user', async () => {
      const user2 = 'test-user-2-' + Date.now();
      await securityEngine.createContext(user2, 'user');
      await securityEngine.grantPermission(user2, 'learning:read');
      await securityEngine.grantPermission(user2, 'learning:write');

      for (let i = 0; i < 3; i++) {
        await patternLearner.recordExecution(userId, 'action', {}, {}, 'success', 100);
      }
      for (let i = 0; i < 2; i++) {
        await patternLearner.recordExecution(user2, 'action', {}, {}, 'failure', 200);
      }

      await patternLearner.extractPatterns(userId, 'action');
      await patternLearner.extractPatterns(user2, 'action');

      const user1Patterns = await patternLearner.getAllPatterns(userId);
      const user2Patterns = await patternLearner.getAllPatterns(user2);

      expect(user1Patterns.some((p) => p.type === PatternType.SUCCESS)).toBe(true);
      expect(user2Patterns.some((p) => p.type === PatternType.FAILURE)).toBe(true);
    });
  });
});
