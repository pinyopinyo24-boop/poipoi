import { describe, it, expect, beforeEach } from 'vitest';
import { ProductionOperationsManager } from './ProductionOperationsManager';

describe('ProductionOperationsManager', () => {
  let manager: ProductionOperationsManager;

  beforeEach(() => {
    manager = new ProductionOperationsManager();
  });

  describe('recordMetric', () => {
    it('should record a metric', () => {
      const metric = manager.recordMetric(99.9, 150, 85, 0.5, 45, 60, 1000);

      expect(metric).toBeDefined();
      expect(metric.uptime).toBe(99.9);
      expect(metric.metricId).toMatch(/^MET-/);
    });
  });

  describe('getMetric', () => {
    it('should retrieve a metric', () => {
      const created = manager.recordMetric(99.9, 150, 85, 0.5, 45, 60, 1000);
      const retrieved = manager.getMetric(created.metricId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.uptime).toBe(99.9);
    });

    it('should return undefined for non-existent metric', () => {
      expect(manager.getMetric('non-existent')).toBeUndefined();
    });
  });

  describe('getLatestMetric', () => {
    it('should retrieve latest metric', () => {
      manager.recordMetric(99.0, 150, 85, 0.5, 45, 60, 1000);
      const latest = manager.recordMetric(99.9, 160, 86, 0.4, 46, 61, 1100);

      const retrieved = manager.getLatestMetric();
      expect(retrieved?.timestamp).toBeGreaterThanOrEqual(latest.timestamp);
    });
  });

  describe('createAlert', () => {
    it('should create an alert', () => {
      const alert = manager.createAlert('critical', 'high_error_rate', 'Error rate exceeded 5%');

      expect(alert).toBeDefined();
      expect(alert.severity).toBe('critical');
      expect(alert.alertId).toMatch(/^ALT-/);
    });
  });

  describe('getAlert', () => {
    it('should retrieve an alert', () => {
      const created = manager.createAlert('warning', 'slow_response', 'Response time > 2s');
      const retrieved = manager.getAlert(created.alertId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.severity).toBe('warning');
    });
  });

  describe('getAlertsByStatus', () => {
    it('should retrieve active alerts', () => {
      manager.createAlert('critical', 'type1', 'msg1');
      manager.createAlert('warning', 'type2', 'msg2');

      const active = manager.getAlertsByStatus('active');
      expect(active.length).toBe(2);
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert', () => {
      const alert = manager.createAlert('critical', 'type', 'message');
      const result = manager.resolveAlert(alert.alertId);

      expect(result).toBe(true);

      const resolved = manager.getAlert(alert.alertId);
      expect(resolved?.status).toBe('resolved');
      expect(resolved?.resolvedAt).toBeDefined();
    });
  });

  describe('createIncident', () => {
    it('should create an incident', () => {
      const incident = manager.createIncident('Database Down', 'DB connection lost', 'critical');

      expect(incident).toBeDefined();
      expect(incident.severity).toBe('critical');
      expect(incident.incidentId).toMatch(/^INC-/);
    });
  });

  describe('getIncident', () => {
    it('should retrieve an incident', () => {
      const created = manager.createIncident('API Error', 'API timeout', 'high');
      const retrieved = manager.getIncident(created.incidentId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('API Error');
    });
  });

  describe('getIncidentsByStatus', () => {
    it('should retrieve open incidents', () => {
      manager.createIncident('Incident 1', 'desc1', 'high');
      manager.createIncident('Incident 2', 'desc2', 'medium');

      const open = manager.getIncidentsByStatus('open');
      expect(open.length).toBe(2);
    });
  });

  describe('investigateIncident', () => {
    it('should change incident status to investigating', () => {
      const incident = manager.createIncident('Issue', 'description', 'high');
      const result = manager.investigateIncident(incident.incidentId);

      expect(result).toBe(true);

      const updated = manager.getIncident(incident.incidentId);
      expect(updated?.status).toBe('investigating');
    });
  });

  describe('resolveIncident', () => {
    it('should resolve an incident', () => {
      const incident = manager.createIncident('Issue', 'description', 'high');
      manager.investigateIncident(incident.incidentId);

      const result = manager.resolveIncident(
        incident.incidentId,
        'Root cause identified',
        'Applied fix'
      );

      expect(result).toBe(true);

      const resolved = manager.getIncident(incident.incidentId);
      expect(resolved?.status).toBe('resolved');
      expect(resolved?.rootCause).toBe('Root cause identified');
    });
  });

  describe('getOperationStats', () => {
    it('should calculate operation statistics', () => {
      manager.recordMetric(99.9, 150, 85, 0.5, 45, 60, 1000);
      manager.recordMetric(99.8, 160, 84, 0.6, 46, 61, 1100);

      const stats = manager.getOperationStats();

      expect(stats.totalMetrics).toBe(2);
      expect(stats.averageUptime).toBeGreaterThan(0);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('getAllMetrics', () => {
    it('should retrieve all metrics', () => {
      manager.recordMetric(99.9, 150, 85, 0.5, 45, 60, 1000);
      manager.recordMetric(99.8, 160, 84, 0.6, 46, 61, 1100);

      const all = manager.getAllMetrics();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllAlerts', () => {
    it('should retrieve all alerts', () => {
      manager.createAlert('critical', 'type1', 'msg1');
      manager.createAlert('warning', 'type2', 'msg2');

      const all = manager.getAllAlerts();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllIncidents', () => {
    it('should retrieve all incidents', () => {
      manager.createIncident('Inc1', 'desc1', 'high');
      manager.createIncident('Inc2', 'desc2', 'medium');

      const all = manager.getAllIncidents();
      expect(all.length).toBe(2);
    });
  });

  describe('deleteMetric', () => {
    it('should delete a metric', () => {
      const metric = manager.recordMetric(99.9, 150, 85, 0.5, 45, 60, 1000);
      const result = manager.deleteMetric(metric.metricId);

      expect(result).toBe(true);
      expect(manager.getMetric(metric.metricId)).toBeUndefined();
    });
  });

  describe('deleteAlert', () => {
    it('should delete an alert', () => {
      const alert = manager.createAlert('critical', 'type', 'message');
      const result = manager.deleteAlert(alert.alertId);

      expect(result).toBe(true);
      expect(manager.getAlert(alert.alertId)).toBeUndefined();
    });
  });

  describe('deleteIncident', () => {
    it('should delete an incident', () => {
      const incident = manager.createIncident('Issue', 'desc', 'high');
      const result = manager.deleteIncident(incident.incidentId);

      expect(result).toBe(true);
      expect(manager.getIncident(incident.incidentId)).toBeUndefined();
    });
  });
});
