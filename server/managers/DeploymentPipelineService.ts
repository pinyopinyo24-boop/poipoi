/**
 * DeploymentPipelineService - デプロイパイプライン管理
 * 
 * 機能:
 * - パイプライン定義
 * - ステージ管理
 * - パイプライン実行
 */

export type PipelineStage = 'build' | 'test' | 'security' | 'staging' | 'production';
export type StageStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface PipelineStageConfig {
  stage: PipelineStage;
  enabled: boolean;
  timeout: number;
  retryOnFailure: boolean;
  maxRetries: number;
  dependencies: PipelineStage[];
}

export interface PipelineExecution {
  executionId: string;
  pipelineId: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'success' | 'failed';
  stages: StageExecution[];
}

export interface StageExecution {
  stage: PipelineStage;
  status: StageStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  output: string;
  errorMessage?: string;
  retryCount: number;
}

export class DeploymentPipelineService {
  private static instance: DeploymentPipelineService;
  private pipelines: Map<string, PipelineStageConfig[]> = new Map();
  private executions: Map<string, PipelineExecution> = new Map();
  private pipelineCounter: number = 0;
  private executionCounter: number = 0;

  private constructor() {
    this.initializeDefaultPipelines();
  }

  static getInstance(): DeploymentPipelineService {
    if (!DeploymentPipelineService.instance) {
      DeploymentPipelineService.instance = new DeploymentPipelineService();
    }
    return DeploymentPipelineService.instance;
  }

  /**
   * デフォルトパイプライン初期化
   */
  private initializeDefaultPipelines(): void {
    const defaultPipeline: PipelineStageConfig[] = [
      {
        stage: 'build',
        enabled: true,
        timeout: 600000,
        retryOnFailure: true,
        maxRetries: 2,
        dependencies: [],
      },
      {
        stage: 'test',
        enabled: true,
        timeout: 900000,
        retryOnFailure: true,
        maxRetries: 1,
        dependencies: ['build'],
      },
      {
        stage: 'security',
        enabled: true,
        timeout: 600000,
        retryOnFailure: false,
        maxRetries: 0,
        dependencies: ['build'],
      },
      {
        stage: 'staging',
        enabled: true,
        timeout: 1200000,
        retryOnFailure: true,
        maxRetries: 1,
        dependencies: ['test', 'security'],
      },
      {
        stage: 'production',
        enabled: true,
        timeout: 1800000,
        retryOnFailure: false,
        maxRetries: 0,
        dependencies: ['staging'],
      },
    ];

    this.pipelines.set('default', defaultPipeline);
  }

  /**
   * パイプライン作成
   */
  createPipeline(pipelineId: string, stages: PipelineStageConfig[]): void {
    this.pipelines.set(pipelineId, stages);
  }

  /**
   * パイプライン取得
   */
  getPipeline(pipelineId: string): PipelineStageConfig[] | null {
    return this.pipelines.get(pipelineId) || null;
  }

  /**
   * パイプライン実行開始
   */
  startPipelineExecution(pipelineId: string): PipelineExecution | null {
    const pipeline = this.getPipeline(pipelineId);
    if (!pipeline) return null;

    const executionId = `exec_${++this.executionCounter}_${Date.now()}`;

    const execution: PipelineExecution = {
      executionId,
      pipelineId,
      startTime: Date.now(),
      status: 'running',
      stages: pipeline.map((config: PipelineStageConfig) => ({
        stage: config.stage,
        status: 'pending' as const,
        startTime: Date.now(),
        output: '',
        retryCount: 0,
      })),
    };

    this.executions.set(executionId, execution);
    return execution;
  }

  /**
   * ステージ実行開始
   */
  startStageExecution(executionId: string, stage: PipelineStage): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const stageExecution = execution.stages.find((s: StageExecution) => s.stage === stage);
    if (stageExecution) {
      stageExecution.status = 'running';
      stageExecution.startTime = Date.now();
    }
  }

  /**
   * ステージ実行成功
   */
  completeStageExecution(executionId: string, stage: PipelineStage, output: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const stageExecution = execution.stages.find((s: StageExecution) => s.stage === stage);
    if (stageExecution) {
      stageExecution.status = 'success';
      stageExecution.endTime = Date.now();
      stageExecution.duration = stageExecution.endTime - stageExecution.startTime;
      stageExecution.output = output;
    }
  }

  /**
   * ステージ実行失敗
   */
  failStageExecution(executionId: string, stage: PipelineStage, errorMessage: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const stageExecution = execution.stages.find((s: StageExecution) => s.stage === stage);
    if (stageExecution) {
      stageExecution.status = 'failed';
      stageExecution.endTime = Date.now();
      stageExecution.duration = stageExecution.endTime - stageExecution.startTime;
      stageExecution.errorMessage = errorMessage;
    }
  }

  /**
   * パイプライン実行完了
   */
  completePipelineExecution(executionId: string): PipelineExecution | null {
    const execution = this.executions.get(executionId);
    if (!execution) return null;

    const allSuccess = execution.stages.every((s: StageExecution) => s.status === 'success' || s.status === 'skipped');

    execution.status = allSuccess ? 'success' : 'failed';
    execution.endTime = Date.now();

    return execution;
  }

  /**
   * パイプライン実行取得
   */
  getPipelineExecution(executionId: string): PipelineExecution | null {
    return this.executions.get(executionId) || null;
  }

  /**
   * すべてのパイプライン実行取得
   */
  getAllPipelineExecutions(): PipelineExecution[] {
    return Array.from(this.executions.values());
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.pipelines.clear();
    this.executions.clear();
  }
}

export const deploymentPipelineService = DeploymentPipelineService.getInstance();
export default deploymentPipelineService;
