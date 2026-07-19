/**
 * Production Engine - PoiPoi AI Core
 * 生産管理エンジン
 */

export interface ProductionTask {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  progress: number;
  createdAt: string;
  completedAt?: string;
}

class ProductionEngine {
  private tasks: Map<string, ProductionTask> = new Map();
  private metrics = {
    totalProduced: 0,
    totalFailed: 0,
    totalTime: 0,
  };

  createTask(name: string): ProductionTask {
    const task: ProductionTask = {
      id: `prod_${Date.now()}`,
      name,
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    this.tasks.set(task.id, task);
    console.log(`🏭 生産タスク作成: ${name}`);

    return task;
  }

  startTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    task.status = "in_progress";
    task.progress = 0;
    return true;
  }

  updateProgress(id: string, progress: number): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    task.progress = Math.min(100, Math.max(0, progress));
    return true;
  }

  completeTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    task.status = "completed";
    task.progress = 100;
    task.completedAt = new Date().toISOString();
    this.metrics.totalProduced++;

    return true;
  }

  failTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    task.status = "failed";
    task.completedAt = new Date().toISOString();
    this.metrics.totalFailed++;

    return true;
  }

  getTask(id: string): ProductionTask | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): ProductionTask[] {
    return Array.from(this.tasks.values());
  }

  getMetrics() {
    return { ...this.metrics };
  }

  getStats() {
    const all = this.getAllTasks();
    return {
      total: all.length,
      pending: all.filter((t) => t.status === "pending").length,
      inProgress: all.filter((t) => t.status === "in_progress").length,
      completed: all.filter((t) => t.status === "completed").length,
      failed: all.filter((t) => t.status === "failed").length,
    };
  }
}

export default ProductionEngine;
