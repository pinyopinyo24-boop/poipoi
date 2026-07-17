/**
 * UsageTrackingService - 使用量追跡
 * 
 * 機能:
 * - 使用量記録
 * - 使用量集計
 * - 使用パターン分析
 * - 異常検知
 */

export interface UsageRecord {
  id: string;
  userId: number;
  type: string;
  amount: number;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface UsageStats {
  userId: number;
  type: string;
  totalUsage: number;
  dailyUsage: number;
  weeklyUsage: number;
  monthlyUsage: number;
  averageDaily: number;
  peakUsage: number;
  lastUpdated: number;
}

export class UsageTrackingService {
  private static instance: UsageTrackingService;
  private records: Map<number, UsageRecord[]> = new Map();
  private stats: Map<string, UsageStats> = new Map();
  private recordCounter: number = 0;

  private constructor() {}

  static getInstance(): UsageTrackingService {
    if (!UsageTrackingService.instance) {
      UsageTrackingService.instance = new UsageTrackingService();
    }
    return UsageTrackingService.instance;
  }

  /**
   * 使用量記録
   */
  recordUsage(userId: number, type: string, amount: number, metadata: Record<string, any> = {}): UsageRecord {
    const recordId = `usage_${++this.recordCounter}_${Date.now()}`;
    const record: UsageRecord = {
      id: recordId,
      userId,
      type,
      amount,
      timestamp: Date.now(),
      metadata,
    };

    if (!this.records.has(userId)) {
      this.records.set(userId, []);
    }

    const userRecords = this.records.get(userId);
    if (userRecords) {
      userRecords.push(record);
    }

    this.updateStats(userId, type, amount);
    return record;
  }

  /**
   * 統計更新
   */
  private updateStats(userId: number, type: string, amount: number): void {
    const key = `${userId}_${type}`;
    const now = Date.now();
    const dayInMs = 86400000;
    const weekInMs = 7 * dayInMs;
    const monthInMs = 30 * dayInMs;

    let stats = this.stats.get(key);
    if (!stats) {
      stats = {
        userId,
        type,
        totalUsage: 0,
        dailyUsage: 0,
        weeklyUsage: 0,
        monthlyUsage: 0,
        averageDaily: 0,
        peakUsage: 0,
        lastUpdated: now,
      };
      this.stats.set(key, stats);
    }

    stats.totalUsage += amount;
    stats.peakUsage = Math.max(stats.peakUsage, amount);
    stats.lastUpdated = now;

    // 日次・週次・月次使用量計算
    const userRecords = this.records.get(userId) || [];
    const typeRecords = userRecords.filter(r => r.type === type);

    stats.dailyUsage = typeRecords
      .filter(r => r.timestamp > now - dayInMs)
      .reduce((sum, r) => sum + r.amount, 0);

    stats.weeklyUsage = typeRecords
      .filter(r => r.timestamp > now - weekInMs)
      .reduce((sum, r) => sum + r.amount, 0);

    stats.monthlyUsage = typeRecords
      .filter(r => r.timestamp > now - monthInMs)
      .reduce((sum, r) => sum + r.amount, 0);

    // 平均日次使用量計算
    const daysWithUsage = new Set(typeRecords.map(r => Math.floor(r.timestamp / dayInMs)));
    stats.averageDaily = daysWithUsage.size > 0 ? stats.monthlyUsage / daysWithUsage.size : 0;
  }

  /**
   * 使用量統計取得
   */
  getUsageStats(userId: number, type: string): UsageStats | null {
    const key = `${userId}_${type}`;
    return this.stats.get(key) || null;
  }

  /**
   * ユーザー使用量統計取得
   */
  getUserUsageStats(userId: number): UsageStats[] {
    const userStats: UsageStats[] = [];
    this.stats.forEach((stat, key) => {
      if (stat.userId === userId) {
        userStats.push(stat);
      }
    });
    return userStats;
  }

  /**
   * 使用記録取得
   */
  getUsageRecords(userId: number, type?: string, limit: number = 100): UsageRecord[] {
    let records = this.records.get(userId) || [];
    if (type) {
      records = records.filter(r => r.type === type);
    }
    return records.slice(-limit);
  }

  /**
   * 期間別使用量取得
   */
  getUsageByPeriod(
    userId: number,
    type: string,
    startTime: number,
    endTime: number
  ): number {
    const records = this.records.get(userId) || [];
    return records
      .filter(r => r.type === type && r.timestamp >= startTime && r.timestamp <= endTime)
      .reduce((sum, r) => sum + r.amount, 0);
  }

  /**
   * 使用パターン分析
   */
  analyzeUsagePattern(userId: number, type: string): {
    pattern: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    recommendation: string;
  } {
    const stats = this.getUsageStats(userId, type);
    if (!stats) {
      return {
        pattern: 'no_data',
        trend: 'stable',
        recommendation: 'まだ使用データがありません',
      };
    }

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (stats.monthlyUsage > stats.weeklyUsage * 4) {
      trend = 'increasing';
    } else if (stats.monthlyUsage < stats.weeklyUsage * 2) {
      trend = 'decreasing';
    }

    let pattern = 'normal';
    if (stats.dailyUsage > stats.averageDaily * 2) {
      pattern = 'spike';
    } else if (stats.dailyUsage < stats.averageDaily * 0.5) {
      pattern = 'low';
    }

    let recommendation = '';
    if (trend === 'increasing') {
      recommendation = 'より高いプランへのアップグレードを検討してください';
    } else if (trend === 'decreasing') {
      recommendation = 'より低いプランへのダウングレードを検討してください';
    } else {
      recommendation = '現在のプランは適切です';
    }

    return { pattern, trend, recommendation };
  }

  /**
   * 異常検知
   */
  detectAnomalies(userId: number, type: string): {
    isAnomaly: boolean;
    severity: 'low' | 'medium' | 'high';
    reason: string;
  } {
    const stats = this.getUsageStats(userId, type);
    if (!stats) {
      return { isAnomaly: false, severity: 'low', reason: 'データ不足' };
    }

    const threshold = stats.averageDaily * 3;
    if (stats.dailyUsage > threshold) {
      return {
        isAnomaly: true,
        severity: 'high',
        reason: `通常の${(stats.dailyUsage / stats.averageDaily).toFixed(1)}倍の使用量です`,
      };
    }

    if (stats.dailyUsage > stats.averageDaily * 1.5) {
      return {
        isAnomaly: true,
        severity: 'medium',
        reason: `通常より${((stats.dailyUsage / stats.averageDaily - 1) * 100).toFixed(0)}%多く使用しています`,
      };
    }

    return { isAnomaly: false, severity: 'low', reason: '正常な使用パターンです' };
  }

  /**
   * 使用量リセット
   */
  resetUsageStats(userId: number, type?: string): number {
    let count = 0;
    if (type) {
      const key = `${userId}_${type}`;
      if (this.stats.has(key)) {
        this.stats.delete(key);
        count = 1;
      }
    } else {
      this.stats.forEach((stat, key) => {
        if (stat.userId === userId) {
          this.stats.delete(key);
          count++;
        }
      });
    }
    return count;
  }

  /**
   * クリーンアップ
   */
  cleanup(userId?: number): void {
    if (userId) {
      this.records.delete(userId);
      this.stats.forEach((stat, key) => {
        if (stat.userId === userId) {
          this.stats.delete(key);
        }
      });
    } else {
      this.records.clear();
      this.stats.clear();
    }
  }
}

export const usageTrackingService = UsageTrackingService.getInstance();
export default usageTrackingService;
