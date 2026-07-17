/**
 * STEP 50: GovernanceAIManager テストスイート
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GovernanceAIManager } from '../core/GovernanceAIManager';
import { GovernanceService } from '../services/GovernanceService';
import { PolicyManager } from '../services/PolicyManager';
import { PermissionControlService } from '../services/PermissionControlService';
import { RiskAssessmentService } from '../services/RiskAssessmentService';
import { AIActionMonitorService } from '../services/AIActionMonitorService';
import { GovernanceValidator } from '../services/GovernanceValidator';
import { GovernanceRepository } from '../repositories/GovernanceRepository';

describe('GovernanceAIManager - AIシステム統制・ガバナンス管理', () => {
  let manager: GovernanceAIManager;
  let governanceService: GovernanceService;
  let policyManager: PolicyManager;
  let permissionControl: PermissionControlService;
  let riskAssessment: RiskAssessmentService;
  let actionMonitor: AIActionMonitorService;
  let validator: GovernanceValidator;
  let repository: GovernanceRepository;

  beforeEach(() => {
    governanceService = new GovernanceService();
    policyManager = new PolicyManager();
    permissionControl = new PermissionControlService();
    riskAssessment = new RiskAssessmentService();
    actionMonitor = new AIActionMonitorService();
    validator = new GovernanceValidator();
    repository = new GovernanceRepository();

    manager = new GovernanceAIManager(
      governanceService,
      policyManager,
      permissionControl,
      riskAssessment,
      actionMonitor,
      validator,
      repository
    );
  });

  describe('① AIポリシー管理', () => {
    it('should create a policy', async () => {
      const policy = await manager.createPolicy({
        name: 'Test Policy',
        description: 'Test policy description',
        rules: [
          {
            id: 'rule1',
            type: 'action_control',
            condition: 'action_type == "delete"',
            action: 'block',
            priority: 10,
          },
        ],
        status: 'active',
      });

      expect(policy.id).toBeDefined();
      expect(policy.name).toBe('Test Policy');
      expect(policy.status).toBe('active');
    });

    it('should update a policy', async () => {
      const policy = await manager.createPolicy({
        name: 'Test Policy',
        description: 'Test',
        rules: [
          {
            id: 'rule1',
            type: 'action_control',
            condition: 'test',
            action: 'block',
            priority: 5,
          },
        ],
        status: 'active',
      });

      const updated = await manager.updatePolicy(policy.id, {
        name: 'Updated Policy',
      });

      expect(updated.name).toBe('Updated Policy');
    });

    it('should reject invalid policy', async () => {
      await expect(
        manager.createPolicy({
          name: '',
          description: 'Test',
          rules: [],
          status: 'active',
        })
      ).rejects.toThrow();
    });
  });

  describe('② AI権限管理', () => {
    it('should grant permission', async () => {
      const permission = await manager.grantPermission({
        agentId: 'agent1',
        resourceType: 'database',
        accessLevel: 'read',
      });

      expect(permission.id).toBeDefined();
      expect(permission.agentId).toBe('agent1');
      expect(permission.accessLevel).toBe('read');
    });

    it('should revoke permission', async () => {
      const permission = await manager.grantPermission({
        agentId: 'agent1',
        resourceType: 'database',
        accessLevel: 'write',
      });

      const revoked = await manager.revokePermission(permission.id);
      expect(revoked).toBe(true);
    });

    it('should reject invalid permission', async () => {
      await expect(
        manager.grantPermission({
          agentId: '',
          resourceType: 'database',
          accessLevel: 'read',
        })
      ).rejects.toThrow();
    });
  });

  describe('③ 行動制御', () => {
    it('should control action', async () => {
      const action = await manager.controlAction({
        agentId: 'agent1',
        actionType: 'data_access',
        parameters: { table: 'users' },
      });

      expect(action.id).toBeDefined();
      expect(action.status).toBe('pending');
      expect(action.agentId).toBe('agent1');
    });

    it('should reject invalid action', async () => {
      await expect(
        manager.controlAction({
          agentId: '',
          actionType: 'test',
          parameters: {},
        })
      ).rejects.toThrow();
    });
  });

  describe('④ リスク評価', () => {
    it('should assess risk', async () => {
      const assessment = await manager.assessRisk('agent1', 'system_modification');

      expect(assessment.id).toBeDefined();
      expect(assessment.agentId).toBe('agent1');
      expect(assessment.actionType).toBe('system_modification');
      expect(['low', 'medium', 'high', 'critical']).toContain(assessment.riskLevel);
    });

    it('should calculate risk score', async () => {
      const assessment = await manager.assessRisk('agent1', 'system_modification');
      expect(assessment.score).toBeGreaterThanOrEqual(0);
      expect(assessment.score).toBeLessThanOrEqual(100);
    });

    it('should identify risk factors', async () => {
      const assessment = await manager.assessRisk('agent1', 'system_modification');
      expect(assessment.factors).toBeInstanceOf(Array);
      expect(assessment.factors.length).toBeGreaterThan(0);
    });
  });

  describe('⑤ AI操作監視', () => {
    it('should monitor action', async () => {
      const action = await manager.controlAction({
        agentId: 'agent1',
        actionType: 'data_access',
        parameters: {},
      });

      const allowed = await manager.monitorAction(action);
      expect(typeof allowed).toBe('boolean');
    });

    it('should block dangerous actions', async () => {
      const action = await manager.controlAction({
        agentId: 'agent1',
        actionType: 'delete_all',
        parameters: {},
      });

      const allowed = await manager.monitorAction(action);
      expect(allowed).toBe(false);
    });
  });

  describe('⑥ 承認レベル管理', () => {
    it('should set approval level', async () => {
      const result = await manager.setApprovalLevel('agent1', 5);
      expect(result).toBe(true);
    });

    it('should reject invalid approval level', async () => {
      await expect(manager.setApprovalLevel('agent1', 15)).rejects.toThrow();
    });
  });

  describe('⑦ 違反検出', () => {
    it('should detect violations', async () => {
      const violations = await manager.detectViolations();
      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe('⑧ 監査履歴保存', () => {
    it('should get audit history', async () => {
      const history = await manager.getAuditHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should get audit history for agent', async () => {
      const history = await manager.getAuditHistory('agent1');
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('⑨ AuditManager連携', () => {
    it('should log governance actions', async () => {
      await repository.addAuditLog('agent1', 'create_policy', 'success');
      const history = await manager.getAuditHistory('agent1');
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('⑩ ApprovalManager連携', () => {
    it('should track approval status', async () => {
      const action = await manager.controlAction({
        agentId: 'agent1',
        actionType: 'policy_change',
        parameters: {},
      });

      expect(action.status).toBe('pending');
    });
  });

  describe('⑪ AgentAIManager連携', () => {
    it('should manage agent permissions', async () => {
      const perm = await manager.grantPermission({
        agentId: 'agent1',
        resourceType: 'api',
        accessLevel: 'execute',
      });

      expect(perm.agentId).toBe('agent1');
    });
  });

  describe('⑫ AICollaborationManager連携', () => {
    it('should enforce governance across agents', async () => {
      const perm1 = await manager.grantPermission({
        agentId: 'agent1',
        resourceType: 'database',
        accessLevel: 'read',
      });

      const perm2 = await manager.grantPermission({
        agentId: 'agent2',
        resourceType: 'database',
        accessLevel: 'write',
      });

      expect(perm1.agentId).toBe('agent1');
      expect(perm2.agentId).toBe('agent2');
    });
  });

  describe('GovernanceValidator', () => {
    it('should validate policy', () => {
      const valid = validator.validatePolicy({
        name: 'Test',
        description: 'Test',
        rules: [
          {
            id: 'r1',
            type: 'action_control',
            condition: 'test',
            action: 'block',
            priority: 5,
          },
        ],
        status: 'active',
      });

      expect(valid).toBe(true);
    });

    it('should validate permission', () => {
      const valid = validator.validatePermission({
        agentId: 'agent1',
        resourceType: 'database',
        accessLevel: 'read',
      });

      expect(valid).toBe(true);
    });

    it('should validate action', () => {
      const valid = validator.validateAction({
        agentId: 'agent1',
        actionType: 'test',
        parameters: {},
      });

      expect(valid).toBe(true);
    });

    it('should validate approval level', () => {
      expect(validator.validateApprovalLevel(5)).toBe(true);
      expect(validator.validateApprovalLevel(15)).toBe(false);
    });

    it('should validate agent id', () => {
      expect(validator.validateAgentId('agent-1')).toBe(true);
      expect(validator.validateAgentId('')).toBe(false);
    });

    it('should validate resource type', () => {
      expect(validator.validateResourceType('database')).toBe(true);
      expect(validator.validateResourceType('invalid')).toBe(false);
    });

    it('should validate access level', () => {
      expect(validator.validateAccessLevel('read')).toBe(true);
      expect(validator.validateAccessLevel('invalid')).toBe(false);
    });
  });

  describe('RiskAssessmentService', () => {
    it('should assess risk with factors', async () => {
      const assessment = await riskAssessment.assessRisk('agent1', 'system_modification');
      expect(assessment.factors.length).toBeGreaterThan(0);
    });

    it('should calculate average risk score', async () => {
      await riskAssessment.assessRisk('agent1', 'system_modification');
      await riskAssessment.assessRisk('agent1', 'data_access');

      const avg = await riskAssessment.getAverageRiskScore('agent1');
      expect(avg).toBeGreaterThanOrEqual(0);
    });

    it('should get risk distribution', async () => {
      await riskAssessment.assessRisk('agent1', 'system_modification');
      const dist = await riskAssessment.getRiskDistribution();

      expect(dist.low + dist.medium + dist.high + dist.critical).toBeGreaterThan(0);
    });
  });

  describe('AIActionMonitorService', () => {
    it('should analyze action patterns', async () => {
      const action = await manager.controlAction({
        agentId: 'agent1',
        actionType: 'data_access',
        parameters: {},
      });

      await actionMonitor.monitorAction(action);
      const patterns = await actionMonitor.analyzeActionPatterns('agent1');

      expect(patterns.totalActions).toBeGreaterThanOrEqual(0);
      expect(patterns.successRate).toBeGreaterThanOrEqual(0);
    });

    it('should get action statistics', async () => {
      const stats = await actionMonitor.getActionStats();
      expect(stats.totalMonitored).toBeGreaterThanOrEqual(0);
      expect(stats.totalBlocked).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GovernanceRepository', () => {
    it('should get governance statistics', async () => {
      const stats = await manager.getGovernanceStats();
      expect(stats.totalPolicies).toBeGreaterThanOrEqual(0);
      expect(stats.totalPermissions).toBeGreaterThanOrEqual(0);
      expect(stats.totalActions).toBeGreaterThanOrEqual(0);
    });

    it('should cleanup old data', async () => {
      const deleted = await repository.cleanup(1000);
      expect(typeof deleted).toBe('number');
    });
  });

  describe('Integration Tests', () => {
    it('should create complete governance workflow', async () => {
      // Create policy
      const policy = await manager.createPolicy({
        name: 'Complete Workflow',
        description: 'Test',
        rules: [
          {
            id: 'rule1',
            type: 'action_control',
            condition: 'test',
            action: 'block',
            priority: 5,
          },
        ],
        status: 'active',
      });

      // Grant permission
      const permission = await manager.grantPermission({
        agentId: 'agent1',
        resourceType: 'database',
        accessLevel: 'read',
      });

      // Control action
      const action = await manager.controlAction({
        agentId: 'agent1',
        actionType: 'data_access',
        parameters: {},
      });

      // Assess risk
      const risk = await manager.assessRisk('agent1', 'data_access');

      // Monitor action
      const allowed = await manager.monitorAction(action);

      expect(policy.id).toBeDefined();
      expect(permission.id).toBeDefined();
      expect(action.id).toBeDefined();
      expect(risk.id).toBeDefined();
      expect(typeof allowed).toBe('boolean');
    });

    it('should generate governance report', async () => {
      const report = await manager.generateGovernanceReport();

      expect(report.totalPolicies).toBeGreaterThanOrEqual(0);
      expect(report.activeAgents).toBeGreaterThanOrEqual(0);
      expect(report.violations).toBeGreaterThanOrEqual(0);
      expect(report.complianceRate).toBeGreaterThanOrEqual(0);
      expect(report.complianceRate).toBeLessThanOrEqual(100);
    });

    it('should handle multiple agents', async () => {
      const perm1 = await manager.grantPermission({
        agentId: 'agent1',
        resourceType: 'database',
        accessLevel: 'read',
      });

      const perm2 = await manager.grantPermission({
        agentId: 'agent2',
        resourceType: 'api',
        accessLevel: 'execute',
      });

      const perm3 = await manager.grantPermission({
        agentId: 'agent3',
        resourceType: 'file',
        accessLevel: 'write',
      });

      expect(perm1.agentId).toBe('agent1');
      expect(perm2.agentId).toBe('agent2');
      expect(perm3.agentId).toBe('agent3');
    });

    it('should track complete audit trail', async () => {
      await repository.addAuditLog('agent1', 'create_policy', 'success');
      await repository.addAuditLog('agent1', 'grant_permission', 'success');
      await repository.addAuditLog('agent2', 'control_action', 'success');

      const history = await manager.getAuditHistory();
      expect(history.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing policy', async () => {
      await expect(manager.updatePolicy('nonexistent', {})).rejects.toThrow();
    });

    it('should handle missing permission', async () => {
      await expect(manager.revokePermission('nonexistent')).rejects.toThrow();
    });

    it('should handle invalid parameters', async () => {
      await expect(
        manager.controlAction({
          agentId: 'agent1',
          actionType: '',
          parameters: {},
        })
      ).rejects.toThrow();
    });
  });

  describe('Additional Governance Tests', () => {
    it('should handle multiple policies', async () => {
      const policy1 = await manager.createPolicy({
        name: 'Policy 1',
        description: 'First policy',
        rules: [
          {
            id: 'r1',
            type: 'action_control',
            condition: 'test1',
            action: 'block',
            priority: 5,
          },
        ],
        status: 'active',
      });

      const policy2 = await manager.createPolicy({
        name: 'Policy 2',
        description: 'Second policy',
        rules: [
          {
            id: 'r2',
            type: 'resource_limit',
            condition: 'test2',
            action: 'limit',
            priority: 10,
          },
        ],
        status: 'active',
      });

      expect(policy1.id).not.toBe(policy2.id);
      expect(policy1.name).toBe('Policy 1');
      expect(policy2.name).toBe('Policy 2');
    });

    it('should track permission expiration', async () => {
      const futureTime = Date.now() + 86400000;
      const perm = await manager.grantPermission({
        agentId: 'agent1',
        resourceType: 'database',
        accessLevel: 'read',
        expiresAt: futureTime,
      });

      expect(perm.expiresAt).toBe(futureTime);
      expect(perm.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should validate multiple agent permissions', async () => {
      const agents = ['agent1', 'agent2', 'agent3', 'agent4', 'agent5'];
      const permissions = [];

      for (const agentId of agents) {
        const perm = await manager.grantPermission({
          agentId,
          resourceType: 'api',
          accessLevel: 'execute',
        });
        permissions.push(perm);
      }

      expect(permissions.length).toBe(5);
      permissions.forEach((p, i) => {
        expect(p.agentId).toBe(agents[i]);
      });
    });

    it('should calculate risk for different action types', async () => {
      const actionTypes = [
        'system_modification',
        'data_access',
        'external_communication',
        'policy_change',
      ];

      for (const actionType of actionTypes) {
        const assessment = await manager.assessRisk('agent1', actionType);
        expect(assessment.actionType).toBe(actionType);
        expect(assessment.score).toBeGreaterThanOrEqual(0);
        expect(assessment.score).toBeLessThanOrEqual(100);
      }
    });

    it('should detect risk level changes', async () => {
      const lowRisk = await manager.assessRisk('agent1', 'data_access');
      const highRisk = await manager.assessRisk('agent1', 'system_modification');

      expect(highRisk.score).toBeGreaterThan(lowRisk.score);
    });

    it('should manage approval levels for multiple agents', async () => {
      const agents = ['agent1', 'agent2', 'agent3'];
      const levels = [3, 5, 8];

      for (let i = 0; i < agents.length; i++) {
        const result = await manager.setApprovalLevel(agents[i], levels[i]);
        expect(result).toBe(true);
      }
    });

    it('should track action monitoring history', async () => {
      const actions = [];
      for (let i = 0; i < 5; i++) {
        const action = await manager.controlAction({
          agentId: 'agent1',
          actionType: `action_${i}`,
          parameters: { index: i },
        });
        actions.push(action);
      }

      expect(actions.length).toBe(5);
      actions.forEach((a, i) => {
        expect(a.actionType).toBe(`action_${i}`);
      });
    });

    it('should generate comprehensive governance report', async () => {
      // Create multiple policies
      for (let i = 0; i < 3; i++) {
        await manager.createPolicy({
          name: `Report Policy ${i}`,
          description: 'Test',
          rules: [
            {
              id: `r${i}`,
              type: 'action_control',
              condition: 'test',
              action: 'block',
              priority: 5,
            },
          ],
          status: 'active',
        });
      }

      // Create permissions
      for (let i = 0; i < 3; i++) {
        await manager.grantPermission({
          agentId: `agent${i}`,
          resourceType: 'database',
          accessLevel: 'read',
        });
      }

      const report = await manager.generateGovernanceReport();

      expect(report.totalPolicies).toBeGreaterThanOrEqual(0);
      expect(report.activeAgents).toBeGreaterThanOrEqual(0);
      expect(report.complianceRate).toBeGreaterThanOrEqual(0);
      expect(report.complianceRate).toBeLessThanOrEqual(100);
    });

    it('should validate policy rule priorities', () => {
      expect(validator.validateRulePriority(0)).toBe(true);
      expect(validator.validateRulePriority(50)).toBe(true);
      expect(validator.validateRulePriority(100)).toBe(true);
      expect(validator.validateRulePriority(-1)).toBe(false);
      expect(validator.validateRulePriority(101)).toBe(false);
    });

    it('should validate all resource types', () => {
      const validTypes = ['database', 'file', 'api', 'memory', 'system'];
      const invalidType = 'invalid_type';

      validTypes.forEach((type) => {
        expect(validator.validateResourceType(type)).toBe(true);
      });

      expect(validator.validateResourceType(invalidType)).toBe(false);
    });

    it('should handle governance cleanup', async () => {
      const deleted = await repository.cleanup(1000);
      expect(typeof deleted).toBe('number');
      expect(deleted).toBeGreaterThanOrEqual(0);
    });

    it('should get comprehensive governance statistics', async () => {
      const stats = await manager.getGovernanceStats();

      expect(stats.totalPolicies).toBeGreaterThanOrEqual(0);
      expect(stats.totalPermissions).toBeGreaterThanOrEqual(0);
      expect(stats.totalActions).toBeGreaterThanOrEqual(0);
      expect(stats.totalViolations).toBeGreaterThanOrEqual(0);
      expect(stats.averageRiskScore).toBeGreaterThanOrEqual(0);
    });

    it('should validate complete policy lifecycle', async () => {
      // Create
      const policy = await manager.createPolicy({
        name: 'Lifecycle Policy',
        description: 'Test lifecycle',
        rules: [
          {
            id: 'r1',
            type: 'action_control',
            condition: 'test',
            action: 'block',
            priority: 5,
          },
        ],
        status: 'active',
      });

      expect(policy.id).toBeDefined();
      expect(policy.status).toBe('active');

      // Update
      const updated = await manager.updatePolicy(policy.id, {
        name: 'Updated Lifecycle Policy',
      });

      expect(updated.name).toBe('Updated Lifecycle Policy');
    });
  });
});
