/**
 * ReleaseCertificationService
 * v1.0リリース認定・承認管理
 */

export interface CertificationCriteria {
  criteriaId: string;
  name: string;
  description: string;
  category: 'performance' | 'quality' | 'security' | 'stability' | 'compliance';
  threshold: number;
  weight: number;
  required: boolean;
}

export interface CertificationCheck {
  checkId: string;
  criteriaId: string;
  timestamp: number;
  actualValue: number;
  threshold: number;
  passed: boolean;
  details: string;
}

export interface ReleaseCertification {
  certificationId: string;
  version: string;
  timestamp: number;
  checks: CertificationCheck[];
  overallScore: number;
  status: 'pending' | 'approved' | 'rejected' | 'conditional';
  approvedBy?: string;
  approvedAt?: number;
  rejectionReason?: string;
  conditions?: string[];
}

export class ReleaseCertificationService {
  private criteria: Map<string, CertificationCriteria> = new Map();
  private checks: Map<string, CertificationCheck> = new Map();
  private certifications: Map<string, ReleaseCertification> = new Map();
  private checksByCriteria: Map<string, string[]> = new Map();
  private certificationsByStatus: Map<string, string[]> = new Map();

  /**
   * 認定基準を作成
   */
  createCriteria(
    name: string,
    description: string,
    category: CertificationCriteria['category'],
    threshold: number,
    weight: number,
    required: boolean = true
  ): CertificationCriteria {
    const criteriaId = `CRT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const criteria: CertificationCriteria = {
      criteriaId,
      name,
      description,
      category,
      threshold,
      weight,
      required,
    };

    this.criteria.set(criteriaId, criteria);
    this.checksByCriteria.set(criteriaId, []);

    return criteria;
  }

  /**
   * 基準を取得
   */
  getCriteria(criteriaId: string): CertificationCriteria | undefined {
    return this.criteria.get(criteriaId);
  }

  /**
   * 全基準を取得
   */
  getAllCriteria(): CertificationCriteria[] {
    return Array.from(this.criteria.values());
  }

  /**
   * 認定チェックを実行
   */
  performCheck(
    criteriaId: string,
    actualValue: number,
    details: string
  ): CertificationCheck | null {
    const criteria = this.criteria.get(criteriaId);
    if (!criteria) return null;

    const checkId = `CHK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const passed = actualValue >= criteria.threshold;

    const check: CertificationCheck = {
      checkId,
      criteriaId,
      timestamp: Date.now(),
      actualValue,
      threshold: criteria.threshold,
      passed,
      details,
    };

    this.checks.set(checkId, check);

    const checkIds = this.checksByCriteria.get(criteriaId) || [];
    checkIds.push(checkId);

    return check;
  }

  /**
   * チェックを取得
   */
  getCheck(checkId: string): CertificationCheck | undefined {
    return this.checks.get(checkId);
  }

  /**
   * 基準別チェックを取得
   */
  getChecksByCriteria(criteriaId: string): CertificationCheck[] {
    const ids = this.checksByCriteria.get(criteriaId) || [];
    return ids
      .map(id => this.checks.get(id))
      .filter((c): c is CertificationCheck => c !== undefined);
  }

