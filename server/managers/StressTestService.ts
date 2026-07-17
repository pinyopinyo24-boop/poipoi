/**
 * StressTestService
 * 長時間連続利用・大量メッセージ・大量ファイル解析試験
 */

export interface StressTestScenario {
  scenarioId: string;
  name: string;
  description: string;
  testType: 'continuous_usage' | 'bulk_messages' | 'bulk_files' | 'concurrent_users';
  duration: number;
  intensity: 'low' | 'medium' | 'high' | 'critical';
  parameters: Record<string, any>;
  createdAt: number;
}

export interface StressTestResult {
  resultId: string;
  scenarioId: string;
  timestamp: number;
  status: 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  duration?: number;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    peakMemory: number;
    averageMemory: number;
    peakCPU: number;
    averageCPU: number;
    errorRate: number;
    throughput: number;
  };
  issues: string[];
  recommendations: string[];
}

export interface LoadProfile {
  profileId: string;
  timestamp: number;
  requestsPerSecond: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
  responseTime: number;
  errorCount: number;
}

export class StressTestService {
  private scenarios: Map<string, StressTestScenario> = new Map();
  private results: Map<string, StressTestResult> = new Map();
  private profiles: Map<string, LoadProfile> = new Map();
  private scenarioResults: Map<string, string[]> = new Map();
  private resultsByStatus: Map<string, string[]> = new Map();

  /**
   * ストレステストシナリオを作成
   */
  createScenario(
    name: string,
    description: string,
    testType: StressTestScenario['testType'],
    duration: number,
    intensity: StressTestScenario['intensity'],
    parameters: Record<string, any>
  ): StressTestScenario {
    const scenarioId = `STR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const scenario: StressTestScenario = {
      scenarioId,
      name,
      description,
      testType,
      duration,
      intensity,
      parameters,
      createdAt: Date.now(),
    };

    this.scenarios.set(scenarioId, scenario);
    this.scenarioResults.set(scenarioId, []);

    return scenario;
  }

  /**
   * シナリオを取得
   */
  getScenario(scenarioId: string): StressTestScenario | undefined {
    return this.scenarios.get(scenarioId);
  }

  /**
   * テスト結果を記録
   */
  recordTestResult(
    scenarioId: string,
    status: StressTestResult['status'],
    startTime: number,
    endTime: number,
    metrics: StressTestResult['metrics'],
    issues: string[] = [],
    recommendations: string[] = []
  ): StressTestResult {
    const resultId = `RES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = endTime - startTime;

    const result: StressTestResult = {
      resultId,
      scenarioId,
      timestamp: Date.now(),
      status,
      startTime,
      endTime,
      duration,
      metrics,
      issues,
      recommendations,
    };

    this.results.set(resultId, result);

    const scenarioIds = this.scenarioResults.get(scenarioId) || [];
    scenarioIds.push(resultId);

    if (!this.resultsByStatus.has(status)) {
      this.resultsByStatus.set(status, []);
    }
    this.resultsByStatus.get(status)!.push(resultId);

    return result;
  }

  /**
   * テスト結果を取得
   */
  getTestResult(resultId: string): StressTestResult | undefined {
    return this.results.get(resultId);
  }

  /**
   * シナリオのテスト結果を取得
   */
  getScenarioResults(scenarioId: string): StressTestResult[] {
    const ids = this.scenarioResults.get(scenarioId) || [];
    return ids
      .map(id => this.results.get(id))
      .filter((r): r is StressTestResult => r !== undefined);
  }

  /**
   * ステータス別テスト結果を取得
   */
  getResultsByStatus(status: StressTestResult['status']): StressTestResult[] {
    const ids = this.resultsByStatus.get(status) || [];
    return ids
      .map(id => this.results.get(id))
      .filter((r): r is StressTestResult => r !== undefined);
  }

