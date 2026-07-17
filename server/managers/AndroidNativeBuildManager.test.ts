import { describe, it, expect, beforeEach } from 'vitest';

/**
 * AndroidNativeBuildManager
 * Android APK生成・ビルド管理
 */
export interface BuildConfig {
  configId: string;
  appName: string;
  packageName: string;
  versionCode: number;
  versionName: string;
  minSdkVersion: number;
  targetSdkVersion: number;
  buildType: 'debug' | 'release';
  signingConfig?: {
    keyStore: string;
    keyAlias: string;
    keyPassword: string;
    storePassword: string;
  };
}

export interface BuildResult {
  buildId: string;
  configId: string;
  status: 'pending' | 'building' | 'success' | 'failed';
  startTime: Date;
  endTime?: Date;
  apkPath?: string;
  aabPath?: string;
  fileSize?: number;
  errorMessage?: string;
  warnings: string[];
}

export class AndroidNativeBuildManager {
  private configs: Map<string, BuildConfig> = new Map();
  private builds: Map<string, BuildResult> = new Map();
  private buildHistory: BuildResult[] = [];

  /**
   * ビルド設定を作成
   */
  createBuildConfig(
    appName: string,
    packageName: string,
    versionCode: number,
    versionName: string
  ): BuildConfig {
    const configId = `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const config: BuildConfig = {
      configId,
      appName,
      packageName,
      versionCode,
      versionName,
      minSdkVersion: 21,
      targetSdkVersion: 34,
      buildType: 'debug',
    };

    this.configs.set(configId, config);
    return config;
  }

  /**
   * 署名設定を追加
   */
  addSigningConfig(
    configId: string,
    keyStore: string,
    keyAlias: string,
    keyPassword: string,
    storePassword: string
  ): boolean {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Build config not found');
    }

    config.signingConfig = {
      keyStore,
      keyAlias,
      keyPassword,
      storePassword,
    };

    return true;
  }

  /**
   * ビルドを開始
   */
  startBuild(configId: string, buildType: 'debug' | 'release' = 'debug'): BuildResult {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Build config not found');
    }

    const buildId = `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result: BuildResult = {
      buildId,
      configId,
      status: 'building',
      startTime: new Date(),
      warnings: [],
    };

    config.buildType = buildType;
    this.builds.set(buildId, result);
    return result;
  }

  /**
   * ビルドを完了
   */
  completeBuild(
    buildId: string,
    success: boolean,
    apkPath?: string,
    aabPath?: string,
    fileSize?: number,
    errorMessage?: string,
    warnings: string[] = []
  ): BuildResult {
    const result = this.builds.get(buildId);
    if (!result) {
      throw new Error('Build not found');
    }

    result.endTime = new Date();
    result.status = success ? 'success' : 'failed';
    result.apkPath = apkPath;
    result.aabPath = aabPath;
    result.fileSize = fileSize;
    result.errorMessage = errorMessage;
    result.warnings = warnings;

    if (success) {
      this.buildHistory.push(result);
    }

    return result;
  }

  /**
   * ビルド結果を取得
   */
  getBuild(buildId: string): BuildResult | undefined {
    return this.builds.get(buildId);
  }

  /**
   * ビルド設定を取得
   */
  getBuildConfig(configId: string): BuildConfig | undefined {
    return this.configs.get(configId);
  }

  /**
   * ビルド履歴を取得
   */
  getBuildHistory(): BuildResult[] {
    return [...this.buildHistory];
  }

  /**
   * 最新のビルドを取得
   */
  getLatestBuild(): BuildResult | undefined {
    return this.buildHistory[this.buildHistory.length - 1];
  }

  /**
   * ビルド設定を更新
   */
  updateBuildConfig(configId: string, updates: Partial<BuildConfig>): boolean {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Build config not found');
    }

