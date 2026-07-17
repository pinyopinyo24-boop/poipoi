/**
 * ReleaseCandidateRepository
 * RC1データ永続化・スナップショット・バックアップ
 */

export interface RCSnapshot {
  snapshotId: string;
  timestamp: number;
  rcId: string;
  version: string;
  data: Record<string, any>;
}

export interface RCBackup {
  backupId: string;
  timestamp: number;
  rcId: string;
  backupType: 'full' | 'incremental' | 'differential';
  filePath: string;
  fileSize: number;
  checksum: string;
  status: 'completed' | 'failed' | 'in_progress';
}

export interface RCHistory {
  historyId: string;
  timestamp: number;
  rcId: string;
  action: string;
  details: Record<string, any>;
  actor: string;
}

export class ReleaseCandidateRepository {
  private snapshots: Map<string, RCSnapshot> = new Map();
  private backups: Map<string, RCBackup> = new Map();
  private histories: Map<string, RCHistory> = new Map();
  private snapshotsByRc: Map<string, string[]> = new Map();
  private backupsByRc: Map<string, string[]> = new Map();
  private historiesByRc: Map<string, string[]> = new Map();

  /**
   * スナップショットを作成
   */
  createSnapshot(rcId: string, version: string, data: Record<string, any>): RCSnapshot {
    const snapshotId = `SNAP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const snapshot: RCSnapshot = {
      snapshotId,
      timestamp: Date.now(),
      rcId,
      version,
      data,
    };

    this.snapshots.set(snapshotId, snapshot);

    if (!this.snapshotsByRc.has(rcId)) {
      this.snapshotsByRc.set(rcId, []);
    }
    this.snapshotsByRc.get(rcId)!.push(snapshotId);

    return snapshot;
  }

  /**
   * スナップショットを取得
   */
  getSnapshot(snapshotId: string): RCSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  /**
   * RC別スナップショットを取得
   */
  getSnapshotsByRc(rcId: string): RCSnapshot[] {
    const ids = this.snapshotsByRc.get(rcId) || [];
    return ids
      .map(id => this.snapshots.get(id))
      .filter((s): s is RCSnapshot => s !== undefined);
  }

  /**
   * 最新スナップショットを取得
   */
  getLatestSnapshot(rcId: string): RCSnapshot | undefined {
    const snapshots = this.getSnapshotsByRc(rcId);
    if (snapshots.length === 0) return undefined;
    return snapshots.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  /**
   * 全スナップショットを取得
   */
  getAllSnapshots(): RCSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * バックアップを作成
   */
  createBackup(
    rcId: string,
    backupType: 'full' | 'incremental' | 'differential',
    filePath: string,
    fileSize: number
  ): RCBackup {
    const backupId = `BKP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const backup: RCBackup = {
      backupId,
      timestamp: Date.now(),
      rcId,
      backupType,
      filePath,
      fileSize,
      checksum: this.generateChecksum(filePath),
      status: 'completed',
    };

    this.backups.set(backupId, backup);

    if (!this.backupsByRc.has(rcId)) {
      this.backupsByRc.set(rcId, []);
    }
    this.backupsByRc.get(rcId)!.push(backupId);

    return backup;
  }

  /**
   * バックアップを取得
   */
  getBackup(backupId: string): RCBackup | undefined {
    return this.backups.get(backupId);
  }

  /**
   * RC別バックアップを取得
   */
  getBackupsByRc(rcId: string): RCBackup[] {
    const ids = this.backupsByRc.get(rcId) || [];
    return ids
      .map(id => this.backups.get(id))
      .filter((b): b is RCBackup => b !== undefined);
  }

