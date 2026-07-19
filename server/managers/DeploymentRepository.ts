/**
 * DeploymentRepository - デプロイメントリポジトリ
 * 
 * 機能:
 * - デプロイメント情報永続化\n * - クエリ・検索\n * - ページネーション\n */

export interface DeploymentRecord {
  id: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back';
  startTime: number;
  endTime?: number;
  duration?: number;
  deployedBy: string;
  rollbackedBy?: string;
  rollbackedAt?: number;
  notes: string;
  tags: string[];
}

export interface DeploymentQuery {
  version?: string;
  environment?: 'development' | 'staging' | 'production';
  status?: 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back';
  startDate?: number;
  endDate?: number;
  deployedBy?: string;
  limit?: number;
  offset?: number;
}

export class DeploymentRepository {
  private static instance: DeploymentRepository;
  private records: Map<string, DeploymentRecord> = new Map();
  private recordCounter: number = 0;
  private indices: {
    byVersion: Map<string, string[]>;
    byEnvironment: Map<string, string[]>;
    byStatus: Map<string, string[]>;
    byDeployedBy: Map<string, string[]>;
  } = {
    byVersion: new Map(),
    byEnvironment: new Map(),
    byStatus: new Map(),
    byDeployedBy: new Map(),
  };

  private constructor() {}

  static getInstance(): DeploymentRepository {
    if (!DeploymentRepository.instance) {
      DeploymentRepository.instance = new DeploymentRepository();
    }
    return DeploymentRepository.instance;
  }

  /**
   * デプロイメント記録保存
   */
  save(record: Omit<DeploymentRecord, 'id'>): DeploymentRecord {
    const id = `deploy_${++this.recordCounter}_${Date.now()}`;
    const fullRecord: DeploymentRecord = { ...record, id };

    this.records.set(id, fullRecord);
    this.updateIndices(fullRecord);

    return fullRecord;
  }

  /**
   * インデックス更新
   */
  private updateIndices(record: DeploymentRecord): void {
    // バージョンインデックス
    if (!this.indices.byVersion.has(record.version)) {
      this.indices.byVersion.set(record.version, []);
    }
    this.indices.byVersion.get(record.version)?.push(record.id);

    // 環境インデックス
    if (!this.indices.byEnvironment.has(record.environment)) {
      this.indices.byEnvironment.set(record.environment, []);
    }
    this.indices.byEnvironment.get(record.environment)?.push(record.id);

    // ステータスインデックス
    if (!this.indices.byStatus.has(record.status)) {
      this.indices.byStatus.set(record.status, []);
    }
    this.indices.byStatus.get(record.status)?.push(record.id);

    // デプロイ者インデックス
    if (!this.indices.byDeployedBy.has(record.deployedBy)) {
      this.indices.byDeployedBy.set(record.deployedBy, []);
    }
    this.indices.byDeployedBy.get(record.deployedBy)?.push(record.id);
  }

  /**
   * デプロイメント記録取得
   */
  findById(id: string): DeploymentRecord | null {
    return this.records.get(id) || null;
  }

  /**
   * デプロイメント記録更新
   */
  update(id: string, updates: Partial<DeploymentRecord>): DeploymentRecord | null {
    const record = this.records.get(id);
    if (!record) return null;

    const updated: DeploymentRecord = { ...record, ...updates, id };
    this.records.set(id, updated);
    return updated;
  }

  /**
   * クエリ実行
   */
  query(query: DeploymentQuery): DeploymentRecord[] {
    let results: DeploymentRecord[] = Array.from(this.records.values());

    if (query.version) {
      results = results.filter((r: DeploymentRecord) => r.version === query.version);
    }

    if (query.environment) {
      results = results.filter((r: DeploymentRecord) => r.environment === query.environment);
    }

    if (query.status) {
      results = results.filter((r: DeploymentRecord) => r.status === query.status);
    }

    if (query.startDate) {
      results = results.filter((r: DeploymentRecord) => r.startTime >= query.startDate!);
    }

    if (query.endDate) {
      results = results.filter((r: DeploymentRecord) => r.startTime <= query.endDate!);
    }

    if (query.deployedBy) {
      results = results.filter((r: DeploymentRecord) => r.deployedBy === query.deployedBy);
    }

    // ソート
    results.sort((a: DeploymentRecord, b: DeploymentRecord) => b.startTime - a.startTime);

    // ページネーション
    const offset = query.offset || 0;
    const limit = query.limit || 10;

    return results.slice(offset, offset + limit);
  }

  /**
   * すべてのレコード取得
   */
  findAll(): DeploymentRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * バージョン別レコード取得
   */
  findByVersion(version: string): DeploymentRecord[] {
    const ids = this.indices.byVersion.get(version) || [];
    return ids.map((id: string) => this.records.get(id)).filter((r): r is DeploymentRecord => r !== undefined);
  }

  /**
   * 環境別レコード取得
   */
  findByEnvironment(environment: 'development' | 'staging' | 'production'): DeploymentRecord[] {
    const ids = this.indices.byEnvironment.get(environment) || [];
    return ids.map((id: string) => this.records.get(id)).filter((r): r is DeploymentRecord => r !== undefined);
  }

  /**
   * ステータス別レコード取得
   */
  findByStatus(status: string): DeploymentRecord[] {
    const ids = this.indices.byStatus.get(status) || [];
    return ids.map((id: string) => this.records.get(id)).filter((r): r is DeploymentRecord => r !== undefined);
  }

  /**
   * デプロイ者別レコード取得
   */
  findByDeployedBy(deployedBy: string): DeploymentRecord[] {
    const ids = this.indices.byDeployedBy.get(deployedBy) || [];
    return ids.map((id: string) => this.records.get(id)).filter((r): r is DeploymentRecord => r !== undefined);
  }

  /**
   * レコード削除
   */
  delete(id: string): boolean {
    return this.records.delete(id);
  }

  /**
   * 統計取得
   */
  getStatistics(): {
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    averageDuration: number;
  } {
    const records = Array.from(this.records.values());
    const successful = records.filter((r: DeploymentRecord) => r.status === 'success');
    const failed = records.filter((r: DeploymentRecord) => r.status === 'failed');
    const durations = records.filter((r: DeploymentRecord) => r.duration).map((r: DeploymentRecord) => r.duration || 0);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    return {
      totalDeployments: records.length,
      successfulDeployments: successful.length,
      failedDeployments: failed.length,
      averageDuration: avgDuration,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.records.clear();
    this.indices.byVersion.clear();
    this.indices.byEnvironment.clear();
    this.indices.byStatus.clear();
    this.indices.byDeployedBy.clear();
  }
}

export const deploymentRepository = DeploymentRepository.getInstance();
export default deploymentRepository;
