/**
 * DeviceTestManager - デバイステスト管理
 */

export type TestStatus = 'pending' | 'running' | 'passed' | 'failed';
export type TestType = 'startup' | 'chat' | 'ai' | 'data' | 'network' | 'ux';

export interface DeviceTest {
  testId: string;
  deviceId: string;
  testType: TestType;
  status: TestStatus;
  startedAt?: number;
  completedAt?: number;
  result?: Record<string, unknown>;
  errorMessage?: string;
}

export class DeviceTestManager {
  private static instance: DeviceTestManager;
  private tests: Map<string, DeviceTest> = new Map();
  private testCounter: number = 0;

  private constructor() {}

  static getInstance(): DeviceTestManager {
    if (!DeviceTestManager.instance) {
      DeviceTestManager.instance = new DeviceTestManager();
    }
    return DeviceTestManager.instance;
  }

  /**
   * テスト開始
   */
  startTest(deviceId: string, testType: TestType): DeviceTest {
    const testId = `test_${++this.testCounter}_${Date.now()}`;

    const test: DeviceTest = {
      testId,
      deviceId,
      testType,
      status: 'running',
      startedAt: Date.now(),
    };

    this.tests.set(testId, test);
    return test;
  }

  /**
   * テスト成功
   */
  passTest(testId: string, result?: Record<string, unknown>): DeviceTest | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    test.status = 'passed';
    test.result = result;
    test.completedAt = Date.now();

    return test;
  }

  /**
   * テスト失敗
   */
  failTest(testId: string, errorMessage: string): DeviceTest | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    test.status = 'failed';
    test.errorMessage = errorMessage;
    test.completedAt = Date.now();

    return test;
  }

  /**
   * テスト取得
   */
  getTest(testId: string): DeviceTest | null {
    return this.tests.get(testId) || null;
  }

  /**
   * デバイス別テスト取得
   */
  getTestsByDevice(deviceId: string): DeviceTest[] {
    return Array.from(this.tests.values()).filter((t) => t.deviceId === deviceId);
  }

  /**
   * テストタイプ別テスト取得
   */
  getTestsByType(testType: TestType): DeviceTest[] {
    return Array.from(this.tests.values()).filter((t) => t.testType === testType);
  }

  /**
   * 成功したテスト取得
   */
  getPassedTests(): DeviceTest[] {
    return Array.from(this.tests.values()).filter((t) => t.status === 'passed');
  }

  /**
   * 失敗したテスト取得
   */
  getFailedTests(): DeviceTest[] {
    return Array.from(this.tests.values()).filter((t) => t.status === 'failed');
  }

  /**
   * テスト統計
   */
  getTestStatistics(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    runningTests: number;
    successRate: number;
  } {
    const testArray = Array.from(this.tests.values());
    const passedTests = testArray.filter((t) => t.status === 'passed').length;
    const failedTests = testArray.filter((t) => t.status === 'failed').length;
    const runningTests = testArray.filter((t) => t.status === 'running').length;
    const totalTests = testArray.length;

    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      runningTests,
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

export const deviceTestManager = DeviceTestManager.getInstance();
export default deviceTestManager;
