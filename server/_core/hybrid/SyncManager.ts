/**
 * SyncManager - Manages data synchronization between local and cloud servers
 */

export type SyncTarget = 'conversation' | 'learning' | 'memory' | 'settings' | 'production';

export interface SyncItem {
  id: string;
  target: SyncTarget;
  data: any;
  timestamp: number;
  source: 'local' | 'cloud';
  status: 'pending' | 'synced' | 'failed';
  retryCount: number;
}

export interface SyncConfig {
  autoSync: boolean;
  syncInterval: number; // milliseconds
  maxRetries: number;
  conflictResolution: 'local-wins' | 'cloud-wins' | 'merge';
}

/**
 * SyncManager - Manages synchronization between local and cloud
 */
export class SyncManager {
  private config: SyncConfig;
  private syncQueue: SyncItem[] = [];
  private syncHistory: Map<string, SyncItem> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Function[]> = new Map();

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = {
      autoSync: config.autoSync !== false,
      syncInterval: config.syncInterval || 60000, // 1 minute
      maxRetries: config.maxRetries || 3,
      conflictResolution: config.conflictResolution || 'merge',
    };
  }

  /**
   * Initialize sync manager
   */
  async initialize(): Promise<void> {
    console.log('[SyncManager] Initializing...');

    if (this.config.autoSync) {
      this.startSyncLoop();
    }

    console.log('[SyncManager] Initialized');
  }

  /**
   * Queue item for synchronization
   */
  queueSync(target: SyncTarget, data: any, source: 'local' | 'cloud'): string {
    const itemId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const item: SyncItem = {
      id: itemId,
      target,
      data,
      timestamp: Date.now(),
      source,
      status: 'pending',
      retryCount: 0,
    };

    this.syncQueue.push(item);
    this.syncHistory.set(itemId, item);

    console.log(`[SyncManager] Queued ${target} sync from ${source}: ${itemId}`);
    this.emit('sync-queued', { itemId, target, source });

    return itemId;
  }

  /**
   * Perform synchronization
   */
  async performSync(): Promise<void> {
    console.log(`[SyncManager] Starting sync (${this.syncQueue.length} items)`);

    const itemsToSync = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of itemsToSync) {
      try {
        await this.syncItem(item);
      } catch (error) {
        console.error(`[SyncManager] Sync failed for ${item.id}:`, error);
        item.retryCount++;

        if (item.retryCount < this.config.maxRetries) {
          this.syncQueue.push(item);
          console.log(`[SyncManager] Retrying ${item.id} (attempt ${item.retryCount}/${this.config.maxRetries})`);
        } else {
          item.status = 'failed';
          console.error(`[SyncManager] Max retries exceeded for ${item.id}`);
          this.emit('sync-failed', { itemId: item.id, target: item.target, error });
        }
      }
    }

    console.log('[SyncManager] Sync completed');
  }

  /**
   * Sync individual item
   */
  private async syncItem(item: SyncItem): Promise<void> {
    console.log(`[SyncManager] Syncing ${item.target} (${item.id})`);

    // Simulate sync operation
    // In real implementation, this would call the appropriate API
    await new Promise((resolve) => setTimeout(resolve, 100));

    item.status = 'synced';
    this.syncHistory.set(item.id, item);

    this.emit('sync-completed', { itemId: item.id, target: item.target });
  }

  /**
   * Start sync loop
   */
  private startSyncLoop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (this.syncQueue.length > 0) {
        await this.performSync();
      }
    }, this.config.syncInterval);

    console.log(`[SyncManager] Sync loop started (interval: ${this.config.syncInterval}ms)`);
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    const pending = this.syncQueue.filter((item) => item.status === 'pending').length;
    const synced = Array.from(this.syncHistory.values()).filter((item) => item.status === 'synced').length;
    const failed = Array.from(this.syncHistory.values()).filter((item) => item.status === 'failed').length;

    return {
      pending,
      synced,
      failed,
      queueSize: this.syncQueue.length,
      historySize: this.syncHistory.size,
    };
  }

  /**
   * Get sync history
   */
  getSyncHistory(limit: number = 100): SyncItem[] {
    return Array.from(this.syncHistory.values()).slice(-limit);
  }

  /**
   * Clear sync history
   */
  clearSyncHistory(): void {
    this.syncHistory.clear();
    this.syncQueue = [];
    console.log('[SyncManager] Sync history cleared');
  }

  /**
   * Handle conflict resolution
   */
  private resolveConflict(local: any, cloud: any): any {
    switch (this.config.conflictResolution) {
      case 'local-wins':
        return local;
      case 'cloud-wins':
        return cloud;
      case 'merge':
        return { ...cloud, ...local };
      default:
        return local;
    }
  }

  /**
   * Register event listener
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Emit event
   */
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.listeners.clear();
    console.log('[SyncManager] Destroyed');
  }
}

// Export singleton instance
let syncManagerInstance: SyncManager | null = null;

export function getSyncManager(config?: Partial<SyncConfig>): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager(config);
  }
  return syncManagerInstance;
}

export function resetSyncManager(): void {
  if (syncManagerInstance) {
    syncManagerInstance.destroy();
    syncManagerInstance = null;
  }
}
