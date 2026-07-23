/**
 * CollaborationService - AI協調ワークフロー管理
 */

import type { AIAgent } from '../core/AICollaborationManager';

export interface CollaborationWorkflow {
  id: string;
  agents: AIAgent[];
  steps: string[];
  currentStep: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export class CollaborationService {
  private workflows: Map<string, CollaborationWorkflow> = new Map();

  /**
   * ワークフローを作成
   */
  async createWorkflow(agents: AIAgent[], steps: string[]): Promise<CollaborationWorkflow> {
    const workflow: CollaborationWorkflow = {
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agents,
      steps,
      currentStep: 0,
      status: 'pending',
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  /**
   * ワークフローを進める
   */
  async advanceWorkflow(workflowId: string): Promise<CollaborationWorkflow | null> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;

    workflow.currentStep++;
    if (workflow.currentStep >= workflow.steps.length) {
      workflow.status = 'completed';
    } else {
      workflow.status = 'in_progress';
    }

    return workflow;
  }

  /**
   * ワークフロー状態を取得
   */
  async getWorkflowStatus(workflowId: string): Promise<CollaborationWorkflow | null> {
    return this.workflows.get(workflowId) || null;
  }

  /**
   * AI役割を更新
   */
  async updateAgentRole(agent: AIAgent): Promise<void> {
    // 役割情報を更新
    const valuesIterator = this.workflows.values();
    let item = valuesIterator.next();
    while (!item.done) {
      const workflow = item.value;
      const existingAgent = workflow.agents.find((a: AIAgent) => a.id === agent.id);
      if (existingAgent) {
        existingAgent.capabilities = agent.capabilities;
        existingAgent.status = agent.status;
      }
      item = valuesIterator.next();
    }
  }

  /**
   * ワークフロー統計を取得
   */
  async getWorkflowStats(): Promise<Record<string, unknown>> {
    const workflows: CollaborationWorkflow[] = [];
    const valuesIterator = this.workflows.values();
    let item = valuesIterator.next();
    while (!item.done) {
      workflows.push(item.value);
      item = valuesIterator.next();
    }
    const completed = workflows.filter((w) => w.status === 'completed').length;
    const failed = workflows.filter((w) => w.status === 'failed').length;
    const inProgress = workflows.filter((w) => w.status === 'in_progress').length;

    return {
      totalWorkflows: workflows.length,
      completedWorkflows: completed,
      failedWorkflows: failed,
      inProgressWorkflows: inProgress,
      successRate: workflows.length > 0 ? completed / workflows.length : 0,
    };
  }

  /**
   * ワークフローを削除
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    this.workflows.delete(workflowId);
  }

  /**
   * 全ワークフローを取得
   */
  async getAllWorkflows(): Promise<CollaborationWorkflow[]> {
    const workflows: CollaborationWorkflow[] = [];
    const valuesIterator = this.workflows.values();
    let item = valuesIterator.next();
    while (!item.done) {
      workflows.push(item.value);
      item = valuesIterator.next();
    }
    return workflows;
  }
}
