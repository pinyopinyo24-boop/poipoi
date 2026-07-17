/**
 * ReleaseReadinessService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { releaseReadinessService, ReleaseReadinessService } from './ReleaseReadinessService';

describe('ReleaseReadinessService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    releaseReadinessService.cleanup();
  });

  afterEach(() => {
    releaseReadinessService.cleanup();
  });

  describe('Release Readiness Check', () => {
    it('should start release readiness check', () => {
      const readiness = releaseReadinessService.startReleaseReadinessCheck('1.0.0');
      expect(readiness.readinessId).toBeDefined();
      expect(readiness.status).toBe('checking');
    });

    it('should get release readiness', () => {
      const started = releaseReadinessService.startReleaseReadinessCheck('1.0.0');
      const readiness = releaseReadinessService.getReleaseReadiness(started.readinessId);
      expect(readiness).not.toBeNull();
      expect(readiness?.version).toBe('1.0.0');
    });

    it('should add readiness check', () => {
      const readiness = releaseReadinessService.startReleaseReadinessCheck('1.0.0');
      const check = releaseReadinessService.addReadinessCheck(
        readiness.readinessId,
        'functionality',
        'Chat feature test',
        'critical'
      );
      expect(check).not.toBeNull();
      expect(check?.status).toBe('pending');
    });
  });

  describe('Readiness Check Execution', () => {
    it('should pass readiness check', () => {
      const readiness = releaseReadinessService.startReleaseReadinessCheck('1.0.0');
      const check = releaseReadinessService.addReadinessCheck(
        readiness.readinessId,
        'functionality',
        'Chat feature test',
        'critical'
      );
      const passed = releaseReadinessService.passReadinessCheck(readiness.readinessId, check!.checkId, 'Passed');
      expect(passed?.status).toBe('passed');
    });

    it('should fail readiness check', () => {
      const readiness = releaseReadinessService.startReleaseReadinessCheck('1.0.0');
      const check = releaseReadinessService.addReadinessCheck(
        readiness.readinessId,
        'functionality',
        'Chat feature test',
        'critical'
      );
      const failed = releaseReadinessService.failReadinessCheck(
        readiness.readinessId,
        check!.checkId,
        'Chat feature failed'
      );
      expect(failed?.status).toBe('failed');
      expect(failed?.message).toBe('Chat feature failed');
    });

    it('should warn readiness check', () => {
      const readiness = releaseReadinessService.startReleaseReadinessCheck('1.0.0');
      const check = releaseReadinessService.addReadinessCheck(
        readiness.readinessId,
        'performance',
        'Performance test',
        'medium'
      );
      const warned = releaseReadinessService.warnReadinessCheck(
        readiness.readinessId,
        check!.checkId,
        'Performance below expected'
      );
      expect(warned?.status).toBe('warning');
    });
  });

  describe('Release Readiness Completion', () => {
    it('should complete release readiness check - ready', () => {
      const readiness = releaseReadinessService.startReleaseReadinessCheck('1.0.0');
      const check1 = releaseReadinessService.addReadinessCheck(
        readiness.readinessId,
        'functionality',
        'Test 1',
        'critical'
      );
      const check2 = releaseReadinessService.addReadinessCheck(
        readiness.readinessId,
        'security',
        'Test 2',
        'critical'
      );

      releaseReadinessService.passReadinessCheck(readiness.readinessId, check1!.checkId);
      releaseReadinessService.passReadinessCheck(readiness.readinessId, check2!.checkId);

      const completed = releaseReadinessService.completeReleaseReadinessCheck(readiness.readinessId);
      expect(completed?.readyForRelease).toBe(true);
      expect(completed?.status).toBe('ready');
    });

    it('should complete release readiness check - not ready', () => {
      const readiness = releaseReadinessService.startReleaseReadinessCheck('1.0.0');
      const check1 = releaseReadinessService.addReadinessCheck(
        readiness.readinessId,
        'functionality',
        'Test 1',
        'critical'
      );
      const check2 = releaseReadinessService.addReadinessCheck(
        readiness.readinessId,
        'security',
        'Test 2',
        'critical'
      );

      releaseReadinessService.passReadinessCheck(readiness.readinessId, check1!.checkId);
      releaseReadinessService.failReadinessCheck(readiness.readinessId, check2!.checkId, 'Failed');

      const completed = releaseReadinessService.completeReleaseReadinessCheck(readiness.readinessId);
      expect(completed?.readyForRelease).toBe(false);
      expect(completed?.status).toBe('notReady');
    });
  });

  describe('Release Readiness Statistics', () => {
    it('should get release readiness statistics', () => {
      const readiness = releaseReadinessService.startReleaseReadinessCheck('1.0.0');
      const check1 = releaseReadinessService.addReadinessCheck(
        readiness.readinessId,
        'functionality',
        'Test 1',
        'critical'
      );
      const check2 = releaseReadinessService.addReadinessCheck(
        readiness.readinessId,
        'security',
        'Test 2',
        'critical'
      );

      releaseReadinessService.passReadinessCheck(readiness.readinessId, check1!.checkId);
      releaseReadinessService.passReadinessCheck(readiness.readinessId, check2!.checkId);

      const stats = releaseReadinessService.getReleaseReadinessStatistics(readiness.readinessId);
      expect(stats?.totalChecks).toBe(2);
      expect(stats?.passedChecks).toBe(2);
      expect(stats?.successRate).toBe(100);
    });

    it('should detect critical failures', () => {
      const readiness = releaseReadinessService.startReleaseReadinessCheck('1.0.0');
      const check1 = releaseReadinessService.addReadinessCheck(
        readiness.readinessId,
        'functionality',
        'Test 1',
        'critical'
      );
      const check2 = releaseReadinessService.addReadinessCheck(
        readiness.readinessId,
        'security',
        'Test 2',
        'medium'
      );

      releaseReadinessService.failReadinessCheck(readiness.readinessId, check1!.checkId, 'Failed');
      releaseReadinessService.failReadinessCheck(readiness.readinessId, check2!.checkId, 'Failed');

      const stats = releaseReadinessService.getReleaseReadinessStatistics(readiness.readinessId);
      expect(stats?.criticalFailures).toBe(1);
      expect(stats?.failedChecks).toBe(2);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      releaseReadinessService.startReleaseReadinessCheck('1.0.0');
      releaseReadinessService.cleanup();
      const readiness = releaseReadinessService.getReleaseReadiness('invalid');
      expect(readiness).toBeNull();
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = ReleaseReadinessService.getInstance();
      const instance2 = ReleaseReadinessService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });

  describe('Multiple Categories', () => {
    it('should handle multiple categories', () => {
      const readiness = releaseReadinessService.startReleaseReadinessCheck('1.0.0');
      releaseReadinessService.addReadinessCheck(readiness.readinessId, 'functionality', 'Test 1', 'critical');
      releaseReadinessService.addReadinessCheck(readiness.readinessId, 'performance', 'Test 2', 'high');
      releaseReadinessService.addReadinessCheck(readiness.readinessId, 'security', 'Test 3', 'critical');
      releaseReadinessService.addReadinessCheck(readiness.readinessId, 'dataIntegrity', 'Test 4', 'high');
      releaseReadinessService.addReadinessCheck(readiness.readinessId, 'documentation', 'Test 5', 'medium');

      const stats = releaseReadinessService.getReleaseReadinessStatistics(readiness.readinessId);
      expect(stats?.totalChecks).toBe(5);
    });
  });
});
