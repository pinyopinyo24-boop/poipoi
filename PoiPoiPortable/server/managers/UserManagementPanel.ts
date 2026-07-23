/**
 * UserManagementPanel - ユーザー管理パネル
 * 
 * 機能:
 * - ユーザー管理
 * - ロール管理
 * - 権限管理
 * - 監査ログ
 */

export interface ManagedUser {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: number;
  lastLogin?: number;
  permissions: string[];
}

export interface UserAction {
  id: string;
  userId: number;
  action: string;
  details: Record<string, any>;
  timestamp: number;
  result: 'success' | 'failure';
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  adminCount: number;
  userCount: number;
  guestCount: number;
}

export class UserManagementPanel {
  private static instance: UserManagementPanel;
  private users: Map<number, ManagedUser> = new Map();
  private userActions: UserAction[] = [];
  private actionCounter: number = 0;

  private constructor() {}

  static getInstance(): UserManagementPanel {
    if (!UserManagementPanel.instance) {
      UserManagementPanel.instance = new UserManagementPanel();
    }
    return UserManagementPanel.instance;
  }

  /**
   * ユーザー追加
   */
  addUser(
    userId: number,
    username: string,
    email: string,
    role: 'admin' | 'user' | 'guest'
  ): ManagedUser {
    const permissions = this.getPermissionsByRole(role);

    const user: ManagedUser = {
      id: userId,
      username,
      email,
      role,
      status: 'active',
      createdAt: Date.now(),
      permissions,
    };

    this.users.set(userId, user);
    this.recordAction(userId, 'user_created', { username, email, role }, 'success');
    return user;
  }

  /**
   * ユーザー取得
   */
  getUser(userId: number): ManagedUser | null {
    return this.users.get(userId) || null;
  }

  /**
   * すべてのユーザー取得
   */
  getAllUsers(): ManagedUser[] {
    return Array.from(this.users.values());
  }

  /**
   * ユーザーロール変更
   */
  updateUserRole(userId: number, newRole: 'admin' | 'user' | 'guest'): ManagedUser | null {
    const user = this.getUser(userId);
    if (!user) return null;

    const oldRole = user.role;
    user.role = newRole;
    user.permissions = this.getPermissionsByRole(newRole);

    this.recordAction(userId, 'role_changed', { oldRole, newRole }, 'success');
    return user;
  }

  /**
   * ユーザーステータス変更
   */
  updateUserStatus(userId: number, newStatus: 'active' | 'inactive' | 'suspended'): ManagedUser | null {
    const user = this.getUser(userId);
    if (!user) return null;

    const oldStatus = user.status;
    user.status = newStatus;

    this.recordAction(userId, 'status_changed', { oldStatus, newStatus }, 'success');
    return user;
  }

  /**
   * ユーザー削除
   */
  deleteUser(userId: number): boolean {
    const user = this.getUser(userId);
    if (!user) return false;

    this.users.delete(userId);
    this.recordAction(userId, 'user_deleted', { username: user.username }, 'success');
    return true;
  }

  /**
   * ロール別権限取得
   */
  private getPermissionsByRole(role: string): string[] {
    switch (role) {
      case 'admin':
        return ['read', 'write', 'delete', 'manage_users', 'manage_settings'];
      case 'user':
        return ['read', 'write'];
      case 'guest':
        return ['read'];
      default:
        return [];
    }
  }

  /**
   * アクション記録
   */
  recordAction(
    userId: number,
    action: string,
    details: Record<string, any>,
    result: 'success' | 'failure'
  ): UserAction {
    const actionId = `action_${++this.actionCounter}_${Date.now()}`;

    const userAction: UserAction = {
      id: actionId,
      userId,
      action,
      details,
      timestamp: Date.now(),
      result,
    };

    this.userActions.push(userAction);

    // 最新10000件のみ保持
    if (this.userActions.length > 10000) {
      this.userActions.shift();
    }

    return userAction;
  }

  /**
   * ユーザーアクション履歴取得
   */
  getUserActions(userId: number, limit: number = 100): UserAction[] {
    return this.userActions
      .filter((a: UserAction) => a.userId === userId)
      .slice(-limit);
  }

  /**
   * すべてのアクション取得
   */
  getAllActions(limit: number = 100): UserAction[] {
    const start = Math.max(0, this.userActions.length - limit);
    return this.userActions.slice(start);
  }

  /**
   * ユーザー統計取得
   */
  getUserStatistics(): UserStatistics {
    const users = this.getAllUsers();
    const activeCount = users.filter((u: ManagedUser) => u.status === 'active').length;
    const inactiveCount = users.filter((u: ManagedUser) => u.status === 'inactive').length;
    const suspendedCount = users.filter((u: ManagedUser) => u.status === 'suspended').length;
    const adminCount = users.filter((u: ManagedUser) => u.role === 'admin').length;
    const userCount = users.filter((u: ManagedUser) => u.role === 'user').length;
    const guestCount = users.filter((u: ManagedUser) => u.role === 'guest').length;

    return {
      totalUsers: users.length,
      activeUsers: activeCount,
      inactiveUsers: inactiveCount,
      suspendedUsers: suspendedCount,
      adminCount,
      userCount,
      guestCount,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.users.clear();
    this.userActions = [];
  }
}

export const userManagementPanel = UserManagementPanel.getInstance();
export default userManagementPanel;
