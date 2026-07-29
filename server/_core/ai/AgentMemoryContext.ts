/**
 * Agent Memory Context - PoiPoi AI Memory Integration
 * Agent実行時のメモリコンテキスト管理
 */

export interface ConversationMemory {
  id: string;
  timestamp: string;
  userInput: string;
  agentType: string;
  agentOutput: string;
  importance: 'low' | 'medium' | 'high';
  tags: string[];
  metadata: Record<string, any>;
}

export interface AgentMemoryContext {
  agentType: string;
  taskId: string;
  relatedMemories: ConversationMemory[];
  contextSummary: string;
  relevantPatterns: string[];
}

export interface LearningRecord {
  id: string;
  timestamp: string;
  agentType: string;
  taskId: string;
  input: string;
  output: string;
  success: boolean;
  duration: number;
  provider: string;
  mode: 'real' | 'demo';
  error?: string;
  improvements?: string[];
  recommendedPattern?: string;
}

export class AgentMemoryContextManager {
  private conversationMemories: ConversationMemory[] = [];
  private learningRecords: LearningRecord[] = [];
  private memoryIndex: Map<string, ConversationMemory[]> = new Map();

  /**
   * 会話メモリを保存
   */
  saveConversationMemory(memory: ConversationMemory): void {
    this.conversationMemories.push(memory);
    
    // インデックスに追加
    if (!this.memoryIndex.has(memory.agentType)) {
      this.memoryIndex.set(memory.agentType, []);
    }
    this.memoryIndex.get(memory.agentType)!.push(memory);
  }

  /**
   * Agent実行時のメモリコンテキストを取得
   */
  getAgentMemoryContext(agentType: string, taskId: string): AgentMemoryContext {
    // 関連メモリを検索
    const relatedMemories = this.searchRelatedMemories(agentType, taskId);
    
    // コンテキストサマリーを生成
    const contextSummary = this.generateContextSummary(relatedMemories);
    
    // 推奨パターンを抽出
    const relevantPatterns = this.extractRelevantPatterns(agentType, relatedMemories);

    return {
      agentType,
      taskId,
      relatedMemories,
      contextSummary,
      relevantPatterns,
    };
  }

  /**
   * 関連メモリを検索
   */
  private searchRelatedMemories(agentType: string, taskId: string): ConversationMemory[] {
    const agentMemories = this.memoryIndex.get(agentType) || [];
    
    // 最新のメモリから関連するものを検索（最大10件）
    return agentMemories
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)
      .filter(m => m.importance !== 'low');
  }

  /**
   * コンテキストサマリーを生成
   */
  private generateContextSummary(memories: ConversationMemory[]): string {
    if (memories.length === 0) {
      return 'No previous context available';
    }

    const highImportance = memories.filter(m => m.importance === 'high');
    const summary = highImportance
      .map(m => `[${m.agentType}] ${m.userInput.substring(0, 50)}...`)
      .join('; ');

    return summary || 'Previous context: ' + memories.length + ' related memories';
  }

  /**
   * 推奨パターンを抽出
   */
  private extractRelevantPatterns(agentType: string, memories: ConversationMemory[]): string[] {
    const patterns: string[] = [];
    
    // 成功した学習レコードから推奨パターンを抽出
    const successRecords = this.learningRecords
      .filter(r => r.agentType === agentType && r.success)
      .slice(-5);

    successRecords.forEach(record => {
      if (record.recommendedPattern) {
        patterns.push(record.recommendedPattern);
      }
    });

    // 重複を除去
    const uniquePatterns: string[] = [];
    const seen = new Set<string>();
    for (const pattern of patterns) {
      if (!seen.has(pattern)) {
        seen.add(pattern);
        uniquePatterns.push(pattern);
      }
    }
    return uniquePatterns;
  }

  /**
   * 学習レコードを保存
   */
  saveLearningRecord(record: LearningRecord): void {
    this.learningRecords.push(record);
  }

  /**
   * Agent別の成功率を取得
   */
  getAgentSuccessRate(agentType: string): number {
    const records = this.learningRecords.filter(r => r.agentType === agentType);
    if (records.length === 0) return 0;

    const successCount = records.filter(r => r.success).length;
    return (successCount / records.length) * 100;
  }

  /**
   * 最新の学習内容を取得
   */
  getLatestLearning(agentType: string): LearningRecord | undefined {
    const records = this.learningRecords
      .filter(r => r.agentType === agentType)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return records[0];
  }

  /**
   * 保存されたメモリ数を取得
   */
  getMemoryCount(): number {
    return this.conversationMemories.length;
  }

  /**
   * 学習履歴数を取得
   */
  getLearningHistoryCount(): number {
    return this.learningRecords.length;
  }

  /**
   * Agent別のメモリ統計を取得
   */
  getMemoryStatistics(): Record<string, { count: number; successRate: number }> {
    const stats: Record<string, { count: number; successRate: number }> = {};

    this.memoryIndex.forEach((memories, agentType) => {
      stats[agentType] = {
        count: memories.length,
        successRate: this.getAgentSuccessRate(agentType),
      };
    });

    return stats;
  }

  /**
   * 全メモリを取得
   */
  getAllMemories(): ConversationMemory[] {
    return [...this.conversationMemories];
  }

  /**
   * 全学習レコードを取得
   */
  getAllLearningRecords(): LearningRecord[] {
    return [...this.learningRecords];
  }

  /**
   * メモリをクリア（テスト用）
   */
  clearMemories(): void {
    this.conversationMemories = [];
    this.learningRecords = [];
    this.memoryIndex.clear();
  }
}

// グローバルインスタンス
export const agentMemoryContextManager = new AgentMemoryContextManager();
