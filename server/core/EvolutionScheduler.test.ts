import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { rmSync } from 'node:fs';
const fixtureRoot = vi.hoisted(() => {
  const directory = process.cwd() + '/node_modules/.cache/az-regression-test-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  vi.spyOn(process, 'cwd').mockReturnValue(directory);
  return directory;
});
afterAll(() => { vi.restoreAllMocks(); rmSync(fixtureRoot, { recursive: true, force: true }); });
import { EvolutionScheduler, SchedulerStatus } from './EvolutionScheduler';
import { SelfEvolutionWorkflow } from './SelfEvolutionWorkflow';
import { SelfImprovementManager } from './SelfImprovementManager';
import { ImprovementExecutor } from './ImprovementExecutor';
import { SafeImprovementApplier } from './SafeImprovementApplier';
import { SelfDiagnoseEngine } from './diagnose/SelfDiagnoseEngine';
import { SelfLearningEngine } from './learning/SelfLearningEngine';
import { SecurityEngine } from './security/SecurityEngine';
import { MemoryEngine } from './memory/MemoryEngine';

// ── セットアップヘルパー ──────────────────────────────────────────────────

async function setupPermissions(
  diagSecEngine: SecurityEngine,
  learnSecEngine: SecurityEngine,
  userId: string
): Promise<void> {
  const allPerms = [
    'diagnose:read', 'diagnose:write',
    'learning:read', 'learning:write',
    'memory:read', 'memory:write',
    'audit:write', 'knowledge:read', 'knowledge:write',
  ];
  for (const engine of [diagSecEngine, learnSecEngine]) {
    if (!engine.isReady()) await engine.initialize();
    try { await engine.createContext(userId, 'user'); } catch { /* already exists */ }
    for (const p of allPerms) {
      try { await engine.grantPermission(userId, p); } catch { /* already granted */ }
    }
  }
}

// ── テスト ────────────────────────────────────────────────────────────────

