/**
 * AdminConsoleUI - 管理画面UI
 * 
 * 機能:
 * - ダッシュボード表示
 * - ナビゲーション管理
 * - ユーザーインターフェース
 * - 権限管理
 */

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'operator';
  permissions: string[];
  lastLogin: number;
  isActive: boolean;
}

export interface UIComponent {
  id: string;
  name: string;
  type: 'dashboard' | 'panel' | 'modal' | 'widget';
  visible: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface Navigation {
  id: string;
  label: string;
  path: string;
  icon: string;
  children?: Navigation[];
  requiresPermission?: string;
}

export class AdminConsoleUI {
  private static instance: AdminConsoleUI;
  private currentUser: AdminUser | null = null;
  private components: Map<string, UIComponent> = new Map();
  private navigationMenu: Navigation[] = [];
  private userCounter: number = 0;
  private componentCounter: number = 0;

  private constructor() {
    this.initializeNavigation();
  }

  static getInstance(): AdminConsoleUI {
    if (!AdminConsoleUI.instance) {
      AdminConsoleUI.instance = new AdminConsoleUI();
    }
    return AdminConsoleUI.instance;
  }

  /**
   * ナビゲーション初期化
   */
  private initializeNavigation(): void {
    this.navigationMenu = [
      {
        id: 'dashboard',
        label: 'ダッシュボード',
        path: '/admin/dashboard',
        icon: 'dashboard',
      },
      {
        id: 'users',
        label: 'ユーザー管理',
        path: '/admin/users',
        icon: 'users',
        requiresPermission: 'manage_users',
      },
      {
        id: 'ai_status',
        label: 'AI状態',
        path: '/admin/ai-status',
        icon: 'cpu',
        requiresPermission: 'view_ai_status',
      },
      {
        id: 'data',
        label: 'データ管理',
        path: '/admin/data',
        icon: 'database',
        requiresPermission: 'manage_data',
      },
      {
        id: 'manufacturing',
        label: '製造監視',
        path: '/admin/manufacturing',
        icon: 'factory',
        requiresPermission: 'view_manufacturing',
      },
      {
        id: 'compliance',
        label: 'コンプライアンス',
        path: '/admin/compliance',
        icon: 'shield',
        requiresPermission: 'view_compliance',
      },
      {
        id: 'settings',
        label: '設定',
        path: '/admin/settings',
        icon: 'settings',
        requiresPermission: 'manage_settings',
      },
    ];
  }

  /**
   * 管理ユーザーログイン
   */
  login(userId: number, username: string, email: string, role: 'super_admin' | 'admin' | 'operator'): AdminUser {
    const permissions = this.getPermissionsByRole(role);

    const user: AdminUser = {
      id: userId,
      username,
      email,
      role,
      permissions,
      lastLogin: Date.now(),
      isActive: true,
    };

    this.currentUser = user;
    return user;
  }

  /**
   * ロール別権限取得
   */
  private getPermissionsByRole(role: string): string[] {
    switch (role) {
      case 'super_admin':
        return [
          'manage_users',
          'view_ai_status',
          'manage_data',
          'view_manufacturing',
          'view_compliance',
          'manage_settings',
          'view_audit_logs',
          'manage_system',
        ];
      case 'admin':
        return [
          'manage_users',
          'view_ai_status',
          'manage_data',
          'view_manufacturing',
          'view_compliance',
          'view_audit_logs',
        ];
      case 'operator':
        return ['view_ai_status', 'view_manufacturing', 'view_audit_logs'];
      default:
        return [];
    }
  }

  /**
   * 現在のユーザー取得
   */
  getCurrentUser(): AdminUser | null {
    return this.currentUser;
  }

  /**
   * 権限確認
   */
  hasPermission(permission: string): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.permissions.includes(permission);
  }

  /**
   * ナビゲーションメニュー取得
   */
  getNavigationMenu(): Navigation[] {
    if (!this.currentUser) return [];

    return this.navigationMenu.filter((item: Navigation) => {
      if (!item.requiresPermission) return true;
      return this.hasPermission(item.requiresPermission);
    });
  }

  /**
   * コンポーネント追加
   */
  addComponent(
    name: string,
    type: 'dashboard' | 'panel' | 'modal' | 'widget',
    position: { x: number; y: number },
    size: { width: number; height: number }
  ): UIComponent {
    const componentId = `comp_${++this.componentCounter}_${Date.now()}`;

    const component: UIComponent = {
      id: componentId,
      name,
      type,
      visible: true,
      position,
      size,
    };

    this.components.set(componentId, component);
    return component;
  }

  /**
   * コンポーネント取得
   */
  getComponent(componentId: string): UIComponent | null {
    return this.components.get(componentId) || null;
  }

  /**
   * コンポーネント表示/非表示
   */
  toggleComponent(componentId: string): UIComponent | null {
    const component = this.getComponent(componentId);
    if (!component) return null;

    component.visible = !component.visible;
    return component;
  }

  /**
   * すべてのコンポーネント取得
   */
  getAllComponents(): UIComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * ダッシュボードレイアウト取得
   */
  getDashboardLayout(): {
    components: UIComponent[];
    layout: string;
  } {
    const components = Array.from(this.components.values()).filter(
      (c: UIComponent) => c.type === 'dashboard' && c.visible
    );

    return {
      components,
      layout: 'grid',
    };
  }

  /**
   * ログアウト
   */
  logout(): void {
    this.currentUser = null;
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.currentUser = null;
    this.components.clear();
  }
}

export const adminConsoleUI = AdminConsoleUI.getInstance();
export default adminConsoleUI;
