/**
 * Minimal Evolution Engine for PoiPoi AI
 * Analyzes app state and suggests improvements
 */

export interface AppState {
  errorCount: number;
  messageCount?: number;
  performanceScore?: number;
  userFeedback?: string[];
  [key: string]: any;
}

export interface Proposal {
  type: "fix" | "optimize" | "feature" | "none";
  target: string;
  message: string;
  priority?: "high" | "medium" | "low";
  action?: string;
}

export interface LearningData {
  proposal: Proposal;
  result: "success" | "failed" | "pending";
  timestamp: number;
  metadata?: Record<string, any>;
}

class EvolutionEngine {
  private history: LearningData[] = [];
  private maxHistorySize = 1000;

  /**
   * Analyze app state and suggest improvements
   */
  analyze(appState: AppState): Proposal {
    // Rule 1: High error count
    if (appState.errorCount > 5) {
      return {
        type: "fix",
        target: "error_handling",
        message: `エラーが${appState.errorCount}件発生しています。エラーハンドリングを改善します。`,
        priority: "high",
        action: "improve_error_handling",
      };
    }

    // Rule 2: Performance optimization
    if (appState.performanceScore !== undefined && appState.performanceScore < 50) {
      return {
        type: "optimize",
        target: "performance",
        message: "パフォーマンススコアが低いため、最適化を提案します。",
        priority: "high",
        action: "optimize_performance",
      };
    }

    // Rule 3: Message volume analysis
    if (appState.messageCount !== undefined && appState.messageCount > 100) {
      return {
        type: "optimize",
        target: "message_handling",
        message: "メッセージが多く蓄積されています。キャッシング機構を追加します。",
        priority: "medium",
        action: "add_caching",
      };
    }

    // Rule 4: User feedback analysis
    if (appState.userFeedback && appState.userFeedback.length > 0) {
      const feedbackKeywords = appState.userFeedback.join(" ").toLowerCase();
      
      if (feedbackKeywords.includes("遅い") || feedbackKeywords.includes("遅い")) {
        return {
          type: "optimize",
          target: "speed",
          message: "ユーザーが速度の問題を報告しています。最適化を実施します。",
          priority: "high",
          action: "optimize_speed",
        };
      }

      if (feedbackKeywords.includes("使いにくい") || feedbackKeywords.includes("ui")) {
        return {
          type: "feature",
          target: "ui",
          message: "UI/UX の改善が必要です。新しいインターフェースを提案します。",
          priority: "medium",
          action: "improve_ui",
        };
      }
    }

    // No improvements needed
    return {
      type: "none",
      target: "none",
      message: "改善点は見つかりませんでした。",
    };
  }

  /**
   * Approve a proposal and add to history
   */
  approve(proposal: Proposal, metadata?: Record<string, any>): void {
    const learningData: LearningData = {
      proposal,
      result: "pending",
      timestamp: Date.now(),
      metadata,
    };

    this.history.push(learningData);

    // Keep history size manageable
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }

    console.log(`✅ 改善提案を承認しました: ${proposal.message}`);
  }

  /**
   * Record learning result
   */
  learn(proposalIndex: number, result: "success" | "failed", metadata?: Record<string, any>): void {
    if (proposalIndex >= 0 && proposalIndex < this.history.length) {
      this.history[proposalIndex].result = result;
      if (metadata) {
        this.history[proposalIndex].metadata = {
          ...this.history[proposalIndex].metadata,
          ...metadata,
        };
      }
      console.log(`📚 学習: ${result === "success" ? "✅ 成功" : "❌ 失敗"}`);
    }
  }

  /**
   * Get learning history
   */
  getHistory(): LearningData[] {
    return [...this.history];
  }

  /**
   * Get statistics
   */
  getStats() {
    const successful = this.history.filter((d) => d.result === "success").length;
    const failed = this.history.filter((d) => d.result === "failed").length;
    const pending = this.history.filter((d) => d.result === "pending").length;

    return {
      total: this.history.length,
      successful,
      failed,
      pending,
      successRate: this.history.length > 0 ? (successful / this.history.length) * 100 : 0,
    };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
    console.log("📋 改善履歴をクリアしました");
  }
}

export default EvolutionEngine;
