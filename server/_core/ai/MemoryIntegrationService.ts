/**
 * Memory Integration Service - PoiPoi AI Memory Integration
 * Agent実行とメモリシステムの統合
 */

import { agentMemoryContextManager, type AgentMemoryContext, type ConversationMemory, type LearningRecord } from './AgentMemoryContext';

export class MemoryIntegrationService {
  /**
   * Agent実行前にメモリコンテキストを準備
   */
  prepareMemoryContext(agentType: string, taskId: string, userInput: string): AgentMemoryContext {
    console.log(`[MemoryIntegration] Preparing context for ${agentType} (task: ${taskId})`);
    
    const context = agentMemoryContextManager.getAgentMemoryContext(agentType, taskId);
    
    console.log(`[MemoryIntegration] Found ${context.relatedMemories.length} related memories`);
    console.log(`[MemoryIntegration] Context summary: ${context.contextSummary}`);
    console.log(`[MemoryIntegration] Relevant patterns: ${context.relevantPatterns.join(', ')}`);

    return context;
  }

  /**
   * Agent実行結果をメモリに保存
   */
  saveAgentExecution(
    agentType: string,
    taskId: string,
    userInput: string,
    agentOutput: string,
    importance: 'low' | 'medium' | 'high' = 'medium'
  ): ConversationMemory {
    const memory: ConversationMemory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userInput,
      agentType,
      agentOutput,
      importance,
      tags: this.extractTags(userInput, agentOutput),
      metadata: {
        taskId,
        source: 'agent_execution',
      },
    };

    agentMemoryContextManager.saveConversationMemory(memory);
    console.log(`[MemoryIntegration] Saved memory: ${memory.id}`);

    return memory;
  }

  /**
   * 学習レコードを保存
   */
  saveLearningRecord(
    agentType: string,
    taskId: string,
    input: string,
    output: string,
    success: boolean,
    duration: number,
    provider: string,
    mode: 'real' | 'demo',
    error?: string,
    improvements?: string[]
  ): LearningRecord {
    const record: LearningRecord = {
      id: `learn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      agentType,
      taskId,
      input,
      output,
      success,
      duration,
      provider,
      mode,
      error,
      improvements,
      recommendedPattern: this.generateRecommendedPattern(agentType, success, input, output),
    };

    agentMemoryContextManager.saveLearningRecord(record);
    console.log(`[MemoryIntegration] Saved learning record: ${record.id} (${success ? 'success' : 'failure'})`);

    return record;
  }

  /**
   * Agent別の成功率を取得
   */
  getAgentSuccessRate(agentType: string): number {
    return agentMemoryContextManager.getAgentSuccessRate(agentType);
  }

  /**
   * 最新の学習内容を取得
   */
  getLatestLearning(agentType: string): LearningRecord | undefined {
    return agentMemoryContextManager.getLatestLearning(agentType);
  }

  /**
   * メモリ統計を取得
   */
  getMemoryStatistics(): Record<string, { count: number; successRate: number }> {
    return agentMemoryContextManager.getMemoryStatistics();
  }

  /**
   * 保存されたメモリ数を取得
   */
  getMemoryCount(): number {
    return agentMemoryContextManager.getMemoryCount();
  }

  /**
   * 学習履歴数を取得
   */
  getLearningHistoryCount(): number {
    return agentMemoryContextManager.getLearningHistoryCount();
  }

  /**
   * 全メモリを取得
   */
  getAllMemories(): ConversationMemory[] {
    return agentMemoryContextManager.getAllMemories();
  }

  /**
   * 全学習レコードを取得
   */
  getAllLearningRecords(): LearningRecord[] {
    return agentMemoryContextManager.getAllLearningRecords();
  }

  /**
   * テキストからタグを抽出
   */
  private extractTags(input: string, output: string): string[] {
    const tags: string[] = [];
    const text = (input + ' ' + output).toLowerCase();

    // キーワードベースのタグ抽出
    const keywords = [
      { keyword: 'design', tag: 'design' },
      { keyword: 'implement', tag: 'implementation' },
      { keyword: 'review', tag: 'review' },
      { keyword: 'test', tag: 'testing' },
      { keyword: 'error', tag: 'error' },
      { keyword: 'success', tag: 'success' },
      { keyword: 'pattern', tag: 'pattern' },
      { keyword: 'optimization', tag: 'optimization' },
    ];

    keywords.forEach(({ keyword, tag }) => {
      if (text.includes(keyword)) {
        tags.push(tag);
      }
    });

    return tags;
  }

  /**
   * 推奨パターンを生成
   */
  private generateRecommendedPattern(
    agentType: string,
    success: boolean,
    input: string,
    output: string
  ): string | undefined {
    if (!success) {
      return undefined;
    }

    // 成功した場合、パターンを生成
    const inputLength = input.length;
    const outputLength = output.length;

    if (inputLength < 50 && outputLength > 500) {
      return `${agentType}: Short input -> Detailed output`;
    }

    if (inputLength > 200 && outputLength > 500) {
      return `${agentType}: Comprehensive input -> Comprehensive output`;
    }

    if (inputLength < 50 && outputLength < 200) {
      return `${agentType}: Quick response pattern`;
    }

    return `${agentType}: Standard pattern`;
  }

  /**
   * メモリをクリア（テスト用）
   */
  clearMemories(): void {
    agentMemoryContextManager.clearMemories();
    console.log('[MemoryIntegration] Memories cleared');
  }
}

// グローバルインスタンス
export const memoryIntegrationService = new MemoryIntegrationService();
