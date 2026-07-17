/**
 * PaymentIntegrationService - 支払い統合
 * 
 * 機能:
 * - 支払い処理
 * - 支払い方法管理\n * - 支払い検証
 * - 支払い統計
 */

export interface PaymentMethod {
  id: string;
  userId: number;
  type: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';
  isDefault: boolean;
  lastFourDigits?: string;
  expiryDate?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PaymentTransaction {
  id: string;
  userId: number;
  billingRecordId: string;
  paymentMethodId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export class PaymentIntegrationService {
  private static instance: PaymentIntegrationService;
  private paymentMethods: Map<string, PaymentMethod> = new Map();
  private transactions: Map<string, PaymentTransaction> = new Map();
  private methodCounter: number = 0;
  private transactionCounter: number = 0;

  private constructor() {}

  static getInstance(): PaymentIntegrationService {
    if (!PaymentIntegrationService.instance) {
      PaymentIntegrationService.instance = new PaymentIntegrationService();
    }
    return PaymentIntegrationService.instance;
  }

  /**
   * 支払い方法追加
   */
  addPaymentMethod(
    userId: number,
    type: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer',
    lastFourDigits?: string,
    expiryDate?: string
  ): PaymentMethod {
    const methodId = `pm_${++this.methodCounter}_${Date.now()}`;
    const now = Date.now();

    const method: PaymentMethod = {
      id: methodId,
      userId,
      type,
      isDefault: false,
      lastFourDigits,
      expiryDate,
      createdAt: now,
      updatedAt: now,
    };

    this.paymentMethods.set(methodId, method);
    return method;
  }

  /**
   * 支払い方法取得
   */
  getPaymentMethod(methodId: string): PaymentMethod | null {
    return this.paymentMethods.get(methodId) || null;
  }

  /**
   * ユーザー支払い方法取得
   */
  getUserPaymentMethods(userId: number): PaymentMethod[] {
    const methods: PaymentMethod[] = [];
    this.paymentMethods.forEach((method: PaymentMethod) => {
      if (method.userId === userId) {
        methods.push(method);
      }
    });
    return methods;
  }

  /**
   * デフォルト支払い方法設定
   */
  setDefaultPaymentMethod(userId: number, methodId: string): PaymentMethod | null {
    const method = this.getPaymentMethod(methodId);
    if (!method || method.userId !== userId) return null;

    // 他のデフォルトをリセット
    this.paymentMethods.forEach((m: PaymentMethod) => {
      if (m.userId === userId && m.id !== methodId) {
        m.isDefault = false;
      }
    });

    method.isDefault = true;
    method.updatedAt = Date.now();
    return method;
  }

  /**
   * デフォルト支払い方法取得
   */
  getDefaultPaymentMethod(userId: number): PaymentMethod | null {
    const methods = this.getUserPaymentMethods(userId);
    return methods.find(m => m.isDefault) || null;
  }

  /**
   * 支払い方法削除
   */
  deletePaymentMethod(methodId: string): boolean {
    return this.paymentMethods.delete(methodId);
  }

  /**
   * 支払い処理
   */
  async processPayment(
    userId: number,
    billingRecordId: string,
    paymentMethodId: string,
    amount: number,
    currency: string
  ): Promise<PaymentTransaction> {
    const transactionId = `txn_${++this.transactionCounter}_${Date.now()}`;
    const now = Date.now();

    const transaction: PaymentTransaction = {
      id: transactionId,
      userId,
      billingRecordId,
      paymentMethodId,
      amount,
      currency,
      status: 'processing',
      createdAt: now,
      updatedAt: now,
    };

    this.transactions.set(transactionId, transaction);

    // 支払い処理をシミュレート
    await new Promise(resolve => setTimeout(resolve, 100));

    // 90%の確率で成功
    if (Math.random() < 0.9) {
      transaction.status = 'completed';
      transaction.transactionId = `ext_${Date.now()}`;
    } else {
      transaction.status = 'failed';
      transaction.errorMessage = 'Payment processing failed';
    }

    transaction.updatedAt = Date.now();
    return transaction;
  }

  /**
   * トランザクション取得
   */
  getTransaction(transactionId: string): PaymentTransaction | null {
    return this.transactions.get(transactionId) || null;
  }

  /**
   * ユーザートランザクション取得
   */
  getUserTransactions(userId: number): PaymentTransaction[] {
    const txns: PaymentTransaction[] = [];
    this.transactions.forEach((txn: PaymentTransaction) => {
      if (txn.userId === userId) {
        txns.push(txn);
      }
    });
    return txns;
  }

  /**
   * 支払い検証
   */
  validatePaymentMethod(methodId: string): { isValid: boolean; message: string } {
    const method = this.getPaymentMethod(methodId);
    if (!method) {
      return { isValid: false, message: '支払い方法が見つかりません' };
    }

    if (method.type === 'credit_card' || method.type === 'debit_card') {
      if (method.expiryDate) {
        const [month, year] = method.expiryDate.split('/');
        const expiryDate = new Date(parseInt(year) + 2000, parseInt(month));
        if (expiryDate < new Date()) {
          return { isValid: false, message: 'カードの有効期限が切れています' };
        }
      }
    }

    return { isValid: true, message: '有効な支払い方法です' };
  }

  /**
   * 支払い統計取得
   */
  getPaymentStats(userId: number): {
    totalTransactions: number;
    completedTransactions: number;
    failedTransactions: number;
    totalAmount: number;
    averageAmount: number;
  } {
    const transactions = this.getUserTransactions(userId);
    const completed = transactions.filter(t => t.status === 'completed');
    const failed = transactions.filter(t => t.status === 'failed');
    const totalAmount = completed.reduce((sum, t) => sum + t.amount, 0);

    return {
      totalTransactions: transactions.length,
      completedTransactions: completed.length,
      failedTransactions: failed.length,
      totalAmount,
      averageAmount: completed.length > 0 ? totalAmount / completed.length : 0,
    };
  }

  /**
   * 支払い再試行
   */
  async retryPayment(transactionId: string): Promise<PaymentTransaction | null> {
    const transaction = this.getTransaction(transactionId);
    if (!transaction) return null;

    if (transaction.status !== 'failed') {
      return null;
    }

    transaction.status = 'processing';
    transaction.updatedAt = Date.now();

    await new Promise(resolve => setTimeout(resolve, 100));

    if (Math.random() < 0.9) {
      transaction.status = 'completed';
      transaction.transactionId = `ext_${Date.now()}`;
    } else {
      transaction.status = 'failed';
      transaction.errorMessage = 'Payment processing failed';
    }

    transaction.updatedAt = Date.now();
    return transaction;
  }

  /**
   * クリーンアップ
   */
  cleanup(userId?: number): void {
    if (userId) {
      const toDelete: string[] = [];
      this.paymentMethods.forEach((method: PaymentMethod, id: string) => {
        if (method.userId === userId) {
          toDelete.push(id);
        }
      });
      toDelete.forEach(id => this.paymentMethods.delete(id));

      const txnToDelete: string[] = [];
      this.transactions.forEach((txn: PaymentTransaction, id: string) => {
        if (txn.userId === userId) {
          txnToDelete.push(id);
        }
      });
      txnToDelete.forEach(id => this.transactions.delete(id));
    } else {
      this.paymentMethods.clear();
      this.transactions.clear();
    }
  }
}

export const paymentIntegrationService = PaymentIntegrationService.getInstance();
export default paymentIntegrationService;
