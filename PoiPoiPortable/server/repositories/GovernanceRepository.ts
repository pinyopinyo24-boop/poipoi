/**
 * GovernanceRepository - ガバナンスデータ永続化層
 */

import type { AIPolicy, AIPermission, AIAction, RiskAssessment } from '../core/GovernanceAIManager';

export class GovernanceRepository {
  private policies: Map<string, AIPolicy> = new Map();
  private permissions: Map<string, AIPermission> = new Map();
  private actions: Map<string, AIAction> = new Map();
  private riskAssessments: Map<string, RiskAssessment> = new Map();
  private approvalLevels: Map<string, number> = new Map();
  private violations: Array<{
    agentId: string;
    actionType: string;
    reason: string;
    timestamp: number;
  }> = [];
  private auditHistory: Array<{
    id: string;
    agentId: string;
    action: string;
    result: string;
    timestamp: number;
  }> = [];

  /**
   * ポリシーを保存
   */
  async savePolicy(policy: AIPolicy): Promise<void> {
    this.policies.set(policy.id, policy);
  }

  /**
   * ポリシーを取得
   */
  async getPolicy(policyId: string): Promise<AIPolicy | null> {
    return this.policies.get(policyId) || null;
  }

  /**
   * ポリシーを更新
   */
  async updatePolicy(policyId: string, policy: AIPolicy): Promise<void> {
    this.policies.set(policyId, policy);
  }

  /**
   * 権限を保存
   */
  async savePermission(permission: AIPermission): Promise<void> {
    this.permissions.set(permission.id, permission);
  }

  /**
   * 権限を取得
   */
  async getPermission(permissionId: string): Promise<AIPermission | null> {
    return this.permissions.get(permissionId) || null;
  }

  /**
   * 権限を削除
   */
  async deletePermission(permissionId: string): Promise<void> {
    this.permissions.delete(permissionId);
  }

  /**
   * 行動を保存
   */
  async saveAction(action: AIAction): Promise<void> {
    this.actions.set(action.id, action);
  }

  /**
   * リスク評価を保存
   */
  async saveRiskAssessment(assessment: RiskAssessment): Promise<void> {
    this.riskAssessments.set(assessment.id, assessment);
  }

  /**
   * 違反を記録
   */
  async logViolation(violation: {
    agentId: string;
    actionType: string;
    reason: string;
    timestamp: number;
  }): Promise<void> {
    this.violations.push(violation);
  }

  /**
   * 承認レベルを保存
   */
  async saveApprovalLevel(agentId: string, level: number): Promise<void> {
    this.approvalLevels.set(agentId, level);
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
    if (agentId) {
      return this.auditHistory.filter((h) => h.agentId === agentId);
    }
    return this.auditHistory;
  }

  /**
   * 監査履歴を追加
   */
  async addAuditLog(
    agentId: string,
    action: string,
    result: string
  ): Promise<void> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.auditHistory.push({
      id,
      agentId,
      action,
      result,
      timestamp: Date.now(),
    });
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
    const assessments: RiskAssessment[] = [];
    const iter = this.riskAssessments.values();
    let result = iter.next();
    while (!result.done) {
      assessments.push(result.value);
      result = iter.next();
    }
    const avgRisk = assessments.length > 0
      ? assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length
      : 0;

    return {
      totalPolicies: this.policies.size,
      totalPermissions: this.permissions.size,
      totalActions: this.actions.size,
      totalViolations: this.violations.length,
      averageRiskScore: avgRisk,
    };
  }

  /**
   * 全ポリシーを取得
   */
  async getAllPolicies(): Promise<AIPolicy[]> {
    return Array.from(this.policies.values());
  }

  /**
   * 全権限を取得
   */
  async getAllRiskAssessments(): Promise<RiskAssessment[]> {
    const assessments: RiskAssessment[] = [];
    const iter = this.riskAssessments.values();
    let result = iter.next();
    while (!result.done) {
      assessments.push(result.value);
      result = iter.next();
    }
    return assessments;
  }

  /**
   * 全行動を取得
   */
  async getAllActions(): Promise<AIAction[]> {
    return Array.from(this.actions.values());
  }

  /**
   * 全違反を取得
   */
  async getAllViolations(): Promise<Array<{
    agentId: string;
    actionType: string;
    reason: string;
    timestamp: number;
  }>> {
    return this.violations;
  }

  /**
   * クリーンアップ - 古いデータを削除
   */
  async cleanup(olderThanMs: number): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    let deleted = 0;

    const idsToDelete: string[] = [];
    const iter = this.riskAssessments.entries();
    let result = iter.next();
    while (!result.done) {
      const [id, assessment] = result.value;
      if (assessment.timestamp < cutoff) {
        idsToDelete.push(id);
      }
      result = iter.next();
    }

    for (const id of idsToDelete) {
      this.riskAssessments.delete(id);
      deleted++;
    }

    const initialViolations = this.violations.length;
    this.violations = this.violations.filter((v) => v.timestamp > cutoff);
    deleted += initialViolations - this.violations.length;

    return deleted;
  }
}
