/**
 * SecureCredentialManager Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { secureCredentialManager, SecureCredentialManager } from './SecureCredentialManager';

describe('SecureCredentialManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    secureCredentialManager.cleanup();
  });

  afterEach(() => {
    secureCredentialManager.cleanup();
  });

  describe('Credential Storage', () => {
    it('should store credential', () => {
      const cred = secureCredentialManager.storeCredential('api_key', 'secret-key-123');
      expect(cred.id).toBeDefined();
      expect(cred.type).toBe('api_key');
    });

    it('should encrypt credential value', () => {
      const cred = secureCredentialManager.storeCredential('api_key', 'secret-key-123');
      expect(cred.encryptedValue).not.toBe('secret-key-123');
    });

    it('should store credential with expiration', () => {
      const expiresAt = Date.now() + 3600000;
      const cred = secureCredentialManager.storeCredential('oauth_token', 'token-123', expiresAt);
      expect(cred.expiresAt).toBe(expiresAt);
    });

    it('should store credential with metadata', () => {
      const metadata = { service: 'github', scope: 'repo' };
      const cred = secureCredentialManager.storeCredential('oauth_token', 'token-123', undefined, metadata);
      expect(cred.metadata).toEqual(metadata);
    });
  });

  describe('Credential Retrieval', () => {
    it('should get credential', () => {
      const stored = secureCredentialManager.storeCredential('api_key', 'secret-key-123');
      const retrieved = secureCredentialManager.getCredential(stored.id, 'user1');
      expect(retrieved).toBe('secret-key-123');
    });

    it('should return null for non-existent credential', () => {
      const retrieved = secureCredentialManager.getCredential('non-existent', 'user1');
      expect(retrieved).toBeNull();
    });

    it('should return null for expired credential', () => {
      const expiresAt = Date.now() - 1000; // 1秒前に期限切れ
      const stored = secureCredentialManager.storeCredential('oauth_token', 'token-123', expiresAt);
      const retrieved = secureCredentialManager.getCredential(stored.id, 'user1');
      expect(retrieved).toBeNull();
    });
  });

  describe('Credential Rotation', () => {
    it('should rotate credential', () => {
      const stored = secureCredentialManager.storeCredential('api_key', 'old-key');
      const rotated = secureCredentialManager.rotateCredential(stored.id, 'new-key', 'user1');
      expect(rotated).not.toBeNull();
      const retrieved = secureCredentialManager.getCredential(stored.id, 'user1');
      expect(retrieved).toBe('new-key');
    });
  });

  describe('Credential Deletion', () => {
    it('should delete credential', () => {
      const stored = secureCredentialManager.storeCredential('api_key', 'secret-key');
      const deleted = secureCredentialManager.deleteCredential(stored.id, 'user1');
      expect(deleted).toBe(true);
      const retrieved = secureCredentialManager.getCredential(stored.id, 'user1');
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent credential', () => {
      const deleted = secureCredentialManager.deleteCredential('non-existent', 'user1');
      expect(deleted).toBe(false);
    });
  });

  describe('Expiration Check', () => {
    it('should check if credential is expired', () => {
      const expiresAt = Date.now() - 1000;
      const stored = secureCredentialManager.storeCredential('api_key', 'key', expiresAt);
      const isExpired = secureCredentialManager.isCredentialExpired(stored.id);
      expect(isExpired).toBe(true);
    });

    it('should check if credential is not expired', () => {
      const expiresAt = Date.now() + 3600000;
      const stored = secureCredentialManager.storeCredential('api_key', 'key', expiresAt);
      const isExpired = secureCredentialManager.isCredentialExpired(stored.id);
      expect(isExpired).toBe(false);
    });
  });

  describe('Metadata Management', () => {
    it('should get credential metadata', () => {
      const metadata = { service: 'github' };
      const stored = secureCredentialManager.storeCredential('oauth_token', 'token', undefined, metadata);
      const retrieved = secureCredentialManager.getCredentialMetadata(stored.id);
      expect(retrieved).toEqual(metadata);
    });

    it('should return null for non-existent metadata', () => {
      const retrieved = secureCredentialManager.getCredentialMetadata('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should get statistics', () => {
      secureCredentialManager.storeCredential('api_key', 'key1');
      secureCredentialManager.storeCredential('oauth_token', 'token1');
      const stats = secureCredentialManager.getStatistics();
      expect(stats.totalCredentials).toBe(2);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired credentials', () => {
      const expiresAt = Date.now() - 1000;
      secureCredentialManager.storeCredential('api_key', 'key', expiresAt);
      const removed = secureCredentialManager.cleanupExpiredCredentials();
      expect(removed).toBe(1);
    });

    it('should cleanup all data', () => {
      secureCredentialManager.storeCredential('api_key', 'key');
      secureCredentialManager.cleanup();
      const stats = secureCredentialManager.getStatistics();
      expect(stats.totalCredentials).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = SecureCredentialManager.getInstance();
      const instance2 = SecureCredentialManager.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
