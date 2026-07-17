/**
 * AndroidBuildManager - Android Build管理
 */

export type BuildType = 'debug' | 'release' | 'staging';
export type BuildStatus = 'pending' | 'building' | 'success' | 'failed' | 'cancelled';

export interface AndroidBuild {
  buildId: string;
  buildType: BuildType;
  version: string;
  versionCode: number;
  status: BuildStatus;
  startedAt?: number;
  completedAt?: number;
  errorMessage?: string;
  apkPath?: string;
  apkSize?: number;
}

export class AndroidBuildManager {
  private static instance: AndroidBuildManager;
  private builds: Map<string, AndroidBuild> = new Map();
  private buildCounter: number = 0;

  private constructor() {}

  static getInstance(): AndroidBuildManager {
    if (!AndroidBuildManager.instance) {
      AndroidBuildManager.instance = new AndroidBuildManager();
    }
    return AndroidBuildManager.instance;
  }

  /**
   * Build開始
   */
  startBuild(buildType: BuildType, version: string, versionCode: number): AndroidBuild {
    const buildId = `android_build_${++this.buildCounter}_${Date.now()}`;

    const build: AndroidBuild = {
      buildId,
      buildType,
      version,
      versionCode,
      status: 'building',
      startedAt: Date.now(),
    };

    this.builds.set(buildId, build);
    return build;
  }

  /**
   * Build成功
   */
  successBuild(buildId: string, apkPath: string, apkSize: number): AndroidBuild | null {
    const build = this.builds.get(buildId);
    if (!build) return null;

    build.status = 'success';
    build.apkPath = apkPath;
    build.apkSize = apkSize;
    build.completedAt = Date.now();

    return build;
  }

  /**
   * Build失敗
   */
  failBuild(buildId: string, errorMessage: string): AndroidBuild | null {
    const build = this.builds.get(buildId);
    if (!build) return null;

    build.status = 'failed';
    build.errorMessage = errorMessage;
    build.completedAt = Date.now();

    return build;
  }

  /**
   * Build取得
   */
  getBuild(buildId: string): AndroidBuild | null {
    return this.builds.get(buildId) || null;
  }

  /**
   * ビルドタイプ別Build取得
   */
  getBuildsByType(buildType: BuildType): AndroidBuild[] {
    return Array.from(this.builds.values()).filter((b) => b.buildType === buildType);
  }

  /**
   * 成功したBuild取得
   */
  getSuccessfulBuilds(): AndroidBuild[] {
    return Array.from(this.builds.values()).filter((b) => b.status === 'success');
  }

  /**
   * 失敗したBuild取得
   */
  getFailedBuilds(): AndroidBuild[] {
    return Array.from(this.builds.values()).filter((b) => b.status === 'failed');
  }

  /**
   * Build統計
   */
  getBuildStatistics(): {
    totalBuilds: number;
    successfulBuilds: number;
    failedBuilds: number;
    buildingBuilds: number;
    successRate: number;
    totalAPKSize: number;
    averageAPKSize: number;
  } {
    const buildArray = Array.from(this.builds.values());
    const successfulBuilds = buildArray.filter((b) => b.status === 'success').length;
    const failedBuilds = buildArray.filter((b) => b.status === 'failed').length;
    const buildingBuilds = buildArray.filter((b) => b.status === 'building').length;
    const totalBuilds = buildArray.length;

    let totalAPKSize = 0;
    let apkCount = 0;

    buildArray.forEach((build) => {
      if (build.apkSize !== undefined) {
        totalAPKSize += build.apkSize;
        apkCount++;
      }
    });

    const successRate = totalBuilds > 0 ? (successfulBuilds / totalBuilds) * 100 : 0;
    const averageAPKSize = apkCount > 0 ? totalAPKSize / apkCount : 0;

    return {
      totalBuilds,
      successfulBuilds,
      failedBuilds,
      buildingBuilds,
      successRate,
      totalAPKSize,
      averageAPKSize,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.builds.clear();
  }
}

export const androidBuildManager = AndroidBuildManager.getInstance();
export default androidBuildManager;
