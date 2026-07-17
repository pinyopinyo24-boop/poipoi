import { describe, it, expect, beforeEach } from 'vitest';

/**
 * DeviceTestService
 * Androidデバイステスト・検証
 */
export interface DeviceInfo {
  deviceId: string;
  model: string;
  osVersion: number;
  apiLevel: number;
  manufacturer: string;
  screenSize: string;
  ram: number;
  storage: number;
}

export interface TestCase {
  testId: string;
  name: string;
  category: 'installation' | 'functionality' | 'performance' | 'compatibility' | 'security';
  status: 'pending' | 'running' | 'passed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  result?: string;
  errorMessage?: string;
}

export interface DeviceTestResult {
  resultId: string;
  deviceId: string;
  apkPath: string;
  testCases: TestCase[];
  overallStatus: 'pending' | 'running' | 'passed' | 'failed';
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
}

export class DeviceTestService {
  private devices: Map<string, DeviceInfo> = new Map();
  private testResults: Map<string, DeviceTestResult> = new Map();
  private testHistory: DeviceTestResult[] = [];

  /**
   * デバイス情報を登録
   */
  registerDevice(
    model: string,
    osVersion: number,
    apiLevel: number,
    manufacturer: string,
    screenSize: string,
    ram: number,
    storage: number
  ): DeviceInfo {
    const deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const device: DeviceInfo = {
      deviceId,
      model,
      osVersion,
      apiLevel,
      manufacturer,
      screenSize,
      ram,
      storage,
    };

    this.devices.set(deviceId, device);
    return device;
  }

