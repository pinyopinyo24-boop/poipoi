/**
 * GovernanceAIManager - AIシステム統制・ガバナンス管理
 * AIシステム全体を安全に管理する統制・ガバナンス機能を提供
 */

import { GovernanceService } from '../services/GovernanceService';
import { PolicyManager } from '../services/PolicyManager';
import { PermissionControlService } from '../services/PermissionControlService';
import { RiskAssessmentService } from '../services/RiskAssessmentService';
import { AIActionMonitorService } from '../services/AIActionMonitorService';
import { GovernanceValidator } from '../services/GovernanceValidator';
import { GovernanceRepository } from '../repositories/GovernanceRepository';

export interface AIPolicy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  status: 'active' | 'inactive' | 'archived';
  createdAt: number;
  updatedAt: number;
}

export interface PolicyRule {
  id: string;
  type: 'action_control' | 'resource_limit' | 'behavior_restriction';
  condition: string;
  action: string;
  priority: number;
}

export interface AIPermission {
  id: string;
  agentId: string;
  resourceType: string;
  accessLevel: 'read' | 'write' | 'execute' | 'admin';
  expiresAt?: number;
  conditions?: Record<string, unknown>;
}

export interface RiskAssessment {
  id: string;
  agentId: string;
  actionType: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  factors: string[];
  timestamp: number;
}

export interface AIAction {
  id: string;
  agentId: string;
  actionType: string;
  parameters: Record<string, unknown>;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  approvalId?: string;
}

export class GovernanceAIManager {
  constructor(
    private governanceService: GovernanceService,
    private policyManager: PolicyManager,
    private permissionControl: PermissionControlService,
    private riskAssessment: RiskAssessmentService,
    private actionMonitor: AIActionMonitorService,
    private validator: GovernanceValidator,
    private repository: GovernanceRepository
  ) {}

  /**
   * AIポリシーを作成
   */
  async createPolicy(policy: Omit<AIPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIPolicy> {
    if (!this.validator.validatePolicy(policy)) {
      throw new Error('Invalid policy');
    }

    const createdPolicy = await this.policyManager.createPolicy(policy);
    await this.repository.savePolicy(createdPolicy);

    return createdPolicy;
  }

  /**
   * AIポリシーを更新
   */
  async updatePolicy(policyId: string, updates: Partial<AIPolicy>): Promise<AIPolicy> {
    const policy = await this.repository.getPolicy(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    const updated = await this.policyManager.updatePolicy(policyId, updates);
    await this.repository.updatePolicy(policyId, updated);

    return updated;
  }

  /**
   * AI権限を付与
   */
  async grantPermission(permission: Omit<AIPermission, 'id'>): Promise<AIPermission> {
    if (!this.validator.validatePermission(permission)) {
      throw new Error('Invalid permission');
    }

    const granted = await this.permissionControl.grantPermission(permission);
    await this.repository.savePermission(granted);

    return granted;
  }

  /**
   * AI権限を取り消し
   */
  async revokePermission(permissionId: string): Promise<boolean> {
    const permission = await this.repository.getPermission(permissionId);
    if (!permission) {
      throw new Error('Permission not found');
    }

    await this.permissionControl.revokePermission(permissionId);
    await this.repository.deletePermission(permissionId);

    return true;
  }

  /**
   * AI行動を制御
   */
  async controlAction(action: Omit<AIAction, 'id' | 'timestamp' | 'status'>): Promise<AIAction> {
    if (!this.validator.validateAction(action)) {
      throw new Error('Invalid action');
    }

    const controlled = await this.governanceService.controlAction(action);
    await this.repository.saveAction(controlled);

    return controlled;
  }

  /**
   * リスク評価を実施
   */
  async assessRisk(agentId: string, actionType: string): Promise<RiskAssessment> {
    const assessment = await this.riskAssessment.assessRisk(agentId, actionType);
    await this.repository.saveRiskAssessment(assessment);

    return assessment;
  }

  /**
   * AI操作を監視
   */
  async monitorAction(action: AIAction): Promise<boolean> {
    const isAllowed = await this.actionMonitor.monitorAction(action);

    if (!isAllowed) {
      await this.repository.logViolation({
        agentId: action.agentId,
        actionType: action.actionType,
        reason: 'Policy violation detected',
        timestamp: Date.now(),
      });
    }

    return isAllowed;
  }

  /**
   * 承認レベルを管理
   */
  async setApprovalLevel(agentId: string, level: number): Promise<boolean> {
    if (!this.validator.validateApprovalLevel(level)) {
      throw new Error('Invalid approval level');
    }

    await this.governanceService.setApprovalLevel(agentId, level);
    await this.repository.saveApprovalLevel(agentId, level);

    return true;
  }

  /**
   * 違反を検出
   */
  async detectViolations(): Promise<Array<{
    agentId: string;
    violationType: string;
    severity: string;
    timestamp: number;
  }>> {
    return await this.governanceService.detectViolations();
  }

  /**
   * 監査履歴を取得
   */
  async getAuditHistory(agentId?: string): Promise<Array<{
    id: string;
    agentId: string;
    action: string;
    result: string;
    timestamp: number;
  }>> {
    return await this.repository.getAuditHistory(agentId);
  }

  /**
   * ガバナンスレポートを生成
   */
  async generateGovernanceReport(): Promise<{
    totalPolicies: number;
    activeAgents: number;
    violations: number;
    riskScore: number;
    complianceRate: number;
    timestamp: number;
  }> {
    return await this.governanceService.generateReport();
  }

  /**
   * ガバナンス統計を取得
   */
  async getGovernanceStats(): Promise<{
    totalPolicies: number;
    totalPermissions: number;
    totalActions: number;
    totalViolations: number;
    averageRiskScore: number;
  }> {
    return await this.repository.getGovernanceStats();
  }
}
