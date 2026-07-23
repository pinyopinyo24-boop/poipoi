/**
 * PlanManagementService - プラン管理
 * 
 * 機能:
 * - プラン作成・更新・削除
 * - プラン比較
 * - 推奨プラン提案
 * - プラン統計
 */

export interface PlanComparison {
  planA: string;
  planB: string;
  differences: Record<string, any>;
  recommendation: string;
}

export interface PlanRecommendation {
  recommendedPlanId: string;
  reason: string;
  savingsPotential: number;
  features: string[];
}

export class PlanManagementService {
  private static instance: PlanManagementService;
  private planStats: Map<string, { views: number; conversions: number; revenue: number }> =
    new Map();

  private constructor() {}

  static getInstance(): PlanManagementService {
    if (!PlanManagementService.instance) {
      PlanManagementService.instance = new PlanManagementService();
    }
    return PlanManagementService.instance;
  }

  /**
   * プラン比較
   */
  comparePlans(planA: any, planB: any): PlanComparison {
    const differences: Record<string, any> = {};

    // 価格比較
    if (planA.price !== planB.price) {
      differences.price = {
        planA: planA.price,
        planB: planB.price,
        difference: planB.price - planA.price,
      };
    }

    // 機能比較
    if (JSON.stringify(planA.features) !== JSON.stringify(planB.features)) {
      differences.features = {
        planA: planA.features,
        planB: planB.features,
      };
    }

    // 制限比較
    if (JSON.stringify(planA.limits) !== JSON.stringify(planB.limits)) {
      differences.limits = {
        planA: planA.limits,
        planB: planB.limits,
      };
    }

    let recommendation = '';
    if (planB.price < planA.price && planB.features.length >= planA.features.length) {
      recommendation = `${planB.name}がより良い値です`;
    } else if (planA.price < planB.price) {
      recommendation = `${planA.name}の方が安価です`;
    } else {
      recommendation = 'ニーズに応じて選択してください';
    }

    return {
      planA: planA.id,
      planB: planB.id,
      differences,
      recommendation,
    };
  }

  /**
   * プラン推奨
   */
  recommendPlan(
    userId: number,
    currentPlan: any,
    availablePlans: any[],
    usage: Record<string, number>
  ): PlanRecommendation | null {
    try {
      // ユーザーの使用パターンに基づいて推奨プランを決定
      let recommendedPlan = currentPlan;
      let savingsPotential = 0;

      for (const plan of availablePlans) {
        // 使用量がプランの制限内か確認
        let fits = true;
        for (const [key, value] of Object.entries(usage)) {
          if (plan.limits[key] && (value as number) > plan.limits[key]) {
            fits = false;
            break;
          }
        }

        if (fits && plan.price < recommendedPlan.price) {
          savingsPotential = recommendedPlan.price - plan.price;
          recommendedPlan = plan;
        }
      }

      return {
        recommendedPlanId: recommendedPlan.id,
        reason: `${recommendedPlan.name}はあなたの使用パターンに最適です`,
        savingsPotential,
        features: recommendedPlan.features,
      };
    } catch (error) {
      console.error('Failed to recommend plan:', error);
      return null;
    }
  }

  /**
   * プラン統計追跡
   */
  trackPlanView(planId: string): void {
    if (!this.planStats.has(planId)) {
      this.planStats.set(planId, { views: 0, conversions: 0, revenue: 0 });
    }

    const stats = this.planStats.get(planId);
    if (stats) {
      stats.views++;
    }
  }

  /**
   * プラン変換追跡
   */
  trackPlanConversion(planId: string, revenue: number): void {
    if (!this.planStats.has(planId)) {
      this.planStats.set(planId, { views: 0, conversions: 0, revenue: 0 });
    }

    const stats = this.planStats.get(planId);
    if (stats) {
      stats.conversions++;
      stats.revenue += revenue;
    }
  }

  /**
   * プラン統計取得
   */
  getPlanStats(planId: string): {
    views: number;
    conversions: number;
    revenue: number;
    conversionRate: number;
  } | null {
    const stats = this.planStats.get(planId);
    if (!stats) return null;

    return {
      views: stats.views,
      conversions: stats.conversions,
      revenue: stats.revenue,
      conversionRate: stats.views > 0 ? (stats.conversions / stats.views) * 100 : 0,
    };
  }

  /**
   * すべてのプラン統計取得
   */
  getAllPlanStats(): Record<string, any> {
    const result: Record<string, any> = {};

    this.planStats.forEach((stats, planId) => {
      result[planId] = {
        views: stats.views,
        conversions: stats.conversions,
        revenue: stats.revenue,
        conversionRate: stats.views > 0 ? (stats.conversions / stats.views) * 100 : 0,
      };
    });

    return result;
  }

  /**
   * 人気プラン取得
   */
  getPopularPlans(limit: number = 5): Array<{ planId: string; conversions: number }> {
    const sorted = Array.from(this.planStats.entries())
      .map(([planId, stats]) => ({
        planId,
        conversions: stats.conversions,
      }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, limit);

    return sorted;
  }

  /**
   * 売上トッププラン取得
   */
  getTopRevenueePlans(limit: number = 5): Array<{ planId: string; revenue: number }> {
    const sorted = Array.from(this.planStats.entries())
      .map(([planId, stats]) => ({
        planId,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    return sorted;
  }

  /**
   * プラン価格最適化提案
   */
  suggestPriceOptimization(planId: string): {
    currentPrice: number;
    suggestedPrice: number;
    reason: string;
  } | null {
    const stats = this.planStats.get(planId);
    if (!stats) return null;

    // 変換率が低い場合は価格を下げることを提案
    const conversionRate = stats.views > 0 ? (stats.conversions / stats.views) * 100 : 0;

    if (conversionRate < 2) {
      return {
        currentPrice: 0,
        suggestedPrice: 0,
        reason: '変換率が低いため、価格の引き下げを検討してください',
      };
    }

    if (conversionRate > 10) {
      return {
        currentPrice: 0,
        suggestedPrice: 0,
        reason: '変換率が高いため、価格の引き上げを検討してください',
      };
    }

    return null;
  }

  /**
   * プラン分析レポート
   */
  generateAnalysisReport(): {
    totalPlans: number;
    totalViews: number;
    totalConversions: number;
    totalRevenue: number;
    averageConversionRate: number;
  } {
    let totalViews = 0;
    let totalConversions = 0;
    let totalRevenue = 0;

    this.planStats.forEach(stats => {
      totalViews += stats.views;
      totalConversions += stats.conversions;
      totalRevenue += stats.revenue;
    });

    return {
      totalPlans: this.planStats.size,
      totalViews,
      totalConversions,
      totalRevenue,
      averageConversionRate: totalViews > 0 ? (totalConversions / totalViews) * 100 : 0,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.planStats.clear();
  }
}

export const planManagementService = PlanManagementService.getInstance();
export default planManagementService;
