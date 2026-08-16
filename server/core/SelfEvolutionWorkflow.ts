import {
  SelfImprovementManager,
  ImprovementCycle,
  ImprovementCandidate,
} from './SelfImprovementManager';
import {
  ImprovementExecutor,
  ExecutionBatchSummary,
} from './ImprovementExecutor';
import { MemoryEngine } from './memory/MemoryEngine';

// ── 型定義 ──────────────────────────────────────────────────────────────

/**
 * ワークフロー実行モード
 *
 * - 'simulation' : 診断 → 候補生成 → 安全評価のみ。改善処理は実行しない。
 * - 'execution'  : simulation の全ステップに加え、承認済み候補を実際に実行する。
 */
export type WorkflowMode = 'simulation' | 'execution';

/**
 * シミュレーション結果
 * (runSimulation が返す / runExecution でも中間結果として保持)
 */
export interface SimulationResult {
  workflowId: string;
  userId: string;
  mode: 'simulation';
  cycle: ImprovementCycle;
  /** テストを通過した候補 */
  approvedCandidates: ImprovementCandidate[];
  /** テストを通過しなかった候補 */
  rejectedCandidates: ImprovementCandidate[];
  completedAt: number;
  summary: string;
}

/**
 * 実行結果
 * (runExecution が返す)
 */
export interface ExecutionWorkflowResult {
  workflowId: string;
  userId: string;
  mode: 'execution';
  /** シミュレーションフェーズの結果（候補生成・テスト） */
  simulation: SimulationResult;
  /** 実行フェーズの結果 */
  execution: ExecutionBatchSummary;
  completedAt: number;
  summary: string;
}

/**
 * ワークフロー結果（モード別 union）
 */
export type WorkflowResult = SimulationResult | ExecutionWorkflowResult;

// ── SelfEvolutionWorkflow ────────────────────────────────────────────────

/**
 * SelfEvolutionWorkflow
 *
 * SelfImprovementManager と ImprovementExecutor を接続し、
 * 自己改善サイクルを一連のワークフローとして実行する。
 *
 * ## API の区別
 *
 * | メソッド          | 動作                                          |
 * |-------------------|-----------------------------------------------|
 * | `runSimulation()` | 診断→候補生成→安全評価のみ（改善実行なし）    |
 * | `runExecution()`  | シミュレーション全手順 + 承認候補を実際に実行  |
 *
 * ## ワークフロー（実行モード）
 *   1. SelfImprovementManager でサイクルを実行（自己診断・候補生成・シミュレーションテスト）
 *   2. 承認済み候補を ImprovementExecutor に渡す
 *   3. Executor が安全性チェック → 改善処理実行 or ロールバック
 *   4. 実行結果を MemoryEngine に保存
 *   5. ワークフロー全体の結果を返す
 *
 * ## 安全制約
 *   - 危険な任意コード自動実行は行わない
 *   - 外部API・新規依存パッケージ不使用
 */
export class SelfEvolutionWorkflow {
  private static instance: SelfEvolutionWorkflow;
  private improvementManager: SelfImprovementManager;
  private executor: ImprovementExecutor;
  private memoryEngine: MemoryEngine;
  private resultHistory: WorkflowResult[];

  private constructor() {
    this.improvementManager = SelfImprovementManager.getInstance();
    this.executor = ImprovementExecutor.getInstance();
    this.memoryEngine = MemoryEngine.getInstance();
    this.resultHistory = [];
  }

  public static getInstance(): SelfEvolutionWorkflow {
    if (!SelfEvolutionWorkflow.instance) {
      SelfEvolutionWorkflow.instance = new SelfEvolutionWorkflow();
    }
    return SelfEvolutionWorkflow.instance;
  }

  // ── 公開API ─────────────────────────────────────────────────────────────

  /**
   * シミュレーションのみ実行する（改善処理は行わない）
   *
   * ステップ:
   *   1. SelfImprovementManager でサイクル実行（診断 → 候補生成 → テスト）
   *   2. 承認/却下候補を分類
   *   3. 結果を MemoryEngine に保存して返す
   */
  public async runSimulation(userId: string): Promise<SimulationResult> {
    const workflowId = this.generateId('sim');

    // Step 1: 改善サイクル（診断 → 候補生成 → シミュレーションテスト）
    const cycle = await this.improvementManager.runImprovementCycle(userId);

    // Step 2: 承認/却下に分類
    const approvedCandidates = this.improvementManager.getApprovedCandidates(cycle);
    const rejectedCandidates = this.improvementManager.getRejectedCandidates(cycle);

    const result: SimulationResult = {
      workflowId,
      userId,
      mode: 'simulation',
      cycle,
      approvedCandidates,
      rejectedCandidates,
      completedAt: Date.now(),
      summary: this.buildSimulationSummary(cycle, approvedCandidates, rejectedCandidates),
    };

    // Step 3: MemoryEngine に保存
    this.memoryEngine.setMemory(userId, `workflow_sim_${workflowId}`, result);
    this.resultHistory.push(result);

    return result;
  }

