/**
 * SyncRepository - 同期データ永続化
 * 
 * 機能:
 * - 同期データの永続化
 * - 同期履歴の記録
 * - 同期状態の保存
 * - クエリ機能
 */

export interface SyncRecord {
  id: string;
  userId: number;
  type: string;
  action: 'create' | 'update' | 'delete';
  data: Record<string, any>;
  version: number;
  timestamp: number;
  synced: boolean;
  syncedAt?: number;
  error?: string;
}

export interface SyncQuery {
  userId?: number;
  type?: string;
  action?: 'create' | 'update' | 'delete';
  synced?: boolean;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

export class SyncRepository {
  private static instance: SyncRepository;
  private records: Map<string, SyncRecord> = new Map();
  private userRecords: Map<number, string[]> = new Map();
  private recordCounter: number = 0;

  private constructor() {}

  static getInstance(): SyncRepository {
    if (!SyncRepository.instance) {
      SyncRepository.instance = new SyncRepository();
    }
    return SyncRepository.instance;
  }

  /**
   * レコード作成
   */
  createRecord(
    userId: number,
    type: string,
    action: 'create' | 'update' | 'delete',
    data: Record<string, any>,
    version: number = 1
  ): SyncRecord {
    const id = `sync_${++this.recordCounter}_${Date.now()}`;
    const record: SyncRecord = {
      id,
      userId,
      type,
      action,
      data,
      version,
      timestamp: Date.now(),
      synced: false,
    };

    this.records.set(id, record);

    // ユーザーレコードインデックスを更新
    if (!this.userRecords.has(userId)) {
      this.userRecords.set(userId, []);
    }
    const userRecs = this.userRecords.get(userId);
    if (userRecs) {
      userRecs.push(id);
    }

    return record;
  }

  /**
   * レコード取得
   */
  getRecord(id: string): SyncRecord | null {
    return this.records.get(id) || null;
  }

  /**
   * レコード更新
   */
  updateRecord(id: string, data: Partial<SyncRecord>): SyncRecord | null {
    const record = this.records.get(id);
    if (!record) return null;

    const updated = { ...record, ...data };
    this.records.set(id, updated);
    return updated;
  }

  /**
   * レコード削除
   */
  deleteRecord(id: string): boolean {
    const record = this.records.get(id);
    if (!record) return false;

    this.records.delete(id);

    // ユーザーインデックスから削除
    const userRecs = this.userRecords.get(record.userId);
    if (userRecs) {
      const index = userRecs.indexOf(id);
      if (index !== -1) {
        userRecs.splice(index, 1);
      }
    }

    return true;
  }

  /**
   * 同期マーク
   */
  markSynced(id: string, error?: string): SyncRecord | null {
    const record = this.records.get(id);
    if (!record) return null;

    record.synced = true;
    record.syncedAt = Date.now();
    if (error) {
      record.error = error;
    }

    return record;
  }

  /**
   * クエリ実行
   */
  query(query: SyncQuery): SyncRecord[] {
    let results: SyncRecord[] = [];

    // ユーザーIDでフィルタ
    if (query.userId !== undefined) {
      const userRecs = this.userRecords.get(query.userId) || [];
      results = userRecs
        .map(id => this.records.get(id))
        .filter((r): r is SyncRecord => r !== null);
    } else {
      results = Array.from(this.records.values());
    }

    // タイプでフィルタ
    if (query.type) {
      results = results.filter(r => r.type === query.type);
    }

    // アクションでフィルタ
    if (query.action) {
      results = results.filter(r => r.action === query.action);
    }

    // 同期状態でフィルタ
    if (query.synced !== undefined) {
      results = results.filter(r => r.synced === query.synced);
    }

    // 時間範囲でフィルタ
    if (query.startTime !== undefined) {
      results = results.filter(r => r.timestamp >= query.startTime!);
    }
    if (query.endTime !== undefined) {
      results = results.filter(r => r.timestamp <= query.endTime!);
    }

    // ソート
    results.sort((a, b) => b.timestamp - a.timestamp);

    // ページネーション
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    results = results.slice(offset, offset + limit);

    return results;
  }

  /**
   * 未同期レコード取得
   */
  getUnsyncedRecords(userId: number, limit: number = 100): SyncRecord[] {
    return this.query({
      userId,
      synced: false,
      limit,
    });
  }

  /**
   * 同期済みレコード取得
   */
  getSyncedRecords(userId: number, limit: number = 100): SyncRecord[] {
    return this.query({
      userId,
      synced: true,
      limit,
    });
  }

  /**
   * ユーザーレコード数取得
   */
  getUserRecordCount(userId: number): number {
    return this.userRecords.get(userId)?.length || 0;
  }

  /**
   * 未同期レコード数取得
   */
  getUnsyncedCount(userId: number): number {
    const records = this.getUnsyncedRecords(userId, 999999);
    return records.length;
  }

  /**
   * 同期統計取得
   */
  getSyncStats(userId: number): {
    totalRecords: number;
    syncedRecords: number;
    unsyncedRecords: number;
    createRecords: number;
    updateRecords: number;
    deleteRecords: number;
  } {
    const userRecs = this.userRecords.get(userId) || [];
    const records = userRecs
      .map(id => this.records.get(id))
      .filter((r): r is SyncRecord => r !== null);

    const synced = records.filter(r => r.synced).length;
    const unsynced = records.filter(r => !r.synced).length;
    const creates = records.filter(r => r.action === 'create').length;
    const updates = records.filter(r => r.action === 'update').length;
    const deletes = records.filter(r => r.action === 'delete').length;

    return {
      totalRecords: records.length,
      syncedRecords: synced,
      unsyncedRecords: unsynced,
      createRecords: creates,
      updateRecords: updates,
      deleteRecords: deletes,
    };
  }

  /**
   * 古いレコード削除
   */
  cleanupOldRecords(userId: number, daysOld: number = 30): number {
    const userRecs = this.userRecords.get(userId) || [];
    const now = Date.now();
    const cutoffTime = now - daysOld * 86400000;

    let deletedCount = 0;
    const toDelete: string[] = [];

    for (const id of userRecs) {
      const record = this.records.get(id);
      if (record && record.timestamp < cutoffTime && record.synced) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.deleteRecord(id);
      deletedCount++;
    }

    return deletedCount;
  }

  /**
   * ユーザーレコード削除
   */
  deleteUserRecords(userId: number): number {
    const userRecs = this.userRecords.get(userId) || [];
    let deletedCount = 0;

    for (const id of [...userRecs]) {
      this.deleteRecord(id);
      deletedCount++;
    }

    return deletedCount;
  }

  /**
   * バッチ同期
   */
  batchMarkSynced(ids: string[]): number {
    let count = 0;
    for (const id of ids) {
      if (this.markSynced(id)) {
        count++;
      }
    }
    return count;
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.records.clear();
    this.userRecords.clear();
    this.recordCounter = 0;
  }

  /**
   * 統計情報取得
   */
  getRepositoryStats(): {
    totalRecords: number;
    totalUsers: number;
    syncedRecords: number;
    unsyncedRecords: number;
  } {
    let syncedCount = 0;
    let unsyncedCount = 0;

    this.records.forEach(record => {
      if (record.synced) {
        syncedCount++;
      } else {
        unsyncedCount++;
      }
    });

    return {
      totalRecords: this.records.size,
      totalUsers: this.userRecords.size,
      syncedRecords: syncedCount,
      unsyncedRecords: unsyncedCount,
    };
  }
}

export const syncRepository = SyncRepository.getInstance();
export default syncRepository;