  /**
   * ロードプロファイルを記録
   */
  recordLoadProfile(
    requestsPerSecond: number,
    activeConnections: number,
    memoryUsage: number,
    cpuUsage: number,
    responseTime: number,
    errorCount: number
  ): LoadProfile {
    const profileId = `LP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const profile: LoadProfile = {
      profileId,
      timestamp: Date.now(),
      requestsPerSecond,
      activeConnections,
      memoryUsage,
      cpuUsage,
      responseTime,
      errorCount,
    };

    this.profiles.set(profileId, profile);
    return profile;
  }

  /**
   * ロードプロファイルを取得
   */
  getLoadProfile(profileId: string): LoadProfile | undefined {
    return this.profiles.get(profileId);
  }

  /**
   * 長時間連続利用テストを実行
   */
  runContinuousUsageTest(
    duration: number,
    messageInterval: number
  ): StressTestScenario {
    return this.createScenario(
      '長時間連続利用テスト',
      `${duration}秒間、${messageInterval}msごとにメッセージを送信`,
      'continuous_usage',
      duration,
      'high',
      {
        messageInterval,
        totalMessages: Math.floor(duration / messageInterval),
      }
    );
  }

  /**
   * 大量メッセージ処理テストを実行
   */
  runBulkMessagesTest(messageCount: number): StressTestScenario {
    return this.createScenario(
      '大量メッセージ処理テスト',
      `${messageCount}個のメッセージを一括処理`,
      'bulk_messages',
      60,
      'critical',
      {
        messageCount,
        batchSize: Math.ceil(messageCount / 10),
      }
    );
  }

  /**
   * 大量ファイル解析テストを実行
   */
  runBulkFilesTest(fileCount: number, averageFileSize: number): StressTestScenario {
    return this.createScenario(
      '大量ファイル解析テスト',
      `${fileCount}個のファイル(平均${averageFileSize}MB)を解析`,
      'bulk_files',
      300,
      'critical',
      {
        fileCount,
        averageFileSize,
        totalDataSize: fileCount * averageFileSize,
      }
    );
  }

  /**
   * 同時ユーザーテストを実行
   */
  runConcurrentUsersTest(userCount: number, duration: number): StressTestScenario {
    return this.createScenario(
      `${userCount}同時ユーザーテスト`,
      `${userCount}人のユーザーが同時にアクセス`,
      'concurrent_users',
      duration,
      userCount > 1000 ? 'critical' : userCount > 500 ? 'high' : 'medium',
      {
        userCount,
        requestsPerUser: Math.floor(duration / 5),
      }
    );
  }

  /**
   * テスト結果が合格か判定
   */
  isTestPassed(result: StressTestResult): boolean {
    const metrics = result.metrics;

    // エラー率が5%以下
    if (metrics.errorRate > 5) return false;

    // 平均応答時間が2秒以下
    if (metrics.averageResponseTime > 2000) return false;

    // メモリ使用量が85%以下
    if (metrics.peakMemory > 85) return false;

    // CPU使用率が80%以下
    if (metrics.peakCPU > 80) return false;

    return true;
  }

  /**
   * テスト結果を分析
   */
  analyzeTestResult(result: StressTestResult): {
    passed: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const metrics = result.metrics;

    if (metrics.errorRate > 5) {
      issues.push(`エラー率が高い: ${metrics.errorRate.toFixed(2)}%`);
      recommendations.push('エラーログを確認し、根本原因を特定してください');
    }

    if (metrics.averageResponseTime > 2000) {
      issues.push(`平均応答時間が遅い: ${metrics.averageResponseTime}ms`);
      recommendations.push('クエリ最適化またはキャッシング戦略を検討してください');
    }

    if (metrics.peakMemory > 85) {
      issues.push(`メモリ使用率が高い: ${metrics.peakMemory}%`);
      recommendations.push('メモリリークをチェックし、最適化を実施してください');
    }

    if (metrics.peakCPU > 80) {
      issues.push(`CPU使用率が高い: ${metrics.peakCPU}%`);
      recommendations.push('CPU集約的な処理を特定し、最適化してください');
    }

    if (metrics.throughput < 100) {
      issues.push(`スループットが低い: ${metrics.throughput} req/s`);
      recommendations.push('並列処理の向上またはスケーリングを検討してください');
    }

    return {
      passed: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * 全シナリオを取得
   */
  getAllScenarios(): StressTestScenario[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * 全テスト結果を取得
   */
  getAllResults(): StressTestResult[] {
    return Array.from(this.results.values());
  }

  /**
   * 全ロードプロファイルを取得
   */
  getAllLoadProfiles(): LoadProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * テスト統計を計算
   */
  getTestStatistics(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
    averageResponseTime: number;
    averageErrorRate: number;
  } {
    const results = Array.from(this.results.values());
    const stats = {
      totalTests: results.length,
      passedTests: 0,
      failedTests: 0,
      passRate: 0,
      averageResponseTime: 0,
      averageErrorRate: 0,
    };

    if (results.length === 0) return stats;

    let totalResponseTime = 0;
    let totalErrorRate = 0;

    for (const result of results) {
      if (this.isTestPassed(result)) {
        stats.passedTests++;
      } else {
        stats.failedTests++;
      }

      totalResponseTime += result.metrics.averageResponseTime;
      totalErrorRate += result.metrics.errorRate;
    }

    stats.passRate = (stats.passedTests / results.length) * 100;
    stats.averageResponseTime = totalResponseTime / results.length;
    stats.averageErrorRate = totalErrorRate / results.length;

    return stats;
  }

  /**
   * 最新のテスト結果を取得
   */
  getLatestResult(): StressTestResult | undefined {
    const results = Array.from(this.results.values());
    if (results.length === 0) return undefined;

    return results.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );
  }

  /**
   * 失敗したテストを取得
   */
  getFailedTests(): StressTestResult[] {
    return Array.from(this.results.values()).filter(r => !this.isTestPassed(r));
  }

  /**
   * シナリオを削除
   */
  deleteScenario(scenarioId: string): boolean {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) return false;

    // 関連するテスト結果を削除
    const resultIds = this.scenarioResults.get(scenarioId) || [];
    for (const resultId of resultIds) {
      const result = this.results.get(resultId);
      if (result) {
        const statusIds = this.resultsByStatus.get(result.status) || [];
        const index = statusIds.indexOf(resultId);
        if (index > -1) {
          statusIds.splice(index, 1);
        }
      }
      this.results.delete(resultId);
    }

    this.scenarioResults.delete(scenarioId);
    this.scenarios.delete(scenarioId);

    return true;
  }

  /**
   * テスト結果を削除
   */
  deleteResult(resultId: string): boolean {
    const result = this.results.get(resultId);
    if (!result) return false;

    const scenarioIds = this.scenarioResults.get(result.scenarioId) || [];
    const index = scenarioIds.indexOf(resultId);
    if (index > -1) {
      scenarioIds.splice(index, 1);
    }

    const statusIds = this.resultsByStatus.get(result.status) || [];
    const statusIndex = statusIds.indexOf(resultId);
    if (statusIndex > -1) {
      statusIds.splice(statusIndex, 1);
    }

    this.results.delete(resultId);
    return true;
  }
}