  /**
   * 最新バックアップを取得
   */
  getLatestBackup(rcId: string): RCBackup | undefined {
    const backups = this.getBackupsByRc(rcId);
    if (backups.length === 0) return undefined;
    return backups.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  /**
   * 全バックアップを取得
   */
  getAllBackups(): RCBackup[] {
    return Array.from(this.backups.values());
  }

  /**
   * 履歴を作成
   */
  createHistory(rcId: string, action: string, details: Record<string, any>, actor: string): RCHistory {
    const historyId = `HIST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const history: RCHistory = {
      historyId,
      timestamp: Date.now(),
      rcId,
      action,
      details,
      actor,
    };

    this.histories.set(historyId, history);

    if (!this.historiesByRc.has(rcId)) {
      this.historiesByRc.set(rcId, []);
    }
    this.historiesByRc.get(rcId)!.push(historyId);

    return history;
  }

  /**
   * 履歴を取得
   */
  getHistory(historyId: string): RCHistory | undefined {
    return this.histories.get(historyId);
  }

  /**
   * RC別履歴を取得
   */
  getHistoriesByRc(rcId: string): RCHistory[] {
    const ids = this.historiesByRc.get(rcId) || [];
    return ids
      .map(id => this.histories.get(id))
      .filter((h): h is RCHistory => h !== undefined);
  }

  /**
   * 全履歴を取得
   */
  getAllHistories(): RCHistory[] {
    return Array.from(this.histories.values());
  }

  /**
   * スナップショットから復元
   */
  restoreFromSnapshot(snapshotId: string): RCSnapshot | undefined {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return undefined;

    // スナップショットを復元
    return snapshot;
  }

  /**
   * バックアップから復元
   */
  restoreFromBackup(backupId: string): RCBackup | undefined {
    const backup = this.backups.get(backupId);
    if (!backup) return undefined;

    // バックアップを復元
    return backup;
  }

  /**
   * リポジトリ統計を計算
   */
  getRepositoryStats(): {
    totalSnapshots: number;
    totalBackups: number;
    totalHistories: number;
    completedBackups: number;
    failedBackups: number;
    inProgressBackups: number;
    totalBackupSize: number;
    averageSnapshotSize: number;
  } {
    const allSnapshots = Array.from(this.snapshots.values());
    const allBackups = Array.from(this.backups.values());
    const allHistories = Array.from(this.histories.values());

    let totalBackupSize = 0;
    for (const backup of allBackups) {
      totalBackupSize += backup.fileSize;
    }

    let totalSnapshotSize = 0;
    for (const snapshot of allSnapshots) {
      totalSnapshotSize += JSON.stringify(snapshot.data).length;
    }
    const averageSnapshotSize = allSnapshots.length > 0 ? totalSnapshotSize / allSnapshots.length : 0;

    return {
      totalSnapshots: allSnapshots.length,
      totalBackups: allBackups.length,
      totalHistories: allHistories.length,
      completedBackups: allBackups.filter(b => b.status === 'completed').length,
      failedBackups: allBackups.filter(b => b.status === 'failed').length,
      inProgressBackups: allBackups.filter(b => b.status === 'in_progress').length,
      totalBackupSize,
      averageSnapshotSize,
    };
  }

  /**
   * チェックサムを生成
   */
  private generateChecksum(filePath: string): string {
    return `checksum-${filePath.length}-${Date.now()}`;
  }

  /**
   * スナップショットを削除
   */
  deleteSnapshot(snapshotId: string): boolean {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return false;

    const rcIds = this.snapshotsByRc.get(snapshot.rcId) || [];
    const index = rcIds.indexOf(snapshotId);
    if (index > -1) {
      rcIds.splice(index, 1);
    }

    return this.snapshots.delete(snapshotId);
  }

  /**
   * バックアップを削除
   */
  deleteBackup(backupId: string): boolean {
    const backup = this.backups.get(backupId);
    if (!backup) return false;

    const rcIds = this.backupsByRc.get(backup.rcId) || [];
    const index = rcIds.indexOf(backupId);
    if (index > -1) {
      rcIds.splice(index, 1);
    }

    return this.backups.delete(backupId);
  }

  /**
   * 履歴を削除
   */
  deleteHistory(historyId: string): boolean {
    const history = this.histories.get(historyId);
    if (!history) return false;

    const rcIds = this.historiesByRc.get(history.rcId) || [];
    const index = rcIds.indexOf(historyId);
    if (index > -1) {
      rcIds.splice(index, 1);
    }

    return this.histories.delete(historyId);
  }
}
