/**
 * DataDeletionService - データ削除機能管理
 */

export type DeletionType = 'account' | 'conversation' | 'files' | 'analytics' | 'all';
export type DeletionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DeletionRequest {
  id: string;
  userId: string;
  deletionType: DeletionType;
  status: DeletionStatus;
  reason?: string;
  requestedAt: number;
  startedAt?: number;
  completedAt?: number;
  deletedItemCount: number;
  errorMessage?: string;
}

export interface DeletionLog {
  id: string;
  userId: string;
  itemType: string;
  itemId: string;
  deletedAt: number;
  reason?: string;
}

export class DataDeletionService {
  private static instance: DataDeletionService;
  private deletionRequests: Map<string, DeletionRequest> = new Map();
  private deletionLogs: DeletionLog[] = [];
  private requestCounter: number = 0;
  private logCounter: number = 0;
  private maxLogsPerUser: number = 10000;

  private constructor() {}

  static getInstance(): DataDeletionService {
    if (!DataDeletionService.instance) {
      DataDeletionService.instance = new DataDeletionService();
    }
    return DataDeletionService.instance;
  }

  /**
   * データ削除リクエスト作成
   */
  createDeletionRequest(userId: string, deletionType: DeletionType, reason?: string): DeletionRequest {
    const id = `del_req_${++this.requestCounter}_${Date.now()}`;

    const request: DeletionRequest = {
      id,
      userId,
      deletionType,
      status: 'pending',
      reason,
      requestedAt: Date.now(),
      deletedItemCount: 0,
    };

    this.deletionRequests.set(id, request);
    return request;
  }

  /**
   * 削除リクエスト取得
   */
  getDeletionRequest(requestId: string): DeletionRequest | null {
    return this.deletionRequests.get(requestId) || null;
  }

  /**
   * ユーザーの削除リクエスト取得
   */
  getUserDeletionRequests(userId: string): DeletionRequest[] {
    return Array.from(this.deletionRequests.values()).filter((r) => r.userId === userId);
  }

  /**
   * 削除リクエスト開始
   */
  startDeletionRequest(requestId: string): DeletionRequest | null {
    const request = this.deletionRequests.get(requestId);
    if (!request) return null;

    request.status = 'processing';
    request.startedAt = Date.now();
    return request;
  }

  /**
   * 削除リクエスト完了
   */
  completeDeletionRequest(requestId: string, deletedItemCount: number): DeletionRequest | null {
    const request = this.deletionRequests.get(requestId);
    if (!request) return null;

    request.status = 'completed';
    request.completedAt = Date.now();
    request.deletedItemCount = deletedItemCount;
    return request;
  }

  /**
   * 削除リクエスト失敗
   */
  failDeletionRequest(requestId: string, errorMessage: string): DeletionRequest | null {
    const request = this.deletionRequests.get(requestId);
    if (!request) return null;

    request.status = 'failed';
    request.errorMessage = errorMessage;
    return request;
  }

  /**
   * 削除ログ記録
   */
  logDeletion(userId: string, itemType: string, itemId: string, reason?: string): DeletionLog {
    const id = `del_log_${++this.logCounter}_${Date.now()}`;

    const log: DeletionLog = {
      id,
      userId,
      itemType,
      itemId,
      deletedAt: Date.now(),
      reason,
    };

    this.deletionLogs.push(log);

    // ユーザーあたりのログ数制限
    const userLogs = this.deletionLogs.filter((l) => l.userId === userId);
    if (userLogs.length > this.maxLogsPerUser) {
      const oldestIndex = this.deletionLogs.findIndex((l) => l.userId === userId);
      if (oldestIndex !== -1) {
        this.deletionLogs.splice(oldestIndex, 1);
      }
    }

    return log;
  }

  /**
   * ユーザーの削除ログ取得
   */
  getUserDeletionLogs(userId: string, limit: number = 100): DeletionLog[] {
    return this.deletionLogs
      .filter((l) => l.userId === userId)
      .sort((a, b) => b.deletedAt - a.deletedAt)
      .slice(0, limit);
  }

  /**
   * 削除統計取得
   */
  getDeletionStatistics(): {
    totalRequests: number;
    pendingRequests: number;
    processingRequests: number;
    completedRequests: number;
    failedRequests: number;
    totalDeletedItems: number;
  } {
    const requests = Array.from(this.deletionRequests.values());

    return {
      totalRequests: requests.length,
      pendingRequests: requests.filter((r) => r.status === 'pending').length,
      processingRequests: requests.filter((r) => r.status === 'processing').length,
      completedRequests: requests.filter((r) => r.status === 'completed').length,
      failedRequests: requests.filter((r) => r.status === 'failed').length,
      totalDeletedItems: requests.reduce((sum, r) => sum + r.deletedItemCount, 0),
    };
  }

  /**
   * ユーザーの削除統計
   */
  getUserDeletionStatistics(userId: string): {
    userId: string;
    totalRequests: number;
    completedRequests: number;
    totalDeletedItems: number;
    lastDeletionAt?: number;
  } {
    const requests = Array.from(this.deletionRequests.values()).filter((r) => r.userId === userId);
    const completedRequests = requests.filter((r) => r.status === 'completed');
    const lastDeletion = completedRequests.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0];

    return {
      userId,
      totalRequests: requests.length,
      completedRequests: completedRequests.length,
      totalDeletedItems: completedRequests.reduce((sum, r) => sum + r.deletedItemCount, 0),
      lastDeletionAt: lastDeletion?.completedAt,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.deletionRequests.clear();
    this.deletionLogs = [];
  }
}

export const dataDeletionService = DataDeletionService.getInstance();
export default dataDeletionService;
