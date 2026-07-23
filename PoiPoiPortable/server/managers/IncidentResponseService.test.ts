import { describe, it, expect, beforeEach } from 'vitest';
import { IncidentResponseService } from './IncidentResponseService';

describe('IncidentResponseService', () => {
  let service: IncidentResponseService;

  beforeEach(() => {
    service = new IncidentResponseService();
  });

  describe('createIncident', () => {
    it('should create an incident', () => {
      const incident = service.createIncident('Database Down', 'DB connection lost', 'critical');

      expect(incident).toBeDefined();
      expect(incident.status).toBe('open');
      expect(incident.incidentId).toMatch(/^INC-/);
    });
  });

  describe('getIncident', () => {
    it('should retrieve an incident', () => {
      const created = service.createIncident('Issue', 'Description', 'high');
      const retrieved = service.getIncident(created.incidentId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Issue');
    });
  });

  describe('getIncidentsByStatus', () => {
    it('should retrieve incidents by status', () => {
      service.createIncident('Inc1', 'Desc1', 'high');
      service.createIncident('Inc2', 'Desc2', 'medium');

      const open = service.getIncidentsByStatus('open');
      expect(open.length).toBe(2);
    });
  });

  describe('acknowledgeIncident', () => {
    it('should acknowledge an incident', () => {
      const incident = service.createIncident('Issue', 'Desc', 'high');
      const result = service.acknowledgeIncident(incident.incidentId, 'agent1');

      expect(result).toBe(true);

      const updated = service.getIncident(incident.incidentId);
      expect(updated?.status).toBe('acknowledged');
      expect(updated?.assignedTo).toBe('agent1');
    });
  });

  describe('startInvestigation', () => {
    it('should start investigation', () => {
      const incident = service.createIncident('Issue', 'Desc', 'high');
      service.acknowledgeIncident(incident.incidentId, 'agent1');

      const result = service.startInvestigation(incident.incidentId);

      expect(result).toBe(true);

      const updated = service.getIncident(incident.incidentId);
      expect(updated?.status).toBe('investigating');
    });
  });

  describe('escalateIncident', () => {
    it('should escalate an incident', () => {
      const incident = service.createIncident('Issue', 'Desc', 'high');

      service.escalateIncident(incident.incidentId);
      service.escalateIncident(incident.incidentId);

      const updated = service.getIncident(incident.incidentId);
      expect(updated?.escalationLevel).toBe(2);
    });
  });

  describe('resolveIncident', () => {
    it('should resolve an incident', () => {
      const incident = service.createIncident('Issue', 'Desc', 'high');
      service.acknowledgeIncident(incident.incidentId, 'agent1');
      service.startInvestigation(incident.incidentId);

      const result = service.resolveIncident(incident.incidentId, 'Fixed the issue');

      expect(result).toBe(true);

      const resolved = service.getIncident(incident.incidentId);
      expect(resolved?.status).toBe('resolved');
      expect(resolved?.resolution).toBe('Fixed the issue');
      expect(resolved?.resolvedAt).toBeDefined();
    });
  });

  describe('addIncidentUpdate', () => {
    it('should add an incident update', () => {
      const incident = service.createIncident('Issue', 'Desc', 'high');

      const update = service.addIncidentUpdate(incident.incidentId, 'agent1', 'Working on it');

      expect(update).toBeDefined();
      expect(update.author).toBe('agent1');
      expect(update.updateId).toMatch(/^UPD-/);
    });
  });

  describe('getIncidentUpdates', () => {
    it('should retrieve incident updates', () => {
      const incident = service.createIncident('Issue', 'Desc', 'high');

      service.addIncidentUpdate(incident.incidentId, 'agent1', 'Update 1');
      service.addIncidentUpdate(incident.incidentId, 'agent2', 'Update 2');

      const updates = service.getIncidentUpdates(incident.incidentId);
      expect(updates.length).toBe(2);
    });
  });

  describe('recordIncidentMetrics', () => {
    it('should record incident metrics', () => {
      const incident = service.createIncident('Issue', 'Desc', 'high');

      const metrics = service.recordIncidentMetrics(
        incident.incidentId,
        300000,
        600000,
        1000,
        85
      );

      expect(metrics).toBeDefined();
      expect(metrics.responseTime).toBe(300000);
      expect(metrics.metricsId).toMatch(/^MET-/);
    });
  });

  describe('getIncidentMetrics', () => {
    it('should retrieve incident metrics', () => {
      const incident = service.createIncident('Issue', 'Desc', 'high');

      service.recordIncidentMetrics(incident.incidentId, 300000, 600000, 1000, 85);
      service.recordIncidentMetrics(incident.incidentId, 250000, 550000, 900, 80);

      const metrics = service.getIncidentMetrics(incident.incidentId);
      expect(metrics.length).toBe(2);
    });
  });

  describe('getAllIncidents', () => {
    it('should retrieve all incidents', () => {
      service.createIncident('Inc1', 'Desc1', 'high');
      service.createIncident('Inc2', 'Desc2', 'medium');

      const all = service.getAllIncidents();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllUpdates', () => {
    it('should retrieve all updates', () => {
      const incident = service.createIncident('Issue', 'Desc', 'high');

      service.addIncidentUpdate(incident.incidentId, 'agent1', 'Update 1');
      service.addIncidentUpdate(incident.incidentId, 'agent2', 'Update 2');

      const all = service.getAllUpdates();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllMetrics', () => {
    it('should retrieve all metrics', () => {
      const incident1 = service.createIncident('Inc1', 'Desc1', 'high');
      const incident2 = service.createIncident('Inc2', 'Desc2', 'medium');

      service.recordIncidentMetrics(incident1.incidentId, 300000, 600000, 1000, 85);
      service.recordIncidentMetrics(incident2.incidentId, 250000, 550000, 900, 80);

      const all = service.getAllMetrics();
      expect(all.length).toBe(2);
    });
  });

  describe('getIncidentStats', () => {
    it('should calculate incident statistics', () => {
      const incident = service.createIncident('Issue', 'Desc', 'critical');

      service.recordIncidentMetrics(incident.incidentId, 300000, 600000, 1000, 85);

      const stats = service.getIncidentStats();

      expect(stats.totalIncidents).toBe(1);
      expect(stats.openIncidents).toBe(1);
      expect(stats.criticalIncidents).toBe(1);
      expect(stats.averageResponseTime).toBe(300000);
    });
  });

  describe('deleteIncident', () => {
    it('should delete an incident', () => {
      const incident = service.createIncident('Issue', 'Desc', 'high');
      const result = service.deleteIncident(incident.incidentId);

      expect(result).toBe(true);
      expect(service.getIncident(incident.incidentId)).toBeUndefined();
    });
  });

  describe('deleteUpdate', () => {
    it('should delete an update', () => {
      const incident = service.createIncident('Issue', 'Desc', 'high');
      const update = service.addIncidentUpdate(incident.incidentId, 'agent1', 'Update');

      const result = service.deleteUpdate(update.updateId);

      expect(result).toBe(true);
    });
  });

  describe('deleteMetrics', () => {
    it('should delete metrics', () => {
      const incident = service.createIncident('Issue', 'Desc', 'high');
      const metrics = service.recordIncidentMetrics(
        incident.incidentId,
        300000,
        600000,
        1000,
        85
      );

      const result = service.deleteMetrics(metrics.metricsId);

      expect(result).toBe(true);
    });
  });
});
