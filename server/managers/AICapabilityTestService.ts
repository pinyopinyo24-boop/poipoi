/**
 * AICapabilityTestService - AI機能テストサービス
 */

export type AIManagerType =
  | 'EvolutionAI'
  | 'MemoryIntelligenceAI'
  | 'ReasoningAI'
  | 'ManufacturingIntelligenceAI'
  | 'MultimodalAI'
  | 'ProductionCopilotAI';

export type TestCapability = 'chat' | 'reasoning' | 'learning' | 'manufacturing' | 'multimodal' | 'copilot';

export interface AICapabilityTest {
  testId: string;
  aiManagerType: AIManagerType;
  capability: TestCapability;
  testName: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  errorMessage?: string;
  responseTime?: number;
  qualityScore?: number;
}

export class AICapabilityTestService {
  private static instance: AICapabilityTestService;
  private tests: Map<string, AICapabilityTest> = new Map();
  private testCounter: number = 0;

  private constructor() {}

  static getInstance(): AICapabilityTestService {
    if (!AICapabilityTestService.instance) {
      AICapabilityTestService.instance = new AICapabilityTestService();
    }
    return AICapabilityTestService.instance;
  }

  /**
   * AI機能テスト登録
   */
  registerAITest(aiManagerType: AIManagerType, capability: TestCapability, testName: string): AICapabilityTest {
    const testId = `ai_test_${++this.testCounter}_${Date.now()}`;

    const test: AICapabilityTest = {
      testId,
      aiManagerType,
      capability,
      testName,
      status: 'pending',
    };

    this.tests.set(testId, test);
    return test;
  }

  /**
   * テスト開始
   */
  startAITest(testId: string): AICapabilityTest | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    test.status = 'running';
    test.startedAt = Date.now();
    return test;
  }

  /**
   * テスト成功
   */
  passAITest(testId: string, responseTime: number, qualityScore: number): AICapabilityTest | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    test.status = 'passed';
    test.completedAt = Date.now();
    test.responseTime = responseTime;
    test.qualityScore = qualityScore;

    if (test.startedAt) {
      test.duration = test.completedAt - test.startedAt;
    }

    return test;
  }

  /**
   * テスト失敗
   */
  failAITest(testId: string, errorMessage: string): AICapabilityTest | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    test.status = 'failed';
    test.errorMessage = errorMessage;
    test.completedAt = Date.now();

    if (test.startedAt) {
      test.duration = test.completedAt - test.startedAt;
    }

    return test;
  }

  /**
   * テスト取得
   */
  getAITest(testId: string): AICapabilityTest | null {
    return this.tests.get(testId) || null;
  }

  /**
   * AIマネージャー別テスト取得
   */
  getTestsByAIManager(aiManagerType: AIManagerType): AICapabilityTest[] {
    return Array.from(this.tests.values()).filter((t) => t.aiManagerType === aiManagerType);
  }

  /**
   * 機能別テスト取得
   */
  getTestsByCapability(capability: TestCapability): AICapabilityTest[] {
    return Array.from(this.tests.values()).filter((t) => t.capability === capability);
  }

  /**
   * AI機能テスト統計
   */
  getAITestStatistics(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageResponseTime: number;
    averageQualityScore: number;
    successRate: number;
  } {
    const testArray = Array.from(this.tests.values());
    const passedTests = testArray.filter((t) => t.status === 'passed').length;
    const failedTests = testArray.filter((t) => t.status === 'failed').length;
    const totalTests = testArray.length;

    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let totalQualityScore = 0;
    let qualityScoreCount = 0;

    testArray.forEach((test) => {
      if (test.responseTime !== undefined) {
        totalResponseTime += test.responseTime;
        responseTimeCount++;
      }
      if (test.qualityScore !== undefined) {
        totalQualityScore += test.qualityScore;
        qualityScoreCount++;
      }
    });

    const averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;
    const averageQualityScore = qualityScoreCount > 0 ? totalQualityScore / qualityScoreCount : 0;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      averageResponseTime,
      averageQualityScore,
      successRate,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.tests.clear();
  }
}

export const aiCapabilityTestService = AICapabilityTestService.getInstance();
export default aiCapabilityTestService;
