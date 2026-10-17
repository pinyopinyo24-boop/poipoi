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

// 笏笏 蝙句ｮ夂ｾｩ 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

/**
 * 繝ｯ繝ｼ繧ｯ繝輔Ο繝ｼ螳溯｡後Δ繝ｼ繝・ *
 * - 'simulation' : 險ｺ譁ｭ 竊・蛟呵｣懃函謌・竊・螳牙・隧穂ｾ｡縺ｮ縺ｿ縲よ隼蝟・・逅・・螳溯｡後＠縺ｪ縺・・ * - 'execution'  : simulation 縺ｮ蜈ｨ繧ｹ繝・ャ繝励↓蜉縺医∵価隱肴ｸ医∩蛟呵｣懊ｒ螳滄圀縺ｫ螳溯｡後☆繧九・ */
export type WorkflowMode = 'simulation' | 'execution';

/**
 * 繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ邨先棡
 * (runSimulation 縺瑚ｿ斐☆ / runExecution 縺ｧ繧ゆｸｭ髢鍋ｵ先棡縺ｨ縺励※菫晄戟)
 */
export interface SimulationResult {
  workflowId: string;
  userId: string;
  mode: 'simulation';
  cycle: ImprovementCycle;
  /** 繝・せ繝医ｒ騾夐℃縺励◆蛟呵｣・*/
  approvedCandidates: ImprovementCandidate[];
  /** 繝・せ繝医ｒ騾夐℃縺励↑縺九▲縺溷呵｣・*/
  rejectedCandidates: ImprovementCandidate[];
  completedAt: number;
  summary: string;
}

/**
 * 螳溯｡檎ｵ先棡
 * (runExecution 縺瑚ｿ斐☆)
 */
export interface ExecutionWorkflowResult {
  workflowId: string;
  userId: string;
  mode: 'execution';
  /** 繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繝輔ぉ繝ｼ繧ｺ縺ｮ邨先棡・亥呵｣懃函謌舌・繝・せ繝茨ｼ・*/
  simulation: SimulationResult;
  /** 螳溯｡後ヵ繧ｧ繝ｼ繧ｺ縺ｮ邨先棡 */
  execution: ExecutionBatchSummary;
  completedAt: number;
  summary: string;
}

/**
 * 繝ｯ繝ｼ繧ｯ繝輔Ο繝ｼ邨先棡・医Δ繝ｼ繝牙挨 union・・ */
export type WorkflowResult = SimulationResult | ExecutionWorkflowResult;

// 笏笏 SelfEvolutionWorkflow 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

/**
 * SelfEvolutionWorkflow
 *
 * SelfImprovementManager 縺ｨ ImprovementExecutor 繧呈磁邯壹＠縲・ * 閾ｪ蟾ｱ謾ｹ蝟・し繧､繧ｯ繝ｫ繧剃ｸ騾｣縺ｮ繝ｯ繝ｼ繧ｯ繝輔Ο繝ｼ縺ｨ縺励※螳溯｡後☆繧九・ *
 * ## API 縺ｮ蛹ｺ蛻･
 *
 * | 繝｡繧ｽ繝・ラ          | 蜍穂ｽ・                                         |
 * |-------------------|-----------------------------------------------|
 * | `runSimulation()` | 險ｺ譁ｭ竊貞呵｣懃函謌絶・螳牙・隧穂ｾ｡縺ｮ縺ｿ・域隼蝟・ｮ溯｡後↑縺暦ｼ・   |
 * | `runExecution()`  | 繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ蜈ｨ謇矩・+ 謇ｿ隱榊呵｣懊ｒ螳滄圀縺ｫ螳溯｡・ |
 *
 * ## 繝ｯ繝ｼ繧ｯ繝輔Ο繝ｼ・亥ｮ溯｡後Δ繝ｼ繝会ｼ・ *   1. SelfImprovementManager 縺ｧ繧ｵ繧､繧ｯ繝ｫ繧貞ｮ溯｡鯉ｼ郁・蟾ｱ險ｺ譁ｭ繝ｻ蛟呵｣懃函謌舌・繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繝・せ繝茨ｼ・ *   2. 謇ｿ隱肴ｸ医∩蛟呵｣懊ｒ ImprovementExecutor 縺ｫ貂｡縺・ *   3. Executor 縺悟ｮ牙・諤ｧ繝√ぉ繝・け 竊・謾ｹ蝟・・逅・ｮ溯｡・or 繝ｭ繝ｼ繝ｫ繝舌ャ繧ｯ
 *   4. 螳溯｡檎ｵ先棡繧・MemoryEngine 縺ｫ菫晏ｭ・ *   5. 繝ｯ繝ｼ繧ｯ繝輔Ο繝ｼ蜈ｨ菴薙・邨先棡繧定ｿ斐☆
 *
 * ## 螳牙・蛻ｶ邏・ *   - 蜊ｱ髯ｺ縺ｪ莉ｻ諢上さ繝ｼ繝芽・蜍募ｮ溯｡後・陦後ｏ縺ｪ縺・ *   - 螟夜ΚAPI繝ｻ譁ｰ隕丈ｾ晏ｭ倥ヱ繝・こ繝ｼ繧ｸ荳堺ｽｿ逕ｨ
 */
