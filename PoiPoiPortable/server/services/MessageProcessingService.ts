/**
 * MessageProcessingService - メッセージ処理サービス
 */

export interface ProcessedResult {
  response: string;
  managersUsed: string[];
  reasoning: string;
  confidence: number;
  requiresReasoning: boolean;
  isManufacturingRelated: boolean;
  manufacturingData?: any;
}

export class MessageProcessingService {
  constructor(
    private reasoningManager: any,
    private agentManager: any
  ) {}

  /**
   * メッセージを処理
   */
  async processMessage(message: string, context: any): Promise<ProcessedResult> {
    const managersUsed: string[] = [];
    let reasoning = '';
    let confidence = 0.5;
    let requiresReasoning = false;
    let isManufacturingRelated = false;
    let manufacturingData: any = null;

    // 製造業関連かチェック
    if (this.isManufacturingRelated(message)) {
      isManufacturingRelated = true;
      managersUsed.push('ManufacturingIntelligenceAIManager');
      confidence = 0.8;
    }

    // 複雑な推論が必要かチェック
    if (this.requiresComplexReasoning(message)) {
      requiresReasoning = true;
      managersUsed.push('ReasoningAIManager');
      reasoning = await this.performReasoning(message, context);
      confidence = 0.85;
    }

    // エージェントが必要かチェック
    if (this.requiresAgent(message)) {
      managersUsed.push('AgentAIManager');
      confidence = Math.max(confidence, 0.75);
    }

    return {
      response: this.generateResponse(message, reasoning),
      managersUsed,
      reasoning,
      confidence,
      requiresReasoning,
      isManufacturingRelated,
      manufacturingData,
    };
  }

  /**
   * 製造業関連かチェック
   */
  private isManufacturingRelated(message: string): boolean {
    const manufacturingKeywords = [
      '生産',
      '製造',
      '工程',
      '稼働率',
      '品質',
      '不良',
      '原価',
      '工数',
    ];
    const lowerMessage = message.toLowerCase();
    return manufacturingKeywords.some((keyword) =>
      lowerMessage.includes(keyword)
    );
  }

  /**
   * 複雑な推論が必要かチェック
   */
  private requiresComplexReasoning(message: string): boolean {
    const complexKeywords = [
      '理由',
      'なぜ',
      'どうして',
      '分析',
      '判断',
      '比較',
      '評価',
    ];
    const lowerMessage = message.toLowerCase();
    return complexKeywords.some((keyword) =>
      lowerMessage.includes(keyword)
    );
  }

  /**
   * エージェントが必要かチェック
   */
  private requiresAgent(message: string): boolean {
    const agentKeywords = ['実行', '作成', '生成', '提案', '改善'];
    const lowerMessage = message.toLowerCase();
    return agentKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  /**
   * 推論を実行
   */
  private async performReasoning(message: string, context: any): Promise<string> {
    return `分析結果: ${message}に対する推論を実行しました。`;
  }

  /**
   * 応答を生成
   */
  private generateResponse(message: string, reasoning: string): string {
    if (reasoning) {
      return reasoning;
    }
    return `ご質問ありがとうございます。${message}についてお答えします。`;
  }
}
