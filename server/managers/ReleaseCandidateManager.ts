/**
 * ReleaseCandidateManager
 * RC1リリース候補作成・管理・検証
 */

export interface ReleaseCandidate {
  rcId: string;
  timestamp: number;
  version: string;
  rcNumber: number; // RC1, RC2, etc.
  status: 'created' | 'validating' | 'validated' | 'approved' | 'released';
  buildNumber: string;
  buildDate: number;
  changelog: string;
  features: string[];
  bugFixes: string[];
  knownIssues: string[];
  releaseNotes: string;
}

export interface ValidationResult {
  resultId: string;
  timestamp: number;
  rcId: string;
  validationType: 'functional' | 'performance' | 'security' | 'compatibility' | 'stability';
  status: 'passed' | 'failed' | 'warning';
  score: number; // 0-100
  details: Record<string, any>;
  issues: string[];
}

export interface ReleaseApproval {
  approvalId: string;
  timestamp: number;
  rcId: string;
  approverName: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  comments: string;
  approvalDate?: number;
}

export class ReleaseCandidateManager {
  private releaseCandidates: Map<string, ReleaseCandidate> = new Map();
  private validationResults: Map<string, ValidationResult> = new Map();
  private approvals: Map<string, ReleaseApproval> = new Map();
  private rcsByVersion: Map<string, string[]> = new Map();
  private validationsByRc: Map<string, string[]> = new Map();
  private approvalsByRc: Map<string, string[]> = new Map();

  /**
   * リリース候補を作成
   */
  createReleaseCandidate(
    version: string,
    rcNumber: number,
    buildNumber: string,
    changelog: string,
    features: string[],
    bugFixes: string[],
    knownIssues: string[],
    releaseNotes: string
  ): ReleaseCandidate {
    const rcId = `RC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const rc: ReleaseCandidate = {
      rcId,
      timestamp: Date.now(),
      version,
      rcNumber,
      status: 'created',
      buildNumber,
      buildDate: Date.now(),
      changelog,
      features,
      bugFixes,
      knownIssues,
      releaseNotes,
    };

    this.releaseCandidates.set(rcId, rc);

    if (!this.rcsByVersion.has(version)) {
      this.rcsByVersion.set(version, []);
    }
    this.rcsByVersion.get(version)!.push(rcId);

    return rc;
  }

  /**
   * リリース候補を取得
   */
  getReleaseCandidate(rcId: string): ReleaseCandidate | undefined {
    return this.releaseCandidates.get(rcId);
  }

  /**
   * バージョン別リリース候補を取得
   */
  getReleaseCandidatesByVersion(version: string): ReleaseCandidate[] {
    const ids = this.rcsByVersion.get(version) || [];
    return ids
      .map(id => this.releaseCandidates.get(id))
      .filter((rc): rc is ReleaseCandidate => rc !== undefined);
  }

  /**
   * 全リリース候補を取得
   */
  getAllReleaseCandidates(): ReleaseCandidate[] {
    return Array.from(this.releaseCandidates.values());
  }

  /**
   * 最新リリース候補を取得
   */
  getLatestReleaseCandidate(): ReleaseCandidate | undefined {
    const all = Array.from(this.releaseCandidates.values());
    if (all.length === 0) return undefined;
    return all.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  /**
   * リリース候補ステータスを更新
   */
  updateRcStatus(rcId: string, newStatus: string): boolean {
    const rc = this.releaseCandidates.get(rcId);
    if (!rc) return false;

    rc.status = newStatus as any;
    return true;
  }

  /**
   * 検証結果を作成
   */
  createValidationResult(
    rcId: string,
    validationType: 'functional' | 'performance' | 'security' | 'compatibility' | 'stability',
    status: 'passed' | 'failed' | 'warning',
    score: number,
    details: Record<string, any>,
    issues: string[]
  ): ValidationResult {
    const resultId = `VAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result: ValidationResult = {
      resultId,
      timestamp: Date.now(),
      rcId,
      validationType,
      status,
      score,
      details,
      issues,
    };

    this.validationResults.set(resultId, result);

    if (!this.validationsByRc.has(rcId)) {
      this.validationsByRc.set(rcId, []);
    }
    this.validationsByRc.get(rcId)!.push(resultId);

    return result;
  }

  /**
   * 検証結果を取得
   */
  getValidationResult(resultId: string): ValidationResult | undefined {
    return this.validationResults.get(resultId);
  }

