/**
 * DeploymentManager - デプロイメント管理
 * 
 * 機能:
 * - バージョン管理
 * - リリース管理
 * - ロールバック管理
 * - デプロイメント履歴
 */

export interface Version {
  versionId: string;
  version: string;
  releaseDate: number;
  status: 'draft' | 'released' | 'deprecated';
  features: string[];
  bugFixes: string[];
  breakingChanges: string[];
  notes: string;
}

export interface Release {
  releaseId: string;
  version: string;
  releaseDate: number;
  status: 'planning' | 'in_progress' | 'completed' | 'failed';
  targetDate: number;
  actualDate?: number;
  changeLog: string;
  deployedTo: string[]; // 環境名
}

export interface Rollback {
  rollbackId: string;
  fromVersion: string;
  toVersion: string;
  timestamp: number;
  reason: string;
  status: 'success' | 'partial' | 'failed';
  details: Record<string, any>;
}

export class DeploymentManager {
  private static instance: DeploymentManager;
  private versions: Map<string, Version> = new Map();
  private releases: Release[] = [];
  private rollbacks: Rollback[] = [];
  private versionCounter: number = 0;
  private releaseCounter: number = 0;
  private rollbackCounter: number = 0;

  private constructor() {}

  static getInstance(): DeploymentManager {
    if (!DeploymentManager.instance) {
      DeploymentManager.instance = new DeploymentManager();
    }
    return DeploymentManager.instance;
  }

  /**
   * バージョン作成
   */
  createVersion(
    version: string,
    features: string[],
    bugFixes: string[],
    breakingChanges: string[],
    notes: string
  ): Version {
    const versionId = `version_${++this.versionCounter}_${Date.now()}`;

    const versionObj: Version = {
      versionId,
      version,
      releaseDate: 0,
      status: 'draft',
      features,
      bugFixes,
      breakingChanges,
      notes,
    };

    this.versions.set(versionId, versionObj);
    return versionObj;
  }

  /**
   * バージョン取得
   */
  getVersion(versionId: string): Version | null {
    return this.versions.get(versionId) || null;
  }

  /**
   * すべてのバージョン取得
   */
  getAllVersions(): Version[] {
    return Array.from(this.versions.values());
  }

  /**
   * バージョンリリース
   */
  releaseVersion(versionId: string): Version | null {
    const version = this.getVersion(versionId);
    if (!version) return null;

    version.status = 'released';
    version.releaseDate = Date.now();
    return version;
  }

  /**
   * リリース作成
   */
  createRelease(
    version: string,
    targetDate: number,
    changeLog: string,
    deployedTo: string[]
  ): Release {
    const releaseId = `release_${++this.releaseCounter}_${Date.now()}`;

    const release: Release = {
      releaseId,
      version,
      releaseDate: Date.now(),
      status: 'planning',
      targetDate,
      changeLog,
      deployedTo,
    };

    this.releases.push(release);

    // 最新1000件のみ保持
    if (this.releases.length > 1000) {
      this.releases.shift();
    }

    return release;
  }

  /**
   * リリース取得
   */
  getRelease(releaseId: string): Release | null {
    return this.releases.find((r: Release) => r.releaseId === releaseId) || null;
  }

  /**
   * すべてのリリース取得
   */
  getAllReleases(): Release[] {
    return this.releases;
  }

  /**
   * リリース状態更新
   */
  updateReleaseStatus(releaseId: string, status: 'planning' | 'in_progress' | 'completed' | 'failed'): Release | null {
    const release = this.getRelease(releaseId);
    if (!release) return null;

    release.status = status;
    if (status === 'completed') {
      release.actualDate = Date.now();
    }

    return release;
  }

  /**
   * ロールバック実行
   */
  executeRollback(
    fromVersion: string,
    toVersion: string,
    reason: string,
    status: 'success' | 'partial' | 'failed',
    details: Record<string, any>
  ): Rollback {
    const rollbackId = `rollback_${++this.rollbackCounter}_${Date.now()}`;

    const rollback: Rollback = {
      rollbackId,
      fromVersion,
      toVersion,
      timestamp: Date.now(),
      reason,
      status,
      details,
    };

    this.rollbacks.push(rollback);

    // 最新1000件のみ保持
    if (this.rollbacks.length > 1000) {
      this.rollbacks.shift();
    }

    return rollback;
  }

  /**
   * ロールバック取得
   */
  getRollback(rollbackId: string): Rollback | null {
    return this.rollbacks.find((r: Rollback) => r.rollbackId === rollbackId) || null;
  }

  /**
   * ロールバック履歴取得
   */
  getRollbackHistory(limit: number = 50): Rollback[] {
    const start = Math.max(0, this.rollbacks.length - limit);
    return this.rollbacks.slice(start);
  }

  /**
   * デプロイメント統計取得
   */
  getDeploymentStatistics(): {
    totalVersions: number;
    releasedVersions: number;
    draftVersions: number;
    totalReleases: number;
    completedReleases: number;
    failedReleases: number;
    totalRollbacks: number;
    successfulRollbacks: number;
  } {
    const versions = this.getAllVersions();
    const releasedCount = versions.filter((v: Version) => v.status === 'released').length;
    const draftCount = versions.filter((v: Version) => v.status === 'draft').length;

    const completedCount = this.releases.filter((r: Release) => r.status === 'completed').length;
    const failedCount = this.releases.filter((r: Release) => r.status === 'failed').length;

    const successfulRollbackCount = this.rollbacks.filter((r: Rollback) => r.status === 'success').length;

    return {
      totalVersions: versions.length,
      releasedVersions: releasedCount,
      draftVersions: draftCount,
      totalReleases: this.releases.length,
      completedReleases: completedCount,
      failedReleases: failedCount,
      totalRollbacks: this.rollbacks.length,
      successfulRollbacks: successfulRollbackCount,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.versions.clear();
    this.releases = [];
    this.rollbacks = [];
  }
}

export const deploymentManager = DeploymentManager.getInstance();
export default deploymentManager;
