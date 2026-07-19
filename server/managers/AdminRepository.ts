/**
 * AdminRepository - 管理リポジトリ
 * 
 * 機能:
 * - 管理データ永続化
 * - インデックス管理
 * - クエリ機能
 * - ページネーション
 */

export interface AdminData {
  id: string;
  type: 'user' | 'system' | 'audit' | 'manufacturing' | 'compliance';
  data: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  createdBy: number;
}

export interface QueryOptions {
  type?: string;
  createdBy?: number;
  startDate?: number;
  endDate?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class AdminRepository {
  private static instance: AdminRepository;
  private storage: Map<string, AdminData> = new Map();
  private typeIndex: Map<string, string[]> = new Map();
  private userIndex: Map<number, string[]> = new Map();
  private dataCounter: number = 0;

  private constructor() {}

  static getInstance(): AdminRepository {
    if (!AdminRepository.instance) {
      AdminRepository.instance = new AdminRepository();
    }
    return AdminRepository.instance;
  }

  /**
   * データ保存
   */
  save(
    type: 'user' | 'system' | 'audit' | 'manufacturing' | 'compliance',
    data: Record<string, any>,
    createdBy: number
  ): AdminData {
    const id = `admin_${++this.dataCounter}_${Date.now()}`;
    const now = Date.now();

    const adminData: AdminData = {
      id,
      type,
      data,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    this.storage.set(id, adminData);

    // タイプインデックス
    if (!this.typeIndex.has(type)) {
      this.typeIndex.set(type, []);
    }
    const typeIds = this.typeIndex.get(type);
    if (typeIds) typeIds.push(id);

    // ユーザーインデックス
    if (!this.userIndex.has(createdBy)) {
      this.userIndex.set(createdBy, []);
    }
    const userIds = this.userIndex.get(createdBy);
    if (userIds) userIds.push(id);

    return adminData;
  }

  /**
   * データ取得
   */
  findById(id: string): AdminData | null {
    return this.storage.get(id) || null;
  }

  /**
   * タイプ別データ取得
   */
  findByType(type: string): AdminData[] {
    const ids = this.typeIndex.get(type) || [];
    return ids
      .map((id: string) => this.storage.get(id))
      .filter((data: AdminData | undefined) => data !== undefined) as AdminData[];
  }

  /**
   * ユーザー別データ取得
   */
  findByUser(userId: number): AdminData[] {
    const ids = this.userIndex.get(userId) || [];
    return ids
      .map((id: string) => this.storage.get(id))
      .filter((data: AdminData | undefined) => data !== undefined) as AdminData[];
  }

  /**
   * クエリ実行
   */
  query(options: QueryOptions): AdminData[] {
    let results: AdminData[] = Array.from(this.storage.values());

    // タイプフィルタ
    if (options.type) {
      results = results.filter((data: AdminData) => data.type === options.type);
    }

    // ユーザーフィルタ
    if (options.createdBy !== undefined) {
      results = results.filter((data: AdminData) => data.createdBy === options.createdBy);
    }

    // 期間フィルタ
    if (options.startDate !== undefined) {
      results = results.filter((data: AdminData) => data.createdAt >= (options.startDate || 0));
    }
    if (options.endDate !== undefined) {
      results = results.filter((data: AdminData) => data.createdAt <= (options.endDate || Date.now()));
    }

    // ソート
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    results.sort((a: AdminData, b: AdminData) => {
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
  update(id: string, data: Record<string, any>): AdminData | null {
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
    const typeIds = this.typeIndex.get(data.type);
    if (typeIds) {
      const index = typeIds.indexOf(id);
      if (index > -1) typeIds.splice(index, 1);
    }

    const userIds = this.userIndex.get(data.createdBy);
    if (userIds) {
      const index = userIds.indexOf(id);
      if (index > -1) userIds.splice(index, 1);
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

    this.storage.forEach((data: AdminData) => {
      byType.set(data.type, (byType.get(data.type) || 0) + 1);
      byUser.set(data.createdBy, (byUser.get(data.createdBy) || 0) + 1);
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
  cleanup(): void {
    this.storage.clear();
    this.typeIndex.clear();
    this.userIndex.clear();
  }
}

export const adminRepository = AdminRepository.getInstance();
export default adminRepository;
