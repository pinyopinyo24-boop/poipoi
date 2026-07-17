import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityAIManager } from './SecurityAIManager';

describe('SecurityAIManager', () => {
  let security: SecurityAIManager;

  beforeEach(() => {
    security = new SecurityAIManager();
  });

  describe('User Permissions', () => {
    it('should set user permission', () => {
      const userId = security.setUserPermission({
        userId: 'user-1',
        role: 'manager',
        permissions: ['read', 'write'],
        dataAccessLevel: 'department',
      });

      expect(userId).toBe('user-1');
    });

    it('should get user permission', () => {
      security.setUserPermission({
        userId: 'user-1',
        role: 'manager',
        permissions: ['read', 'write'],
        dataAccessLevel: 'department',
      });

      const perm = security.getUserPermission('user-1');
      expect(perm).toBeDefined();
      expect(perm?.role).toBe('manager');
    });

    it('should handle different roles', () => {
      const roles = ['admin', 'manager', 'operator', 'viewer'];

      roles.forEach((role) => {
        security.setUserPermission({
          userId: `user-${role}`,
          role: role as any,
          permissions: [],
          dataAccessLevel: 'full',
        });
      });

      roles.forEach((role) => {
        const perm = security.getUserPermission(`user-${role}`);
        expect(perm?.role).toBe(role);
      });
    });
  });

  describe('Access Control', () => {
    it('should set access control', () => {
      const resourceId = security.setAccessControl({
        resourceId: 'resource-1',
        resourceType: 'document',
        allowedRoles: ['admin', 'manager'],
        allowedUsers: [],
        accessLevel: 'restricted',
      });

      expect(resourceId).toBe('resource-1');
    });

    it('should check access by role', () => {
      security.setUserPermission({
        userId: 'user-1',
        role: 'manager',
        permissions: [],
        dataAccessLevel: 'full',
      });

      security.setAccessControl({
        resourceId: 'resource-1',
        resourceType: 'document',
        allowedRoles: ['manager'],
        allowedUsers: [],
        accessLevel: 'internal',
      });

      const allowed = security.checkAccess('user-1', 'resource-1');
      expect(allowed).toBe(true);
    });

    it('should deny access for unauthorized role', () => {
      security.setUserPermission({
        userId: 'user-1',
        role: 'viewer',
        permissions: [],
        dataAccessLevel: 'none',
      });

      security.setAccessControl({
        resourceId: 'resource-1',
        resourceType: 'document',
        allowedRoles: ['admin', 'manager'],
        allowedUsers: [],
        accessLevel: 'restricted',
      });

      const allowed = security.checkAccess('user-1', 'resource-1');
      expect(allowed).toBe(false);
    });

    it('should check access by user', () => {
      security.setUserPermission({
        userId: 'user-1',
        role: 'viewer',
        permissions: [],
        dataAccessLevel: 'limited',
      });

      security.setAccessControl({
        resourceId: 'resource-1',
        resourceType: 'document',
        allowedRoles: [],
        allowedUsers: ['user-1'],
        accessLevel: 'restricted',
      });

      const allowed = security.checkAccess('user-1', 'resource-1');
      expect(allowed).toBe(true);
    });

    it('should check access level', () => {
      security.setUserPermission({
        userId: 'user-1',
        role: 'operator',
        permissions: [],
        dataAccessLevel: 'department',
      });

      security.setAccessControl({
        resourceId: 'resource-1',
        resourceType: 'data',
        allowedRoles: [],
        allowedUsers: [],
        accessLevel: 'internal',
      });

      const allowed = security.checkAccess('user-1', 'resource-1');
      expect(allowed).toBe(true);
    });
  });

  describe('Security Events', () => {
    it('should record security event', () => {
      const id = security.recordSecurityEvent({
        userId: 'user-1',
        action: 'read',
        resource: 'resource-1',
        result: 'success',
      });

      expect(id).toBeDefined();
      expect(id).toMatch(/event-\d+-[a-z0-9]{9}/);
    });

    it('should record multiple events', () => {
      for (let i = 0; i < 5; i++) {
        security.recordSecurityEvent({
          userId: 'user-1',
          action: 'read',
          resource: `resource-${i}`,
          result: 'success',
        });
      }

      const history = security.getSecurityEventHistory(10);
      expect(history.length).toBe(5);
    });

    it('should track denied access', () => {
      security.recordSecurityEvent({
        userId: 'user-1',
        action: 'write',
        resource: 'resource-1',
        result: 'denied',
      });

      const metrics = security.getSecurityMetrics();
      expect(metrics['deniedAccess']).toBe(1);
    });
  });

  describe('Risk Detection', () => {
    it('should detect unauthorized access attempts', () => {
      for (let i = 0; i < 12; i++) {
        security.recordSecurityEvent({
          userId: 'user-1',
          action: 'access',
          resource: 'resource-1',
          result: 'denied',
        });
      }

      const alerts = security.detectRisks();
      const unauthorizedAlert = alerts.find((a) => a.type === 'unauthorized_access');
      expect(unauthorizedAlert).toBeDefined();
      expect(unauthorizedAlert?.severity).toBe('high');
    });

    it('should detect suspicious activity', () => {
      for (let i = 0; i < 7; i++) {
        security.recordSecurityEvent({
          userId: 'user-1',
          action: 'read',
          resource: 'resource-1',
          result: 'error',
        });
      }

      const alerts = security.detectRisks();
      const suspiciousAlert = alerts.find((a) => a.type === 'suspicious_activity');
      expect(suspiciousAlert).toBeDefined();
    });

    it('should detect policy violations', () => {
      security.setUserPermission({
        userId: 'user-1',
        role: 'viewer',
        permissions: ['write', 'delete'],
        dataAccessLevel: 'none',
      });

      const alerts = security.detectRisks();
      const policyAlert = alerts.find((a) => a.type === 'policy_violation');
      expect(policyAlert).toBeDefined();
    });
  });

  describe('Audit Logs', () => {
    it('should record audit log', () => {
      const id = security.recordAuditLog({
        userId: 'user-1',
        action: 'update',
        resource: 'resource-1',
      });

      expect(id).toBeDefined();
      expect(id).toMatch(/audit-\d+-[a-z0-9]{9}/);
    });

    it('should retrieve audit logs', () => {
      for (let i = 0; i < 5; i++) {
        security.recordAuditLog({
          userId: 'user-1',
          action: 'read',
          resource: `resource-${i}`,
        });
      }

      const logs = security.getAuditLogs(undefined, 10);
      expect(logs.length).toBe(5);
    });

    it('should filter audit logs by user', () => {
      security.recordAuditLog({
        userId: 'user-1',
        action: 'read',
        resource: 'resource-1',
      });

      security.recordAuditLog({
        userId: 'user-2',
        action: 'write',
        resource: 'resource-2',
      });

      const logs = security.getAuditLogs('user-1', 10);
      expect(logs.length).toBe(1);
      expect(logs[0].userId).toBe('user-1');
    });
  });

  describe('Security Score', () => {
    it('should calculate security score', () => {
      const score = security.calculateSecurityScore();
      expect(score).toBe(100);
    });

    it('should reduce score for denied access', () => {
      for (let i = 0; i < 5; i++) {
        security.recordSecurityEvent({
          userId: 'user-1',
          action: 'access',
          resource: 'resource-1',
          result: 'denied',
        });
      }

      const score = security.calculateSecurityScore();
      expect(score).toBeLessThan(100);
    });

    it('should reduce score for risk alerts', () => {
      for (let i = 0; i < 12; i++) {
        security.recordSecurityEvent({
          userId: 'user-1',
          action: 'access',
          resource: 'resource-1',
          result: 'denied',
        });
      }

      security.detectRisks();
      const score = security.calculateSecurityScore();
      expect(score).toBeLessThan(100);
    });
  });

  describe('AI Action Validation', () => {
    it('should validate AI action for admin', () => {
      security.setUserPermission({
        userId: 'user-1',
        role: 'admin',
        permissions: [],
        dataAccessLevel: 'full',
      });

      const result = security.validateAIAction('user-1', 'execute', 'resource-1');
      expect(result.allowed).toBe(true);
    });

    it('should validate AI action for authorized user', () => {
      security.setUserPermission({
        userId: 'user-1',
        role: 'manager',
        permissions: ['execute'],
        dataAccessLevel: 'full',
      });

      security.setAccessControl({
        resourceId: 'resource-1',
        resourceType: 'system',
        allowedRoles: ['manager'],
        allowedUsers: [],
        accessLevel: 'internal',
      });

      const result = security.validateAIAction('user-1', 'execute', 'resource-1');
      expect(result.allowed).toBe(true);
    });

    it('should deny AI action for unauthorized user', () => {
      security.setUserPermission({
        userId: 'user-1',
        role: 'viewer',
        permissions: [],
        dataAccessLevel: 'limited',
      });

      const result = security.validateAIAction('user-1', 'execute', 'resource-1');
      expect(result.allowed).toBe(false);
    });
  });

  describe('Security Report', () => {
    it('should generate security report', () => {
      const report = security.generateSecurityReport();
      expect(report.score).toBe(100);
      expect(report.totalEvents).toBe(0);
    });

    it('should include recommendations', () => {
      for (let i = 0; i < 15; i++) {
        security.recordSecurityEvent({
          userId: 'user-1',
          action: 'access',
          resource: 'resource-1',
          result: 'denied',
        });
      }

      const report = security.generateSecurityReport();
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Data Management', () => {
    it('should export data', () => {
      security.setUserPermission({
        userId: 'user-1',
        role: 'manager',
        permissions: ['read'],
        dataAccessLevel: 'department',
      });

      const exported = security.export();
      expect(exported.permissions.length).toBe(1);
    });

    it('should import data', () => {
      const security1 = new SecurityAIManager();
      security1.setUserPermission({
        userId: 'user-1',
        role: 'manager',
        permissions: ['read'],
        dataAccessLevel: 'department',
      });

      const exported = security1.export();

      const security2 = new SecurityAIManager();
      security2.import(exported);

      const perm = security2.getUserPermission('user-1');
      expect(perm).toBeDefined();
      expect(perm?.role).toBe('manager');
    });

    it('should clear data', () => {
      security.setUserPermission({
        userId: 'user-1',
        role: 'manager',
        permissions: [],
        dataAccessLevel: 'full',
      });

      security.clear();

      const perm = security.getUserPermission('user-1');
      expect(perm).toBeUndefined();
    });
  });

  describe('Integration', () => {
    it('should handle complete security workflow', () => {
      // Set up users
      security.setUserPermission({
        userId: 'admin-1',
        role: 'admin',
        permissions: ['all'],
        dataAccessLevel: 'full',
      });

      security.setUserPermission({
        userId: 'user-1',
        role: 'operator',
        permissions: ['read', 'write'],
        dataAccessLevel: 'department',
      });

      // Set up resources
      security.setAccessControl({
        resourceId: 'resource-1',
        resourceType: 'data',
        allowedRoles: ['admin', 'operator'],
        allowedUsers: [],
        accessLevel: 'internal',
      });

      // Record events
      security.recordSecurityEvent({
        userId: 'user-1',
        action: 'read',
        resource: 'resource-1',
        result: 'success',
      });

      // Detect risks
      const alerts = security.detectRisks();
      expect(alerts.length).toBeGreaterThanOrEqual(0);

      // Get report
      const report = security.generateSecurityReport();
      expect(report.score).toBeGreaterThan(0);
    });

    it('should track multiple users and resources', () => {
      for (let i = 1; i <= 3; i++) {
        security.setUserPermission({
          userId: `user-${i}`,
          role: 'operator',
          permissions: ['read'],
          dataAccessLevel: 'department',
        });

        security.setAccessControl({
          resourceId: `resource-${i}`,
          resourceType: 'data',
          allowedRoles: ['operator'],
          allowedUsers: [],
          accessLevel: 'internal',
        });
      }

      const metrics = security.getSecurityMetrics();
      expect(metrics['totalUsers']).toBe(3);
      expect(metrics['totalResources']).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing user', () => {
      const result = security.validateAIAction('non-existent', 'read', 'resource-1');
      expect(result.allowed).toBe(false);
    });

    it('should handle missing resource', () => {
      security.setUserPermission({
        userId: 'user-1',
        role: 'admin',
        permissions: [],
        dataAccessLevel: 'full',
      });

      const allowed = security.checkAccess('user-1', 'non-existent');
      expect(allowed).toBe(false);
    });

    it('should handle empty permissions', () => {
      security.setUserPermission({
        userId: 'user-1',
        role: 'viewer',
        permissions: [],
        dataAccessLevel: 'none',
      });

      const result = security.validateAIAction('user-1', 'read', 'resource-1');
      expect(result.allowed).toBe(false);
    });
  });
});
