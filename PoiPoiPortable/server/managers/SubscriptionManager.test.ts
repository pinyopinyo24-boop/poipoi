/**
 * SubscriptionManager Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { subscriptionManager, SubscriptionManager } from './SubscriptionManager';

describe('SubscriptionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionManager.cleanup();
  });

  afterEach(() => {
    subscriptionManager.cleanup();
  });

  // === プラン作成テスト ===
  describe('Create Plan', () => {
    it('should create plan', () => {
      const plan = subscriptionManager.createPlan(
        'Pro',
        'Professional Plan',
        9.99,
        'USD',
        'monthly',
        ['Feature 1', 'Feature 2'],
        { storage: 100, users: 5 }
      );

      expect(plan).not.toBeNull();
      expect(plan.name).toBe('Pro');
      expect(plan.price).toBe(9.99);
    });

    it('should get plan', () => {
      const created = subscriptionManager.createPlan(
        'Pro',
        'Professional Plan',
        9.99,
        'USD',
        'monthly',
        ['Feature 1'],
        { storage: 100 }
      );

      const retrieved = subscriptionManager.getPlan(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get all plans', () => {
      subscriptionManager.createPlan('Pro', 'Pro Plan', 9.99, 'USD', 'monthly', [], {});
      subscriptionManager.createPlan('Enterprise', 'Enterprise Plan', 99.99, 'USD', 'yearly', [], {});
      const plans = subscriptionManager.getAllPlans();
      expect(plans.length).toBe(2);
    });
  });

  // === サブスクリプション作成テスト ===
  describe('Create Subscription', () => {
    it('should create subscription', () => {
      const plan = subscriptionManager.createPlan('Pro', 'Pro Plan', 9.99, 'USD', 'monthly', [], {});
      const sub = subscriptionManager.createSubscription(1, plan.id, 'credit_card');
      expect(sub).not.toBeNull();
      expect(sub?.status).toBe('active');
    });

    it('should get user subscription', () => {
      const plan = subscriptionManager.createPlan('Pro', 'Pro Plan', 9.99, 'USD', 'monthly', [], {});
      subscriptionManager.createSubscription(1, plan.id, 'credit_card');
      const sub = subscriptionManager.getUserSubscription(1);
      expect(sub).not.toBeNull();
      expect(sub?.userId).toBe(1);
    });

    it('should get subscription by id', () => {
      const plan = subscriptionManager.createPlan('Pro', 'Pro Plan', 9.99, 'USD', 'monthly', [], {});
      const created = subscriptionManager.createSubscription(1, plan.id, 'credit_card');
      if (created) {
        const retrieved = subscriptionManager.getSubscription(created.id);
        expect(retrieved).not.toBeNull();
      }
    });
  });

  // === サブスクリプション管理テスト ===
  describe('Subscription Management', () => {
    it('should cancel subscription', () => {
      const plan = subscriptionManager.createPlan('Pro', 'Pro Plan', 9.99, 'USD', 'monthly', [], {});
      const sub = subscriptionManager.createSubscription(1, plan.id, 'credit_card');
      if (sub) {
        const cancelled = subscriptionManager.cancelSubscription(sub.id);
        expect(cancelled?.status).toBe('cancelled');
      }
    });

    it('should suspend subscription', () => {
      const plan = subscriptionManager.createPlan('Pro', 'Pro Plan', 9.99, 'USD', 'monthly', [], {});
      const sub = subscriptionManager.createSubscription(1, plan.id, 'credit_card');
      if (sub) {
        const suspended = subscriptionManager.suspendSubscription(sub.id);
        expect(suspended?.status).toBe('suspended');
      }
    });

    it('should resume subscription', () => {
      const plan = subscriptionManager.createPlan('Pro', 'Pro Plan', 9.99, 'USD', 'monthly', [], {});
      const sub = subscriptionManager.createSubscription(1, plan.id, 'credit_card');
      if (sub) {
        subscriptionManager.suspendSubscription(sub.id);
        const resumed = subscriptionManager.resumeSubscription(sub.id);
        expect(resumed?.status).toBe('active');
      }
    });

    it('should change plan', () => {
      const plan1 = subscriptionManager.createPlan('Pro', 'Pro Plan', 9.99, 'USD', 'monthly', [], {});
      const plan2 = subscriptionManager.createPlan('Enterprise', 'Enterprise Plan', 99.99, 'USD', 'yearly', [], {});
      const sub = subscriptionManager.createSubscription(1, plan1.id, 'credit_card');
      if (sub) {
        const changed = subscriptionManager.changePlan(sub.id, plan2.id);
        expect(changed?.planId).toBe(plan2.id);
      }
    });

    it('should set auto renew', () => {
      const plan = subscriptionManager.createPlan('Pro', 'Pro Plan', 9.99, 'USD', 'monthly', [], {});
      const sub = subscriptionManager.createSubscription(1, plan.id, 'credit_card', true);
      if (sub) {
        const updated = subscriptionManager.setAutoRenew(sub.id, false);
        expect(updated?.autoRenew).toBe(false);
      }
    });
  });

  // === サブスクリプション統計テスト ===
  describe('Subscription Statistics', () => {
    it('should get subscription stats', () => {
      const plan = subscriptionManager.createPlan('Pro', 'Pro Plan', 9.99, 'USD', 'monthly', [], {});
      subscriptionManager.createSubscription(1, plan.id, 'credit_card');
      const stats = subscriptionManager.getSubscriptionStats(1);
      expect(stats.activeSubscription).not.toBeNull();
      expect(stats.subscriptionCount).toBe(1);
    });
  });

  // === サブスクリプション更新テスト ===
  describe('Subscription Renewal', () => {
    it('should renew subscription', () => {
      const plan = subscriptionManager.createPlan('Pro', 'Pro Plan', 9.99, 'USD', 'monthly', [], {});
      const sub = subscriptionManager.createSubscription(1, plan.id, 'credit_card');
      if (sub) {
        const renewed = subscriptionManager.renewSubscription(sub.id);
        expect(renewed?.status).toBe('active');
      }
    });
  });

  // === ユーザーサブスクリプション取得テスト ===
  describe('Get User Subscriptions', () => {
    it('should get user subscriptions', () => {
      const plan = subscriptionManager.createPlan('Pro', 'Pro Plan', 9.99, 'USD', 'monthly', [], {});
      subscriptionManager.createSubscription(1, plan.id, 'credit_card');
      subscriptionManager.createSubscription(1, plan.id, 'paypal');
      const subs = subscriptionManager.getUserSubscriptions(1);
      expect(subs.length >= 1).toBe(true);
    });
  });

  // === プラン無効化テスト ===
  describe('Deactivate Plan', () => {
    it('should deactivate plan', () => {
      const plan = subscriptionManager.createPlan('Pro', 'Pro Plan', 9.99, 'USD', 'monthly', [], {});
      const result = subscriptionManager.deactivatePlan(plan.id);
      expect(result).toBe(true);
    });
  });

  // === 期限切れサブスクリプション確認テスト ===
  describe('Check Expired Subscriptions', () => {
    it('should check expired subscriptions', () => {
      const plan = subscriptionManager.createPlan('Pro', 'Pro Plan', 9.99, 'USD', 'monthly', [], {});
      const sub = subscriptionManager.createSubscription(1, plan.id, 'credit_card', false);
      if (sub) {
        sub.endDate = Date.now() - 1000;
        const expired = subscriptionManager.checkExpiredSubscriptions();
        expect(Array.isArray(expired)).toBe(true);
      }
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup specific user', () => {
      const plan = subscriptionManager.createPlan('Pro', 'Pro Plan', 9.99, 'USD', 'monthly', [], {});
      subscriptionManager.createSubscription(1, plan.id, 'credit_card');
      subscriptionManager.cleanup(1);
      const sub = subscriptionManager.getUserSubscription(1);
      expect(sub).toBeNull();
    });

    it('should cleanup all', () => {
      const plan = subscriptionManager.createPlan('Pro', 'Pro Plan', 9.99, 'USD', 'monthly', [], {});
      subscriptionManager.createSubscription(1, plan.id, 'credit_card');
      subscriptionManager.cleanup();
      const plans = subscriptionManager.getAllPlans();
      expect(plans.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = SubscriptionManager.getInstance();
      const instance2 = SubscriptionManager.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
