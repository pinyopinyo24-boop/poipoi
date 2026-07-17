/**
 * AuditSearchService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { auditSearchService, AuditSearchService } from './AuditSearchService';

describe('AuditSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditSearchService.cleanup();
  });

  afterEach(() => {
    auditSearchService.cleanup();
  });

  // === ログ追加テスト ===
  describe('Add Log', () => {
    it('should add log', () => {
      const log = {
        id: 'log_1',
        action: 'login',
        resource: 'user',
        status: 'success',
        timestamp: Date.now(),
        details: {},
      };
      auditSearchService.addLog(1, log);
      const stats = auditSearchService.getSearchStats();
      expect(stats.totalLogs).toBe(1);
    });
  });

  // === 検索テスト ===
  describe('Search', () => {
    it('should search by user', () => {
      const log = {
        id: 'log_1',
        action: 'login',
        resource: 'user',
        status: 'success',
        timestamp: Date.now(),
        details: {},
      };
      auditSearchService.addLog(1, log);
      const result = auditSearchService.search({ userId: 1 });
      expect(result.total).toBe(1);
    });

    it('should search by action', () => {
      const log = {
        id: 'log_1',
        action: 'login',
        resource: 'user',
        status: 'success',
        timestamp: Date.now(),
        details: {},
      };
      auditSearchService.addLog(1, log);
      const result = auditSearchService.search({ action: 'login' });
      expect(result.total).toBe(1);
    });

    it('should search by status', () => {
      const log = {
        id: 'log_1',
        action: 'login',
        resource: 'user',
        status: 'success',
        timestamp: Date.now(),
        details: {},
      };
      auditSearchService.addLog(1, log);
      const result = auditSearchService.search({ status: 'success' });
      expect(result.total).toBe(1);
    });

    it('should search with pagination', () => {
      for (let i = 0; i < 10; i++) {
        auditSearchService.addLog(1, {
          id: `log_${i}`,
          action: 'login',
          resource: 'user',
          status: 'success',
          timestamp: Date.now(),
          details: {},
        });
      }
      const result = auditSearchService.search({ limit: 5, offset: 0 });
      expect(result.results.length).toBe(5);
    });
  });

  // === キーワード検索テスト ===
  describe('Search by Keyword', () => {
    it('should search by keyword', () => {
      const log = {
        id: 'log_1',
        action: 'login',
        resource: 'user',
        status: 'success',
        timestamp: Date.now(),
        details: { ip: '192.168.1.1' },
      };
      auditSearchService.addLog(1, log);
      const result = auditSearchService.searchByKeyword('login');
      expect(result.total).toBe(1);
    });
  });

  // === アクション別検索テスト ===
  describe('Search by Action', () => {
    it('should search by action', () => {
      auditSearchService.addLog(1, {
        id: 'log_1',
        action: 'login',
        resource: 'user',
        status: 'success',
        timestamp: Date.now(),
        details: {},
      });
      const result = auditSearchService.searchByAction('login');
      expect(result.total).toBe(1);
    });
  });

  // === 期間別検索テスト ===
  describe('Search by Period', () => {
    it('should search by period', () => {
      const now = Date.now();
      auditSearchService.addLog(1, {
        id: 'log_1',
        action: 'login',
        resource: 'user',
        status: 'success',
        timestamp: now,
        details: {},
      });
      const result = auditSearchService.searchByPeriod(now - 1000, now + 1000);
      expect(result.total).toBe(1);
    });
  });

  // === ユーザー別検索テスト ===
  describe('Search by User', () => {
    it('should search by user', () => {
      auditSearchService.addLog(1, {
        id: 'log_1',
        action: 'login',
        resource: 'user',
        status: 'success',
        timestamp: Date.now(),
        details: {},
      });
      const result = auditSearchService.searchByUser(1);
      expect(result.total).toBe(1);
    });
  });

  // === 検索統計テスト ===
  describe('Get Search Stats', () => {
    it('should get search stats', () => {
      auditSearchService.addLog(1, {
        id: 'log_1',
        action: 'login',
        resource: 'user',
        status: 'success',
        timestamp: Date.now(),
        details: {},
      });
      const stats = auditSearchService.getSearchStats();
      expect(stats.totalLogs).toBe(1);
      expect(stats.userCount).toBe(1);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup specific user', () => {
      auditSearchService.addLog(1, {
        id: 'log_1',
        action: 'login',
        resource: 'user',
        status: 'success',
        timestamp: Date.now(),
        details: {},
      });
      auditSearchService.cleanup(1);
      const stats = auditSearchService.getSearchStats();
      expect(stats.totalLogs).toBe(0);
    });

    it('should cleanup all', () => {
      auditSearchService.addLog(1, {
        id: 'log_1',
        action: 'login',
        resource: 'user',
        status: 'success',
        timestamp: Date.now(),
        details: {},
      });
      auditSearchService.cleanup();
      const stats = auditSearchService.getSearchStats();
      expect(stats.totalLogs).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = AuditSearchService.getInstance();
      const instance2 = AuditSearchService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
