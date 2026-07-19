/**
 * BuildConfigurationService - Build設定サービス
 */

export type BuildVariant = 'debug' | 'release' | 'staging';

export interface BuildConfiguration {
  configId: string;
  variant: BuildVariant;
  applicationId: string;
  versionName: string;
  versionCode: number;
  minSdkVersion: number;
  targetSdkVersion: number;
  compileSdkVersion: number;
  debuggable: boolean;
  proguardEnabled: boolean;
  multidexEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export class BuildConfigurationService {
  private static instance: BuildConfigurationService;
  private configurations: Map<string, BuildConfiguration> = new Map();
  private configCounter: number = 0;

  private constructor() {}

  static getInstance(): BuildConfigurationService {
    if (!BuildConfigurationService.instance) {
      BuildConfigurationService.instance = new BuildConfigurationService();
    }
    return BuildConfigurationService.instance;
  }

  /**
   * Build設定作成
   */
  createConfiguration(
    variant: BuildVariant,
    applicationId: string,
    versionName: string,
    versionCode: number,
    minSdkVersion: number,
    targetSdkVersion: number,
    compileSdkVersion: number
  ): BuildConfiguration {
    const configId = `build_config_${++this.configCounter}_${Date.now()}`;
    const now = Date.now();

    const config: BuildConfiguration = {
      configId,
      variant,
      applicationId,
      versionName,
      versionCode,
      minSdkVersion,
      targetSdkVersion,
      compileSdkVersion,
      debuggable: variant === 'debug',
      proguardEnabled: variant === 'release',
      multidexEnabled: true,
      createdAt: now,
      updatedAt: now,
    };

    this.configurations.set(configId, config);
    return config;
  }

  /**
   * Build設定取得
   */
  getConfiguration(configId: string): BuildConfiguration | null {
    return this.configurations.get(configId) || null;
  }

  /**
   * ビルドバリアント別設定取得
   */
  getConfigurationsByVariant(variant: BuildVariant): BuildConfiguration[] {
    return Array.from(this.configurations.values()).filter((c) => c.variant === variant);
  }

  /**
   * Build設定更新
   */
  updateConfiguration(configId: string, updates: Partial<BuildConfiguration>): BuildConfiguration | null {
    const config = this.configurations.get(configId);
    if (!config) return null;

    const updated = { ...config, ...updates, updatedAt: Date.now() };
    this.configurations.set(configId, updated);
    return updated;
  }

  /**
   * Build設定削除
   */
  deleteConfiguration(configId: string): boolean {
    return this.configurations.delete(configId);
  }

  /**
   * すべてのBuild設定取得
   */
  getAllConfigurations(): BuildConfiguration[] {
    return Array.from(this.configurations.values());
  }

  /**
   * Build設定統計
   */
  getConfigurationStatistics(): {
    totalConfigurations: number;
    debugConfigurations: number;
    releaseConfigurations: number;
    stagingConfigurations: number;
    proguardEnabledCount: number;
  } {
    const configArray = Array.from(this.configurations.values());
    const debugConfigurations = configArray.filter((c) => c.variant === 'debug').length;
    const releaseConfigurations = configArray.filter((c) => c.variant === 'release').length;
    const stagingConfigurations = configArray.filter((c) => c.variant === 'staging').length;
    const proguardEnabledCount = configArray.filter((c) => c.proguardEnabled).length;

    return {
      totalConfigurations: configArray.length,
      debugConfigurations,
      releaseConfigurations,
      stagingConfigurations,
      proguardEnabledCount,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.configurations.clear();
  }
}

export const buildConfigurationService = BuildConfigurationService.getInstance();
export default buildConfigurationService;
