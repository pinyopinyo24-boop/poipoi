/**
 * PolicyManager - AIポリシー管理
 */

import type { AIPolicy } from '../core/GovernanceAIManager';

export class PolicyManager {
  private policies: Map<string, AIPolicy> = new Map();

  /**
   * ポリシーを作成
   */
  async createPolicy(policy: Omit<AIPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIPolicy> {
    const id = `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdPolicy: AIPolicy = {
      ...policy,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.policies.set(id, createdPolicy);
    return createdPolicy;
  }

  /**
   * ポリシーを更新
   */
  async updatePolicy(policyId: string, updates: Partial<AIPolicy>): Promise<AIPolicy> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    const updated: AIPolicy = {
      ...policy,
      ...updates,
      id: policy.id,
      createdAt: policy.createdAt,
      updatedAt: Date.now(),
    };

    this.policies.set(policyId, updated);
    return updated;
  }

  /**
   * ポリシーを取得
   */
  async getPolicy(policyId: string): Promise<AIPolicy | null> {
    return this.policies.get(policyId) || null;
  }

  /**
   * 全ポリシーを取得
   */
  async getAllPolicies(): Promise<AIPolicy[]> {
    return Array.from(this.policies.values());
  }

  /**
   * ポリシーを削除
   */
  async deletePolicy(policyId: string): Promise<boolean> {
    return this.policies.delete(policyId);
  }

  /**
   * ポリシーをアーカイブ
   */
  async archivePolicy(policyId: string): Promise<AIPolicy | null> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return null;
    }

    const archived: AIPolicy = {
      ...policy,
      status: 'archived',
      updatedAt: Date.now(),
    };

    this.policies.set(policyId, archived);
    return archived;
  }

  /**
   * アクティブなポリシーを取得
   */
  async getActivePolicies(): Promise<AIPolicy[]> {
    return Array.from(this.policies.values()).filter((p) => p.status === 'active');
  }

  /**
   * ポリシー統計を取得
   */
  async getPolicyStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    archived: number;
  }> {
    const policies = Array.from(this.policies.values());
    return {
      total: policies.length,
      active: policies.filter((p) => p.status === 'active').length,
      inactive: policies.filter((p) => p.status === 'inactive').length,
      archived: policies.filter((p) => p.status === 'archived').length,
    };
  }
}
