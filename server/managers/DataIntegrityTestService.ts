/**
 * DataIntegrityTestService - データ整合性テストサービス
 */

export type DataIntegrityCheck = 'consistency' | 'completeness' | 'accuracy' | 'validity' | 'uniqueness';

export interface DataIntegrityTest {
  testId: string;
  checkType: DataIntegrityCheck;
  testName: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  startedAt?: number;
  completedAt?: number;
  recordsChecked?: number;
  issuesFound?: number;
  errorMessage?: string;
}

export class DataIntegrityTestService {
  private static instance: DataIntegrityTestService;
  private tests: Map<string, DataIntegrityTest> = new Map();
  private testCounter: number = 0;

  private constructor() {}

  static getInstance(): DataIntegrityTestService {
    if (!DataIntegrityTestService.instance) {
      DataIntegrityTestService.instance = new DataIntegrityTestService();
    }
    return DataIntegrityTestService.instance;
  }

  /**
   * データ整合性テスト登録
   */
  registerDataIntegrityTest(checkType: DataIntegrityCheck, testName: string): DataIntegrityTest {
    const testId = `data_integrity_${++this.testCounter}_${Date.now()}`;

    const test: DataIntegrityTest = {
      testId,
      checkType,
      testName,
      status: 'pending',
    };

    this.tests.set(testId, test);
    return test;
  }

  /**
   * テスト開始
   */
  startDataIntegrityTest(testId: string): DataIntegrityTest | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    test.status = 'running';
    test.startedAt = Date.now();
    return test;
  }

  /**
   * テスト成功
   */
  passDataIntegrityTest(testId: string, recordsChecked: number, issuesFound: number): DataIntegrityTest | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    test.status = 'passed';
    test.recordsChecked = recordsChecked;
    test.issuesFound = issuesFound;
    test.completedAt = Date.now();

    return test;
  }

  /**
   * テスト失敗
   */
  failDataIntegrityTest(testId: string, recordsChecked: number, issuesFound: number, errorMessage: string): DataIntegrityTest | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    test.status = 'failed';
    test.recordsChecked = recordsChecked;
    test.issuesFound = issuesFound;
    test.errorMessage = errorMessage;
    test.completedAt = Date.now();

    return test;
  }

  /**
   * テスト取得
   */
  getDataIntegrityTest(testId: string): DataIntegrityTest | null {
    return this.tests.get(testId) || null;
  }

  /**
   * チェック別テスト取得
   */
  getTestsByCheckType(checkType: DataIntegrityCheck): DataIntegrityTest[] {
    return Array.from(this.tests.values()).filter((t) => t.checkType === checkType);
  }

  /**
   * 失敗したテスト取得
   */
  getFailedTests(): DataIntegrityTest[] {
    return Array.from(this.tests.values()).filter((t) => t.status === 'failed');
  }

  /**
   * データ整合性統計
   */
  getDataIntegrityStatistics(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalRecordsChecked: number;
    totalIssuesFound: number;
    averageIssuesPerTest: number;
    successRate: number;
    isDataIntegral: boolean;
  } {
    const testArray = Array.from(this.tests.values());
    const passedTests = testArray.filter((t) => t.status === 'passed').length;
    const failedTests = testArray.filter((t) => t.status === 'failed').length;
    const totalTests = testArray.length;

    let totalRecordsChecked = 0;
    let totalIssuesFound = 0;

    testArray.forEach((test) => {
      if (test.recordsChecked !== undefined) {
        totalRecordsChecked += test.recordsChecked;
      }
      if (test.issuesFound !== undefined) {
        totalIssuesFound += test.issuesFound;
      }
    });

    const averageIssuesPerTest = totalTests > 0 ? totalIssuesFound / totalTests : 0;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const isDataIntegral = failedTests === 0 && totalIssuesFound === 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      totalRecordsChecked,
      totalIssuesFound,
      averageIssuesPerTest,
      successRate,
      isDataIntegral,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.tests.clear();
  }
}

export const dataIntegrityTestService = DataIntegrityTestService.getInstance();
export default dataIntegrityTestService;
