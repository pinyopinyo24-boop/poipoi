/**
 * DeviceValidationRepository Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { deviceValidationRepository, DeviceValidationRepository } from './DeviceValidationRepository';

describe('DeviceValidationRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deviceValidationRepository.cleanup();
  });

  afterEach(() => {
    deviceValidationRepository.cleanup();
  });

  describe('Record Management', () => {
    it('should save record', () => {
      const record = deviceValidationRepository.saveRecord(
        'device123',
        'startup',
        'passed',
        { appStarted: true }
      );
      expect(record.recordId).toBeDefined();
      expect(record.status).toBe('passed');
    });

    it('should get record', () => {
      const saved = deviceValidationRepository.saveRecord(
        'device123',
        'startup',
        'passed',
        { appStarted: true }
      );
      const record = deviceValidationRepository.getRecord(saved.recordId);
      expect(record).not.toBeNull();
      expect(record?.deviceId).toBe('device123');
    });

    it('should delete record', () => {
      const saved = deviceValidationRepository.saveRecord(
        'device123',
        'startup',
        'passed',
        { appStarted: true }
      );
      const deleted = deviceValidationRepository.deleteRecord(saved.recordId);
      expect(deleted).toBe(true);
      expect(deviceValidationRepository.getRecord(saved.recordId)).toBeNull();
    });
  });

  describe('Record Queries', () => {
    it('should get records by device', () => {
      deviceValidationRepository.saveRecord('device123', 'startup', 'passed', {});
      deviceValidationRepository.saveRecord('device123', 'chat', 'passed', {});
      deviceValidationRepository.saveRecord('device456', 'startup', 'passed', {});

      const device123Records = deviceValidationRepository.getRecordsByDevice('device123');
      expect(device123Records.length).toBe(2);
    });

    it('should get records by type', () => {
      deviceValidationRepository.saveRecord('device123', 'startup', 'passed', {});
      deviceValidationRepository.saveRecord('device456', 'startup', 'passed', {});
      deviceValidationRepository.saveRecord('device123', 'chat', 'passed', {});

      const startupRecords = deviceValidationRepository.getRecordsByType('startup');
      expect(startupRecords.length).toBe(2);
    });

    it('should get passed records', () => {
      deviceValidationRepository.saveRecord('device123', 'startup', 'passed', {});
      deviceValidationRepository.saveRecord('device123', 'chat', 'failed', {});

      const passed = deviceValidationRepository.getPassedRecords();
      expect(passed.length).toBe(1);
    });

    it('should get failed records', () => {
      deviceValidationRepository.saveRecord('device123', 'startup', 'passed', {});
      deviceValidationRepository.saveRecord('device123', 'chat', 'failed', {});

      const failed = deviceValidationRepository.getFailedRecords();
      expect(failed.length).toBe(1);
    });
  });

  describe('Pagination', () => {
    it('should get records paginated', () => {
      for (let i = 0; i < 25; i++) {
        deviceValidationRepository.saveRecord('device123', 'test', 'passed', {});
      }

      const page1 = deviceValidationRepository.getRecordsPaginated(1, 10);
      expect(page1.records.length).toBe(10);
      expect(page1.totalRecords).toBe(25);
      expect(page1.totalPages).toBe(3);
      expect(page1.currentPage).toBe(1);
    });

    it('should get second page', () => {
      for (let i = 0; i < 25; i++) {
        deviceValidationRepository.saveRecord('device123', 'test', 'passed', {});
      }

      const page2 = deviceValidationRepository.getRecordsPaginated(2, 10);
      expect(page2.records.length).toBe(10);
      expect(page2.currentPage).toBe(2);
    });

    it('should get last page with remaining records', () => {
      for (let i = 0; i < 25; i++) {
        deviceValidationRepository.saveRecord('device123', 'test', 'passed', {});
      }

      const page3 = deviceValidationRepository.getRecordsPaginated(3, 10);
      expect(page3.records.length).toBe(5);
      expect(page3.currentPage).toBe(3);
    });
  });

  describe('Record Statistics', () => {
    it('should get record statistics', () => {
      deviceValidationRepository.saveRecord('device123', 'startup', 'passed', {});
      deviceValidationRepository.saveRecord('device123', 'chat', 'passed', {});

      const stats = deviceValidationRepository.getRecordStatistics();
      expect(stats.totalRecords).toBe(2);
      expect(stats.passedRecords).toBe(2);
      expect(stats.successRate).toBe(100);
    });

    it('should calculate success rate with failures', () => {
      deviceValidationRepository.saveRecord('device123', 'startup', 'passed', {});
      deviceValidationRepository.saveRecord('device123', 'chat', 'failed', {});

      const stats = deviceValidationRepository.getRecordStatistics();
      expect(stats.successRate).toBe(50);
    });

    it('should count records by type', () => {
      deviceValidationRepository.saveRecord('device123', 'startup', 'passed', {});
      deviceValidationRepository.saveRecord('device123', 'startup', 'passed', {});
      deviceValidationRepository.saveRecord('device123', 'chat', 'passed', {});

      const stats = deviceValidationRepository.getRecordStatistics();
      expect(stats.recordsByType['startup']).toBe(2);
      expect(stats.recordsByType['chat']).toBe(1);
    });

    it('should count records by device', () => {
      deviceValidationRepository.saveRecord('device123', 'startup', 'passed', {});
      deviceValidationRepository.saveRecord('device123', 'chat', 'passed', {});
      deviceValidationRepository.saveRecord('device456', 'startup', 'passed', {});

      const stats = deviceValidationRepository.getRecordStatistics();
      expect(stats.recordsByDevice['device123']).toBe(2);
      expect(stats.recordsByDevice['device456']).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      deviceValidationRepository.saveRecord('device123', 'startup', 'passed', {});
      deviceValidationRepository.cleanup();
      const stats = deviceValidationRepository.getRecordStatistics();
      expect(stats.totalRecords).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = DeviceValidationRepository.getInstance();
      const instance2 = DeviceValidationRepository.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
