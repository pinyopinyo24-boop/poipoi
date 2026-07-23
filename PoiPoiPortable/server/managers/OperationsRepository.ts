/**
 * OperationsRepository
 * 運用データの永続化・履歴管理・バックアップ
 */

export interface OperationsSnapshot {
  snapshotId: string;
  timestamp: number;
  operationMetrics: Record<string, unknown>;
  alertCount: number;
  incidentCount: number;
  deploymentStatus: string;
  systemHealth: number;
}

export interface OperationsHistory {
  historyId: string;
  timestamp: number;
  eventType: 'metric' | 'alert' | 'incident' | 'deployment' | 'update';
  eventData: Record<string, unknown>;
  userId?: string;
}

export interface BackupRecord {
  backupId: string;
  timestamp: number;
  backupType: 'full' | 'incremental';
  dataSize: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  location: string;
  completedAt?: number;
}

export class OperationsRepository {
  private snapshots: Map<string, OperationsSnapshot> = new Map();
  private history: Map<string, OperationsHistory> = new Map();
  private backups: Map<string, BackupRecord> = new Map();
  private snapshotsByTimestamp: Map<number, string[]> = new Map();
  private historyByType: Map<string, string[]> = new Map();
  private backupsByStatus: Map<string, string[]> = new Map();

  /**
   * スナップショットを作成
   */
  createSnapshot(
    operationMetrics: Record<string, unknown>,
    alertCount: number,
    incidentCount: number,
    deploymentStatus: string,
    systemHealth: number
  ): OperationsSnapshot {
    const snapshotId = `SNP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    const snapshot: OperationsSnapshot = {
      snapshotId,
      timestamp,
      operationMetrics,
      alertCount,
      incidentCount,
      deploymentStatus,
      systemHealth,
    };

    this.snapshots.set(snapshotId, snapshot);

    if (!this.snapshotsByTimestamp.has(timestamp)) {
      this.snapshotsByTimestamp.set(timestamp, []);
    }
    this.snapshotsByTimestamp.get(timestamp)!.push(snapshotId);

    return snapshot;
  }

  /**
   * スナップショットを取得
   */
  getSnapshot(snapshotId: string): OperationsSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  /**
   * 最新スナップショットを取得
   */
  getLatestSnapshot(): OperationsSnapshot | undefined {
    const allSnapshots = Array.from(this.snapshots.values());
    if (allSnapshots.length === 0) return undefined;

    return allSnapshots.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );
  }

  /**
   * 時間範囲内のスナップショットを取得
   */
  getSnapshotsByTimeRange(startTime: number, endTime: number): OperationsSnapshot[] {
    const allSnapshots = Array.from(this.snapshots.values());
    return allSnapshots.filter(s => s.timestamp >= startTime && s.timestamp <= endTime);
  }

  /**
   * 履歴イベントを記録
   */
  recordHistoryEvent(
    eventType: 'metric' | 'alert' | 'incident' | 'deployment' | 'update',
    eventData: Record<string, unknown>,
    userId?: string
  ): OperationsHistory {
    const historyId = `HIS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const historyEvent: OperationsHistory = {
      historyId,
      timestamp: Date.now(),
      eventType,
      eventData,
      userId,
    };

    this.history.set(historyId, historyEvent);

    if (!this.historyByType.has(eventType)) {
      this.historyByType.set(eventType, []);
    }
    this.historyByType.get(eventType)!.push(historyId);

    return historyEvent;
  }

  /**
   * 履歴イベントを取得
   */
  getHistoryEvent(historyId: string): OperationsHistory | undefined {
    return this.history.get(historyId);
  }

  /**
   * タイプ別履歴を取得
   */
  getHistoryByType(eventType: 'metric' | 'alert' | 'incident' | 'deployment' | 'update'): OperationsHistory[] {
    const ids = this.historyByType.get(eventType) || [];
    return ids
      .map(id => this.history.get(id))
      .filter((h): h is OperationsHistory => h !== undefined);
  }

  /**
   * バックアップを作成
   */
  createBackup(
    backupType: 'full' | 'incremental',
    dataSize: number,
    location: string
  ): BackupRecord {
    const backupId = `BKP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const backup: BackupRecord = {
      backupId,
      timestamp: Date.now(),
      backupType,
      dataSize,
      status: 'pending',
      location,
    };

    this.backups.set(backupId, backup);

    if (!this.backupsByStatus.has('pending')) {
      this.backupsByStatus.set('pending', []);
    }
    this.backupsByStatus.get('pending')!.push(backupId);

    return backup;
  }

  /**
   * バックアップを取得
   */
  getBackup(backupId: string): BackupRecord | undefined {
    return this.backups.get(backupId);
  }

  /**
   * ステータス別バックアップを取得
   */
  getBackupsByStatus(status: 'pending' | 'in_progress' | 'completed' | 'failed'): BackupRecord[] {
    const ids = this.backupsByStatus.get(status) || [];
    return ids
      .map(id => this.backups.get(id))
      .filter((b): b is BackupRecord => b !== undefined);
  }

  /**
   * バックアップを開始
   */
  startBackup(backupId: string): boolean {
    const backup = this.backups.get(backupId);
    if (!backup) return false;

    const pendingIds = this.backupsByStatus.get('pending') || [];
    const index = pendingIds.indexOf(backupId);
    if (index > -1) {
      pendingIds.splice(index, 1);
    }

    backup.status = 'in_progress';

    if (!this.backupsByStatus.has('in_progress')) {
      this.backupsByStatus.set('in_progress', []);
    }
    this.backupsByStatus.get('in_progress')!.push(backupId);

    return true;
  }

  /**
   * バックアップを完了
   */
  completeBackup(backupId: string): boolean {
    const backup = this.backups.get(backupId);
    if (!backup) return false;

    const inProgressIds = this.backupsByStatus.get('in_progress') || [];
    const index = inProgressIds.indexOf(backupId);
    if (index > -1) {
      inProgressIds.splice(index, 1);
    }

    backup.status = 'completed';
    backup.completedAt = Date.now();

    if (!this.backupsByStatus.has('completed')) {
      this.backupsByStatus.set('completed', []);
    }
    this.backupsByStatus.get('completed')!.push(backupId);

    return true;
  }

  /**
   * 全スナップショットを取得
   */
  getAllSnapshots(): OperationsSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * 全履歴を取得
   */
  getAllHistory(): OperationsHistory[] {
    return Array.from(this.history.values());
  }

  /**
   * 全バックアップを取得
   */
  getAllBackups(): BackupRecord[] {
    return Array.from(this.backups.values());
  }

  /**
   * リポジトリ統計を計算
   */
  getRepositoryStats(): {
    totalSnapshots: number;
    totalHistoryEvents: number;
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
      totalHistoryEvents: allHistory.length,
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

    const timestampIds = this.snapshotsByTimestamp.get(snapshot.timestamp) || [];
    const index = timestampIds.indexOf(snapshotId);
    if (index > -1) {
      timestampIds.splice(index, 1);
    }

    this.snapshots.delete(snapshotId);
    return true;
  }

  /**
   * 履歴イベントを削除
   */
  deleteHistoryEvent(historyId: string): boolean {
    const event = this.history.get(historyId);
    if (!event) return false;

    const typeIds = this.historyByType.get(event.eventType) || [];
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

    const statusIds = this.backupsByStatus.get(backup.status) || [];
    const index = statusIds.indexOf(backupId);
    if (index > -1) {
      statusIds.splice(index, 1);
    }

    this.backups.delete(backupId);
    return true;
  }
}
