/**
 * DeploymentManager Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { deploymentManager, DeploymentManager } from './DeploymentManager';

describe('DeploymentManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deploymentManager.cleanup();
  });

  afterEach(() => {
    deploymentManager.cleanup();
  });

  // === バージョン管理テスト ===
  describe('Version Management', () => {
    it('should create version', () => {
      const version = deploymentManager.createVersion('1.0.0', ['Feature 1'], ['Bug fix 1'], [], 'Initial release');
      expect(version).not.toBeNull();
      expect(version.version).toBe('1.0.0');
    });

    it('should get version', () => {
      const created = deploymentManager.createVersion('1.0.0', ['Feature 1'], ['Bug fix 1'], [], 'Initial release');
      const retrieved = deploymentManager.getVersion(created.versionId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.version).toBe('1.0.0');
    });

    it('should get all versions', () => {
      deploymentManager.createVersion('1.0.0', ['Feature 1'], ['Bug fix 1'], [], 'Initial release');
      deploymentManager.createVersion('1.1.0', ['Feature 2'], ['Bug fix 2'], [], 'Minor update');
      const versions = deploymentManager.getAllVersions();
      expect(versions.length).toBe(2);
    });

    it('should release version', () => {
      const created = deploymentManager.createVersion('1.0.0', ['Feature 1'], ['Bug fix 1'], [], 'Initial release');
      const released = deploymentManager.releaseVersion(created.versionId);
      expect(released?.status).toBe('released');
    });
  });

  // === リリース管理テスト ===
  describe('Release Management', () => {
    it('should create release', () => {
      const release = deploymentManager.createRelease('1.0.0', Date.now() + 86400000, 'Changelog', ['production']);
      expect(release).not.toBeNull();
      expect(release.version).toBe('1.0.0');
    });

    it('should get release', () => {
      const created = deploymentManager.createRelease('1.0.0', Date.now() + 86400000, 'Changelog', ['production']);
      const retrieved = deploymentManager.getRelease(created.releaseId);
      expect(retrieved).not.toBeNull();
    });

    it('should get all releases', () => {
      deploymentManager.createRelease('1.0.0', Date.now() + 86400000, 'Changelog 1', ['production']);
      deploymentManager.createRelease('1.1.0', Date.now() + 86400000, 'Changelog 2', ['staging']);
      const releases = deploymentManager.getAllReleases();
      expect(releases.length).toBe(2);
    });

    it('should update release status', () => {
      const created = deploymentManager.createRelease('1.0.0', Date.now() + 86400000, 'Changelog', ['production']);
      const updated = deploymentManager.updateReleaseStatus(created.releaseId, 'completed');
      expect(updated?.status).toBe('completed');
    });
  });

  // === ロールバック管理テスト ===
  describe('Rollback Management', () => {
    it('should execute rollback', () => {
      const rollback = deploymentManager.executeRollback('1.1.0', '1.0.0', 'Critical bug', 'success', {});
      expect(rollback).not.toBeNull();
      expect(rollback.status).toBe('success');
    });

    it('should get rollback', () => {
      const created = deploymentManager.executeRollback('1.1.0', '1.0.0', 'Critical bug', 'success', {});
      const retrieved = deploymentManager.getRollback(created.rollbackId);
      expect(retrieved).not.toBeNull();
    });

    it('should get rollback history', () => {
      deploymentManager.executeRollback('1.1.0', '1.0.0', 'Critical bug 1', 'success', {});
      deploymentManager.executeRollback('1.2.0', '1.1.0', 'Critical bug 2', 'success', {});
      const history = deploymentManager.getRollbackHistory();
      expect(history.length).toBe(2);
    });
  });

  // === デプロイメント統計テスト ===
  describe('Deployment Statistics', () => {
    it('should get deployment statistics', () => {
      deploymentManager.createVersion('1.0.0', ['Feature 1'], ['Bug fix 1'], [], 'Initial release');
      deploymentManager.createRelease('1.0.0', Date.now() + 86400000, 'Changelog', ['production']);
      const stats = deploymentManager.getDeploymentStatistics();
      expect(stats.totalVersions).toBe(1);
    });

    it('should count released versions', () => {
      const v1 = deploymentManager.createVersion('1.0.0', ['Feature 1'], ['Bug fix 1'], [], 'Initial release');
      const v2 = deploymentManager.createVersion('1.1.0', ['Feature 2'], ['Bug fix 2'], [], 'Minor update');
      deploymentManager.releaseVersion(v1.versionId);
      const stats = deploymentManager.getDeploymentStatistics();
      expect(stats.releasedVersions).toBe(1);
    });

    it('should count successful rollbacks', () => {
      deploymentManager.executeRollback('1.1.0', '1.0.0', 'Critical bug', 'success', {});
      deploymentManager.executeRollback('1.2.0', '1.1.0', 'Critical bug', 'failed', {});
      const stats = deploymentManager.getDeploymentStatistics();
      expect(stats.successfulRollbacks).toBe(1);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup', () => {
      deploymentManager.createVersion('1.0.0', ['Feature 1'], ['Bug fix 1'], [], 'Initial release');
      deploymentManager.cleanup();
      const versions = deploymentManager.getAllVersions();
      expect(versions.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = DeploymentManager.getInstance();
      const instance2 = DeploymentManager.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
