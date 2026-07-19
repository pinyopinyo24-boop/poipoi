/**
 * SubscriptionRepository Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { subscriptionRepository, SubscriptionRepository } from './SubscriptionRepository';

describe('SubscriptionRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionRepository.cleanup();
  });

  afterEach(() => {
    subscriptionRepository.cleanup();
  });

  // === サブスクリプション保存テスト ===
  describe('Save Subscription', () => {
    it('should save subscription', () => {
      const subscription = {
        id: 'sub_123',
        userId: 1,
        planId: 'plan_pro',
        status: 'active',
        startDate: Date.now(),
        createdAt: Date.now(),
      };
      subscriptionRepository.save(subscription);
      const retrieved = subscriptionRepository.findById('sub_123');
      expect(retrieved).not.toBeNull();
    });

    it('should find by user id', () => {
      const subscription = {
        id: 'sub_123',
        userId: 1,
        planId: 'plan_pro',
        status: 'active',
        startDate: Date.now(),
        createdAt: Date.now(),
      };
      subscriptionRepository.save(subscription);
      const subs = subscriptionRepository.findByUserId(1);
      expect(subs.length).toBe(1);
    });

    it('should find by status', () => {
      const subscription = {
        id: 'sub_123',
        userId: 1,
        planId: 'plan_pro',
        status: 'active',
        startDate: Date.now(),
        createdAt: Date.now(),
      };
      subscriptionRepository.save(subscription);
      const subs = subscriptionRepository.findByStatus('active');
      expect(subs.length).toBe(1);
    });

    it('should find by plan id', () => {
      const subscription = {
        id: 'sub_123',
        userId: 1,
        planId: 'plan_pro',
        status: 'active',
        startDate: Date.now(),
        createdAt: Date.now(),
      };
      subscriptionRepository.save(subscription);
      const subs = subscriptionRepository.findByPlanId('plan_pro');
      expect(subs.length).toBe(1);
    });
  });

  // === クエリテスト ===
  describe('Query', () => {
    it('should query by user id', () => {
      const subscription = {
        id: 'sub_123',
        userId: 1,
        planId: 'plan_pro',
        status: 'active',
        startDate: Date.now(),
        createdAt: Date.now(),
      };
      subscriptionRepository.save(subscription);
      const results = subscriptionRepository.query({ userId: 1 });
      expect(results.length).toBe(1);
    });

    it('should query by status', () => {
      const subscription = {
        id: 'sub_123',
        userId: 1,
        planId: 'plan_pro',
        status: 'active',
        startDate: Date.now(),
        createdAt: Date.now(),
      };
      subscriptionRepository.save(subscription);
      const results = subscriptionRepository.query({ status: 'active' });
      expect(results.length).toBe(1);
    });

    it('should query with pagination', () => {
      for (let i = 0; i < 5; i++) {
        subscriptionRepository.save({
          id: `sub_${i}`,
          userId: 1,
          planId: 'plan_pro',
          status: 'active',
          startDate: Date.now(),
          createdAt: Date.now(),
        });
      }
      const results = subscriptionRepository.query({ limit: 2, offset: 0 });
      expect(results.length).toBe(2);
    });
  });

  // === サブスクリプション削除テスト ===
  describe('Delete Subscription', () => {
    it('should delete subscription', () => {
      const subscription = {
        id: 'sub_123',
        userId: 1,
        planId: 'plan_pro',
        status: 'active',
        startDate: Date.now(),
        createdAt: Date.now(),
      };
      subscriptionRepository.save(subscription);
      const result = subscriptionRepository.delete('sub_123');
      expect(result).toBe(true);
    });
  });

  // === 統計情報取得テスト ===
  describe('Get Stats', () => {
    it('should get stats', () => {
      subscriptionRepository.save({
        id: 'sub_123',
        userId: 1,
        planId: 'plan_pro',
        status: 'active',
        startDate: Date.now(),
        createdAt: Date.now(),
      });
      subscriptionRepository.save({
        id: 'sub_456',
        userId: 2,
        planId: 'plan_basic',
        status: 'inactive',
        startDate: Date.now(),
        createdAt: Date.now(),
      });
      const stats = subscriptionRepository.getStats();
      expect(stats.totalSubscriptions).toBe(2);
      expect(stats.activeSubscriptions).toBe(1);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup', () => {
      subscriptionRepository.save({
        id: 'sub_123',
        userId: 1,
        planId: 'plan_pro',
        status: 'active',
        startDate: Date.now(),
        createdAt: Date.now(),
      });
      subscriptionRepository.cleanup();
      const retrieved = subscriptionRepository.findById('sub_123');
      expect(retrieved).toBeNull();
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = SubscriptionRepository.getInstance();
      const instance2 = SubscriptionRepository.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
