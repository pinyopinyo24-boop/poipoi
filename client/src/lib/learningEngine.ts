/**
 * Learning Engine for PoiPoi AI
 * Manages learning records and statistics
 */

export interface LearningRecord {
  id: number;
  date: string;
  success: boolean;
  data?: any;
  [key: string]: any;
}

export interface Statistics {
  success: number;
  fail: number;
}

class LearningEngine {
  private records: LearningRecord[] = [];
  private statistics: Statistics = {
    success: 0,
    fail: 0,
  };
  private maxRecords = 100000;

  /**
   * Add learning data
   */
  learn(data: any): LearningRecord {
    const record: LearningRecord = {
      id: Date.now(),
      date: new Date().toISOString(),
      ...data,
    };

    this.records.push(record);

    if (data.success) {
      this.statistics.success++;
    } else {
      this.statistics.fail++;
    }

    // Keep records manageable
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }

    console.log(`📚 学習データ追加: ${data.success ? "成功" : "失敗"}`);

    return record;
  }

  /**
   * Get all learning records
   */
  getRecords(): LearningRecord[] {
    return [...this.records];
  }

  /**
   * Get latest record
   */
  getLatest(): LearningRecord | undefined {
    return this.records[this.records.length - 1];
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    const total = this.statistics.success + this.statistics.fail;
    if (total === 0) return 0;
    return (this.statistics.success / total) * 100;
  }

  /**
   * Get statistics
   */
  getStatistics(): Statistics {
    return { ...this.statistics };
  }

  /**
   * Get records by success status
   */
  getByStatus(success: boolean): LearningRecord[] {
    return this.records.filter((r) => r.success === success);
  }

  /**
   * Get recent records
   */
  getRecent(limit: number = 10): LearningRecord[] {
    return this.records.slice(-limit);
  }

  /**
   * Get records by date range
   */
  getByDateRange(startDate: Date, endDate: Date): LearningRecord[] {
    const start = startDate.getTime();
    const end = endDate.getTime();

    return this.records.filter((r) => {
      const time = new Date(r.date).getTime();
      return time >= start && time <= end;
    });
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.records = [];
    this.statistics = {
      success: 0,
      fail: 0,
    };
    console.log("🧹 すべての学習データをクリアしました");
  }

  /**
   * Export records as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        records: this.records,
        statistics: this.statistics,
        successRate: this.getSuccessRate(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  /**
   * Get summary
   */
  getSummary() {
    return {
      total: this.records.length,
      success: this.statistics.success,
      fail: this.statistics.fail,
      successRate: this.getSuccessRate().toFixed(2),
      latestRecord: this.getLatest(),
    };
  }
}

export default LearningEngine;