  /**
   * テスト結果を作成
   */
  createTestResult(deviceId: string, apkPath: string): DeviceTestResult {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    const resultId = `result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result: DeviceTestResult = {
      resultId,
      deviceId,
      apkPath,
      testCases: [],
      overallStatus: 'pending',
      startTime: new Date(),
      passedTests: 0,
      failedTests: 0,
      successRate: 0,
    };

    this.testResults.set(resultId, result);
    return result;
  }

  /**
   * テストケースを追加
   */
  addTestCase(resultId: string, testName: string, category: TestCase['category']): TestCase {
    const result = this.testResults.get(resultId);
    if (!result) {
      throw new Error('Test result not found');
    }

    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const testCase: TestCase = {
      testId,
      name: testName,
      category,
      status: 'pending',
    };

    result.testCases.push(testCase);
    return testCase;
  }

  /**
   * テストを実行
   */
  executeTest(resultId: string, testId: string): boolean {
    const result = this.testResults.get(resultId);
    if (!result) {
      throw new Error('Test result not found');
    }

    const testCase = result.testCases.find((t) => t.testId === testId);
    if (!testCase) {
      throw new Error('Test case not found');
    }

    testCase.status = 'running';
    testCase.startTime = new Date();
    result.overallStatus = 'running';

    return true;
  }

  /**
   * テストを完了
   */
  completeTest(resultId: string, testId: string, passed: boolean, result?: string, errorMessage?: string): boolean {
    const testResult = this.testResults.get(resultId);
    if (!testResult) {
      throw new Error('Test result not found');
    }

    const testCase = testResult.testCases.find((t) => t.testId === testId);
    if (!testCase) {
      throw new Error('Test case not found');
    }

    testCase.endTime = new Date();
    testCase.status = passed ? 'passed' : 'failed';
    testCase.duration = testCase.endTime.getTime() - (testCase.startTime?.getTime() || 0);
    testCase.result = result;
    testCase.errorMessage = errorMessage;

    if (passed) {
      testResult.passedTests++;
    } else {
      testResult.failedTests++;
    }

    testResult.successRate = testResult.testCases.length > 0 ? (testResult.passedTests / testResult.testCases.length) * 100 : 0;

    return true;
  }

  /**
   * テスト結果を完了
   */
  completeTestResult(resultId: string): DeviceTestResult {
    const result = this.testResults.get(resultId);
    if (!result) {
      throw new Error('Test result not found');
    }

    result.endTime = new Date();
    result.totalDuration = result.endTime.getTime() - result.startTime.getTime();
    result.overallStatus = result.failedTests === 0 ? 'passed' : 'failed';

    if (result.overallStatus === 'passed') {
      this.testHistory.push(result);
    }

    return result;
  }

  /**
   * テスト結果を取得
   */
  getTestResult(resultId: string): DeviceTestResult | undefined {
    return this.testResults.get(resultId);
  }

  /**
   * テスト履歴を取得
   */
  getTestHistory(): DeviceTestResult[] {
    return [...this.testHistory];
  }

  /**
   * デバイス情報を取得
   */
  getDevice(deviceId: string): DeviceInfo | undefined {
    return this.devices.get(deviceId);
  }

  /**
   * テストレポートを生成
   */
  generateTestReport(resultId: string): string {
    const result = this.testResults.get(resultId);
    if (!result) {
      throw new Error('Test result not found');
    }

    const device = this.devices.get(result.deviceId);

    let report = `
=== Device Test Report ===
Result ID: ${result.resultId}
Device: ${device?.manufacturer} ${device?.model}
OS Version: Android ${device?.osVersion}
API Level: ${device?.apiLevel}
RAM: ${device?.ram}GB
Storage: ${device?.storage}GB

APK: ${result.apkPath}
Status: ${result.overallStatus}
Duration: ${result.totalDuration ? (result.totalDuration / 1000).toFixed(2) + 's' : 'N/A'}

Test Results:
  Total: ${result.testCases.length}
  Passed: ${result.passedTests}
  Failed: ${result.failedTests}
  Success Rate: ${result.successRate.toFixed(2)}%

Test Details:
`;

    result.testCases.forEach((t) => {
      report += `
  [${t.status.toUpperCase()}] ${t.name}
    Category: ${t.category}
    Duration: ${t.duration ? (t.duration / 1000).toFixed(2) + 's' : 'N/A'}
    ${t.result ? `Result: ${t.result}` : ''}
    ${t.errorMessage ? `Error: ${t.errorMessage}` : ''}
`;
    });

    return report.trim();
  }

  /**
   * インストールテストを追加
   */
  addInstallationTest(resultId: string): TestCase {
    return this.addTestCase(resultId, 'APK Installation', 'installation');
  }

  /**
   * 起動テストを追加
   */
  addLaunchTest(resultId: string): TestCase {
    return this.addTestCase(resultId, 'App Launch', 'functionality');
  }

  /**
   * チャット機能テストを追加
   */
  addChatFunctionalityTest(resultId: string): TestCase {
    return this.addTestCase(resultId, 'Chat Functionality', 'functionality');
  }

  /**
   * パフォーマンステストを追加
   */
  addPerformanceTest(resultId: string): TestCase {
    return this.addTestCase(resultId, 'Performance', 'performance');
  }

  /**
   * セキュリティテストを追加
   */
  addSecurityTest(resultId: string): TestCase {
    return this.addTestCase(resultId, 'Security', 'security');
  }

  /**
   * テスト統計を計算
   */
  calculateTestStats(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
    averageTestTime: number;
  } {
    const total = this.testHistory.length;
    const passed = this.testHistory.filter((r) => r.overallStatus === 'passed').length;
    const failed = this.testHistory.filter((r) => r.overallStatus === 'failed').length;
    const successRate = total > 0 ? (passed / total) * 100 : 0;

    let totalTime = 0;
    this.testHistory.forEach((r) => {
      if (r.totalDuration) {
        totalTime += r.totalDuration;
      }
    });

    const averageTestTime = total > 0 ? totalTime / total : 0;

    return {
      totalTests: total,
      passedTests: passed,
      failedTests: failed,
      successRate,
      averageTestTime,
    };
  }
}

// ============ TESTS ============

describe('DeviceTestService', () => {
  let service: DeviceTestService;

  beforeEach(() => {
    service = new DeviceTestService();
  });

  describe('registerDevice', () => {
    it('should register device', () => {
      const device = service.registerDevice('Pixel 6', 13, 33, 'Google', '6.1"', 8, 128);
      expect(device.model).toBe('Pixel 6');
      expect(device.osVersion).toBe(13);
      expect(device.apiLevel).toBe(33);
    });

    it('should generate unique device IDs', () => {
      const device1 = service.registerDevice('Pixel 6', 13, 33, 'Google', '6.1"', 8, 128);
      const device2 = service.registerDevice('Galaxy S21', 12, 31, 'Samsung', '6.2"', 8, 256);
      expect(device1.deviceId).not.toBe(device2.deviceId);
    });
  });

  describe('createTestResult', () => {
    it('should create test result', () => {
      const device = service.registerDevice('Pixel 6', 13, 33, 'Google', '6.1"', 8, 128);
      const result = service.createTestResult(device.deviceId, '/path/to/app.apk');

      expect(result.deviceId).toBe(device.deviceId);
      expect(result.apkPath).toBe('/path/to/app.apk');
      expect(result.overallStatus).toBe('pending');
    });
  });

  describe('addTestCase', () => {
    it('should add test case', () => {
      const device = service.registerDevice('Pixel 6', 13, 33, 'Google', '6.1"', 8, 128);
      const result = service.createTestResult(device.deviceId, '/path/to/app.apk');
      const testCase = service.addTestCase(result.resultId, 'Installation Test', 'installation');

      expect(testCase.name).toBe('Installation Test');
      expect(testCase.category).toBe('installation');
    });
  });

  describe('executeTest', () => {
    it('should execute test', () => {
      const device = service.registerDevice('Pixel 6', 13, 33, 'Google', '6.1"', 8, 128);
      const result = service.createTestResult(device.deviceId, '/path/to/app.apk');
      const testCase = service.addTestCase(result.resultId, 'Installation Test', 'installation');

      service.executeTest(result.resultId, testCase.testId);
      const updated = service.getTestResult(result.resultId);

      expect(updated?.overallStatus).toBe('running');
      expect(updated?.testCases[0].status).toBe('running');
    });
  });

  describe('completeTest', () => {
    it('should complete test', () => {
      const device = service.registerDevice('Pixel 6', 13, 33, 'Google', '6.1"', 8, 128);
      const result = service.createTestResult(device.deviceId, '/path/to/app.apk');
      const testCase = service.addTestCase(result.resultId, 'Installation Test', 'installation');

      service.executeTest(result.resultId, testCase.testId);
      service.completeTest(result.resultId, testCase.testId, true, 'Installation successful');

      const updated = service.getTestResult(result.resultId);
      expect(updated?.passedTests).toBe(1);
      expect(updated?.testCases[0].status).toBe('passed');
    });
  });

  describe('completeTestResult', () => {
    it('should complete test result', () => {
      const device = service.registerDevice('Pixel 6', 13, 33, 'Google', '6.1"', 8, 128);
      const result = service.createTestResult(device.deviceId, '/path/to/app.apk');
      const testCase = service.addTestCase(result.resultId, 'Installation Test', 'installation');

      service.executeTest(result.resultId, testCase.testId);
      service.completeTest(result.resultId, testCase.testId, true);
      service.completeTestResult(result.resultId);

      const history = service.getTestHistory();
      expect(history).toHaveLength(1);
    });
  });

  describe('generateTestReport', () => {
    it('should generate test report', () => {
      const device = service.registerDevice('Pixel 6', 13, 33, 'Google', '6.1"', 8, 128);
      const result = service.createTestResult(device.deviceId, '/path/to/app.apk');
      const testCase = service.addTestCase(result.resultId, 'Installation Test', 'installation');

      service.executeTest(result.resultId, testCase.testId);
      service.completeTest(result.resultId, testCase.testId, true);

      const report = service.generateTestReport(result.resultId);
      expect(report).toContain('Device Test Report');
      expect(report).toContain('Pixel 6');
      expect(report).toContain('Installation Test');
    });
  });

  describe('addInstallationTest', () => {
    it('should add installation test', () => {
      const device = service.registerDevice('Pixel 6', 13, 33, 'Google', '6.1"', 8, 128);
      const result = service.createTestResult(device.deviceId, '/path/to/app.apk');
      const testCase = service.addInstallationTest(result.resultId);

      expect(testCase.name).toBe('APK Installation');
      expect(testCase.category).toBe('installation');
    });
  });

  describe('addLaunchTest', () => {
    it('should add launch test', () => {
      const device = service.registerDevice('Pixel 6', 13, 33, 'Google', '6.1"', 8, 128);
      const result = service.createTestResult(device.deviceId, '/path/to/app.apk');
      const testCase = service.addLaunchTest(result.resultId);

      expect(testCase.name).toBe('App Launch');
      expect(testCase.category).toBe('functionality');
    });
  });

  describe('addChatFunctionalityTest', () => {
    it('should add chat functionality test', () => {
      const device = service.registerDevice('Pixel 6', 13, 33, 'Google', '6.1"', 8, 128);
      const result = service.createTestResult(device.deviceId, '/path/to/app.apk');
      const testCase = service.addChatFunctionalityTest(result.resultId);

      expect(testCase.name).toBe('Chat Functionality');
    });
  });

  describe('addPerformanceTest', () => {
    it('should add performance test', () => {
      const device = service.registerDevice('Pixel 6', 13, 33, 'Google', '6.1"', 8, 128);
      const result = service.createTestResult(device.deviceId, '/path/to/app.apk');
      const testCase = service.addPerformanceTest(result.resultId);

      expect(testCase.category).toBe('performance');
    });
  });

  describe('addSecurityTest', () => {
    it('should add security test', () => {
      const device = service.registerDevice('Pixel 6', 13, 33, 'Google', '6.1"', 8, 128);
      const result = service.createTestResult(device.deviceId, '/path/to/app.apk');
      const testCase = service.addSecurityTest(result.resultId);

      expect(testCase.category).toBe('security');
    });
  });

  describe('calculateTestStats', () => {
    it('should calculate statistics', () => {
      const device = service.registerDevice('Pixel 6', 13, 33, 'Google', '6.1"', 8, 128);
      const result = service.createTestResult(device.deviceId, '/path/to/app.apk');
      const testCase = service.addTestCase(result.resultId, 'Test', 'installation');

      service.executeTest(result.resultId, testCase.testId);
      service.completeTest(result.resultId, testCase.testId, true);
      service.completeTestResult(result.resultId);

      const stats = service.calculateTestStats();
      expect(stats.totalTests).toBe(1);
      expect(stats.passedTests).toBe(1);
      expect(stats.successRate).toBe(100);
    });
  });

  describe('Complete device test workflow', () => {
    it('should handle complete test workflow', () => {
      const device = service.registerDevice('Pixel 6', 13, 33, 'Google', '6.1"', 8, 128);
      const result = service.createTestResult(device.deviceId, '/path/to/app.apk');

      service.addInstallationTest(result.resultId);
      service.addLaunchTest(result.resultId);
      service.addChatFunctionalityTest(result.resultId);
      service.addPerformanceTest(result.resultId);

      const tests = result.testCases;
      tests.forEach((t) => {
        service.executeTest(result.resultId, t.testId);
        service.completeTest(result.resultId, t.testId, true);
      });

      service.completeTestResult(result.resultId);

      const history = service.getTestHistory();
      expect(history).toHaveLength(1);
      expect(history[0].passedTests).toBe(4);
    });
  });
});
