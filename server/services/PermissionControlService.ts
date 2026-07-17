/**
 * PermissionControlService - AI権限管理
 */

import type { AIPermission } from '../core/GovernanceAIManager';

export class PermissionControlService {
  private permissions: Map<string, AIPermission> = new Map();

  /**
   * 権限を付与
   */
  async grantPermission(permission: Omit<AIPermission, 'id'>): Promise<AIPermission> {
    const id = `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const granted: AIPermission = {
      ...permission,
      id,
    };

    this.permissions.set(id, granted);
    return granted;
  }

  /**
   * 権限を取り消し
   */
  async revokePermission(permissionId: string): Promise<boolean> {
    return this.permissions.delete(permissionId);
  }

  /**
   * 権限を取得
   */
  async getPermission(permissionId: string): Promise<AIPermission | null> {
    return this.permissions.get(permissionId) || null;
  }

  /**
   * エージェントの権限を取得
   */
  async getAgentPermissions(agentId: string): Promise<AIPermission[]> {
    return Array.from(this.permissions.values()).filter((p) => p.agentId === agentId);
  }

  /**
   * リソースへのアクセス権を確認
   */
  async checkAccess(
    agentId: string,
    resourceType: string,
    accessLevel: string
  ): Promise<boolean> {
    const permissions = await this.getAgentPermissions(agentId);

    for (const perm of permissions) {
      if (perm.resourceType === resourceType) {
        if (perm.expiresAt && perm.expiresAt < Date.now()) {
          continue;
        }

        const levels = ['read', 'write', 'execute', 'admin'];
        const permLevel = levels.indexOf(perm.accessLevel);
        const reqLevel = levels.indexOf(accessLevel);

        if (permLevel >= reqLevel) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 権限を更新
   */
  async updatePermission(
    permissionId: string,
    updates: Partial<AIPermission>
  ): Promise<AIPermission | null> {
    const perm = this.permissions.get(permissionId);
    if (!perm) {
      return null;
    }

    const updated: AIPermission = {
      ...perm,
      ...updates,
      id: perm.id,
    };

    this.permissions.set(permissionId, updated);
    return updated;
  }

  /**
   * 全権限を取得
   */
  async getAllPermissions(): Promise<AIPermission[]> {
    return Array.from(this.permissions.values());
  }

  /**
   * 権限統計を取得
   */
  async getPermissionStats(): Promise<{
    total: number;
    byAccessLevel: Record<string, number>;
    expiredCount: number;
  }> {
    const perms = Array.from(this.permissions.values());
    const byAccessLevel: Record<string, number> = {
      read: 0,
      write: 0,
      execute: 0,
      admin: 0,
    };

    let expiredCount = 0;

    for (const perm of perms) {
      byAccessLevel[perm.accessLevel]++;
      if (perm.expiresAt && perm.expiresAt < Date.now()) {
        expiredCount++;
      }
    }

    return {
      total: perms.length,
      byAccessLevel,
      expiredCount,
    };
  }
}
