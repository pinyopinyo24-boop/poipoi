/**
 * Evolution Engine - PoiPoi AI Core
 * 自動改善提案システム
 */

export interface AppState {
  errorCount: number;
  messageCount: number;
  performanceScore: number;
}

export interface Proposal {
  type: "fix" | "optimize" | "feature" | "none";
  target?: string;
  message: string;
  action?: string;
}

export interface Stats {
  successful: number;
  failed: number;
  successRate: number;
  total: number;
}

class EvolutionEngine {
  private successful: number = 0;
  private failed: number = 0;
  private history: { type: string; timestamp: Date }[] = [];

  analyze(appState: AppState): Proposal {
    if (appState.errorCount > 5) {
      return {
        type: "fix",
        target: "error",
        message: "エラーが多いため修正を提案します。",
        action: "error_handling",
      };
    }

    if (appState.performanceScore < 50) {
      return {
        type: "optimize",
        target: "performance",
        message: "パフォーマンス最適化が必要です。",
        action: "optimization",
      };
    }

    if (appState.messageCount > 100) {
      return {
        type: "feature",
        target: "feature",
        message: "新機能追加を検討してください。",
        action: "feature_add",
      };
    }

    return {
      type: "none",
      message: "改善点は見つかりませんでした。",
    };
  }

  approve(proposal: Proposal): void {
    this.history.push({
      type: proposal.type,
      timestamp: new Date(),
    });
    console.log("✅ 改善履歴に保存しました");
  }

  learn(id: number, result: "success" | "failed", metadata?: any): void {
    if (result === "success") {
      this.successful++;
    } else {
      this.failed++;
    }
    console.log(`📚 学習: ${result}`, metadata);
  }

  getStats(): Stats {
    const total = this.successful + this.failed;
    return {
      successful: this.successful,
      failed: this.failed,
      successRate: total === 0 ? 0 : (this.successful / total) * 100,
      total,
    };
  }

  reset(): void {
    this.successful = 0;
    this.failed = 0;
    this.history = [];
  }
}

export default EvolutionEngine;
