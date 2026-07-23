/**
 * CloudSyncService - クラウド同期管理
 * 
 * 機能:
 * - データ同期
 * - 差分同期
 * - 同期状態管理
 * - 競合解決
 */

export interface SyncData {
  id: string;
  userId: number;
  type: string;
  data: Record<string, any>;
  version: number;
  timestamp: number;
  hash: string;
}

export interface SyncState {
  lastSyncTime: number;
  nextSyncTime: number;
  isSyncing: boolean;
  syncProgress: number;
  pendingChanges: number;
  lastError?: string;
}

export interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge';
  timestamp: number;
  resolvedData: Record<string, any>;
}

export class CloudSyncService {
  private static instance: CloudSyncService;
  private syncStates: Map<number, SyncState> = new Map();
  private pendingChanges: Map<number, SyncData[]> = new Map();
  private syncHistory: Map<number, SyncData[]> = new Map();
  private readonly SYNC_INTERVAL_MS = 300000; // 5 minutes

  private constructor() {}

  static getInstance(): CloudSyncService {
    if (!CloudSyncService.instance) {
      CloudSyncService.instance = new CloudSyncService();
    }
    return CloudSyncService.instance;
  }

  /**
   * 同期状態初期化
   */
  initializeSyncState(userId: number): SyncState {
    const now = Date.now();
    const state: SyncState = {
      lastSyncTime: now,
      nextSyncTime: now + this.SYNC_INTERVAL_MS,
      isSyncing: false,
      syncProgress: 0,
      pendingChanges: 0,
    };

    this.syncStates.set(userId, state);
    return state;
  }

  /**
   * 同期状態取得
   */
  getSyncState(userId: number): SyncState | null {
    return this.syncStates.get(userId) || null;
  }

  /**
   * データ追加
   */
  addData(userId: number, data: SyncData): boolean {
    try {
      if (!this.pendingChanges.has(userId)) {
        this.pendingChanges.set(userId, []);
      }

      const changes = this.pendingChanges.get(userId);
      if (changes) {
        changes.push(data);
      }

      // 同期状態を更新
      const state = this.syncStates.get(userId);
      if (state) {
        state.pendingChanges = changes?.length || 0;
      }

      return true;
    } catch (error) {
      console.error('Failed to add data:', error);
      return false;
    }
  }

  /**
   * 同期実行
   */
  async sync(userId: number): Promise<{
    success: boolean;
    syncedCount: number;
    error?: string;
  }> {
    try {
      const state = this.syncStates.get(userId);
      if (!state) {
        return { success: false, syncedCount: 0, error: 'Sync state not found' };
      }

      if (state.isSyncing) {
        return { success: false, syncedCount: 0, error: 'Sync already in progress' };
      }

      state.isSyncing = true;
      state.syncProgress = 0;

      const changes = this.pendingChanges.get(userId) || [];
      let syncedCount = 0;

      for (let i = 0; i < changes.length; i++) {
        const data = changes[i];
        
        // 同期処理
        const result = await this.syncData(userId, data);
        if (result) {
          syncedCount++;
        }

        // 進捗更新
        state.syncProgress = Math.round(((i + 1) / changes.length) * 100);
      }

      // 同期完了
      state.isSyncing = false;
      state.lastSyncTime = Date.now();
      state.nextSyncTime = Date.now() + this.SYNC_INTERVAL_MS;
      state.pendingChanges = 0;

      // 同期済みデータをクリア
      this.pendingChanges.set(userId, []);

      return { success: true, syncedCount };
    } catch (error) {
      const state = this.syncStates.get(userId);
      if (state) {
        state.isSyncing = false;
        state.lastError = String(error);
      }
      return { success: false, syncedCount: 0, error: String(error) };
    }
  }

  /**
   * 差分同期
   */
  async syncDelta(userId: number, lastSyncTime: number): Promise<SyncData[]> {
    try {
      const history = this.syncHistory.get(userId) || [];
      const delta = history.filter(item => item.timestamp > lastSyncTime);
      return delta;
    } catch (error) {
      console.error('Failed to sync delta:', error);
      return [];
    }
  }

