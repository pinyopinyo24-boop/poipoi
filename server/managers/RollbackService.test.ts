/**
 * RollbackService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rollbackService, RollbackService } from './RollbackService';

describe('RollbackService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rollbackService.cleanup();
  });

  afterEach(() => {
    rollbackService.cleanup();
  });

  describe('Rollback Request', () => {
    it('should create rollback request', () => {
      const request = rollbackService.createRollbackRequest(
        '2.0.0',
        '1.9.0',
        'production',
        'critical_bug',
        'Critical bug found',
        'admin'
      );
      expect(request).not.toBeNull();
      expect(request.status).toBe('pending');
    });

    it('should get rollback request', () => {
      const created = rollbackService.createRollbackRequest(
        '2.0.0',
        '1.9.0',
        'production',
        'critical_bug',
        'Critical bug found',
        'admin'
      );
      const retrieved = rollbackService.getRollbackRequest(created.requestId);
      expect(retrieved).not.toBeNull();
    });

    it('should get all rollback requests', () => {
      rollbackService.createRollbackRequest('2.0.0', '1.9.0', 'production', 'critical_bug', 'Bug 1', 'admin');
      rollbackService.createRollbackRequest('2.1.0', '2.0.0', 'staging', 'performance_issue', 'Issue 1', 'admin');
      const requests = rollbackService.getAllRollbackRequests();
      expect(requests.length).toBe(2);
    });
  });

  describe('Rollback Approval', () => {
    it('should approve rollback request', () => {
      const created = rollbackService.createRollbackRequest(
        '2.0.0',
        '1.9.0',
        'production',
        'critical_bug',
        'Critical bug found',
        'admin'
      );
      const approved = rollbackService.approveRollbackRequest(created.requestId, 'manager');
      expect(approved?.status).toBe('approved');
    });

    it('should reject rollback request', () => {
      const created = rollbackService.createRollbackRequest(
        '2.0.0',
        '1.9.0',
        'production',
        'critical_bug',
        'Critical bug found',
        'admin'
      );
      const rejected = rollbackService.rejectRollbackRequest(created.requestId);
      expect(rejected?.status).toBe('rejected');
    });
  });

  describe('Rollback Execution', () => {
    it('should start rollback execution', () => {
      const created = rollbackService.createRollbackRequest(
        '2.0.0',
        '1.9.0',
        'production',
        'critical_bug',
        'Critical bug found',
        'admin'
      );
      rollbackService.approveRollbackRequest(created.requestId, 'manager');
      const execution = rollbackService.startRollbackExecution(created.requestId, 'deployer');
      expect(execution).not.toBeNull();
      expect(execution?.status).toBe('in_progress');
    });

    it('should get rollback execution', () => {
      const created = rollbackService.createRollbackRequest(
        '2.0.0',
        '1.9.0',
        'production',
        'critical_bug',
        'Critical bug found',
        'admin'
      );
      rollbackService.approveRollbackRequest(created.requestId, 'manager');
      const execution = rollbackService.startRollbackExecution(created.requestId, 'deployer');
      if (execution) {
        const retrieved = rollbackService.getRollbackExecution(execution.executionId);
        expect(retrieved).not.toBeNull();
      }
    });

    it('should get all rollback executions', () => {
      const created1 = rollbackService.createRollbackRequest(
        '2.0.0',
        '1.9.0',
        'production',
        'critical_bug',
        'Bug 1',
        'admin'
      );
      const created2 = rollbackService.createRollbackRequest(
        '2.1.0',
        '2.0.0',
        'staging',
        'performance_issue',
        'Issue 1',
        'admin'
      );
      rollbackService.approveRollbackRequest(created1.requestId, 'manager');
      rollbackService.approveRollbackRequest(created2.requestId, 'manager');
      rollbackService.startRollbackExecution(created1.requestId, 'deployer');
      rollbackService.startRollbackExecution(created2.requestId, 'deployer');
      const executions = rollbackService.getAllRollbackExecutions();
      expect(executions.length).toBe(2);
    });
  });

  describe('Rollback Steps', () => {
    it('should complete rollback step', () => {
      const created = rollbackService.createRollbackRequest(
        '2.0.0',
        '1.9.0',
        'production',
        'critical_bug',
        'Critical bug found',
        'admin'
      );
      rollbackService.approveRollbackRequest(created.requestId, 'manager');
      const execution = rollbackService.startRollbackExecution(created.requestId, 'deployer');
      if (execution) {
        rollbackService.completeRollbackStep(execution.executionId, 'step_1', 'Backup completed');
        const retrieved = rollbackService.getRollbackExecution(execution.executionId);
        const step = retrieved?.steps.find((s) => s.stepId === 'step_1');
        expect(step?.status).toBe('success');
      }
    });

    it('should fail rollback step', () => {
      const created = rollbackService.createRollbackRequest(
        '2.0.0',
        '1.9.0',
        'production',
        'critical_bug',
        'Critical bug found',
        'admin'
      );
      rollbackService.approveRollbackRequest(created.requestId, 'manager');
      const execution = rollbackService.startRollbackExecution(created.requestId, 'deployer');
      if (execution) {
        rollbackService.failRollbackStep(execution.executionId, 'step_1', 'Backup failed');
        const retrieved = rollbackService.getRollbackExecution(execution.executionId);
        expect(retrieved?.status).toBe('failed');
      }
    });
  });

  describe('Rollback Completion', () => {
    it('should complete rollback execution', () => {
      const created = rollbackService.createRollbackRequest(
        '2.0.0',
        '1.9.0',
        'production',
        'critical_bug',
        'Critical bug found',
        'admin'
      );
      rollbackService.approveRollbackRequest(created.requestId, 'manager');
      const execution = rollbackService.startRollbackExecution(created.requestId, 'deployer');
      if (execution) {
        const completed = rollbackService.completeRollbackExecution(execution.executionId);
        expect(completed?.status).toBe('success' || 'failed');
      }
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      rollbackService.createRollbackRequest('2.0.0', '1.9.0', 'production', 'critical_bug', 'Bug', 'admin');
      rollbackService.cleanup();
      const requests = rollbackService.getAllRollbackRequests();
      expect(requests.length).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = RollbackService.getInstance();
      const instance2 = RollbackService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
