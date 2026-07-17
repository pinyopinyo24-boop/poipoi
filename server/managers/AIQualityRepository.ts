/**
 * AIQualityRepository
 * AI品質データの永続化・バージョン管理・スナップショット
 */

export interface QualitySnapshot {
  snapshotId: string;
  timestamp: number;
  version: number;
  qualityMetrics: {
    totalMetrics: number;
    averageAccuracy: number;
    averageNaturalness: number;
    averageConsistency: number;
    averageEvidenceScore: number;
  };
  conversationMetrics: {
    totalQualityRecords: number;
    averageContextMaintenance: number;
    averageIntentUnderstanding: number;
    averageCoherence: number;
    averageContinuationRate: number;
  };
  evaluationMetrics: {
    totalEvaluations: number;
    averageAccuracy: number;
    averageRelevance: number;
    goodResponses: number;
    poorResponses: number;
  };
  status: 'active' | 'archived';
}

export interface QualityHistory {
  historyId: string;
  timestamp: number;
  changeType: 'metric_recorded' | 'alert_created' | 'trend_recorded' | 'quality_updated';
  description: string;
  affectedEntity: string;
  changeDetails: Record<string, unknown>;
}

export interface QualityBackup {
  backupId: string;
  timestamp: number;
  snapshotId: string;
  dataSize: number; // bytes
  status: 'completed' | 'failed' | 'in_progress';
  retentionDays: number;
}

export class AIQualityRepository {
  private snapshots: Map<string, QualitySnapshot> = new Map();
  private history: Map<string, QualityHistory> = new Map();
  private backups: Map<string, QualityBackup> = new Map();
  private snapshotsByVersion: Map<number, string> = new Map();
  private historyByChangeType: Map<string, string[]> = new Map();
  private backupsBySnapshot: Map<string, string[]> = new Map();
  private backupsByStatus: Map<string, string[]> = new Map();

  /**
   * スナップショットを作成
   */
  createSnapshot(
    version: number,
    qualityMetrics: Record<string, number>,
    conversationMetrics: Record<string, number>,
    evaluationMetrics: Record<string, number>
  ): QualitySnapshot {
    const snapshotId = `QS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const snapshot: QualitySnapshot = {
      snapshotId,
      timestamp: Date.now(),
      version,
      qualityMetrics: {
        totalMetrics: qualityMetrics['totalMetrics'] || 0,
        averageAccuracy: qualityMetrics['averageAccuracy'] || 0,
        averageNaturalness: qualityMetrics['averageNaturalness'] || 0,
        averageConsistency: qualityMetrics['averageConsistency'] || 0,
        averageEvidenceScore: qualityMetrics['averageEvidenceScore'] || 0,
      },
      conversationMetrics: {
        totalQualityRecords: conversationMetrics['totalQualityRecords'] || 0,
        averageContextMaintenance: conversationMetrics['averageContextMaintenance'] || 0,
        averageIntentUnderstanding: conversationMetrics['averageIntentUnderstanding'] || 0,
        averageCoherence: conversationMetrics['averageCoherence'] || 0,
        averageContinuationRate: conversationMetrics['averageContinuationRate'] || 0,
      },
      evaluationMetrics: {
        totalEvaluations: evaluationMetrics['totalEvaluations'] || 0,
        averageAccuracy: evaluationMetrics['averageAccuracy'] || 0,
        averageRelevance: evaluationMetrics['averageRelevance'] || 0,
        goodResponses: evaluationMetrics['goodResponses'] || 0,
        poorResponses: evaluationMetrics['poorResponses'] || 0,
      },
      status: 'active',
    };

    this.snapshots.set(snapshotId, snapshot);
    this.snapshotsByVersion.set(version, snapshotId);

    return snapshot;
  }

  /**
   * スナップショットを取得
   */
  getSnapshot(snapshotId: string): QualitySnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  /**
   * バージョン別スナップショットを取得
   */
  getSnapshotByVersion(version: number): QualitySnapshot | undefined {
    const snapshotId = this.snapshotsByVersion.get(version);
    return snapshotId ? this.snapshots.get(snapshotId) : undefined;
  }

  /**
   * 全スナップショットを取得
   */
  getAllSnapshots(): QualitySnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * スナップショットをアーカイブ
   */
  archiveSnapshot(snapshotId: string): boolean {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return false;

    snapshot.status = 'archived';
    return true;
  }

  /**
   * 履歴を記録
   */
  recordHistory(
    changeType: 'metric_recorded' | 'alert_created' | 'trend_recorded' | 'quality_updated',
    description: string,
    affectedEntity: string,
    changeDetails: Record<string, unknown>
  ): QualityHistory {
    const historyId = `QH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const historyRecord: QualityHistory = {
      historyId,
      timestamp: Date.now(),
      changeType,
      description,
      affectedEntity,
      changeDetails,
    };

    this.history.set(historyId, historyRecord);

    if (!this.historyByChangeType.has(changeType)) {
      this.historyByChangeType.set(changeType, []);
    }
    this.historyByChangeType.get(changeType)!.push(historyId);

    return historyRecord;
  }

  /**
   * 履歴を取得
   */
  getHistory(historyId: string): QualityHistory | undefined {
    return this.history.get(historyId);
  }

