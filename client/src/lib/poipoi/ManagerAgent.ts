/**
 * ManagerAgent - PoiPoi Agent System
 * 管理エージェント
 */

export interface Task {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  priority: number;
  assignedTo?: string;
  createdAt: string;
  completedAt?: string;
}

class ManagerAgent {
  private tasks: Map<string, Task> = new Map();
  private agents: Map<string, any> = new Map();

  createTask(name: string, priority: number = 5): Task {
    const task: Task = {
      id: `task_${Date.now()}`,
      name,
      status: "pending",
      priority: Math.min(10, Math.max(1, priority)),
      createdAt: new Date().toISOString(),
    };

    this.tasks.set(task.id, task);
    console.log(`📋 タスク作成: ${name} (優先度: ${priority})`);

    return task;
  }

  assignTask(taskId: string, agentName: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.assignedTo = agentName;
    task.status = "running";
    console.log(`👤 タスク割り当て: ${task.name} → ${agentName}`);

    return true;
  }

  completeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = "completed";
    task.completedAt = new Date().toISOString();
    console.log(`✅ タスク完了: ${task.name}`);

    return true;
  }

  failTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = "failed";
    console.log(`❌ タスク失敗: ${task.name}`);

    return true;
  }

  getTasks(status?: string): Task[] {
    const tasks = Array.from(this.tasks.values());
    if (!status) return tasks;
    return tasks.filter((t) => t.status === status);
  }

  registerAgent(name: string, agent: any): void {
    this.agents.set(name, agent);
    console.log(`🤖 エージェント登録: ${name}`);
  }

  getAgent(name: string): any {
    return this.agents.get(name);
  }

  getStats() {
    const tasks = Array.from(this.tasks.values());
    return {
      totalTasks: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      running: tasks.filter((t) => t.status === "running").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      failed: tasks.filter((t) => t.status === "failed").length,
      totalAgents: this.agents.size,
    };
  }
}

export default ManagerAgent;
