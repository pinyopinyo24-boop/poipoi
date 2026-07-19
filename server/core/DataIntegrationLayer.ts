/**
 * DataIntegrationLayer - 製造データ統合レイヤー
 * Excel/CSV/PDFデータ取込、変換、AI Manager連携
 */

export interface DataSource {
  id: string;
  type: 'excel' | 'csv' | 'pdf' | 'api';
  name: string;
  path: string;
  lastSync: number;
  status: 'active' | 'inactive' | 'error';
}

export interface TransformedData {
  id: string;
  sourceId: string;
  dataType: 'production' | 'quality' | 'cost' | 'inventory' | 'maintenance';
  content: Record<string, any>;
  timestamp: number;
  version: number;
}

export interface DataIntegrationConfig {
  autoSync: boolean;
  syncInterval: number;
  retryAttempts: number;
  batchSize: number;
  encryptionEnabled: boolean;
}

export class DataIntegrationLayer {
  private dataSources: Map<string, DataSource> = new Map();
  private transformedData: Map<string, TransformedData> = new Map();
  private config: DataIntegrationConfig;
  private syncHistory: Array<{ sourceId: string; timestamp: number; status: string }> = [];

  constructor(config?: Partial<DataIntegrationConfig>) {
    this.config = {
      autoSync: true,
      syncInterval: 3600000, // 1 hour
      retryAttempts: 3,
      batchSize: 100,
      encryptionEnabled: true,
      ...config,
    };
  }

  /**
   * データソースを登録
   */
  registerDataSource(source: DataSource): string {
    const id = source.id || `source-${Date.now()}`;
    this.dataSources.set(id, {
      ...source,
      id,
      lastSync: 0,
      status: 'active',
    });
    return id;
  }

  /**
   * データソースを取得
   */
  getDataSource(sourceId: string): DataSource | undefined {
    return this.dataSources.get(sourceId);
  }

  /**
   * すべてのデータソースを取得
   */
  getAllDataSources(): DataSource[] {
    return Array.from(this.dataSources.values());
  }

  /**
   * データソースを削除
   */
  removeDataSource(sourceId: string): boolean {
    return this.dataSources.delete(sourceId);
  }

  /**
   * Excelデータを取込
   */
  importExcelData(sourceId: string, data: any[]): TransformedData[] {
    const source = this.dataSources.get(sourceId);
    if (!source || source.type !== 'excel') {
      throw new Error(`Invalid data source: ${sourceId}`);
    }

    const transformed: TransformedData[] = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const dataType = this.detectDataType(item);
      const id = `data-${sourceId}-${i}-${Date.now()}`;

      const transformedItem: TransformedData = {
        id,
        sourceId,
        dataType,
        content: item,
        timestamp: Date.now(),
        version: 1,
      };

      this.transformedData.set(id, transformedItem);
      transformed.push(transformedItem);
    }

