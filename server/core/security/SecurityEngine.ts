/**
 * Security Engine - Core security infrastructure for PoiPoi self-evolution
 * 
 * Manages:
 * - Authorization and access control
 * - Audit logging for all security events
 * - Data protection and encryption
 * - Evolution execution permissions
 */

export interface SecurityContext {
  userId: string;
  role: 'admin' | 'user' | 'system';
  permissions: Set<string>;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  status: 'success' | 'failure';
  details: Record<string, unknown>;
}

export class SecurityEngine {
  private isInitialized: boolean = false;
  private auditLogs: AuditLogEntry[] = [];
  private userContexts: Map<string, SecurityContext> = new Map();
  private rolePermissions: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeRolePermissions();
  }

  /**
   * Initialize Security Engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('SecurityEngine is already initialized');
    }
    this.isInitialized = true;
  }

  /**
   * Shutdown Security Engine
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SecurityEngine is not initialized');
    }
    this.auditLogs = [];
    this.userContexts.clear();
    this.isInitialized = false;
  }

  /**
   * Check if Security Engine is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Create security context for user
   */
  async createContext(userId: string, role: 'admin' | 'user' | 'system'): Promise<SecurityContext> {
    if (!this.isInitialized) {
      throw new Error('SecurityEngine is not initialized');
    }

    const permissions = this.rolePermissions.get(role) || new Set();
    const context: SecurityContext = {
      userId,
      role,
      permissions: new Set(permissions),
    };

    this.userContexts.set(userId, context);

    await this.logSecurityEvent('CONTEXT_CREATED', userId, {
      role,
      permissionCount: permissions.size,
    });

    return context;
  }

  /**
   * Get security context
   */
  async getContext(userId: string): Promise<SecurityContext | null> {
    if (!this.isInitialized) {
      throw new Error('SecurityEngine is not initialized');
    }
    return this.userContexts.get(userId) || null;
  }

  /**
   * Check authorization
   */
  async checkAuthorization(userId: string, action: string, resource?: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('SecurityEngine is not initialized');
    }

    const context = this.userContexts.get(userId);
    if (!context) {
      await this.logSecurityEvent('AUTH_CHECK_FAILED', userId, {
        action,
        resource,
        reason: 'context_not_found',
      });
      return false;
    }

    const hasPermission = context.permissions.has(action);

    if (!hasPermission) {
      await this.logSecurityEvent('AUTH_CHECK_FAILED', userId, {
        action,
        resource,
        reason: 'permission_denied',
      });
    }

    return hasPermission;
  }

  /**
   * Grant permission to user
   */
  async grantPermission(userId: string, permission: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SecurityEngine is not initialized');
    }

    const context = this.userContexts.get(userId);
    if (!context) {
      throw new Error(`User context not found for ${userId}`);
    }

    context.permissions.add(permission);

    await this.logSecurityEvent('PERMISSION_GRANTED', userId, {
      permission,
    });
  }

  /**
   * Revoke permission from user
   */
  async revokePermission(userId: string, permission: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SecurityEngine is not initialized');
    }

    const context = this.userContexts.get(userId);
    if (!context) {
      throw new Error(`User context not found for ${userId}`);
    }

    context.permissions.delete(permission);

    await this.logSecurityEvent('PERMISSION_REVOKED', userId, {
      permission,
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    action: string,
    userId: string,
    details: Record<string, unknown>,
    status: 'success' | 'failure' = 'success'
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SecurityEngine is not initialized');
    }

    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId,
      action,
      resource: (details.resource as string) || 'unknown',
      status,
      details,
    };

    this.auditLogs.push(entry);

    // Keep only last 10000 logs in memory
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(filter?: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    if (!this.isInitialized) {
      throw new Error('SecurityEngine is not initialized');
    }

    let results = [...this.auditLogs];

    if (filter?.userId) {
      results = results.filter((log) => log.userId === filter.userId);
    }

    if (filter?.action) {
      results = results.filter((log) => log.action === filter.action);
    }

    if (filter?.startDate) {
      results = results.filter((log) => log.timestamp >= filter.startDate!);
    }

    if (filter?.endDate) {
      results = results.filter((log) => log.timestamp <= filter.endDate!);
    }

    const limit = filter?.limit || 100;
    return results.slice(-limit);
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string, key: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('SecurityEngine is not initialized');
    }

    // Simple XOR encryption for demonstration
    // In production, use proper encryption like AES-256
    const encrypted = Buffer.from(data)
      .toString('base64')
      .split('')
      .map((char, index) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(index % key.length)))
      .join('');

    return Buffer.from(encrypted).toString('base64');
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(encrypted: string, key: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('SecurityEngine is not initialized');
    }

    try {
      const decrypted = Buffer.from(encrypted, 'base64')
        .toString()
        .split('')
        .map((char, index) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(index % key.length)))
        .join('');

      const result = Buffer.from(decrypted, 'base64').toString();
      
      // Validate that result is valid UTF-8 and not corrupted
      // If key is wrong, result will likely contain invalid characters
      if (!result || result.includes('\ufffd')) {
        throw new Error('Decryption failed: invalid key or corrupted data');
      }
      
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Decryption failed')) {
        throw error;
      }
      throw new Error('Decryption failed: invalid key or corrupted data');
    }
  }

  /**
   * Check evolution execution permission
   */
  async canExecuteEvolution(userId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('SecurityEngine is not initialized');
    }

    const hasPermission = await this.checkAuthorization(userId, 'execute_evolution');

    if (!hasPermission) {
      await this.logSecurityEvent('EVOLUTION_EXECUTION_DENIED', userId, {}, 'failure');
    }

    return hasPermission;
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(): Promise<Record<string, unknown>> {
    if (!this.isInitialized) {
      throw new Error('SecurityEngine is not initialized');
    }

    const stats: Record<string, unknown> = {
      initialized: this.isInitialized,
      totalAuditLogs: this.auditLogs.length,
      totalUsers: this.userContexts.size,
      totalRoles: this.rolePermissions.size,
    };

    // Count events by action
    const actionCounts: Record<string, number> = {};
    this.auditLogs.forEach((log) => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });
    stats.eventsByAction = actionCounts;

    // Count failures
    const failures = this.auditLogs.filter((log) => log.status === 'failure').length;
    stats.totalFailures = failures;

    return stats;
  }

  /**
   * Private: Initialize role permissions
   */
  private initializeRolePermissions(): void {
    // Admin permissions
    const adminPerms = new Set([
      'read_knowledge',
      'write_knowledge',
      'delete_knowledge',
      'execute_evolution',
      'approve_evolution',
      'view_audit_logs',
      'manage_users',
      'manage_permissions',
    ]);
    this.rolePermissions.set('admin', adminPerms);

    // User permissions
    const userPerms = new Set([
      'read_knowledge',
      'write_knowledge',
      'execute_evolution',
      'view_audit_logs',
    ]);
    this.rolePermissions.set('user', userPerms);

    // System permissions
    const systemPerms = new Set([
      'read_knowledge',
      'write_knowledge',
      'delete_knowledge',
      'execute_evolution',
      'view_audit_logs',
      'manage_permissions',
    ]);
    this.rolePermissions.set('system', systemPerms);
  }
}