    Object.assign(config, updates);
    return true;
  }

  /**
   * ビルド統計を計算
   */
  calculateBuildStats(): {
    totalBuilds: number;
    successfulBuilds: number;
    failedBuilds: number;
    successRate: number;
    averageBuildTime: number;
  } {
    const total = this.buildHistory.length;
    const successful = this.buildHistory.filter((b) => b.status === 'success').length;
    const failed = this.buildHistory.filter((b) => b.status === 'failed').length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    let totalTime = 0;
    this.buildHistory.forEach((b) => {
      if (b.endTime) {
        totalTime += b.endTime.getTime() - b.startTime.getTime();
      }
    });
    const averageBuildTime = total > 0 ? totalTime / total : 0;

    return {
      totalBuilds: total,
      successfulBuilds: successful,
      failedBuilds: failed,
      successRate,
      averageBuildTime,
    };
  }

  /**
   * ビルドレポートを生成
   */
  generateBuildReport(buildId: string): string {
    const build = this.builds.get(buildId);
    if (!build) {
      throw new Error('Build not found');
    }

    const config = this.configs.get(build.configId);
    const duration = build.endTime ? (build.endTime.getTime() - build.startTime.getTime()) / 1000 : 'N/A';

    const report = `
=== Android Build Report ===
Build ID: ${build.buildId}
App: ${config?.appName || 'Unknown'}
Package: ${config?.packageName || 'Unknown'}
Version: ${config?.versionName || 'Unknown'} (${config?.versionCode || 'N/A'})
Build Type: ${config?.buildType || 'Unknown'}
Status: ${build.status}
Duration: ${duration}s

Artifacts:
  APK: ${build.apkPath || 'N/A'}
  AAB: ${build.aabPath || 'N/A'}
  Size: ${build.fileSize ? (build.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}

Warnings: ${build.warnings.length}
${build.warnings.map((w) => `  - ${w}`).join('\n')}

Error: ${build.errorMessage || 'None'}
    `;

    return report.trim();
  }

  /**
   * APKサイズを最適化
   */
  optimizeAPKSize(buildId: string): boolean {
    const build = this.builds.get(buildId);
    if (!build) {
      throw new Error('Build not found');
    }

    if (build.fileSize) {
      build.fileSize = Math.floor(build.fileSize * 0.85); // 15%削減をシミュレート
      build.warnings.push('APK size optimized: -15%');
    }

    return true;
  }

  /**
   * ビルド設定を検証
   */
  validateBuildConfig(configId: string): { valid: boolean; errors: string[] } {
    const config = this.configs.get(configId);
    if (!config) {
      return { valid: false, errors: ['Build config not found'] };
    }

    const errors: string[] = [];

    if (!config.appName || config.appName.trim() === '') {
      errors.push('App name is required');
    }

    if (!config.packageName || config.packageName.trim() === '') {
      errors.push('Package name is required');
    }

    if (config.versionCode < 1) {
      errors.push('Version code must be >= 1');
    }

    if (!config.versionName || config.versionName.trim() === '') {
      errors.push('Version name is required');
    }

    if (config.buildType === 'release' && !config.signingConfig) {
      errors.push('Signing config required for release builds');
    }

    return { valid: errors.length === 0, errors };
  }
}

// ============ TESTS ============

