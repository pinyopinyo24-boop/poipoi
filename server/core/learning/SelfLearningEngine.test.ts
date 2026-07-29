import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SelfLearningEngine, LearningCycleStatus } from './SelfLearningEngine';
import { SecurityEngine } from '../security/SecurityEngine';

describe('SelfLearningEngine', () => {
  let learningEngine: SelfLearningEngine;
  let securityEngine: SecurityEngine;
  let userId: string;

  beforeEach(async () => {
    learningEngine = SelfLearningEngine.getInstance();
    learningEngine.clearAllData();
    securityEngine = (learningEngine as any).securityEngine;
    if (!securityEngine.isReady()) {
      await securityEngine.initialize();
    }
    userId = 'test-user-' + Date.now();
    await securityEngine.createContext(userId, 'user');
    await securityEngine.grantPermission(userId, 'learning:read');
    await securityEngine.grantPermission(userId, 'learning:write');
    await securityEngine.grantPermission(userId, 'knowledge:read');
    await securityEngine.grantPermission(userId, 'knowledge:write');
    await securityEngine.grantPermission(userId, 'audit:write');
    await securityEngine.grantPermission(userId, 'memory:write');
    await securityEngine.grantPermission(userId, 'memory:read');
  });

  afterEach(async () => {
    learningEngine.clearAllData();
    if (securityEngine.isReady()) {
      await securityEngine.shutdown();
    }
  });

  describe('Learning Cycle Management', () => {
    it('should start learning cycle', async () => {
      const cycle = await learningEngine.startLearningCycle(userId);

      expect(cycle.id).toBeDefined();
      expect(cycle.userId).toBe(userId);
      expect(cycle.status).toBe(LearningCycleStatus.RUNNING);
      expect(cycle.dataPoints).toEqual([]);
    });

    it('should get learning cycle', async () => {
      const startedCycle = await learningEngine.startLearningCycle(userId);
      const retrievedCycle = await learningEngine.getLearningCycle(userId, startedCycle.id);

      expect(retrievedCycle).toBeDefined();
      expect(retrievedCycle?.id).toBe(startedCycle.id);
    });

    it('should get all learning cycles', async () => {
      await learningEngine.startLearningCycle(userId);
      await learningEngine.startLearningCycle(userId);

      const cycles = await learningEngine.getAllLearningCycles(userId);

      expect(cycles.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Data Point Recording', () => {
    it('should record success data point', async () => {
      const cycle = await learningEngine.startLearningCycle(userId);
      const dataPoint = await learningEngine.recordDataPoint(
        userId,
        cycle.id,
        { input: 'test' },
        { output: 'result' },
        'success',
        100,
        { metadata: 'test' }
      );

      expect(dataPoint.id).toBeDefined();
      expect(dataPoint.result).toBe('success');
      expect(dataPoint.duration).toBe(100);
    });

    it('should record failure data point', async () => {
      const cycle = await learningEngine.startLearningCycle(userId);
      const dataPoint = await learningEngine.recordDataPoint(
        userId,
        cycle.id,
        { input: 'test' },
        { error: 'failed' },
        'failure',
        200
      );

      expect(dataPoint.result).toBe('failure');
    });

    it('should add data points to cycle', async () => {
      const cycle = await learningEngine.startLearningCycle(userId);
      await learningEngine.recordDataPoint(userId, cycle.id, {}, {}, 'success', 100);
      await learningEngine.recordDataPoint(userId, cycle.id, {}, {}, 'success', 150);

      const retrievedCycle = await learningEngine.getLearningCycle(userId, cycle.id);

      expect(retrievedCycle?.dataPoints.length).toBe(2);
    });
  });

  describe('Learning Cycle Completion', () => {
    it('should complete learning cycle', async () => {
      const cycle = await learningEngine.startLearningCycle(userId);
      await learningEngine.recordDataPoint(userId, cycle.id, {}, {}, 'success', 100);
      await learningEngine.recordDataPoint(userId, cycle.id, {}, {}, 'success', 150);

      const result = await learningEngine.completeLearningCycle(userId, cycle.id);

      expect(result.cycleId).toBe(cycle.id);
      expect(result.totalDataPoints).toBe(2);
      expect(result.successRate).toBe(1);
      expect(result.failureRate).toBe(0);
    });

    it('should extract patterns', async () => {
      const cycle = await learningEngine.startLearningCycle(userId);
      for (let i = 0; i < 5; i++) {
        await learningEngine.recordDataPoint(userId, cycle.id, {}, {}, 'success', 100);
      }

      const result = await learningEngine.completeLearningCycle(userId, cycle.id);

      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.patterns.some((p) => p.type === 'success')).toBe(true);
    });

    it('should generate recommendations', async () => {
      const cycle = await learningEngine.startLearningCycle(userId);
      for (let i = 0; i < 10; i++) {
        await learningEngine.recordDataPoint(userId, cycle.id, {}, {}, 'success', 100);
      }

      const result = await learningEngine.completeLearningCycle(userId, cycle.id);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should mark cycle as completed', async () => {
      const cycle = await learningEngine.startLearningCycle(userId);
      await learningEngine.recordDataPoint(userId, cycle.id, {}, {}, 'success', 100);

      await learningEngine.completeLearningCycle(userId, cycle.id);

      const retrievedCycle = await learningEngine.getLearningCycle(userId, cycle.id);

      expect(retrievedCycle?.status).toBe(LearningCycleStatus.COMPLETED);
      expect(retrievedCycle?.endTime).toBeDefined();
    });
  });

  describe('Success and Failure Rates', () => {
    it('should calculate 100% success rate', async () => {
      const cycle = await learningEngine.startLearningCycle(userId);
      for (let i = 0; i < 5; i++) {
        await learningEngine.recordDataPoint(userId, cycle.id, {}, {}, 'success', 100);
      }

      const result = await learningEngine.completeLearningCycle(userId, cycle.id);

      expect(result.successRate).toBe(1);
      expect(result.failureRate).toBe(0);
    });

    it('should calculate mixed success/failure rate', async () => {
      const cycle = await learningEngine.startLearningCycle(userId);
      for (let i = 0; i < 3; i++) {
        await learningEngine.recordDataPoint(userId, cycle.id, {}, {}, 'success', 100);
      }
      for (let i = 0; i < 2; i++) {
        await learningEngine.recordDataPoint(userId, cycle.id, {}, {}, 'failure', 200);
      }

      const result = await learningEngine.completeLearningCycle(userId, cycle.id);

      expect(result.successRate).toBe(0.6);
      expect(result.failureRate).toBe(0.4);
    });

    it('should calculate 100% failure rate', async () => {
      const cycle = await learningEngine.startLearningCycle(userId);
      for (let i = 0; i < 5; i++) {
        await learningEngine.recordDataPoint(userId, cycle.id, {}, {}, 'failure', 200);
      }

      const result = await learningEngine.completeLearningCycle(userId, cycle.id);

      expect(result.successRate).toBe(0);
      expect(result.failureRate).toBe(1);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect success patterns', async () => {
      const cycle = await learningEngine.startLearningCycle(userId);
      for (let i = 0; i < 5; i++) {
        await learningEngine.recordDataPoint(userId, cycle.id, { input: i }, {}, 'success', 100);
      }

      const result = await learningEngine.completeLearningCycle(userId, cycle.id);
      const successPattern = result.patterns.find((p) => p.type === 'success');

      expect(successPattern).toBeDefined();
      expect(successPattern?.frequency).toBe(5);
      expect(successPattern?.confidence).toBe(1);
    });

    it('should detect failure patterns', async () => {
      const cycle = await learningEngine.startLearningCycle(userId);
      for (let i = 0; i < 3; i++) {
        await learningEngine.recordDataPoint(userId, cycle.id, { input: i }, {}, 'failure', 200);
      }

      const result = await learningEngine.completeLearningCycle(userId, cycle.id);
      const failurePattern = result.patterns.find((p) => p.type === 'failure');

      expect(failurePattern).toBeDefined();
      expect(failurePattern?.frequency).toBe(3);
    });

    it('should detect improvement patterns', async () => {
      const cycle = await learningEngine.startLearningCycle(userId);
      await learningEngine.recordDataPoint(userId, cycle.id, {}, {}, 'success', 1000);
      await learningEngine.recordDataPoint(userId, cycle.id, {}, {}, 'success', 900);
      await learningEngine.recordDataPoint(userId, cycle.id, {}, {}, 'success', 800);
      await learningEngine.recordDataPoint(userId, cycle.id, {}, {}, 'success', 700);

      const result = await learningEngine.completeLearningCycle(userId, cycle.id);

      expect(result.patterns.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Permission Checks', () => {
    it('should throw error if user lacks write permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(learningEngine.startLearningCycle(unauthorizedUser)).rejects.toThrow(
        'User does not have permission to start learning cycle'
      );
    });

    it('should throw error if user lacks read permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        learningEngine.getAllLearningCycles(unauthorizedUser)
      ).rejects.toThrow('User does not have permission to read learning data');
    });
  });

  describe('Data Clearing', () => {
    it('should clear all data', async () => {
      const cycle = await learningEngine.startLearningCycle(userId);
      await learningEngine.recordDataPoint(userId, cycle.id, {}, {}, 'success', 100);

      learningEngine.clearAllData();

      const cycles = await learningEngine.getAllLearningCycles(userId);

      expect(cycles.length).toBe(0);
    });
  });

  describe('Multiple Users', () => {
    it('should isolate cycles by user', async () => {
      const user2 = 'test-user-2-' + Date.now();
      await securityEngine.createContext(user2, 'user');
      await securityEngine.grantPermission(user2, 'learning:read');
      await securityEngine.grantPermission(user2, 'learning:write');

      const cycle1 = await learningEngine.startLearningCycle(userId);
      const cycle2 = await learningEngine.startLearningCycle(user2);

      const user1Cycles = await learningEngine.getAllLearningCycles(userId);
      const user2Cycles = await learningEngine.getAllLearningCycles(user2);

      expect(user1Cycles.some((c) => c.id === cycle1.id)).toBe(true);
      expect(user1Cycles.some((c) => c.id === cycle2.id)).toBe(false);
      expect(user2Cycles.some((c) => c.id === cycle2.id)).toBe(true);
      expect(user2Cycles.some((c) => c.id === cycle1.id)).toBe(false);
    });
  });

  describe('Empty Cycles', () => {
    it('should handle empty learning cycle', async () => {
      const cycle = await learningEngine.startLearningCycle(userId);

      const result = await learningEngine.completeLearningCycle(userId, cycle.id);

      expect(result.totalDataPoints).toBe(0);
      expect(result.successRate).toBe(0);
      expect(result.failureRate).toBe(0);
    });
  });
});
