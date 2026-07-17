/**
 * UpdateDeliveryService
 * アップデート配信・バージョン管理・ロールバック
 */

export interface AppUpdate {
  updateId: string;
  version: string;
  releaseDate: number;
  description: string;
  type: 'patch' | 'minor' | 'major';
  status: 'draft' | 'staged' | 'released' | 'deprecated';
  changeLog: string[];
  downloadUrl: string;
  fileSize: number;
  checksum: string;
}

export interface AIModelUpdate {
  modelUpdateId: string;
  modelName: string;
  version: string;
  releaseDate: number;
  improvements: string[];
  status: 'draft' | 'staged' | 'released' | 'deprecated';
  downloadUrl: string;
  fileSize: number;
}

export interface DeploymentRecord {
  deploymentId: string;
  timestamp: number;
  updateId: string;
  targetVersion: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  affectedUsers: number;
  successCount: number;
  failureCount: number;
  rollbackedAt?: number;
}

export class UpdateDeliveryService {
  private appUpdates: Map<string, AppUpdate> = new Map();
  private modelUpdates: Map<string, AIModelUpdate> = new Map();
  private deployments: Map<string, DeploymentRecord> = new Map();
  private updatesByStatus: Map<string, string[]> = new Map();
  private modelsByStatus: Map<string, string[]> = new Map();
  private deploymentsByStatus: Map<string, string[]> = new Map();

  /**
   * アプリアップデートを作成
   */
  createAppUpdate(
    version: string,
    description: string,
    type: 'patch' | 'minor' | 'major',
    changeLog: string[],
    downloadUrl: string,
    fileSize: number,
    checksum: string
  ): AppUpdate {
    const updateId = `UPD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const update: AppUpdate = {
      updateId,
      version,
      releaseDate: Date.now(),
      description,
      type,
      status: 'draft',
      changeLog,
      downloadUrl,
      fileSize,
      checksum,
    };

    this.appUpdates.set(updateId, update);

    if (!this.updatesByStatus.has('draft')) {
      this.updatesByStatus.set('draft', []);
    }
    this.updatesByStatus.get('draft')!.push(updateId);

    return update;
  }

  /**
   * アプリアップデートを取得
   */
  getAppUpdate(updateId: string): AppUpdate | undefined {
    return this.appUpdates.get(updateId);
  }

  /**
   * ステータス別アップデートを取得
   */
  getAppUpdatesByStatus(status: 'draft' | 'staged' | 'released' | 'deprecated'): AppUpdate[] {
    const ids = this.updatesByStatus.get(status) || [];
    return ids
      .map(id => this.appUpdates.get(id))
      .filter((u): u is AppUpdate => u !== undefined);
  }

  /**
   * アップデートをステージング
   */
  stageAppUpdate(updateId: string): boolean {
    const update = this.appUpdates.get(updateId);
    if (!update) return false;

    const draftIds = this.updatesByStatus.get('draft') || [];
    const index = draftIds.indexOf(updateId);
    if (index > -1) {
      draftIds.splice(index, 1);
    }

    update.status = 'staged';

    if (!this.updatesByStatus.has('staged')) {
      this.updatesByStatus.set('staged', []);
    }
    this.updatesByStatus.get('staged')!.push(updateId);

    return true;
  }

  /**
   * アップデートをリリース
   */
  releaseAppUpdate(updateId: string): boolean {
    const update = this.appUpdates.get(updateId);
    if (!update) return false;

    const stagedIds = this.updatesByStatus.get('staged') || [];
    const index = stagedIds.indexOf(updateId);
    if (index > -1) {
      stagedIds.splice(index, 1);
    }

    update.status = 'released';

    if (!this.updatesByStatus.has('released')) {
      this.updatesByStatus.set('released', []);
    }
    this.updatesByStatus.get('released')!.push(updateId);

    return true;
  }

  /**
   * AIモデルアップデートを作成
   */
  createModelUpdate(
    modelName: string,
    version: string,
    improvements: string[],
    downloadUrl: string,
    fileSize: number
  ): AIModelUpdate {
    const modelUpdateId = `MDL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const update: AIModelUpdate = {
      modelUpdateId,
      modelName,
      version,
      releaseDate: Date.now(),
      improvements,
      status: 'draft',
      downloadUrl,
      fileSize,
    };

    this.modelUpdates.set(modelUpdateId, update);

    if (!this.modelsByStatus.has('draft')) {
      this.modelsByStatus.set('draft', []);
    }
    this.modelsByStatus.get('draft')!.push(modelUpdateId);

    return update;
  }

  /**
   * モデルアップデートを取得
   */
  getModelUpdate(modelUpdateId: string): AIModelUpdate | undefined {
    return this.modelUpdates.get(modelUpdateId);
  }

  /**
   * ステータス別モデルアップデートを取得
   */
  getModelUpdatesByStatus(status: 'draft' | 'staged' | 'released' | 'deprecated'): AIModelUpdate[] {
    const ids = this.modelsByStatus.get(status) || [];
    return ids
      .map(id => this.modelUpdates.get(id))
      .filter((m): m is AIModelUpdate => m !== undefined);
  }

