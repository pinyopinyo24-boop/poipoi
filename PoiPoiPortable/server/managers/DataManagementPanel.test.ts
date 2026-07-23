/**
 * DataManagementPanel Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dataManagementPanel, DataManagementPanel } from './DataManagementPanel';

describe('DataManagementPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataManagementPanel.cleanup();
  });

  afterEach(() => {
    dataManagementPanel.cleanup();
  });

  // === データベース状態管理テスト ===
  describe('Database Status Management', () => {
    it('should update database status', () => {
      const status = dataManagementPanel.updateDatabaseStatus('users', 1000000, 5, 10000, 'healthy');
      expect(status).not.toBeNull();
      expect(status.name).toBe('users');
    });

    it('should get database status', () => {
      dataManagementPanel.updateDatabaseStatus('users', 1000000, 5, 10000, 'healthy');
      const status = dataManagementPanel.getDatabaseStatus('users');
      expect(status).not.toBeNull();
      expect(status?.recordCount).toBe(10000);
    });

    it('should get all database statuses', () => {
      dataManagementPanel.updateDatabaseStatus('users', 1000000, 5, 10000, 'healthy');
      dataManagementPanel.updateDatabaseStatus('conversations', 2000000, 3, 5000, 'healthy');
      const statuses = dataManagementPanel.getAllDatabaseStatuses();
      expect(statuses.length).toBeGreaterThan(0);
    });
  });

  // === バックアップ管理テスト ===
  describe('Backup Management', () => {
    it('should create backup', () => {
      const backup = dataManagementPanel.createBackup('Daily backup');
      expect(backup).not.toBeNull();
      expect(backup.status).toBe('completed');
    });

    it('should get backup', () => {
      const created = dataManagementPanel.createBackup('Daily backup');
      const retrieved = dataManagementPanel.getBackup(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.description).toBe('Daily backup');
    });

    it('should get all backups', () => {
      dataManagementPanel.createBackup('Backup 1');
      dataManagementPanel.createBackup('Backup 2');
      const backups = dataManagementPanel.getAllBackups();
      expect(backups.length).toBe(2);
    });
  });

  // === データ検証テスト ===
  describe('Data Validation', () => {
    it('should validate data', () => {
      const result = dataManagementPanel.validateData(1000, 950);
      expect(result).not.toBeNull();
      expect(result.validationRate).toBe(95);
    });

    it('should get validation results', () => {
      dataManagementPanel.validateData(1000, 950);
      dataManagementPanel.validateData(1000, 900);
      const results = dataManagementPanel.getValidationResults();
      expect(results.length).toBe(2);
    });

    it('should get latest validation result', () => {
      dataManagementPanel.validateData(1000, 950);
      const latest = dataManagementPanel.getLatestValidationResult();
      expect(latest).not.toBeNull();
      expect(latest?.validationRate).toBe(95);
    });

    it('should detect validation issues', () => {
      const result = dataManagementPanel.validateData(1000, 800);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  // === データベース統計テスト ===
  describe('Database Statistics', () => {
    it('should get database statistics', () => {
      dataManagementPanel.updateDatabaseStatus('users', 1000000, 5, 10000, 'healthy');
      dataManagementPanel.updateDatabaseStatus('conversations', 2000000, 3, 5000, 'healthy');
      const stats = dataManagementPanel.getDatabaseStatistics();
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should count database status', () => {
      dataManagementPanel.updateDatabaseStatus('users', 1000000, 5, 10000, 'healthy');
      dataManagementPanel.updateDatabaseStatus('conversations', 2000000, 3, 5000, 'warning');
      const stats = dataManagementPanel.getDatabaseStatistics();
      expect(stats.healthyDatabases).toBeGreaterThan(0);
      expect(stats.warningDatabases).toBeGreaterThan(0);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup', () => {
      dataManagementPanel.updateDatabaseStatus('users', 1000000, 5, 10000, 'healthy');
      dataManagementPanel.cleanup();
      const statuses = dataManagementPanel.getAllDatabaseStatuses();
      expect(statuses.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = DataManagementPanel.getInstance();
      const instance2 = DataManagementPanel.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
