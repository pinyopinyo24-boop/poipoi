/**
 * IncidentManager Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { incidentManager, IncidentManager } from './IncidentManager';

describe('IncidentManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    incidentManager.cleanup();
  });

  afterEach(() => {
    incidentManager.cleanup();
  });

  // === インシデント記録テスト ===
  describe('Record Incident', () => {
    it('should record incident', () => {
      const incident = incidentManager.recordIncident(
        'Database Connection Error',
        'Failed to connect to database',
        'critical',
        'Database',
        100
      );
      expect(incident).not.toBeNull();
      expect(incident.severity).toBe('critical');
    });

    it('should get incident', () => {
      const recorded = incidentManager.recordIncident(
        'Database Connection Error',
        'Failed to connect to database',
        'critical',
        'Database',
        100
      );
      const retrieved = incidentManager.getIncident(recorded.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe('Database Connection Error');
    });

    it('should get all incidents', () => {
      incidentManager.recordIncident('Incident 1', 'Description 1', 'high', 'Component1', 50);
      incidentManager.recordIncident('Incident 2', 'Description 2', 'medium', 'Component2', 30);
      const incidents = incidentManager.getAllIncidents();
      expect(incidents.length).toBe(2);
    });
  });

  // === インシデント状態管理テスト ===
  describe('Incident Status Management', () => {
    it('should update incident status', () => {
      const recorded = incidentManager.recordIncident(
        'Database Connection Error',
        'Failed to connect to database',
        'critical',
        'Database',
        100
      );
      const updated = incidentManager.updateIncidentStatus(recorded.id, 'investigating');
      expect(updated?.status).toBe('investigating');
    });

    it('should resolve incident', () => {
      const recorded = incidentManager.recordIncident(
        'Database Connection Error',
        'Failed to connect to database',
        'critical',
        'Database',
        100
      );
      const resolved = incidentManager.updateIncidentStatus(
        recorded.id,
        'resolved',
        'Database server restart',
        'Restarted database server'
      );
      expect(resolved?.status).toBe('resolved');
      expect(resolved?.rootCause).toBe('Database server restart');
    });

    it('should calculate incident duration', () => {
      const recorded = incidentManager.recordIncident(
        'Database Connection Error',
        'Failed to connect to database',
        'critical',
        'Database',
        100
      );
      const resolved = incidentManager.updateIncidentStatus(recorded.id, 'resolved');
      expect(resolved?.duration).toBeGreaterThan(0);
    });
  });

  // === インシデント分析テスト ===
  describe('Incident Analysis', () => {
    it('should analyze incident', () => {
      const recorded = incidentManager.recordIncident(
        'Database Connection Error',
        'Failed to connect to database',
        'critical',
        'Database',
        100
      );
      const analysis = incidentManager.analyzeIncident(
        recorded.id,
        ['Database server down'],
        ['Network issue', 'Server overload'],
        ['Implement monitoring', 'Add redundancy'],
        85
      );
      expect(analysis).not.toBeNull();
      expect(analysis.confidence).toBe(85);
    });

    it('should get analysis', () => {
      const recorded = incidentManager.recordIncident(
        'Database Connection Error',
        'Failed to connect to database',
        'critical',
        'Database',
        100
      );
      incidentManager.analyzeIncident(
        recorded.id,
        ['Database server down'],
        ['Network issue'],
        ['Implement monitoring'],
        85
      );
      const analysis = incidentManager.getAnalysis(recorded.id);
      expect(analysis).not.toBeNull();
    });
  });

  // === 復旧履歴テスト ===
  describe('Recovery History', () => {
    it('should record recovery action', () => {
      const recorded = incidentManager.recordIncident(
        'Database Connection Error',
        'Failed to connect to database',
        'critical',
        'Database',
        100
      );
      const recovery = incidentManager.recordRecoveryAction(
        recorded.id,
        'Restart database server',
        'success',
        { serverName: 'db-01' }
      );
      expect(recovery).not.toBeNull();
      expect(recovery.result).toBe('success');
    });

    it('should get recovery history', () => {
      const recorded = incidentManager.recordIncident(
        'Database Connection Error',
        'Failed to connect to database',
        'critical',
        'Database',
        100
      );
      incidentManager.recordRecoveryAction(recorded.id, 'Action 1', 'success', {});
      incidentManager.recordRecoveryAction(recorded.id, 'Action 2', 'success', {});
      const history = incidentManager.getRecoveryHistory(recorded.id);
      expect(history.length).toBe(2);
    });
  });

  // === インシデント統計テスト ===
  describe('Incident Statistics', () => {
    it('should get incident statistics', () => {
      incidentManager.recordIncident('Incident 1', 'Description 1', 'critical', 'Component1', 50);
      incidentManager.recordIncident('Incident 2', 'Description 2', 'high', 'Component2', 30);
      const stats = incidentManager.getIncidentStatistics();
      expect(stats.totalIncidents).toBe(2);
    });

    it('should count critical incidents', () => {
      incidentManager.recordIncident('Critical Incident', 'Description', 'critical', 'Component1', 50);
      incidentManager.recordIncident('High Incident', 'Description', 'high', 'Component2', 30);
      const stats = incidentManager.getIncidentStatistics();
      expect(stats.criticalIncidents).toBe(1);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup', () => {
      incidentManager.recordIncident('Incident 1', 'Description 1', 'high', 'Component1', 50);
      incidentManager.cleanup();
      const incidents = incidentManager.getAllIncidents();
      expect(incidents.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = IncidentManager.getInstance();
      const instance2 = IncidentManager.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
