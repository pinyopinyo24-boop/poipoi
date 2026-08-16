/**
 * HeartbeatConnector テスト
 *
 * テスト項目:
 *  1. auto cycle ON → 自動実行される
 *  2. auto cycle OFF → 実行されない
 *  3. Heartbeat → EvolutionScheduler が起動する
 *  4. 同時実行 → 2つ目を拒否する
 *  5. simulation 成功 → execution へ進む
 *  6. simulation 安全条件不成立 → execution しない
 *  7. 1サイクルの実変更数上限を超えない
 *  8. critical 改善を自動適用しない
 *  9. 失敗率超過 → 自動停止
 * 10. 連続失敗 → 自動停止
 * 11. rollback_failed → 即停止
 * 12. MemoryEngine へ結果保存
 * 13. SelfLearningEngine へ結果保存
 * 14. 既存手動実行 API が従来通り動く
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HeartbeatConnector } from './HeartbeatConnector';
import { EvolutionScheduler, SchedulerStatus } from './EvolutionScheduler';
import { SelfEvolutionWorkflow } from './SelfEvolutionWorkflow';
import { SelfImprovementManager } from './SelfImprovementManager';
import { ImprovementExecutor } from './ImprovementExecutor';
import { SafeImprovementApplier } from './SafeImprovementApplier';
import { SelfDiagnoseEngine } from './diagnose/SelfDiagnoseEngine';
import { SelfLearningEngine, LearningCycleStatus } from './learning/SelfLearningEngine';
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

/** approved 1件・execution 成功 1件の標準モックを設定する */
function mockSuccessfulRun(
  userId: string,
  candidateId = 'mock-cand',
  candidateKey = 'candidate_score_threshold adjustment',
  candidateDesc = 'self_improvement.candidate_score_threshold tuning'
) {
  const approvedCandidates = [
    {
      id: candidateId,
      source: 'diagnosis' as const,
      title: candidateKey,
      description: candidateDesc,
      priority: 'low' as const,
      estimatedImpact: 20,
      createdAt: Date.now(),
    },
  ];
  const cycle = {
    id: 'cyc', userId, startedAt: Date.now(),
    diagnosticReport: {
      id: 'd', timestamp: Date.now(), status: 'healthy' as any,
      components: [], issues: [], recommendations: [], overallScore: 100,
    },
    candidates: [],
    testResults: [],
    appliedCount: 0,
    summary: '',
  };
  const simResult = {
    workflowId: 'mock-sim',
    userId, mode: 'simulation' as const,
    cycle, approvedCandidates,
    rejectedCandidates: [],
    completedAt: Date.now(),
    summary: '[Simulation] mock',
  };
  const execResult = {
    workflowId: 'mock-exec',
    userId, mode: 'execution' as const,
    simulation: simResult,
    execution: {
      userId, total: 1, succeeded: 1, failed: 0, rolledBack: 0, skipped: 0,
      results: [{
        candidateId, userId, status: 'success' as const,
        durationMs: 5, rolledBack: false, executedAt: Date.now(),
      }],
      executedAt: Date.now(),
    },
    completedAt: Date.now(),
    summary: '[Execution] mock',
  };
  const simSpy = vi.spyOn(SelfEvolutionWorkflow.getInstance(), 'runSimulation')
    .mockResolvedValue(simResult);
  const execSpy = vi.spyOn(SelfEvolutionWorkflow.getInstance(), 'runExecution')
    .mockResolvedValue(execResult);
  return { simSpy, execSpy, simResult, execResult };
}

// ── テスト ────────────────────────────────────────────────────────────────

