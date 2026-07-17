/**
 * WorkflowAutomationAIManager - AI業務フロー自動化管理
 * 複数ステップの業務フロー自動作成・実行、条件分岐、Rollback、Retry
 */

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type ConditionType = 'if' | 'if_else' | 'switch' | 'loop';

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  action: string;
  parameters: Record<string, any>;
  status: StepStatus;
  retryCount: number;
  maxRetries: number;
  rollbackAction?: string;
  rollbackParameters?: Record<string, any>;
  timestamp: number;
}

export interface WorkflowCondition {
  id: string;
  type: ConditionType;
  condition: string;
  trueSteps: string[]; // Step IDs
  falseSteps?: string[]; // Step IDs
  timestamp: number;
}

export interface Workflow {
  id: string;
  userId: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
  status: WorkflowStatus;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  executionHistory: ExecutionRecord[];
}

export interface ExecutionRecord {
  stepId: string;
  status: StepStatus;
  startTime: number;
  endTime?: number;
  result?: any;
  error?: string;
  retryAttempt: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
  createdAt: number;
  usageCount: number;
}

export class WorkflowAutomationAIManager {
  private workflows: Map<string, Workflow> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();
  private executionHistory: Map<string, ExecutionRecord[]> = new Map();
  private workflowQueue: string[] = [];

  /**
   * AIが依頼からワークフローを自動生成
   */
  async generateWorkflowFromRequest(
    userId: string,
    request: string
  ): Promise<Workflow | null> {
    // リクエストを解析してワークフローを生成
    const steps = this.parseRequestToSteps(request);
    if (steps.length === 0) {
      return null;
    }

    const workflow: Workflow = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name: this.extractWorkflowName(request),
      description: request,
      steps,
      conditions: [],
      status: 'pending',
      priority: this.determinePriority(request),
      createdAt: Date.now(),
      executionHistory: [],
    };

    this.workflows.set(workflow.id, workflow);
    this.workflowQueue.push(workflow.id);

