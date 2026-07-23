/**
 * UserManagementPanel Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { userManagementPanel, UserManagementPanel } from './UserManagementPanel';

describe('UserManagementPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userManagementPanel.cleanup();
  });

  afterEach(() => {
    userManagementPanel.cleanup();
  });

  // === ユーザー追加テスト ===
  describe('Add User', () => {
    it('should add user', () => {
      const user = userManagementPanel.addUser(1, 'testuser', 'test@example.com', 'user');
      expect(user).not.toBeNull();
      expect(user.username).toBe('testuser');
    });

    it('should get user', () => {
      userManagementPanel.addUser(1, 'testuser', 'test@example.com', 'user');
      const user = userManagementPanel.getUser(1);
      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@example.com');
    });

    it('should get all users', () => {
      userManagementPanel.addUser(1, 'user1', 'user1@example.com', 'user');
      userManagementPanel.addUser(2, 'user2', 'user2@example.com', 'user');
      const users = userManagementPanel.getAllUsers();
      expect(users.length).toBe(2);
    });
  });

  // === ロール管理テスト ===
  describe('Role Management', () => {
    it('should update user role', () => {
      userManagementPanel.addUser(1, 'testuser', 'test@example.com', 'user');
      const updated = userManagementPanel.updateUserRole(1, 'admin');
      expect(updated?.role).toBe('admin');
    });

    it('should update permissions with role', () => {
      userManagementPanel.addUser(1, 'testuser', 'test@example.com', 'guest');
      const user = userManagementPanel.getUser(1);
      expect(user?.permissions.length).toBeLessThan(5);
    });
  });

  // === ステータス管理テスト ===
  describe('Status Management', () => {
    it('should update user status', () => {
      userManagementPanel.addUser(1, 'testuser', 'test@example.com', 'user');
      const updated = userManagementPanel.updateUserStatus(1, 'inactive');
      expect(updated?.status).toBe('inactive');
    });

    it('should suspend user', () => {
      userManagementPanel.addUser(1, 'testuser', 'test@example.com', 'user');
      const updated = userManagementPanel.updateUserStatus(1, 'suspended');
      expect(updated?.status).toBe('suspended');
    });
  });

  // === ユーザー削除テスト ===
  describe('Delete User', () => {
    it('should delete user', () => {
      userManagementPanel.addUser(1, 'testuser', 'test@example.com', 'user');
      const result = userManagementPanel.deleteUser(1);
      expect(result).toBe(true);
    });

    it('should not delete non-existent user', () => {
      const result = userManagementPanel.deleteUser(999);
      expect(result).toBe(false);
    });
  });

  // === アクション記録テスト ===
  describe('Action Recording', () => {
    it('should record action', () => {
      const action = userManagementPanel.recordAction(1, 'login', { ip: '127.0.0.1' }, 'success');
      expect(action).not.toBeNull();
      expect(action.action).toBe('login');
    });

    it('should get user actions', () => {
      userManagementPanel.recordAction(1, 'login', { ip: '127.0.0.1' }, 'success');
      userManagementPanel.recordAction(1, 'logout', {}, 'success');
      const actions = userManagementPanel.getUserActions(1);
      expect(actions.length).toBe(2);
    });

    it('should get all actions', () => {
      userManagementPanel.recordAction(1, 'login', { ip: '127.0.0.1' }, 'success');
      userManagementPanel.recordAction(2, 'login', { ip: '127.0.0.2' }, 'success');
      const actions = userManagementPanel.getAllActions();
      expect(actions.length).toBeGreaterThanOrEqual(2);
    });
  });

  // === ユーザー統計テスト ===
  describe('User Statistics', () => {
    it('should get user statistics', () => {
      userManagementPanel.addUser(1, 'user1', 'user1@example.com', 'admin');
      userManagementPanel.addUser(2, 'user2', 'user2@example.com', 'user');
      const stats = userManagementPanel.getUserStatistics();
      expect(stats.totalUsers).toBe(2);
    });

    it('should count by role', () => {
      userManagementPanel.addUser(1, 'admin1', 'admin@example.com', 'admin');
      userManagementPanel.addUser(2, 'user1', 'user@example.com', 'user');
      userManagementPanel.addUser(3, 'guest1', 'guest@example.com', 'guest');
      const stats = userManagementPanel.getUserStatistics();
      expect(stats.adminCount).toBe(1);
      expect(stats.userCount).toBe(1);
      expect(stats.guestCount).toBe(1);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = UserManagementPanel.getInstance();
      const instance2 = UserManagementPanel.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
