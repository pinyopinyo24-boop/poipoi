/**
 * DataSeparationService - 本番/テストデータ分離管理
 */

export type DataEnvironment = 'production' | 'staging' | 'testing' | 'development';

export interface DataContext {
  environment: DataEnvironment;
  userId: string;
  sessionId: string;
  timestamp: number;
  isTestData: boolean;
}

export interface DataStore {
  environment: DataEnvironment;
  tables: Map<string, any[]>;
  metadata: {
    createdAt: number;
    lastModifiedAt: number;
    recordCount: number;
  };
}

export class DataSeparationService {
  private static instance: DataSeparationService;
  private currentEnvironment: DataEnvironment = 'production';
  private dataStores: Map<DataEnvironment, DataStore> = new Map();
  private dataContextStack: DataContext[] = [];

  private constructor() {
    this.initializeDataStores();
  }

  static getInstance(): DataSeparationService {
    if (!DataSeparationService.instance) {
      DataSeparationService.instance = new DataSeparationService();
    }
    return DataSeparationService.instance;
  }

  /**
   * データストア初期化
   */
  private initializeDataStores(): void {
    const environments: DataEnvironment[] = ['production', 'staging', 'testing', 'development'];

    for (const env of environments) {
      this.dataStores.set(env, {
        environment: env,
        tables: new Map(),
        metadata: {
          createdAt: Date.now(),
          lastModifiedAt: Date.now(),
          recordCount: 0,
        },
      });
    }
  }

  /**
   * 環境切り替え
   */
  switchEnvironment(environment: DataEnvironment): void {
    this.currentEnvironment = environment;
  }

  /**
   * 現在の環境取得
   */
  getCurrentEnvironment(): DataEnvironment {
    return this.currentEnvironment;
  }

  /**
   * データコンテキスト開始
   */
  beginDataContext(userId: string, environment: DataEnvironment): DataContext {
    const context: DataContext = {
      environment,
      userId,
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now(),
      isTestData: environment !== 'production',
    };

    this.dataContextStack.push(context);
    return context;
  }

  /**
   * データコンテキスト終了
   */
  endDataContext(): DataContext | null {
    return this.dataContextStack.pop() || null;
  }

  /**
   * 現在のコンテキスト取得
   */
  getCurrentContext(): DataContext | null {
    return this.dataContextStack.length > 0 ? this.dataContextStack[this.dataContextStack.length - 1] : null;
  }

  /**
   * テーブルデータ保存
   */
  saveTableData(tableName: string, data: any[]): void {
    const store = this.dataStores.get(this.currentEnvironment);
    if (!store) return;

    store.tables.set(tableName, data);
    store.metadata.lastModifiedAt = Date.now();
    store.metadata.recordCount = Array.from(store.tables.values()).reduce((sum, arr) => sum + arr.length, 0);
  }

  /**
   * テーブルデータ取得
   */
  getTableData(tableName: string, environment?: DataEnvironment): any[] {
    const env = environment || this.currentEnvironment;
    const store = this.dataStores.get(env);
    if (!store) return [];

    return store.tables.get(tableName) || [];
  }

  /**
   * テーブル削除
   */
  deleteTable(tableName: string, environment?: DataEnvironment): void {
    const env = environment || this.currentEnvironment;
    const store = this.dataStores.get(env);
    if (!store) return;

    store.tables.delete(tableName);
    store.metadata.lastModifiedAt = Date.now();
    store.metadata.recordCount = Array.from(store.tables.values()).reduce((sum, arr) => sum + arr.length, 0);
  }

  /**
   * 環境のデータクリア
   */
  clearEnvironmentData(environment: DataEnvironment): void {
    const store = this.dataStores.get(environment);
    if (!store) return;

    store.tables.clear();
    store.metadata.lastModifiedAt = Date.now();
    store.metadata.recordCount = 0;
  }

  /**
   * データストア統計
   */
  getStoreStatistics(environment?: DataEnvironment): {
    environment: DataEnvironment;
    tableCount: number;
    recordCount: number;
    createdAt: number;
    lastModifiedAt: number;
  } {
    const env = environment || this.currentEnvironment;
    const store = this.dataStores.get(env);

    if (!store) {
      return {
        environment: env,
        tableCount: 0,
        recordCount: 0,
        createdAt: 0,
        lastModifiedAt: 0,
      };
    }

    return {
      environment: env,
      tableCount: store.tables.size,
      recordCount: store.metadata.recordCount,
      createdAt: store.metadata.createdAt,
      lastModifiedAt: store.metadata.lastModifiedAt,
    };
  }

  /**
   * テストデータマーク
   */
  markAsTestData(tableName: string, recordId: string): void {
    const data = this.getTableData(tableName);
    const record = data.find((r: any) => r.id === recordId);
    if (record) {
      record._isTestData = true;
      record._markedAt = Date.now();
    }
  }

  /**
   * テストデータフィルタリング
   */
  filterTestData(tableName: string): any[] {
    const data = this.getTableData(tableName);
    return data.filter((r: any) => !r._isTestData);
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.dataStores.forEach((store) => store.tables.clear());
    this.dataContextStack = [];
  }
}

export const dataSeparationService = DataSeparationService.getInstance();
export default dataSeparationService;