    return workflow;
  }

  /**
   * ワークフローを実行
   */
  async executeWorkflow(workflowId: string): Promise<boolean> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return false;
    }

    workflow.status = 'running';
    workflow.startedAt = Date.now();

    try {
      for (const step of workflow.steps) {
        const executed = await this.executeStep(workflow, step);
        if (!executed) {
          workflow.status = 'failed';
          return false;
        }
      }

      workflow.status = 'completed';
      workflow.completedAt = Date.now();
      return true;
    } catch (error) {
      workflow.status = 'failed';
      return false;
    }
  }

  /**
   * ステップを実行
   */
  private async executeStep(workflow: Workflow, step: WorkflowStep): Promise<boolean> {
    step.status = 'running';
    const execution: ExecutionRecord = {
      stepId: step.id,
      status: 'running',
      startTime: Date.now(),
      retryAttempt: 0,
    };

    try {
      // ステップアクションを実行
      const result = await this.performAction(step.action, step.parameters);

      execution.status = 'completed';
      execution.result = result;
      step.status = 'completed';
      execution.endTime = Date.now();

      // 実行履歴を記録
      this.recordExecution(workflow.id, execution);

      return true;
    } catch (error) {
      // リトライ処理
      if (step.retryCount < step.maxRetries) {
        step.retryCount++;
        execution.retryAttempt = step.retryCount;
        await new Promise((resolve) => setTimeout(resolve, 1000 * step.retryCount)); // バックオフ
        return this.executeStep(workflow, step);
      }

      // Rollback処理
      if (step.rollbackAction) {
        await this.performAction(step.rollbackAction, step.rollbackParameters || {});
      }

      execution.status = 'failed';
      execution.error = String(error);
      step.status = 'failed';
      execution.endTime = Date.now();

      this.recordExecution(workflow.id, execution);

      return false;
    }
  }

  /**
   * アクションを実行
   */
  private async performAction(action: string, parameters: Record<string, any>): Promise<any> {
    // アクション実行のシミュレーション
    switch (action) {
      case 'data_fetch':
        return { data: 'fetched', timestamp: Date.now() };
      case 'data_process':
        return { processed: true, count: parameters.count || 0 };
      case 'data_save':
        return { saved: true, id: `saved-${Date.now()}` };
      case 'notification':
        return { notified: true, message: parameters.message };
      case 'approval_request':
        return { requested: true, approvalId: `appr-${Date.now()}` };
      case 'report_generate':
        return { generated: true, reportId: `rep-${Date.now()}` };
      default:
        return { executed: true, action };
    }
  }

  /**
   * 条件分岐を処理
   */
  async evaluateCondition(workflow: Workflow, condition: WorkflowCondition): Promise<string[]> {
    // 条件を評価して実行するステップIDを返す
    const result = this.evaluateConditionExpression(condition.condition);

    if (result) {
      return condition.trueSteps;
    } else {
      return condition.falseSteps || [];
    }
  }

  /**
   * 条件式を評価
   */
  private evaluateConditionExpression(expression: string): boolean {
    // 簡単な条件評価（実装例）
    if (expression.includes('true')) {
      return true;
    }
    if (expression.includes('false')) {
      return false;
    }
    return Math.random() > 0.5;
  }

  /**
   * ワークフローをロールバック
   */
  async rollbackWorkflow(workflowId: string): Promise<boolean> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return false;
    }

    // 実行済みステップを逆順でロールバック
    for (let i = workflow.steps.length - 1; i >= 0; i--) {
      const step = workflow.steps[i];
      if (step.status === 'completed' && step.rollbackAction) {
        try {
          await this.performAction(step.rollbackAction, step.rollbackParameters || {});
        } catch (error) {
          // ロールバック失敗時もログに記録
          console.error(`Rollback failed for step ${step.id}:`, error);
        }
      }
    }

    workflow.status = 'rolled_back';
    return true;
  }

  /**
   * ワークフローテンプレートを作成
   */
  async createTemplate(
    name: string,
    description: string,
    category: string,
    steps: WorkflowStep[]
  ): Promise<WorkflowTemplate> {
    const template: WorkflowTemplate = {
      id: `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      category,
      steps,
      conditions: [],
      createdAt: Date.now(),
      usageCount: 0,
    };

    this.templates.set(template.id, template);
    return template;
  }

  /**
   * テンプレートからワークフローを作成
   */
  async createWorkflowFromTemplate(
    userId: string,
    templateId: string,
    customParameters?: Record<string, any>
  ): Promise<Workflow | null> {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    const workflow: Workflow = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name: template.name,
      description: template.description,
      steps: JSON.parse(JSON.stringify(template.steps)), // Deep copy
      conditions: template.conditions,
      status: 'pending',
      priority: 'medium',
      createdAt: Date.now(),
      executionHistory: [],
    };

    // カスタムパラメータを適用
    if (customParameters) {
      workflow.steps.forEach((step) => {
        step.parameters = { ...step.parameters, ...customParameters };
      });
    }

    this.workflows.set(workflow.id, workflow);
    template.usageCount++;

    return workflow;
  }

  /**
   * ワークフローを取得
   */
  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    return this.workflows.get(workflowId) || null;
  }

  /**
   * ユーザーのワークフロー一覧を取得
   */
  async getUserWorkflows(userId: string): Promise<Workflow[]> {
    return Array.from(this.workflows.values()).filter((wf) => wf.userId === userId);
  }

  /**
   * テンプレート一覧を取得
   */
  async getTemplates(category?: string): Promise<WorkflowTemplate[]> {
    const templates = Array.from(this.templates.values());
    if (category) {
      return templates.filter((t) => t.category === category);
    }
    return templates;
  }

  /**
   * 実行履歴を記録
   */
  private recordExecution(workflowId: string, record: ExecutionRecord): void {
    const history = this.executionHistory.get(workflowId) || [];
    history.push(record);
    this.executionHistory.set(workflowId, history.slice(-100)); // 最新100個を保持
  }

  /**
   * 実行履歴を取得
   */
  async getExecutionHistory(workflowId: string): Promise<ExecutionRecord[]> {
    return this.executionHistory.get(workflowId) || [];
  }

  /**
   * リクエストをステップに変換
   */
  private parseRequestToSteps(request: string): WorkflowStep[] {
    const steps: WorkflowStep[] = [];

    // リクエストから自動的にステップを生成
    if (request.includes('データ')) {
      steps.push({
        id: `step-${Date.now()}-1`,
        name: 'データ取得',
        description: 'データを取得します',
        action: 'data_fetch',
        parameters: {},
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        timestamp: Date.now(),
      });
    }

    if (request.includes('処理') || request.includes('分析')) {
      steps.push({
        id: `step-${Date.now()}-2`,
        name: 'データ処理',
        description: 'データを処理します',
        action: 'data_process',
        parameters: { count: 100 },
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        timestamp: Date.now(),
      });
    }

    if (request.includes('保存') || request.includes('記録')) {
      steps.push({
        id: `step-${Date.now()}-3`,
        name: 'データ保存',
        description: 'データを保存します',
        action: 'data_save',
        parameters: {},
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        timestamp: Date.now(),
      });
    }

    if (request.includes('通知') || request.includes('報告')) {
      steps.push({
        id: `step-${Date.now()}-4`,
        name: '通知送信',
        description: '結果を通知します',
        action: 'notification',
        parameters: { message: 'ワークフロー完了' },
        status: 'pending',
        retryCount: 0,
        maxRetries: 2,
        timestamp: Date.now(),
      });
    }

    // デフォルトステップ
    if (steps.length === 0) {
      steps.push({
        id: `step-${Date.now()}-default`,
        name: 'デフォルト処理',
        description: 'リクエストを処理します',
        action: 'default',
        parameters: {},
        status: 'pending',
        retryCount: 0,
        maxRetries: 1,
        timestamp: Date.now(),
      });
    }

    return steps;
  }

  /**
   * ワークフロー名を抽出
   */
  private extractWorkflowName(request: string): string {
    // リクエストから名前を抽出
    const words = request.split(' ').slice(0, 3);
    return words.join(' ') || 'ワークフロー';
  }

  /**
   * 優先度を判定
   */
  private determinePriority(
    request: string
  ): 'low' | 'medium' | 'high' {
    if (request.includes('緊急') || request.includes('重要')) {
      return 'high';
    }
    if (request.includes('通常')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * ワークフロー統計を取得
   */
  getStatistics(): Record<string, any> {
    const workflows = Array.from(this.workflows.values());
    const completed = workflows.filter((w) => w.status === 'completed').length;
    const failed = workflows.filter((w) => w.status === 'failed').length;
    const running = workflows.filter((w) => w.status === 'running').length;

    return {
      totalWorkflows: workflows.length,
      completedWorkflows: completed,
      failedWorkflows: failed,
      runningWorkflows: running,
      successRate: workflows.length > 0 ? (completed / workflows.length) * 100 : 0,
      totalTemplates: this.templates.size,
      queueLength: this.workflowQueue.length,
    };
  }

  /**
   * 複数ワークフローを並列実行
   */
  async executeWorkflowsInParallel(workflowIds: string[]): Promise<boolean[]> {
    const promises = workflowIds.map((id) => this.executeWorkflow(id));
    return Promise.all(promises);
  }

  /**
   * ワークフロー実行キューを処理
   */
  async processWorkflowQueue(): Promise<void> {
    while (this.workflowQueue.length > 0) {
      const workflowId = this.workflowQueue.shift();
      if (workflowId) {
        await this.executeWorkflow(workflowId);
      }
    }
  }

  /**
   * ワークフローを削除
   */
  async deleteWorkflow(workflowId: string): Promise<boolean> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return false;
    }

    if (workflow.status === 'running') {
      return false; // 実行中は削除不可
    }

    this.workflows.delete(workflowId);
    this.executionHistory.delete(workflowId);
    return true;
  }

  /**
   * テンプレートを削除
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    return this.templates.delete(templateId);
  }

  /**
   * ワークフロー検証
   */
  async validateWorkflow(workflow: Workflow): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!workflow.name || workflow.name.length === 0) {
      errors.push('ワークフロー名が必要です');
    }

    if (workflow.steps.length === 0) {
      errors.push('最低1つのステップが必要です');
    }

    // ステップの検証
    workflow.steps.forEach((step, index) => {
      if (!step.name || step.name.length === 0) {
        errors.push(`ステップ${index + 1}の名前が必要です`);
      }
      if (!step.action || step.action.length === 0) {
        errors.push(`ステップ${index + 1}のアクションが必要です`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * ワークフロー実行時間を計算
   */
  async calculateExecutionTime(workflowId: string): Promise<number | null> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || !workflow.startedAt || !workflow.completedAt) {
      return null;
    }

    return workflow.completedAt - workflow.startedAt;
  }

  /**
   * ステップ成功率を計算
   */
  async calculateStepSuccessRate(workflowId: string): Promise<number> {
    const history = this.executionHistory.get(workflowId) || [];
    if (history.length === 0) {
      return 0;
    }

    const successful = history.filter((r) => r.status === 'completed').length;
    return (successful / history.length) * 100;
  }

  /**
   * 最頻出ワークフローアクションを取得
   */
  getFrequentActions(): Record<string, number> {
    const actionCounts: Record<string, number> = {};

    this.workflows.forEach((workflow) => {
      workflow.steps.forEach((step) => {
        actionCounts[step.action] = (actionCounts[step.action] || 0) + 1;
      });
    });

    return actionCounts;
  }

  /**
   * ワークフロー推奨を生成
   */
  async generateWorkflowRecommendations(userId: string): Promise<WorkflowTemplate[]> {
    const userWorkflows = await this.getUserWorkflows(userId);
    const frequentActions = this.getFrequentActions();

    // ユーザーの行動パターンに基づいて推奨テンプレートを返す
    return Array.from(this.templates.values())
      .filter((t) => {
        return t.steps.some((s) => frequentActions[s.action]);
      })
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);
  }
}
