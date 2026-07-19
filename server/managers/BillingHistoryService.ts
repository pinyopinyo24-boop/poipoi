/**
 * BillingHistoryService - 請求履歴管理
 * 
 * 機能:
 * - 請求記録・履歴
 * - 請求統計
 * - 請求レポート
 * - 支払い追跡
 */

export interface BillingRecord {
  id: string;
  userId: number;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  billingDate: number;
  dueDate: number;
  paidDate?: number;
  invoiceNumber: string;
  description: string;
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export class BillingHistoryService {
  private static instance: BillingHistoryService;
  private records: Map<number, BillingRecord[]> = new Map();
  private recordCounter: number = 0;

  private constructor() {}

  static getInstance(): BillingHistoryService {
    if (!BillingHistoryService.instance) {
      BillingHistoryService.instance = new BillingHistoryService();
    }
    return BillingHistoryService.instance;
  }

  /**
   * 請求記録作成
   */
  createBillingRecord(
    userId: number,
    subscriptionId: string,
    amount: number,
    currency: string,
    description: string,
    metadata: Record<string, any> = {}
  ): BillingRecord {
    const recordId = `bill_${++this.recordCounter}_${Date.now()}`;
    const now = Date.now();
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const dueDate = now + 30 * 86400000;

    const record: BillingRecord = {
      id: recordId,
      userId,
      subscriptionId,
      amount,
      currency,
      status: 'pending',
      billingDate: now,
      dueDate,
      invoiceNumber,
      description,
      metadata,
      createdAt: now,
      updatedAt: now,
    };

    if (!this.records.has(userId)) {
      this.records.set(userId, []);
    }

    const userRecords = this.records.get(userId);
    if (userRecords) {
      userRecords.push(record);
    }

    return record;
  }

  /**
   * 請求記録取得
   */
  getBillingRecord(recordId: string): BillingRecord | null {
    let result: BillingRecord | null = null;
    this.records.forEach((records: BillingRecord[]) => {
      const record = records.find((r: BillingRecord) => r.id === recordId);
      if (record) result = record;
    });
    return result;
  }

  /**
   * ユーザー請求記録取得
   */
  getUserBillingRecords(userId: number): BillingRecord[] {
    return this.records.get(userId) || [];
  }

  /**
   * 請求記録更新
   */
  updateBillingRecord(recordId: string, updates: Partial<BillingRecord>): BillingRecord | null {
    const record = this.getBillingRecord(recordId);
    if (!record) return null;

    const updated = { ...record, ...updates, updatedAt: Date.now() };
    const userRecords = this.records.get(record.userId);
    if (userRecords) {
      const index = userRecords.findIndex(r => r.id === recordId);
      if (index !== -1) {
        userRecords[index] = updated;
      }
    }

    return updated;
  }

  /**
   * 支払い完了
   */
  markAsPaid(recordId: string): BillingRecord | null {
    return this.updateBillingRecord(recordId, {
      status: 'completed',
      paidDate: Date.now(),
    });
  }

  /**
   * 支払い失敗
   */
  markAsFailed(recordId: string): BillingRecord | null {
    return this.updateBillingRecord(recordId, {
      status: 'failed',
    });
  }

  /**
   * 返金処理
   */
  refund(recordId: string): BillingRecord | null {
    return this.updateBillingRecord(recordId, {
      status: 'refunded',
    });
  }

  /**
   * 期限切れ請求確認
   */
  getOverdueRecords(userId: number): BillingRecord[] {
    const now = Date.now();
    const userRecords = this.getUserBillingRecords(userId);
    return userRecords.filter(r => r.status === 'pending' && r.dueDate < now);
  }

  /**
   * 請求統計取得
   */
  getBillingStats(userId: number): {
    totalBilled: number;
    totalPaid: number;
    totalPending: number;
    totalFailed: number;
    totalRefunded: number;
    recordCount: number;
  } {
    const records = this.getUserBillingRecords(userId);

    const totalBilled = records.reduce((sum, r) => sum + r.amount, 0);
    const totalPaid = records.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.amount, 0);
    const totalPending = records.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);
    const totalFailed = records.filter(r => r.status === 'failed').reduce((sum, r) => sum + r.amount, 0);
    const totalRefunded = records.filter(r => r.status === 'refunded').reduce((sum, r) => sum + r.amount, 0);

    return {
      totalBilled,
      totalPaid,
      totalPending,
      totalFailed,
      totalRefunded,
      recordCount: records.length,
    };
  }

  /**
   * 期間別請求統計
   */
  getBillingStatsByPeriod(
    userId: number,
    startTime: number,
    endTime: number
  ): {
    totalAmount: number;
    recordCount: number;
    completedCount: number;
  } {
    const records = this.getUserBillingRecords(userId).filter(
      r => r.billingDate >= startTime && r.billingDate <= endTime
    );

    return {
      totalAmount: records.reduce((sum, r) => sum + r.amount, 0),
      recordCount: records.length,
      completedCount: records.filter(r => r.status === 'completed').length,
    };
  }

  /**
   * 請求レポート生成
   */
  generateBillingReport(userId: number): {
    userId: number;
    totalRecords: number;
    totalAmount: number;
    averageAmount: number;
    lastBillingDate?: number;
    nextBillingDate?: number;
    status: string;
  } {
    const records = this.getUserBillingRecords(userId);
    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
    const averageAmount = records.length > 0 ? totalAmount / records.length : 0;

    const sortedByDate = [...records].sort((a, b) => b.billingDate - a.billingDate);
    const lastBillingDate = sortedByDate[0]?.billingDate;

    const pendingRecords = records.filter(r => r.status === 'pending').sort((a, b) => a.dueDate - b.dueDate);
    const nextBillingDate = pendingRecords[0]?.dueDate;

    let status = '正常';
    if (records.some(r => r.status === 'failed')) {
      status = '支払い失敗あり';
    }
    if (records.some(r => r.status === 'pending' && r.dueDate < Date.now())) {
      status = '期限超過あり';
    }

    return {
      userId,
      totalRecords: records.length,
      totalAmount,
      averageAmount,
      lastBillingDate,
      nextBillingDate,
      status,
    };
  }

  /**
   * 請求記録削除
   */
  deleteBillingRecord(recordId: string): boolean {
    let deleted = false;
    this.records.forEach((records: BillingRecord[]) => {
      const index = records.findIndex(r => r.id === recordId);
      if (index !== -1) {
        records.splice(index, 1);
        deleted = true;
      }
    });
    return deleted;
  }

  /**
   * クリーンアップ
   */
  cleanup(userId?: number): void {
    if (userId) {
      this.records.delete(userId);
    } else {
      this.records.clear();
    }
  }
}

export const billingHistoryService = BillingHistoryService.getInstance();
export default billingHistoryService;