  /**
   * データ同期
   */
  private async syncData(userId: number, data: SyncData): Promise<boolean> {
    try {
      // 同期処理の実装
      const history = this.syncHistory.get(userId) || [];
      history.push(data);
      this.syncHistory.set(userId, history);

      return true;
    } catch (error) {
      console.error('Failed to sync data:', error);
      return false;
    }
  }

  /**
   * 競合解決
   */
  async resolveConflict(
    userId: number,
    localData: SyncData,
    remoteData: SyncData,
    strategy: 'local' | 'remote' | 'merge'
  ): Promise<ConflictResolution | null> {
    try {
      let resolvedData: Record<string, any>;

      switch (strategy) {
        case 'local':
          resolvedData = localData.data;
          break;
        case 'remote':
          resolvedData = remoteData.data;
          break;
        case 'merge':
          resolvedData = this.mergeData(localData.data, remoteData.data);
          break;
        default:
          return null;
      }

      return {
        strategy,
        timestamp: Date.now(),
        resolvedData,
      };
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      return null;
    }
  }

  /**
   * データマージ
   */
  private mergeData(
    localData: Record<string, any>,
    remoteData: Record<string, any>
  ): Record<string, any> {
    return {
      ...remoteData,
      ...localData,
    };
  }

  /**
   * 保留中の変更取得
   */
  getPendingChanges(userId: number): SyncData[] {
    return this.pendingChanges.get(userId) || [];
  }

  /**
   * 同期履歴取得
   */
  getSyncHistory(userId: number, limit: number = 100): SyncData[] {
    const history = this.syncHistory.get(userId) || [];
    return history.slice(-limit);
  }

  /**
   * 同期キャンセル
   */
  cancelSync(userId: number): boolean {
    try {
      const state = this.syncStates.get(userId);
      if (state) {
        state.isSyncing = false;
        state.syncProgress = 0;
      }
      return true;
    } catch (error) {
      console.error('Failed to cancel sync:', error);
      return false;
    }
  }

  /**
   * 同期リセット
   */
  resetSync(userId: number): boolean {
    try {
      this.pendingChanges.set(userId, []);
      this.syncHistory.set(userId, []);
      
      const state = this.syncStates.get(userId);
      if (state) {
        state.isSyncing = false;
        state.syncProgress = 0;
        state.pendingChanges = 0;
        state.lastError = undefined;
      }

      return true;
    } catch (error) {
      console.error('Failed to reset sync:', error);
      return false;
    }
  }

  /**
   * 同期統計取得
   */
  getSyncStats(userId: number): {
    totalSynced: number;
    pendingChanges: number;
    lastSyncTime: number;
    nextSyncTime: number;
  } | null {
    const state = this.syncStates.get(userId);
    if (!state) return null;

    const history = this.syncHistory.get(userId) || [];
    const pending = this.pendingChanges.get(userId) || [];

    return {
      totalSynced: history.length,
      pendingChanges: pending.length,
      lastSyncTime: state.lastSyncTime,
      nextSyncTime: state.nextSyncTime,
    };
  }

  /**
   * 自動同期スケジュール
   */
  scheduleAutoSync(userId: number): void {
    const state = this.syncStates.get(userId);
    if (!state) return;

    const now = Date.now();
    if (now >= state.nextSyncTime && !state.isSyncing) {
      this.sync(userId).catch(error => {
        console.error('Auto sync failed:', error);
      });
    }
  }

  /**
   * すべてのユーザーの自動同期
   */
  scheduleAllAutoSync(): void {
    this.syncStates.forEach((state, userId) => {
      this.scheduleAutoSync(userId);
    });
  }

  /**
   * クリーンアップ
   */
  cleanup(userId?: number): void {
    if (userId) {
      this.syncStates.delete(userId);
      this.pendingChanges.delete(userId);
      this.syncHistory.delete(userId);
    } else {
      this.syncStates.clear();
      this.pendingChanges.clear();
      this.syncHistory.clear();
    }
  }
}

export const cloudSyncService = CloudSyncService.getInstance();
export default cloudSyncService;
