import { describe, it, expect, beforeEach } from 'vitest';

/**
 * AndroidAPKBuildManager
 * Android APK/AAB生成・署名・最適化管理
 */
export interface BuildArtifact {
  artifactId: string;
  type: 'apk-debug' | 'apk-release' | 'aab';
  filePath: string;
  fileSize: number;
  sha256: string;
  buildTime: number;
  status: 'pending' | 'building' | 'completed' | 'failed';
  errorMessage?: string;
  timestamp: Date;
}

export interface BuildConfiguration {
  configId: string;
  versionCode: number;
  versionName: string;
  packageName: string;
  minSdkVersion: number;
  targetSdkVersion: number;
  compileSdkVersion: number;
  buildToolsVersion: string;
  keystore: {
    path: string;
    alias: string;
    storePassword: string;
    keyPassword: string;
  };
  optimization: {
    minifyEnabled: boolean;
    proguardRules: string;
    resourceShrinking: boolean;
  };
}

export class AndroidAPKBuildManager {
  private artifacts: Map<string, BuildArtifact> = new Map();
  private buildConfigs: Map<string, BuildConfiguration> = new Map();
  private buildHistory: BuildArtifact[] = [];
  private buildStats: Map<string, { count: number; totalTime: number; successCount: number }> = new Map();

  /**
   * ビルド設定を作成
   */
  createBuildConfig(
    versionCode: number,
    versionName: string,
    packageName: string,
    keystorePath: string
  ): BuildConfiguration {
    const configId = `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const config: BuildConfiguration = {
      configId,
      versionCode,
      versionName,
      packageName,
      minSdkVersion: 21,
      targetSdkVersion: 34,
      compileSdkVersion: 34,
      buildToolsVersion: '34.0.0',
      keystore: {
        path: keystorePath,
        alias: 'poipoi-key',
        storePassword: 'poipoi123',
        keyPassword: 'poipoi123',
      },
      optimization: {
        minifyEnabled: true,
        proguardRules: 'proguard-rules.pro',
        resourceShrinking: true,
      },
    };

    this.buildConfigs.set(configId, config);
    return config;
  }

  /**
   * Debug APKをビルド
   */
  buildDebugAPK(configId: string): BuildArtifact {
    const config = this.buildConfigs.get(configId);
    if (!config) {
      throw new Error('Build config not found');
    }

    const artifactId = `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const artifact: BuildArtifact = {
      artifactId,
      type: 'apk-debug',
      filePath: `build/outputs/apk/debug/app-debug.apk`,
      fileSize: 0,
      sha256: '',
      buildTime: 0,
      status: 'building',
      timestamp: new Date(),
    };

    // シミュレーション: ビルド実行
    const buildTime = Math.random() * 30000 + 20000; // 20-50秒
    artifact.buildTime = Math.floor(buildTime);
    artifact.fileSize = Math.floor(Math.random() * 10000000 + 50000000); // 50-60MB
    artifact.sha256 = this.generateSHA256();
    artifact.status = 'completed';

    this.artifacts.set(artifactId, artifact);
    this.buildHistory.push(artifact);
    this.updateBuildStats('debug', artifact.buildTime, true);

    return artifact;
  }

  /**
   * Release APKをビルド
   */
  buildReleaseAPK(configId: string): BuildArtifact {
    const config = this.buildConfigs.get(configId);
    if (!config) {
      throw new Error('Build config not found');
    }

    const artifactId = `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const artifact: BuildArtifact = {
      artifactId,
      type: 'apk-release',
      filePath: `build/outputs/apk/release/app-release.apk`,
      fileSize: 0,
      sha256: '',
      buildTime: 0,
      status: 'building',
      timestamp: new Date(),
    };

    // シミュレーション: ビルド実行
    const buildTime = Math.random() * 40000 + 30000; // 30-70秒
    artifact.buildTime = Math.floor(buildTime);
    artifact.fileSize = Math.floor(Math.random() * 5000000 + 35000000); // 35-40MB (最適化済み)
    artifact.sha256 = this.generateSHA256();
    artifact.status = 'completed';

    this.artifacts.set(artifactId, artifact);
    this.buildHistory.push(artifact);
    this.updateBuildStats('release', artifact.buildTime, true);

    return artifact;
  }

  /**
   * AAB (Android App Bundle) をビルド
   */
  buildAAB(configId: string): BuildArtifact {
    const config = this.buildConfigs.get(configId);
    if (!config) {
      throw new Error('Build config not found');
    }

    const artifactId = `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const artifact: BuildArtifact = {
      artifactId,
      type: 'aab',
      filePath: `build/outputs/bundle/release/app-release.aab`,
      fileSize: 0,
      sha256: '',
      buildTime: 0,
      status: 'building',
      timestamp: new Date(),
    };

    // シミュレーション: ビルド実行
    const buildTime = Math.random() * 50000 + 40000; // 40-90秒
    artifact.buildTime = Math.floor(buildTime);
    artifact.fileSize = Math.floor(Math.random() * 4000000 + 30000000); // 30-34MB
    artifact.sha256 = this.generateSHA256();
    artifact.status = 'completed';

    this.artifacts.set(artifactId, artifact);
    this.buildHistory.push(artifact);
    this.updateBuildStats('aab', artifact.buildTime, true);

    return artifact;
  }

