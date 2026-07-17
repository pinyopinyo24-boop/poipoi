/**
 * AuditSearchService - 監査検索サービス
 * 
 * 機能:
 * - 監査ログ検索
 * - キーワード検索
 * - フィルタリング
 * - ソート
 * - ページネーション
 */

export interface SearchQuery {
  userId?: number;
  action?: string;
  resource?: string;
  status?: 'success' | 'failure';
  startTime?: number;
  endTime?: number;
  keyword?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'action' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  total: number;
  limit: number;
  offset: number;
  results: any[];
}

export class AuditSearchService {
  private static instance: AuditSearchService;
  private logs: Map<number, any[]> = new Map();
  private searchCache: Map<string, SearchResult> = new Map();

  private constructor() {}

  static getInstance(): AuditSearchService {
    if (!AuditSearchService.instance) {
      AuditSearchService.instance = new AuditSearchService();
    }
    return AuditSearchService.instance;
  }

  /**
   * ログ追加
   */
  addLog(userId: number, log: any): void {
    if (!this.logs.has(userId)) {
      this.logs.set(userId, []);
    }
    const userLogs = this.logs.get(userId);
    if (userLogs) {
      userLogs.push(log);
    }
    this.clearCache();
  }

  /**
   * 検索実行
   */
  search(query: SearchQuery): SearchResult {
    const cacheKey = JSON.stringify(query);
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    let results: any[] = [];

    if (query.userId !== undefined) {
      const userLogs = this.logs.get(query.userId) || [];
      results = [...userLogs];
    } else {
      this.logs.forEach((userLogs: any[]) => {
        results.push(...userLogs);
      });
    }

    // フィルタリング
    if (query.action) {
      results = results.filter((log: any) => log.action === query.action);
    }

    if (query.resource) {
      results = results.filter((log: any) => log.resource === query.resource);
    }

    if (query.status) {
      results = results.filter((log: any) => log.status === query.status);
    }

    if (query.startTime !== undefined) {
      results = results.filter((log: any) => log.timestamp >= (query.startTime || 0));
    }

    if (query.endTime !== undefined) {
      results = results.filter((log: any) => log.timestamp <= (query.endTime || Date.now()));
    }

    // キーワード検索
    if (query.keyword) {
      const keyword = query.keyword.toLowerCase();
      results = results.filter(
        (log: any) =>
          log.action.toLowerCase().includes(keyword) ||
          log.resource.toLowerCase().includes(keyword) ||
          JSON.stringify(log.details).toLowerCase().includes(keyword)
      );
    }

    // ソート
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';
    results.sort((a: any, b: any) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    // ページネーション
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    const result: SearchResult = {
      total,
      limit,
      offset,
      results: paginatedResults,
    };

    this.searchCache.set(cacheKey, result);
    return result;
  }

  /**
   * キーワード検索
   */
  searchByKeyword(keyword: string, limit: number = 50): SearchResult {
    return this.search({ keyword, limit });
  }

  /**
   * アクション別検索
   */
  searchByAction(action: string, limit: number = 50): SearchResult {
    return this.search({ action, limit });
  }

  /**
   * 期間別検索
   */
  searchByPeriod(
    startTime: number,
    endTime: number,
    limit: number = 50
  ): SearchResult {
    return this.search({ startTime, endTime, limit });
  }

  /**
   * ユーザー別検索
   */
  searchByUser(userId: number, limit: number = 50): SearchResult {
    return this.search({ userId, limit });
  }

  /**
   * 高度な検索
   */
  advancedSearch(
    userId: number,
    action: string,
    status: 'success' | 'failure',
    startTime: number,
    endTime: number
  ): SearchResult {
    return this.search({
      userId,
      action,
      status,
      startTime,
      endTime,
    });
  }

  /**
   * 検索統計
   */
  getSearchStats(): {
    totalLogs: number;
    userCount: number;
    actionTypes: number;
  } {
    let totalLogs = 0;
    const actionTypes = new Set<string>();

    this.logs.forEach((userLogs: any[]) => {
      totalLogs += userLogs.length;
      userLogs.forEach((log: any) => {
        actionTypes.add(log.action);
      });
    });

    return {
      totalLogs,
      userCount: this.logs.size,
      actionTypes: actionTypes.size,
    };
  }

  /**
   * キャッシュクリア
   */
  private clearCache(): void {
    this.searchCache.clear();
  }

  /**
   * クリーンアップ
   */
  cleanup(userId?: number): void {
    if (userId) {
      this.logs.delete(userId);
    } else {
      this.logs.clear();
    }
    this.clearCache();
  }
}

export const auditSearchService = AuditSearchService.getInstance();
export default auditSearchService;
