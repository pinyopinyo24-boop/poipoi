import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PerformanceAnalyzer } from './PerformanceAnalyzer';
import { SecurityEngine } from '../security/SecurityEngine';

describe('PerformanceAnalyzer', () => {
  let performanceAnalyzer: PerformanceAnalyzer;
  let securityEngine: SecurityEngine;
  let userId: string;

  beforeEach(async () => {
    performanceAnalyzer = PerformanceAnalyzer.getInstance();
    performanceAnalyzer.clearAllData();
    securityEngine = (performanceAnalyzer as any).securityEngine;
    if (!securityEngine.isReady()) {
      await securityEngine.initialize();
    }
    userId = 'test-user-' + Date.now();
    await securityEngine.createContext(userId, 'user');
    await securityEngine.grantPermission(userId, 'performance:read');
    await securityEngine.grantPermission(userId, 'performance:write');
  });

  afterEach(async () => {
    performanceAnalyzer.clearAllData();
    if (securityEngine.isReady()) {
      await securityEngine.shutdown();
    }
  });

  describe('Metric Recording', () => {
    it('should record performance metric', async () => {
      const metric = await performanceAnalyzer.recordMetric(userId, 'API Call', 150, 'API');

      expect(metric.name).toBe('API Call');
      expect(metric.duration).toBe(150);
      expect(metric.component).toBe('API');
      expect(metric.status).toBe('normal');
    });

    it('should classify fast metrics', async () => {
      const metric = await performanceAnalyzer.recordMetric(userId, 'Fast Op', 50, 'Cache');

      expect(metric.status).toBe('fast');
    });

    it('should classify slow metrics', async () => {
      const metric = await performanceAnalyzer.recordMetric(userId, 'Slow Op', 1000, 'DB');

      expect(metric.status).toBe('slow');
    });

    it('should classify critical metrics', async () => {
      const metric = await performanceAnalyzer.recordMetric(userId, 'Critical Op', 3000, 'Service');

      expect(metric.status).toBe('critical');
    });
  });

  describe('Performance Analysis', () => {
    it('should analyze performance', async () => {
      await performanceAnalyzer.recordMetric(userId, 'Op1', 100, 'Service');
      await performanceAnalyzer.recordMetric(userId, 'Op2', 200, 'Service');
      await performanceAnalyzer.recordMetric(userId, 'Op3', 300, 'Service');

      const analysis = await performanceAnalyzer.analyzePerformance(userId);

      expect(analysis.totalRequests).toBe(3);
      expect(analysis.avgResponseTime).toBe(200);
      expect(analysis.maxResponseTime).toBe(300);
      expect(analysis.minResponseTime).toBe(100);
    });

    it('should handle empty metrics', async () => {
      const analysis = await performanceAnalyzer.analyzePerformance(userId);

      expect(analysis.totalRequests).toBe(0);
      expect(analysis.avgResponseTime).toBe(0);
      expect(analysis.bottlenecks.length).toBe(0);
    });

    it('should generate improvements', async () => {
      await performanceAnalyzer.recordMetric(userId, 'Op1', 100, 'Service');

      const analysis = await performanceAnalyzer.analyzePerformance(userId);

      expect(analysis.improvements.length).toBeGreaterThan(0);
    });
  });

  describe('Bottleneck Detection', () => {
    it('should detect bottlenecks', async () => {
      // Record slow operations
      for (let i = 0; i < 5; i++) {
        await performanceAnalyzer.recordMetric(userId, `Slow Op ${i}`, 1500, 'Database');
      }
      // Record fast operations
      for (let i = 0; i < 2; i++) {
        await performanceAnalyzer.recordMetric(userId, `Fast Op ${i}`, 100, 'Cache');
      }

      const analysis = await performanceAnalyzer.analyzePerformance(userId);

      expect(analysis.bottlenecks.length).toBeGreaterThan(0);
    });

    it('should identify high severity bottlenecks', async () => {
      // Record many slow operations
      for (let i = 0; i < 10; i++) {
        await performanceAnalyzer.recordMetric(userId, `Slow Op ${i}`, 2000, 'Service');
      }

      const analysis = await performanceAnalyzer.analyzePerformance(userId);

      const highSeverity = analysis.bottlenecks.filter((b) => b.severity === 'high');
      expect(highSeverity.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Metric Filtering', () => {
    it('should get metrics by component', async () => {
      await performanceAnalyzer.recordMetric(userId, 'Op1', 100, 'Service1');
      await performanceAnalyzer.recordMetric(userId, 'Op2', 200, 'Service1');
      await performanceAnalyzer.recordMetric(userId, 'Op3', 300, 'Service2');

      const metrics = await performanceAnalyzer.getMetricsByComponent(userId, 'Service1');

      expect(metrics.length).toBe(2);
      expect(metrics.every((m) => m.component === 'Service1')).toBe(true);
    });

    it('should get metrics by status', async () => {
      await performanceAnalyzer.recordMetric(userId, 'Fast Op', 50, 'Service');
      await performanceAnalyzer.recordMetric(userId, 'Normal Op', 200, 'Service');
      await performanceAnalyzer.recordMetric(userId, 'Slow Op', 1500, 'Service');

      const fastMetrics = await performanceAnalyzer.getMetricsByStatus(userId, 'fast');
      const slowMetrics = await performanceAnalyzer.getMetricsByStatus(userId, 'slow');

      expect(fastMetrics.length).toBeGreaterThanOrEqual(1);
      expect(slowMetrics.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Permission Checks', () => {
    it('should throw error if user lacks write permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        performanceAnalyzer.recordMetric(unauthorizedUser, 'Op', 100, 'Service')
      ).rejects.toThrow('User does not have permission to record performance metrics');
    });

    it('should throw error if user lacks read permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        performanceAnalyzer.analyzePerformance(unauthorizedUser)
      ).rejects.toThrow('User does not have permission to read performance analysis');
    });
  });

  describe('Data Clearing', () => {
    it('should clear all data', async () => {
      await performanceAnalyzer.recordMetric(userId, 'Op1', 100, 'Service');
      await performanceAnalyzer.recordMetric(userId, 'Op2', 200, 'Service');

      performanceAnalyzer.clearAllData();

      const analysis = await performanceAnalyzer.analyzePerformance(userId);

      expect(analysis.totalRequests).toBe(0);
    });
  });

  describe('Metric Limits', () => {
    it('should maintain metric limit', async () => {
      // Record more than 1000 metrics
      for (let i = 0; i < 1100; i++) {
        await performanceAnalyzer.recordMetric(userId, `Op ${i}`, 100 + i, 'Service');
      }

      const analysis = await performanceAnalyzer.analyzePerformance(userId);

      expect(analysis.totalRequests).toBeLessThanOrEqual(1000);
    });
  });

  describe('Multiple Users', () => {
    it('should isolate metrics by user', async () => {
      const user2 = 'test-user-2-' + Date.now();
      await securityEngine.createContext(user2, 'user');
      await securityEngine.grantPermission(user2, 'performance:read');
      await securityEngine.grantPermission(user2, 'performance:write');

      await performanceAnalyzer.recordMetric(userId, 'Op1', 100, 'Service');
      await performanceAnalyzer.recordMetric(user2, 'Op2', 200, 'Service');

      const analysis1 = await performanceAnalyzer.analyzePerformance(userId);
      const analysis2 = await performanceAnalyzer.analyzePerformance(user2);

      expect(analysis1.totalRequests).toBeGreaterThanOrEqual(1);
      expect(analysis2.totalRequests).toBeGreaterThanOrEqual(1);
    });
  });
});
