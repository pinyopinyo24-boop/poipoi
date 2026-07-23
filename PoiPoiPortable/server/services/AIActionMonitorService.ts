/**
 * AIActionMonitorService - AI操作監視
 */

import type { AIAction } from '../core/GovernanceAIManager';

export class AIActionMonitorService {
  private monitoredActions: Map<string, AIAction> = new Map();
  private blockedActions: Array<{
    actionId: string;
    reason: string;
    timestamp: number;
  }> = [];

  /**
   * AI操作を監視
   */
  async monitorAction(action: AIAction): Promise<boolean> {
    const isAllowed = await this.validateAction(action);

    if (!isAllowed) {
      this.blockedActions.push({
        actionId: action.id,
        reason: 'Policy violation',
        timestamp: Date.now(),
      });
      return false;
    }

    this.monitoredActions.set(action.id, action);
    return true;
  }

  /**
   * 行動を検証
   */
  private async validateAction(action: AIAction): Promise<boolean> {
    // 基本的な検証
    if (!action.agentId || !action.actionType) {
      return false;
    }

    // 危険な操作タイプをチェック
    const dangerousActions = ['delete_all', 'system_shutdown', 'security_bypass'];
    if (dangerousActions.includes(action.actionType)) {
      return false;
    }

    return true;
  }

  /**
   * 監視対象の操作を取得
   */
  async getMonitoredAction(actionId: string): Promise<AIAction | null> {
    return this.monitoredActions.get(actionId) || null;
  }

  /**
   * エージェントの操作を取得
   */
  async getAgentActions(agentId: string): Promise<AIAction[]> {
    return Array.from(this.monitoredActions.values()).filter((a) => a.agentId === agentId);
  }

  /**
   * ブロックされた操作を取得
   */
  async getBlockedActions(): Promise<Array<{
    actionId: string;
    reason: string;
    timestamp: number;
  }>> {
    return this.blockedActions;
  }

  /**
   * 操作パターンを分析
   */
  async analyzeActionPatterns(agentId: string): Promise<{
    totalActions: number;
    successRate: number;
    commonActions: string[];
    anomalies: string[];
  }> {
    const actions = await this.getAgentActions(agentId);
    const actionTypes = actions.map((a) => a.actionType);
    const typeCount = new Map<string, number>();

    for (const type of actionTypes) {
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    }

    const commonActions = Array.from(typeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((e) => e[0]);

    const anomalies = this.detectAnomalies(actions);

    return {
      totalActions: actions.length,
      successRate: actions.filter((a) => a.status === 'executed').length / actions.length || 0,
      commonActions,
      anomalies,
    };
  }

  /**
   * 異常を検出
   */
  private detectAnomalies(actions: AIAction[]): string[] {
    const anomalies: string[] = [];

    if (actions.length > 100) {
      anomalies.push('high_action_frequency');
    }

    const failedCount = actions.filter((a) => a.status === 'rejected').length;
    if (failedCount > actions.length * 0.3) {
      anomalies.push('high_rejection_rate');
    }

    return anomalies;
  }

  /**
   * 操作統計を取得
   */
  async getActionStats(): Promise<{
    totalMonitored: number;
    totalBlocked: number;
    blockRate: number;
  }> {
    const total = this.monitoredActions.size + this.blockedActions.length;
    const blocked = this.blockedActions.length;

    return {
      totalMonitored: this.monitoredActions.size,
      totalBlocked: blocked,
      blockRate: total > 0 ? blocked / total : 0,
    };
  }

  /**
   * 監視ログをクリア
   */
  async clearOldLogs(olderThanMs: number): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    const initialSize = this.blockedActions.length;

    this.blockedActions = this.blockedActions.filter((a) => a.timestamp > cutoff);

    return initialSize - this.blockedActions.length;
  }
}
