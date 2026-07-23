/**
 * AgentCommunicationService - AI Manager間通信
 */

export interface CommunicationMessage {
  id: string;
  fromAgent: string;
  toAgent: string;
  content: string;
  timestamp: number;
  status: 'sent' | 'received' | 'processed';
}

export class AgentCommunicationService {
  private messages: Map<string, CommunicationMessage> = new Map();
  private messageQueue: CommunicationMessage[] = [];

  /**
   * エージェントと通信
   */
  async communicateWithAgent(agentId: string, message: string): Promise<Record<string, unknown>> {
    const communicationMessage: CommunicationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromAgent: 'coordinator',
      toAgent: agentId,
      content: message,
      timestamp: Date.now(),
      status: 'sent',
    };

    this.messages.set(communicationMessage.id, communicationMessage);
    this.messageQueue.push(communicationMessage);

    // エージェントからの応答をシミュレート
    const response = await this.simulateAgentResponse(agentId, message);

    communicationMessage.status = 'processed';

    return response;
  }

  /**
   * エージェント応答をシミュレート
   */
  private async simulateAgentResponse(
    agentId: string,
    message: string
  ): Promise<Record<string, unknown>> {
    // エージェントタイプに基づいた応答を生成
    const responses: Record<string, Record<string, unknown>> = {
      reasoning: {
        type: 'reasoning_response',
        analysis: `Analysis for: ${message}`,
        confidence: 0.85,
        recommendations: ['Recommendation 1', 'Recommendation 2'],
      },
      evolution: {
        type: 'evolution_response',
        improvements: ['Improvement 1', 'Improvement 2'],
        confidence: 0.8,
        version: '2.0',
      },
      memory: {
        type: 'memory_response',
        retrievedMemories: ['Memory 1', 'Memory 2'],
        relevance: 0.75,
        count: 2,
      },
      agent: {
        type: 'agent_response',
        actions: ['Action 1', 'Action 2'],
        confidence: 0.9,
        status: 'completed',
      },
      automation: {
        type: 'automation_response',
        automatedTasks: ['Task 1', 'Task 2'],
        efficiency: 0.88,
        status: 'executed',
      },
    };

    return responses[agentId] || { type: 'unknown_response', confidence: 0.5 };
  }

  /**
   * メッセージ履歴を取得
   */
  async getMessageHistory(agentId: string): Promise<CommunicationMessage[]> {
    return Array.from(this.messages.values()).filter(
      (m) => m.fromAgent === agentId || m.toAgent === agentId
    );
  }

  /**
   * メッセージキューをクリア
   */
  async clearMessageQueue(): Promise<void> {
    this.messageQueue = [];
  }

  /**
   * ペンディングメッセージを取得
   */
  async getPendingMessages(): Promise<CommunicationMessage[]> {
    return this.messageQueue.filter((m) => m.status === 'sent');
  }

  /**
   * メッセージを削除
   */
  async deleteMessage(messageId: string): Promise<void> {
    this.messages.delete(messageId);
    this.messageQueue = this.messageQueue.filter((m) => m.id !== messageId);
  }

  /**
   * 通信統計を取得
   */
  async getCommunicationStats(): Promise<Record<string, unknown>> {
    const totalMessages = this.messages.size;
    const processedMessages = Array.from(this.messages.values()).filter(
      (m) => m.status === 'processed'
    ).length;

    return {
      totalMessages,
      processedMessages,
      pendingMessages: this.messageQueue.length,
      successRate: totalMessages > 0 ? processedMessages / totalMessages : 0,
    };
  }
}
