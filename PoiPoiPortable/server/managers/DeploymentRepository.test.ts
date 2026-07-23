/**
 * DeploymentRepository Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { deploymentRepository, DeploymentRepository } from './DeploymentRepository';

describe('DeploymentRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deploymentRepository.cleanup();
  });

  afterEach(() => {
    deploymentRepository.cleanup();
  });

  describe('Save and Retrieve', () => {
    it('should save deployment record', () => {
      const record = deploymentRepository.save({
        version: '1.0.0',
        environment: 'production',
        status: 'success',
        startTime: Date.now(),
        deployedBy: 'admin',
        notes: 'Production release',
        tags: ['release', 'production'],
      });
      expect(record.id).toBeDefined();
    });

    it('should find record by id', () => {
      const saved = deploymentRepository.save({
        version: '1.0.0',
        environment: 'production',
        status: 'success',
        startTime: Date.now(),
        deployedBy: 'admin',
        notes: 'Production release',
        tags: ['release', 'production'],
      });
      const found = deploymentRepository.findById(saved.id);
      expect(found).not.toBeNull();
    });

    it('should find all records', () => {
      deploymentRepository.save({
        version: '1.0.0',
        environment: 'production',
        status: 'success',
        startTime: Date.now(),
        deployedBy: 'admin',
        notes: 'Release 1',
        tags: [],
      });
      deploymentRepository.save({
        version: '1.1.0',
        environment: 'staging',
        status: 'success',
        startTime: Date.now(),
        deployedBy: 'admin',
        notes: 'Release 2',
        tags: [],
      });
      const records = deploymentRepository.findAll();
      expect(records.length).toBe(2);
    });
  });

  describe('Update', () => {
    it('should update record', () => {
      const saved = deploymentRepository.save({
        version: '1.0.0',
        environment: 'production',
        status: 'in_progress',
        startTime: Date.now(),
        deployedBy: 'admin',
        notes: 'Production release',
        tags: [],
      });
      const updated = deploymentRepository.update(saved.id, {
        status: 'success',
        endTime: Date.now(),
      });
      expect(updated?.status).toBe('success');
    });
  });

  describe('Query', () => {
    it('should query by version', () => {
      deploymentRepository.save({
        version: '1.0.0',
        environment: 'production',
        status: 'success',
        startTime: Date.now(),
        deployedBy: 'admin',
        notes: 'Release 1',
        tags: [],
      });
      deploymentRepository.save({
        version: '1.1.0',
        environment: 'staging',
        status: 'success',
        startTime: Date.now(),
        deployedBy: 'admin',
        notes: 'Release 2',
        tags: [],
      });
      const results = deploymentRepository.query({ version: '1.0.0' });
      expect(results.length).toBe(1);
    });

    it('should query by environment', () => {
      deploymentRepository.save({
        version: '1.0.0',
        environment: 'production',
        status: 'success',
        startTime: Date.now(),
        deployedBy: 'admin',
        notes: 'Release 1',
        tags: [],
      });
      deploymentRepository.save({
        version: '1.1.0',
        environment: 'staging',
        status: 'success',
        startTime: Date.now(),
        deployedBy: 'admin',
        notes: 'Release 2',
        tags: [],
      });
      const results = deploymentRepository.query({ environment: 'production' });
      expect(results.length).toBe(1);
    });

    it('should query by status', () => {
      deploymentRepository.save({
        version: '1.0.0',
        environment: 'production',
        status: 'success',
        startTime: Date.now(),
        deployedBy: 'admin',
        notes: 'Release 1',
        tags: [],
      });
      deploymentRepository.save({
        version: '1.1.0',
        environment: 'staging',
        status: 'failed',
        startTime: Date.now(),
        deployedBy: 'admin',
        notes: 'Release 2',
        tags: [],
      });
      const results = deploymentRepository.query({ status: 'success' });
      expect(results.length).toBe(1);
    });
  });

  describe('Index Queries', () => {
    it('should find by version', () => {
      deploymentRepository.save({
        version: '1.0.0',
        environment: 'production',
        status: 'success',
        startTime: Date.now(),
        deployedBy: 'admin',
        notes: 'Release',
        tags: [],
      });
      const records = deploymentRepository.findByVersion('1.0.0');
      expect(records.length).toBe(1);
    });

    it('should find by environment', () => {
      deploymentRepository.save({
        version: '1.0.0',
        environment: 'production',
        status: 'success',
        startTime: Date.now(),
        deployedBy: 'admin',
        notes: 'Release',
        tags: [],
      });
      const records = deploymentRepository.findByEnvironment('production');
      expect(records.length).toBe(1);
    });

    it('should find by deployed by', () => {
      deploymentRepository.save({
        version: '1.0.0',
        environment: 'production',
        status: 'success',
        startTime: Date.now(),
        deployedBy: 'admin',
        notes: 'Release',
        tags: [],
      });
      const records = deploymentRepository.findByDeployedBy('admin');
      expect(records.length).toBe(1);
    });
  });

  describe('Statistics', () => {
    it('should get statistics', () => {
      deploymentRepository.save({
        version: '1.0.0',
        environment: 'production',
        status: 'success',
        startTime: Date.now(),
        duration: 1000,
        deployedBy: 'admin',
        notes: 'Release',
        tags: [],
      });
      const stats = deploymentRepository.getStatistics();
      expect(stats.totalDeployments).toBe(1);
    });
  });

  describe('Delete', () => {
    it('should delete record', () => {
      const saved = deploymentRepository.save({
        version: '1.0.0',
        environment: 'production',
        status: 'success',
        startTime: Date.now(),
        deployedBy: 'admin',
        notes: 'Release',
        tags: [],
      });
      deploymentRepository.delete(saved.id);
      const found = deploymentRepository.findById(saved.id);
      expect(found).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      deploymentRepository.save({
        version: '1.0.0',
        environment: 'production',
        status: 'success',
        startTime: Date.now(),
        deployedBy: 'admin',
        notes: 'Release',
        tags: [],
      });
      deploymentRepository.cleanup();
      const records = deploymentRepository.findAll();
      expect(records.length).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = DeploymentRepository.getInstance();
      const instance2 = DeploymentRepository.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