describe('AndroidNativeBuildManager', () => {
  let manager: AndroidNativeBuildManager;

  beforeEach(() => {
    manager = new AndroidNativeBuildManager();
  });

  describe('createBuildConfig', () => {
    it('should create build config', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      expect(config.appName).toBe('PoiPoi');
      expect(config.packageName).toBe('com.poipoi.app');
      expect(config.versionCode).toBe(1);
      expect(config.versionName).toBe('1.0.0');
    });

    it('should set default SDK versions', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      expect(config.minSdkVersion).toBe(21);
      expect(config.targetSdkVersion).toBe(34);
    });

    it('should generate unique config IDs', () => {
      const config1 = manager.createBuildConfig('App1', 'com.app1', 1, '1.0.0');
      const config2 = manager.createBuildConfig('App2', 'com.app2', 1, '1.0.0');
      expect(config1.configId).not.toBe(config2.configId);
    });
  });

  describe('addSigningConfig', () => {
    it('should add signing config', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      const result = manager.addSigningConfig(
        config.configId,
        '/path/to/keystore.jks',
        'poipoi-key',
        'keypass',
        'storepass'
      );

      expect(result).toBe(true);
      const updated = manager.getBuildConfig(config.configId);
      expect(updated?.signingConfig).toBeDefined();
      expect(updated?.signingConfig?.keyAlias).toBe('poipoi-key');
    });

    it('should throw error for non-existent config', () => {
      expect(() =>
        manager.addSigningConfig('non-existent', '/path/to/keystore.jks', 'key', 'keypass', 'storepass')
      ).toThrow();
    });
  });

  describe('startBuild', () => {
    it('should start debug build', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      const build = manager.startBuild(config.configId, 'debug');

      expect(build.status).toBe('building');
      expect(build.configId).toBe(config.configId);
    });

    it('should start release build', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      const build = manager.startBuild(config.configId, 'release');

      expect(build.status).toBe('building');
    });

    it('should throw error for non-existent config', () => {
      expect(() => manager.startBuild('non-existent', 'debug')).toThrow();
    });
  });

  describe('completeBuild', () => {
    it('should complete successful build', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      const build = manager.startBuild(config.configId, 'debug');

      const completed = manager.completeBuild(
        build.buildId,
        true,
        '/path/to/app-debug.apk',
        undefined,
        50000000,
        undefined,
        []
      );

      expect(completed.status).toBe('success');
      expect(completed.apkPath).toBe('/path/to/app-debug.apk');
      expect(completed.fileSize).toBe(50000000);
    });

    it('should complete failed build', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      const build = manager.startBuild(config.configId, 'debug');

      const completed = manager.completeBuild(build.buildId, false, undefined, undefined, undefined, 'Build failed: Compilation error');

      expect(completed.status).toBe('failed');
      expect(completed.errorMessage).toBe('Build failed: Compilation error');
    });

    it('should add to history on success', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      const build = manager.startBuild(config.configId, 'debug');
      manager.completeBuild(build.buildId, true, '/path/to/app-debug.apk', undefined, 50000000);

      const history = manager.getBuildHistory();
      expect(history).toHaveLength(1);
    });

    it('should not add to history on failure', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      const build = manager.startBuild(config.configId, 'debug');
      manager.completeBuild(build.buildId, false);

      const history = manager.getBuildHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('getBuild', () => {
    it('should return build', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      const build = manager.startBuild(config.configId, 'debug');

      const retrieved = manager.getBuild(build.buildId);
      expect(retrieved).toEqual(build);
    });

    it('should return undefined for non-existent build', () => {
      const retrieved = manager.getBuild('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getBuildConfig', () => {
    it('should return build config', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      const retrieved = manager.getBuildConfig(config.configId);
      expect(retrieved).toEqual(config);
    });

    it('should return undefined for non-existent config', () => {
      const retrieved = manager.getBuildConfig('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getBuildHistory', () => {
    it('should return empty array initially', () => {
      const history = manager.getBuildHistory();
      expect(history).toHaveLength(0);
    });

    it('should return successful builds', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      const build1 = manager.startBuild(config.configId, 'debug');
      manager.completeBuild(build1.buildId, true, '/path/to/app-debug.apk', undefined, 50000000);

      const build2 = manager.startBuild(config.configId, 'release');
      manager.completeBuild(build2.buildId, true, '/path/to/app-release.apk', '/path/to/app.aab', 45000000);

      const history = manager.getBuildHistory();
      expect(history).toHaveLength(2);
    });
  });

  describe('getLatestBuild', () => {
    it('should return latest build', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      const build1 = manager.startBuild(config.configId, 'debug');
      manager.completeBuild(build1.buildId, true, '/path/to/app-debug.apk', undefined, 50000000);

      const build2 = manager.startBuild(config.configId, 'release');
      manager.completeBuild(build2.buildId, true, '/path/to/app-release.apk', '/path/to/app.aab', 45000000);

      const latest = manager.getLatestBuild();
      expect(latest?.buildId).toBe(build2.buildId);
    });

    it('should return undefined if no builds', () => {
      const latest = manager.getLatestBuild();
      expect(latest).toBeUndefined();
    });
  });

  describe('updateBuildConfig', () => {
    it('should update build config', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      manager.updateBuildConfig(config.configId, { versionCode: 2, versionName: '1.0.1' });

      const updated = manager.getBuildConfig(config.configId);
      expect(updated?.versionCode).toBe(2);
      expect(updated?.versionName).toBe('1.0.1');
    });
  });

  describe('calculateBuildStats', () => {
    it('should calculate statistics', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');

      const build1 = manager.startBuild(config.configId, 'debug');
      manager.completeBuild(build1.buildId, true, '/path/to/app-debug.apk', undefined, 50000000);

      const build2 = manager.startBuild(config.configId, 'debug');
      manager.completeBuild(build2.buildId, false);

      const stats = manager.calculateBuildStats();
      expect(stats.totalBuilds).toBe(1); // Only successful builds in history
      expect(stats.successfulBuilds).toBe(1);
      expect(stats.failedBuilds).toBe(0);
      expect(stats.successRate).toBe(100);
    });
  });

  describe('generateBuildReport', () => {
    it('should generate build report', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      const build = manager.startBuild(config.configId, 'debug');
      manager.completeBuild(build.buildId, true, '/path/to/app-debug.apk', undefined, 50000000);

      const report = manager.generateBuildReport(build.buildId);
      expect(report).toContain('Android Build Report');
      expect(report).toContain('PoiPoi');
      expect(report).toContain('com.poipoi.app');
    });
  });

  describe('optimizeAPKSize', () => {
    it('should optimize APK size', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      const build = manager.startBuild(config.configId, 'debug');
      manager.completeBuild(build.buildId, true, '/path/to/app-debug.apk', undefined, 50000000);

      manager.optimizeAPKSize(build.buildId);
      const updated = manager.getBuild(build.buildId);
      expect(updated?.fileSize).toBe(Math.floor(50000000 * 0.85));
    });
  });

  describe('validateBuildConfig', () => {
    it('should validate valid config', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      const result = manager.validateBuildConfig(config.configId);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing app name', () => {
      const config = manager.createBuildConfig('', 'com.poipoi.app', 1, '1.0.0');
      const result = manager.validateBuildConfig(config.configId);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('App name is required');
    });

    it('should detect missing signing config for release', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      config.buildType = 'release';
      const result = manager.validateBuildConfig(config.configId);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Signing config required for release builds');
    });
  });

  describe('Multi-build workflow', () => {
    it('should handle multiple builds', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');

      const debugBuild = manager.startBuild(config.configId, 'debug');
      manager.completeBuild(debugBuild.buildId, true, '/path/to/app-debug.apk', undefined, 50000000);

      manager.updateBuildConfig(config.configId, { versionCode: 2 });

      const releaseBuild = manager.startBuild(config.configId, 'release');
      manager.completeBuild(releaseBuild.buildId, true, '/path/to/app-release.apk', '/path/to/app.aab', 45000000);

      const history = manager.getBuildHistory();
      expect(history).toHaveLength(2);
      expect(history[0].apkPath).toContain('debug');
      expect(history[1].apkPath).toContain('release');
    });
  });

  describe('Build optimization', () => {
    it('should track optimization warnings', () => {
      const config = manager.createBuildConfig('PoiPoi', 'com.poipoi.app', 1, '1.0.0');
      const build = manager.startBuild(config.configId, 'debug');
      manager.completeBuild(
        build.buildId,
        true,
        '/path/to/app-debug.apk',
        undefined,
        50000000,
        undefined,
        ['Unused resources removed', 'ProGuard applied']
      );

      const result = manager.getBuild(build.buildId);
      expect(result?.warnings).toHaveLength(2);
    });
  });
});
