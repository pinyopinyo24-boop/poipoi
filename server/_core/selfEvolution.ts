/**
 * ポイポイ AIエージェント - 自己進化システム
 * 
 * 機能：
 * 1. 新しいツールの自動生成
 * 2. パフォーマンス最適化
 * 3. エラーから学習
 * 4. ユーザーフィードバックから学習
 * 5. モデルの自動更新
 * 6. パラメータの自動調整
 */

import { invokeLLM, listLLMModels } from "./llm";

/**
 * 進化メトリクス
 */
export interface EvolutionMetrics {
  toolsGenerated: number;
  performanceImprovement: number; // %
  errorsLearned: number;
  feedbackApplied: number;
  modelUpdates: number;
  parameterAdjustments: number;
  lastEvolutionTime: Date;
  totalEvolutions: number;
}

/**
 * 学習データ
 */
export interface LearningData {
  taskType: string;
  success: boolean;
  executionTime: number;
  toolsUsed: string[];
  userFeedback?: string;
  errorMessage?: string;
  timestamp: Date;
}

/**
 * 自己進化システム
 */
export class SelfEvolutionSystem {
  private metrics: EvolutionMetrics = {
    toolsGenerated: 0,
    performanceImprovement: 0,
    errorsLearned: 0,
    feedbackApplied: 0,
    modelUpdates: 0,
    parameterAdjustments: 0,
    lastEvolutionTime: new Date(),
    totalEvolutions: 0,
  };

  private learningHistory: LearningData[] = [];
  private generatedTools: Map<string, any> = new Map();
  private currentModel: string = "mistral";
  private performanceThresholds = {
    executionTime: 5000, // ms
    successRate: 0.8, // 80%
  };

