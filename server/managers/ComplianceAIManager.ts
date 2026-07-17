/**
 * ComplianceAIManager - コンプライアンス管理
 * 
 * 機能:
 * - コンプライアンスチェック
 * - 違反検知
 * - コンプライアンス率計算
 * - ステータス管理
 * - ポリシー管理
 * - 規制管理
 * - リスク評価
 * - 監査実行
 * - レポート生成
 */

export interface ComplianceCheck {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'inactive';
  createdAt: number;
  updatedAt: number;
}

export interface ComplianceViolation {
  id: string;
  checkId: string;
  userId: number;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'ignored';
  detectedAt: number;
  resolvedAt?: number;
  metadata: Record<string, any>;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  version: number;
  status: 'draft' | 'active' | 'archived';
  content: string;
  createdAt: number;
  updatedAt: number;
}

export class ComplianceAIManager {
  private static instance: ComplianceAIManager;
  private checks: Map<string, ComplianceCheck> = new Map();
  private violations: Map<string, ComplianceViolation> = new Map();
  private policies: Map<string, Policy> = new Map();
  private checkCounter: number = 0;
  private violationCounter: number = 0;
  private policyCounter: number = 0;

  private constructor() {}

  static getInstance(): ComplianceAIManager {
    if (!ComplianceAIManager.instance) {
      ComplianceAIManager.instance = new ComplianceAIManager();
    }
    return ComplianceAIManager.instance;
  }