  /**
   * RC別検証結果を取得
   */
  getValidationsByRc(rcId: string): ValidationResult[] {
    const ids = this.validationsByRc.get(rcId) || [];
    return ids
      .map(id => this.validationResults.get(id))
      .filter((r): r is ValidationResult => r !== undefined);
  }

  /**
   * 全検証結果を取得
   */
  getAllValidationResults(): ValidationResult[] {
    return Array.from(this.validationResults.values());
  }

  /**
   * 承認を作成
   */
  createApproval(rcId: string, approverName: string, comments: string): ReleaseApproval {
    const approvalId = `APR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const approval: ReleaseApproval = {
      approvalId,
      timestamp: Date.now(),
      rcId,
      approverName,
      approvalStatus: 'pending',
      comments,
    };

    this.approvals.set(approvalId, approval);

    if (!this.approvalsByRc.has(rcId)) {
      this.approvalsByRc.set(rcId, []);
    }
    this.approvalsByRc.get(rcId)!.push(approvalId);

    return approval;
  }

  /**
   * 承認を取得
   */
  getApproval(approvalId: string): ReleaseApproval | undefined {
    return this.approvals.get(approvalId);
  }

  /**
   * RC別承認を取得
   */
  getApprovalsByRc(rcId: string): ReleaseApproval[] {
    const ids = this.approvalsByRc.get(rcId) || [];
    return ids
      .map(id => this.approvals.get(id))
      .filter((a): a is ReleaseApproval => a !== undefined);
  }

  /**
   * 全承認を取得
   */
  getAllApprovals(): ReleaseApproval[] {
    return Array.from(this.approvals.values());
  }

  /**
   * 承認ステータスを更新
   */
  updateApprovalStatus(approvalId: string, status: 'approved' | 'rejected'): boolean {
    const approval = this.approvals.get(approvalId);
    if (!approval) return false;

    approval.approvalStatus = status;
    approval.approvalDate = Date.now();
    return true;
  }

  /**
   * RC統計を計算
   */
  getReleaseStats(): {
    totalRCs: number;
    createdRCs: number;
    validatingRCs: number;
    validatedRCs: number;
    approvedRCs: number;
    releasedRCs: number;
    totalValidations: number;
    passedValidations: number;
    failedValidations: number;
    warningValidations: number;
    totalApprovals: number;
    approvedApprovals: number;
    rejectedApprovals: number;
    pendingApprovals: number;
    averageValidationScore: number;
  } {
    const allRCs = Array.from(this.releaseCandidates.values());
    const allValidations = Array.from(this.validationResults.values());
    const allApprovals = Array.from(this.approvals.values());

    let totalScore = 0;
    for (const validation of allValidations) {
      totalScore += validation.score;
    }
    const averageScore = allValidations.length > 0 ? totalScore / allValidations.length : 0;

    return {
      totalRCs: allRCs.length,
      createdRCs: allRCs.filter(r => r.status === 'created').length,
      validatingRCs: allRCs.filter(r => r.status === 'validating').length,
      validatedRCs: allRCs.filter(r => r.status === 'validated').length,
      approvedRCs: allRCs.filter(r => r.status === 'approved').length,
      releasedRCs: allRCs.filter(r => r.status === 'released').length,
      totalValidations: allValidations.length,
      passedValidations: allValidations.filter(v => v.status === 'passed').length,
      failedValidations: allValidations.filter(v => v.status === 'failed').length,
      warningValidations: allValidations.filter(v => v.status === 'warning').length,
      totalApprovals: allApprovals.length,
      approvedApprovals: allApprovals.filter(a => a.approvalStatus === 'approved').length,
      rejectedApprovals: allApprovals.filter(a => a.approvalStatus === 'rejected').length,
      pendingApprovals: allApprovals.filter(a => a.approvalStatus === 'pending').length,
      averageValidationScore: averageScore,
    };
  }

  /**
   * リリース候補を削除
   */
  deleteReleaseCandidate(rcId: string): boolean {
    const rc = this.releaseCandidates.get(rcId);
    if (!rc) return false;

    const versionIds = this.rcsByVersion.get(rc.version) || [];
    const index = versionIds.indexOf(rcId);
    if (index > -1) {
      versionIds.splice(index, 1);
    }

    this.releaseCandidates.delete(rcId);
    return true;
  }
}
