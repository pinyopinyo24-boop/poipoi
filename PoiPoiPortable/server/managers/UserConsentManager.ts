/**
 * UserConsentManager - ユーザー同意管理
 */

export type ConsentType = 'privacy_policy' | 'terms_of_service' | 'data_collection' | 'analytics' | 'marketing' | 'beta_testing';
export type ConsentStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface UserConsent {
  id: string;
  userId: string;
  consentType: ConsentType;
  status: ConsentStatus;
  version: string;
  acceptedAt?: number;
  rejectedAt?: number;
  withdrawnAt?: number;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface ConsentDocument {
  type: ConsentType;
  version: string;
  content: string;
  createdAt: number;
  effectiveAt: number;
  isActive: boolean;
}

export class UserConsentManager {
  private static instance: UserConsentManager;
  private userConsents: Map<string, UserConsent[]> = new Map();
  private consentDocuments: Map<string, ConsentDocument> = new Map();
  private consentCounter: number = 0;

  private constructor() {
    this.initializeDefaultDocuments();
  }

  static getInstance(): UserConsentManager {
    if (!UserConsentManager.instance) {
      UserConsentManager.instance = new UserConsentManager();
    }
    return UserConsentManager.instance;
  }

  /**
   * デフォルトドキュメント初期化
   */
  private initializeDefaultDocuments(): void {
    const consentTypes: ConsentType[] = ['privacy_policy', 'terms_of_service', 'data_collection', 'analytics', 'marketing', 'beta_testing'];

    for (const type of consentTypes) {
      this.consentDocuments.set(`${type}_v1`, {
        type,
        version: 'v1',
        content: `Default ${type} content`,
        createdAt: Date.now(),
        effectiveAt: Date.now(),
        isActive: true,
      });
    }
  }

  /**
   * ユーザー同意記録
   */
  recordConsent(
    userId: string,
    consentType: ConsentType,
    status: ConsentStatus,
    version: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): UserConsent {
    const id = `consent_${++this.consentCounter}_${Date.now()}`;

    const consent: UserConsent = {
      id,
      userId,
      consentType,
      status,
      version,
      acceptedAt: status === 'accepted' ? Date.now() : undefined,
      rejectedAt: status === 'rejected' ? Date.now() : undefined,
      withdrawnAt: status === 'withdrawn' ? Date.now() : undefined,
      ipAddress,
      userAgent,
      metadata,
    };

    if (!this.userConsents.has(userId)) {
      this.userConsents.set(userId, []);
    }

    this.userConsents.get(userId)?.push(consent);
    return consent;
  }

  /**
   * ユーザーの同意取得
   */
  getUserConsents(userId: string): UserConsent[] {
    return this.userConsents.get(userId) || [];
  }

  /**
   * ユーザーの特定の同意取得
   */
  getUserConsent(userId: string, consentType: ConsentType): UserConsent | null {
    const consents = this.userConsents.get(userId) || [];
    return consents.find((c) => c.consentType === consentType) || null;
  }

  /**
   * 同意ステータス確認
   */
  hasConsented(userId: string, consentType: ConsentType): boolean {
    const consent = this.getUserConsent(userId, consentType);
    return consent?.status === 'accepted';
  }

  /**
   * 同意撤回
   */
  withdrawConsent(userId: string, consentType: ConsentType): UserConsent | null {
    const consent = this.getUserConsent(userId, consentType);
    if (!consent) return null;

    consent.status = 'withdrawn';
    consent.withdrawnAt = Date.now();
    return consent;
  }

  /**
   * 同意ドキュメント登録
   */
  registerConsentDocument(type: ConsentType, version: string, content: string, effectiveAt: number): ConsentDocument {
    const document: ConsentDocument = {
      type,
      version,
      content,
      createdAt: Date.now(),
      effectiveAt,
      isActive: true,
    };

    // 古いバージョンを非アクティブにする
    this.consentDocuments.forEach((doc) => {
      if (doc.type === type && doc.version !== version) {
        doc.isActive = false;
      }
    });

    this.consentDocuments.set(`${type}_${version}`, document);
    return document;
  }

  /**
   * 同意ドキュメント取得
   */
  getConsentDocument(type: ConsentType, version?: string): ConsentDocument | null {
    if (version) {
      return this.consentDocuments.get(`${type}_${version}`) || null;
    }

    // 最新のアクティブなドキュメント取得
    let latest: ConsentDocument | null = null;
    this.consentDocuments.forEach((doc) => {
      if (doc.type === type && doc.isActive) {
        if (!latest || doc.createdAt > latest.createdAt) {
          latest = doc;
        }
      }
    });

    return latest;
  }

  /**
   * 全ユーザーの同意統計
   */
  getConsentStatistics(): {
    consentType: ConsentType;
    totalUsers: number;
    acceptedCount: number;
    rejectedCount: number;
    withdrawnCount: number;
    acceptanceRate: number;
  }[] {
    const stats: Map<ConsentType, any> = new Map();
    const consentTypes: ConsentType[] = ['privacy_policy', 'terms_of_service', 'data_collection', 'analytics', 'marketing', 'beta_testing'];

    for (const type of consentTypes) {
      stats.set(type, {
        consentType: type,
        totalUsers: 0,
        acceptedCount: 0,
        rejectedCount: 0,
        withdrawnCount: 0,
      });
    }

    this.userConsents.forEach((consents) => {
      const typeMap = new Map<ConsentType, UserConsent>();

      // 各タイプの最新同意を取得
      consents.forEach((consent) => {
        const existing = typeMap.get(consent.consentType);
        if (!existing || consent.acceptedAt! > (existing.acceptedAt || 0)) {
          typeMap.set(consent.consentType, consent);
        }
      });

      // 統計を更新
      typeMap.forEach((consent, type) => {
        const stat = stats.get(type);
        if (stat) {
          stat.totalUsers++;
          if (consent.status === 'accepted') stat.acceptedCount++;
          else if (consent.status === 'rejected') stat.rejectedCount++;
          else if (consent.status === 'withdrawn') stat.withdrawnCount++;
        }
      });
    });

    // 受け入れ率を計算
    const result: any[] = [];
    stats.forEach((stat) => {
      const acceptanceRate = stat.totalUsers > 0 ? (stat.acceptedCount / stat.totalUsers) * 100 : 0;
      result.push({
        ...stat,
        acceptanceRate: Math.round(acceptanceRate * 100) / 100,
      });
    });

    return result;
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.userConsents.clear();
    this.consentDocuments.clear();
  }
}

export const userConsentManager = UserConsentManager.getInstance();
export default userConsentManager;
