/**
 * AndroidBuildManager Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { androidBuildManager, AndroidBuildManager } from './AndroidBuildManager';

describe('AndroidBuildManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    androidBuildManager.cleanup();
  });

  afterEach(() => {
    androidBuildManager.cleanup();
  });

  describe('Build Management', () => {
    it('should start build', () => {
      const build = androidBuildManager.startBuild('release', '1.0.0', 1);
      expect(build.buildId).toBeDefined();
      expect(build.status).toBe('building');
    });

    it('should get build', () => {
      const started = androidBuildManager.startBuild('release', '1.0.0', 1);
      const build = androidBuildManager.getBuild(started.buildId);
      expect(build).not.toBeNull();
      expect(build?.version).toBe('1.0.0');
    });

    it('should get builds by type', () => {
      androidBuildManager.startBuild('release', '1.0.0', 1);
      androidBuildManager.startBuild('release', '1.0.1', 2);
      const builds = androidBuildManager.getBuildsByType('release');
      expect(builds.length).toBe(2);
    });
  });

  describe('Build Execution', () => {
    it('should success build', () => {
      const started = androidBuildManager.startBuild('release', '1.0.0', 1);
      const succeeded = androidBuildManager.successBuild(started.buildId, '/path/to/app.apk', 50000000);
      expect(succeeded?.status).toBe('success');
      expect(succeeded?.apkPath).toBe('/path/to/app.apk');
      expect(succeeded?.apkSize).toBe(50000000);
    });

    it('should fail build', () => {
      const started = androidBuildManager.startBuild('release', '1.0.0', 1);
      const failed = androidBuildManager.failBuild(started.buildId, 'Build compilation error');
      expect(failed?.status).toBe('failed');
      expect(failed?.errorMessage).toBe('Build compilation error');
    });
  });

  describe('Build Queries', () => {
    it('should get successful builds', () => {
      const build1 = androidBuildManager.startBuild('release', '1.0.0', 1);
      const build2 = androidBuildManager.startBuild('debug', '1.0.0', 1);

      androidBuildManager.successBuild(build1.buildId, '/path/to/app1.apk', 50000000);
      androidBuildManager.failBuild(build2.buildId, 'Failed');

      const successful = androidBuildManager.getSuccessfulBuilds();
      expect(successful.length).toBe(1);
    });

    it('should get failed builds', () => {
      const build1 = androidBuildManager.startBuild('release', '1.0.0', 1);
      const build2 = androidBuildManager.startBuild('debug', '1.0.0', 1);

      androidBuildManager.successBuild(build1.buildId, '/path/to/app1.apk', 50000000);
      androidBuildManager.failBuild(build2.buildId, 'Failed');

      const failed = androidBuildManager.getFailedBuilds();
      expect(failed.length).toBe(1);
    });
  });

  describe('Build Statistics', () => {
    it('should get build statistics', () => {
      const build1 = androidBuildManager.startBuild('release', '1.0.0', 1);
      const build2 = androidBuildManager.startBuild('debug', '1.0.0', 1);

      androidBuildManager.successBuild(build1.buildId, '/path/to/app1.apk', 50000000);
      androidBuildManager.successBuild(build2.buildId, '/path/to/app2.apk', 60000000);

      const stats = androidBuildManager.getBuildStatistics();
      expect(stats.totalBuilds).toBe(2);
      expect(stats.successfulBuilds).toBe(2);
      expect(stats.successRate).toBe(100);
    });

    it('should calculate APK size statistics', () => {
      const build1 = androidBuildManager.startBuild('release', '1.0.0', 1);
      const build2 = androidBuildManager.startBuild('debug', '1.0.0', 1);

      androidBuildManager.successBuild(build1.buildId, '/path/to/app1.apk', 50000000);
      androidBuildManager.successBuild(build2.buildId, '/path/to/app2.apk', 60000000);

      const stats = androidBuildManager.getBuildStatistics();
      expect(stats.totalAPKSize).toBe(110000000);
      expect(stats.averageAPKSize).toBe(55000000);
    });

    it('should calculate success rate with failures', () => {
      const build1 = androidBuildManager.startBuild('release', '1.0.0', 1);
      const build2 = androidBuildManager.startBuild('debug', '1.0.0', 1);

      androidBuildManager.successBuild(build1.buildId, '/path/to/app1.apk', 50000000);
      androidBuildManager.failBuild(build2.buildId, 'Failed');

      const stats = androidBuildManager.getBuildStatistics();
      expect(stats.successRate).toBe(50);
      expect(stats.failedBuilds).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      androidBuildManager.startBuild('release', '1.0.0', 1);
      androidBuildManager.cleanup();
      const stats = androidBuildManager.getBuildStatistics();
      expect(stats.totalBuilds).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = AndroidBuildManager.getInstance();
      const instance2 = AndroidBuildManager.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });

  describe('Multiple Build Types', () => {
    it('should handle multiple build types', () => {
      androidBuildManager.startBuild('debug', '1.0.0', 1);
      androidBuildManager.startBuild('release', '1.0.0', 1);
      androidBuildManager.startBuild('staging', '1.0.0', 1);

      const stats = androidBuildManager.getBuildStatistics();
      expect(stats.totalBuilds).toBe(3);
    });
  });
});
