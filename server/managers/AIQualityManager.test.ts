import { describe, it, expect, beforeEach } from 'vitest';
import { AIQualityManager } from './AIQualityManager';

describe('AIQualityManager', () => {
  let manager: AIQualityManager;

  beforeEach(() => {
    manager = new AIQualityManager();
  });

  describe('recordQualityMetric', () => {
    it('should record a quality metric', () => {
      const metric = manager.recordQualityMetric('resp-1', 85, 90, 88, 92);

      expect(metric).toBeDefined();
      expect(metric.metricId).toMatch(/^QM-/);
      expect(metric.overallScore).toBeCloseTo(88.75, 1);
    });
  });

  describe('getQualityMetric', () => {
    it('should retrieve a quality metric', () => {
      const created = manager.recordQualityMetric('resp-1', 85, 90, 88, 92);
      const retrieved = manager.getQualityMetric(created.metricId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.accuracy).toBe(85);
    });
  });

  describe('getMetricsByResponse', () => {
    it('should retrieve metrics by response', () => {
      manager.recordQualityMetric('resp-1', 85, 90, 88, 92);
      manager.recordQualityMetric('resp-1', 87, 92, 90, 94);

      const metrics = manager.getMetricsByResponse('resp-1');
      expect(metrics.length).toBe(2);
    });
  });

  describe('createQualityAlert', () => {
    it('should create a quality alert', () => {
      const alert = manager.createQualityAlert('high', 'accuracy', 'Low accuracy detected', 5);

      expect(alert).toBeDefined();
      expect(alert.alertId).toMatch(/^QA-/);
      expect(alert.status).toBe('open');
    });
  });

  describe('getQualityAlert', () => {
    it('should retrieve a quality alert', () => {
      const created = manager.createQualityAlert('high', 'accuracy', 'Low accuracy', 5);
      const retrieved = manager.getQualityAlert(created.alertId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('accuracy');
    });
  });

  describe('getAlertsByStatus', () => {
    it('should retrieve alerts by status', () => {
      manager.createQualityAlert('high', 'accuracy', 'Alert 1', 5);
      manager.createQualityAlert('medium', 'naturalness', 'Alert 2', 3);

      const open = manager.getAlertsByStatus('open');
      expect(open.length).toBe(2);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert', () => {
      const alert = manager.createQualityAlert('high', 'accuracy', 'Alert', 5);
      const result = manager.acknowledgeAlert(alert.alertId);

      expect(result).toBe(true);

      const updated = manager.getQualityAlert(alert.alertId);
      expect(updated?.status).toBe('acknowledged');
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert', () => {
      const alert = manager.createQualityAlert('high', 'accuracy', 'Alert', 5);
      manager.acknowledgeAlert(alert.alertId);

      const result = manager.resolveAlert(alert.alertId);

      expect(result).toBe(true);

      const resolved = manager.getQualityAlert(alert.alertId);
      expect(resolved?.status).toBe('resolved');
    });
  });

  describe('recordQualityTrend', () => {
    it('should record a quality trend', () => {
      const trend = manager.recordQualityTrend('daily', 85, 90, 88, 92);

      expect(trend).toBeDefined();
      expect(trend.trendId).toMatch(/^QT-/);
      expect(trend.period).toBe('daily');
    });
  });

  describe('getQualityTrend', () => {
    it('should retrieve a quality trend', () => {
      const created = manager.recordQualityTrend('daily', 85, 90, 88, 92);
      const retrieved = manager.getQualityTrend(created.trendId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.averageAccuracy).toBe(85);
    });
  });

  describe('getTrendsByPeriod', () => {
    it('should retrieve trends by period', () => {
      manager.recordQualityTrend('daily', 85, 90, 88, 92);
      manager.recordQualityTrend('daily', 86, 91, 89, 93);

      const daily = manager.getTrendsByPeriod('daily');
      expect(daily.length).toBe(2);
    });
  });

  describe('getAllMetrics', () => {
    it('should retrieve all metrics', () => {
      manager.recordQualityMetric('resp-1', 85, 90, 88, 92);
      manager.recordQualityMetric('resp-2', 87, 92, 90, 94);

      const all = manager.getAllMetrics();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllAlerts', () => {
    it('should retrieve all alerts', () => {
      manager.createQualityAlert('high', 'accuracy', 'Alert 1', 5);
      manager.createQualityAlert('medium', 'naturalness', 'Alert 2', 3);

      const all = manager.getAllAlerts();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllTrends', () => {
    it('should retrieve all trends', () => {
      manager.recordQualityTrend('daily', 85, 90, 88, 92);
      manager.recordQualityTrend('weekly', 86, 91, 89, 93);

      const all = manager.getAllTrends();
      expect(all.length).toBe(2);
    });
  });

  describe('getQualityStats', () => {
    it('should calculate quality statistics', () => {
      manager.recordQualityMetric('resp-1', 85, 90, 88, 92);
      manager.createQualityAlert('high', 'accuracy', 'Alert', 5);

      const stats = manager.getQualityStats();

      expect(stats.totalMetrics).toBe(1);
      expect(stats.averageAccuracy).toBe(85);
      expect(stats.totalAlerts).toBe(1);
    });
  });

  describe('deleteMetric', () => {
    it('should delete a metric', () => {
      const metric = manager.recordQualityMetric('resp-1', 85, 90, 88, 92);
      const result = manager.deleteMetric(metric.metricId);

      expect(result).toBe(true);
      expect(manager.getQualityMetric(metric.metricId)).toBeUndefined();
    });
  });

  describe('deleteAlert', () => {
    it('should delete an alert', () => {
      const alert = manager.createQualityAlert('high', 'accuracy', 'Alert', 5);
      const result = manager.deleteAlert(alert.alertId);

      expect(result).toBe(true);
      expect(manager.getQualityAlert(alert.alertId)).toBeUndefined();
    });
  });

  describe('deleteTrend', () => {
    it('should delete a trend', () => {
      const trend = manager.recordQualityTrend('daily', 85, 90, 88, 92);
      const result = manager.deleteTrend(trend.trendId);

      expect(result).toBe(true);
      expect(manager.getQualityTrend(trend.trendId)).toBeUndefined();
    });
  });
});
