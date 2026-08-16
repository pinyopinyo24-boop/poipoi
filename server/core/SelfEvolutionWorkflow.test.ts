import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SelfEvolutionWorkflow,
  SimulationResult,
  ExecutionWorkflowResult,
  WorkflowResult,
} from './SelfEvolutionWorkflow';
import { SelfImprovementManager } from './SelfImprovementManager';
import { ImprovementExecutor } from './ImprovementExecutor';
import { SelfDiagnoseEngine } from './diagnose/SelfDiagnoseEngine';
import { SelfLearningEngine } from './learning/SelfLearningEngine';
import { SecurityEngine } from './security/SecurityEngine';
import { MemoryEngine } from './memory/MemoryEngine';

// ── セットアップヘルパー ─────────────────────────────────────────────────────

async function grantAllPermissions(
  secEngine: SecurityEngine,
  userId: string
): Promise<void> {
  await secEngine.createContext(userId, 'user');
  for (const perm of [
    'diagnose:read',
    'diagnose:write',
    'learning:read',
    'learning:write',
    'memory:read',
    'memory:write',
    'audit:write',
    'knowledge:read',
    'knowledge:write',
  ]) {
    await secEngine.grantPermission(userId, perm);
  }
}

// ── テスト本体 ────────────────────────────────────────────────────────────────

