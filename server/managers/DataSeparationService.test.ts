/**
 * DataSeparationService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dataSeparationService, DataSeparationService } from './DataSeparationService';

describe('DataSeparationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataSeparationService.cleanup();
  });

  afterEach(() => {
    dataSeparationService.cleanup();
  });

  describe('Environment Management', () => {
    it('should switch environment', () => {
      dataSeparationService.switchEnvironment('testing');
      expect(dataSeparationService.getCurrentEnvironment()).toBe('testing');
    });

    it('should get current environment', () => {
      const env = dataSeparationService.getCurrentEnvironment();
      expect(env).toBeDefined();
    });
  });

  describe('Data Context', () => {
    it('should begin data context', () => {
      const context = dataSeparationService.beginDataContext('user1', 'testing');
      expect(context).not.toBeNull();
      expect(context.isTestData).toBe(true);
    });

    it('should end data context', () => {
      dataSeparationService.beginDataContext('user1', 'testing');
      const context = dataSeparationService.endDataContext();
      expect(context).not.toBeNull();
    });

    it('should get current context', () => {
      dataSeparationService.beginDataContext('user1', 'testing');
      const context = dataSeparationService.getCurrentContext();
      expect(context).not.toBeNull();
    });
  });

  describe('Table Data Management', () => {
    it('should save table data', () => {
      const data = [{ id: 1, name: 'Test' }];
      dataSeparationService.saveTableData('users', data);
      const retrieved = dataSeparationService.getTableData('users');
      expect(retrieved.length).toBe(1);
    });

    it('should get table data', () => {
      const data = [{ id: 1, name: 'Test' }];
      dataSeparationService.saveTableData('users', data);
      const retrieved = dataSeparationService.getTableData('users');
      expect(retrieved[0].name).toBe('Test');
    });

    it('should delete table', () => {
      const data = [{ id: 1, name: 'Test' }];
      dataSeparationService.saveTableData('users', data);
      dataSeparationService.deleteTable('users');
      const retrieved = dataSeparationService.getTableData('users');
      expect(retrieved.length).toBe(0);
    });

    it('should get table data from specific environment', () => {
      dataSeparationService.switchEnvironment('production');
      dataSeparationService.saveTableData('users', [{ id: 1, name: 'Prod' }]);

      dataSeparationService.switchEnvironment('testing');
      dataSeparationService.saveTableData('users', [{ id: 2, name: 'Test' }]);

      const prodData = dataSeparationService.getTableData('users', 'production');
      expect(prodData[0].name).toBe('Prod');
    });
  });

  describe('Environment Data Management', () => {
    it('should clear environment data', () => {
      dataSeparationService.saveTableData('users', [{ id: 1 }]);
      dataSeparationService.saveTableData('posts', [{ id: 1 }]);
      dataSeparationService.clearEnvironmentData('production');
      const users = dataSeparationService.getTableData('users');
      expect(users.length).toBe(0);
    });
  });

  describe('Store Statistics', () => {
    it('should get store statistics', () => {
      dataSeparationService.saveTableData('users', [{ id: 1 }, { id: 2 }]);
      dataSeparationService.saveTableData('posts', [{ id: 1 }]);
      const stats = dataSeparationService.getStoreStatistics();
      expect(stats.tableCount).toBe(2);
      expect(stats.recordCount).toBe(3);
    });
  });

  describe('Test Data Marking', () => {
    it('should mark as test data', () => {
      const data = [{ id: '1', name: 'Test' }];
      dataSeparationService.saveTableData('users', data);
      dataSeparationService.markAsTestData('users', '1');
      const retrieved = dataSeparationService.getTableData('users');
      expect(retrieved[0]._isTestData).toBe(true);
    });

    it('should filter test data', () => {
      const data = [
        { id: '1', name: 'Test', _isTestData: true },
        { id: '2', name: 'Prod' },
      ];
      dataSeparationService.saveTableData('users', data);
      const filtered = dataSeparationService.filterTestData('users');
      expect(filtered.length).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      dataSeparationService.saveTableData('users', [{ id: 1 }]);
      dataSeparationService.cleanup();
      const data = dataSeparationService.getTableData('users');
      expect(data.length).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = DataSeparationService.getInstance();
      const instance2 = DataSeparationService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
