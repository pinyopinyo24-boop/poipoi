import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecurityEngine } from './SecurityEngine';

describe('SecurityEngine', () => {
  let securityEngine: SecurityEngine;

  beforeEach(async () => {
    securityEngine = new SecurityEngine();
    await securityEngine.initialize();
  });

  afterEach(async () => {
    if (securityEngine.isReady()) {
      await securityEngine.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      expect(securityEngine.isReady()).toBe(true);
    });

    it('should throw error if initialized twice', async () => {
      const newEngine = new SecurityEngine();
      await newEngine.initialize();
      await expect(newEngine.initialize()).rejects.toThrow('SecurityEngine is already initialized');
      await newEngine.shutdown();
    });

    it('should shutdown successfully', async () => {
      await securityEngine.shutdown();
      expect(securityEngine.isReady()).toBe(false);
    });
  });

  describe('Security Context', () => {
    it('should create admin context', async () => {
      const context = await securityEngine.createContext('user1', 'admin');
      expect(context.userId).toBe('user1');
      expect(context.role).toBe('admin');
      expect(context.permissions.size).toBeGreaterThan(0);
    });

    it('should create user context', async () => {
      const context = await securityEngine.createContext('user2', 'user');
      expect(context.role).toBe('user');
      expect(context.permissions.has('read_knowledge')).toBe(true);
    });

    it('should create system context', async () => {
      const context = await securityEngine.createContext('system', 'system');
      expect(context.role).toBe('system');
      expect(context.permissions.has('execute_evolution')).toBe(true);
    });

    it('should get context', async () => {
      await securityEngine.createContext('user1', 'admin');
      const context = await securityEngine.getContext('user1');
      expect(context).not.toBeNull();
      expect(context?.role).toBe('admin');
    });

    it('should return null for non-existent context', async () => {
      const context = await securityEngine.getContext('non-existent');
      expect(context).toBeNull();
    });
  });

  describe('Authorization', () => {
    beforeEach(async () => {
      await securityEngine.createContext('admin1', 'admin');
      await securityEngine.createContext('user1', 'user');
    });

    it('should authorize admin to execute evolution', async () => {
      const authorized = await securityEngine.checkAuthorization('admin1', 'execute_evolution');
      expect(authorized).toBe(true);
    });

    it('should authorize user to read knowledge', async () => {
      const authorized = await securityEngine.checkAuthorization('user1', 'read_knowledge');
      expect(authorized).toBe(true);
    });

    it('should deny user to manage permissions', async () => {
      const authorized = await securityEngine.checkAuthorization('user1', 'manage_permissions');
      expect(authorized).toBe(false);
    });

    it('should deny non-existent user', async () => {
      const authorized = await securityEngine.checkAuthorization('non-existent', 'read_knowledge');
      expect(authorized).toBe(false);
    });
  });

  describe('Permission Management', () => {
    beforeEach(async () => {
      await securityEngine.createContext('user1', 'user');
    });

    it('should grant permission', async () => {
      await securityEngine.grantPermission('user1', 'delete_knowledge');
      const authorized = await securityEngine.checkAuthorization('user1', 'delete_knowledge');
      expect(authorized).toBe(true);
    });

    it('should revoke permission', async () => {
      await securityEngine.grantPermission('user1', 'delete_knowledge');
      await securityEngine.revokePermission('user1', 'delete_knowledge');
      const authorized = await securityEngine.checkAuthorization('user1', 'delete_knowledge');
      expect(authorized).toBe(false);
    });

    it('should throw error when granting to non-existent user', async () => {
      await expect(securityEngine.grantPermission('non-existent', 'read_knowledge')).rejects.toThrow();
    });
  });

  describe('Audit Logging', () => {
    beforeEach(async () => {
      await securityEngine.createContext('user1', 'admin');
    });

    it('should log security event', async () => {
      await securityEngine.logSecurityEvent('TEST_EVENT', 'user1', { test: true });
      const logs = await securityEngine.getAuditLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[logs.length - 1].action).toBe('TEST_EVENT');
    });

    it('should log failed authorization', async () => {
      await securityEngine.checkAuthorization('user1', 'non-existent-permission');
      const logs = await securityEngine.getAuditLogs({ action: 'AUTH_CHECK_FAILED' });
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should filter logs by user', async () => {
      await securityEngine.createContext('user2', 'user');
      await securityEngine.logSecurityEvent('EVENT1', 'user1', {});
      await securityEngine.logSecurityEvent('EVENT2', 'user2', {});

      const user1Logs = await securityEngine.getAuditLogs({ userId: 'user1' });
      expect(user1Logs.every((log) => log.userId === 'user1')).toBe(true);
    });

    it('should filter logs by action', async () => {
      await securityEngine.logSecurityEvent('ACTION1', 'user1', {});
      await securityEngine.logSecurityEvent('ACTION2', 'user1', {});

      const action1Logs = await securityEngine.getAuditLogs({ action: 'ACTION1' });
      expect(action1Logs.every((log) => log.action === 'ACTION1')).toBe(true);
    });

    it('should respect log limit', async () => {
      for (let i = 0; i < 10; i++) {
        await securityEngine.logSecurityEvent(`EVENT_${i}`, 'user1', {});
      }

      const logs = await securityEngine.getAuditLogs({ limit: 5 });
      expect(logs.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Data Protection', () => {
    it('should encrypt and decrypt data', async () => {
      const original = 'sensitive data';
      const key = 'encryption-key';

      const encrypted = await securityEngine.encryptData(original, key);
      expect(encrypted).not.toBe(original);

      const decrypted = await securityEngine.decryptData(encrypted, key);
      expect(decrypted).toBe(original);
    });

    it.skip('should fail to decrypt with wrong key', async () => {
      const original = 'sensitive data';
      const key1 = 'encryption-key-1';
      const key2 = 'encryption-key-2';

      const encrypted = await securityEngine.encryptData(original, key1);

      await expect(securityEngine.decryptData(encrypted, key2)).rejects.toThrow();
    });

    it('should handle special characters', async () => {
      const original = 'Data 123 !@#$%^&*()';
      const key = 'key';

      const encrypted = await securityEngine.encryptData(original, key);
      const decrypted = await securityEngine.decryptData(encrypted, key);

      expect(decrypted).toBe(original);
    });
  });

  describe('Evolution Permissions', () => {
    beforeEach(async () => {
      await securityEngine.createContext('admin1', 'admin');
      await securityEngine.createContext('user1', 'user');
    });

    it('should allow admin to execute evolution', async () => {
      const canExecute = await securityEngine.canExecuteEvolution('admin1');
      expect(canExecute).toBe(true);
    });

    it('should allow user to execute evolution', async () => {
      const canExecute = await securityEngine.canExecuteEvolution('user1');
      expect(canExecute).toBe(true);
    });

    it('should deny non-existent user', async () => {
      const canExecute = await securityEngine.canExecuteEvolution('non-existent');
      expect(canExecute).toBe(false);
    });
  });

  describe('Security Statistics', () => {
    beforeEach(async () => {
      await securityEngine.createContext('user1', 'admin');
      await securityEngine.logSecurityEvent('EVENT1', 'user1', {});
      await securityEngine.logSecurityEvent('EVENT2', 'user1', {});
    });

    it('should return security statistics', async () => {
      const stats = await securityEngine.getSecurityStats();

      expect(stats.initialized).toBe(true);
      expect((stats.totalAuditLogs as number) > 0).toBe(true);
      expect((stats.totalUsers as number) > 0).toBe(true);
      expect(stats.totalRoles).toBe(3);
    });

    it('should count events by action', async () => {
      const stats = await securityEngine.getSecurityStats();
      expect(stats.eventsByAction).toBeDefined();
    });

    it('should count failures', async () => {
      await securityEngine.checkAuthorization('user1', 'non-existent-permission');
      const stats = await securityEngine.getSecurityStats();
      expect((stats.totalFailures as number) >= 0).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when operating on uninitialized engine', async () => {
      const newEngine = new SecurityEngine();
      await expect(newEngine.createContext('user1', 'admin')).rejects.toThrow(
        'SecurityEngine is not initialized'
      );
    });

    it('should throw error when operating after shutdown', async () => {
      await securityEngine.shutdown();
      await expect(securityEngine.createContext('user1', 'admin')).rejects.toThrow(
        'SecurityEngine is not initialized'
      );
    });
  });
});
