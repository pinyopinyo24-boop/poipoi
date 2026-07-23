/**
 * APKSigningService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apkSigningService, APKSigningService } from './APKSigningService';

describe('APKSigningService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apkSigningService.cleanup();
  });

  afterEach(() => {
    apkSigningService.cleanup();
  });

  describe('Signing Key Registration', () => {
    it('should register signing key', () => {
      const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;
      const key = apkSigningService.registerSigningKey(
        'test-key',
        '/path/to/keystore.jks',
        'password',
        'password',
        'RSA',
        2048,
        365,
        {
          subjectDN: 'CN=Test',
          issuerDN: 'CN=Test',
          serialNumber: '1',
          notBefore: Date.now(),
          notAfter: expiresAt,
        }
      );
      expect(key.id).toBeDefined();
      expect(key.alias).toBe('test-key');
    });

    it('should get signing key', () => {
      const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;
      const registered = apkSigningService.registerSigningKey(
        'test-key',
        '/path/to/keystore.jks',
        'password',
        'password',
        'RSA',
        2048,
        365,
        {
          subjectDN: 'CN=Test',
          issuerDN: 'CN=Test',
          serialNumber: '1',
          notBefore: Date.now(),
          notAfter: expiresAt,
        }
      );
      const key = apkSigningService.getSigningKey(registered.id);
      expect(key).not.toBeNull();
    });

    it('should get active signing key', () => {
      const key = apkSigningService.getActiveSigningKey();
      expect(key).not.toBeNull();
      expect(key?.isActive).toBe(true);
    });
  });

  describe('Signing Key Expiration', () => {
    it('should check if signing key is expired', () => {
      const expiresAt = Date.now() - 1000; // 1秒前に期限切れ
      const key = apkSigningService.registerSigningKey(
        'expired-key',
        '/path/to/keystore.jks',
        'password',
        'password',
        'RSA',
        2048,
        -1,
        {
          subjectDN: 'CN=Test',
          issuerDN: 'CN=Test',
          serialNumber: '1',
          notBefore: Date.now(),
          notAfter: expiresAt,
        }
      );
      const isExpired = apkSigningService.isSigningKeyExpired(key.id);
      expect(isExpired).toBe(true);
    });
  });

  describe('APK Signing', () => {
    it('should record signed APK', () => {
      const apk = apkSigningService.recordSignedAPK(
        '/path/to/app.apk',
        '/path/to/app-signed.apk',
        'default',
        '1.0.0',
        'signature123',
        'fingerprint123'
      );
      expect(apk.id).toBeDefined();
      expect(apk.version).toBe('1.0.0');
    });

    it('should get signed APK', () => {
      const recorded = apkSigningService.recordSignedAPK(
        '/path/to/app.apk',
        '/path/to/app-signed.apk',
        'default',
        '1.0.0',
        'signature123',
        'fingerprint123'
      );
      const apk = apkSigningService.getSignedAPK(recorded.id);
      expect(apk).not.toBeNull();
    });

    it('should get signed APK by version', () => {
      apkSigningService.recordSignedAPK(
        '/path/to/app.apk',
        '/path/to/app-signed.apk',
        'default',
        '1.0.0',
        'signature123',
        'fingerprint123'
      );
      const apk = apkSigningService.getSignedAPKByVersion('1.0.0');
      expect(apk).not.toBeNull();
      expect(apk?.version).toBe('1.0.0');
    });
  });

  describe('APK Signature Verification', () => {
    it('should verify APK signature', () => {
      const recorded = apkSigningService.recordSignedAPK(
        '/path/to/app.apk',
        '/path/to/app-signed.apk',
        'default',
        '1.0.0',
        'signature123',
        'fingerprint123'
      );
      const verified = apkSigningService.verifyAPKSignature(recorded.id);
      expect(verified).toBe(true);
    });

    it('should return false for non-existent APK', () => {
      const verified = apkSigningService.verifyAPKSignature('non-existent');
      expect(verified).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should get signing statistics', () => {
      const stats = apkSigningService.getSigningStatistics();
      expect(stats.totalKeys).toBeGreaterThan(0);
      expect(stats.activeKeys).toBeGreaterThanOrEqual(0);
    });

    it('should count verified APKs', () => {
      const recorded = apkSigningService.recordSignedAPK(
        '/path/to/app.apk',
        '/path/to/app-signed.apk',
        'default',
        '1.0.0',
        'signature123',
        'fingerprint123'
      );
      apkSigningService.verifyAPKSignature(recorded.id);
      const stats = apkSigningService.getSigningStatistics();
      expect(stats.verifiedApks).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      apkSigningService.recordSignedAPK(
        '/path/to/app.apk',
        '/path/to/app-signed.apk',
        'default',
        '1.0.0',
        'signature123',
        'fingerprint123'
      );
      apkSigningService.cleanup();
      const stats = apkSigningService.getSigningStatistics();
      expect(stats.totalSignedApks).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = APKSigningService.getInstance();
      const instance2 = APKSigningService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
