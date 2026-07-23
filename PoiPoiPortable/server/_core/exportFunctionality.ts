import { storagePut } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export interface ExportOptions {
  userId: string;
  exportType: 'analytics' | 'model' | 'api-config' | 'collaboration' | 'training-data';
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  data: any;
  fileName?: string;
  metadata?: Record<string, any>;
}

/**
 * データをJSON形式でエクスポートする
 */
export async function exportAsJSON(data: any, fileName: string): Promise<string> {
  try {
    const jsonContent = JSON.stringify(data, null, 2);
    const fileKey = `exports/${uuidv4()}-${fileName}.json`;
    
    const { url } = await storagePut(fileKey, jsonContent, 'application/json');
    return url;
  } catch (error) {
    console.error('Failed to export as JSON:', error);
    throw error;
  }
}

/**
 * データをCSV形式でエクスポートする
 */
export async function exportAsCSV(
  data: any[],
  fileName: string,
  headers?: string[]
): Promise<string> {
  try {
    let csvContent = '';

    // ヘッダーを追加
    if (headers && headers.length > 0) {
      csvContent += headers.join(',') + '\n';
    } else if (data.length > 0) {
      const keys = Object.keys(data[0]);
      csvContent += keys.join(',') + '\n';
    }

    // データ行を追加
    data.forEach((row: any) => {
      const values = Object.values(row).map((v: any) => {
        // CSV形式で値をエスケープ
        if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
          return `"${v.replace(/"/g, '""')}"`;
        }
        return v;
      });
      csvContent += values.join(',') + '\n';
    });

    const fileKey = `exports/${uuidv4()}-${fileName}.csv`;
    const { url } = await storagePut(fileKey, csvContent, 'text/csv');
    return url;
  } catch (error) {
    console.error('Failed to export as CSV:', error);
    throw error;
  }
}

/**
 * 分析データをエクスポートする
 */
export async function exportAnalytics(
  userId: string,
  analyticsData: any,
  format: 'json' | 'csv' = 'json'
): Promise<{ url: string; fileName: string }> {
  try {
    const fileName = `analytics-${new Date().toISOString().split('T')[0]}-${userId}`;
    let url: string;

    if (format === 'csv' && Array.isArray(analyticsData)) {
      url = await exportAsCSV(analyticsData, fileName);
    } else {
      url = await exportAsJSON(analyticsData, fileName);
    }

    return {
      url,
      fileName: `${fileName}.${format}`,
    };
  } catch (error) {
    console.error('Failed to export analytics:', error);
    throw error;
  }
}

/**
 * トレーニング済みモデルをエクスポートする
 */
export async function exportTrainedModel(
  userId: string,
  modelData: any,
  modelName: string
): Promise<{ url: string; fileName: string }> {
  try {
    const fileName = `model-${modelName}-${new Date().getTime()}`;
    
    // モデルデータをJSON形式で保存
    const url = await exportAsJSON(modelData, fileName);

    return {
      url,
      fileName: `${fileName}.json`,
    };
  } catch (error) {
    console.error('Failed to export trained model:', error);
    throw error;
  }
}

/**
 * API設定をエクスポートする
 */
export async function exportAPIConfig(
  userId: string,
  apiConfigs: any[]
): Promise<{ url: string; fileName: string }> {
  try {
    const fileName = `api-config-${new Date().toISOString().split('T')[0]}`;
    
    // 機密情報を除去
    const sanitizedConfigs = apiConfigs.map((config: any) => ({
      ...config,
      apiKey: '***REDACTED***',
      secret: '***REDACTED***',
    }));

    const url = await exportAsJSON(sanitizedConfigs, fileName);

    return {
      url,
      fileName: `${fileName}.json`,
    };
  } catch (error) {
    console.error('Failed to export API config:', error);
    throw error;
  }
}

/**
 * コラボレーションデータをエクスポートする
 */
export async function exportCollaborationData(
  userId: string,
  collaborationData: any
): Promise<{ url: string; fileName: string }> {
  try {
    const fileName = `collaboration-${new Date().toISOString().split('T')[0]}`;
    const url = await exportAsJSON(collaborationData, fileName);

    return {
      url,
      fileName: `${fileName}.json`,
    };
  } catch (error) {
    console.error('Failed to export collaboration data:', error);
    throw error;
  }
}

