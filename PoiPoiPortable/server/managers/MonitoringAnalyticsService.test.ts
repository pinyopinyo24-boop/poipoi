import { describe, it, expect, beforeEach } from 'vitest';
import { MonitoringAnalyticsService } from './MonitoringAnalyticsService';

describe('MonitoringAnalyticsService', () => {
  let service: MonitoringAnalyticsService;

  beforeEach(() => {
    service = new MonitoringAnalyticsService();
  });

  describe('analyzeTrend', () => {
    it('should analyze increasing trend', () => {
      const trend = service.analyzeTrend('cpu_usage', 1000, 2000, [10, 15, 20, 25, 30]);

      expect(trend).toBeDefined();
      expect(trend.trend).toBe('increasing');
      expect(trend.changePercentage).toBeGreaterThan(0);
    });

    it('should analyze decreasing trend', () => {
      const trend = service.analyzeTrend('memory_usage', 1000, 2000, [100, 80, 60, 40, 20]);

      expect(trend.trend).toBe('decreasing');
      expect(trend.changePercentage).toBeLessThan(0);
    });

    it('should analyze stable trend', () => {
      const trend = service.analyzeTrend('response_time', 1000, 2000, [100, 101, 100, 99, 100]);

      expect(trend.trend).toBe('stable');
    });
  });

  describe('getTrend', () => {
    it('should retrieve a trend', () => {
      const created = service.analyzeTrend('metric', 1000, 2000, [10, 20, 30]);
      const retrieved = service.getTrend(created.trendId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.metricName).toBe('metric');
    });
  });

  describe('getTrendsByMetric', () => {
    it('should retrieve trends by metric', () => {
      service.analyzeTrend('cpu', 1000, 2000, [10, 20, 30]);
      service.analyzeTrend('cpu', 2000, 3000, [20, 30, 40]);

      const trends = service.getTrendsByMetric('cpu');
      expect(trends.length).toBe(2);
    });
  });

  describe('detectAnomaly', () => {
    it('should detect anomaly when value is out of range', () => {
      const anomaly = service.detectAnomaly('cpu_usage', 200, 0, 80, 'server1');

      expect(anomaly).toBeDefined();
      expect(anomaly?.severity).toBe('high');
    });

    it('should return undefined when value is in range', () => {
      const anomaly = service.detectAnomaly('cpu_usage', 50, 0, 100, 'server1');

      expect(anomaly).toBeUndefined();
    });

    it('should detect medium severity anomaly', () => {
      const anomaly = service.detectAnomaly('cpu_usage', 130, 0, 100, 'server1');

      expect(anomaly).toBeDefined();
      expect(anomaly?.severity).toBe('medium');
    });
  });

  describe('getAnomaly', () => {
    it('should retrieve an anomaly', () => {
      const created = service.detectAnomaly('metric', 100, 0, 50, 'component');
      const retrieved = service.getAnomaly(created!.anomalyId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.metricName).toBe('metric');
    });
  });

  describe('getAnomaliesByComponent', () => {
    it('should retrieve anomalies by component', () => {
      service.detectAnomaly('metric1', 100, 0, 50, 'comp1');
      service.detectAnomaly('metric2', 100, 0, 50, 'comp1');

      const anomalies = service.getAnomaliesByComponent('comp1');
      expect(anomalies.length).toBe(2);
    });
  });

  describe('performHealthCheck', () => {
    it('should perform health check', () => {
      const check = service.performHealthCheck('database', 100, 0);

      expect(check).toBeDefined();
      expect(check.status).toBe('healthy');
      expect(check.checkId).toMatch(/^HLT-/);
    });

    it('should mark as degraded when response time is high', () => {
      const check = service.performHealthCheck('api', 3000, 3);

      expect(check.status).toBe('degraded');
    });

    it('should mark as unhealthy when error count is high', () => {
      const check = service.performHealthCheck('service', 1000, 15);

      expect(check.status).toBe('unhealthy');
    });
  });

  describe('getHealthCheck', () => {
    it('should retrieve a health check', () => {
      const created = service.performHealthCheck('component', 100, 0);
      const retrieved = service.getHealthCheck(created.checkId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.component).toBe('component');
    });
  });

  describe('getHealthChecksByComponent', () => {
    it('should retrieve health checks by component', () => {
      service.performHealthCheck('comp1', 100, 0);
      service.performHealthCheck('comp1', 150, 1);

      const checks = service.getHealthChecksByComponent('comp1');
      expect(checks.length).toBe(2);
    });
  });

  describe('getAllTrends', () => {
    it('should retrieve all trends', () => {
      service.analyzeTrend('metric1', 1000, 2000, [10, 20]);
      service.analyzeTrend('metric2', 1000, 2000, [30, 40]);

      const all = service.getAllTrends();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllAnomalies', () => {
    it('should retrieve all anomalies', () => {
      service.detectAnomaly('metric1', 100, 0, 50, 'comp1');
      service.detectAnomaly('metric2', 100, 0, 50, 'comp2');

      const all = service.getAllAnomalies();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllHealthChecks', () => {
    it('should retrieve all health checks', () => {
      service.performHealthCheck('comp1', 100, 0);
      service.performHealthCheck('comp2', 100, 0);

      const all = service.getAllHealthChecks();
      expect(all.length).toBe(2);
    });
  });

  describe('getMonitoringStats', () => {
    it('should calculate monitoring statistics', () => {
      service.analyzeTrend('metric1', 1000, 2000, [10, 20, 30]);
      service.detectAnomaly('metric2', 100, 0, 50, 'comp1');
      service.performHealthCheck('comp1', 100, 0);

      const stats = service.getMonitoringStats();

      expect(stats.totalTrends).toBe(1);
      expect(stats.totalAnomalies).toBe(1);
    });
  });

  describe('deleteTrend', () => {
    it('should delete a trend', () => {
      const trend = service.analyzeTrend('metric', 1000, 2000, [10, 20]);
      const result = service.deleteTrend(trend.trendId);

      expect(result).toBe(true);
      expect(service.getTrend(trend.trendId)).toBeUndefined();
    });
  });

  describe('deleteAnomaly', () => {
    it('should delete an anomaly', () => {
      const anomaly = service.detectAnomaly('metric', 100, 0, 50, 'comp');
      const result = service.deleteAnomaly(anomaly!.anomalyId);

      expect(result).toBe(true);
      expect(service.getAnomaly(anomaly!.anomalyId)).toBeUndefined();
    });
  });

  describe('deleteHealthCheck', () => {
    it('should delete a health check', () => {
      const check = service.performHealthCheck('comp', 100, 0);
      const result = service.deleteHealthCheck(check.checkId);

      expect(result).toBe(true);
      expect(service.getHealthCheck(check.checkId)).toBeUndefined();
    });
  });
});
