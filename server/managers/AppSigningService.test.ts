/**
 * AppSigningService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { appSigningService, AppSigningService } from './AppSigningService';

describe('AppSigningService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appSigningService.cleanup();
  });

  afterEach(() => {
    appSigningService.cleanup();
  });

  describe('App Signing', () => {
    it('should start signing', () => {
      const signing = appSigningService.startSigning('/path/to/app.apk', '/path/to/keystore', 'release');
      expect(signing.signingId).toBeDefined();
      expect(signing.status).toBe('signing');
    });

    it('should get signing', () => {
      const started = appSigningService.startSigning('/path/to/app.apk', '/path/to/keystore', 'release');
      const signing = appSigningService.getSigning(started.signingId);
      expect(signing).not.toBeNull();
      expect(signing?.apkPath).toBe('/path/to/app.apk');
    });
  });

  describe('Signing Execution', () => {
    it('should verify signing', () => {
      const started = appSigningService.startSigning('/path/to/app.apk', '/path/to/keystore', 'release');
      const verified = appSigningService.verifySigning(
        started.signingId,
        '/path/to/signed.apk',
        'ABC123DEF456'
      );
      expect(verified?.status).toBe('verified');
      expect(verified?.certificateFingerprint).toBe('ABC123DEF456');
    });

    it('should fail signing', () => {
      const started = appSigningService.startSigning('/path/to/app.apk', '/path/to/keystore', 'release');
      const failed = appSigningService.failSigning(started.signingId, 'Invalid keystore password');
      expect(failed?.status).toBe('failed');
      expect(failed?.errorMessage).toBe('Invalid keystore password');
    });
  });

  describe('Signing Queries', () => {
    it('should get verified signings', () => {
      const signing1 = appSigningService.startSigning('/path/to/app1.apk', '/path/to/keystore', 'release');
      const signing2 = appSigningService.startSigning('/path/to/app2.apk', '/path/to/keystore', 'release');

      appSigningService.verifySigning(signing1.signingId, '/path/to/signed1.apk', 'ABC123');
      appSigningService.failSigning(signing2.signingId, 'Failed');

      const verified = appSigningService.getVerifiedSignings();
      expect(verified.length).toBe(1);
    });

    it('should get failed signings', () => {
      const signing1 = appSigningService.startSigning('/path/to/app1.apk', '/path/to/keystore', 'release');
      const signing2 = appSigningService.startSigning('/path/to/app2.apk', '/path/to/keystore', 'release');

      appSigningService.verifySigning(signing1.signingId, '/path/to/signed1.apk', 'ABC123');
      appSigningService.failSigning(signing2.signingId, 'Failed');

      const failed = appSigningService.getFailedSignings();
      expect(failed.length).toBe(1);
    });
  });

  describe('Signing Statistics', () => {
    it('should get signing statistics', () => {
      const signing1 = appSigningService.startSigning('/path/to/app1.apk', '/path/to/keystore', 'release');
      const signing2 = appSigningService.startSigning('/path/to/app2.apk', '/path/to/keystore', 'release');

      appSigningService.verifySigning(signing1.signingId, '/path/to/signed1.apk', 'ABC123');
      appSigningService.verifySigning(signing2.signingId, '/path/to/signed2.apk', 'DEF456');

      const stats = appSigningService.getSigningStatistics();
      expect(stats.totalSignings).toBe(2);
      expect(stats.verifiedSignings).toBe(2);
      expect(stats.successRate).toBe(100);
    });

    it('should calculate success rate with failures', () => {
      const signing1 = appSigningService.startSigning('/path/to/app1.apk', '/path/to/keystore', 'release');
      const signing2 = appSigningService.startSigning('/path/to/app2.apk', '/path/to/keystore', 'release');

      appSigningService.verifySigning(signing1.signingId, '/path/to/signed1.apk', 'ABC123');
      appSigningService.failSigning(signing2.signingId, 'Failed');

      const stats = appSigningService.getSigningStatistics();
      expect(stats.successRate).toBe(50);
      expect(stats.failedSignings).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      appSigningService.startSigning('/path/to/app.apk', '/path/to/keystore', 'release');
      appSigningService.cleanup();
      const stats = appSigningService.getSigningStatistics();
      expect(stats.totalSignings).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = AppSigningService.getInstance();
      const instance2 = AppSigningService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
