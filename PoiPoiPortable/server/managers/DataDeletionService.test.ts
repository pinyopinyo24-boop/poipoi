/**
 * DataDeletionService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dataDeletionService, DataDeletionService } from './DataDeletionService';

describe('DataDeletionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataDeletionService.cleanup();
  });

  afterEach(() => {
    dataDeletionService.cleanup();
  });

  describe('Deletion Request Creation', () => {
    it('should create deletion request', () => {
      const request = dataDeletionService.createDeletionRequest('user1', 'account');
      expect(request.id).toBeDefined();
      expect(request.userId).toBe('user1');
      expect(request.status).toBe('pending');
    });

    it('should create deletion request with reason', () => {
      const request = dataDeletionService.createDeletionRequest('user1', 'account', 'User requested deletion');
      expect(request.reason).toBe('User requested deletion');
    });
  });

  describe('Deletion Request Retrieval', () => {
    it('should get deletion request', () => {
      const created = dataDeletionService.createDeletionRequest('user1', 'account');
      const retrieved = dataDeletionService.getDeletionRequest(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.userId).toBe('user1');
    });

    it('should get user deletion requests', () => {
      dataDeletionService.createDeletionRequest('user1', 'account');
      dataDeletionService.createDeletionRequest('user1', 'files');
      const requests = dataDeletionService.getUserDeletionRequests('user1');
      expect(requests.length).toBe(2);
    });

    it('should return null for non-existent request', () => {
      const retrieved = dataDeletionService.getDeletionRequest('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('Deletion Request Status Update', () => {
    it('should start deletion request', () => {
      const created = dataDeletionService.createDeletionRequest('user1', 'account');
      const started = dataDeletionService.startDeletionRequest(created.id);
      expect(started?.status).toBe('processing');
      expect(started?.startedAt).toBeDefined();
    });

    it('should complete deletion request', () => {
      const created = dataDeletionService.createDeletionRequest('user1', 'account');
      dataDeletionService.startDeletionRequest(created.id);
      const completed = dataDeletionService.completeDeletionRequest(created.id, 100);
      expect(completed?.status).toBe('completed');
      expect(completed?.deletedItemCount).toBe(100);
    });

    it('should fail deletion request', () => {
      const created = dataDeletionService.createDeletionRequest('user1', 'account');
      const failed = dataDeletionService.failDeletionRequest(created.id, 'Database connection error');
      expect(failed?.status).toBe('failed');
      expect(failed?.errorMessage).toBe('Database connection error');
    });
  });

  describe('Deletion Logging', () => {
    it('should log deletion', () => {
      const log = dataDeletionService.logDeletion('user1', 'conversation', 'conv_123');
      expect(log.id).toBeDefined();
      expect(log.userId).toBe('user1');
      expect(log.itemType).toBe('conversation');
    });

    it('should get user deletion logs', () => {
      dataDeletionService.logDeletion('user1', 'conversation', 'conv_1');
      dataDeletionService.logDeletion('user1', 'conversation', 'conv_2');
      const logs = dataDeletionService.getUserDeletionLogs('user1');
      expect(logs.length).toBe(2);
    });

    it('should log deletion with reason', () => {
      const log = dataDeletionService.logDeletion('user1', 'files', 'file_123', 'User requested');
      expect(log.reason).toBe('User requested');
    });
  });

  describe('Deletion Statistics', () => {
    it('should get deletion statistics', () => {
      dataDeletionService.createDeletionRequest('user1', 'account');
      dataDeletionService.createDeletionRequest('user2', 'files');
      const stats = dataDeletionService.getDeletionStatistics();
      expect(stats.totalRequests).toBe(2);
      expect(stats.pendingRequests).toBe(2);
    });

    it('should count completed requests', () => {
      const req1 = dataDeletionService.createDeletionRequest('user1', 'account');
      const req2 = dataDeletionService.createDeletionRequest('user2', 'files');

      dataDeletionService.startDeletionRequest(req1.id);
      dataDeletionService.completeDeletionRequest(req1.id, 50);

      dataDeletionService.startDeletionRequest(req2.id);
      dataDeletionService.completeDeletionRequest(req2.id, 30);

      const stats = dataDeletionService.getDeletionStatistics();
      expect(stats.completedRequests).toBe(2);
      expect(stats.totalDeletedItems).toBe(80);
    });

    it('should get user deletion statistics', () => {
      const req = dataDeletionService.createDeletionRequest('user1', 'account');
      dataDeletionService.startDeletionRequest(req.id);
      dataDeletionService.completeDeletionRequest(req.id, 100);

      const stats = dataDeletionService.getUserDeletionStatistics('user1');
      expect(stats.userId).toBe('user1');
      expect(stats.totalRequests).toBe(1);
      expect(stats.completedRequests).toBe(1);
      expect(stats.totalDeletedItems).toBe(100);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      dataDeletionService.createDeletionRequest('user1', 'account');
      dataDeletionService.logDeletion('user1', 'conversation', 'conv_1');
      dataDeletionService.cleanup();
      const requests = dataDeletionService.getUserDeletionRequests('user1');
      expect(requests.length).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = DataDeletionService.getInstance();
      const instance2 = DataDeletionService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