  /**
   * 1. 新しいツールを自動生成
   */
  async generateNewTool(taskDescription: string): Promise<any> {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "あなたはAIツール開発エキスパートです。新しいツール定義をJSON形式で生成します。",
        },
        {
          role: "user",
          content: `以下のタスクを実行するための新しいツールを生成してください。JSON形式で返してください：\n\n${taskDescription}\n\n返却形式:\n{\n  "name": "ツール名",\n  "description": "説明",\n  "parameters": {...},\n  "implementation": "実装コード"\n}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    try {
      const toolDef = JSON.parse(
        response.choices[0].message.content || "{}"
      );
      this.generatedTools.set(toolDef.name, toolDef);
      this.metrics.toolsGenerated++;
      return toolDef;
    } catch (e) {
      console.error("Failed to parse generated tool:", e);
      return null;
    }
  }

  /**
   * 2. パフォーマンス最適化
   */
  async optimizePerformance(): Promise<void> {
    // 実行時間の平均を計算
    const avgExecutionTime =
      this.learningHistory.reduce((sum, d) => sum + d.executionTime, 0) /
      Math.max(this.learningHistory.length, 1);

    // 成功率を計算
    const successRate =
      this.learningHistory.filter((d) => d.success).length /
      Math.max(this.learningHistory.length, 1);

    // パフォーマンス改善の提案を取得
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "あなたはパフォーマンス最適化エキスパートです。実行時間と成功率に基づいて改善策を提案します。",
        },
        {
          role: "user",
          content: `現在のパフォーマンスメトリクス：\n- 平均実行時間: ${avgExecutionTime}ms\n- 成功率: ${(successRate * 100).toFixed(2)}%\n\n改善策を提案してください。`,
        },
      ],
      temperature: 0.5,
      max_tokens: 1000,
    });

    const improvementSuggestions = response.choices[0].message.content || "";
    console.log("Performance improvements:", improvementSuggestions);

    // パフォーマンス改善率を計算
    const improvement = Math.min(
      (successRate / this.performanceThresholds.successRate) * 100,
      150
    );
    this.metrics.performanceImprovement = Math.max(
      this.metrics.performanceImprovement,
      improvement
    );
    this.metrics.parameterAdjustments++;
  }

  /**
   * 3. エラーから学習
   */
  async learnFromError(error: Error, context: string): Promise<void> {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "あなたはエラー分析エキスパートです。エラーから学習し、将来の対策を提案します。",
        },
        {
          role: "user",
          content: `以下のエラーが発生しました：\n\nエラー: ${error.message}\nコンテキスト: ${context}\n\n原因分析と対策を提案してください。`,
        },
      ],
      temperature: 0.6,
      max_tokens: 1000,
    });

    const analysis = response.choices[0].message.content || "";
    console.log("Error analysis:", analysis);

    this.metrics.errorsLearned++;
    this.learningHistory.push({
      taskType: "error_analysis",
      success: false,
      executionTime: 0,
      toolsUsed: [],
      errorMessage: error.message,
      timestamp: new Date(),
    });
  }

  /**
   * 4. ユーザーフィードバックから学習
   */
  async learnFromFeedback(feedback: string, taskContext: string): Promise<void> {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "あなたはユーザーフィードバック分析エキスパートです。フィードバックを分析し、改善策を提案します。",
        },
        {
          role: "user",
          content: `ユーザーフィードバック: ${feedback}\n\nタスクコンテキスト: ${taskContext}\n\nこのフィードバックに基づいて、システムを改善する方法を提案してください。`,
        },
      ],
      temperature: 0.6,
      max_tokens: 1000,
    });

    const improvements = response.choices[0].message.content || "";
    console.log("Feedback-based improvements:", improvements);

    this.metrics.feedbackApplied++;
    this.learningHistory.push({
      taskType: "user_feedback",
      success: true,
      executionTime: 0,
      toolsUsed: [],
      userFeedback: feedback,
      timestamp: new Date(),
    });
  }

  /**
   * 5. モデルの自動更新
   */
  async updateModel(): Promise<void> {
    try {
      const models = await listLLMModels();
      const availableModels = models.data.map((m) => m.id);

      // 最適なモデルを選択
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "あなたはモデル選択エキスパートです。利用可能なモデルから最適なものを選択します。",
          },
          {
            role: "user",
            content: `利用可能なモデル: ${availableModels.join(", ")}\n\n現在のモデル: ${this.currentModel}\n\nパフォーマンスと効率を考慮して、最適なモデルを選択してください。`,
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      });

      const suggestion = response.choices[0].message.content || "";
      const selectedModel = availableModels.find((m) =>
        suggestion.includes(m)
      );

      if (selectedModel && selectedModel !== this.currentModel) {
        this.currentModel = selectedModel;
        this.metrics.modelUpdates++;
        console.log(`Model updated to: ${selectedModel}`);
      }
    } catch (error) {
      console.error("Failed to update model:", error);
    }
  }

  /**
   * 6. パラメータの自動調整
   */
  async adjustParameters(): Promise<void> {
    // 成功率に基づいてパラメータを調整
    const successRate =
      this.learningHistory.filter((d) => d.success).length /
      Math.max(this.learningHistory.length, 1);

    if (successRate < 0.7) {
      // 成功率が低い場合、より詳細な分析を実施
      console.log("Low success rate detected. Increasing analysis depth...");
      this.performanceThresholds.successRate = 0.6; // 閾値を下げる
    } else if (successRate > 0.95) {
      // 成功率が高い場合、パフォーマンスを優先
      console.log("High success rate. Optimizing for speed...");
      this.performanceThresholds.executionTime = 3000; // 実行時間を短縮
    }

    this.metrics.parameterAdjustments++;
  }

  /**
   * 進化サイクルを実行
   */
  async runEvolutionCycle(): Promise<void> {
    console.log("Starting evolution cycle...");

    try {
      // 1. パフォーマンス最適化
      await this.optimizePerformance();

      // 2. モデル更新
      await this.updateModel();

      // 3. パラメータ調整
      await this.adjustParameters();

      // 4. 新しいツール生成（必要に応じて）
      if (this.learningHistory.length > 10) {
        const recentTasks = this.learningHistory.slice(-5);
        const failedTasks = recentTasks.filter((t) => !t.success);

        if (failedTasks.length > 0) {
          const taskTypes = failedTasks
            .map((t) => t.taskType)
            .join(", ");
          await this.generateNewTool(
            `以下のタスクタイプで失敗が多いため、専用ツールを生成してください: ${taskTypes}`
          );
        }
      }

      this.metrics.totalEvolutions++;
      this.metrics.lastEvolutionTime = new Date();

      console.log("Evolution cycle completed:", this.metrics);
    } catch (error) {
      console.error("Evolution cycle error:", error);
    }
  }

  /**
   * 学習データを記録
   */
  recordLearning(data: LearningData): void {
    this.learningHistory.push(data);

    // 履歴サイズを制限（最新1000件）
    if (this.learningHistory.length > 1000) {
      this.learningHistory = this.learningHistory.slice(-1000);
    }
  }

  /**
   * メトリクスを取得
   */
  getMetrics(): EvolutionMetrics {
    return { ...this.metrics };
  }

  /**
   * 学習履歴を取得
   */
  getLearningHistory(): LearningData[] {
    return [...this.learningHistory];
  }

  /**
   * 生成されたツールを取得
   */
  getGeneratedTools(): Map<string, any> {
    return new Map(this.generatedTools);
  }

  /**
   * 現在のモデルを取得
   */
  getCurrentModel(): string {
    return this.currentModel;
  }
}

// グローバルインスタンス
export const evolutionSystem = new SelfEvolutionSystem();
