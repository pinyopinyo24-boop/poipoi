import { describe, it, expect, beforeEach } from 'vitest';
import { ProductionRepository } from './ProductionRepository';

describe('ProductionRepository', () => {
  let repository: ProductionRepository;

  beforeEach(() => {
    repository = new ProductionRepository();
  });

  describe('recordDeployment', () => {
    it('should record a deployment', () => {
      const deployment = repository.recordDeployment(
        '1.0.0',
        'admin',
        ['Feature 1', 'Feature 2'],
        {
          deploymentTime: 300,
          errorRate: 0.1,
          responseTime: 100,
          uptime: 99.9,
        }
      );

      expect(deployment).toBeDefined();
      expect(deployment.version).toBe('1.0.0');
      expect(deployment.deploymentId).toMatch(/^DEP-/);
    });
  });

  describe('getDeployment', () => {
    it('should retrieve a deployment', () => {
      const created = repository.recordDeployment(
        '1.0.0',
        'admin',
        ['Feature 1'],
        {
          deploymentTime: 300,
          errorRate: 0.1,
          responseTime: 100,
          uptime: 99.9,
        }
      );

      const retrieved = repository.getDeployment(created.deploymentId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.version).toBe('1.0.0');
    });

    it('should return undefined for non-existent deployment', () => {
      expect(repository.getDeployment('non-existent')).toBeUndefined();
    });
  });

  describe('getDeploymentsByVersion', () => {
    it('should retrieve deployments by version', () => {
      repository.recordDeployment('1.0.0', 'admin', ['Feature 1'], {
        deploymentTime: 300,
        errorRate: 0.1,
        responseTime: 100,
        uptime: 99.9,
      });
      repository.recordDeployment('1.0.0', 'admin', ['Feature 2'], {
        deploymentTime: 300,
        errorRate: 0.1,
        responseTime: 100,
        uptime: 99.9,
      });

      const deployments = repository.getDeploymentsByVersion('1.0.0');
      expect(deployments.length).toBe(2);
    });
  });

  describe('approveDeployment', () => {
    it('should approve a deployment', () => {
      const deployment = repository.recordDeployment(
        '1.0.0',
        'admin',
        ['Feature 1'],
        {
          deploymentTime: 300,
          errorRate: 0.1,
          responseTime: 100,
          uptime: 99.9,
        }
      );

      const result = repository.approveDeployment(deployment.deploymentId);
      expect(result).toBe(true);

      const updated = repository.getDeployment(deployment.deploymentId);
      expect(updated?.status).toBe('deployed');
      expect(updated?.deployedAt).toBeDefined();
    });
  });

  describe('rollbackDeployment', () => {
    it('should rollback a deployment', () => {
      const deployment = repository.recordDeployment(
        '1.0.0',
        'admin',
        ['Feature 1'],
        {
          deploymentTime: 300,
          errorRate: 0.1,
          responseTime: 100,
          uptime: 99.9,
        }
      );

      const result = repository.rollbackDeployment(
        deployment.deploymentId,
        'Critical bug found'
      );
      expect(result).toBe(true);

      const updated = repository.getDeployment(deployment.deploymentId);
      expect(updated?.status).toBe('rolled_back');
      expect(updated?.rollbackReason).toBe('Critical bug found');
    });
  });

  describe('recordMetrics', () => {
    it('should record metrics', () => {
      const deployment = repository.recordDeployment(
        '1.0.0',
        'admin',
        ['Feature 1'],
        {
          deploymentTime: 300,
          errorRate: 0.1,
          responseTime: 100,
          uptime: 99.9,
        }
      );

      const metrics = repository.recordMetrics(
        deployment.deploymentId,
        1000,
        500,
        0.1,
        100,
        50,
        60,
        100,
        95
      );

      expect(metrics).toBeDefined();
      expect(metrics.activeUsers).toBe(1000);
      expect(metrics.metricsId).toMatch(/^MET-/);
    });
  });

  describe('getMetrics', () => {
    it('should retrieve metrics', () => {
      const deployment = repository.recordDeployment(
        '1.0.0',
        'admin',
        ['Feature 1'],
        {
          deploymentTime: 300,
          errorRate: 0.1,
          responseTime: 100,
          uptime: 99.9,
        }
      );

      const created = repository.recordMetrics(
        deployment.deploymentId,
        1000,
        500,
        0.1,
        100,
        50,
        60,
        100,
        95
      );

      const retrieved = repository.getMetrics(created.metricsId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.activeUsers).toBe(1000);
    });
  });

  describe('recordVersionHistory', () => {
    it('should record version history', () => {
      const history = repository.recordVersionHistory(
        '1.0.0',
        ['Feature 1', 'Feature 2'],
        ['Bug fix 1'],
        ['Performance improvement'],
        ['Known issue 1'],
        ['Old API']
      );

      expect(history).toBeDefined();
      expect(history.version).toBe('1.0.0');
      expect(history.features.length).toBe(2);
      expect(history.historyId).toMatch(/^VER-/);
    });
  });

  describe('getVersionHistory', () => {
    it('should retrieve version history', () => {
      const created = repository.recordVersionHistory(
        '1.0.0',
        ['Feature 1'],
        ['Bug fix 1'],
        ['Improvement'],
        [],
        []
      );

      const retrieved = repository.getVersionHistory(created.historyId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.version).toBe('1.0.0');
    });
  });

  describe('getHistoryByVersion', () => {
    it('should retrieve history by version', () => {
      repository.recordVersionHistory(
        '1.0.0',
        ['Feature 1'],
        ['Bug fix 1'],
        ['Improvement'],
        [],
        []
      );

      const history = repository.getHistoryByVersion('1.0.0');
      expect(history).toBeDefined();
      expect(history?.version).toBe('1.0.0');
    });
  });

  describe('getAllDeployments', () => {
    it('should retrieve all deployments', () => {
      repository.recordDeployment('1.0.0', 'admin', ['Feature 1'], {
        deploymentTime: 300,
        errorRate: 0.1,
        responseTime: 100,
        uptime: 99.9,
      });
      repository.recordDeployment('1.0.1', 'admin', ['Feature 2'], {
        deploymentTime: 300,
        errorRate: 0.1,
        responseTime: 100,
        uptime: 99.9,
      });

      const all = repository.getAllDeployments();
      expect(all.length).toBe(2);
    });
  });

  describe('getLatestDeployment', () => {
    it('should retrieve latest deployment', () => {
      repository.recordDeployment('1.0.0', 'admin', ['Feature 1'], {
        deploymentTime: 300,
        errorRate: 0.1,
        responseTime: 100,
        uptime: 99.9,
      });
      const latest = repository.recordDeployment('1.0.1', 'admin', ['Feature 2'], {
        deploymentTime: 300,
        errorRate: 0.1,
        responseTime: 100,
        uptime: 99.9,
      });

      const retrieved = repository.getLatestDeployment();
      expect(retrieved?.timestamp).toBeGreaterThanOrEqual(latest.timestamp);
    });
  });

  describe('getLatestMetrics', () => {
    it('should retrieve latest metrics', () => {
      const deployment = repository.recordDeployment(
        '1.0.0',
        'admin',
        ['Feature 1'],
        {
          deploymentTime: 300,
          errorRate: 0.1,
          responseTime: 100,
          uptime: 99.9,
        }
      );

      repository.recordMetrics(
        deployment.deploymentId,
        1000,
        500,
        0.1,
        100,
        50,
        60,
        100,
        95
      );
      const latest = repository.recordMetrics(
        deployment.deploymentId,
        1100,
        510,
        0.15,
        110,
        55,
        65,
        105,
        94
      );

      const retrieved = repository.getLatestMetrics();
      expect(retrieved?.timestamp).toBeGreaterThanOrEqual(latest.timestamp);
    });
  });

  describe('getDeploymentStats', () => {
    it('should calculate deployment statistics', () => {
      const deployment = repository.recordDeployment(
        '1.0.0',
        'admin',
        ['Feature 1'],
        {
          deploymentTime: 300,
          errorRate: 0.1,
          responseTime: 100,
          uptime: 99.9,
        }
      );

      repository.approveDeployment(deployment.deploymentId);

      const stats = repository.getDeploymentStats();
      expect(stats.totalDeployments).toBe(1);
      expect(stats.successfulDeployments).toBe(1);
    });
  });

  describe('getPerformanceStats', () => {
    it('should calculate performance statistics', () => {
      const deployment = repository.recordDeployment(
        '1.0.0',
        'admin',
        ['Feature 1'],
        {
          deploymentTime: 300,
          errorRate: 0.1,
          responseTime: 100,
          uptime: 99.9,
        }
      );

      repository.recordMetrics(
        deployment.deploymentId,
        1000,
        500,
        0.1,
        100,
        50,
        60,
        100,
        95
      );

      const stats = repository.getPerformanceStats();
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('deleteDeployment', () => {
    it('should delete a deployment', () => {
      const deployment = repository.recordDeployment(
        '1.0.0',
        'admin',
        ['Feature 1'],
        {
          deploymentTime: 300,
          errorRate: 0.1,
          responseTime: 100,
          uptime: 99.9,
        }
      );

      const result = repository.deleteDeployment(deployment.deploymentId);
      expect(result).toBe(true);
      expect(repository.getDeployment(deployment.deploymentId)).toBeUndefined();
    });
  });

  describe('deleteMetrics', () => {
    it('should delete metrics', () => {
      const deployment = repository.recordDeployment(
        '1.0.0',
        'admin',
        ['Feature 1'],
        {
          deploymentTime: 300,
          errorRate: 0.1,
          responseTime: 100,
          uptime: 99.9,
        }
      );

      const metrics = repository.recordMetrics(
        deployment.deploymentId,
        1000,
        500,
        0.1,
        100,
        50,
        60,
        100,
        95
      );

      const result = repository.deleteMetrics(metrics.metricsId);
      expect(result).toBe(true);
      expect(repository.getMetrics(metrics.metricsId)).toBeUndefined();
    });
  });
});
