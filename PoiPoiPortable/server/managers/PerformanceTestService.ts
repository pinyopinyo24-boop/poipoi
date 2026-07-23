/**
 * PerformanceTestService - パフォーマンステストサービス
 */

export type PerformanceMetric = 'responseTime' | 'throughput' | 'memoryUsage' | 'cpuUsage' | 'latency';

export interface PerformanceTest {
  testId: string;
  testName: string;
  metric: PerformanceMetric;
  threshold: number;
  status: 'pending' | 'running' | 'passed' | 'failed';
  startedAt?: number;
  completedAt?: number;
  actualValue?: number;
  errorMessage?: string;
}

export interface PerformanceMetrics {
  responseTime: number[];
  throughput: number[];
  memoryUsage: number[];
  cpuUsage: number[];
  latency: number[];
}

export class PerformanceTestService {
  private static instance: PerformanceTestService;
  private tests: Map<string, PerformanceTest> = new Map();
  private metrics: PerformanceMetrics = {
    responseTime: [],
    throughput: [],
    memoryUsage: [],
    cpuUsage: [],
    latency: [],
  };
  private testCounter: number = 0;

  private constructor() {}

  static getInstance(): PerformanceTestService {
    if (!PerformanceTestService.instance) {
      PerformanceTestService.instance = new PerformanceTestService();
    }
    return PerformanceTestService.instance;
  }

  /**
   * パフォーマンステスト登録
   */
  registerPerformanceTest(testName: string, metric: PerformanceMetric, threshold: number): PerformanceTest {
    const testId = `perf_test_${++this.testCounter}_${Date.now()}`;

    const test: PerformanceTest = {
      testId,
      testName,
      metric,
      threshold,
      status: 'pending',
    };

    this.tests.set(testId, test);
    return test;
  }

  /**
   * テスト開始
   */
  startPerformanceTest(testId: string): PerformanceTest | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    test.status = 'running';
    test.startedAt = Date.now();
    return test;
  }

  /**
   * テスト成功
   */
  passPerformanceTest(testId: string, actualValue: number): PerformanceTest | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    test.status = 'passed';
    test.actualValue = actualValue;
    test.completedAt = Date.now();

    // メトリクスに記録
    this.metrics[test.metric].push(actualValue);

    return test;
  }

  /**
   * テスト失敗
   */
  failPerformanceTest(testId: string, actualValue: number, errorMessage: string): PerformanceTest | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    test.status = 'failed';
    test.actualValue = actualValue;
    test.errorMessage = errorMessage;
    test.completedAt = Date.now();

    // メトリクスに記録
    this.metrics[test.metric].push(actualValue);

    return test;
  }

  /**
   * テスト取得
   */
  getPerformanceTest(testId: string): PerformanceTest | null {
    return this.tests.get(testId) || null;
  }

  /**
   * メトリクス別テスト取得
   */
  getTestsByMetric(metric: PerformanceMetric): PerformanceTest[] {
    return Array.from(this.tests.values()).filter((t) => t.metric === metric);
  }

  /**
   * パフォーマンス統計
   */
  getPerformanceStatistics(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageResponseTime: number;
    averageThroughput: number;
    averageMemoryUsage: number;
    averageCpuUsage: number;
    averageLatency: number;
    successRate: number;
  } {
    const testArray = Array.from(this.tests.values());
    const passedTests = testArray.filter((t) => t.status === 'passed').length;
    const failedTests = testArray.filter((t) => t.status === 'failed').length;
    const totalTests = testArray.length;

    const calculateAverage = (values: number[]): number => {
      if (values.length === 0) return 0;
      return values.reduce((a, b) => a + b, 0) / values.length;
    };

    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      averageResponseTime: calculateAverage(this.metrics.responseTime),
      averageThroughput: calculateAverage(this.metrics.throughput),
      averageMemoryUsage: calculateAverage(this.metrics.memoryUsage),
      averageCpuUsage: calculateAverage(this.metrics.cpuUsage),
      averageLatency: calculateAverage(this.metrics.latency),
      successRate,
    };
  }

  /**
   * メトリクス統計
   */
  getMetricsStatistics(): {
    responseTime: { count: number; average: number; min: number; max: number };
    throughput: { count: number; average: number; min: number; max: number };
    memoryUsage: { count: number; average: number; min: number; max: number };
    cpuUsage: { count: number; average: number; min: number; max: number };
    latency: { count: number; average: number; min: number; max: number };
  } {
    const calculateStats = (values: number[]) => {
      if (values.length === 0) {
        return { count: 0, average: 0, min: 0, max: 0 };
      }
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      return { count: values.length, average, min, max };
    };

    return {
      responseTime: calculateStats(this.metrics.responseTime),
      throughput: calculateStats(this.metrics.throughput),
      memoryUsage: calculateStats(this.metrics.memoryUsage),
      cpuUsage: calculateStats(this.metrics.cpuUsage),
      latency: calculateStats(this.metrics.latency),
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.tests.clear();
    this.metrics = {
      responseTime: [],
      throughput: [],
      memoryUsage: [],
      cpuUsage: [],
      latency: [],
    };
  }
}

export const performanceTestService = PerformanceTestService.getInstance();
export default performanceTestService;
