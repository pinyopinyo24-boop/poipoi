/**
 * Automation Engine - PoiPoi AI Core
 * 自動化エンジン
 */

export interface AutomationTask {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  createdAt: string;
}

class AutomationEngine {
  private tasks: Map<string, AutomationTask> = new Map();
  private executionLog: { taskId: string; timestamp: string; result: string }[] = [];

  createTask(name: string, trigger: string, action: string): AutomationTask {
    const task: AutomationTask = {
      id: `task_${Date.now()}`,
      name,
      trigger,
      action,
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    this.tasks.set(task.id, task);
    console.log(`⚙️ 自動化タスク作成: ${name}`);

    return task;
  }

  getTask(id: string): AutomationTask | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): AutomationTask[] {
    return Array.from(this.tasks.values());
  }

  enableTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    task.enabled = true;
    return true;
  }

  disableTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    task.enabled = false;
    return true;
  }

  async executeTask(id: string): Promise<string> {
    const task = this.tasks.get(id);

    if (!task) {
      throw new Error(`タスクが見つかりません: ${id}`);
    }

    if (!task.enabled) {
      throw new Error(`タスクが無効化されています: ${task.name}`);
    }

    console.log(`🚀 タスク実行: ${task.name}`);

    const result = `Task executed: ${task.action}`;
    this.executionLog.push({
      taskId: id,
      timestamp: new Date().toISOString(),
      result,
    });

    return result;
  }

  getExecutionLog() {
    return [...this.executionLog];
  }

  getStats() {
    return {
      totalTasks: this.tasks.size,
      enabledTasks: Array.from(this.tasks.values()).filter((t) => t.enabled).length,
      totalExecutions: this.executionLog.length,
    };
  }
}

export default AutomationEngine;