  /**
   * タイプ別履歴を取得
   */
  getHistoryByChangeType(changeType: string): QualityHistory[] {
    const ids = this.historyByChangeType.get(changeType) || [];
    return ids
      .map(id => this.history.get(id))
      .filter((h): h is QualityHistory => h !== undefined);
  }

  /**
   * 全履歴を取得
   */
  getAllHistory(): QualityHistory[] {
    return Array.from(this.history.values());
  }

  /**
   * バックアップを作成
   */
  createBackup(snapshotId: string, dataSize: number, retentionDays: number): QualityBackup {
    const backupId = `QB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const backup: QualityBackup = {
      backupId,
      timestamp: Date.now(),
      snapshotId,
      dataSize,
      status: 'completed',
      retentionDays,
    };

    this.backups.set(backupId, backup);

    if (!this.backupsBySnapshot.has(snapshotId)) {
      this.backupsBySnapshot.set(snapshotId, []);
    }
    this.backupsBySnapshot.get(snapshotId)!.push(backupId);

    if (!this.backupsByStatus.has('completed')) {
      this.backupsByStatus.set('completed', []);
    }
    this.backupsByStatus.get('completed')!.push(backupId);

    return backup;
  }

  /**
   * バックアップを取得
   */
  getBackup(backupId: string): QualityBackup | undefined {
    return this.backups.get(backupId);
  }

  /**
   * スナップショット別バックアップを取得
   */
  getBackupsBySnapshot(snapshotId: string): QualityBackup[] {
    const ids = this.backupsBySnapshot.get(snapshotId) || [];
    return ids
      .map(id => this.backups.get(id))
      .filter((b): b is QualityBackup => b !== undefined);
  }

  /**
   * ステータス別バックアップを取得
   */
  getBackupsByStatus(status: 'completed' | 'failed' | 'in_progress'): QualityBackup[] {
    const ids = this.backupsByStatus.get(status) || [];
    return ids
      .map(id => this.backups.get(id))
      .filter((b): b is QualityBackup => b !== undefined);
  }

  /**
   * 全バックアップを取得
   */
  getAllBackups(): QualityBackup[] {
    return Array.from(this.backups.values());
  }

  /**
   * バックアップを失敗
   */
  failBackup(backupId: string): boolean {
    const backup = this.backups.get(backupId);
    if (!backup) return false;

    const completedIds = this.backupsByStatus.get('completed') || [];
    const index = completedIds.indexOf(backupId);
    if (index > -1) {
      completedIds.splice(index, 1);
    }

    backup.status = 'failed';

    if (!this.backupsByStatus.has('failed')) {
      this.backupsByStatus.set('failed', []);
    }
    this.backupsByStatus.get('failed')!.push(backupId);

    return true;
  }

  /**
   * リポジトリ統計を計算
   */
  getRepositoryStats(): {
    totalSnapshots: number;
    activeSnapshots: number;
    totalHistoryRecords: number;
    totalBackups: number;
    completedBackups: number;
    failedBackups: number;
    totalBackupSize: number;
  } {
    const allSnapshots = Array.from(this.snapshots.values());
    const allHistory = Array.from(this.history.values());
    const allBackups = Array.from(this.backups.values());

    let totalBackupSize = 0;

    for (const backup of allBackups) {
      totalBackupSize += backup.dataSize;
    }

    return {
      totalSnapshots: allSnapshots.length,
      activeSnapshots: allSnapshots.filter(s => s.status === 'active').length,
      totalHistoryRecords: allHistory.length,
      totalBackups: allBackups.length,
      completedBackups: allBackups.filter(b => b.status === 'completed').length,
      failedBackups: allBackups.filter(b => b.status === 'failed').length,
      totalBackupSize,
    };
  }

  /**
   * スナップショットを削除
   */
  deleteSnapshot(snapshotId: string): boolean {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return false;

    const versionIds = Array.from(this.snapshotsByVersion.entries());
    for (const [version, id] of versionIds) {
      if (id === snapshotId) {
        this.snapshotsByVersion.delete(version);
      }
    }

    this.snapshots.delete(snapshotId);
    return true;
  }

  /**
   * 履歴を削除
   */
  deleteHistory(historyId: string): boolean {
    const historyRecord = this.history.get(historyId);
    if (!historyRecord) return false;

    const typeIds = this.historyByChangeType.get(historyRecord.changeType) || [];
    const index = typeIds.indexOf(historyId);
    if (index > -1) {
      typeIds.splice(index, 1);
    }

    this.history.delete(historyId);
    return true;
  }

  /**
   * バックアップを削除
   */
  deleteBackup(backupId: string): boolean {
    const backup = this.backups.get(backupId);
    if (!backup) return false;

    const snapshotIds = this.backupsBySnapshot.get(backup.snapshotId) || [];
    const snapshotIndex = snapshotIds.indexOf(backupId);
    if (snapshotIndex > -1) {
      snapshotIds.splice(snapshotIndex, 1);
    }

    const statusIds = this.backupsByStatus.get(backup.status) || [];
    const statusIndex = statusIds.indexOf(backupId);
    if (statusIndex > -1) {
      statusIds.splice(statusIndex, 1);
    }

    this.backups.delete(backupId);
    return true;
  }
}