    source.lastSync = Date.now();
    this.recordSync(sourceId, 'success');
    return transformed;
  }

  /**
   * CSVデータを取込
   */
  importCSVData(sourceId: string, csvText: string): TransformedData[] {
    const source = this.dataSources.get(sourceId);
    if (!source || source.type !== 'csv') {
      throw new Error(`Invalid data source: ${sourceId}`);
    }

    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map((h) => h.trim());
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, any> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }

    const transformed: TransformedData[] = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const dataType = this.detectDataType(item);
      const id = `data-${sourceId}-${i}-${Date.now()}`;

      const transformedItem: TransformedData = {
        id,
        sourceId,
        dataType,
        content: item,
        timestamp: Date.now(),
        version: 1,
      };

      this.transformedData.set(id, transformedItem);
      transformed.push(transformedItem);
    }

    source.lastSync = Date.now();
    this.recordSync(sourceId, 'success');
    return transformed;
  }

  /**
   * PDFデータを取込
   */
  importPDFData(sourceId: string, pdfContent: string): TransformedData[] {
    const source = this.dataSources.get(sourceId);
    if (!source || source.type !== 'pdf') {
      throw new Error(`Invalid data source: ${sourceId}`);
    }

    // PDFテキスト解析（粗略版）
    const data = [
      {
        type: 'pdf',
        content: pdfContent,
        extractedAt: Date.now(),
      },
    ];

    const transformed: TransformedData[] = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const dataType = this.detectDataType(item);
      const id = `data-${sourceId}-${i}-${Date.now()}`;

      const transformedItem: TransformedData = {
        id,
        sourceId,
        dataType,
        content: item,
        timestamp: Date.now(),
        version: 1,
      };

      this.transformedData.set(id, transformedItem);
      transformed.push(transformedItem);
    }

    source.lastSync = Date.now();
    this.recordSync(sourceId, 'success');
    return transformed;
  }

  /**
   * データ型を自動検出
   */
  private detectDataType(
    data: any
  ): 'production' | 'quality' | 'cost' | 'inventory' | 'maintenance' {
    const keys = Object.keys(data).map((k) => k.toLowerCase());

    if (keys.some((k) => k.includes('production') || k.includes('製造'))) {
      return 'production';
    }
    if (keys.some((k) => k.includes('quality') || k.includes('品質'))) {
      return 'quality';
    }
    if (keys.some((k) => k.includes('cost') || k.includes('コスト'))) {
      return 'cost';
    }
    if (keys.some((k) => k.includes('inventory') || k.includes('在庫'))) {
      return 'inventory';
    }
    if (keys.some((k) => k.includes('maintenance') || k.includes('保守'))) {
      return 'maintenance';
    }

    return 'production';
  }

  /**
   * データを変換
   */
  transformData(dataId: string, transformation: (data: any) => any): TransformedData | undefined {
    const data = this.transformedData.get(dataId);
    if (!data) return undefined;

    const transformed: TransformedData = {
      ...data,
      id: `data-${Date.now()}`,
      content: transformation(data.content),
      version: data.version + 1,
      timestamp: Date.now(),
    };

    this.transformedData.set(transformed.id, transformed);
    return transformed;
  }

  /**
   * 変換データを取得
   */
  getTransformedData(dataId: string): TransformedData | undefined {
    return this.transformedData.get(dataId);
  }

  /**
   * すべての変換データを取得
   */
  getAllTransformedData(): TransformedData[] {
    return Array.from(this.transformedData.values());
  }

  /**
   * データ型別に変換データを取得
   */
  getTransformedDataByType(dataType: string): TransformedData[] {
    return Array.from(this.transformedData.values()).filter((d) => d.dataType === dataType);
  }

  /**
   * データを削除
   */
  removeTransformedData(dataId: string): boolean {
    return this.transformedData.delete(dataId);
  }

  /**
   * データを検証
   */
  validateData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Data must be an object');
      return {
        valid: false,
        errors,
      };
    }

    if (Object.keys(data).length === 0) {
      errors.push('Data cannot be empty');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * データをバッチ処理
   */
  batchProcessData(
    dataList: TransformedData[],
    processor: (data: TransformedData) => any
  ): any[] {
    const results: any[] = [];
    const batchSize = this.config.batchSize;

    for (let i = 0; i < dataList.length; i += batchSize) {
      const batch = dataList.slice(i, i + batchSize);
      batch.forEach((data) => {
        results.push(processor(data));
      });
    }

    return results;
  }

  /**
   * 同期履歴を記録
   */
  private recordSync(sourceId: string, status: string): void {
    this.syncHistory.push({
      sourceId,
      timestamp: Date.now(),
      status,
    });

    // 履歴を最新100件に制限
    if (this.syncHistory.length > 100) {
      this.syncHistory = this.syncHistory.slice(-100);
    }
  }

  /**
   * 同期履歴を取得
   */
  getSyncHistory(sourceId?: string): Array<{ sourceId: string; timestamp: number; status: string }> {
    if (sourceId) {
      return this.syncHistory.filter((h) => h.sourceId === sourceId);
    }
    return this.syncHistory;
  }

  /**
   * データ統計を取得
   */
  getDataStatistics(): {
    totalSources: number;
    totalData: number;
    dataByType: Record<string, number>;
    lastSync: number;
  } {
    const dataByType: Record<string, number> = {
      production: 0,
      quality: 0,
      cost: 0,
      inventory: 0,
      maintenance: 0,
    };

    this.transformedData.forEach((data) => {
      dataByType[data.dataType]++;
    });

    return {
      totalSources: this.dataSources.size,
      totalData: this.transformedData.size,
      dataByType,
      lastSync: Math.max(...Array.from(this.dataSources.values()).map((s) => s.lastSync), 0),
    };
  }

  /**
   * 設定を取得
   */
  getConfig(): DataIntegrationConfig {
    return this.config;
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<DataIntegrationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * データをエクスポート
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    const data = Array.from(this.transformedData.values());

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV形式
    if (data.length === 0) return '';

    const headers = ['id', 'sourceId', 'dataType', 'timestamp', 'version'];
    const rows = data.map((d) => [d.id, d.sourceId, d.dataType, d.timestamp, d.version]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    return csv;
  }

  /**
   * データをクリア
   */
  clearData(): void {
    this.transformedData.clear();
    this.syncHistory = [];
  }

  /**
   * データソースをクリア
   */
  clearDataSources(): void {
    this.dataSources.clear();
  }
}
