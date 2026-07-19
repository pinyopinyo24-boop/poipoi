/**
 * AdminConsoleUI Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { adminConsoleUI, AdminConsoleUI } from './AdminConsoleUI';

describe('AdminConsoleUI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminConsoleUI.cleanup();
  });

  afterEach(() => {
    adminConsoleUI.cleanup();
  });

  // === ログインテスト ===
  describe('Login', () => {
    it('should login user', () => {
      const user = adminConsoleUI.login(1, 'admin', 'admin@example.com', 'super_admin');
      expect(user).not.toBeNull();
      expect(user.role).toBe('super_admin');
    });

    it('should get current user', () => {
      adminConsoleUI.login(1, 'admin', 'admin@example.com', 'super_admin');
      const user = adminConsoleUI.getCurrentUser();
      expect(user).not.toBeNull();
      expect(user?.username).toBe('admin');
    });

    it('should set permissions by role', () => {
      adminConsoleUI.login(1, 'admin', 'admin@example.com', 'admin');
      const user = adminConsoleUI.getCurrentUser();
      expect(user?.permissions.length).toBeGreaterThan(0);
    });
  });

  // === 権限確認テスト ===
  describe('Permission Check', () => {
    it('should have permission for super_admin', () => {
      adminConsoleUI.login(1, 'admin', 'admin@example.com', 'super_admin');
      const hasPermission = adminConsoleUI.hasPermission('manage_users');
      expect(hasPermission).toBe(true);
    });

    it('should not have permission for operator', () => {
      adminConsoleUI.login(1, 'operator', 'operator@example.com', 'operator');
      const hasPermission = adminConsoleUI.hasPermission('manage_settings');
      expect(hasPermission).toBe(false);
    });
  });

  // === ナビゲーションメニューテスト ===
  describe('Navigation Menu', () => {
    it('should get navigation menu for super_admin', () => {
      adminConsoleUI.login(1, 'admin', 'admin@example.com', 'super_admin');
      const menu = adminConsoleUI.getNavigationMenu();
      expect(menu.length).toBeGreaterThan(0);
    });

    it('should filter menu by permissions', () => {
      adminConsoleUI.login(1, 'operator', 'operator@example.com', 'operator');
      const menu = adminConsoleUI.getNavigationMenu();
      expect(menu.length).toBeLessThan(7);
    });
  });

  // === コンポーネント管理テスト ===
  describe('Component Management', () => {
    it('should add component', () => {
      const component = adminConsoleUI.addComponent(
        'Dashboard Widget',
        'widget',
        { x: 0, y: 0 },
        { width: 300, height: 200 }
      );
      expect(component).not.toBeNull();
    });

    it('should get component', () => {
      const added = adminConsoleUI.addComponent(
        'Dashboard Widget',
        'widget',
        { x: 0, y: 0 },
        { width: 300, height: 200 }
      );
      const retrieved = adminConsoleUI.getComponent(added.id);
      expect(retrieved).not.toBeNull();
    });

    it('should toggle component visibility', () => {
      const added = adminConsoleUI.addComponent(
        'Dashboard Widget',
        'widget',
        { x: 0, y: 0 },
        { width: 300, height: 200 }
      );
      const toggled = adminConsoleUI.toggleComponent(added.id);
      expect(toggled?.visible).toBe(false);
    });

    it('should get all components', () => {
      adminConsoleUI.addComponent('Widget 1', 'widget', { x: 0, y: 0 }, { width: 300, height: 200 });
      adminConsoleUI.addComponent('Widget 2', 'widget', { x: 300, y: 0 }, { width: 300, height: 200 });
      const components = adminConsoleUI.getAllComponents();
      expect(components.length).toBe(2);
    });
  });

  // === ダッシュボードレイアウトテスト ===
  describe('Dashboard Layout', () => {
    it('should get dashboard layout', () => {
      adminConsoleUI.addComponent('Dashboard', 'dashboard', { x: 0, y: 0 }, { width: 1200, height: 800 });
      const layout = adminConsoleUI.getDashboardLayout();
      expect(layout.layout).toBe('grid');
    });
  });

  // === ログアウトテスト ===
  describe('Logout', () => {
    it('should logout user', () => {
      adminConsoleUI.login(1, 'admin', 'admin@example.com', 'super_admin');
      adminConsoleUI.logout();
      const user = adminConsoleUI.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = AdminConsoleUI.getInstance();
      const instance2 = AdminConsoleUI.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