  /**
   * リリース認定を生成
   */
  generateCertification(
    version: string,
    checks: CertificationCheck[]
  ): ReleaseCertification {
    const certificationId = `REL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 全体スコアを計算
    let totalScore = 0;
    let totalWeight = 0;
    let requiredChecksFailed = 0;

    for (const check of checks) {
      const criteria = this.criteria.get(check.criteriaId);
      if (!criteria) continue;

      totalWeight += criteria.weight;

      if (check.passed) {
        totalScore += criteria.weight;
      } else if (criteria.required) {
        requiredChecksFailed++;
      }
    }

    const overallScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

    // ステータスを判定
    let status: ReleaseCertification['status'] = 'pending';
    if (requiredChecksFailed > 0) {
      status = 'rejected';
    } else if (overallScore >= 95) {
      status = 'approved';
    } else if (overallScore >= 85) {
      status = 'conditional';
    }

    const certification: ReleaseCertification = {
      certificationId,
      version,
      timestamp: Date.now(),
      checks,
      overallScore,
      status,
    };

    this.certifications.set(certificationId, certification);

    if (!this.certificationsByStatus.has(status)) {
      this.certificationsByStatus.set(status, []);
    }
    this.certificationsByStatus.get(status)!.push(certificationId);

    return certification;
  }

  /**
   * 認定を取得
   */
  getCertification(certificationId: string): ReleaseCertification | undefined {
    return this.certifications.get(certificationId);
  }

  /**
   * ステータス別認定を取得
   */
  getCertificationsByStatus(status: ReleaseCertification['status']): ReleaseCertification[] {
    const ids = this.certificationsByStatus.get(status) || [];
    return ids
      .map(id => this.certifications.get(id))
      .filter((c): c is ReleaseCertification => c !== undefined);
  }

  /**
   * 認定を承認
   */
  approveCertification(
    certificationId: string,
    approvedBy: string
  ): boolean {
    const certification = this.certifications.get(certificationId);
    if (!certification) return false;

    if (certification.status === 'rejected') return false;

    certification.status = 'approved';
    certification.approvedBy = approvedBy;
    certification.approvedAt = Date.now();

    // ステータスインデックスを更新
    const oldIds = this.certificationsByStatus.get('pending') || [];
    const index = oldIds.indexOf(certificationId);
    if (index > -1) {
      oldIds.splice(index, 1);
    }

    if (!this.certificationsByStatus.has('approved')) {
      this.certificationsByStatus.set('approved', []);
    }
    this.certificationsByStatus.get('approved')!.push(certificationId);

    return true;
  }

  /**
   * 認定を却下
   */
  rejectCertification(
    certificationId: string,
    reason: string
  ): boolean {
    const certification = this.certifications.get(certificationId);
    if (!certification) return false;

    certification.status = 'rejected';
    certification.rejectionReason = reason;

    // ステータスインデックスを更新
    const oldIds = this.certificationsByStatus.get('pending') || [];
    const index = oldIds.indexOf(certificationId);
    if (index > -1) {
      oldIds.splice(index, 1);
    }

    if (!this.certificationsByStatus.has('rejected')) {
      this.certificationsByStatus.set('rejected', []);
    }
    this.certificationsByStatus.get('rejected')!.push(certificationId);

    return true;
  }

  /**
   * 条件付き承認に条件を追加
   */
  addCondition(certificationId: string, condition: string): boolean {
    const certification = this.certifications.get(certificationId);
    if (!certification) return false;

    if (!certification.conditions) {
      certification.conditions = [];
    }

    certification.conditions.push(condition);
    certification.status = 'conditional';

    return true;
  }

  /**
   * 全認定を取得
   */
  getAllCertifications(): ReleaseCertification[] {
    return Array.from(this.certifications.values());
  }

  /**
   * 認定統計を計算
   */
  getCertificationStats(): {
    total: number;
    approved: number;
    rejected: number;
    conditional: number;
    pending: number;
    approvalRate: number;
  } {
    const certifications = Array.from(this.certifications.values());
    const stats = {
      total: certifications.length,
      approved: 0,
      rejected: 0,
      conditional: 0,
      pending: 0,
      approvalRate: 0,
    };

    for (const cert of certifications) {
      if (cert.status === 'approved') stats.approved++;
      if (cert.status === 'rejected') stats.rejected++;
      if (cert.status === 'conditional') stats.conditional++;
      if (cert.status === 'pending') stats.pending++;
    }

    stats.approvalRate =
      certifications.length > 0
        ? ((stats.approved + stats.conditional) / certifications.length) * 100
        : 0;

    return stats;
  }

  /**
   * 最新の認定を取得
   */
  getLatestCertification(): ReleaseCertification | undefined {
    const certifications = Array.from(this.certifications.values());
    if (certifications.length === 0) return undefined;

    return certifications.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );
  }

  /**
   * バージョン別認定を取得
   */
  getCertificationByVersion(version: string): ReleaseCertification | undefined {
    const certifications = Array.from(this.certifications.values());
    return certifications.find(c => c.version === version);
  }

  /**
   * 認定を削除
   */
  deleteCertification(certificationId: string): boolean {
    const certification = this.certifications.get(certificationId);
    if (!certification) return false;

    const statusIds = this.certificationsByStatus.get(certification.status) || [];
    const index = statusIds.indexOf(certificationId);
    if (index > -1) {
      statusIds.splice(index, 1);
    }

    this.certifications.delete(certificationId);
    return true;
  }

  /**
   * チェックを削除
   */
  deleteCheck(checkId: string): boolean {
    const check = this.checks.get(checkId);
    if (!check) return false;

    const criteriaIds = this.checksByCriteria.get(check.criteriaId) || [];
    const index = criteriaIds.indexOf(checkId);
    if (index > -1) {
      criteriaIds.splice(index, 1);
    }

    this.checks.delete(checkId);
    return true;
  }

  /**
   * リリース準備完了か判定
   */
  isReadyForRelease(): boolean {
    const latest = this.getLatestCertification();
    if (!latest) return false;

    return latest.status === 'approved';
  }

  /**
   * 認定レポートを生成
   */
  generateCertificationReport(certificationId: string): {
    certification: ReleaseCertification | undefined;
    summary: string;
    details: Array<{
      criteriaName: string;
      passed: boolean;
      actualValue: number;
      threshold: number;
    }>;
  } {
    const certification = this.certifications.get(certificationId);
    if (!certification) {
      return {
        certification: undefined,
        summary: '',
        details: [],
      };
    }

    const details = certification.checks.map(check => {
      const criteria = this.criteria.get(check.criteriaId);
      return {
        criteriaName: criteria?.name || 'Unknown',
        passed: check.passed,
        actualValue: check.actualValue,
        threshold: check.threshold,
      };
    });

    const summary = `v${certification.version}: ${certification.status.toUpperCase()} (Score: ${certification.overallScore.toFixed(2)}%)`;

    return {
      certification,
      summary,
      details,
    };
  }
}
