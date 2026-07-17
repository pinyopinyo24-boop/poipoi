import { describe, it, expect, beforeEach } from 'vitest';

/**
 * AndroidBuildEnvironmentValidator
 * Android ビルド環境の検証
 */
export interface EnvironmentCheck {
  checkId: string;
  name: string;
  category: 'java' | 'gradle' | 'sdk' | 'keystore' | 'config';
  status: 'pending' | 'passed' | 'failed' | 'warning';
  message: string;
  timestamp: Date;
}

export interface BuildEnvironment {
  environmentId: string;
  javaVersion: string;
  gradleVersion: string;
  androidSdkVersion: number;
  buildToolsVersion: string;
  keystoreExists: boolean;
  configValid: boolean;
  checks: EnvironmentCheck[];
}

export class AndroidBuildEnvironmentValidator {
  private environments: Map<string, BuildEnvironment> = new Map();
  private checkHistory: EnvironmentCheck[] = [];

  /**
   * ビルド環境を作成
   */
  createEnvironment(
    javaVersion: string,
    gradleVersion: string,
    androidSdkVersion: number,
    buildToolsVersion: string
  ): BuildEnvironment {
    const environmentId = `env-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const environment: BuildEnvironment = {
      environmentId,
      javaVersion,
      gradleVersion,
      androidSdkVersion,
      buildToolsVersion,
      keystoreExists: false,
      configValid: false,
      checks: [],
    };

    this.environments.set(environmentId, environment);
    return environment;
  }

  /**
   * Java バージョンをチェック
   */
  checkJavaVersion(environmentId: string, expectedVersion: string): EnvironmentCheck {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      throw new Error('Environment not found');
    }

    const check: EnvironmentCheck = {
      checkId: `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: 'Java Version Check',
      category: 'java',
      status: 'pending',
      message: '',
      timestamp: new Date(),
    };

    if (environment.javaVersion === expectedVersion || environment.javaVersion.includes(expectedVersion)) {
      check.status = 'passed';
      check.message = `Java ${environment.javaVersion} is compatible`;
    } else {
      check.status = 'failed';
      check.message = `Java version mismatch. Expected: ${expectedVersion}, Got: ${environment.javaVersion}`;
    }

