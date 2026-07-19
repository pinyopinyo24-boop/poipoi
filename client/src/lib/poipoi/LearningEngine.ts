/**
 * Learning Engine - PoiPoi AI Core
 * 学習データ管理
 */

import type { LearningRecord, LearningStats } from "./types";

class LearningEngine {
  private records: LearningRecord[] = [];
  private statistics = {
    success: 0,
    fail: 0,
  };

  learn(data: any): LearningRecord {
    const record: LearningRecord = {
      id: Date.now(),
      date: new Date().toISOString(),
      success: data.success || false,
      data,
    };

    this.records.push(record);

    if (data.success) {
      this.statistics.success++;
    } else {
      this.statistics.fail++;
    }

    console.log(`📚 学習データ追加: ${data.success ? "成功" : "失敗"}`);

    return record;
  }

  getRecords(): LearningRecord[] {
    return [...this.records];
  }

  getLatest(): LearningRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getSuccessRate(): number {
    const total = this.statistics.success + this.statistics.fail;
    if (total === 0) return 0;
    return (this.statistics.success / total) * 100;
  }

  getStatistics() {
    return { ...this.statistics };
  }

  getSummary(): LearningStats {
    return {
      total: this.records.length,
      success: this.statistics.success,
      fail: this.statistics.fail,
      successRate: this.getSuccessRate(),
    };
  }
}

export default LearningEngine;
