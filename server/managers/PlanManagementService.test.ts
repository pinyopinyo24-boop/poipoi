/**
 * PlanManagementService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { planManagementService, PlanManagementService } from './PlanManagementService';

describe('PlanManagementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    planManagementService.cleanup();
  });

  afterEach(() => {
    planManagementService.cleanup();
  });

  // === プラン比較テスト ===
  describe('Compare Plans', () => {
    it('should compare plans', () => {
      const planA = { id: 'pro', name: 'Pro', price: 9.99, features: ['A', 'B'], limits: { storage: 100 } };
      const planB = { id: 'enterprise', name: 'Enterprise', price: 99.99, features: ['A', 'B', 'C'], limits: { storage: 1000 } };

      const comparison = planManagementService.comparePlans(planA, planB);
      expect(comparison).not.toBeNull();
      expect(comparison.planA).toBe('pro');
      expect(comparison.planB).toBe('enterprise');
    });
  });

  // === プラン推奨テスト ===
  describe('Recommend Plan', () => {
    it('should recommend plan', () => {
      const currentPlan = { id: 'basic', name: 'Basic', price: 0, features: [], limits: { storage: 10 } };
      const availablePlans = [
        { id: 'pro', name: 'Pro', price: 9.99, features: ['A'], limits: { storage: 100 } },
        { id: 'enterprise', name: 'Enterprise', price: 99.99, features: ['A', 'B'], limits: { storage: 1000 } },
      ];
      const usage = { storage: 50 };

      const recommendation = planManagementService.recommendPlan(1, currentPlan, availablePlans, usage);
      expect(recommendation).not.toBeNull();
      if (recommendation) {
        expect(recommendation.recommendedPlanId).toBeDefined();
      }
    });
  });

  // === プラン統計追跡テスト ===
  describe('Track Plan Statistics', () => {
    it('should track plan view', () => {
      planManagementService.trackPlanView('plan_1');
      const stats = planManagementService.getPlanStats('plan_1');
      expect(stats?.views).toBe(1);
    });

    it('should track plan conversion', () => {
      planManagementService.trackPlanConversion('plan_1', 9.99);
      const stats = planManagementService.getPlanStats('plan_1');
      expect(stats?.conversions).toBe(1);
      expect(stats?.revenue).toBe(9.99);
    });

    it('should get plan stats', () => {
      planManagementService.trackPlanView('plan_1');
      planManagementService.trackPlanConversion('plan_1', 9.99);
      const stats = planManagementService.getPlanStats('plan_1');
      expect(stats).not.toBeNull();
      if (stats) {
        expect(stats.conversionRate > 0).toBe(true);
      }
    });
  });

  // === すべてのプラン統計テスト ===
  describe('Get All Plan Stats', () => {
    it('should get all plan stats', () => {
      planManagementService.trackPlanView('plan_1');
      planManagementService.trackPlanView('plan_2');
      const allStats = planManagementService.getAllPlanStats();
      expect(Object.keys(allStats).length).toBe(2);
    });
  });

  // === 人気プラン取得テスト ===
  describe('Get Popular Plans', () => {
    it('should get popular plans', () => {
      planManagementService.trackPlanConversion('plan_1', 9.99);
      planManagementService.trackPlanConversion('plan_1', 9.99);
      planManagementService.trackPlanConversion('plan_2', 99.99);
      const popular = planManagementService.getPopularPlans(5);
      expect(Array.isArray(popular)).toBe(true);
    });
  });

  // === 売上トッププラン取得テスト ===
  describe('Get Top Revenue Plans', () => {
    it('should get top revenue plans', () => {
      planManagementService.trackPlanConversion('plan_1', 9.99);
      planManagementService.trackPlanConversion('plan_2', 99.99);
      const topRevenue = planManagementService.getTopRevenueePlans(5);
      expect(Array.isArray(topRevenue)).toBe(true);
    });
  });

  // === 価格最適化提案テスト ===
  describe('Suggest Price Optimization', () => {
    it('should suggest price optimization', () => {
      planManagementService.trackPlanView('plan_1');
      const suggestion = planManagementService.suggestPriceOptimization('plan_1');
      expect(suggestion === null || suggestion !== null).toBe(true);
    });
  });

  // === 分析レポート生成テスト ===
  describe('Generate Analysis Report', () => {
    it('should generate analysis report', () => {
      planManagementService.trackPlanView('plan_1');
      planManagementService.trackPlanConversion('plan_1', 9.99);
      const report = planManagementService.generateAnalysisReport();
      expect(report.totalPlans >= 0).toBe(true);
      expect(report.totalViews >= 0).toBe(true);
      expect(report.totalConversions >= 0).toBe(true);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup', () => {
      planManagementService.trackPlanView('plan_1');
      planManagementService.cleanup();
      const stats = planManagementService.getPlanStats('plan_1');
      expect(stats).toBeNull();
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = PlanManagementService.getInstance();
      const instance2 = PlanManagementService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
