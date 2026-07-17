/**
 * DeviceValidationRepository - デバイス検証リポジトリ
 */

export interface ValidationRecord {
  recordId: string;
  deviceId: string;
  validationType: string;
  status: 'passed' | 'failed';
  timestamp: number;
  details: Record<string, unknown>;
}

export class DeviceValidationRepository {
  private static instance: DeviceValidationRepository;
  private records: Map<string, ValidationRecord> = new Map();
  private recordCounter: number = 0;

  private constructor() {}

  static getInstance(): DeviceValidationRepository {
    if (!DeviceValidationRepository.instance) {
      DeviceValidationRepository.instance = new DeviceValidationRepository();
    }
    return DeviceValidationRepository.instance;
  }

  /**
   * レコード保存
   */
  saveRecord(
    deviceId: string,
    validationType: string,
    status: 'passed' | 'failed',
    details: Record<string, unknown>
  ): ValidationRecord {
    const recordId = `record_${++this.recordCounter}_${Date.now()}`;

    const record: ValidationRecord = {
      recordId,
      deviceId,
      validationType,
      status,
      timestamp: Date.now(),
      details,
    };

    this.records.set(recordId, record);
    return record;
  }

  /**
   * レコード取得
   */
  getRecord(recordId: string): ValidationRecord | null {
    return this.records.get(recordId) || null;
  }

  /**
   * デバイス別レコード取得
   */
  getRecordsByDevice(deviceId: string): ValidationRecord[] {
    return Array.from(this.records.values()).filter((r) => r.deviceId === deviceId);
  }

  /**
   * タイプ別レコード取得
   */
  getRecordsByType(validationType: string): ValidationRecord[] {
    return Array.from(this.records.values()).filter((r) => r.validationType === validationType);
  }

  /**
   * 成功したレコード取得
   */
  getPassedRecords(): ValidationRecord[] {
    return Array.from(this.records.values()).filter((r) => r.status === 'passed');
  }

  /**
   * 失敗したレコード取得
   */
  getFailedRecords(): ValidationRecord[] {
    return Array.from(this.records.values()).filter((r) => r.status === 'failed');
  }

  /**
   * ページネーション取得
   */
  getRecordsPaginated(page: number = 1, pageSize: number = 10): {
    records: ValidationRecord[];
    totalRecords: number;
    totalPages: number;
    currentPage: number;
  } {
    const allRecords = Array.from(this.records.values());
    const totalRecords = allRecords.length;
    const totalPages = Math.ceil(totalRecords / pageSize);

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const records = allRecords.slice(startIndex, endIndex);

    return {
      records,
      totalRecords,
      totalPages,
      currentPage: page,
    };
  }

  /**
   * レコード統計
   */
  getRecordStatistics(): {
    totalRecords: number;
    passedRecords: number;
    failedRecords: number;
    successRate: number;
    recordsByType: Record<string, number>;
    recordsByDevice: Record<string, number>;
  } {
    const recordArray = Array.from(this.records.values());
    const passedRecords = recordArray.filter((r) => r.status === 'passed').length;
    const failedRecords = recordArray.filter((r) => r.status === 'failed').length;

    const recordsByType: Record<string, number> = {};
    const recordsByDevice: Record<string, number> = {};

    recordArray.forEach((r) => {
      recordsByType[r.validationType] = (recordsByType[r.validationType] || 0) + 1;
      recordsByDevice[r.deviceId] = (recordsByDevice[r.deviceId] || 0) + 1;
    });

    return {
      totalRecords: recordArray.length,
      passedRecords,
      failedRecords,
      successRate: recordArray.length > 0 ? (passedRecords / recordArray.length) * 100 : 0,
      recordsByType,
      recordsByDevice,
    };
  }

  /**
   * レコード削除
   */
  deleteRecord(recordId: string): boolean {
    return this.records.delete(recordId);
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.records.clear();
  }
}

export const deviceValidationRepository = DeviceValidationRepository.getInstance();
export default deviceValidationRepository;
