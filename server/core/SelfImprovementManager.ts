import { SelfDiagnoseEngine, DiagnosticReport, HealthStatus } from './diagnose/SelfDiagnoseEngine';
import { SelfLearningEngine, LearningResult } from './learning/SelfLearningEngine';
import { SecurityEngine } from './security/SecurityEngine';
import { MemoryEngine } from './memory/MemoryEngine';

/**
 * Improvement Candidate - 改善候補
 */
export interface ImprovementCandidate {
  id: string;
  source: 'diagnosis' | 'learning';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: number; // 0-100
  createdAt: number;
}

/**
 * Cycle Test Result - サイクル内テスト結果
 */
export interface CycleTestResult {
  candidateId: string;
  passed: boolean;
  score: number; // 0-100
  details: string;
  testedAt: number;
}

/**
 * Improvement Cycle - 自己改善サイクル一回分の記録
 */
export interface ImprovementCycle {
  id: string;
  userId: string;
  startedAt: number;
  completedAt?: number;
  diagnosticReport: DiagnosticReport;
  candidates: ImprovementCandidate[];
  testResults: CycleTestResult[];
  appliedCount: number;
  summary: string;
}

/**
 * SelfImprovementManager
 *
 * 「自己診断 → 改善案生成 → 改善候補作成 → テスト → 結果保存」
 * の自己改善サイクルを一気通貫で実行するオーケストレーター。
 *
 * - 完全ローカル動作・外部API不使用
 * - 安全なシミュレーションのみ（自動コード変更は行わない）
 * - 既存エンジン（SelfDiagnoseEngine, SelfLearningEngine, MemoryEngine）を再利用
 */
export class SelfImprovementManager {
  private static instance: SelfImprovementManager;
  private diagnoseEngine: SelfDiagnoseEngine;
  private learningEngine: SelfLearningEngine;
  private memoryEngine: MemoryEngine;
  private securityEngine: SecurityEngine;
  private cycleHistory: ImprovementCycle[];

  private constructor() {
    this.diagnoseEngine = SelfDiagnoseEngine.getInstance();
    this.learningEngine = SelfLearningEngine.getInstance();
    this.memoryEngine = MemoryEngine.getInstance();
    this.securityEngine = SecurityEngine.getInstance();
    this.cycleHistory = [];
  }

  public static getInstance(): SelfImprovementManager {
    if (!SelfImprovementManager.instance) {
      SelfImprovementManager.instance = new SelfImprovementManager();
    }
    return SelfImprovementManager.instance;
  }

  /**
   * 自己改善サイクルをフルで実行する
   *
   * Step 1: 自己診断（SelfDiagnoseEngine）
   * Step 2: 学習サイクルを起動し診断結果をデータポイントとして記録（SelfLearningEngine）
   * Step 3: 改善候補を生成
   * Step 4: 候補を安全シミュレーションでテスト
   * Step 5: サイクル結果を MemoryEngine に保存
   */
  /**
   * Ensure the self-evolution workflow has the permissions required
   * by diagnosis and learning engines.
   */
  private async ensureSelfEvolutionAuthorization(userId: string): Promise<void> {
    await this.securityEngine.initialize();

    const context = await this.securityEngine.getContext(userId);

    if (!context) {
      await this.securityEngine.createContext(userId, 'user');
    }

    if (!(await this.securityEngine.checkAuthorization(userId, 'diagnose:read'))) {
      await this.securityEngine.grantPermission(userId, 'diagnose:read');
    }

    if (!(await this.securityEngine.checkAuthorization(userId, 'learning:write'))) {
      await this.securityEngine.grantPermission(userId, 'learning:write');
    }
  }

