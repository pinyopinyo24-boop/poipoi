import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImprovementExecutor, ExecutionResult, ExecutionStatus } from './ImprovementExecutor';
import { ImprovementCandidate } from './SelfImprovementManager';
import { SelfLearningEngine } from './learning/SelfLearningEngine';
import { SecurityEngine } from './security/SecurityEngine';
import { MemoryEngine } from './memory/MemoryEngine';

// ── ヘルパー ──────────────────────────────────────────────────────────────

function makeCandidate(overrides: Partial<ImprovementCandidate> = {}): ImprovementCandidate {
  return {
    id: `cand-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    source: 'diagnosis',
    title: 'Test Candidate',
    description: 'A test improvement candidate',
    priority: 'medium',
    estimatedImpact: 40,
    createdAt: Date.now(),
    ...overrides,
  };
}

// ── テスト ────────────────────────────────────────────────────────────────

describe('ImprovementExecutor', () => {
  let executor: ImprovementExecutor;
  let learningEngine: SelfLearningEngine;
  let learnSecEngine: SecurityEngine;
  let memoryEngine: MemoryEngine;
  let userId: string;

  beforeEach(async () => {
    executor = ImprovementExecutor.getInstance();
    executor.clearAllData();

    memoryEngine = MemoryEngine.getInstance();
    memoryEngine.clearAllMemory();

    learningEngine = SelfLearningEngine.getInstance();
    learningEngine.clearAllData();

    learnSecEngine = (learningEngine as any).securityEngine as SecurityEngine;
    if (!learnSecEngine.isReady()) {
      await learnSecEngine.initialize();
    }

    userId = 'exec-user-' + Date.now();

    await learnSecEngine.createContext(userId, 'user');
    await learnSecEngine.grantPermission(userId, 'learning:read');
    await learnSecEngine.grantPermission(userId, 'learning:write');
    await learnSecEngine.grantPermission(userId, 'memory:read');
    await learnSecEngine.grantPermission(userId, 'memory:write');
    await learnSecEngine.grantPermission(userId, 'audit:write');
  });

  afterEach(async () => {
    executor.clearAllData();
    learningEngine.clearAllData();
    memoryEngine.clearAllMemory();

    if (learnSecEngine.isReady()) {
      await learnSecEngine.shutdown();
    }
  });

  // ── Singleton ────────────────────────────────────────────────────────────

  describe('Singleton', () => {
    it('should return the same instance', () => {
      expect(ImprovementExecutor.getInstance()).toBe(ImprovementExecutor.getInstance());
    });
  });

  // ── execute: 成功ケース ──────────────────────────────────────────────────

  describe('execute – success', () => {
    it('should return success for a normal candidate', async () => {
      const candidate = makeCandidate({ priority: 'medium', estimatedImpact: 40 });
      const result = await executor.execute(userId, candidate);

      expect(result.candidateId).toBe(candidate.id);
      expect(result.userId).toBe(userId);
      expect(result.status).toBe<ExecutionStatus>('success');
      expect(result.rolledBack).toBe(false);
      expect(result.failureReason).toBeUndefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.executedAt).toBeGreaterThan(0);
    });

    it('should return success for a low-priority candidate', async () => {
      const candidate = makeCandidate({ priority: 'low', estimatedImpact: 20 });
      const result = await executor.execute(userId, candidate);
      expect(result.status).toBe('success');
    });

    it('should return success for a high-priority candidate with low impact', async () => {
      const candidate = makeCandidate({ priority: 'high', estimatedImpact: 60 });
      const result = await executor.execute(userId, candidate);
      expect(result.status).toBe('success');
    });

    it('should save snapshot to memory on success', async () => {
      const candidate = makeCandidate();
      await executor.execute(userId, candidate);

      const snapshot = memoryEngine.getMemory(userId, `snapshot_${candidate.id}`);
      expect(snapshot).toBeDefined();
    });

    it('should save improvement params to memory on success', async () => {
      const candidate = makeCandidate();
      await executor.execute(userId, candidate);

      const params = memoryEngine.getMemory(userId, `improvement_params_${candidate.id}`);
      expect(params).toBeDefined();
    });

    it('should save execution result to memory', async () => {
      const candidate = makeCandidate();
      await executor.execute(userId, candidate);

      const stored = memoryEngine.getMemory<ExecutionResult>(
        userId,
        `execution_result_${candidate.id}`
      );
      expect(stored).toBeDefined();
      expect(stored!.status).toBe('success');
    });
  });

  // ── execute: ロールバックケース ──────────────────────────────────────────

  describe('execute – rollback', () => {
    it('should roll back a critical high-impact candidate', async () => {
      const candidate = makeCandidate({ priority: 'critical', estimatedImpact: 80 });
      const result = await executor.execute(userId, candidate);

      expect(result.status).toBe<ExecutionStatus>('rolled_back');
      expect(result.rolledBack).toBe(true);
      expect(result.failureReason).toBeDefined();
      expect(result.failureReason).toContain('Manual review required');
    });

    it('should save rollback record to memory', async () => {
      const candidate = makeCandidate({ priority: 'critical', estimatedImpact: 80 });
      await executor.execute(userId, candidate);

      const rollback = memoryEngine.getMemory(userId, `rollback_${candidate.id}`);
      expect(rollback).toBeDefined();
    });

    it('should remove improvement params after rollback', async () => {
      const candidate = makeCandidate({ priority: 'critical', estimatedImpact: 80 });
      await executor.execute(userId, candidate);

      const params = memoryEngine.getMemory(userId, `improvement_params_${candidate.id}`);
      expect(params).toBeUndefined();
    });
  });

  // ── executeBatch ─────────────────────────────────────────────────────────

  describe('executeBatch', () => {
    it('should return a batch summary', async () => {
      const candidates = [
        makeCandidate({ priority: 'low' }),
        makeCandidate({ priority: 'medium' }),
      ];
      const summary = await executor.executeBatch(userId, candidates);

      expect(summary.total).toBe(2);
      expect(summary.results.length).toBe(2);
      expect(summary.succeeded + summary.failed + summary.skipped).toBe(2);
    });

    it('should count successes and rollbacks correctly', async () => {
      const candidates = [
        makeCandidate({ priority: 'medium', estimatedImpact: 30 }),   // success
        makeCandidate({ priority: 'critical', estimatedImpact: 80 }), // rollback
      ];
      const summary = await executor.executeBatch(userId, candidates);

      expect(summary.succeeded).toBe(1);
      expect(summary.rolledBack).toBe(1);
    });

    it('should save batch summary to memory', async () => {
      const candidates = [makeCandidate()];
      const summary = await executor.executeBatch(userId, candidates);

      const keys: string[] = [];
      // batchKey is execution_batch_{userId}_{executedAt} — check at least one entry
      const stored = memoryEngine.getMemory(
        userId,
        `execution_batch_${userId}_${summary.executedAt}`
      );
      expect(stored).toBeDefined();
    });

    it('should handle an empty candidate list', async () => {
      const summary = await executor.executeBatch(userId, []);

      expect(summary.total).toBe(0);
      expect(summary.succeeded).toBe(0);
    });
  });

  // ── getExecutionHistory ───────────────────────────────────────────────────

  describe('getExecutionHistory', () => {
    it('should return empty array initially', () => {
      expect(executor.getExecutionHistory(userId)).toEqual([]);
    });

    it('should accumulate results', async () => {
      await executor.execute(userId, makeCandidate());
      await executor.execute(userId, makeCandidate());

      expect(executor.getExecutionHistory(userId).length).toBe(2);
    });

    it('should isolate by userId', async () => {
      const other = 'other-user-' + Date.now();

      // other ユーザーの学習エンジンコンテキストを用意
      await learnSecEngine.createContext(other, 'user');
      await learnSecEngine.grantPermission(other, 'learning:read');
      await learnSecEngine.grantPermission(other, 'learning:write');
      await learnSecEngine.grantPermission(other, 'memory:read');
      await learnSecEngine.grantPermission(other, 'memory:write');
      await learnSecEngine.grantPermission(other, 'audit:write');

      await executor.execute(userId, makeCandidate());
      await executor.execute(other, makeCandidate());

      expect(executor.getExecutionHistory(userId).length).toBe(1);
      expect(executor.getExecutionHistory(other).length).toBe(1);
    });

    it('should respect the limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await executor.execute(userId, makeCandidate());
      }
      expect(executor.getExecutionHistory(userId, 3).length).toBe(3);
    });
  });

  // ── getSnapshot ───────────────────────────────────────────────────────────

  describe('getSnapshot', () => {
    it('should return undefined before execution', () => {
      expect(executor.getSnapshot('nonexistent')).toBeUndefined();
    });

    it('should return the snapshot after execution', async () => {
      const candidate = makeCandidate();
      await executor.execute(userId, candidate);

      const snap = executor.getSnapshot(candidate.id, userId);
      expect(snap).toBeDefined();
      expect(snap!.candidateId).toBe(candidate.id);
      expect(snap!.userId).toBe(userId);
      expect(snap!.takenAt).toBeGreaterThan(0);
    });
  });

  // ── getStats ──────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return zero stats initially', () => {
      const stats = executor.getStats(userId);
      expect(stats.totalExecuted).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('should accumulate stats correctly', async () => {
      // 2 success
      await executor.execute(userId, makeCandidate({ priority: 'medium', estimatedImpact: 40 }));
      await executor.execute(userId, makeCandidate({ priority: 'low', estimatedImpact: 20 }));
      // 1 rollback
      await executor.execute(userId, makeCandidate({ priority: 'critical', estimatedImpact: 80 }));

      const stats = executor.getStats(userId);
      expect(stats.totalExecuted).toBe(3);
      expect(stats.successCount).toBe(2);
      expect(stats.failureCount).toBe(1);
      expect(stats.rollbackCount).toBe(1);
      expect(stats.successRate).toBe(67); // round(2/3 * 100)
    });
  });

  // ── clearAllData ──────────────────────────────────────────────────────────

  describe('clearAllData', () => {
    it('should reset history and snapshots', async () => {
      await executor.execute(userId, makeCandidate());
      expect(executor.getExecutionHistory(userId).length).toBe(1);

      executor.clearAllData();

      expect(executor.getExecutionHistory(userId).length).toBe(0);
      expect(executor.getSnapshot('any')).toBeUndefined();
    });
  });

  // ── ExecutionResult structure ─────────────────────────────────────────────

  describe('ExecutionResult structure', () => {
    it('each result should have required fields', async () => {
      const candidate = makeCandidate();
      const result = await executor.execute(userId, candidate);

      expect(typeof result.candidateId).toBe('string');
      expect(typeof result.userId).toBe('string');
      expect(['success', 'failure', 'rolled_back', 'skipped']).toContain(result.status);
      expect(typeof result.durationMs).toBe('number');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.rolledBack).toBe('boolean');
      expect(typeof result.executedAt).toBe('number');
    });
  });

  // ── SelfLearningEngine 統合 ────────────────────────────────────────────────

  describe('SelfLearningEngine integration', () => {
    it('should record data point when an active learning cycle exists', async () => {
      // 学習サイクルを手動で起動
      const cycle = await learningEngine.startLearningCycle(userId);

      const candidate = makeCandidate({ priority: 'medium' });
      await executor.execute(userId, candidate);

      const retrieved = await learningEngine.getLearningCycle(userId, cycle.id);
      expect(retrieved).toBeDefined();
      // データポイントが追加されているはず
      expect(retrieved!.dataPoints.length).toBeGreaterThanOrEqual(1);
    });

    it('should not throw when no learning cycle is active', async () => {
      const candidate = makeCandidate();
      // 学習サイクルなしでも正常完了するか
      await expect(executor.execute(userId, candidate)).resolves.toBeDefined();
    });
  });
});