    environment.checks.push(check);
    this.checkHistory.push(check);
    return check;
  }

  /**
   * Gradle バージョンをチェック
   */
  checkGradleVersion(environmentId: string, minVersion: string): EnvironmentCheck {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      throw new Error('Environment not found');
    }

    const check: EnvironmentCheck = {
      checkId: `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: 'Gradle Version Check',
      category: 'gradle',
      status: 'pending',
      message: '',
      timestamp: new Date(),
    };

    const compareVersions = (v1: string, v2: string): number => {
      const parts1 = v1.split('.').map(Number);
      const parts2 = v2.split('.').map(Number);
      for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
      }
      return 0;
    };

    if (compareVersions(environment.gradleVersion, minVersion) >= 0) {
      check.status = 'passed';
      check.message = `Gradle ${environment.gradleVersion} is compatible`;
    } else {
      check.status = 'warning';
      check.message = `Gradle ${environment.gradleVersion} is older than recommended ${minVersion}`;
    }

    environment.checks.push(check);
    this.checkHistory.push(check);
    return check;
  }

  /**
   * Android SDK をチェック
   */
  checkAndroidSdk(environmentId: string, minSdkVersion: number): EnvironmentCheck {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      throw new Error('Environment not found');
    }

    const check: EnvironmentCheck = {
      checkId: `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: 'Android SDK Check',
      category: 'sdk',
      status: 'pending',
      message: '',
      timestamp: new Date(),
    };

    if (environment.androidSdkVersion >= minSdkVersion) {
      check.status = 'passed';
      check.message = `Android SDK ${environment.androidSdkVersion} is compatible`;
    } else {
      check.status = 'failed';
      check.message = `Android SDK ${environment.androidSdkVersion} is below minimum ${minSdkVersion}`;
    }

    environment.checks.push(check);
    this.checkHistory.push(check);
    return check;
  }

  /**
   * Keystore をチェック
   */
  checkKeystore(environmentId: string, keystoreExists: boolean): EnvironmentCheck {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      throw new Error('Environment not found');
    }

    environment.keystoreExists = keystoreExists;

    const check: EnvironmentCheck = {
      checkId: `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: 'Keystore Check',
      category: 'keystore',
      status: keystoreExists ? 'passed' : 'warning',
      message: keystoreExists ? 'Keystore found' : 'Keystore not found. Will use debug keystore.',
      timestamp: new Date(),
    };

    environment.checks.push(check);
    this.checkHistory.push(check);
    return check;
  }

  /**
   * 設定ファイルをチェック
   */
  checkConfiguration(environmentId: string, configValid: boolean): EnvironmentCheck {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      throw new Error('Environment not found');
    }

    environment.configValid = configValid;

    const check: EnvironmentCheck = {
      checkId: `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: 'Configuration Check',
      category: 'config',
      status: configValid ? 'passed' : 'failed',
      message: configValid ? 'Configuration is valid' : 'Configuration has errors',
      timestamp: new Date(),
    };

    environment.checks.push(check);
    this.checkHistory.push(check);
    return check;
  }

  /**
   * 環境を取得
   */
  getEnvironment(environmentId: string): BuildEnvironment | undefined {
    return this.environments.get(environmentId);
  }

  /**
   * すべての環境を取得
   */
  getAllEnvironments(): BuildEnvironment[] {
    return Array.from(this.environments.values());
  }

  /**
   * チェック履歴を取得
   */
  getCheckHistory(): EnvironmentCheck[] {
    return [...this.checkHistory];
  }

  /**
   * 環境を検証
   */
  validateEnvironment(environmentId: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      return { valid: false, errors: ['Environment not found'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    environment.checks.forEach((check) => {
      if (check.status === 'failed') {
        errors.push(check.message);
      } else if (check.status === 'warning') {
        warnings.push(check.message);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * ビルド前診断を実行
   */
  preBuildDiagnosis(environmentId: string): string {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      throw new Error('Environment not found');
    }

    const validation = this.validateEnvironment(environmentId);

    let report = `
=== Pre-Build Diagnosis Report ===
Environment ID: ${environment.environmentId}
Timestamp: ${new Date().toISOString()}

System Information:
  Java Version: ${environment.javaVersion}
  Gradle Version: ${environment.gradleVersion}
  Android SDK: ${environment.androidSdkVersion}
  Build Tools: ${environment.buildToolsVersion}

Configuration Status:
  Keystore: ${environment.keystoreExists ? 'Present' : 'Missing'}
  Config Valid: ${environment.configValid ? 'Yes' : 'No'}

Checks Performed:
`;

    environment.checks.forEach((check) => {
      report += `  [${check.status.toUpperCase()}] ${check.name}: ${check.message}\n`;
    });

    report += `
Overall Status: ${validation.valid ? 'READY FOR BUILD' : 'BUILD BLOCKED'}

${validation.errors.length > 0 ? `Errors:\n${validation.errors.map((e) => `  - ${e}`).join('\n')}\n` : ''}
${validation.warnings.length > 0 ? `Warnings:\n${validation.warnings.map((w) => `  - ${w}`).join('\n')}\n` : ''}
    `;

    return report.trim();
  }

  /**
   * ビルド環境統計を計算
   */
  calculateStats(): {
    totalEnvironments: number;
    validEnvironments: number;
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningChecks: number;
  } {
    const environments = Array.from(this.environments.values());
    const validEnvironments = environments.filter((e) => this.validateEnvironment(e.environmentId).valid).length;

    const passedChecks = this.checkHistory.filter((c) => c.status === 'passed').length;
    const failedChecks = this.checkHistory.filter((c) => c.status === 'failed').length;
    const warningChecks = this.checkHistory.filter((c) => c.status === 'warning').length;

    return {
      totalEnvironments: environments.length,
      validEnvironments,
      totalChecks: this.checkHistory.length,
      passedChecks,
      failedChecks,
      warningChecks,
    };
  }
}

// ============ TESTS ============

describe('AndroidBuildEnvironmentValidator', () => {
  let validator: AndroidBuildEnvironmentValidator;

  beforeEach(() => {
    validator = new AndroidBuildEnvironmentValidator();
  });

  describe('createEnvironment', () => {
    it('should create environment', () => {
      const env = validator.createEnvironment('21.0.10', '8.7', 34, '34.0.0');
      expect(env.javaVersion).toBe('21.0.10');
      expect(env.gradleVersion).toBe('8.7');
      expect(env.androidSdkVersion).toBe(34);
    });
  });

  describe('checkJavaVersion', () => {
    it('should pass for matching Java version', () => {
      const env = validator.createEnvironment('21.0.10', '8.7', 34, '34.0.0');
      const check = validator.checkJavaVersion(env.environmentId, '21');

      expect(check.status).toBe('passed');
    });

    it('should fail for mismatched Java version', () => {
      const env = validator.createEnvironment('11.0.10', '8.7', 34, '34.0.0');
      const check = validator.checkJavaVersion(env.environmentId, '21');

      expect(check.status).toBe('failed');
    });
  });

  describe('checkGradleVersion', () => {
    it('should pass for compatible Gradle version', () => {
      const env = validator.createEnvironment('21.0.10', '8.7', 34, '34.0.0');
      const check = validator.checkGradleVersion(env.environmentId, '8.0');

      expect(check.status).toBe('passed');
    });

    it('should warn for older Gradle version', () => {
      const env = validator.createEnvironment('21.0.10', '7.5', 34, '34.0.0');
      const check = validator.checkGradleVersion(env.environmentId, '8.0');

      expect(check.status).toBe('warning');
    });
  });

  describe('checkAndroidSdk', () => {
    it('should pass for compatible SDK version', () => {
      const env = validator.createEnvironment('21.0.10', '8.7', 34, '34.0.0');
      const check = validator.checkAndroidSdk(env.environmentId, 30);

      expect(check.status).toBe('passed');
    });

    it('should fail for incompatible SDK version', () => {
      const env = validator.createEnvironment('21.0.10', '8.7', 28, '34.0.0');
      const check = validator.checkAndroidSdk(env.environmentId, 30);

      expect(check.status).toBe('failed');
    });
  });

  describe('checkKeystore', () => {
    it('should pass when keystore exists', () => {
      const env = validator.createEnvironment('21.0.10', '8.7', 34, '34.0.0');
      const check = validator.checkKeystore(env.environmentId, true);

      expect(check.status).toBe('passed');
      expect(env.keystoreExists).toBe(true);
    });

    it('should warn when keystore missing', () => {
      const env = validator.createEnvironment('21.0.10', '8.7', 34, '34.0.0');
      const check = validator.checkKeystore(env.environmentId, false);

      expect(check.status).toBe('warning');
    });
  });

  describe('checkConfiguration', () => {
    it('should pass for valid configuration', () => {
      const env = validator.createEnvironment('21.0.10', '8.7', 34, '34.0.0');
      const check = validator.checkConfiguration(env.environmentId, true);

      expect(check.status).toBe('passed');
    });

    it('should fail for invalid configuration', () => {
      const env = validator.createEnvironment('21.0.10', '8.7', 34, '34.0.0');
      const check = validator.checkConfiguration(env.environmentId, false);

      expect(check.status).toBe('failed');
    });
  });

  describe('validateEnvironment', () => {
    it('should validate environment', () => {
      const env = validator.createEnvironment('21.0.10', '8.7', 34, '34.0.0');

      validator.checkJavaVersion(env.environmentId, '21');
      validator.checkGradleVersion(env.environmentId, '8.0');
      validator.checkAndroidSdk(env.environmentId, 30);
      validator.checkKeystore(env.environmentId, true);
      validator.checkConfiguration(env.environmentId, true);

      const result = validator.validateEnvironment(env.environmentId);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('preBuildDiagnosis', () => {
    it('should generate diagnosis report', () => {
      const env = validator.createEnvironment('21.0.10', '8.7', 34, '34.0.0');

      validator.checkJavaVersion(env.environmentId, '21');
      validator.checkGradleVersion(env.environmentId, '8.0');
      validator.checkAndroidSdk(env.environmentId, 30);
      validator.checkKeystore(env.environmentId, true);
      validator.checkConfiguration(env.environmentId, true);

      const report = validator.preBuildDiagnosis(env.environmentId);
      expect(report).toContain('Pre-Build Diagnosis Report');
      expect(report).toContain('READY FOR BUILD');
    });
  });

  describe('calculateStats', () => {
    it('should calculate statistics', () => {
      const env = validator.createEnvironment('21.0.10', '8.7', 34, '34.0.0');

      validator.checkJavaVersion(env.environmentId, '21');
      validator.checkGradleVersion(env.environmentId, '8.0');

      const stats = validator.calculateStats();
      expect(stats.totalEnvironments).toBe(1);
      expect(stats.totalChecks).toBe(2);
    });
  });

  describe('Complete environment validation workflow', () => {
    it('should handle complete validation workflow', () => {
      const env = validator.createEnvironment('21.0.10', '8.7', 34, '34.0.0');

      validator.checkJavaVersion(env.environmentId, '21');
      validator.checkGradleVersion(env.environmentId, '8.0');
      validator.checkAndroidSdk(env.environmentId, 30);
      validator.checkKeystore(env.environmentId, true);
      validator.checkConfiguration(env.environmentId, true);

      const validation = validator.validateEnvironment(env.environmentId);
      expect(validation.valid).toBe(true);

      const report = validator.preBuildDiagnosis(env.environmentId);
      expect(report).toContain('READY FOR BUILD');

      const stats = validator.calculateStats();
      expect(stats.validEnvironments).toBe(1);
    });
  });
});
