import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SelfImprovementManager, ImprovementCycle } from './SelfImprovementManager';
import { SelfDiagnoseEngine } from './diagnose/SelfDiagnoseEngine';
import { SelfLearningEngine } from './learning/SelfLearningEngine';
import { SecurityEngine } from './security/SecurityEngine';
import { MemoryEngine } from './memory/MemoryEngine';

describe('SelfImprovementManager', () => {
  let manager: SelfImprovementManager;
  let securityEngine: SecurityEngine;
  let userId: string;

  /**
   * SelfDiagnoseEngine と SelfLearningEngine は内部で同一の SecurityEngine
   * インスタンスを使う。テストでは diagnoseEngine の securityEngine を取得して
   * 権限を付与することで、両エンジンが同じコンテキストを参照できるようにする。
   */
  beforeEach(async () => {
    // Singletonをリセットして干渉を防ぐ
    manager = SelfImprovementManager.getInstance();
    manager.clearAllData();

    const diagnoseEngine = SelfDiagnoseEngine.getInstance();
    diagnoseEngine.clearAllData();

    const learningEngine = SelfLearningEngine.getInstance();
    learningEngine.clearAllData();

    MemoryEngine.getInstance().clearAllMemory();

    // SecurityEngine の初期化
    securityEngine = (diagnoseEngine as any).securityEngine as SecurityEngine;
    if (!securityEngine.isReady()) {
      await securityEngine.initialize();
    }

    userId = 'test-user-' + Date.now();

    // 必要な権限を付与
    await securityEngine.createContext(userId, 'user');
    await securityEngine.grantPermission(userId, 'diagnose:read');
    await securityEngine.grantPermission(userId, 'diagnose:write');
    await securityEngine.grantPermission(userId, 'learning:read');
    await securityEngine.grantPermission(userId, 'learning:write');
    await securityEngine.grantPermission(userId, 'memory:read');
    await securityEngine.grantPermission(userId, 'memory:write');
    await securityEngine.grantPermission(userId, 'audit:write');
    await securityEngine.grantPermission(userId, 'knowledge:read');
    await securityEngine.grantPermission(userId, 'knowledge:write');

    // learningEngine は別の securityEngine インスタンスを持つため
    // そちらも初期化が必要
    const learnSecEngine = (learningEngine as any).securityEngine as SecurityEngine;
    if (!learnSecEngine.isReady()) {
      await learnSecEngine.initialize();
    }
    await learnSecEngine.createContext(userId, 'user');
    await learnSecEngine.grantPermission(userId, 'learning:read');
    await learnSecEngine.grantPermission(userId, 'learning:write');
    await learnSecEngine.grantPermission(userId, 'memory:read');
    await learnSecEngine.grantPermission(userId, 'memory:write');
    await learnSecEngine.grantPermission(userId, 'audit:write');
  });

  afterEach(async () => {
    manager.clearAllData();

    const diagnoseEngine = SelfDiagnoseEngine.getInstance();
    diagnoseEngine.clearAllData();
    if (securityEngine.isReady()) {
      await securityEngine.shutdown();
    }

    const learningEngine = SelfLearningEngine.getInstance();
    learningEngine.clearAllData();
    const learnSecEngine = (learningEngine as any).securityEngine as SecurityEngine;
    if (learnSecEngine.isReady()) {
      await learnSecEngine.shutdown();
    }

    MemoryEngine.getInstance().clearAllMemory();
  });

  // ── Singleton ──────────────────────────────────────────

  describe('Singleton', () => {
    it('should return the same instance', () => {
      const a = SelfImprovementManager.getInstance();
      const b = SelfImprovementManager.getInstance();
      expect(a).toBe(b);
    });
  });

  // ── runImprovementCycle ──────────────────────────────────

  describe('runImprovementCycle', () => {
    it('should complete a full improvement cycle', async () => {
      const cycle = await manager.runImprovementCycle(userId);

      expect(cycle).toBeDefined();
      expect(cycle.id).toBeDefined();
      expect(cycle.userId).toBe(userId);
      expect(cycle.startedAt).toBeGreaterThan(0);
      expect(cycle.completedAt).toBeDefined();
      expect(cycle.completedAt!).toBeGreaterThanOrEqual(cycle.startedAt);
    });

    it('should contain a diagnostic report', async () => {
      const cycle = await manager.runImprovementCycle(userId);

      expect(cycle.diagnosticReport).toBeDefined();
      expect(cycle.diagnosticReport.id).toBeDefined();
      expect(cycle.diagnosticReport.status).toBeDefined();
      expect(cycle.diagnosticReport.overallScore).toBeGreaterThanOrEqual(0);
      expect(cycle.diagnosticReport.overallScore).toBeLessThanOrEqual(100);
    });

    it('should generate improvement candidates', async () => {
      const cycle = await manager.runImprovementCycle(userId);

      expect(Array.isArray(cycle.candidates)).toBe(true);
    });

    it('should run tests on all candidates', async () => {
      const cycle = await manager.runImprovementCycle(userId);

      expect(cycle.testResults.length).toBe(cycle.candidates.length);
      for (const result of cycle.testResults) {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(typeof result.passed).toBe('boolean');
        expect(result.details).toBeDefined();
      }
    });

    it('should count applied (passed) candidates correctly', async () => {
      const cycle = await manager.runImprovementCycle(userId);

      const passedCount = cycle.testResults.filter((r) => r.passed).length;
      expect(cycle.appliedCount).toBe(passedCount);
    });

    it('should set a non-empty summary', async () => {
      const cycle = await manager.runImprovementCycle(userId);

      expect(typeof cycle.summary).toBe('string');
      expect(cycle.summary.length).toBeGreaterThan(0);
    });

    it('should save cycle to memory', async () => {
      const cycle = await manager.runImprovementCycle(userId);

      const stored = MemoryEngine.getInstance().getMemory<ImprovementCycle>(
        userId,
        `improvement_cycle_${cycle.id}`
      );
      expect(stored).toBeDefined();
      expect(stored!.id).toBe(cycle.id);
    });
  });

  // ── getCycleHistory ──────────────────────────────────────

  describe('getCycleHistory', () => {
    it('should return empty array before any cycle', () => {
      const history = manager.getCycleHistory(userId);
      expect(history).toEqual([]);
    });

    it('should accumulate cycle history', async () => {
      await manager.runImprovementCycle(userId);
      await manager.runImprovementCycle(userId);

      const history = manager.getCycleHistory(userId);
      expect(history.length).toBe(2);
    });

    it('should respect the limit parameter', async () => {
      await manager.runImprovementCycle(userId);
      await manager.runImprovementCycle(userId);
      await manager.runImprovementCycle(userId);

      const history = manager.getCycleHistory(userId, 2);
      expect(history.length).toBe(2);
    });

    it('should isolate cycles by user', async () => {
      // 別ユーザーの setup
      const userId2 = 'test-user-2-' + Date.now();

      // diagnoseEngine の securityEngine
      await securityEngine.createContext(userId2, 'user');
      await securityEngine.grantPermission(userId2, 'diagnose:read');
      await securityEngine.grantPermission(userId2, 'diagnose:write');

      // learningEngine の securityEngine
      const learnSecEngine = (SelfLearningEngine.getInstance() as any)
        .securityEngine as SecurityEngine;
      await learnSecEngine.createContext(userId2, 'user');
      await learnSecEngine.grantPermission(userId2, 'learning:read');
      await learnSecEngine.grantPermission(userId2, 'learning:write');
      await learnSecEngine.grantPermission(userId2, 'memory:read');
      await learnSecEngine.grantPermission(userId2, 'memory:write');
      await learnSecEngine.grantPermission(userId2, 'audit:write');

      await manager.runImprovementCycle(userId);
      await manager.runImprovementCycle(userId2);

      expect(manager.getCycleHistory(userId).length).toBe(1);
      expect(manager.getCycleHistory(userId2).length).toBe(1);
    });
  });

  // ── getLatestCycle ───────────────────────────────────────

  describe('getLatestCycle', () => {
    it('should return null when no cycles exist', () => {
      expect(manager.getLatestCycle(userId)).toBeNull();
    });

    it('should return the most recent cycle', async () => {
      await manager.runImprovementCycle(userId);
      const second = await manager.runImprovementCycle(userId);

      const latest = manager.getLatestCycle(userId);
      expect(latest).toBeDefined();
      expect(latest!.id).toBe(second.id);
    });
  });

  // ── getApprovedCandidates / getRejectedCandidates ────────

  describe('getApprovedCandidates / getRejectedCandidates', () => {
    it('should correctly split candidates into approved and rejected', async () => {
      const cycle = await manager.runImprovementCycle(userId);

      const approved = manager.getApprovedCandidates(cycle);
      const rejected = manager.getRejectedCandidates(cycle);

      expect(approved.length + rejected.length).toBe(cycle.candidates.length);
      expect(approved.length).toBe(cycle.appliedCount);
    });

    it('should only contain candidates whose test result matches', async () => {
      const cycle = await manager.runImprovementCycle(userId);

      const passedIds = new Set(
        cycle.testResults.filter((r) => r.passed).map((r) => r.candidateId)
      );

      for (const c of manager.getApprovedCandidates(cycle)) {
        expect(passedIds.has(c.id)).toBe(true);
      }
      for (const c of manager.getRejectedCandidates(cycle)) {
        expect(passedIds.has(c.id)).toBe(false);
      }
    });
  });

  // ── getStats ─────────────────────────────────────────────

  describe('getStats', () => {
    it('should return zero stats when no cycles have run', () => {
      const stats = manager.getStats(userId);
      expect(stats.totalCycles).toBe(0);
      expect(stats.totalCandidates).toBe(0);
      expect(stats.totalApproved).toBe(0);
      expect(stats.averageScore).toBe(0);
    });

    it('should accumulate stats across multiple cycles', async () => {
      await manager.runImprovementCycle(userId);
      await manager.runImprovementCycle(userId);

      const stats = manager.getStats(userId);
      expect(stats.totalCycles).toBe(2);
      expect(stats.totalCandidates).toBeGreaterThanOrEqual(0);
      expect(stats.totalApproved).toBeGreaterThanOrEqual(0);
      expect(stats.averageScore).toBeGreaterThanOrEqual(0);
      expect(stats.averageScore).toBeLessThanOrEqual(100);
    });
  });

  // ── clearAllData ─────────────────────────────────────────

  describe('clearAllData', () => {
    it('should remove all cycle history', async () => {
      await manager.runImprovementCycle(userId);
      expect(manager.getCycleHistory(userId).length).toBe(1);

      manager.clearAllData();

      expect(manager.getCycleHistory(userId).length).toBe(0);
      expect(manager.getLatestCycle(userId)).toBeNull();
    });
  });

  // ── ImprovementCandidate structure ───────────────────────

  describe('ImprovementCandidate structure', () => {
    it('each candidate should have required fields', async () => {
      const cycle = await manager.runImprovementCycle(userId);

      for (const candidate of cycle.candidates) {
        expect(candidate.id).toBeDefined();
        expect(['diagnosis', 'learning']).toContain(candidate.source);
        expect(typeof candidate.title).toBe('string');
        expect(candidate.title.length).toBeGreaterThan(0);
        expect(typeof candidate.description).toBe('string');
        expect(['low', 'medium', 'high', 'critical']).toContain(candidate.priority);
        expect(candidate.estimatedImpact).toBeGreaterThanOrEqual(0);
        expect(candidate.estimatedImpact).toBeLessThanOrEqual(100);
        expect(candidate.createdAt).toBeGreaterThan(0);
      }
    });

    it('candidates should be sorted by estimatedImpact descending', async () => {
      const cycle = await manager.runImprovementCycle(userId);

      if (cycle.candidates.length > 1) {
        for (let i = 0; i < cycle.candidates.length - 1; i++) {
          expect(cycle.candidates[i].estimatedImpact).toBeGreaterThanOrEqual(
            cycle.candidates[i + 1].estimatedImpact
          );
        }
      }
    });
  });
});
