/**
 * NetworkConnectionService - ネットワーク接続テストサービス
 */

export type ConnectionType = 'wifi' | '4g' | '5g' | 'unknown';
export type ConnectionStatus = 'connected' | 'disconnected' | 'unstable';

export interface NetworkTest {
  testId: string;
  deviceId: string;
  connectionType: ConnectionType;
  status: ConnectionStatus;
  startedAt: number;
  completedAt?: number;
  latency?: number;
  bandwidth?: number;
  packetLoss?: number;
  jitter?: number;
  timeouts?: number;
  errors?: string[];
}

export class NetworkConnectionService {
  private static instance: NetworkConnectionService;
  private tests: Map<string, NetworkTest> = new Map();
  private testCounter: number = 0;

  private constructor() {}

  static getInstance(): NetworkConnectionService {
    if (!NetworkConnectionService.instance) {
      NetworkConnectionService.instance = new NetworkConnectionService();
    }
    return NetworkConnectionService.instance;
  }

  /**
   * ネットワークテスト開始
   */
  startTest(deviceId: string, connectionType: ConnectionType): NetworkTest {
    const testId = `network_test_${++this.testCounter}_${Date.now()}`;

    const test: NetworkTest = {
      testId,
      deviceId,
      connectionType,
      status: 'connected',
      startedAt: Date.now(),
      errors: [],
    };

    this.tests.set(testId, test);
    return test;
  }

  /**
   * ネットワークテスト完了
   */
  completeTest(
    testId: string,
    latency: number,
    bandwidth: number,
    packetLoss: number,
    jitter: number,
    timeouts: number
  ): NetworkTest | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    test.latency = latency;
    test.bandwidth = bandwidth;
    test.packetLoss = packetLoss;
    test.jitter = jitter;
    test.timeouts = timeouts;
    test.completedAt = Date.now();

    // ステータス判定
    if (packetLoss > 5 || latency > 500 || timeouts > 0) {
      test.status = 'unstable';
    }

    return test;
  }

  /**
   * テスト取得
   */
  getTest(testId: string): NetworkTest | null {
    return this.tests.get(testId) || null;
  }

  /**
   * デバイス別テスト取得
   */
  getTestsByDevice(deviceId: string): NetworkTest[] {
    return Array.from(this.tests.values()).filter((t) => t.deviceId === deviceId);
  }

  /**
   * 接続タイプ別テスト取得
   */
  getTestsByConnectionType(connectionType: ConnectionType): NetworkTest[] {
    return Array.from(this.tests.values()).filter((t) => t.connectionType === connectionType);
  }

  /**
   * 安定した接続テスト取得
   */
  getStableTests(): NetworkTest[] {
    return Array.from(this.tests.values()).filter((t) => t.status === 'connected');
  }

  /**
   * 不安定な接続テスト取得
   */
  getUnstableTests(): NetworkTest[] {
    return Array.from(this.tests.values()).filter((t) => t.status === 'unstable');
  }

  /**
   * ネットワーク統計
   */
  getNetworkStatistics(): {
    totalTests: number;
    stableTests: number;
    unstableTests: number;
    averageLatency: number;
    averageBandwidth: number;
    averagePacketLoss: number;
    averageJitter: number;
    totalTimeouts: number;
  } {
    const testArray = Array.from(this.tests.values());
    const completedTests = testArray.filter((t) => t.completedAt);

    let totalLatency = 0;
    let totalBandwidth = 0;
    let totalPacketLoss = 0;
    let totalJitter = 0;
    let totalTimeouts = 0;

    completedTests.forEach((t) => {
      totalLatency += t.latency || 0;
      totalBandwidth += t.bandwidth || 0;
      totalPacketLoss += t.packetLoss || 0;
      totalJitter += t.jitter || 0;
      totalTimeouts += t.timeouts || 0;
    });

    const completedCount = completedTests.length;

    return {
      totalTests: testArray.length,
      stableTests: testArray.filter((t) => t.status === 'connected').length,
      unstableTests: testArray.filter((t) => t.status === 'unstable').length,
      averageLatency: completedCount > 0 ? totalLatency / completedCount : 0,
      averageBandwidth: completedCount > 0 ? totalBandwidth / completedCount : 0,
      averagePacketLoss: completedCount > 0 ? totalPacketLoss / completedCount : 0,
      averageJitter: completedCount > 0 ? totalJitter / completedCount : 0,
      totalTimeouts,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.tests.clear();
  }
}

export const networkConnectionService = NetworkConnectionService.getInstance();
export default networkConnectionService;