describe('SelfEvolutionWorkflow', () => {
  let workflow: SelfEvolutionWorkflow;
  let diagSecEngine: SecurityEngine;
  let learnSecEngine: SecurityEngine;
  let userId: string;

  beforeEach(async () => {
    // Singleton リセット
    workflow = SelfEvolutionWorkflow.getInstance();
    workflow.clearAllData();

    SelfImprovementManager.getInstance().clearAllData();
    ImprovementExecutor.getInstance().clearAllData();
    SelfDiagnoseEngine.getInstance().clearAllData();
    SelfLearningEngine.getInstance().clearAllData();
    MemoryEngine.getInstance().clearAllMemory();

    // SelfDiagnoseEngine の SecurityEngine を初期化
    diagSecEngine = (SelfDiagnoseEngine.getInstance() as any).securityEngine as SecurityEngine;
    if (!diagSecEngine.isReady()) await diagSecEngine.initialize();

    // SelfLearningEngine の SecurityEngine を初期化
    learnSecEngine = (SelfLearningEngine.getInstance() as any).securityEngine as SecurityEngine;
    if (!learnSecEngine.isReady()) await learnSecEngine.initialize();

    userId = 'workflow-user-' + Date.now();

    await grantAllPermissions(diagSecEngine, userId);
    await grantAllPermissions(learnSecEngine, userId);
  });

  afterEach(async () => {
    workflow.clearAllData();
    SelfImprovementManager.getInstance().clearAllData();
    ImprovementExecutor.getInstance().clearAllData();
    SelfDiagnoseEngine.getInstance().clearAllData();
    SelfLearningEngine.getInstance().clearAllData();
    MemoryEngine.getInstance().clearAllMemory();

    if (diagSecEngine.isReady()) await diagSecEngine.shutdown();
    if (learnSecEngine.isReady()) await learnSecEngine.shutdown();
  });

  // ── Singleton ────────────────────────────────────────────────────────────

  describe('Singleton', () => {
    it('should return the same instance', () => {
      expect(SelfEvolutionWorkflow.getInstance()).toBe(SelfEvolutionWorkflow.getInstance());
    });
  });

  // ── runSimulation ─────────────────────────────────────────────────────────

  describe('runSimulation', () => {
    it('should return a SimulationResult', async () => {
      const result = await workflow.runSimulation(userId);

      expect(result).toBeDefined();
      expect(result.mode).toBe('simulation');
      expect(result.workflowId).toBeDefined();
      expect(result.userId).toBe(userId);
    });

    it('should include a diagnostic cycle', async () => {
      const result = await workflow.runSimulation(userId);

      expect(result.cycle).toBeDefined();
      expect(result.cycle.diagnosticReport).toBeDefined();
      expect(Array.isArray(result.cycle.candidates)).toBe(true);
      expect(Array.isArray(result.cycle.testResults)).toBe(true);
    });

    it('should classify candidates into approved and rejected', async () => {
      const result = await workflow.runSimulation(userId);

      expect(Array.isArray(result.approvedCandidates)).toBe(true);
      expect(Array.isArray(result.rejectedCandidates)).toBe(true);
      // 合計はサイクル内の全候補数と一致
      expect(result.approvedCandidates.length + result.rejectedCandidates.length).toBe(
        result.cycle.candidates.length
      );
    });

    it('should NOT execute any improvement (executor history stays empty)', async () => {
      await workflow.runSimulation(userId);

      const execHistory = ImprovementExecutor.getInstance().getExecutionHistory(userId);
      expect(execHistory.length).toBe(0);
    });

    it('should set a non-empty summary with [Simulation] prefix', async () => {
      const result = await workflow.runSimulation(userId);

      expect(result.summary.startsWith('[Simulation]')).toBe(true);
      expect(result.summary.length).toBeGreaterThan(10);
    });

    it('should save result to MemoryEngine', async () => {
      const result = await workflow.runSimulation(userId);

      const stored = MemoryEngine.getInstance().getMemory<SimulationResult>(
        userId,
        `workflow_sim_${result.workflowId}`
      );
      expect(stored).toBeDefined();
      expect(stored!.workflowId).toBe(result.workflowId);
    });

    it('should have completedAt >= cycle.startedAt', async () => {
      const result = await workflow.runSimulation(userId);
      expect(result.completedAt).toBeGreaterThanOrEqual(result.cycle.startedAt);
    });
  });

  // ── runExecution ──────────────────────────────────────────────────────────

  describe('runExecution', () => {
    it('should return an ExecutionWorkflowResult', async () => {
      const result = await workflow.runExecution(userId);

      expect(result).toBeDefined();
      expect(result.mode).toBe('execution');
      expect(result.workflowId).toBeDefined();
      expect(result.userId).toBe(userId);
    });

    it('should contain a simulation sub-result', async () => {
      const result = await workflow.runExecution(userId);

      expect(result.simulation).toBeDefined();
      expect(result.simulation.mode).toBe('simulation');
      expect(result.simulation.cycle).toBeDefined();
    });

    it('should contain an execution sub-result', async () => {
      const result = await workflow.runExecution(userId);

      expect(result.execution).toBeDefined();
      expect(typeof result.execution.total).toBe('number');
      expect(typeof result.execution.succeeded).toBe('number');
      expect(typeof result.execution.rolledBack).toBe('number');
    });

    it('should only execute approved candidates', async () => {
      const result = await workflow.runExecution(userId);

      // 実行数 = 承認済み候補数
      expect(result.execution.total).toBe(result.simulation.approvedCandidates.length);
    });

    it('should NOT execute rejected candidates', async () => {
      const result = await workflow.runExecution(userId);

      // executor の履歴には拒否候補の id が含まれない
      const executedIds = new Set(result.execution.results.map((r) => r.candidateId));
      for (const rejected of result.simulation.rejectedCandidates) {
        expect(executedIds.has(rejected.id)).toBe(false);
      }
    });

    it('should set a non-empty summary with [Execution] prefix', async () => {
      const result = await workflow.runExecution(userId);

      expect(result.summary.startsWith('[Execution]')).toBe(true);
      expect(result.summary.length).toBeGreaterThan(10);
    });

    it('should save result to MemoryEngine', async () => {
      const result = await workflow.runExecution(userId);

      const stored = MemoryEngine.getInstance().getMemory<ExecutionWorkflowResult>(
        userId,
        `workflow_exec_${result.workflowId}`
      );
      expect(stored).toBeDefined();
      expect(stored!.workflowId).toBe(result.workflowId);
    });

    it('should record execution in ImprovementExecutor history', async () => {
      const result = await workflow.runExecution(userId);

      const execHistory = ImprovementExecutor.getInstance().getExecutionHistory(userId);
      // 承認候補がある場合は履歴に記録されている
      if (result.simulation.approvedCandidates.length > 0) {
        expect(execHistory.length).toBeGreaterThan(0);
      }
    });

    it('succeeded + rolledBack + failed + skipped = total', async () => {
      const result = await workflow.runExecution(userId);
      const { succeeded, rolledBack, failed, skipped, total } = result.execution;
      expect(succeeded + rolledBack + failed + skipped).toBe(total);
    });
  });

  // ── simulation vs execution の明確な区別 ─────────────────────────────────

  describe('mode distinction', () => {
    it('simulation should never touch ImprovementExecutor', async () => {
      await workflow.runSimulation(userId);
      // Executor 履歴は空のまま
      expect(ImprovementExecutor.getInstance().getExecutionHistory(userId)).toHaveLength(0);
    });

    it('execution should touch ImprovementExecutor when candidates exist', async () => {
      const result = await workflow.runExecution(userId);
      // 承認候補が 1 件以上あれば Executor が動いている
      if (result.simulation.approvedCandidates.length > 0) {
        expect(
          ImprovementExecutor.getInstance().getExecutionHistory(userId).length
        ).toBeGreaterThan(0);
      }
    });

    it('simulation result mode is "simulation"', async () => {
      const r = await workflow.runSimulation(userId);
      expect(r.mode).toBe<'simulation'>('simulation');
    });

    it('execution result mode is "execution"', async () => {
      const r = await workflow.runExecution(userId);
      expect(r.mode).toBe<'execution'>('execution');
    });
  });

  // ── getHistory / getLatest ────────────────────────────────────────────────

  describe('getHistory', () => {
    it('should return empty array initially', () => {
      expect(workflow.getHistory(userId)).toEqual([]);
    });

    it('should accumulate results from both modes', async () => {
      await workflow.runSimulation(userId);
      await workflow.runExecution(userId);
      // simulation + execution 内でもう 1 つ simulation が記録されるので 3 件
      expect(workflow.getHistory(userId).length).toBe(3);
    });

    it('should respect the limit parameter', async () => {
      await workflow.runSimulation(userId);
      await workflow.runSimulation(userId);
      await workflow.runSimulation(userId);

      expect(workflow.getHistory(userId, 2).length).toBe(2);
    });

    it('should isolate by userId', async () => {
      const other = 'other-workflow-user-' + Date.now();

      // other ユーザーの権限を付与
      await grantAllPermissions(diagSecEngine, other);
      await grantAllPermissions(learnSecEngine, other);

      await workflow.runSimulation(userId);
      await workflow.runSimulation(other);

      expect(workflow.getHistory(userId).length).toBe(1);
      expect(workflow.getHistory(other).length).toBe(1);
    });
  });

  describe('getLatest', () => {
    it('should return null when no history exists', () => {
      expect(workflow.getLatest(userId)).toBeNull();
    });

    it('should return the most recent result', async () => {
      await workflow.runSimulation(userId);
      const second = await workflow.runSimulation(userId);

      const latest = workflow.getLatest(userId);
      expect(latest!.workflowId).toBe(second.workflowId);
    });
  });

  describe('getHistoryByMode', () => {
    it('should filter by simulation mode', async () => {
      await workflow.runSimulation(userId);
      await workflow.runExecution(userId);

      const simOnly = workflow.getHistoryByMode(userId, 'simulation');
      expect(simOnly.every((r) => r.mode === 'simulation')).toBe(true);
    });

    it('should filter by execution mode', async () => {
      await workflow.runSimulation(userId);
      await workflow.runExecution(userId);

      const execOnly = workflow.getHistoryByMode(userId, 'execution');
      expect(execOnly.every((r) => r.mode === 'execution')).toBe(true);
    });
  });

  // ── getStats ──────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return zero stats initially', () => {
      const stats = workflow.getStats(userId);
      expect(stats.totalRuns).toBe(0);
      expect(stats.simulationRuns).toBe(0);
      expect(stats.executionRuns).toBe(0);
    });

    it('should count simulation and execution runs separately', async () => {
      await workflow.runSimulation(userId);
      await workflow.runExecution(userId);

      const stats = workflow.getStats(userId);
      // simulation 単独 1回 + execution 内の simulation 1回 = 2 sim, 1 exec
      expect(stats.simulationRuns).toBe(2);
      expect(stats.executionRuns).toBe(1);
      expect(stats.totalRuns).toBe(3);
    });

    it('should track executed and succeeded counts', async () => {
      await workflow.runExecution(userId);

      const stats = workflow.getStats(userId);
      expect(stats.totalCandidatesExecuted).toBeGreaterThanOrEqual(0);
      expect(stats.totalSucceeded).toBeGreaterThanOrEqual(0);
    });
  });

  // ── clearAllData ──────────────────────────────────────────────────────────

  describe('clearAllData', () => {
    it('should reset history', async () => {
      await workflow.runSimulation(userId);
      expect(workflow.getHistory(userId).length).toBe(1);

      workflow.clearAllData();

      expect(workflow.getHistory(userId).length).toBe(0);
      expect(workflow.getLatest(userId)).toBeNull();
    });
  });
});
