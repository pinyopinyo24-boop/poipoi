/**
 * PolicyComplianceService - ポリシーコンプライアンスサービス
 * 
 * 機能:
 * - ポリシー適用
 * - コンプライアンス確認
 * - ポリシー履歴
 * - バージョン管理
 */

export interface PolicyApplication {
  id: string;
  userId: number;
  policyId: string;
  appliedAt: number;
  expiresAt?: number;
  status: 'active' | 'expired' | 'revoked';
  metadata: Record<string, any>;
}

export interface PolicyVersion {
  version: number;
  content: string;
  createdAt: number;
  createdBy: string;
  changes: string;
}

export class PolicyComplianceService {
  private static instance: PolicyComplianceService;
  private applications: Map<string, PolicyApplication> = new Map();
  private versions: Map<string, PolicyVersion[]> = new Map();
  private applicationCounter: number = 0;

  private constructor() {}

  static getInstance(): PolicyComplianceService {
    if (!PolicyComplianceService.instance) {
      PolicyComplianceService.instance = new PolicyComplianceService();
    }
    return PolicyComplianceService.instance;
  }

  /**
   * ポリシー適用
   */
  applyPolicy(
    userId: number,
    policyId: string,
    expiresAt?: number,
    metadata: Record<string, any> = {}
  ): PolicyApplication {
    const applicationId = `app_${++this.applicationCounter}_${Date.now()}`;

    const application: PolicyApplication = {
      id: applicationId,
      userId,
      policyId,
      appliedAt: Date.now(),
      expiresAt,
      status: 'active',
      metadata,
    };

    this.applications.set(applicationId, application);
    return application;
  }

  /**
   * 適用取得
   */
  getApplication(applicationId: string): PolicyApplication | null {
    return this.applications.get(applicationId) || null;
  }

  /**
   * ユーザー適用取得
   */
  getUserApplications(userId: number): PolicyApplication[] {
    const userApplications: PolicyApplication[] = [];
    this.applications.forEach((app: PolicyApplication) => {
      if (app.userId === userId) {
        userApplications.push(app);
      }
    });
    return userApplications;
  }

  /**
   * ポリシー適用確認
   */
  isUserCompliant(userId: number, policyId: string): boolean {
    const userApplications = this.getUserApplications(userId);
    const application = userApplications.find(
      (app: PolicyApplication) => app.policyId === policyId && app.status === 'active'
    );

    if (!application) return false;

    if (application.expiresAt && application.expiresAt < Date.now()) {
      application.status = 'expired';
      return false;
    }

    return true;
  }

  /**
   * ポリシー適用取り消し
   */
  revokeApplication(applicationId: string): PolicyApplication | null {
    const application = this.getApplication(applicationId);
    if (!application) return null;

    application.status = 'revoked';
    return application;
  }

  /**
   * バージョン追加
   */
  addVersion(
    policyId: string,
    version: number,
    content: string,
    createdBy: string,
    changes: string
  ): PolicyVersion {
    if (!this.versions.has(policyId)) {
      this.versions.set(policyId, []);
    }

    const policyVersion: PolicyVersion = {
      version,
      content,
      createdAt: Date.now(),
      createdBy,
      changes,
    };

    const versions = this.versions.get(policyId);
    if (versions) {
      versions.push(policyVersion);
    }

    return policyVersion;
  }

  /**
   * バージョン取得
   */
  getVersion(policyId: string, version: number): PolicyVersion | null {
    const versions = this.versions.get(policyId) || [];
    return versions.find((v: PolicyVersion) => v.version === version) || null;
  }

  /**
   * バージョン履歴取得
   */
  getVersionHistory(policyId: string): PolicyVersion[] {
    return this.versions.get(policyId) || [];
  }

  /**
   * コンプライアンス確認
   */
  checkCompliance(userId: number): {
    compliantPolicies: number;
    nonCompliantPolicies: number;
    expiredPolicies: number;
    complianceRate: number;
  } {
    const applications = this.getUserApplications(userId);
    let compliantCount = 0;
    let expiredCount = 0;

    applications.forEach((app: PolicyApplication) => {
      if (app.status === 'expired' || (app.expiresAt && app.expiresAt < Date.now())) {
        expiredCount++;
      } else if (app.status === 'active') {
        compliantCount++;
      }
    });

    const nonCompliantCount = applications.length - compliantCount - expiredCount;
    const complianceRate =
      applications.length > 0 ? (compliantCount / applications.length) * 100 : 100;

    return {
      compliantPolicies: compliantCount,
      nonCompliantPolicies: nonCompliantCount,
      expiredPolicies: expiredCount,
      complianceRate,
    };
  }

  /**
   * コンプライアンスレポート生成
   */
  generateComplianceReport(userId: number): {
    userId: number;
    timestamp: number;
    complianceStatus: string;
    applications: PolicyApplication[];
    recommendations: string[];
  } {
    const compliance = this.checkCompliance(userId);
    const applications = this.getUserApplications(userId);

    let complianceStatus = '完全準拠';
    const recommendations: string[] = [];

    if (compliance.expiredPolicies > 0) {
      complianceStatus = '期限切れポリシーあり';
      recommendations.push('期限切れポリシーを更新してください');
    }

    if (compliance.nonCompliantPolicies > 0) {
      complianceStatus = '非準拠ポリシーあり';
      recommendations.push('非準拠ポリシーに対応してください');
    }

    if (compliance.complianceRate < 100) {
      recommendations.push(`コンプライアンス率を改善してください (現在: ${compliance.complianceRate.toFixed(1)}%)`);
    }

    return {
      userId,
      timestamp: Date.now(),
      complianceStatus,
      applications,
      recommendations,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(userId?: number): void {
    if (userId) {
      const toDelete: string[] = [];
      this.applications.forEach((app: PolicyApplication, id: string) => {
        if (app.userId === userId) {
          toDelete.push(id);
        }
      });
      toDelete.forEach(id => this.applications.delete(id));
    } else {
      this.applications.clear();
      this.versions.clear();
    }
  }
}

export const policyComplianceService = PolicyComplianceService.getInstance();
export default policyComplianceService;
