/**
 * PermissionManager - PoiPoi System Core
 * 権限管理
 */

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

class PermissionManager {
  private permissions: Map<string, Permission> = new Map();
  private roles: Map<string, Role> = new Map();
  private userRoles: Map<string, string[]> = new Map();

  addPermission(name: string, description: string): Permission {
    const permission: Permission = {
      id: `perm_${Date.now()}`,
      name,
      description,
    };

    this.permissions.set(permission.id, permission);
    console.log(`🔐 権限追加: ${name}`);

    return permission;
  }

  createRole(name: string, permissions: string[]): Role {
    const role: Role = {
      id: `role_${Date.now()}`,
      name,
      permissions,
    };

    this.roles.set(role.id, role);
    console.log(`👤 ロール作成: ${name}`);

    return role;
  }

  assignRoleToUser(userId: string, roleId: string): boolean {
    if (!this.roles.has(roleId)) return false;

    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, []);
    }

    this.userRoles.get(userId)!.push(roleId);
    return true;
  }

  hasPermission(userId: string, permissionId: string): boolean {
    const userRoles = this.userRoles.get(userId) || [];

    for (const roleId of userRoles) {
      const role = this.roles.get(roleId);
      if (role && role.permissions.includes(permissionId)) {
        return true;
      }
    }

    return false;
  }

  getStats() {
    return {
      totalPermissions: this.permissions.size,
      totalRoles: this.roles.size,
      totalUsers: this.userRoles.size,
    };
  }
}

export default PermissionManager;
