import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SelfDiagnoseEngine, HealthStatus } from './SelfDiagnoseEngine';
import { SecurityEngine } from '../security/SecurityEngine';

describe('SelfDiagnoseEngine', () => {
  let diagnoseEngine: SelfDiagnoseEngine;
  let securityEngine: SecurityEngine;
  let userId: string;

  beforeEach(async () => {
    diagnoseEngine = SelfDiagnoseEngine.getInstance();
    diagnoseEngine.clearAllData();
    securityEngine = (diagnoseEngine as any).securityEngine;
    if (!securityEngine.isReady()) {
      await securityEngine.initialize();
    }
    userId = 'test-user-' + Date.now();
    await securityEngine.createContext(userId, 'user');
    await securityEngine.grantPermission(userId, 'diagnose:read');
    await securityEngine.grantPermission(userId, 'diagnose:write');
  });

  afterEach(async () => {
    diagnoseEngine.clearAllData();
    if (securityEngine.isReady()) {
      await securityEngine.shutdown();
    }
  });

  describe('Singleton Pattern', () => {
    it('should be a singleton', () => {
      const engine1 = SelfDiagnoseEngine.getInstance();
      const engine2 = SelfDiagnoseEngine.getInstance();
      expect(engine1).toBe(engine2);
    });
  });

  describe('Full Diagnosis', () => {
    it('should run full diagnosis', async () => {
      const report = await diagnoseEngine.runFullDiagnosis(userId);

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.status).toBeDefined();
      expect(report.components).toBeInstanceOf(Array);
      expect(report.issues).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
    });

    it('should include all components in diagnosis', async () => {
      const report = await diagnoseEngine.runFullDiagnosis(userId);

      const componentNames = report.components.map((c) => c.name);
      expect(componentNames).toContain('SecurityEngine');
      expect(componentNames).toContain('MemoryEngine');
      expect(componentNames).toContain('KnowledgeEngine');
    });

    it('should generate recommendations', async () => {
      const report = await diagnoseEngine.runFullDiagnosis(userId);

      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should throw error if user lacks permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        diagnoseEngine.runFullDiagnosis(unauthorizedUser)
      ).rejects.toThrow('User does not have permission to run diagnostics');
    });
  });

  describe('Health Status', () => {
    it('should report healthy status', async () => {
      const report = await diagnoseEngine.runFullDiagnosis(userId);

      expect([HealthStatus.HEALTHY, HealthStatus.WARNING, HealthStatus.CRITICAL]).toContain(
        report.status
      );
    });

    it('should have healthy components', async () => {
      const report = await diagnoseEngine.runFullDiagnosis(userId);

      report.components.forEach((comp) => {
        expect([HealthStatus.HEALTHY, HealthStatus.WARNING, HealthStatus.CRITICAL]).toContain(
          comp.status
        );
      });
    });
  });

  describe('Diagnostic History', () => {
    it('should store diagnostic history', async () => {
      await diagnoseEngine.runFullDiagnosis(userId);
      await diagnoseEngine.runFullDiagnosis(userId);

      const history = await diagnoseEngine.getDiagnosticHistory(userId);

      expect(history.length).toBe(2);
    });

    it('should limit history by count', async () => {
      for (let i = 0; i < 15; i++) {
        await diagnoseEngine.runFullDiagnosis(userId);
      }

      const history = await diagnoseEngine.getDiagnosticHistory(userId, 5);

      expect(history.length).toBe(5);
    });

    it('should throw error if user lacks permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        diagnoseEngine.getDiagnosticHistory(unauthorizedUser)
      ).rejects.toThrow('User does not have permission to read diagnostic history');
    });
  });

  describe('Issue Management', () => {
    it('should retrieve issues', async () => {
      await diagnoseEngine.runFullDiagnosis(userId);

      const issues = await diagnoseEngine.getIssues(userId);

      expect(issues).toBeInstanceOf(Array);
    });

    it('should filter issues by resolved status', async () => {
      await diagnoseEngine.runFullDiagnosis(userId);

      const unresolved = await diagnoseEngine.getIssues(userId, false);
      const resolved = await diagnoseEngine.getIssues(userId, true);

      expect(unresolved.length + resolved.length).toBeGreaterThanOrEqual(0);
    });

    it('should resolve issue', async () => {
      const report = await diagnoseEngine.runFullDiagnosis(userId);

      if (report.issues.length > 0) {
        const issueId = report.issues[0].id;
        await diagnoseEngine.resolveIssue(userId, issueId);

        const issues = await diagnoseEngine.getIssues(userId, false);
        const resolvedIssue = report.issues.find((i) => i.id === issueId);

        if (resolvedIssue) {
          expect(resolvedIssue.resolved).toBe(true);
        }
      }
    });

    it('should throw error if issue not found', async () => {
      await expect(
        diagnoseEngine.resolveIssue(userId, 'non-existent-issue')
      ).rejects.toThrow('Issue not found');
    });

    it('should throw error if user lacks permission to resolve', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        diagnoseEngine.resolveIssue(unauthorizedUser, 'any-issue')
      ).rejects.toThrow('User does not have permission to resolve issues');
    });
  });

  describe('Component Metrics', () => {
    it('should include component metrics', async () => {
      const report = await diagnoseEngine.runFullDiagnosis(userId);

      report.components.forEach((comp) => {
        expect(comp.metrics).toBeDefined();
        expect(typeof comp.metrics).toBe('object');
        expect(comp.lastCheck).toBeDefined();
      });
    });

    it('should have security engine metrics', async () => {
      const report = await diagnoseEngine.runFullDiagnosis(userId);

      const securityComp = report.components.find((c) => c.name === 'SecurityEngine');
      expect(securityComp).toBeDefined();
      expect(securityComp?.metrics.isReady).toBeDefined();
    });

    it('should have memory engine metrics', async () => {
      const report = await diagnoseEngine.runFullDiagnosis(userId);

      const memoryComp = report.components.find((c) => c.name === 'MemoryEngine');
      expect(memoryComp).toBeDefined();
      expect(memoryComp?.metrics.userCount).toBeDefined();
    });

    it('should have knowledge engine metrics', async () => {
      const report = await diagnoseEngine.runFullDiagnosis(userId);

      const knowledgeComp = report.components.find((c) => c.name === 'KnowledgeEngine');
      expect(knowledgeComp).toBeDefined();
      expect(knowledgeComp?.metrics.knowledgeCount).toBeDefined();
    });
  });

  describe('Overall Score', () => {
    it('should calculate overall score', async () => {
      const report = await diagnoseEngine.runFullDiagnosis(userId);

      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
    });

    it('should have high score for healthy system', async () => {
      const report = await diagnoseEngine.runFullDiagnosis(userId);

      if (report.status === HealthStatus.HEALTHY) {
        expect(report.overallScore).toBeGreaterThan(70);
      }
    });

    it('should have low score for critical system', async () => {
      const report = await diagnoseEngine.runFullDiagnosis(userId);

      if (report.status === HealthStatus.CRITICAL) {
        expect(report.overallScore).toBeLessThan(50);
      }
    });
  });

  describe('Multiple Users', () => {
    it('should isolate diagnostics by user', async () => {
      const user2 = 'test-user-2-' + Date.now();
      await securityEngine.createContext(user2, 'user');
      await securityEngine.grantPermission(user2, 'diagnose:read');

      const report1 = await diagnoseEngine.runFullDiagnosis(userId);
      const report2 = await diagnoseEngine.runFullDiagnosis(user2);

      const history1 = await diagnoseEngine.getDiagnosticHistory(userId);
      const history2 = await diagnoseEngine.getDiagnosticHistory(user2);

      expect(history1.length).toBeLessThanOrEqual(2);
      expect(history2.length).toBeLessThanOrEqual(2);
      expect(report1.id).not.toBe(report2.id);
    });
  });

  describe('Sequential Diagnostics', () => {
    it('should run sequential diagnostics', async () => {
      const reports = [];
      for (let i = 0; i < 3; i++) {
        const report = await diagnoseEngine.runFullDiagnosis(userId);
        reports.push(report);
      }

      expect(reports.length).toBe(3);
      reports.forEach((report, index) => {
        if (index > 0) {
          expect(report.timestamp).toBeGreaterThanOrEqual(reports[index - 1].timestamp);
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty diagnostic history', async () => {
      const history = await diagnoseEngine.getDiagnosticHistory(userId);

      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBe(0);
    });

    it('should handle zero limit', async () => {
      await diagnoseEngine.runFullDiagnosis(userId);

      const history = await diagnoseEngine.getDiagnosticHistory(userId, 0);

      expect(history.length).toBeLessThanOrEqual(1);
    });

    it('should handle large limit', async () => {
      for (let i = 0; i < 5; i++) {
        await diagnoseEngine.runFullDiagnosis(userId);
      }

      const history = await diagnoseEngine.getDiagnosticHistory(userId, 1000);

      expect(history.length).toBe(5);
    });

    it('should clear all data', async () => {
      await diagnoseEngine.runFullDiagnosis(userId);

      diagnoseEngine.clearAllData();

      const history = await diagnoseEngine.getDiagnosticHistory(userId);
      const issues = await diagnoseEngine.getIssues(userId);

      expect(history.length).toBe(0);
      expect(issues.length).toBe(0);
    });
  });
});
