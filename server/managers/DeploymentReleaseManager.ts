/**
 * DeploymentReleaseManager - デプロイメント・リリース管理
 * 
 * 機能:
 * - リリース計画
 * - デプロイメント実行
 * - リリース履歴管理
 * - デプロイ状態監視
 */

export type Environment = 'development' | 'staging' | 'production';
export type ReleaseStatus = 'planning' | 'approved' | 'deploying' | 'deployed' | 'failed' | 'rolled_back';
export type DeploymentStatus = 'pending' | 'in_progress' | 'success' | 'failed';

export interface Release {
  releaseId: string;
  version: string;
  environment: Environment;
  status: ReleaseStatus;
  createdAt: number;
  deployedAt?: number;
  rollbackAt?: number;
  changeLog: string;
  approvedBy?: string;
  deployedBy?: string;
  notes: string;
}

export interface Deployment {
  deploymentId: string;
  releaseId: string;
  environment: Environment;
  status: DeploymentStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  errorMessage?: string;
  logs: string[];
}

export class DeploymentReleaseManager {
  private static instance: DeploymentReleaseManager;
  private releases: Map<string, Release> = new Map();
  private deployments: Map<string, Deployment> = new Map();
  private releaseCounter: number = 0;
  private deploymentCounter: number = 0;

  private constructor() {}

  static getInstance(): DeploymentReleaseManager {
    if (!DeploymentReleaseManager.instance) {
      DeploymentReleaseManager.instance = new DeploymentReleaseManager();
    }
    return DeploymentReleaseManager.instance;
  }

  /**
   * リリース計画作成
   */
  planRelease(
    version: string,
    environment: Environment,
    changeLog: string,
    notes: string
  ): Release {
    const releaseId = `release_${++this.releaseCounter}_${Date.now()}`;

    const release: Release = {
      releaseId,
      version,
      environment,
      status: 'planning',
      createdAt: Date.now(),
      changeLog,
      notes,
    };

    this.releases.set(releaseId, release);
    return release;
  }

  /**
   * リリース承認
   */
  approveRelease(releaseId: string, approvedBy: string): Release | null {
    const release = this.releases.get(releaseId);
    if (!release) return null;

    release.status = 'approved';
    release.approvedBy = approvedBy;
    return release;
  }

  /**
   * デプロイメント開始
   */
  startDeployment(releaseId: string, deployedBy: string): Deployment | null {
    const release = this.releases.get(releaseId);
    if (!release || release.status !== 'approved') return null;

    const deploymentId = `deploy_${++this.deploymentCounter}_${Date.now()}`;

    const deployment: Deployment = {
      deploymentId,
      releaseId,
      environment: release.environment,
      status: 'in_progress',
      startTime: Date.now(),
      logs: [],
    };

    release.status = 'deploying';
    release.deployedBy = deployedBy;

    this.deployments.set(deploymentId, deployment);
    return deployment;
  }

  /**
   * デプロイメント成功
   */
  completeDeployment(deploymentId: string): Deployment | null {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return null;

    deployment.status = 'success';
    deployment.endTime = Date.now();
    deployment.duration = deployment.endTime - deployment.startTime;

    const release = this.releases.get(deployment.releaseId);
    if (release) {
      release.status = 'deployed';
      release.deployedAt = Date.now();
    }

    return deployment;
  }

  /**
   * デプロイメント失敗
   */
  failDeployment(deploymentId: string, errorMessage: string): Deployment | null {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return null;

    deployment.status = 'failed';
    deployment.endTime = Date.now();
    deployment.duration = deployment.endTime - deployment.startTime;
    deployment.errorMessage = errorMessage;

    const release = this.releases.get(deployment.releaseId);
    if (release) {
      release.status = 'failed';
    }

    return deployment;
  }

  /**
   * デプロイログ追加
   */
  addDeploymentLog(deploymentId: string, log: string): void {
    const deployment = this.deployments.get(deploymentId);
    if (deployment) {
      deployment.logs.push(`[${new Date().toISOString()}] ${log}`);
    }
  }

  /**
   * リリース取得
   */
  getRelease(releaseId: string): Release | null {
    return this.releases.get(releaseId) || null;
  }

  /**
   * すべてのリリース取得
   */
  getAllReleases(): Release[] {
    return Array.from(this.releases.values());
  }

  /**
   * デプロイメント取得
   */
  getDeployment(deploymentId: string): Deployment | null {
    return this.deployments.get(deploymentId) || null;
  }

  /**
   * すべてのデプロイメント取得
   */
  getAllDeployments(): Deployment[] {
    return Array.from(this.deployments.values());
  }

  /**
   * 環境別リリース取得
   */
  getReleasesByEnvironment(environment: Environment): Release[] {
    return Array.from(this.releases.values()).filter((r: Release) => r.environment === environment);
  }

  /**
   * 統計取得
   */
  getStatistics(): {
    totalReleases: number;
    successfulReleases: number;
    failedReleases: number;
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    averageDeploymentTime: number;
  } {
    const releases = this.getAllReleases();
    const deployments = this.getAllDeployments();

    const successfulReleases = releases.filter((r: Release) => r.status === 'deployed').length;
    const failedReleases = releases.filter((r: Release) => r.status === 'failed').length;

    const successfulDeployments = deployments.filter((d: Deployment) => d.status === 'success').length;
    const failedDeployments = deployments.filter((d: Deployment) => d.status === 'failed').length;

    const avgDeploymentTime =
      successfulDeployments > 0
        ? deployments
            .filter((d: Deployment) => d.status === 'success' && d.duration)
            .reduce((sum: number, d: Deployment) => sum + (d.duration || 0), 0) / successfulDeployments
        : 0;

    return {
      totalReleases: releases.length,
      successfulReleases,
      failedReleases,
      totalDeployments: deployments.length,
      successfulDeployments,
      failedDeployments,
      averageDeploymentTime: avgDeploymentTime,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.releases.clear();
    this.deployments.clear();
  }
}

export const deploymentReleaseManager = DeploymentReleaseManager.getInstance();
export default deploymentReleaseManager;
