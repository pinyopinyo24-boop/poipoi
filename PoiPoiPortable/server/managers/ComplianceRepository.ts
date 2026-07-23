/**
 * ComplianceRepository - コンプライアンスリポジトリ
 * 
 * 機能:
 * - データ永続化
 * - インデックス管理
 * - クエリ機能
 * - ページネーション
 */

export interface ComplianceData {
  id: string;
  userId: number;
  type: 'check' | 'violation' | 'policy' | 'audit' | 'report';
  data: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface QueryOptions {
  userId?: number;
  type?: string;
  startDate?: number;
  endDate?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ComplianceRepository {
  private static instance: ComplianceRepository;
  private storage: Map<string, ComplianceData> = new Map();
  private userIndex: Map<number, string[]> = new Map();
  private typeIndex: Map<string, string[]> = new Map();
  private dataCounter: number = 0;

  private constructor() {}

  static getInstance(): ComplianceRepository {
    if (!ComplianceRepository.instance) {
      ComplianceRepository.instance = new ComplianceRepository();
    }
    return ComplianceRepository.instance;
  }

  /**
   * データ保存
   */
  save(
    userId: number,
    type: 'check' | 'violation' | 'policy' | 'audit' | 'report',
    data: Record<string, any>
  ): ComplianceData {
    const id = `data_${++this.dataCounter}_${Date.now()}`;
    const now = Date.now();

    const complianceData: ComplianceData = {
      id,
      userId,
      type,
      data,
      createdAt: now,
      updatedAt: now,
    };

    this.storage.set(id, complianceData);

    // ユーザーインデックス
    if (!this.userIndex.has(userId)) {
      this.userIndex.set(userId, []);
    }
    const userIds = this.userIndex.get(userId);
    if (userIds) userIds.push(id);

    // タイプインデックス
    if (!this.typeIndex.has(type)) {
      this.typeIndex.set(type, []);
    }
    const typeIds = this.typeIndex.get(type);
    if (typeIds) typeIds.push(id);

    return complianceData;
  }

  /**
   * データ取得
   */
  findById(id: string): ComplianceData | null {
    return this.storage.get(id) || null;
  }

  /**
   * ユーザーデータ取得
   */
  findByUserId(userId: number): ComplianceData[] {
    const ids = this.userIndex.get(userId) || [];
    return ids
      .map((id: string) => this.storage.get(id))
      .filter((data: ComplianceData | undefined) => data !== undefined) as ComplianceData[];
  }

  /**
   * タイプ別データ取得
   */
  findByType(type: string): ComplianceData[] {
    const ids = this.typeIndex.get(type) || [];
    return ids
      .map((id: string) => this.storage.get(id))
      .filter((data: ComplianceData | undefined) => data !== undefined) as ComplianceData[];
  }

  /**
   * クエリ実行
   */
  query(options: QueryOptions): ComplianceData[] {
    let results: ComplianceData[] = [];

    if (options.userId !== undefined) {
      results = this.findByUserId(options.userId);
    } else {
      results = Array.from(this.storage.values());
    }

    // タイプフィルタ
    if (options.type) {
      results = results.filter((data: ComplianceData) => data.type === options.type);
    }

    // 期間フィルタ
    if (options.startDate !== undefined) {
      results = results.filter((data: ComplianceData) => data.createdAt >= (options.startDate || 0));
    }
    if (options.endDate !== undefined) {
      results = results.filter((data: ComplianceData) => data.createdAt <= (options.endDate || Date.now()));
    }

    // ソート
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    results.sort((a: ComplianceData, b: ComplianceData) => {
      let aVal = (a as any)[sortBy];
      let bVal = (b as any)[sortBy];

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    // ページネーション
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    return results.slice(offset, offset + limit);
  }

  /**
   * データ更新
   */
  update(id: string, data: Record<string, any>): ComplianceData | null {
    const existing = this.findById(id);
    if (!existing) return null;

    existing.data = data;
    existing.updatedAt = Date.now();
    return existing;
  }

  /**
   * データ削除
   */
  delete(id: string): boolean {
    const data = this.findById(id);
    if (!data) return false;

    this.storage.delete(id);

    // インデックスから削除
    const userIds = this.userIndex.get(data.userId);
    if (userIds) {
      const index = userIds.indexOf(id);
      if (index > -1) userIds.splice(index, 1);
    }

    const typeIds = this.typeIndex.get(data.type);
    if (typeIds) {
      const index = typeIds.indexOf(id);
      if (index > -1) typeIds.splice(index, 1);
    }

    return true;
  }

  /**
   * 統計情報取得
   */
  getStats(): {
    totalData: number;
    byType: Map<string, number>;
    byUser: Map<number, number>;
  } {
    const byType = new Map<string, number>();
    const byUser = new Map<number, number>();

    this.storage.forEach((data: ComplianceData) => {
      byType.set(data.type, (byType.get(data.type) || 0) + 1);
      byUser.set(data.userId, (byUser.get(data.userId) || 0) + 1);
    });

    return {
      totalData: this.storage.size,
      byType,
      byUser,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(userId?: number): void {
    if (userId) {
      const ids = this.userIndex.get(userId) || [];
      ids.forEach((id: string) => {
        this.storage.delete(id);
      });
      this.userIndex.delete(userId);
    } else {
      this.storage.clear();
      this.userIndex.clear();
      this.typeIndex.clear();
    }
  }
}

export const complianceRepository = ComplianceRepository.getInstance();
export default complianceRepository;