  /**
   * デプロイメント記録を作成
   */
  createDeployment(
    updateId: string,
    targetVersion: string,
    affectedUsers: number
  ): DeploymentRecord {
    const deploymentId = `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const deployment: DeploymentRecord = {
      deploymentId,
      timestamp: Date.now(),
      updateId,
      targetVersion,
      status: 'pending',
      affectedUsers,
      successCount: 0,
      failureCount: 0,
    };

    this.deployments.set(deploymentId, deployment);

    if (!this.deploymentsByStatus.has('pending')) {
      this.deploymentsByStatus.set('pending', []);
    }
    this.deploymentsByStatus.get('pending')!.push(deploymentId);

    return deployment;
  }

  /**
   * デプロイメント記録を取得
   */
  getDeployment(deploymentId: string): DeploymentRecord | undefined {
    return this.deployments.get(deploymentId);
  }

  /**
   * ステータス別デプロイメントを取得
   */
  getDeploymentsByStatus(
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back'
  ): DeploymentRecord[] {
    const ids = this.deploymentsByStatus.get(status) || [];
    return ids
      .map(id => this.deployments.get(id))
      .filter((d): d is DeploymentRecord => d !== undefined);
  }

  /**
   * デプロイメントを開始
   */
  startDeployment(deploymentId: string): boolean {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return false;

    const pendingIds = this.deploymentsByStatus.get('pending') || [];
    const index = pendingIds.indexOf(deploymentId);
    if (index > -1) {
      pendingIds.splice(index, 1);
    }

    deployment.status = 'in_progress';

    if (!this.deploymentsByStatus.has('in_progress')) {
      this.deploymentsByStatus.set('in_progress', []);
    }
    this.deploymentsByStatus.get('in_progress')!.push(deploymentId);

    return true;
  }

  /**
   * デプロイメントを完了
   */
  completeDeployment(deploymentId: string, successCount: number, failureCount: number): boolean {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return false;

    const inProgressIds = this.deploymentsByStatus.get('in_progress') || [];
    const index = inProgressIds.indexOf(deploymentId);
    if (index > -1) {
      inProgressIds.splice(index, 1);
    }

    deployment.status = 'completed';
    deployment.successCount = successCount;
    deployment.failureCount = failureCount;

    if (!this.deploymentsByStatus.has('completed')) {
      this.deploymentsByStatus.set('completed', []);
    }
    this.deploymentsByStatus.get('completed')!.push(deploymentId);

    return true;
  }

  /**
   * デプロイメントをロールバック
   */
  rollbackDeployment(deploymentId: string): boolean {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return false;

    const currentStatusIds = this.deploymentsByStatus.get(deployment.status) || [];
    const index = currentStatusIds.indexOf(deploymentId);
    if (index > -1) {
      currentStatusIds.splice(index, 1);
    }

    deployment.status = 'rolled_back';
    deployment.rollbackedAt = Date.now();

    if (!this.deploymentsByStatus.has('rolled_back')) {
      this.deploymentsByStatus.set('rolled_back', []);
    }
    this.deploymentsByStatus.get('rolled_back')!.push(deploymentId);

    return true;
  }

  /**
   * 全アップデートを取得
   */
  getAllAppUpdates(): AppUpdate[] {
    return Array.from(this.appUpdates.values());
  }

  /**
   * 全モデルアップデートを取得
   */
  getAllModelUpdates(): AIModelUpdate[] {
    return Array.from(this.modelUpdates.values());
  }

  /**
   * 全デプロイメントを取得
   */
  getAllDeployments(): DeploymentRecord[] {
    return Array.from(this.deployments.values());
  }

  /**
   * 最新リリースアップデートを取得
   */
  getLatestReleasedUpdate(): AppUpdate | undefined {
    const released = this.getAppUpdatesByStatus('released');
    if (released.length === 0) return undefined;

    return released.reduce((latest, current) =>
      current.releaseDate > latest.releaseDate ? current : latest
    );
  }

  /**
   * アップデート統計を計算
   */
  getUpdateStats(): {
    totalAppUpdates: number;
    draftUpdates: number;
    stagedUpdates: number;
    releasedUpdates: number;
    totalModelUpdates: number;
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
  } {
    const allAppUpdates = Array.from(this.appUpdates.values());
    const allModelUpdates = Array.from(this.modelUpdates.values());
    const allDeployments = Array.from(this.deployments.values());

    return {
      totalAppUpdates: allAppUpdates.length,
      draftUpdates: allAppUpdates.filter(u => u.status === 'draft').length,
      stagedUpdates: allAppUpdates.filter(u => u.status === 'staged').length,
      releasedUpdates: allAppUpdates.filter(u => u.status === 'released').length,
      totalModelUpdates: allModelUpdates.length,
      totalDeployments: allDeployments.length,
      successfulDeployments: allDeployments.filter(d => d.status === 'completed').length,
      failedDeployments: allDeployments.filter(d => d.status === 'failed').length,
    };
  }

  /**
   * アップデートを削除
   */
  deleteAppUpdate(updateId: string): boolean {
    const update = this.appUpdates.get(updateId);
    if (!update) return false;

    const statusIds = this.updatesByStatus.get(update.status) || [];
    const index = statusIds.indexOf(updateId);
    if (index > -1) {
      statusIds.splice(index, 1);
    }

    this.appUpdates.delete(updateId);
    return true;
  }

  /**
   * モデルアップデートを削除
   */
  deleteModelUpdate(modelUpdateId: string): boolean {
    const update = this.modelUpdates.get(modelUpdateId);
    if (!update) return false;

    const statusIds = this.modelsByStatus.get(update.status) || [];
    const index = statusIds.indexOf(modelUpdateId);
    if (index > -1) {
      statusIds.splice(index, 1);
    }

    this.modelUpdates.delete(modelUpdateId);
    return true;
  }

  /**
   * デプロイメント記録を削除
   */
  deleteDeployment(deploymentId: string): boolean {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return false;

    const statusIds = this.deploymentsByStatus.get(deployment.status) || [];
    const index = statusIds.indexOf(deploymentId);
    if (index > -1) {
      statusIds.splice(index, 1);
    }

    this.deployments.delete(deploymentId);
    return true;
  }
}