export class SelfEvolutionWorkflow {
  private static instance: SelfEvolutionWorkflow;
  private improvementManager: SelfImprovementManager;
  private executor: ImprovementExecutor;
  private memoryEngine: MemoryEngine;
  private resultHistory: WorkflowResult[] = [];

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

  // 笏笏 蜈ｬ髢帰PI 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

  /**
   * 繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ縺ｮ縺ｿ螳溯｡後☆繧具ｼ域隼蝟・・逅・・陦後ｏ縺ｪ縺・ｼ・   *
   * 繧ｹ繝・ャ繝・
   *   1. SelfImprovementManager 縺ｧ繧ｵ繧､繧ｯ繝ｫ螳溯｡鯉ｼ郁ｨｺ譁ｭ 竊・蛟呵｣懃函謌・竊・繝・せ繝茨ｼ・   *   2. 謇ｿ隱・蜊ｴ荳句呵｣懊ｒ蛻・｡・   *   3. 邨先棡繧・MemoryEngine 縺ｫ菫晏ｭ倥＠縺ｦ霑斐☆
   */
  public async runSimulation(userId: string): Promise<SimulationResult> {
    const workflowId = this.generateId('sim');

    // Step 1: 謾ｹ蝟・し繧､繧ｯ繝ｫ・郁ｨｺ譁ｭ 竊・蛟呵｣懃函謌・竊・繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繝・せ繝茨ｼ・    const cycle = await this.improvementManager.runImprovementCycle(userId);

    // Step 2: 謇ｿ隱・蜊ｴ荳九↓蛻・｡・    const approvedCandidates = this.improvementManager.getApprovedCandidates(cycle);
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

    // Step 3: MemoryEngine 縺ｫ菫晏ｭ・    this.memoryEngine.setMemory(userId, `workflow_sim_${workflowId}`, result);
    this.resultHistory.push(result);

    return result;
  }

  /**
   * 繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ + 螳滄圀縺ｮ謾ｹ蝟・ｮ溯｡後ｒ陦後≧
   *
   * 繧ｹ繝・ャ繝・
   *   1. runSimulation() 縺ｨ蜷後§謇矩・〒蛟呵｣懊ｒ逕滓・繝ｻ蛻・｡・   *   2. 謇ｿ隱肴ｸ医∩蛟呵｣懊ｒ ImprovementExecutor 縺ｫ貂｡縺励※繝舌ャ繝∝ｮ溯｡・   *      - Executor 蜀・〒螳牙・諤ｧ繝√ぉ繝・け
   *      - 謌仙粥 竊・謾ｹ蝟・ヱ繝ｩ繝｡繝ｼ繧ｿ遒ｺ螳壹・MemoryEngine / SelfLearningEngine 菫晏ｭ・   *      - 螟ｱ謨・竊・繝ｭ繝ｼ繝ｫ繝舌ャ繧ｯ
   *   3. 繝ｯ繝ｼ繧ｯ繝輔Ο繝ｼ蜈ｨ菴薙・邨先棡繧定ｿ斐☆
   */
  public async runExecution(userId: string): Promise<ExecutionWorkflowResult> {
    const workflowId = this.generateId('exec');

    // Step 1: 繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繝輔ぉ繝ｼ繧ｺ
    const simulationResult = await this.runSimulation(userId);
    // simulation 縺ｮ workflowId 縺ｯ繝ｯ繝ｼ繧ｯ繝輔Ο繝ｼID縺ｨ縺ｯ蛻･縺ｫ謖√◆縺帙ｋ
    const simulation: SimulationResult = { ...simulationResult, workflowId };

    // Step 2: 謇ｿ隱肴ｸ医∩蛟呵｣懊・縺ｿ螳滄圀縺ｫ螳溯｡・
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

    // Step 3: MemoryEngine 縺ｫ菫晏ｭ・    this.memoryEngine.setMemory(userId, `workflow_exec_${workflowId}`, result);
    this.resultHistory.push(result);

    return result;
  }

  // 笏笏 辣ｧ莨哂PI 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

  /**
   * 繝ｯ繝ｼ繧ｯ繝輔Ο繝ｼ螻･豁ｴ繧貞叙蠕・   */
  public getHistory(userId: string, limit = 20): WorkflowResult[] {
    return this.resultHistory
      .filter((r) => r.userId === userId)
      .slice(-limit);
  }

  /**
   * 譛譁ｰ縺ｮ繝ｯ繝ｼ繧ｯ繝輔Ο繝ｼ邨先棡繧貞叙蠕・   */
  public getLatest(userId: string): WorkflowResult | null {
    const userResults = this.resultHistory.filter((r) => r.userId === userId);
    return userResults.length > 0 ? userResults[userResults.length - 1] : null;
  }

  /**
   * 繝｢繝ｼ繝牙挨繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
   */
  public getHistoryByMode(userId: string, mode: WorkflowMode): WorkflowResult[] {
    return this.resultHistory.filter((r) => r.userId === userId && r.mode === mode);
  }

  /**
   * 邨ｱ險域ュ蝣ｱ
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

  /** 繝・せ繝育畑: 蜈ｨ繝・・繧ｿ繧ｯ繝ｪ繧｢ */
  public clearAllData(): void {
    this.resultHistory = [];
  }

  // 笏笏 繝励Λ繧､繝吶・繝医・繝ｫ繝代・ 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

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