  /**
   * コンプライアンスチェック作成
   */
  createCheck(
    name: string,
    description: string,
    category: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): ComplianceCheck {
    const checkId = `check_${++this.checkCounter}_${Date.now()}`;
    const now = Date.now();

    const check: ComplianceCheck = {
      id: checkId,
      name,
      description,
      category,
      severity,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    this.checks.set(checkId, check);
    return check;
  }

  /**
   * チェック取得
   */
  getCheck(checkId: string): ComplianceCheck | null {
    return this.checks.get(checkId) || null;
  }

  /**
   * すべてのチェック取得
   */
  getAllChecks(): ComplianceCheck[] {
    return Array.from(this.checks.values());
  }

  /**
   * 違反検知
   */
  detectViolation(
    checkId: string,
    userId: number,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata: Record<string, any> = {}
  ): ComplianceViolation {
    const violationId = `vio_${++this.violationCounter}_${Date.now()}`;

    const violation: ComplianceViolation = {
      id: violationId,
      checkId,
      userId,
      description,
      severity,
      status: 'open',
      detectedAt: Date.now(),
      metadata,
    };

    this.violations.set(violationId, violation);
    return violation;
  }

  /**
   * 違反取得
   */
  getViolation(violationId: string): ComplianceViolation | null {
    return this.violations.get(violationId) || null;
  }

  /**
   * ユーザー違反取得
   */
  getUserViolations(userId: number): ComplianceViolation[] {
    const userViolations: ComplianceViolation[] = [];
    this.violations.forEach((violation: ComplianceViolation) => {
      if (violation.userId === userId) {
        userViolations.push(violation);
      }
    });
    return userViolations;
  }

  /**
   * 違反解決
   */
  resolveViolation(violationId: string): ComplianceViolation | null {
    const violation = this.getViolation(violationId);
    if (!violation) return null;

    violation.status = 'resolved';
    violation.resolvedAt = Date.now();
    return violation;
  }

  /**
   * コンプライアンス率計算
   */
  calculateComplianceRate(userId: number): {
    rate: number;
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
  } {
    const userViolations = this.getUserViolations(userId);
    const openViolations = userViolations.filter(v => v.status === 'open').length;
    const totalChecks = this.checks.size;
    const failedChecks = openViolations;
    const passedChecks = Math.max(0, totalChecks - failedChecks);
    const rate = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;

    return {
      rate,
      totalChecks,
      passedChecks,
      failedChecks,
    };
  }

  /**
   * ポリシー作成
   */
  createPolicy(name: string, description: string, content: string): Policy {
    const policyId = `pol_${++this.policyCounter}_${Date.now()}`;
    const now = Date.now();

    const policy: Policy = {
      id: policyId,
      name,
      description,
      version: 1,
      status: 'draft',
      content,
      createdAt: now,
      updatedAt: now,
    };

    this.policies.set(policyId, policy);
    return policy;
  }

  /**
   * ポリシー取得
   */
  getPolicy(policyId: string): Policy | null {
    return this.policies.get(policyId) || null;
  }

  /**
   * ポリシーアクティベート
   */
  activatePolicy(policyId: string): Policy | null {
    const policy = this.getPolicy(policyId);
    if (!policy) return null;

    policy.status = 'active';
    policy.updatedAt = Date.now();
    return policy;
  }

  /**
   * ポリシー更新
   */
  updatePolicy(policyId: string, content: string): Policy | null {
    const policy = this.getPolicy(policyId);
    if (!policy) return null;

    policy.content = content;
    policy.version += 1;
    policy.updatedAt = Date.now();
    return policy;
  }

  /**
   * リスク評価
   */
  assessRisk(userId: number): {
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    violations: number;
    recommendations: string[];
  } {
    const violations = this.getUserViolations(userId);
    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const highCount = violations.filter(v => v.severity === 'high').length;
    const mediumCount = violations.filter(v => v.severity === 'medium').length;

    const riskScore = criticalCount * 40 + highCount * 25 + mediumCount * 10;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (riskScore >= 80) riskLevel = 'critical';
    else if (riskScore >= 60) riskLevel = 'high';
    else if (riskScore >= 40) riskLevel = 'medium';

    const recommendations: string[] = [];
    if (criticalCount > 0) recommendations.push('緊急: クリティカル違反を解決してください');
    if (highCount > 0) recommendations.push('高: 高リスク違反を対処してください');
    if (mediumCount > 0) recommendations.push('中: 中リスク違反を確認してください');

    return {
      riskScore,
      riskLevel,
      violations: violations.length,
      recommendations,
    };
  }

  /**
   * 監査実行
   */
  executeAudit(userId: number): {
    auditId: string;
    userId: number;
    timestamp: number;
    complianceRate: number;
    violations: number;
    riskLevel: string;
  } {
    const auditId = `audit_${Date.now()}`;
    const complianceData = this.calculateComplianceRate(userId);
    const riskData = this.assessRisk(userId);

    return {
      auditId,
      userId,
      timestamp: Date.now(),
      complianceRate: complianceData.rate,
      violations: complianceData.failedChecks,
      riskLevel: riskData.riskLevel,
    };
  }

  /**
   * レポート生成
   */
  generateReport(userId: number): {
    userId: number;
    timestamp: number;
    complianceRate: number;
    riskLevel: string;
    violations: ComplianceViolation[];
    recommendations: string[];
    summary: string;
  } {
    const complianceData = this.calculateComplianceRate(userId);
    const riskData = this.assessRisk(userId);
    const violations = this.getUserViolations(userId).filter(v => v.status === 'open');

    let summary = '';
    if (complianceData.rate >= 90) {
      summary = 'コンプライアンス状態は良好です';
    } else if (complianceData.rate >= 70) {
      summary = 'いくつかの改善が必要です';
    } else {
      summary = '重大な改善が必要です';
    }

    return {
      userId,
      timestamp: Date.now(),
      complianceRate: complianceData.rate,
      riskLevel: riskData.riskLevel,
      violations,
      recommendations: riskData.recommendations,
      summary,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(userId?: number): void {
    if (userId) {
      const toDelete: string[] = [];
      this.violations.forEach((violation: ComplianceViolation, id: string) => {
        if (violation.userId === userId) {
          toDelete.push(id);
        }
      });
      toDelete.forEach(id => this.violations.delete(id));
    } else {
      this.checks.clear();
      this.violations.clear();
      this.policies.clear();
    }
  }
}

export const complianceAIManager = ComplianceAIManager.getInstance();
export default complianceAIManager;
