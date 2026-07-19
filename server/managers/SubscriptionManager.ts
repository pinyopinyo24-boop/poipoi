/**
 * SubscriptionManager - サブスクリプション管理
 * 
 * 機能:
 * - サブスクリプション作成・管理
 * - プラン管理
 * - 自動更新・キャンセル
 * - 請求管理
 */

export interface Subscription {
  id: string;
  userId: number;
  planId: string;
  status: 'active' | 'inactive' | 'suspended' | 'cancelled';
  startDate: number;
  endDate?: number;
  autoRenew: boolean;
  renewalDate?: number;
  price: number;
  currency: string;
  paymentMethod: string;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, any>;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  features: string[];
  limits: Record<string, number>;
  active: boolean;
}

export class SubscriptionManager {
  private static instance: SubscriptionManager;
  private subscriptions: Map<number, Subscription[]> = new Map();
  private plans: Map<string, SubscriptionPlan> = new Map();
  private subscriptionCounter: number = 0;

  private constructor() {}

  static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }

  /**
   * プラン作成
   */
  createPlan(
    name: string,
    description: string,
    price: number,
    currency: string,
    billingCycle: 'monthly' | 'yearly' | 'lifetime',
    features: string[],
    limits: Record<string, number>
  ): SubscriptionPlan {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const plan: SubscriptionPlan = {
      id: planId,
      name,
      description,
      price,
      currency,
      billingCycle,
      features,
      limits,
      active: true,
    };

    this.plans.set(planId, plan);
    return plan;
  }

  /**
   * プラン取得
   */
  getPlan(planId: string): SubscriptionPlan | null {
    return this.plans.get(planId) || null;
  }

  /**
   * すべてのプラン取得
   */
  getAllPlans(): SubscriptionPlan[] {
    return Array.from(this.plans.values()).filter(p => p.active);
  }

  /**
   * サブスクリプション作成
   */
  createSubscription(
    userId: number,
    planId: string,
    paymentMethod: string,
    autoRenew: boolean = true
  ): Subscription | null {
    const plan = this.getPlan(planId);
    if (!plan) return null;

    const subscriptionId = `sub_${++this.subscriptionCounter}_${Date.now()}`;
    const now = Date.now();
    const billingCycleDays =
      plan.billingCycle === 'monthly' ? 30 : plan.billingCycle === 'yearly' ? 365 : 36500;
    const endDate = now + billingCycleDays * 86400000;

    const subscription: Subscription = {
      id: subscriptionId,
      userId,
      planId,
      status: 'active',
      startDate: now,
      endDate,
      autoRenew,
      renewalDate: autoRenew ? endDate : undefined,
      price: plan.price,
      currency: plan.currency,
      paymentMethod,
      createdAt: now,
      updatedAt: now,
      metadata: {},
    };

    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, []);
    }

    const userSubs = this.subscriptions.get(userId);
    if (userSubs) {
      userSubs.push(subscription);
    }

    return subscription;
  }

  /**
   * ユーザーのサブスクリプション取得
   */
  getUserSubscription(userId: number): Subscription | null {
    const userSubs = this.subscriptions.get(userId);
    if (!userSubs) return null;

    return userSubs.find(s => s.status === 'active') || null;
  }

  /**
   * サブスクリプション取得
   */
  getSubscription(subscriptionId: string): Subscription | null {
    let result: Subscription | null = null;
    this.subscriptions.forEach((subs: Subscription[]) => {
      const sub = subs.find((s: Subscription) => s.id === subscriptionId);
      if (sub) result = sub;
    });
    return result;
  }

  /**
   * サブスクリプション更新
   */
  updateSubscription(
    subscriptionId: string,
    updates: Partial<Subscription>
  ): Subscription | null {
    const subscription = this.getSubscription(subscriptionId);
    if (!subscription) return null;

    const updated = {
      ...subscription,
      ...updates,
      updatedAt: Date.now(),
    };

    const userSubs = this.subscriptions.get(subscription.userId);
    if (userSubs) {
      const index = userSubs.findIndex(s => s.id === subscriptionId);
      if (index !== -1) {
        userSubs[index] = updated;
      }
    }

    return updated;
  }

  /**
   * サブスクリプションキャンセル
   */
  cancelSubscription(subscriptionId: string): Subscription | null {
    return this.updateSubscription(subscriptionId, {
      status: 'cancelled',
      autoRenew: false,
    });
  }

  /**
   * サブスクリプション一時停止
   */
  suspendSubscription(subscriptionId: string): Subscription | null {
    return this.updateSubscription(subscriptionId, {
      status: 'suspended',
    });
  }

  /**
   * サブスクリプション再開
   */
  resumeSubscription(subscriptionId: string): Subscription | null {
    return this.updateSubscription(subscriptionId, {
      status: 'active',
    });
  }

  /**
   * プラン変更
   */
  changePlan(subscriptionId: string, newPlanId: string): Subscription | null {
    const subscription = this.getSubscription(subscriptionId);
    if (!subscription) return null;

    const newPlan = this.getPlan(newPlanId);
    if (!newPlan) return null;

    return this.updateSubscription(subscriptionId, {
      planId: newPlanId,
      price: newPlan.price,
    });
  }

  /**
   * 自動更新設定
   */
  setAutoRenew(subscriptionId: string, autoRenew: boolean): Subscription | null {
    return this.updateSubscription(subscriptionId, {
      autoRenew,
    });
  }

  /**
   * サブスクリプション統計取得
   */
  getSubscriptionStats(userId: number): {
    activeSubscription: Subscription | null;
    totalSpent: number;
    subscriptionCount: number;
  } {
    const userSubs = this.subscriptions.get(userId) || [];
    const activeSubscription = userSubs.find(s => s.status === 'active') || null;
    const totalSpent = userSubs
      .filter(s => s.status === 'cancelled' || s.status === 'inactive')
      .reduce((sum, s) => sum + s.price, 0);

    return {
      activeSubscription,
      totalSpent,
      subscriptionCount: userSubs.length,
    };
  }

  /**
   * 期限切れサブスクリプション確認
   */
  checkExpiredSubscriptions(): Subscription[] {
    const now = Date.now();
    const expired: Subscription[] = [];

    this.subscriptions.forEach((subs: Subscription[]) => {
      subs.forEach((sub: Subscription) => {
        if (sub.status === 'active' && sub.endDate && sub.endDate < now) {
          if (sub.autoRenew) {
            this.renewSubscription(sub.id);
          } else {
            this.updateSubscription(sub.id, { status: 'inactive' });
            expired.push(sub);
          }
        }
      });
    });

    return expired;
  }

  /**
   * サブスクリプション更新
   */
  renewSubscription(subscriptionId: string): Subscription | null {
    const subscription = this.getSubscription(subscriptionId);
    if (!subscription) return null;

    const plan = this.getPlan(subscription.planId);
    if (!plan) return null;

    const now = Date.now();
    const billingCycleDays =
      plan.billingCycle === 'monthly' ? 30 : plan.billingCycle === 'yearly' ? 365 : 36500;
    const newEndDate = now + billingCycleDays * 86400000;

    return this.updateSubscription(subscriptionId, {
      status: 'active',
      startDate: now,
      endDate: newEndDate,
      renewalDate: newEndDate,
    });
  }

  /**
   * ユーザーの全サブスクリプション取得
   */
  getUserSubscriptions(userId: number): Subscription[] {
    return this.subscriptions.get(userId) || [];
  }

  /**
   * プラン削除
   */
  deactivatePlan(planId: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;

    plan.active = false;
    return true;
  }

  /**
   * クリーンアップ
   */
  cleanup(userId?: number): void {
    if (userId) {
      this.subscriptions.delete(userId);
    } else {
      this.subscriptions.clear();
      this.plans.clear();
    }
  }
}

export const subscriptionManager = SubscriptionManager.getInstance();
export default subscriptionManager;
