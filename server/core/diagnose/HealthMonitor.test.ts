import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HealthMonitor } from './HealthMonitor';
import { SecurityEngine } from '../security/SecurityEngine';

describe('HealthMonitor', () => {
  let healthMonitor: HealthMonitor;
  let securityEngine: SecurityEngine;
  let userId: string;

  beforeEach(async () => {
    healthMonitor = HealthMonitor.getInstance();
    healthMonitor.clearAllData();
    securityEngine = (healthMonitor as any).securityEngine;
    if (!securityEngine.isReady()) {
      await securityEngine.initialize();
    }
    userId = 'test-user-' + Date.now();
    await securityEngine.createContext(userId, 'user');
    await securityEngine.grantPermission(userId, 'health:read');
  });

  afterEach(async () => {
    healthMonitor.clearAllData();
    if (securityEngine.isReady()) {
      await securityEngine.shutdown();
    }
  });

  describe('CPU Monitoring', () => {
    it('should get CPU usage', async () => {
      const metric = await healthMonitor.getCPUUsage(userId);

      expect(metric.name).toBe('CPU Usage');
      expect(metric.value).toBeGreaterThanOrEqual(0);
      expect(metric.value).toBeLessThanOrEqual(100);
      expect(metric.unit).toBe('%');
      expect(metric.threshold).toBe(80);
      expect(['ok', 'warning', 'critical']).toContain(metric.status);
    });

    it('should store CPU metrics', async () => {
      await healthMonitor.getCPUUsage(userId);
      await healthMonitor.getCPUUsage(userId);

      const history = await healthMonitor.getMetricHistory(userId, 'cpu_usage');

      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Memory Monitoring', () => {
    it('should get memory usage', async () => {
      const metric = await healthMonitor.getMemoryUsage(userId);

      expect(metric.name).toBe('Memory Usage');
      expect(metric.value).toBeGreaterThanOrEqual(0);
      expect(metric.value).toBeLessThanOrEqual(100);
      expect(metric.unit).toBe('%');
      expect(metric.threshold).toBe(85);
    });
  });

  describe('Service Status', () => {
    it('should get API status', async () => {
      const status = await healthMonitor.getAPIStatus(userId);

      expect(status.name).toBe('API Server');
      expect(['running', 'stopped', 'error']).toContain(status.status);
      expect(status.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should get database status', async () => {
      const status = await healthMonitor.getDatabaseStatus(userId);

      expect(status.name).toBe('Database');
      expect(['running', 'stopped', 'error']).toContain(status.status);
    });

    it('should get all service statuses', async () => {
      const statuses = await healthMonitor.getAllServiceStatuses(userId);

      expect(statuses.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Metrics Collection', () => {
    it('should get all metrics', async () => {
      const metrics = await healthMonitor.getAllMetrics(userId);

      expect(metrics.length).toBeGreaterThanOrEqual(2);
    });

    it('should get metric history', async () => {
      for (let i = 0; i < 5; i++) {
        await healthMonitor.getCPUUsage(userId);
      }

      const history = await healthMonitor.getMetricHistory(userId, 'cpu_usage', 3);

      expect(history.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Permission Checks', () => {
    it('should throw error if user lacks permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(healthMonitor.getCPUUsage(unauthorizedUser)).rejects.toThrow(
        'User does not have permission to read health metrics'
      );
    });
  });

  describe('Data Clearing', () => {
    it('should clear all data', async () => {
      await healthMonitor.getCPUUsage(userId);
      await healthMonitor.getAPIStatus(userId);

      healthMonitor.clearAllData();

      const history = await healthMonitor.getMetricHistory(userId, 'cpu_usage');
      expect(history.length).toBe(0);
    });
  });
});