/**
 * トレーニングデータをエクスポートする
 */
export async function exportTrainingData(
  userId: string,
  trainingData: any[],
  format: 'json' | 'csv' = 'csv'
): Promise<{ url: string; fileName: string }> {
  try {
    const fileName = `training-data-${new Date().toISOString().split('T')[0]}`;
    let url: string;

    if (format === 'csv') {
      url = await exportAsCSV(trainingData, fileName);
    } else {
      url = await exportAsJSON(trainingData, fileName);
    }

    return {
      url,
      fileName: `${fileName}.${format}`,
    };
  } catch (error) {
    console.error('Failed to export training data:', error);
    throw error;
  }
}

/**
 * 汎用エクスポート関数
 */
export async function exportData(options: ExportOptions): Promise<{
  url: string;
  fileName: string;
  exportId: string;
}> {
  try {
    const exportId = uuidv4();
    const fileName = options.fileName || `export-${options.exportType}-${new Date().getTime()}`;
    let url: string;

    switch (options.format) {
      case 'json':
        url = await exportAsJSON(options.data, fileName);
        break;
      case 'csv':
        if (Array.isArray(options.data)) {
          url = await exportAsCSV(options.data, fileName);
        } else {
          url = await exportAsJSON(options.data, fileName);
        }
        break;
      default:
        url = await exportAsJSON(options.data, fileName);
    }

    return {
      url,
      fileName: `${fileName}.${options.format}`,
      exportId,
    };
  } catch (error) {
    console.error('Failed to export data:', error);
    throw error;
  }
}

/**
 * 複数のエクスポートをZIPファイルとして作成（将来の拡張）
 */
export async function createBulkExport(
  userId: string,
  exports: Array<{ type: string; data: any; name: string }>
): Promise<{ url: string; fileName: string }> {
  try {
    // 各エクスポートをJSON形式で作成
    const bulkData = {
      userId,
      exportedAt: new Date().toISOString(),
      exports: await Promise.all(
        exports.map(async (exp) => ({
          type: exp.type,
          name: exp.name,
          data: exp.data,
        }))
      ),
    };

    const fileName = `bulk-export-${new Date().toISOString().split('T')[0]}`;
    const url = await exportAsJSON(bulkData, fileName);

    return {
      url,
      fileName: `${fileName}.json`,
    };
  } catch (error) {
    console.error('Failed to create bulk export:', error);
    throw error;
  }
}

/**
 * エクスポート履歴を記録する（データベース統合用）
 */
export interface ExportHistoryRecord {
  id: string;
  userId: string;
  exportType: string;
  format: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  metadata?: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

/**
 * エクスポート進捗をトラッキングする
 */
export class ExportTracker {
  private exports: Map<string, ExportHistoryRecord> = new Map();

  createExport(
    userId: string,
    exportType: string,
    format: string,
    fileName: string
  ): string {
    const exportId = uuidv4();
    const record: ExportHistoryRecord = {
      id: exportId,
      userId,
      exportType,
      format,
      fileName,
      fileUrl: '',
      fileSize: 0,
      status: 'pending',
      createdAt: new Date(),
    };
    this.exports.set(exportId, record);
    return exportId;
  }

  updateExportStatus(
    exportId: string,
    status: 'processing' | 'completed' | 'failed',
    fileUrl?: string,
    fileSize?: number
  ): void {
    const record = this.exports.get(exportId);
    if (!record) throw new Error('Export not found');

    record.status = status;
    if (fileUrl) record.fileUrl = fileUrl;
    if (fileSize) record.fileSize = fileSize;
    if (status === 'completed' || status === 'failed') {
      record.completedAt = new Date();
    }
  }

  getExport(exportId: string): ExportHistoryRecord | undefined {
    return this.exports.get(exportId);
  }

  getAllExports(userId: string): ExportHistoryRecord[] {
    return Array.from(this.exports.values()).filter((e) => e.userId === userId);
  }
}

// グローバルトラッカーインスタンス
export const exportTracker = new ExportTracker();
