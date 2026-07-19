/**
 * Collaborative Development for PoiPoi
 * PoiPoi の共同開発サポート
 */

export interface DevelopmentTask {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "review" | "done";
  assignee?: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
}

export interface CodeReview {
  id: string;
  taskId: string;
  reviewer: string;
  comments: string[];
  approved: boolean;
  createdAt: string;
}

class CollaborativeDevelopment {
  private tasks: Map<string, DevelopmentTask> = new Map();
  private reviews: Map<string, CodeReview> = new Map();
  private collaborators: Set<string> = new Set();

  createTask(
    title: string,
    description: string,
    priority: "low" | "medium" | "high" = "medium"
  ): DevelopmentTask {
    const task: DevelopmentTask = {
      id: `task_${Date.now()}`,
      title,
      description,
      status: "todo",
      priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.tasks.set(task.id, task);
    console.log(`📋 タスク作成: ${title}`);

    return task;
  }

  assignTask(taskId: string, assignee: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.assignee = assignee;
    task.updatedAt = new Date().toISOString();
    this.collaborators.add(assignee);

    console.log(`👤 タスク割り当て: ${task.title} → ${assignee}`);

    return true;
  }

  updateTaskStatus(
    taskId: string,
    status: "todo" | "in-progress" | "review" | "done"
  ): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = status;
    task.updatedAt = new Date().toISOString();

    console.log(`🔄 ステータス更新: ${task.title} → ${status}`);

    return true;
  }

  requestCodeReview(
    taskId: string,
    reviewer: string,
    comments: string[] = []
  ): CodeReview {
    const review: CodeReview = {
      id: `review_${Date.now()}`,
      taskId,
      reviewer,
      comments,
      approved: false,
      createdAt: new Date().toISOString(),
    };

    this.reviews.set(review.id, review);
    this.collaborators.add(reviewer);

    console.log(`🔍 コードレビュー要求: ${reviewer}`);

    return review;
  }

  approveReview(reviewId: string): boolean {
    const review = this.reviews.get(reviewId);
    if (!review) return false;

    review.approved = true;
    const task = this.tasks.get(review.taskId);
    if (task) {
      task.status = "done";
    }

    console.log(`✅ レビュー承認`);

    return true;
  }

  getTasks(status?: string): DevelopmentTask[] {
    const tasks = Array.from(this.tasks.values());
    if (!status) return tasks;
    return tasks.filter((t) => t.status === status);
  }

  getCollaborators(): string[] {
    return Array.from(this.collaborators);
  }

  getStats() {
    const tasks = Array.from(this.tasks.values());
    return {
      totalTasks: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      inProgress: tasks.filter((t) => t.status === "in-progress").length,
      review: tasks.filter((t) => t.status === "review").length,
      done: tasks.filter((t) => t.status === "done").length,
      collaborators: this.collaborators.size,
      reviews: this.reviews.size,
    };
  }
}

export default CollaborativeDevelopment;
