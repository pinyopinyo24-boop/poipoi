/**
 * DeploymentReleaseManager Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { deploymentReleaseManager, DeploymentReleaseManager } from './DeploymentReleaseManager';

describe('DeploymentReleaseManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deploymentReleaseManager.cleanup();
  });

  afterEach(() => {
    deploymentReleaseManager.cleanup();
  });

  describe('Release Planning', () => {
    it('should plan release', () => {
      const release = deploymentReleaseManager.planRelease('1.0.0', 'staging', 'Initial release', 'Test release');
      expect(release).not.toBeNull();
      expect(release.status).toBe('planning');
    });

    it('should get release', () => {
      const planned = deploymentReleaseManager.planRelease('1.0.0', 'staging', 'Initial release', 'Test release');
      const retrieved = deploymentReleaseManager.getRelease(planned.releaseId);
      expect(retrieved).not.toBeNull();
    });

    it('should get all releases', () => {
      deploymentReleaseManager.planRelease('1.0.0', 'staging', 'Release 1', 'Test 1');
      deploymentReleaseManager.planRelease('1.1.0', 'production', 'Release 2', 'Test 2');
      const releases = deploymentReleaseManager.getAllReleases();
      expect(releases.length).toBe(2);
    });
  });

  describe('Release Approval', () => {
    it('should approve release', () => {
      const planned = deploymentReleaseManager.planRelease('1.0.0', 'staging', 'Initial release', 'Test release');
      const approved = deploymentReleaseManager.approveRelease(planned.releaseId, 'admin');
      expect(approved?.status).toBe('approved');
    });
  });

  describe('Deployment Lifecycle', () => {
    it('should start deployment', () => {
      const planned = deploymentReleaseManager.planRelease('1.0.0', 'staging', 'Initial release', 'Test release');
      deploymentReleaseManager.approveRelease(planned.releaseId, 'admin');
      const deployment = deploymentReleaseManager.startDeployment(planned.releaseId, 'deployer');
      expect(deployment).not.toBeNull();
      expect(deployment?.status).toBe('in_progress');
    });

    it('should complete deployment', () => {
      const planned = deploymentReleaseManager.planRelease('1.0.0', 'staging', 'Initial release', 'Test release');
      deploymentReleaseManager.approveRelease(planned.releaseId, 'admin');
      const deployment = deploymentReleaseManager.startDeployment(planned.releaseId, 'deployer');
      if (deployment) {
        const completed = deploymentReleaseManager.completeDeployment(deployment.deploymentId);
        expect(completed?.status).toBe('success');
      }
    });

    it('should fail deployment', () => {
      const planned = deploymentReleaseManager.planRelease('1.0.0', 'staging', 'Initial release', 'Test release');
      deploymentReleaseManager.approveRelease(planned.releaseId, 'admin');
      const deployment = deploymentReleaseManager.startDeployment(planned.releaseId, 'deployer');
      if (deployment) {
        const failed = deploymentReleaseManager.failDeployment(deployment.deploymentId, 'Connection timeout');
        expect(failed?.status).toBe('failed');
      }
    });
  });

  describe('Deployment Logs', () => {
    it('should add deployment log', () => {
      const planned = deploymentReleaseManager.planRelease('1.0.0', 'staging', 'Initial release', 'Test release');
      deploymentReleaseManager.approveRelease(planned.releaseId, 'admin');
      const deployment = deploymentReleaseManager.startDeployment(planned.releaseId, 'deployer');
      if (deployment) {
        deploymentReleaseManager.addDeploymentLog(deployment.deploymentId, 'Starting deployment');
        const retrieved = deploymentReleaseManager.getDeployment(deployment.deploymentId);
        expect(retrieved?.logs.length).toBe(1);
      }
    });
  });

  describe('Environment Management', () => {
    it('should get releases by environment', () => {
      deploymentReleaseManager.planRelease('1.0.0', 'staging', 'Release 1', 'Test 1');
      deploymentReleaseManager.planRelease('1.1.0', 'production', 'Release 2', 'Test 2');
      const stagingReleases = deploymentReleaseManager.getReleasesByEnvironment('staging');
      expect(stagingReleases.length).toBe(1);
    });
  });

  describe('Statistics', () => {
    it('should get statistics', () => {
      deploymentReleaseManager.planRelease('1.0.0', 'staging', 'Release 1', 'Test 1');
      const stats = deploymentReleaseManager.getStatistics();
      expect(stats.totalReleases).toBe(1);
    });

    it('should count successful deployments', () => {
      const planned = deploymentReleaseManager.planRelease('1.0.0', 'staging', 'Initial release', 'Test release');
      deploymentReleaseManager.approveRelease(planned.releaseId, 'admin');
      const deployment = deploymentReleaseManager.startDeployment(planned.releaseId, 'deployer');
      if (deployment) {
        deploymentReleaseManager.completeDeployment(deployment.deploymentId);
      }
      const stats = deploymentReleaseManager.getStatistics();
      expect(stats.successfulDeployments).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      deploymentReleaseManager.planRelease('1.0.0', 'staging', 'Release 1', 'Test 1');
      deploymentReleaseManager.cleanup();
      const releases = deploymentReleaseManager.getAllReleases();
      expect(releases.length).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = DeploymentReleaseManager.getInstance();
      const instance2 = DeploymentReleaseManager.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