  /**
   * APKに署名
   */
  signAPK(artifactId: string, keystorePath: string): boolean {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) {
      throw new Error('Artifact not found');
    }

    if (artifact.type === 'apk-debug') {
      artifact.filePath = artifact.filePath.replace('app-debug.apk', 'app-debug-signed.apk');
    } else if (artifact.type === 'apk-release') {
      artifact.filePath = artifact.filePath.replace('app-release.apk', 'app-release-signed.apk');
    }

    return true;
  }

  /**
   * APKを最適化
   */
  optimizeAPK(artifactId: string): boolean {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) {
      throw new Error('Artifact not found');
    }

    // ファイルサイズを10-20%削減
    const reduction = Math.random() * 0.1 + 0.1;
    artifact.fileSize = Math.floor(artifact.fileSize * (1 - reduction));

    return true;
  }

  /**
   * ビルドアーティファクトを取得
   */
  getArtifact(artifactId: string): BuildArtifact | undefined {
    return this.artifacts.get(artifactId);
  }

  /**
   * すべてのアーティファクトを取得
   */
  getAllArtifacts(): BuildArtifact[] {
    return Array.from(this.artifacts.values());
  }

  /**
   * ビルド履歴を取得
   */
  getBuildHistory(): BuildArtifact[] {
    return [...this.buildHistory];
  }

  /**
   * ビルド統計を計算
   */
  calculateBuildStats(): {
    totalBuilds: number;
    successfulBuilds: number;
    failedBuilds: number;
    averageBuildTime: number;
    totalSize: number;
  } {
    const totalBuilds = this.buildHistory.length;
    const successfulBuilds = this.buildHistory.filter((a) => a.status === 'completed').length;
    const failedBuilds = this.buildHistory.filter((a) => a.status === 'failed').length;

    let totalTime = 0;
    this.buildHistory.forEach((a) => {
      totalTime += a.buildTime;
    });

    const averageBuildTime = totalBuilds > 0 ? totalTime / totalBuilds : 0;

    let totalSize = 0;
    this.buildHistory.forEach((a) => {
      totalSize += a.fileSize;
    });

    return {
      totalBuilds,
      successfulBuilds,
      failedBuilds,
      averageBuildTime,
      totalSize,
    };
  }

  /**
   * ビルドレポートを生成
   */
  generateBuildReport(configId: string): string {
    const config = this.buildConfigs.get(configId);
    if (!config) {
      throw new Error('Build config not found');
    }

    const stats = this.calculateBuildStats();

    let report = `
=== Android APK Build Report ===
Build Configuration ID: ${config.configId}
Version: ${config.versionName} (Code: ${config.versionCode})
Package: ${config.packageName}
Timestamp: ${new Date().toISOString()}

Build Statistics:
  Total Builds: ${stats.totalBuilds}
  Successful: ${stats.successfulBuilds}
  Failed: ${stats.failedBuilds}
  Average Build Time: ${(stats.averageBuildTime / 1000).toFixed(2)}s
  Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB

Build Artifacts:
`;

    this.buildHistory.forEach((artifact) => {
      report += `
  [${artifact.status.toUpperCase()}] ${artifact.type}
    File: ${artifact.filePath}
    Size: ${(artifact.fileSize / 1024 / 1024).toFixed(2)}MB
    Build Time: ${(artifact.buildTime / 1000).toFixed(2)}s
    SHA256: ${artifact.sha256}
`;
    });

    report += `

Build Configuration:
  Min SDK: ${config.minSdkVersion}
  Target SDK: ${config.targetSdkVersion}
  Compile SDK: ${config.compileSdkVersion}
  Build Tools: ${config.buildToolsVersion}
  Minify: ${config.optimization.minifyEnabled}
  Resource Shrinking: ${config.optimization.resourceShrinking}
    `;

    return report.trim();
  }

  /**
   * SHA256ハッシュを生成 (シミュレーション)
   */
  private generateSHA256(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * ビルド統計を更新
   */
  private updateBuildStats(type: string, buildTime: number, success: boolean): void {
    const current = this.buildStats.get(type) || { count: 0, totalTime: 0, successCount: 0 };
    current.count++;
    current.totalTime += buildTime;
    if (success) {
      current.successCount++;
    }
    this.buildStats.set(type, current);
  }
}

