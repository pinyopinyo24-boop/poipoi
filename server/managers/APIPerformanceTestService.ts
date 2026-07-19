/**
 * APIPerformanceTestService - APIパフォーマンステストサービス
 */

export type APIEndpoint = 'chat' | 'auth' | 'sync' | 'backup' | 'analytics';
export type PerformanceStatus = 'excellent' | 'good' | 'acceptable' | 'poor';

export interface APIPerformanceTest {
  testId: string;
  deviceId: string;
  endpoint: APIEndpoint;
  status: PerformanceStatus;
  startedAt: number;
  completedAt?: number;
  responseTime?: number;
  throughput?: number;
  errorRate?: number;
  successCount?: number;
  failureCount?: number;
}

export class APIPerformanceTestService {
  private static instance: APIPerformanceTestService;
  private tests: Map<string, APIPerformanceTest> = new Map();
  private testCounter: number = 0;

  private constructor() {}

  static getInstance(): APIPerformanceTestService {
    if (!APIPerformanceTestService.instance) {
      APIPerformanceTestService.instance = new APIPerformanceTestService();
    }
    return APIPerformanceTestService.instance;
  }

  /**
   * APIパフォーマンステスト開始
   */
  startTest(deviceId: string, endpoint: APIEndpoint): APIPerformanceTest {
    const testId = `api_perf_test_${++this.testCounter}_${Date.now()}`;

    const test: APIPerformanceTest = {
      testId,
      deviceId,
      endpoint,
      status: 'excellent',
      startedAt: Date.now(),
      successCount: 0,
      failureCount: 0,
    };

    this.tests.set(testId, test);
    return test;
  }

  /**
   * APIパフォーマンステスト完了
   */
  completeTest(
    testId: string,
    responseTime: number,
    throughput: number,
    errorRate: number,
    successCount: number,
    failureCount: number
  ): APIPerformanceTest | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    test.responseTime = responseTime;
    test.throughput = throughput;
    test.errorRate = errorRate;
    test.successCount = successCount;
    test.failureCount = failureCount;
    test.completedAt = Date.now();

    // ステータス判定
    if (responseTime < 200 && errorRate < 1) {
      test.status = 'excellent';
    } else if (responseTime < 500 && errorRate < 5) {
      test.status = 'good';
    } else if (responseTime < 1000 && errorRate < 10) {
      test.status = 'acceptable';
    } else {
      test.status = 'poor';
    }

    return test;
  }

  /**
   * テスト取得
   */
  getTest(testId: string): APIPerformanceTest | null {
    return this.tests.get(testId) || null;
  }

  /**
   * デバイス別テスト取得
   */
  getTestsByDevice(deviceId: string): APIPerformanceTest[] {
    return Array.from(this.tests.values()).filter((t) => t.deviceId === deviceId);
  }

  /**
   * エンドポイント別テスト取得
   */
  getTestsByEndpoint(endpoint: APIEndpoint): APIPerformanceTest[] {
    return Array.from(this.tests.values()).filter((t) => t.endpoint === endpoint);
  }

  /**
   * 優秀なテスト取得
   */
  getExcellentTests(): APIPerformanceTest[] {
    return Array.from(this.tests.values()).filter((t) => t.status === 'excellent');
  }

  /**
   * 不良なテスト取得
   */
  getPoorTests(): APIPerformanceTest[] {
    return Array.from(this.tests.values()).filter((t) => t.status === 'poor');
  }

  /**
   * API統計
   */
  getAPIStatistics(): {
    totalTests: number;
    excellentTests: number;
    goodTests: number;
    acceptableTests: number;
    poorTests: number;
    averageResponseTime: number;
    averageThroughput: number;
    averageErrorRate: number;
    totalSuccesses: number;
    totalFailures: number;
  } {
    const testArray = Array.from(this.tests.values());
    const completedTests = testArray.filter((t) => t.completedAt);

    let totalResponseTime = 0;
    let totalThroughput = 0;
    let totalErrorRate = 0;
    let totalSuccesses = 0;
    let totalFailures = 0;

    completedTests.forEach((t) => {
      totalResponseTime += t.responseTime || 0;
      totalThroughput += t.throughput || 0;
      totalErrorRate += t.errorRate || 0;
      totalSuccesses += t.successCount || 0;
      totalFailures += t.failureCount || 0;
    });

    const completedCount = completedTests.length;

    return {
      totalTests: testArray.length,
      excellentTests: testArray.filter((t) => t.status === 'excellent').length,
      goodTests: testArray.filter((t) => t.status === 'good').length,
      acceptableTests: testArray.filter((t) => t.status === 'acceptable').length,
      poorTests: testArray.filter((t) => t.status === 'poor').length,
      averageResponseTime: completedCount > 0 ? totalResponseTime / completedCount : 0,
      averageThroughput: completedCount > 0 ? totalThroughput / completedCount : 0,
      averageErrorRate: completedCount > 0 ? totalErrorRate / completedCount : 0,
      totalSuccesses,
      totalFailures,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.tests.clear();
  }
}

export const apiPerformanceTestService = APIPerformanceTestService.getInstance();
export default apiPerformanceTestService;
