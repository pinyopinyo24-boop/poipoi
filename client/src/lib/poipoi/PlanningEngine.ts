/**
 * PlanningEngine - PoiPoi AI Core
 * 計画エンジン
 */

export interface Goal {
  id: string;
  name: string;
  description: string;
  priority: number;
  deadline?: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

export interface Plan {
  id: string;
  goalId: string;
  steps: string[];
  estimatedTime: number;
  createdAt: string;
}

class PlanningEngine {
  private goals: Map<string, Goal> = new Map();
  private plans: Map<string, Plan> = new Map();

  setGoal(name: string, description: string, priority: number = 5, deadline?: string): Goal {
    const goal: Goal = {
      id: `goal_${Date.now()}`,
      name,
      description,
      priority: Math.min(10, Math.max(1, priority)),
      deadline,
      status: "pending",
    };

    this.goals.set(goal.id, goal);
    console.log(`🎯 目標設定: ${name} (優先度: ${priority})`);

    return goal;
  }

  createPlan(goalId: string, steps: string[], estimatedTime: number): Plan {
    if (!this.goals.has(goalId)) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    const plan: Plan = {
      id: `plan_${Date.now()}`,
      goalId,
      steps,
      estimatedTime,
      createdAt: new Date().toISOString(),
    };

    this.plans.set(plan.id, plan);
    console.log(`📋 計画作成: ${steps.length} ステップ`);

    return plan;
  }

  startGoal(id: string): boolean {
    const goal = this.goals.get(id);
    if (!goal) return false;

    goal.status = "in_progress";
    return true;
  }

  completeGoal(id: string): boolean {
    const goal = this.goals.get(id);
    if (!goal) return false;

    goal.status = "completed";
    return true;
  }

  getGoals(status?: string): Goal[] {
    const goals = Array.from(this.goals.values());
    if (!status) return goals;
    return goals.filter((g) => g.status === status);
  }

  getPlan(id: string): Plan | undefined {
    return this.plans.get(id);
  }

  getStats() {
    const goals = Array.from(this.goals.values());
    return {
      totalGoals: goals.length,
      pending: goals.filter((g) => g.status === "pending").length,
      inProgress: goals.filter((g) => g.status === "in_progress").length,
      completed: goals.filter((g) => g.status === "completed").length,
      totalPlans: this.plans.size,
    };
  }
}

export default PlanningEngine;
