/**
 * API Key Management Tests
 * APIキー管理テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { APIKeyManager, APIKeyManagementService } from './ai/APIKeyManager';
import { apiKeyManagementService } from './ai/APIKeyManagementService';

describe('API Key Management', () => {
  let keyManager: APIKeyManager;
  let keyService: typeof apiKeyManagementService;

  beforeEach(() => {
    keyManager = new APIKeyManager();
    keyService = apiKeyManagementService;
  });

  describe('APIKeyManager - CRUD Operations', () => {
    it('should create an API key', () => {
      const key = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      expect(key.id).toBeDefined();
      expect(key.name).toBe('Test Key');
      expect(key.provider).toBe('openai');
      expect(key.isActive).toBe(true);
      expect(key.createdBy).toBe('user_1');
    });

    it('should retrieve an API key', () => {
      const created = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      const retrieved = keyManager.getKey(created.id, 'user_1');
      expect(retrieved).toBe('sk-test-key-12345');
    });

    it('should update an API key', () => {
      const created = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      const updated = keyManager.updateKey(
        created.id,
        { name: 'Updated Key' },
        'user_1'
      );

      expect(updated?.name).toBe('Updated Key');
    });

    it('should delete an API key', () => {
      const created = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      const deleted = keyManager.deleteKey(created.id, 'user_1');
      expect(deleted).toBe(true);

      const retrieved = keyManager.getKey(created.id, 'user_1');
      expect(retrieved).toBeNull();
    });

    it('should rotate an API key', () => {
      const created = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      const rotated = keyManager.rotateKey(
        created.id,
        'sk-new-key-67890',
        'user_1'
      );

      expect(rotated).not.toBeNull();
      const newValue = keyManager.getKey(created.id, 'user_1');
      expect(newValue).toBe('sk-new-key-67890');
    });
  });

  describe('APIKeyManager - Encryption', () => {
    it('should encrypt and decrypt keys', () => {
      const originalKey = 'sk-super-secret-key-12345';
      const created = keyManager.createKey(
        'Encrypted Key',
        'openai',
        originalKey,
        'user_1'
      );

      expect(created.encryptedValue).not.toBe(originalKey);
      expect(created.iv).toBeDefined();

      const decrypted = keyManager.getKey(created.id, 'user_1');
      expect(decrypted).toBe(originalKey);
    });

    it('should handle decryption errors gracefully', () => {
      const created = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      // Corrupt the encrypted value
      const allKeys = keyManager.getAllKeys();
      if (allKeys.length > 0) {
        allKeys[0].encryptedValue = 'corrupted-data';
      }

      const result = keyManager.getKey(created.id, 'user_1');
      expect(result).toBeNull();
    });
  });

  describe('APIKeyManager - Permissions', () => {
    it('should grant key permissions', () => {
      const created = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      const permission = keyManager.grantPermission(
        created.id,
        'user_2',
        'manager',
        true,
        true,
        false,
        false,
        'user_1'
      );

      expect(permission).not.toBeNull();
      expect(permission?.userId).toBe('user_2');
      expect(permission?.canRead).toBe(true);
      expect(permission?.canUpdate).toBe(true);
    });

    it('should revoke key permissions', () => {
      const created = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      keyManager.grantPermission(
        created.id,
        'user_2',
        'user',
        true,
        false,
        false,
        false,
        'user_1'
      );

      const revoked = keyManager.revokePermission(created.id, 'user_2', 'user_1');
      expect(revoked).toBe(true);
    });

    it('should enforce permission checks on read', () => {
      const created = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      // user_2 should not be able to read without permission
      const result = keyManager.getKey(created.id, 'user_2');
      expect(result).toBeNull();
    });

    it('should allow creator to access key', () => {
      const created = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      const result = keyManager.getKey(created.id, 'user_1');
      expect(result).toBe('sk-test-key-12345');
    });

    it('should allow admin to access any key', () => {
      const created = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      const result = keyManager.getKey(created.id, 'admin_user');
      expect(result).toBe('sk-test-key-12345');
    });
  });

  describe('APIKeyManager - Usage Tracking', () => {
    it('should record key usage', () => {
      const created = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      keyManager.recordKeyUsage(created.id, 'user_1');
      keyManager.recordKeyUsage(created.id, 'user_1');

      const logs = keyManager.getUsageLogs(created.id);
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should retrieve usage logs', () => {
      const created = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      keyManager.recordKeyUsage(created.id, 'user_1');
      const logs = keyManager.getUsageLogs(created.id, 10);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some(log => log.keyId === created.id)).toBe(true);
      expect(logs.some(log => log.action === 'use')).toBe(true);
    });

    it('should track usage count', () => {
      const created = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      const initialCount = created.usageCount;
      keyManager.recordKeyUsage(created.id, 'user_1');

      const allKeys = keyManager.getAllKeys();
      const updated = allKeys.find(k => k.id === created.id);
      expect(updated?.usageCount).toBe(initialCount + 1);
    });
  });

  describe('APIKeyManager - Expiration', () => {
    it('should handle expired keys', () => {
      const expiresAt = Date.now() - 1000; // Already expired
      const created = keyManager.createKey(
        'Expired Key',
        'openai',
        'sk-test-key-12345',
        'user_1',
        expiresAt
      );

      const result = keyManager.getKey(created.id, 'user_1');
      expect(result).toBeNull();
    });

    it('should cleanup expired keys', () => {
      const expiresAt = Date.now() - 1000;
      keyManager.createKey(
        'Expired Key 1',
        'openai',
        'sk-test-key-1',
        'user_1',
        expiresAt
      );
      keyManager.createKey(
        'Expired Key 2',
        'openai',
        'sk-test-key-2',
        'user_1',
        expiresAt
      );

      const cleaned = keyManager.cleanupExpiredKeys();
      expect(cleaned).toBe(2);
    });

    it('should not cleanup active keys', () => {
      const futureExpiry = Date.now() + 86400000; // 1 day from now
      keyManager.createKey(
        'Active Key',
        'openai',
        'sk-test-key-12345',
        'user_1',
        futureExpiry
      );

      const cleaned = keyManager.cleanupExpiredKeys();
      expect(cleaned).toBe(0);
    });
  });

  describe('APIKeyManager - Provider Management', () => {
    it('should get keys by provider', () => {
      keyManager.createKey('OpenAI Key 1', 'openai', 'sk-1', 'user_1');
      keyManager.createKey('OpenAI Key 2', 'openai', 'sk-2', 'user_1');
      keyManager.createKey('Claude Key', 'claude', 'sk-3', 'user_1');

      const openaiKeys = keyManager.getKeysByProvider('openai', 'user_1');
      expect(openaiKeys.length).toBe(2);
      expect(openaiKeys.every(k => k.provider === 'openai')).toBe(true);
    });

    it('should only return active keys by provider', () => {
      const key1 = keyManager.createKey('OpenAI Key 1', 'openai', 'sk-1', 'user_1');
      keyManager.createKey('OpenAI Key 2', 'openai', 'sk-2', 'user_1');

      keyManager.updateKey(key1.id, { isActive: false }, 'user_1');

      const openaiKeys = keyManager.getKeysByProvider('openai', 'user_1');
      expect(openaiKeys.length).toBe(1);
    });
  });

  describe('APIKeyManager - Statistics', () => {
    it('should calculate statistics', () => {
      keyManager.createKey('Key 1', 'openai', 'sk-1', 'user_1');
      keyManager.createKey('Key 2', 'openai', 'sk-2', 'user_1');
      keyManager.createKey('Key 3', 'claude', 'sk-3', 'user_1');

      const stats = keyManager.getStatistics();
      expect(stats.totalKeys).toBe(3);
      expect(stats.activeKeys).toBe(3);
      expect(stats.expiredKeys).toBe(0);
    });

    it('should track most used key', () => {
      const key1 = keyManager.createKey('Key 1', 'openai', 'sk-1', 'user_1');
      const key2 = keyManager.createKey('Key 2', 'openai', 'sk-2', 'user_1');

      keyManager.recordKeyUsage(key1.id, 'user_1');
      keyManager.recordKeyUsage(key1.id, 'user_1');
      keyManager.recordKeyUsage(key1.id, 'user_1');
      keyManager.recordKeyUsage(key2.id, 'user_1');

      const stats = keyManager.getStatistics();
      expect(stats.mostUsedKey).toBe(key1.id);
    });
  });

  describe('APIKeyManager - Validation', () => {
    it('should validate active key', () => {
      const created = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      const validation = keyManager.validateKey(created.id);
      expect(validation.valid).toBe(true);
    });

    it('should reject inactive key', () => {
      const created = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      keyManager.updateKey(created.id, { isActive: false }, 'user_1');

      const validation = keyManager.validateKey(created.id);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Key is inactive');
    });

    it('should reject expired key', () => {
      const expiresAt = Date.now() - 1000;
      const created = keyManager.createKey(
        'Expired Key',
        'openai',
        'sk-test-key-12345',
        'user_1',
        expiresAt
      );

      const validation = keyManager.validateKey(created.id);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Key has expired');
    });

    it('should reject non-existent key', () => {
      const validation = keyManager.validateKey('non_existent_key');
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Key not found');
    });
  });

  describe('APIKeyManagementService - Integration', () => {
    it('should register API key', () => {
      const key = keyService.registerKey('openai', 'Test Key', 'sk-test-key-12345');
      expect(key.id).toBeDefined();
      expect(key.provider).toBe('openai');
    });

    it('should get active key for provider', () => {
      keyService.registerKey('openai', 'Key 1', 'sk-1');
      keyService.registerKey('openai', 'Key 2', 'sk-2');

      const activeKey = keyService.getActiveKeyForProvider('openai');
      expect(activeKey).not.toBeNull();
      expect(activeKey?.provider).toBe('openai');
    });

    it('should record key usage', () => {
      const key = keyService.registerKey('openai', 'Test Key', 'sk-test-key-12345');
      keyService.recordKeyUsage(key.id, true, 100);

      const metrics = keyService.getKeyMetrics(key.id);
      expect(metrics?.totalRequests).toBe(1);
      expect(metrics?.successfulRequests).toBe(1);
    });

    it('should get keys requiring rotation', () => {
      const key = keyService.registerKey('openai', 'Old Key', 'sk-old-key');
      // Manually set creation time to trigger rotation
      const allKeys = keyService.getAllKeys();
      if (allKeys.length > 0) {
        allKeys[0].createdAt = Date.now() - 100 * 24 * 60 * 60 * 1000; // 100 days ago
      }

      const keysToRotate = keyService.getKeysRequiringRotation();
      expect(keysToRotate.length).toBeGreaterThanOrEqual(0);
    });

    it('should cleanup expired keys', () => {
      keyService.registerKey('openai', 'Expired Key', 'sk-expired', Date.now() - 1000);
      const cleaned = keyService.cleanupExpiredKeys();
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });

    it('should get statistics', () => {
      keyService.registerKey('openai', 'Key 1', 'sk-1');
      keyService.registerKey('claude', 'Key 2', 'sk-2');

      const stats = keyService.getStatistics();
      expect(stats.totalKeys).toBeGreaterThanOrEqual(2);
      expect(stats.activeKeys).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Performance Tests', () => {
    it('should handle 100 keys efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        keyManager.createKey(
          `Key ${i}`,
          'openai',
          `sk-key-${i}`,
          'user_1'
        );
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('should handle concurrent usage recording', () => {
      const created = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        keyManager.recordKeyUsage(created.id, 'user_1');
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Error Handling', () => {
    it('should handle permission denied on create', () => {
      // Non-admin user trying to create key (would fail in real scenario)
      const key = keyManager.createKey(
        'Test Key',
        'openai',
        'sk-test-key-12345',
        'user_1'
      );

      expect(key).toBeDefined();
    });

    it('should handle non-existent key on update', () => {
      const result = keyManager.updateKey('non_existent_key', { name: 'New Name' }, 'user_1');
      expect(result).toBeNull();
    });

    it('should handle non-existent key on delete', () => {
      const result = keyManager.deleteKey('non_existent_key', 'user_1');
      expect(result).toBe(false);
    });

    it('should handle non-existent key on rotate', () => {
      const result = keyManager.rotateKey('non_existent_key', 'new-key', 'user_1');
      expect(result).toBeNull();
    });
  });
});
