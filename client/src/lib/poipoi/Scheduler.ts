/**
 * Scheduler - PoiPoi System Core
 * スケジューラー
 */

export interface ScheduledTask {
  id: string;
  name: string;
  interval: number; // milliseconds
  callback: () => void;
  running: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

class Scheduler {
  private tasks: Map<string, ScheduledTask & { timerId?: NodeJS.Timeout }> = new Map();

  schedule(name: string, interval: number, callback: () => void): ScheduledTask {
    const task: ScheduledTask = {
      id: `task_${Date.now()}`,
      name,
      interval,
      callback,
      running: false,
    };

    this.tasks.set(task.id, task);
    console.log(`📅 スケジュール作成: ${name} (${interval}ms)`);

    return task;
  }

  start(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task || task.running) return false;

    task.running = true;
    task.lastRun = new Date();
    task.nextRun = new Date(Date.now() + task.interval);

    const timerId = setInterval(() => {
      task.callback();
      task.lastRun = new Date();
      task.nextRun = new Date(Date.now() + task.interval);
    }, task.interval);

    (task as any).timerId = timerId;
    console.log(`▶️ スケジュール開始: ${task.name}`);

    return true;
  }

  stop(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task || !task.running) return false;

    if ((task as any).timerId) {
      clearInterval((task as any).timerId);
      (task as any).timerId = undefined;
    }

    task.running = false;
    console.log(`⏹️ スケジュール停止: ${task.name}`);

    return true;
  }

  getTask(id: string): ScheduledTask | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  getStats() {
    const all = this.getAllTasks();
    return {
      total: all.length,
      running: all.filter((t) => t.running).length,
      stopped: all.filter((t) => !t.running).length,
    };
  }
}

export default Scheduler;