// ============ TESTS ============

describe('AndroidAPKBuildManager', () => {
  let manager: AndroidAPKBuildManager;

  beforeEach(() => {
    manager = new AndroidAPKBuildManager();
  });

  describe('createBuildConfig', () => {
    it('should create build configuration', () => {
      const config = manager.createBuildConfig(1, '1.0.0', 'com.poipoi.app', '.android/poipoi.keystore');

      expect(config.versionCode).toBe(1);
      expect(config.versionName).toBe('1.0.0');
      expect(config.packageName).toBe('com.poipoi.app');
    });
  });

  describe('buildDebugAPK', () => {
    it('should build debug APK', () => {
      const config = manager.createBuildConfig(1, '1.0.0', 'com.poipoi.app', '.android/poipoi.keystore');
      const artifact = manager.buildDebugAPK(config.configId);

      expect(artifact.type).toBe('apk-debug');
      expect(artifact.status).toBe('completed');
      expect(artifact.fileSize).toBeGreaterThan(0);
      expect(artifact.sha256).toHaveLength(64);
    });
  });

  describe('buildReleaseAPK', () => {
    it('should build release APK', () => {
      const config = manager.createBuildConfig(1, '1.0.0', 'com.poipoi.app', '.android/poipoi.keystore');
      const artifact = manager.buildReleaseAPK(config.configId);

      expect(artifact.type).toBe('apk-release');
      expect(artifact.status).toBe('completed');
      expect(artifact.fileSize).toBeGreaterThan(0);
    });
  });

  describe('buildAAB', () => {
    it('should build AAB', () => {
      const config = manager.createBuildConfig(1, '1.0.0', 'com.poipoi.app', '.android/poipoi.keystore');
      const artifact = manager.buildAAB(config.configId);

      expect(artifact.type).toBe('aab');
      expect(artifact.status).toBe('completed');
      expect(artifact.fileSize).toBeGreaterThan(0);
    });
  });

  describe('signAPK', () => {
    it('should sign APK', () => {
      const config = manager.createBuildConfig(1, '1.0.0', 'com.poipoi.app', '.android/poipoi.keystore');
      const artifact = manager.buildDebugAPK(config.configId);

      const result = manager.signAPK(artifact.artifactId, '.android/poipoi.keystore');
      expect(result).toBe(true);
    });
  });

  describe('optimizeAPK', () => {
    it('should optimize APK', () => {
      const config = manager.createBuildConfig(1, '1.0.0', 'com.poipoi.app', '.android/poipoi.keystore');
      const artifact = manager.buildReleaseAPK(config.configId);

      const originalSize = artifact.fileSize;
      manager.optimizeAPK(artifact.artifactId);

      expect(artifact.fileSize).toBeLessThan(originalSize);
    });
  });

  describe('calculateBuildStats', () => {
    it('should calculate build statistics', () => {
      const config = manager.createBuildConfig(1, '1.0.0', 'com.poipoi.app', '.android/poipoi.keystore');

      manager.buildDebugAPK(config.configId);
      manager.buildReleaseAPK(config.configId);
      manager.buildAAB(config.configId);

      const stats = manager.calculateBuildStats();
      expect(stats.totalBuilds).toBe(3);
      expect(stats.successfulBuilds).toBe(3);
      expect(stats.averageBuildTime).toBeGreaterThan(0);
    });
  });

  describe('generateBuildReport', () => {
    it('should generate build report', () => {
      const config = manager.createBuildConfig(1, '1.0.0', 'com.poipoi.app', '.android/poipoi.keystore');

      manager.buildDebugAPK(config.configId);
      manager.buildReleaseAPK(config.configId);

      const report = manager.generateBuildReport(config.configId);
      expect(report).toContain('Android APK Build Report');
      expect(report).toContain('1.0.0');
      expect(report).toContain('com.poipoi.app');
    });
  });

  describe('Complete build workflow', () => {
    it('should handle complete build workflow', () => {
      const config = manager.createBuildConfig(1, '1.0.0', 'com.poipoi.app', '.android/poipoi.keystore');

      const debugAPK = manager.buildDebugAPK(config.configId);
      const releaseAPK = manager.buildReleaseAPK(config.configId);
      const aab = manager.buildAAB(config.configId);

      manager.signAPK(debugAPK.artifactId, '.android/poipoi.keystore');
      manager.signAPK(releaseAPK.artifactId, '.android/poipoi.keystore');
      manager.optimizeAPK(releaseAPK.artifactId);

      const artifacts = manager.getAllArtifacts();
      expect(artifacts).toHaveLength(3);

      const stats = manager.calculateBuildStats();
      expect(stats.totalBuilds).toBe(3);
      expect(stats.successfulBuilds).toBe(3);
    });
  });
});
