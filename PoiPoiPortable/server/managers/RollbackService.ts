/**
 * RollbackService - ロールバック管理
 * 
 * 機能:
 * - ロールバック実行
 * - ロールバック履歴
 * - ロールバック検証
 */

export type RollbackReason = 'critical_bug' | 'performance_issue' | 'security_issue' | 'data_corruption' | 'user_request' | 'other';
export type RollbackStatus = 'pending' | 'in_progress' | 'success' | 'failed';

export interface RollbackRequest {
  requestId: string;
  fromVersion: string;
  toVersion: string;
  environment: 'development' | 'staging' | 'production';
  reason: RollbackReason;
  description: string;
  requestedBy: string;
  requestedAt: number;
  approvedBy?: string;
  approvedAt?: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface RollbackExecution {
  executionId: string;
  requestId: string;
  status: RollbackStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  steps: RollbackStep[];
  errorMessage?: string;
  executedBy: string;
}

export interface RollbackStep {
  stepId: string;
  name: string;
  status: 'pending' | 'in_progress' | 'success' | 'failed';
  startTime: number;
  endTime?: number;
  output: string;
  errorMessage?: string;
}

export class RollbackService {
  private static instance: RollbackService;
  private requests: Map<string, RollbackRequest> = new Map();
  private executions: Map<string, RollbackExecution> = new Map();
  private requestCounter: number = 0;
  private executionCounter: number = 0;

  private constructor() {}

  static getInstance(): RollbackService {
    if (!RollbackService.instance) {
      RollbackService.instance = new RollbackService();
    }
    return RollbackService.instance;
  }

  /**
   * ロールバックリクエスト作成
   */
  createRollbackRequest(
    fromVersion: string,
    toVersion: string,
    environment: 'development' | 'staging' | 'production',
    reason: RollbackReason,
    description: string,
    requestedBy: string
  ): RollbackRequest {
    const requestId = `rollback_req_${++this.requestCounter}_${Date.now()}`;

    const request: RollbackRequest = {
      requestId,
      fromVersion,
      toVersion,
      environment,
      reason,
      description,
      requestedBy,
      requestedAt: Date.now(),
      status: 'pending',
    };

    this.requests.set(requestId, request);
    return request;
  }

  /**
   * ロールバックリクエスト承認
   */
  approveRollbackRequest(requestId: string, approvedBy: string): RollbackRequest | null {
    const request = this.requests.get(requestId);
    if (!request) return null;

    request.status = 'approved';
    request.approvedBy = approvedBy;
    request.approvedAt = Date.now();

    return request;
  }

  /**
   * ロールバックリクエスト却下
   */
  rejectRollbackRequest(requestId: string): RollbackRequest | null {
    const request = this.requests.get(requestId);
    if (!request) return null;

    request.status = 'rejected';
    return request;
  }

  /**
   * ロールバック実行開始
   */
  startRollbackExecution(requestId: string, executedBy: string): RollbackExecution | null {
    const request = this.requests.get(requestId);
    if (!request || request.status !== 'approved') return null;

    const executionId = `rollback_exec_${++this.executionCounter}_${Date.now()}`;

    const execution: RollbackExecution = {
      executionId,
      requestId,
      status: 'in_progress',
      startTime: Date.now(),
      steps: [
        {
          stepId: 'step_1',
          name: 'Backup current version',
          status: 'pending',
          startTime: Date.now(),
          output: '',
        },
        {
          stepId: 'step_2',
          name: 'Stop services',
          status: 'pending',
          startTime: Date.now(),
          output: '',
        },
        {
          stepId: 'step_3',
          name: 'Restore previous version',
          status: 'pending',
          startTime: Date.now(),
          output: '',
        },
        {
          stepId: 'step_4',
          name: 'Verify integrity',
          status: 'pending',
          startTime: Date.now(),
          output: '',
        },
        {
          stepId: 'step_5',
          name: 'Restart services',
          status: 'pending',
          startTime: Date.now(),
          output: '',
        },
      ],
      executedBy,
    };

    this.executions.set(executionId, execution);
    return execution;
  }

  /**
   * ロールバックステップ完了
   */
  completeRollbackStep(executionId: string, stepId: string, output: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const step = execution.steps.find((s: RollbackStep) => s.stepId === stepId);
    if (step) {
      step.status = 'success';
      step.endTime = Date.now();
      step.output = output;
    }
  }

  /**
   * ロールバックステップ失敗
   */
  failRollbackStep(executionId: string, stepId: string, errorMessage: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const step = execution.steps.find((s: RollbackStep) => s.stepId === stepId);
    if (step) {
      step.status = 'failed';
      step.endTime = Date.now();
      step.errorMessage = errorMessage;
    }

    execution.status = 'failed';
  }

  /**
   * ロールバック実行完了
   */
  completeRollbackExecution(executionId: string): RollbackExecution | null {
    const execution = this.executions.get(executionId);
    if (!execution) return null;

    const allSuccess = execution.steps.every((s: RollbackStep) => s.status === 'success');

    execution.status = allSuccess ? 'success' : 'failed';
    execution.endTime = Date.now();
    execution.duration = execution.endTime - execution.startTime;

    return execution;
  }

  /**
   * ロールバックリクエスト取得
   */
  getRollbackRequest(requestId: string): RollbackRequest | null {
    return this.requests.get(requestId) || null;
  }

  /**
   * すべてのロールバックリクエスト取得
   */
  getAllRollbackRequests(): RollbackRequest[] {
    return Array.from(this.requests.values());
  }

  /**
   * ロールバック実行取得
   */
  getRollbackExecution(executionId: string): RollbackExecution | null {
    return this.executions.get(executionId) || null;
  }

  /**
   * すべてのロールバック実行取得
   */
  getAllRollbackExecutions(): RollbackExecution[] {
    return Array.from(this.executions.values());
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.requests.clear();
    this.executions.clear();
  }
}

export const rollbackService = RollbackService.getInstance();
export default rollbackService;