  /**
   * シミュレーション + 実際の改善実行を行う
   *
   * ステップ:
   *   1. runSimulation() と同じ手順で候補を生成・分類
   *   2. 承認済み候補を ImprovementExecutor に渡してバッチ実行
   *      - Executor 内で安全性チェック
   *      - 成功 → 改善パラメータ確定・MemoryEngine / SelfLearningEngine 保存
   *      - 失敗 → ロールバック
   *   3. ワークフロー全体の結果を返す
   */
  public async runExecution(userId: string): Promise<ExecutionWorkflowResult> {
    const workflowId = this.generateId('exec');

    // Step 1: シミュレーションフェーズ
    const simulationResult = await this.runSimulation(userId);
    // simulation の workflowId はワークフローIDとは別に持たせる
    const simulation: SimulationResult = { ...simulationResult, workflowId };

    // Step 2: 承認済み候補のみ実際に実行
    const execution = await this.executor.executeBatch(
      userId,
      simulation.approvedCandidates
    );

    const result: ExecutionWorkflowResult = {
      workflowId,
      userId,
      mode: 'execution',
      simulation,
      execution,
      completedAt: Date.now(),
      summary: this.buildExecutionSummary(simulation, execution),
    };

    // Step 3: MemoryEngine に保存
    this.memoryEngine.setMemory(userId, `workflow_exec_${workflowId}`, result);
    this.resultHistory.push(result);

    return result;
  }

  // ── 照会API ─────────────────────────────────────────────────────────────

  /**
   * ワークフロー履歴を取得
   */
  public getHistory(userId: string, limit = 20): WorkflowResult[] {
    return this.resultHistory
      .filter((r) => r.userId === userId)
      .slice(-limit);
  }

  /**
   * 最新のワークフロー結果を取得
   */
  public getLatest(userId: string): WorkflowResult | null {
    const userResults = this.resultHistory.filter((r) => r.userId === userId);
    return userResults.length > 0 ? userResults[userResults.length - 1] : null;
  }

  /**
   * モード別フィルタリング
   */
  public getHistoryByMode(userId: string, mode: WorkflowMode): WorkflowResult[] {
    return this.resultHistory.filter((r) => r.userId === userId && r.mode === mode);
  }

  /**
   * 統計情報
   */
  public getStats(userId: string): {
    totalRuns: number;
    simulationRuns: number;
    executionRuns: number;
    totalCandidatesApproved: number;
    totalCandidatesExecuted: number;
    totalSucceeded: number;
    totalRolledBack: number;
  } {
    const history = this.resultHistory.filter((r) => r.userId === userId);
    const simRuns = history.filter((r) => r.mode === 'simulation') as SimulationResult[];
    const execRuns = history.filter((r) => r.mode === 'execution') as ExecutionWorkflowResult[];

    const totalCandidatesApproved = simRuns.reduce(
      (s, r) => s + r.approvedCandidates.length,
      0
    );
    const totalCandidatesExecuted = execRuns.reduce(
      (s, r) => s + r.execution.total,
      0
    );
    const totalSucceeded = execRuns.reduce((s, r) => s + r.execution.succeeded, 0);
    const totalRolledBack = execRuns.reduce((s, r) => s + r.execution.rolledBack, 0);

    return {
      totalRuns: history.length,
      simulationRuns: simRuns.length,
      executionRuns: execRuns.length,
      totalCandidatesApproved,
      totalCandidatesExecuted,
      totalSucceeded,
      totalRolledBack,
    };
  }

  /** テスト用: 全データクリア */
  public clearAllData(): void {
    this.resultHistory = [];
  }

  // ── プライベートヘルパー ───────────────────────────────────────────────────

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private buildSimulationSummary(
    cycle: ImprovementCycle,
    approved: ImprovementCandidate[],
    rejected: ImprovementCandidate[]
  ): string {
    return (
      `[Simulation] Diagnosis: ${cycle.diagnosticReport.status}` +
      ` (score: ${cycle.diagnosticReport.overallScore}),` +
      ` Candidates: ${cycle.candidates.length},` +
      ` Approved: ${approved.length},` +
      ` Rejected: ${rejected.length}`
    );
  }

  private buildExecutionSummary(
    sim: SimulationResult,
    exec: ExecutionBatchSummary
  ): string {
    return (
      `[Execution] ${sim.summary} |` +
      ` Executed: ${exec.total},` +
      ` Succeeded: ${exec.succeeded},` +
      ` RolledBack: ${exec.rolledBack}`
    );
  }
}
