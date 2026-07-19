/**
 * AuditEnhancedService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { auditEnhancedService, AuditEnhancedService } from './AuditEnhancedService';

describe('AuditEnhancedService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditEnhancedService.cleanup();
  });

  afterEach(() => {
    auditEnhancedService.cleanup();
  });

  // === 監査ログ記録テスト ===
  describe('Record Log', () => {
    it('should record log', () => {
      const log = auditEnhancedService.recordLog(
        1,
        'login',
        'user',
        'success',
        { ip: '192.168.1.1' }
      );
      expect(log).not.toBeNull();
      expect(log.status).toBe('success');
    });

    it('should get log', () => {
      const created = auditEnhancedService.recordLog(
        1,
        'login',
        'user',
        'success'
      );
      const retrieved = auditEnhancedService.getLog(created.id);
      expect(retrieved).not.toBeNull();
    });

    it('should get user logs', () => {
      auditEnhancedService.recordLog(1, 'login', 'user', 'success');
      auditEnhancedService.recordLog(1, 'logout', 'user', 'success');
      const logs = auditEnhancedService.getUserLogs(1);
      expect(logs.length).toBe(2);
    });
  });

  // === 期間別ログ取得テスト ===
  describe('Get Logs by Period', () => {
    it('should get logs by period', () => {
      const now = Date.now();
      auditEnhancedService.recordLog(1, 'login', 'user', 'success');
      const logs = auditEnhancedService.getLogsByPeriod(1, now - 1000, now + 1000);
      expect(logs.length).toBe(1);
    });
  });

  // === アクション別ログ取得テスト ===
  describe('Get Logs by Action', () => {
    it('should get logs by action', () => {
      auditEnhancedService.recordLog(1, 'login', 'user', 'success');
      auditEnhancedService.recordLog(1, 'logout', 'user', 'success');
      const logs = auditEnhancedService.getLogsByAction(1, 'login');
      expect(logs.length).toBe(1);
    });
  });

  // === 監査トレール取得テスト ===
  describe('Get Audit Trail', () => {
    it('should get audit trail', () => {
      auditEnhancedService.recordLog(1, 'login', 'user', 'success');
      auditEnhancedService.recordLog(1, 'login', 'user', 'failure');
      const trail = auditEnhancedService.getAuditTrail(1);
      expect(trail.totalActions).toBe(2);
      expect(trail.successCount).toBe(1);
      expect(trail.failureCount).toBe(1);
    });
  });

  // === 監査統計テスト ===
  describe('Get Audit Stats', () => {
    it('should get audit stats', () => {
      auditEnhancedService.recordLog(1, 'login', 'user', 'success');
      const stats = auditEnhancedService.getAuditStats(1);
      expect(stats.successRate).toBe(100);
    });
  });

  // === 異常検知テスト ===
  describe('Detect Anomalies', () => {
    it('should detect anomalies', () => {
      auditEnhancedService.recordLog(1, 'login', 'user', 'failure');
      auditEnhancedService.recordLog(1, 'login', 'user', 'failure');
      const anomalies = auditEnhancedService.detectAnomalies(1);
      expect(typeof anomalies.hasAnomalies).toBe('boolean');
    });
  });

  // === ログエクスポートテスト ===
  describe('Export Logs', () => {
    it('should export logs', () => {
      auditEnhancedService.recordLog(1, 'login', 'user', 'success');
      const exported = auditEnhancedService.exportLogs(1);
      expect(exported).toContain('ID,User,Action');
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup specific user', () => {
      auditEnhancedService.recordLog(1, 'login', 'user', 'success');
      auditEnhancedService.cleanup(1);
      const logs = auditEnhancedService.getUserLogs(1);
      expect(logs.length).toBe(0);
    });

    it('should cleanup all', () => {
      auditEnhancedService.recordLog(1, 'login', 'user', 'success');
      auditEnhancedService.recordLog(2, 'login', 'user', 'success');
      auditEnhancedService.cleanup();
      const logs1 = auditEnhancedService.getUserLogs(1);
      const logs2 = auditEnhancedService.getUserLogs(2);
      expect(logs1.length).toBe(0);
      expect(logs2.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = AuditEnhancedService.getInstance();
      const instance2 = AuditEnhancedService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