describe('HeartbeatConnector', () => {
  let connector: HeartbeatConnector;
  let scheduler: EvolutionScheduler;
  let applier: SafeImprovementApplier;
  let memoryEngine: MemoryEngine;
  let learningEngine: SelfLearningEngine;
  let diagSecEngine: SecurityEngine;
  let learnSecEngine: SecurityEngine;
  let userId: string;

  beforeEach(async () => {
    connector = HeartbeatConnector.getInstance();
    scheduler = EvolutionScheduler.getInstance();
    applier = SafeImprovementApplier.getInstance();
    memoryEngine = MemoryEngine.getInstance();
    learningEngine = SelfLearningEngine.getInstance();

    // Singleton リセット
    scheduler.resetForTest();
    SelfEvolutionWorkflow.getInstance().clearAllData();
    SelfImprovementManager.getInstance().clearAllData();
    ImprovementExecutor.getInstance().clearAllData();
    SelfDiagnoseEngine.getInstance().clearAllData();
    learningEngine.clearAllData();
    memoryEngine.clearAllMemory();
    applier.resetToDefaults();
    connector.clearCallbackHistory();

    diagSecEngine = (SelfDiagnoseEngine.getInstance() as any).securityEngine as SecurityEngine;
    learnSecEngine = (learningEngine as any).securityEngine as SecurityEngine;

    userId = 'hb-test-' + Date.now();
    await setupPermissions(diagSecEngine, learnSecEngine, userId);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    scheduler.resetForTest();
    SelfEvolutionWorkflow.getInstance().clearAllData();
    SelfImprovementManager.getInstance().clearAllData();
    ImprovementExecutor.getInstance().clearAllData();
    SelfDiagnoseEngine.getInstance().clearAllData();
    learningEngine.clearAllData();
    memoryEngine.clearAllMemory();
    applier.resetToDefaults();
    connector.clearCallbackHistory();
    if (diagSecEngine.isReady()) await diagSecEngine.shutdown();
    if (learnSecEngine.isReady()) await learnSecEngine.shutdown();
  });

  // ── 1. auto cycle ON → 自動実行される ──────────────────────────────────

  it('1: auto cycle ON → onHeartbeatCallback should not skip', async () => {
    // auto_cycle を ON にする
    await applier.apply(
      userId,
      { id: 'c-on', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 0, createdAt: Date.now() },
      'self_improvement.enable_auto_cycle',
      true
    );

    const result = await connector.onHeartbeatCallback(userId);

    // skipped にはならない（simulation_only / executed / error）
    expect(result.runResult.outcome).not.toBe('skipped');
  });

  // ── 2. auto cycle OFF → 実行されない ───────────────────────────────────

  it('2: auto cycle OFF → outcome should be skipped', async () => {
    // デフォルト false のまま実行
    const result = await connector.onHeartbeatCallback(userId);
    expect(result.runResult.outcome).toBe('skipped');
    expect(result.runResult.error).toContain('auto_cycle is disabled');
  });

  // ── 3. Heartbeat → EvolutionScheduler が起動する ───────────────────────

  it('3: heartbeat callback delegates to EvolutionScheduler', async () => {
    const triggerSpy = vi.spyOn(scheduler, 'triggerOnce');

    await connector.onHeartbeatCallback(userId);

    expect(triggerSpy).toHaveBeenCalledWith(userId);
    expect(triggerSpy).toHaveBeenCalledTimes(1);
  });

  // ── 4. 同時実行 → 2つ目を拒否する ─────────────────────────────────────

  it('4: concurrent execution is rejected', async () => {
    await applier.apply(
      userId,
      { id: 'c-cc', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 0, createdAt: Date.now() },
      'self_improvement.enable_auto_cycle',
      true
    );

    // 1回目を開始（完了を待たない）
    const first = connector.onHeartbeatCallback(userId);
    // 2回目を即座に呼ぶ
    const second = await connector.onHeartbeatCallback(userId);

    expect(second.runResult.outcome).toBe('skipped');
    expect(second.runResult.error).toContain('Another cycle is already running');

    await first; // クリーンアップ
  });

  // ── 5. simulation 成功 → execution へ進む ──────────────────────────────

  it('5: simulation success leads to execution', async () => {
    await applier.apply(
      userId,
      { id: 'c-se', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 0, createdAt: Date.now() },
      'self_improvement.enable_auto_cycle',
      true
    );

    const { simSpy, execSpy } = mockSuccessfulRun(userId);

    const result = await connector.onHeartbeatCallback(userId);

    simSpy.mockRestore();
    execSpy.mockRestore();

    expect(result.runResult.outcome).toBe('executed');
    expect(result.runResult.executionResult).toBeDefined();
  });

  // ── 6. simulation 安全条件不成立 → execution しない ────────────────────

  it('6: simulation_only when approved candidates exceed maxChangesPerCycle', async () => {
    await applier.apply(
      userId,
      { id: 'c-sf', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 0, createdAt: Date.now() },
      'self_improvement.enable_auto_cycle',
      true
    );
    // 上限を 0 にして常に超過させる
    scheduler.configure({ maxChangesPerCycle: 0 });

    // approved を 1 件持つ simulation を返す
    const { simSpy } = mockSuccessfulRun(userId);

    const result = await connector.onHeartbeatCallback(userId);

    simSpy.mockRestore();

    // simulation_only になること（execution に進まない）
    expect(result.runResult.outcome).toBe('simulation_only');
    expect(result.runResult.executionResult).toBeUndefined();
  });

  // ── 7. 1サイクルの実変更数上限を超えない ───────────────────────────────

  it('7: changesApplied never exceeds maxChangesPerCycle', async () => {
    await applier.apply(
      userId,
      { id: 'c-lim', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 0, createdAt: Date.now() },
      'self_improvement.enable_auto_cycle',
      true
    );
    const limit = 2;
    scheduler.configure({ maxChangesPerCycle: limit });

    const { simSpy, execSpy } = mockSuccessfulRun(userId);

    const result = await connector.onHeartbeatCallback(userId);

    simSpy.mockRestore();
    execSpy.mockRestore();

    expect(result.runResult.changesApplied).toBeLessThanOrEqual(limit);
  });

  // ── 8. critical 改善を自動適用しない ───────────────────────────────────

  it('8: critical candidates are not auto-applied', async () => {
    await applier.apply(
      userId,
      { id: 'c-crit', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 0, createdAt: Date.now() },
      'self_improvement.enable_auto_cycle',
      true
    );

    // critical を含む simulation 結果を返す
    const criticalCandidate = {
      id: 'critical-cand',
      source: 'diagnosis' as const,
      title: 'Critical fix',
      description: 'Critical issue fix',
      priority: 'critical' as const,
      estimatedImpact: 90,
      createdAt: Date.now(),
    };
    const cycle = {
      id: 'cyc', userId, startedAt: Date.now(),
      diagnosticReport: { id: 'd', timestamp: Date.now(), status: 'healthy' as any, components: [], issues: [], recommendations: [], overallScore: 100 },
      candidates: [], testResults: [], appliedCount: 0, summary: '',
    };
    const simSpy = vi.spyOn(SelfEvolutionWorkflow.getInstance(), 'runSimulation')
      .mockResolvedValue({
        workflowId: 'mock-sim-crit',
        userId, mode: 'simulation',
        cycle,
        approvedCandidates: [criticalCandidate],
        rejectedCandidates: [],
        completedAt: Date.now(),
        summary: '[Simulation] mock-crit',
      });

    const result = await connector.onHeartbeatCallback(userId);
    simSpy.mockRestore();

    // critical のみ → safeApproved が 0 → simulation_only
    expect(result.runResult.outcome).toBe('simulation_only');

    // execution に進んでいても critical は実行されていないこと
    if (result.runResult.outcome === 'executed' && result.runResult.executionResult) {
      const executedIds = new Set(
        result.runResult.executionResult.execution.results.map((r) => r.candidateId)
      );
      expect(executedIds.has('critical-cand')).toBe(false);
    }
  });

  // ── 9. 失敗率超過 → 自動停止 ──────────────────────────────────────────

  it('9: auto-stop when failure rate exceeds threshold', async () => {
    await applier.apply(
      userId,
      { id: 'c-fr', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 0, createdAt: Date.now() },
      'self_improvement.enable_auto_cycle',
      true
    );
    scheduler.configure({ failureRateThreshold: 0.1 });

    const spy = vi.spyOn(SelfEvolutionWorkflow.getInstance(), 'runSimulation')
      .mockRejectedValue(new Error('forced failure'));

    for (let i = 0; i < 6; i++) {
      await connector.onHeartbeatCallback(userId);
    }
    spy.mockRestore();

    expect(scheduler.getStatus()).toBe<SchedulerStatus>('auto_stopped');
  });

  // ── 10. 連続失敗 → 自動停止 ───────────────────────────────────────────

  it('10: auto-stop after consecutive failures', async () => {
    await applier.apply(
      userId,
      { id: 'c-cf', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 0, createdAt: Date.now() },
      'self_improvement.enable_auto_cycle',
      true
    );
    scheduler.configure({ maxConsecutiveFailures: 2 });

    const spy = vi.spyOn(SelfEvolutionWorkflow.getInstance(), 'runSimulation')
      .mockRejectedValue(new Error('forced'));

    await connector.onHeartbeatCallback(userId); // 失敗 1
    await connector.onHeartbeatCallback(userId); // 失敗 2 → 停止

    spy.mockRestore();

    expect(scheduler.getStatus()).toBe<SchedulerStatus>('auto_stopped');
  });

  // ── 11. rollback_failed → 即停止 ──────────────────────────────────────

  it('11: auto-stop immediately on rollback_failed', async () => {
    await applier.apply(
      userId,
      { id: 'c-rbf', source: 'diagnosis', title: 'T', description: 'D', priority: 'low', estimatedImpact: 0, createdAt: Date.now() },
      'self_improvement.enable_auto_cycle',
      true
    );

    const candidateId = 'rbf-cand';
    const cycle = {
      id: 'cyc', userId, startedAt: Date.now(),
      diagnosticReport: { id: 'd', timestamp: Date.now(), status: 'healthy' as any, components: [], issues: [], recommendations: [], overallScore: 100 },
      candidates: [], testResults: [], appliedCount: 0, summary: '',
    };
    const approvedCandidates = [
      { id: candidateId, source: 'diagnosis' as const, title: 'T', description: 'D', priority: 'low' as const, estimatedImpact: 10, createdAt: Date.now() },
    ];
    const simSpy = vi.spyOn(SelfEvolutionWorkflow.getInstance(), 'runSimulation')
      .mockResolvedValue({
        workflowId: 'mock-sim-rbf',
        userId, mode: 'simulation',
        cycle, approvedCandidates,
        rejectedCandidates: [],
        completedAt: Date.now(),
        summary: '[Simulation] mock',
      });
    const execSpy = vi.spyOn(SelfEvolutionWorkflow.getInstance(), 'runExecution')
      .mockResolvedValue({
        workflowId: 'mock-exec-rbf',
        userId, mode: 'execution',
        simulation: {
          workflowId: 'mock-sim-rbf', userId, mode: 'simulation',
          cycle, approvedCandidates, rejectedCandidates: [],
          completedAt: Date.now(), summary: '[Simulation] mock',
        },
        execution: {
          userId, total: 1, succeeded: 0, failed: 0, rolledBack: 1, skipped: 0,
          results: [{
            candidateId, userId,
            status: 'rolled_back' as const,
            durationMs: 1,
            failureReason: 'rollback failure occurred',
            rolledBack: true,
            executedAt: Date.now(),
          }],
          executedAt: Date.now(),
        },
        completedAt: Date.now(),
        summary: 'mock with rollback_failed',
      });

    await connector.onHeartbeatCallback(userId);

    simSpy.mockRestore();
    execSpy.mockRestore();

    expect(scheduler.getStatus()).toBe<SchedulerStatus>('auto_stopped');
  });

  // ── 12. MemoryEngine へ結果保存 ────────────────────────────────────────

  it('12: result is saved to MemoryEngine', async () => {
    const result = await connector.onHeartbeatCallback(userId);

    // HeartbeatConnector が heartbeat_callback_{triggeredAt} として保存する
    const key = `heartbeat_callback_${result.triggeredAt}`;
    const stored = memoryEngine.getMemory(userId, key);
    expect(stored).toBeDefined();
    expect((stored as any).runResult.runId).toBe(result.runResult.runId);
  });

  // ── 13. SelfLearningEngine へ結果保存 ──────────────────────────────────

  it('13: result is recorded to SelfLearningEngine when cycle is active', async () => {
    // 学習サイクルを事前に起動しておく
    const cycle = await learningEngine.startLearningCycle(userId);

    const recordSpy = vi.spyOn(learningEngine, 'recordDataPoint');

    await connector.onHeartbeatCallback(userId);

    // recordDataPoint が呼ばれていること
    expect(recordSpy).toHaveBeenCalled();

    // クリーンアップ
    await learningEngine.completeLearningCycle(userId, cycle.id);
    recordSpy.mockRestore();
  });

  // ── 14. 既存手動実行 API が従来通り動く ───────────────────────────────

  it('14: existing manual triggerOnce API still works independently', async () => {
    // EvolutionScheduler.triggerOnce() は HeartbeatConnector を介さず直接呼べる
    const directResult = await scheduler.triggerOnce(userId);

    expect(directResult).toBeDefined();
    expect(typeof directResult.runId).toBe('string');
    expect(typeof directResult.outcome).toBe('string');
    expect(['simulation_only', 'executed', 'skipped', 'error']).toContain(directResult.outcome);

    // HeartbeatConnector のコールバック履歴には影響しない
    expect(connector.getCallbackHistory()).toHaveLength(0);
  });

  // ── HeartbeatConnector API ────────────────────────────────────────────

  describe('HeartbeatConnector API', () => {
    it('should return Singleton instance', () => {
      expect(HeartbeatConnector.getInstance()).toBe(HeartbeatConnector.getInstance());
    });

    it('should expose HeartbeatJob descriptor', () => {
      const job = connector.getJobDescriptor();
      expect(job.name).toBe('self-evolution');
      expect(job.path.startsWith('/api/scheduled/')).toBe(true);
      expect(job.cron).toBeDefined();
    });

    it('should accumulate callback history', async () => {
      await connector.onHeartbeatCallback(userId);
      await connector.onHeartbeatCallback(userId);
      expect(connector.getCallbackHistory().length).toBe(2);
    });

    it('should respect callback history limit', async () => {
      for (let i = 0; i < 5; i++) {
        await connector.onHeartbeatCallback(userId);
      }
      expect(connector.getCallbackHistory(3).length).toBe(3);
    });

    it('should clear callback history', async () => {
      await connector.onHeartbeatCallback(userId);
      connector.clearCallbackHistory();
      expect(connector.getCallbackHistory()).toHaveLength(0);
    });

    it('getSchedulerStatus should include status, config, stats, jobDescriptor', () => {
      const status = connector.getSchedulerStatus();
      expect(status.status).toBeDefined();
      expect(status.config).toBeDefined();
      expect(status.stats).toBeDefined();
      expect(status.jobDescriptor).toBeDefined();
    });

    it('triggerManually should behave same as onHeartbeatCallback', async () => {
      const a = await connector.onHeartbeatCallback(userId);
      connector.clearCallbackHistory();
      const b = await connector.triggerManually(userId);

      expect(b.runResult.outcome).toBe(a.runResult.outcome);
    });
  });
});
