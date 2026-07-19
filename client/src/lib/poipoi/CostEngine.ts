/**
 * Cost Engine - PoiPoi AI Core
 * コスト管理エンジン
 */

export interface CostEntry {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

class CostEngine {
  private entries: CostEntry[] = [];
  private budget: number = 0;

  setBudget(amount: number): void {
    this.budget = amount;
    console.log(`💰 予算設定: ¥${amount}`);
  }

  addCost(category: string, amount: number, description: string): CostEntry {
    const entry: CostEntry = {
      id: `cost_${Date.now()}`,
      category,
      amount,
      description,
      date: new Date().toISOString(),
    };

    this.entries.push(entry);
    console.log(`💸 コスト追加: ${category} - ¥${amount}`);

    return entry;
  }

  getCosts(category?: string): CostEntry[] {
    if (!category) return [...this.entries];
    return this.entries.filter((e) => e.category === category);
  }

  getTotalCost(): number {
    return this.entries.reduce((sum, e) => sum + e.amount, 0);
  }

  getRemainingBudget(): number {
    return this.budget - this.getTotalCost();
  }

  getBudgetUsagePercent(): number {
    if (this.budget === 0) return 0;
    return (this.getTotalCost() / this.budget) * 100;
  }

  getStats() {
    const categories = Array.from(new Set(this.entries.map((e) => e.category)));
    const costByCategory: Record<string, number> = {};

    categories.forEach((cat) => {
      costByCategory[cat] = this.getCosts(cat).reduce((sum, e) => sum + e.amount, 0);
    });

    return {
      totalCost: this.getTotalCost(),
      budget: this.budget,
      remaining: this.getRemainingBudget(),
      usagePercent: this.getBudgetUsagePercent().toFixed(2),
      costByCategory,
    };
  }
}

export default CostEngine;
