/**
 * QuotaManagementService - クォータ管理
 * 
 * 機能:
 * - クォータ設定・管理
 * - クォータ使用状況追跡
 * - クォータ警告・制限
 * - クォータリセット
 */

export interface Quota {
  id: string;
  userId: number;
  type: string;
  limit: number;
  used: number;
  remaining: number;
  resetDate: number;
  warningThreshold: number;
  isWarning: boolean;
  isExceeded: boolean;
  createdAt: number;
  updatedAt: number;
}

export class QuotaManagementService {
  private static instance: QuotaManagementService;
  private quotas: Map<string, Quota> = new Map();
  private quotaCounter: number = 0;

  private constructor() {}

  static getInstance(): QuotaManagementService {
    if (!QuotaManagementService.instance) {
      QuotaManagementService.instance = new QuotaManagementService();
    }
    return QuotaManagementService.instance;
  }

  /**
   * クォータ作成
   */
  createQuota(
    userId: number,
    type: string,
    limit: number,
    resetDate: number,
    warningThreshold: number = 80
  ): Quota {
    const quotaId = `quota_${++this.quotaCounter}_${Date.now()}`;
    const now = Date.now();

    const quota: Quota = {
      id: quotaId,
      userId,
      type,
      limit,
      used: 0,
      remaining: limit,
      resetDate,
      warningThreshold,
      isWarning: false,
      isExceeded: false,
      createdAt: now,
      updatedAt: now,
    };

    this.quotas.set(quotaId, quota);
    return quota;
  }

  /**
   * クォータ取得
   */
  getQuota(quotaId: string): Quota | null {
    return this.quotas.get(quotaId) || null;
  }

  /**
   * ユーザークォータ取得
   */
  getUserQuotas(userId: number): Quota[] {
    const userQuotas: Quota[] = [];
    this.quotas.forEach((quota: Quota) => {
      if (quota.userId === userId) {
        userQuotas.push(quota);
      }
    });
    return userQuotas;
  }

  /**
   * クォータ使用
   */
  useQuota(quotaId: string, amount: number): { success: boolean; remaining: number; message: string } {
    const quota = this.getQuota(quotaId);
    if (!quota) {
      return { success: false, remaining: 0, message: 'クォータが見つかりません' };
    }

    if (quota.isExceeded) {
      return { success: false, remaining: 0, message: 'クォータを超過しています' };
    }

    if (quota.used + amount > quota.limit) {
      return { success: false, remaining: quota.remaining, message: 'クォータが不足しています' };
    }

    quota.used += amount;
    quota.remaining = quota.limit - quota.used;
    quota.updatedAt = Date.now();

    const usagePercent = (quota.used / quota.limit) * 100;
    if (usagePercent >= 100) {
      quota.isExceeded = true;
      return { success: true, remaining: 0, message: 'クォータを超過しました' };
    } else if (usagePercent >= quota.warningThreshold) {
      quota.isWarning = true;
      return { success: true, remaining: quota.remaining, message: 'クォータ使用量が多くなっています' };
    }

    return { success: true, remaining: quota.remaining, message: 'クォータを使用しました' };
  }

  /**
   * クォータ使用状況取得
   */
  getQuotaUsage(quotaId: string): {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  } | null {
    const quota = this.getQuota(quotaId);
    if (!quota) return null;

    return {
      used: quota.used,
      limit: quota.limit,
      remaining: quota.remaining,
      percentage: (quota.used / quota.limit) * 100,
    };
  }

  /**
   * クォータ警告確認
   */
  checkWarnings(userId: number): Quota[] {
    return this.getUserQuotas(userId).filter(q => q.isWarning || q.isExceeded);
  }

  /**
   * クォータリセット
   */
  resetQuota(quotaId: string): Quota | null {
    const quota = this.getQuota(quotaId);
    if (!quota) return null;

    quota.used = 0;
    quota.remaining = quota.limit;
    quota.isWarning = false;
    quota.isExceeded = false;
    quota.resetDate = Date.now() + 30 * 86400000;
    quota.updatedAt = Date.now();

    return quota;
  }

  /**
   * クォータ制限更新
   */
  updateQuotaLimit(quotaId: string, newLimit: number): Quota | null {
    const quota = this.getQuota(quotaId);
    if (!quota) return null;

    quota.limit = newLimit;
    quota.remaining = newLimit - quota.used;
    quota.updatedAt = Date.now();

    if (quota.used <= newLimit) {
      quota.isExceeded = false;
    }

    return quota;
  }

  /**
   * クォータ警告閾値更新
   */
  updateWarningThreshold(quotaId: string, threshold: number): Quota | null {
    const quota = this.getQuota(quotaId);
    if (!quota) return null;

    quota.warningThreshold = Math.max(0, Math.min(100, threshold));
    quota.updatedAt = Date.now();

    return quota;
  }

  /**
   * 期限切れクォータ確認
   */
  checkExpiredQuotas(): Quota[] {
    const now = Date.now();
    const expired: Quota[] = [];

    this.quotas.forEach((quota: Quota) => {
      if (quota.resetDate < now) {
        this.resetQuota(quota.id);
        expired.push(quota);
      }
    });

    return expired;
  }

  /**
   * クォータ統計取得
   */
  getQuotaStats(userId: number): {
    totalQuotas: number;
    warningCount: number;
    exceededCount: number;
    totalUsed: number;
    totalLimit: number;
  } {
    const userQuotas = this.getUserQuotas(userId);
    const warningCount = userQuotas.filter(q => q.isWarning).length;
    const exceededCount = userQuotas.filter(q => q.isExceeded).length;
    const totalUsed = userQuotas.reduce((sum, q) => sum + q.used, 0);
    const totalLimit = userQuotas.reduce((sum, q) => sum + q.limit, 0);

    return {
      totalQuotas: userQuotas.length,
      warningCount,
      exceededCount,
      totalUsed,
      totalLimit,
    };
  }

  /**
   * クォータ削除
   */
  deleteQuota(quotaId: string): boolean {
    return this.quotas.delete(quotaId);
  }

  /**
   * クリーンアップ
   */
  cleanup(userId?: number): void {
    if (userId) {
      const toDelete: string[] = [];
      this.quotas.forEach((quota: Quota, id: string) => {
        if (quota.userId === userId) {
          toDelete.push(id);
        }
      });
      toDelete.forEach(id => this.quotas.delete(id));
    } else {
      this.quotas.clear();
    }
  }
}

export const quotaManagementService = QuotaManagementService.getInstance();
export default quotaManagementService;