describe('EvolutionScheduler', () => {
  let scheduler: EvolutionScheduler;
  let applier: SafeImprovementApplier;
  let diagSecEngine: SecurityEngine;
  let learnSecEngine: SecurityEngine;
  let userId: string;

  // Existing execution/rollback assertions exercise the explicitly approved
  // simulation path. A timer-triggered cycle must remain simulation-only.
  async function triggerApprovedMockCycle() {
    const workflow = SelfEvolutionWorkflow.getInstance();
    const simulation = await workflow.runSimulation(userId);
    const history = vi.spyOn(workflow, 'getHistory').mockReturnValue([simulation]);
    try { return await scheduler.applyApprovedSimulation(userId, simulation.workflowId); }
    finally { history.mockRestore(); }
  }

  beforeEach(async () => {
    // Singleton リセット
    scheduler = EvolutionScheduler.getInstance();
    scheduler.resetForTest();

    SelfEvolutionWorkflow.getInstance().clearAllData();
    SelfImprovementManager.getInstance().clearAllData();
    ImprovementExecutor.getInstance().clearAllData();
    SelfDiagnoseEngine.getInstance().clearAllData();
    SelfLearningEngine.getInstance().clearAllData();
    MemoryEngine.getInstance().clearAllMemory();

    applier = SafeImprovementApplier.getInstance();
    applier.resetToDefaults();

    diagSecEngine = (SelfDiagnoseEngine.getInstance() as any).securityEngine as SecurityEngine;
    learnSecEngine = (SelfLearningEngine.getInstance() as any).securityEngine as SecurityEngine;

    userId = 'sched-user-' + Date.now();
    await setupPermissions(diagSecEngine, learnSecEngine, userId);
  });

  afterEach(async () => {
    scheduler.resetForTest();
    SelfEvolutionWorkflow.getInstance().clearAllData();
    SelfImprovementManager.getInstance().clearAllData();
    ImprovementExecutor.getInstance().clearAllData();
    SelfDiagnoseEngine.getInstance().clearAllData();
    SelfLearningEngine.getInstance().clearAllData();
    MemoryEngine.getInstance().clearAllMemory();
    applier.resetToDefaults();

    if (diagSecEngine.isReady()) await diagSecEngine.shutdown();
    if (learnSecEngine.isReady()) await learnSecEngine.shutdown();
  });

  // ── Singleton ────────────────────────────────────────────────────────────

  describe('Singleton', () => {
    it('should return the same instance', () => {
      expect(EvolutionScheduler.getInstance()).toBe(EvolutionScheduler.getInstance());
    });
  });

  // ── Heartbeat 型再利用 ────────────────────────────────────────────────────

  describe('HeartbeatJob descriptor', () => {
    it('should expose a valid HeartbeatJob descriptor', () => {
      const job = scheduler.getJobDescriptor();
      expect(job.name).toBeDefined();
      expect(job.path.startsWith('/api/scheduled/')).toBe(true);
      expect(job.cron).toBeDefined();
    });
  });

  // ── 設定 ─────────────────────────────────────────────────────────────────

  describe('configure', () => {
    it('should update config', () => {
      scheduler.configure({ maxChangesPerCycle: 5 });
      expect(scheduler.getConfig().maxChangesPerCycle).toBe(5);
    });

    it('should reject intervalMs below minimum', () => {
      expect(() => scheduler.configure({ intervalMs: 1000 })).toThrow();
    });

    it('should accept valid intervalMs', () => {
      scheduler.configure({ intervalMs: 60_000 });
      expect(scheduler.getConfig().intervalMs).toBe(60_000);
    });
  });

  // ── 自動実行 ON/OFF ───────────────────────────────────────────────────────

  describe('auto_cycle ON/OFF', () => {
    it('should skip when auto_cycle is disabled (default false)', async () => {
      // デフォルトは false
      const result = await scheduler.triggerOnce(userId);
      expect(result.outcome).toBe('skipped');
      expect(result.error).toContain('auto_cycle is disabled');
    });

    it('keeps enabled timer cycles read-only until the exact simulation is approved', async () => {
      await applier.apply(userId,
        { id: 'enable-review', source: 'diagnosis', title: 'Enable', description: 'Test', priority: 'low', estimatedImpact: 10, createdAt: Date.now() },
        'self_improvement.enable_auto_cycle', true);
      const apply = vi.spyOn(applier, 'applyBatch');
      try {
        const result = await scheduler.triggerOnce(userId);
        expect(result.outcome).toBe('simulation_only');
        expect(result.changesApplied).toBe(0);
        expect(apply).not.toHaveBeenCalled();
      } finally { apply.mockRestore(); }
    });

    it('should NOT skip when auto_cycle is enabled', async () => {
      // enable_auto_cycle を true に設定
      const candidate = {
        id: 'c-enable',
        source: 'diagnosis' as const,
        title: 'Enable auto cycle',
        description: 'test',
        priority: 'low' as const,
        estimatedImpact: 10,
        createdAt: Date.now(),
      };
      await applier.apply(userId, candidate, 'self_improvement.enable_auto_cycle', true);

      const result = await scheduler.triggerOnce(userId);
      // skipped にはならない（simulation_only か executed か error）
      expect(result.outcome).not.toBe('skipped');
    });
  });

  // ── 同時実行防止 ──────────────────────────────────────────────────────────

  describe('concurrent execution prevention', () => {
    it('should skip second trigger when a cycle is already running', async () => {
      // auto_cycle を有効化
      await applier.apply(
        userId,
        { id: 'c-cc', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 10, createdAt: Date.now() },
        'self_improvement.enable_auto_cycle',
        true
      );

      // 1回目を開始（完了を待たない）
      const first = scheduler.triggerOnce(userId);
      // 2回目を即座に呼ぶ
      const second = await scheduler.triggerOnce(userId);

      expect(second.outcome).toBe('skipped');
      expect(second.error).toContain('Another cycle is already running');

      // 1回目の完了を待つ
      await first;
    });
  });

  // ── 実変更数上限 ─────────────────────────────────────────────────────────

  describe('maxChangesPerCycle limit', () => {
    it('should be simulation_only when approved candidates exceed limit', async () => {
      // auto_cycle ON
      await applier.apply(
        userId,
        { id: 'c-mc', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 10, createdAt: Date.now() },
        'self_improvement.enable_auto_cycle',
        true
      );
      // limit を 0 に設定 → 何件承認されても超える
      scheduler.configure({ maxChangesPerCycle: 0 });

      const result = await scheduler.triggerOnce(userId);

      // approved が 0 件なら simulation_only（候補がない）、
      // 1 件以上なら simulation_only（上限超過）のどちらか
      expect(['simulation_only', 'skipped']).toContain(result.outcome);
    });
  });

  // ── simulation から execution への安全な遷移 ──────────────────────────────

  describe('simulation to execution transition', () => {
    it('should include simulationResult when outcome is not skipped/error', async () => {
      await applier.apply(
        userId,
        { id: 'c-tr', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 10, createdAt: Date.now() },
        'self_improvement.enable_auto_cycle',
        true
      );

      const result = await scheduler.triggerOnce(userId);

      if (result.outcome !== 'skipped' && result.outcome !== 'error') {
        expect(result.simulationResult).toBeDefined();
        expect(result.simulationResult!.mode).toBe('simulation');
      }
    });

    it('should never auto-apply critical candidates', async () => {
      await applier.apply(
        userId,
        { id: 'c-crit', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 10, createdAt: Date.now() },
        'self_improvement.enable_auto_cycle',
        true
      );

      const result = await scheduler.triggerOnce(userId);

      if (result.outcome === 'executed' && result.executionResult) {
        // 実行された候補に critical が含まれないことを確認
        const executedIds = new Set(
          result.executionResult.execution.results.map((r) => r.candidateId)
        );
        const sim = result.simulationResult;
        if (sim) {
          const criticalApproved = sim.approvedCandidates.filter(
            (c) => c.priority === 'critical'
          );
          for (const crit of criticalApproved) {
            expect(executedIds.has(crit.id)).toBe(false);
          }
        }
      } else {
        // simulation_only / skipped でも OK
        expect(['simulation_only', 'skipped', 'error']).toContain(result.outcome);
      }
    });
  });

  // ── 失敗率による自動停止 ─────────────────────────────────────────────────

  describe('failure rate auto-stop', () => {
    it('should auto-stop when failure rate exceeds threshold', async () => {
      // フェイルレートしきい値を 0 に設定（1件でも error が出たら止まる）
      // ただし history が 5 件未満はチェックしないので 5 件 error を作る
      scheduler.configure({ failureRateThreshold: 0.1 });

      await applier.apply(
        userId,
        { id: 'c-fr', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 10, createdAt: Date.now() },
        'self_improvement.enable_auto_cycle',
        true
      );

      // workflow.runSimulation を強制的に throw させる
      const workflowSpy = vi.spyOn(
        SelfEvolutionWorkflow.getInstance(),
        'runSimulation'
      ).mockRejectedValue(new Error('forced failure'));

      // 5 回以上 error を注入
      for (let i = 0; i < 6; i++) {
        await scheduler.triggerOnce(userId);
      }

      workflowSpy.mockRestore();

      expect(scheduler.getStatus()).toBe<SchedulerStatus>('auto_stopped');
    });
  });

  // ── 連続失敗による自動停止 ───────────────────────────────────────────────

  describe('consecutive failures auto-stop', () => {
    it('should auto-stop after consecutive failures reach threshold', async () => {
      scheduler.configure({ maxConsecutiveFailures: 2 });

      await applier.apply(
        userId,
        { id: 'c-cf', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 10, createdAt: Date.now() },
        'self_improvement.enable_auto_cycle',
        true
      );

      // runSimulation を強制 throw
      const spy = vi.spyOn(
        SelfEvolutionWorkflow.getInstance(),
        'runSimulation'
      ).mockRejectedValue(new Error('forced'));

      await scheduler.triggerOnce(userId); // 失敗 1
      await scheduler.triggerOnce(userId); // 失敗 2 → 停止

      spy.mockRestore();

      expect(scheduler.getStatus()).toBe<SchedulerStatus>('auto_stopped');
    });

    it('should reset consecutive failures counter on success', async () => {
      await applier.apply(
        userId,
        { id: 'c-cfr', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 10, createdAt: Date.now() },
        'self_improvement.enable_auto_cycle',
        true
      );
      scheduler.configure({ maxConsecutiveFailures: 3 });

      // 1 回失敗させてから成功
      const spy = vi.spyOn(
        SelfEvolutionWorkflow.getInstance(),
        'runSimulation'
      ).mockRejectedValueOnce(new Error('once'));

      await scheduler.triggerOnce(userId); // fail
      await scheduler.triggerOnce(userId); // success (mock is once)

      spy.mockRestore();

      expect(scheduler.getStats().consecutiveFailures).toBe(0);
    });
  });

  // ── rollback 失敗による即時停止 ──────────────────────────────────────────

  describe('rollback_failed immediate stop', () => {
    it('should auto-stop when rollback_failed is detected', async () => {
      await applier.apply(
        userId,
        { id: 'c-rbf', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 10, createdAt: Date.now() },
        'self_improvement.enable_auto_cycle',
        true
      );

      // runExecution を rollback_failed を含む結果を返すように mock
      const spy = vi.spyOn(
        SelfEvolutionWorkflow.getInstance(),
        'runExecution'
      ).mockResolvedValue({
        workflowId: 'mock-exec',
        userId,
        mode: 'execution',
        simulation: {
          workflowId: 'mock-sim',
          userId,
          mode: 'simulation',
          cycle: {} as any,
          approvedCandidates: [
            { id: 'safe-c', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 10, createdAt: Date.now() }
          ],
          rejectedCandidates: [],
          completedAt: Date.now(),
          summary: 'mock',
        },
        execution: {
          userId,
          total: 1,
          succeeded: 0,
          failed: 0,
          rolledBack: 1,
          skipped: 0,
          results: [
            {
              candidateId: 'safe-c',
              userId,
              status: 'rolled_back' as const,
              durationMs: 1,
              failureReason: 'rollback failure occurred',
              rolledBack: true,
              executedAt: Date.now(),
            },
          ],
          executedAt: Date.now(),
        },
        completedAt: Date.now(),
        summary: 'mock with rollback_failed',
      });

      // runSimulation は正常に動かし、approved を 1 件返すように上書き
      const simSpy = vi.spyOn(
        SelfEvolutionWorkflow.getInstance(),
        'runSimulation'
      ).mockResolvedValue({
        workflowId: 'mock-sim',
        userId,
        mode: 'simulation',
        cycle: {
          id: 'cyc', userId, startedAt: Date.now(),
          diagnosticReport: { id: 'd', timestamp: Date.now(), status: 'healthy' as any, components: [], issues: [], recommendations: [], overallScore: 100 },
          candidates: [],
          testResults: [],
          appliedCount: 0,
          summary: '',
        },
        approvedCandidates: [
          { id: 'safe-c', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 10, createdAt: Date.now() }
        ],
        rejectedCandidates: [],
        completedAt: Date.now(),
        summary: '[Simulation] mock',
      });

      await triggerApprovedMockCycle();

      spy.mockRestore();
      simSpy.mockRestore();

      expect(scheduler.getStatus()).toBe<SchedulerStatus>('auto_stopped');
    });
  });

  // ── getStats ──────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return zero stats initially', () => {
      const stats = scheduler.getStats();
      expect(stats.totalRuns).toBe(0);
      expect(stats.status).toBe<SchedulerStatus>('idle');
    });

    it('should accumulate run stats', async () => {
      // 2 回 skipped を作る（auto_cycle=false のデフォルト）
      await scheduler.triggerOnce(userId);
      await scheduler.triggerOnce(userId);

      const stats = scheduler.getStats();
      expect(stats.totalRuns).toBe(2);
      expect(stats.skippedRuns).toBe(2);
    });
  });

  // ── getRunHistory ─────────────────────────────────────────────────────────

  describe('getRunHistory', () => {
    it('should return empty initially', () => {
      expect(scheduler.getRunHistory()).toEqual([]);
    });

    it('should accumulate history', async () => {
      await scheduler.triggerOnce(userId);
      await scheduler.triggerOnce(userId);
      expect(scheduler.getRunHistory().length).toBe(2);
    });

    it('should respect limit', async () => {
      for (let i = 0; i < 5; i++) {
        await scheduler.triggerOnce(userId);
      }
      expect(scheduler.getRunHistory(3).length).toBe(3);
    });
  });

  // ── start / stop ──────────────────────────────────────────────────────────

  describe('start / stop', () => {
    it('should transition to running on start', () => {
      scheduler.start();
      expect(scheduler.getStatus()).toBe<SchedulerStatus>('running');
      scheduler.stop(); // クリーンアップ
    });

    it('should not double-start', () => {
      scheduler.start();
      scheduler.start(); // 2 回目は no-op
      expect(scheduler.getStatus()).toBe('running');
      scheduler.stop();
    });

    it('should transition to stopped on stop', () => {
      scheduler.start();
      scheduler.stop();
      expect(scheduler.getStatus()).toBe<SchedulerStatus>('stopped');
    });
  });

  // ── ScheduledRunResult 構造 ───────────────────────────────────────────────

  describe('ScheduledRunResult structure', () => {
    it('should have required fields', async () => {
      const result = await scheduler.triggerOnce(userId);

      expect(typeof result.runId).toBe('string');
      expect(typeof result.userId).toBe('string');
      expect(typeof result.startedAt).toBe('number');
      expect(typeof result.completedAt).toBe('number');
      expect(['simulation_only', 'executed', 'skipped', 'error']).toContain(result.outcome);
      expect(typeof result.changesApplied).toBe('number');
      expect(typeof result.rollbacks).toBe('number');
    });
  });

  // ── SafeImprovementApplier 統合 ───────────────────────────────────────────

  describe('SafeImprovementApplier integration', () => {
    it('should populate applyResult when execution succeeds and succeeded candidates exist', async () => {
      // auto_cycle ON
      await applier.apply(
        userId,
        { id: 'c-int', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 10, createdAt: Date.now() },
        'self_improvement.enable_auto_cycle',
        true
      );

      // succeeded candidate を 1 件含む execution 結果を返す mock
      const simSpy = vi.spyOn(
        SelfEvolutionWorkflow.getInstance(),
        'runSimulation'
      ).mockResolvedValue({
        workflowId: 'mock-sim-int',
        userId,
        mode: 'simulation',
        cycle: {
          id: 'cyc', userId, startedAt: Date.now(),
          diagnosticReport: { id: 'd', timestamp: Date.now(), status: 'healthy' as any, components: [], issues: [], recommendations: [], overallScore: 100 },
          candidates: [],
          testResults: [],
          appliedCount: 0,
          summary: '',
        },
        approvedCandidates: [
          {
            id: 'int-cand-1',
            source: 'diagnosis' as const,
            title: 'candidate_score_threshold adjustment',
            description: 'self_improvement.candidate_score_threshold tuning',
            priority: 'low' as const,
            estimatedImpact: 20,
            createdAt: Date.now(),
          },
        ],
        rejectedCandidates: [],
        completedAt: Date.now(),
        summary: '[Simulation] mock',
      });

      const execSpy = vi.spyOn(
        SelfEvolutionWorkflow.getInstance(),
        'runExecution'
      ).mockResolvedValue({
        workflowId: 'mock-exec-int',
        userId,
        mode: 'execution',
        simulation: {
          workflowId: 'mock-sim-int',
          userId,
          mode: 'simulation',
          cycle: {
            id: 'cyc', userId, startedAt: Date.now(),
            diagnosticReport: { id: 'd', timestamp: Date.now(), status: 'healthy' as any, components: [], issues: [], recommendations: [], overallScore: 100 },
            candidates: [],
            testResults: [],
            appliedCount: 0,
            summary: '',
          },
          approvedCandidates: [
            {
              id: 'int-cand-1',
              source: 'diagnosis' as const,
              title: 'candidate_score_threshold adjustment',
              description: 'self_improvement.candidate_score_threshold tuning',
              priority: 'low' as const,
              estimatedImpact: 20,
              createdAt: Date.now(),
            },
          ],
          rejectedCandidates: [],
          completedAt: Date.now(),
          summary: '[Simulation] mock',
        },
        execution: {
          userId,
          total: 1,
          succeeded: 1,
          failed: 0,
          rolledBack: 0,
          skipped: 0,
          results: [
            {
              candidateId: 'int-cand-1',
              userId,
              status: 'success' as const,
              durationMs: 5,
              rolledBack: false,
              executedAt: Date.now(),
            },
          ],
          executedAt: Date.now(),
        },
        completedAt: Date.now(),
        summary: '[Execution] mock',
      });

      const result = await triggerApprovedMockCycle();

      simSpy.mockRestore();
      execSpy.mockRestore();

      expect(result.outcome).toBe('executed');
      // applyResult が定義されている（SafeImprovementApplier が呼ばれた）
      expect(result.applyResult).toBeDefined();
      expect(result.applyResult!.total).toBeGreaterThan(0);
    });

    it('should NOT populate applyResult when no candidates succeeded', async () => {
      await applier.apply(
        userId,
        { id: 'c-ns', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 10, createdAt: Date.now() },
        'self_improvement.enable_auto_cycle',
        true
      );

      // succeeded なしの execution 結果
      const simSpy = vi.spyOn(
        SelfEvolutionWorkflow.getInstance(),
        'runSimulation'
      ).mockResolvedValue({
        workflowId: 'mock-sim-ns',
        userId,
        mode: 'simulation',
        cycle: {
          id: 'cyc', userId, startedAt: Date.now(),
          diagnosticReport: { id: 'd', timestamp: Date.now(), status: 'healthy' as any, components: [], issues: [], recommendations: [], overallScore: 100 },
          candidates: [],
          testResults: [],
          appliedCount: 0,
          summary: '',
        },
        approvedCandidates: [
          { id: 'ns-cand-1', source: 'diagnosis' as const, title: 'T', description: 'D', priority: 'low' as const, estimatedImpact: 10, createdAt: Date.now() },
        ],
        rejectedCandidates: [],
        completedAt: Date.now(),
        summary: '[Simulation] mock',
      });

      const execSpy = vi.spyOn(
        SelfEvolutionWorkflow.getInstance(),
        'runExecution'
      ).mockResolvedValue({
        workflowId: 'mock-exec-ns',
        userId,
        mode: 'execution',
        simulation: {
          workflowId: 'mock-sim-ns',
          userId,
          mode: 'simulation',
          cycle: {
            id: 'cyc', userId, startedAt: Date.now(),
            diagnosticReport: { id: 'd', timestamp: Date.now(), status: 'healthy' as any, components: [], issues: [], recommendations: [], overallScore: 100 },
            candidates: [],
            testResults: [],
            appliedCount: 0,
            summary: '',
          },
          approvedCandidates: [
            { id: 'ns-cand-1', source: 'diagnosis' as const, title: 'T', description: 'D', priority: 'low' as const, estimatedImpact: 10, createdAt: Date.now() },
          ],
          rejectedCandidates: [],
          completedAt: Date.now(),
          summary: '[Simulation] mock',
        },
        execution: {
          userId,
          total: 1,
          succeeded: 0,
          failed: 0,
          rolledBack: 1,
          skipped: 0,
          results: [
            {
              candidateId: 'ns-cand-1',
              userId,
              status: 'rolled_back' as const,
              durationMs: 5,
              failureReason: 'simulated failure',
              rolledBack: true,
              executedAt: Date.now(),
            },
          ],
          executedAt: Date.now(),
        },
        completedAt: Date.now(),
        summary: '[Execution] mock no-success',
      });

      const result = await triggerApprovedMockCycle();

      simSpy.mockRestore();
      execSpy.mockRestore();

      expect(result.outcome).toBe('executed');
      // 成功候補がないので applyResult は undefined
      expect(result.applyResult).toBeUndefined();
    });

    it('should auto-stop when SafeImprovementApplier rollback_failed occurs', async () => {
      await applier.apply(
        userId,
        { id: 'c-rbf2', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 10, createdAt: Date.now() },
        'self_improvement.enable_auto_cycle',
        true
      );

      // applyBatch が rollback_failed を含む結果を返すように mock
      const applierSpy = vi.spyOn(applier, 'applyBatch').mockResolvedValue({
        userId,
        total: 1,
        applied: 0,
        rolledBack: 0,
        rejected: 0,
        rollbackFailed: 1,
        results: [],
        executedAt: Date.now(),
      });

      const simSpy = vi.spyOn(
        SelfEvolutionWorkflow.getInstance(),
        'runSimulation'
      ).mockResolvedValue({
        workflowId: 'mock-sim-rbf2',
        userId,
        mode: 'simulation',
        cycle: {
          id: 'cyc', userId, startedAt: Date.now(),
          diagnosticReport: { id: 'd', timestamp: Date.now(), status: 'healthy' as any, components: [], issues: [], recommendations: [], overallScore: 100 },
          candidates: [],
          testResults: [],
          appliedCount: 0,
          summary: '',
        },
        approvedCandidates: [
          {
            id: 'rbf2-cand-1',
            source: 'diagnosis' as const,
            title: 'candidate_score_threshold adjustment',
            description: 'self_improvement.candidate_score_threshold tuning',
            priority: 'low' as const,
            estimatedImpact: 20,
            createdAt: Date.now(),
          },
        ],
        rejectedCandidates: [],
        completedAt: Date.now(),
        summary: '[Simulation] mock',
      });

      const execSpy = vi.spyOn(
        SelfEvolutionWorkflow.getInstance(),
        'runExecution'
      ).mockResolvedValue({
        workflowId: 'mock-exec-rbf2',
        userId,
        mode: 'execution',
        simulation: {
          workflowId: 'mock-sim-rbf2',
          userId,
          mode: 'simulation',
          cycle: {
            id: 'cyc', userId, startedAt: Date.now(),
            diagnosticReport: { id: 'd', timestamp: Date.now(), status: 'healthy' as any, components: [], issues: [], recommendations: [], overallScore: 100 },
            candidates: [],
            testResults: [],
            appliedCount: 0,
            summary: '',
          },
          approvedCandidates: [
            {
              id: 'rbf2-cand-1',
              source: 'diagnosis' as const,
              title: 'candidate_score_threshold adjustment',
              description: 'self_improvement.candidate_score_threshold tuning',
              priority: 'low' as const,
              estimatedImpact: 20,
              createdAt: Date.now(),
            },
          ],
          rejectedCandidates: [],
          completedAt: Date.now(),
          summary: '[Simulation] mock',
        },
        execution: {
          userId,
          total: 1,
          succeeded: 1,
          failed: 0,
          rolledBack: 0,
          skipped: 0,
          results: [
            {
              candidateId: 'rbf2-cand-1',
              userId,
              status: 'success' as const,
              durationMs: 5,
              rolledBack: false,
              executedAt: Date.now(),
            },
          ],
          executedAt: Date.now(),
        },
        completedAt: Date.now(),
        summary: '[Execution] mock rbf2',
      });

      await triggerApprovedMockCycle();

      applierSpy.mockRestore();
      simSpy.mockRestore();
      execSpy.mockRestore();

      expect(scheduler.getStatus()).toBe<SchedulerStatus>('auto_stopped');
    });
  });
});
