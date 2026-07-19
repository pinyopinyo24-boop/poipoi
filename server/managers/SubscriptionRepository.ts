/**
 * SubscriptionRepository - サブスクリプションリポジトリ
 * 
 * 機能:
 * - サブスクリプションデータ永続化
 * - クエリ機能
 * - インデックス管理
 */

export interface SubscriptionQuery {
  userId?: number;
  status?: 'active' | 'inactive' | 'suspended' | 'cancelled';
  planId?: string;
  startDate?: number;
  endDate?: number;
  limit?: number;
  offset?: number;
}

export class SubscriptionRepository {
  private static instance: SubscriptionRepository;
  private subscriptions: Map<string, any> = new Map();
  private userIndex: Map<number, string[]> = new Map();
  private statusIndex: Map<string, string[]> = new Map();
  private planIndex: Map<string, string[]> = new Map();

  private constructor() {}

  static getInstance(): SubscriptionRepository {
    if (!SubscriptionRepository.instance) {
      SubscriptionRepository.instance = new SubscriptionRepository();
    }
    return SubscriptionRepository.instance;
  }

  /**
   * サブスクリプション保存
   */
  save(subscription: any): void {
    this.subscriptions.set(subscription.id, subscription);

    if (!this.userIndex.has(subscription.userId)) {
      this.userIndex.set(subscription.userId, []);
    }
    const userSubs = this.userIndex.get(subscription.userId);
    if (userSubs && !userSubs.includes(subscription.id)) {
      userSubs.push(subscription.id);
    }

    if (!this.statusIndex.has(subscription.status)) {
      this.statusIndex.set(subscription.status, []);
    }
    const statusSubs = this.statusIndex.get(subscription.status);
    if (statusSubs && !statusSubs.includes(subscription.id)) {
      statusSubs.push(subscription.id);
    }

    if (!this.planIndex.has(subscription.planId)) {
      this.planIndex.set(subscription.planId, []);
    }
    const planSubs = this.planIndex.get(subscription.planId);
    if (planSubs && !planSubs.includes(subscription.id)) {
      planSubs.push(subscription.id);
    }
  }

  /**
   * サブスクリプション取得
   */
  findById(id: string): any | null {
    return this.subscriptions.get(id) || null;
  }

  /**
   * クエリ実行
   */
  query(query: SubscriptionQuery): any[] {
    let results: any[] = [];

    if (query.userId !== undefined) {
      const userSubs = this.userIndex.get(query.userId) || [];
      results = userSubs
        .map((id: string) => this.subscriptions.get(id))
        .filter((s: any) => s !== undefined);
    } else {
      results = Array.from(this.subscriptions.values());
    }

    if (query.status) {
      results = results.filter((s: any) => s.status === query.status);
    }

    if (query.planId) {
      results = results.filter((s: any) => s.planId === query.planId);
    }

    if (query.startDate !== undefined) {
      results = results.filter((s: any) => s.startDate >= (query.startDate || 0));
    }
    if (query.endDate !== undefined) {
      results = results.filter((s: any) => s.startDate <= (query.endDate || Date.now()));
    }

    results.sort((a: any, b: any) => b.createdAt - a.createdAt);

    const offset = query.offset || 0;
    const limit = query.limit || 100;
    results = results.slice(offset, offset + limit);

    return results;
  }

  /**
   * ユーザーサブスクリプション取得
   */
  findByUserId(userId: number): any[] {
    const userSubs = this.userIndex.get(userId) || [];
    return userSubs
      .map((id: string) => this.subscriptions.get(id))
      .filter((s: any) => s !== undefined);
  }

  /**
   * ステータス別サブスクリプション取得
   */
  findByStatus(status: string): any[] {
    const statusSubs = this.statusIndex.get(status) || [];
    return statusSubs
      .map((id: string) => this.subscriptions.get(id))
      .filter((s: any) => s !== undefined);
  }

  /**
   * プラン別サブスクリプション取得
   */
  findByPlanId(planId: string): any[] {
    const planSubs = this.planIndex.get(planId) || [];
    return planSubs
      .map((id: string) => this.subscriptions.get(id))
      .filter((s: any) => s !== undefined);
  }

  /**
   * サブスクリプション削除
   */
  delete(id: string): boolean {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return false;

    this.subscriptions.delete(id);

    const userSubs = this.userIndex.get(subscription.userId);
    if (userSubs) {
      const index = userSubs.indexOf(id);
      if (index !== -1) userSubs.splice(index, 1);
    }

    const statusSubs = this.statusIndex.get(subscription.status);
    if (statusSubs) {
      const index = statusSubs.indexOf(id);
      if (index !== -1) statusSubs.splice(index, 1);
    }

    const planSubs = this.planIndex.get(subscription.planId);
    if (planSubs) {
      const index = planSubs.indexOf(id);
      if (index !== -1) planSubs.splice(index, 1);
    }

    return true;
  }

  /**
   * 統計情報取得
   */
  getStats(): {
    totalSubscriptions: number;
    activeSubscriptions: number;
    inactiveSubscriptions: number;
    suspendedSubscriptions: number;
    cancelledSubscriptions: number;
  } {
    const active = this.statusIndex.get('active')?.length || 0;
    const inactive = this.statusIndex.get('inactive')?.length || 0;
    const suspended = this.statusIndex.get('suspended')?.length || 0;
    const cancelled = this.statusIndex.get('cancelled')?.length || 0;

    return {
      totalSubscriptions: this.subscriptions.size,
      activeSubscriptions: active,
      inactiveSubscriptions: inactive,
      suspendedSubscriptions: suspended,
      cancelledSubscriptions: cancelled,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.subscriptions.clear();
    this.userIndex.clear();
    this.statusIndex.clear();
    this.planIndex.clear();
  }
}

export const subscriptionRepository = SubscriptionRepository.getInstance();
export default subscriptionRepository;