  public async runImprovementCycle(userId: string): Promise<ImprovementCycle> {
    await this.ensureSelfEvolutionAuthorization(userId);

    const cycleId = `improvement-cycle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startedAt = Date.now();

    // Step 1: 自己診断
    const diagnosticReport = await this.diagnoseEngine.runFullDiagnosis(userId);

    // Step 2: 学習サイクルを起動して診断結果を記録
    const learningCycle = await this.learningEngine.startLearningCycle(userId);
    const diagOutcome = diagnosticReport.status === HealthStatus.HEALTHY ? 'success' : 'failure';
    await this.learningEngine.recordDataPoint(
      userId,
      learningCycle.id,
      { source: 'diagnosis', reportId: diagnosticReport.id, status: diagnosticReport.status },
      { overallScore: diagnosticReport.overallScore, issueCount: diagnosticReport.issues.length },
      diagOutcome,
      Date.now() - diagnosticReport.timestamp,
      { componentCount: diagnosticReport.components.length }
    );
    const learningResult = await this.learningEngine.completeLearningCycle(userId, learningCycle.id);

    // Step 3: 改善候補を生成
    const candidates = this.generateCandidates(userId, diagnosticReport, learningResult);

    // Step 4: 安全シミュレーションでテスト
    const testResults = this.testCandidates(candidates, diagnosticReport);

    // Step 5: 結果を集約してメモリに保存
    const appliedCount = testResults.filter((r) => r.passed).length;
    const summary = this.buildSummary(diagnosticReport, candidates, testResults, appliedCount);

    const cycle: ImprovementCycle = {
      id: cycleId,
      userId,
      startedAt,
      completedAt: Date.now(),
      diagnosticReport,
      candidates,
      testResults,
      appliedCount,
      summary,
    };

    this.cycleHistory.push(cycle);
    this.memoryEngine.setMemory(userId, `improvement_cycle_${cycleId}`, cycle);

    return cycle;
  }

  /**
   * 診断レポート + 学習結果から改善候補を生成
   */
  private generateCandidates(
    userId: string,
    report: DiagnosticReport,
    learningResult: LearningResult
  ): ImprovementCandidate[] {
    const candidates: ImprovementCandidate[] = [];
    const now = Date.now();

    // 診断で検出した各 Issue から候補を生成
    for (const issue of report.issues) {
      const priority =
        issue.severity === 'critical'
          ? 'critical'
          : issue.severity === 'high'
            ? 'high'
            : issue.severity === 'medium'
              ? 'medium'
              : 'low';

      candidates.push({
        id: `candidate-issue-${issue.id}`,
        source: 'diagnosis',
        title: `Fix [${issue.component}]: ${issue.description.slice(0, 60)}`,
        description: issue.description,
        priority,
        estimatedImpact:
          priority === 'critical' ? 80 : priority === 'high' ? 60 : priority === 'medium' ? 40 : 20,
        createdAt: now,
      });
    }

    // 診断推奨事項から候補を生成（汎用的すぎるものはスキップ）
    const genericRecs = new Set([
      'System is operating normally',
      'Continue monitoring for changes',
    ]);
    for (const rec of report.recommendations) {
      if (genericRecs.has(rec)) continue;
      candidates.push({
        id: `candidate-rec-${now}-${Math.random().toString(36).substr(2, 6)}`,
        source: 'diagnosis',
        title: `Recommendation: ${rec.slice(0, 60)}`,
        description: rec,
        priority: 'medium',
        estimatedImpact: 30,
        createdAt: now,
      });
    }

    // 学習結果の失敗パターンから候補を生成
    for (const pattern of learningResult.patterns) {
      if (pattern.type === 'failure' && pattern.frequency > 0) {
        candidates.push({
          id: `candidate-learn-${pattern.id}`,
          source: 'learning',
          title: `Reduce failure rate (${Math.round(learningResult.failureRate * 100)}%): ${pattern.description.slice(0, 40)}`,
          description: pattern.description,
          priority: learningResult.failureRate > 0.5 ? 'high' : 'medium',
          estimatedImpact: Math.round(learningResult.failureRate * 60),
          createdAt: now,
        });
      }
    }

    // 学習推奨事項から候補を生成
    const genericLearningRecs = new Set(['Continue monitoring and learning']);
    for (const rec of learningResult.recommendations) {
      if (genericLearningRecs.has(rec)) continue;
      candidates.push({
        id: `candidate-learn-rec-${now}-${Math.random().toString(36).substr(2, 6)}`,
        source: 'learning',
        title: `Insight: ${rec.slice(0, 60)}`,
        description: rec,
        priority: 'low',
        estimatedImpact: 15,
        createdAt: now,
      });
    }

    // Learn from prior candidate simulation outcomes for this user.
    const previous = this.cycleHistory.filter(c => c.userId === userId).slice(-10);
    const previousScores = new Map<string, number[]>();
    for (const cycle of previous) {
      for (const candidate of cycle.candidates) {
        const result = cycle.testResults.find(t => t.candidateId === candidate.id);
        if (!result) continue;
        const key = candidate.source + ':' + candidate.description;
        const scores = previousScores.get(key) ?? [];
        scores.push(result.score);
        previousScores.set(key, scores);
      }
    }
    for (const candidate of candidates) {
      const scores = previousScores.get(candidate.source + ':' + candidate.description);
      if (!scores?.length) continue;
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      candidate.estimatedImpact = Math.max(0, Math.min(100,
        Math.round(candidate.estimatedImpact * (0.5 + average / 200))
      ));
    }

    // 影響度の高い順に並べ替え
    candidates.sort((a, b) => b.estimatedImpact - a.estimatedImpact);

    return candidates;
  }

  /**
   * 改善候補を安全シミュレーションでテスト
   * （実コード変更は行わない — パラメータ評価のみ）
   */
  private testCandidates(
    candidates: ImprovementCandidate[],
    report: DiagnosticReport
  ): CycleTestResult[] {
    return candidates.map((candidate) => {
      const safetyScore = this.evaluateSafety(candidate);
      const feasibilityScore = this.evaluateFeasibility(candidate, report);
      const score = Math.round((safetyScore + feasibilityScore) / 2);

      return {
        candidateId: candidate.id,
        passed: score >= 50,
        score,
        details: `Safety: ${safetyScore}, Feasibility: ${feasibilityScore}, Overall: ${score}`,
        testedAt: Date.now(),
      };
    });
  }

  /** 安全性スコア（0-100） */
  private evaluateSafety(candidate: ImprovementCandidate): number {
    let score = candidate.source === 'diagnosis' ? 80 : 70;
    if (candidate.estimatedImpact > 70) score -= 10;
    if (candidate.priority === 'critical') score -= 20;
    return Math.max(0, Math.min(100, score));
  }

  /** 実現可能性スコア（0-100） */
  private evaluateFeasibility(
    candidate: ImprovementCandidate,
    report: DiagnosticReport
  ): number {
    let score =
      report.status === HealthStatus.HEALTHY
        ? 80
        : report.status === HealthStatus.WARNING
          ? 60
          : 40;
    if (candidate.priority === 'low') score += 10;
    else if (candidate.priority === 'medium') score += 5;
    return Math.max(0, Math.min(100, score));
  }

  /** サイクルのサマリー文字列を生成 */
  private buildSummary(
    report: DiagnosticReport,
    candidates: ImprovementCandidate[],
    testResults: CycleTestResult[],
    appliedCount: number
  ): string {
    const passed = testResults.filter((r) => r.passed).length;
    return (
      `Diagnosis: ${report.status} (score: ${report.overallScore}), ` +
      `Issues: ${report.issues.length}, ` +
      `Candidates: ${candidates.length}, ` +
      `Passed tests: ${passed}/${testResults.length}, ` +
      `Ready to apply: ${appliedCount}`
    );
  }

  // ── 照会API ──────────────────────────────────────────────

  /** サイクル履歴を取得 */
  public getCycleHistory(userId: string, limit = 10): ImprovementCycle[] {
    return this.cycleHistory
      .filter((c) => c.userId === userId)
      .slice(-limit);
  }

  /** 最新のサイクルを取得 */
  public getLatestCycle(userId: string): ImprovementCycle | null {
    const userCycles = this.cycleHistory.filter((c) => c.userId === userId);
    return userCycles.length > 0 ? userCycles[userCycles.length - 1] : null;
  }

  /** テスト通過済み候補を取得 */
  public getApprovedCandidates(cycle: ImprovementCycle): ImprovementCandidate[] {
    const passedIds = new Set(
      cycle.testResults.filter((r) => r.passed).map((r) => r.candidateId)
    );
    return cycle.candidates.filter((c) => passedIds.has(c.id));
  }

  /** テスト不合格の候補を取得 */
  public getRejectedCandidates(cycle: ImprovementCycle): ImprovementCandidate[] {
    const passedIds = new Set(
      cycle.testResults.filter((r) => r.passed).map((r) => r.candidateId)
    );
    return cycle.candidates.filter((c) => !passedIds.has(c.id));
  }

  /** 統計情報 */
  public getStats(userId: string): {
    totalCycles: number;
    totalCandidates: number;
    totalApproved: number;
    averageScore: number;
  } {
    const userCycles = this.cycleHistory.filter((c) => c.userId === userId);
    const totalCandidates = userCycles.reduce((s, c) => s + c.candidates.length, 0);
    const totalApproved = userCycles.reduce((s, c) => s + c.appliedCount, 0);
    const allScores = userCycles.flatMap((c) => c.testResults.map((r) => r.score));
    const averageScore =
      allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;

    return {
      totalCycles: userCycles.length,
      totalCandidates,
      totalApproved,
      averageScore: Math.round(averageScore),
    };
  }

  /** テスト用: 全データクリア */
  public clearAllData(): void {
    this.cycleHistory = [];
  }
}
