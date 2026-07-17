/**
 * GovernanceValidator - ガバナンス検証
 */

import type { AIPolicy, AIPermission, AIAction } from '../core/GovernanceAIManager';

export class GovernanceValidator {
  /**
   * ポリシーを検証
   */
  validatePolicy(policy: Omit<AIPolicy, 'id' | 'createdAt' | 'updatedAt'>): boolean {
    if (!policy.name || policy.name.trim().length === 0) {
      return false;
    }

    if (!policy.rules || policy.rules.length === 0) {
      return false;
    }

    if (!['active', 'inactive', 'archived'].includes(policy.status)) {
      return false;
    }

    for (const rule of policy.rules) {
      if (!rule.id || !rule.type || !rule.condition || !rule.action) {
        return false;
      }

      if (!['action_control', 'resource_limit', 'behavior_restriction'].includes(rule.type)) {
        return false;
      }

      if (rule.priority < 0 || rule.priority > 100) {
        return false;
      }
    }

    return true;
  }

  /**
   * 権限を検証
   */
  validatePermission(permission: Omit<AIPermission, 'id'>): boolean {
    if (!permission.agentId || permission.agentId.trim().length === 0) {
      return false;
    }

    if (!permission.resourceType || permission.resourceType.trim().length === 0) {
      return false;
    }

    if (!['read', 'write', 'execute', 'admin'].includes(permission.accessLevel)) {
      return false;
    }

    if (permission.expiresAt && permission.expiresAt < Date.now()) {
      return false;
    }

    return true;
  }

  /**
   * 行動を検証
   */
  validateAction(action: Omit<AIAction, 'id' | 'timestamp' | 'status'>): boolean {
    if (!action.agentId || action.agentId.trim().length === 0) {
      return false;
    }

    if (!action.actionType || action.actionType.trim().length === 0) {
      return false;
    }

    if (!action.parameters || typeof action.parameters !== 'object') {
      return false;
    }

    return true;
  }

  /**
   * 承認レベルを検証
   */
  validateApprovalLevel(level: number): boolean {
    return level >= 0 && level <= 10 && Number.isInteger(level);
  }

  /**
   * ポリシー名を検証
   */
  validatePolicyName(name: string): boolean {
    return !!(name && name.trim().length > 0 && name.length <= 255);
  }

  /**
   * エージェントIDを検証
   */
  validateAgentId(agentId: string): boolean {
    return !!(agentId && agentId.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(agentId));
  }

  /**
   * リソースタイプを検証
   */
  validateResourceType(resourceType: string): boolean {
    const validTypes = ['database', 'file', 'api', 'memory', 'system'];
    return validTypes.includes(resourceType);
  }

  /**
   * アクセスレベルを検証
   */
  validateAccessLevel(level: string): boolean {
    return ['read', 'write', 'execute', 'admin'].includes(level);
  }

  /**
   * ルール優先度を検証
   */
  validateRulePriority(priority: number): boolean {
    return priority >= 0 && priority <= 100 && Number.isInteger(priority);
  }

  /**
   * ポリシー全体を検証
   */
  validatePolicyCompleteness(policy: AIPolicy): boolean {
    if (!this.validatePolicy(policy)) {
      return false;
    }

    if (!policy.id || policy.id.trim().length === 0) {
      return false;
    }

    if (policy.createdAt > policy.updatedAt) {
      return false;
    }

    return true;
  }
}
