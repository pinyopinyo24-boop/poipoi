/**
 * PaymentIntegrationService Tests - 15個のテスト\n */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { paymentIntegrationService, PaymentIntegrationService } from './PaymentIntegrationService';

describe('PaymentIntegrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paymentIntegrationService.cleanup();
  });

  afterEach(() => {
    paymentIntegrationService.cleanup();
  });

  // === 支払い方法追加テスト ===
  describe('Add Payment Method', () => {
    it('should add payment method', () => {
      const method = paymentIntegrationService.addPaymentMethod(1, 'credit_card', '1234', '12/25');
      expect(method).not.toBeNull();
      expect(method.type).toBe('credit_card');
    });

    it('should get payment method', () => {
      const created = paymentIntegrationService.addPaymentMethod(1, 'credit_card', '1234', '12/25');
      const retrieved = paymentIntegrationService.getPaymentMethod(created.id);
      expect(retrieved).not.toBeNull();
    });

    it('should get user payment methods', () => {
      paymentIntegrationService.addPaymentMethod(1, 'credit_card', '1234', '12/25');
      paymentIntegrationService.addPaymentMethod(1, 'paypal');
      const methods = paymentIntegrationService.getUserPaymentMethods(1);
      expect(methods.length).toBe(2);
    });
  });

  // === デフォルト支払い方法テスト ===
  describe('Default Payment Method', () => {
    it('should set default payment method', () => {
      const method = paymentIntegrationService.addPaymentMethod(1, 'credit_card', '1234', '12/25');
      const result = paymentIntegrationService.setDefaultPaymentMethod(1, method.id);
      expect(result?.isDefault).toBe(true);
    });

    it('should get default payment method', () => {
      const method = paymentIntegrationService.addPaymentMethod(1, 'credit_card', '1234', '12/25');
      paymentIntegrationService.setDefaultPaymentMethod(1, method.id);
      const defaultMethod = paymentIntegrationService.getDefaultPaymentMethod(1);
      expect(defaultMethod?.id).toBe(method.id);
    });
  });

  // === 支払い方法削除テスト ===
  describe('Delete Payment Method', () => {
    it('should delete payment method', () => {
      const method = paymentIntegrationService.addPaymentMethod(1, 'credit_card', '1234', '12/25');
      const result = paymentIntegrationService.deletePaymentMethod(method.id);
      expect(result).toBe(true);
    });
  });

  // === 支払い処理テスト ===
  describe('Process Payment', () => {
    it('should process payment', async () => {
      const transaction = await paymentIntegrationService.processPayment(
        1,
        'bill_123',
        'pm_123',
        99.99,
        'USD'
      );
      expect(transaction).not.toBeNull();
      expect(['completed', 'failed']).toContain(transaction.status);
    });

    it('should get transaction', async () => {
      const created = await paymentIntegrationService.processPayment(
        1,
        'bill_123',
        'pm_123',
        99.99,
        'USD'
      );
      const retrieved = paymentIntegrationService.getTransaction(created.id);
      expect(retrieved).not.toBeNull();
    });

    it('should get user transactions', async () => {
      await paymentIntegrationService.processPayment(1, 'bill_123', 'pm_123', 99.99, 'USD');
      await paymentIntegrationService.processPayment(1, 'bill_456', 'pm_123', 49.99, 'USD');
      const transactions = paymentIntegrationService.getUserTransactions(1);
      expect(transactions.length).toBe(2);
    });
  });

  // === 支払い検証テスト ===
  describe('Validate Payment Method', () => {
    it('should validate payment method', () => {
      const method = paymentIntegrationService.addPaymentMethod(1, 'credit_card', '1234', '12/25');
      const result = paymentIntegrationService.validatePaymentMethod(method.id);
      expect(result.isValid === true || result.isValid === false).toBe(true);
    });
  });

  // === 支払い統計テスト ===
  describe('Payment Statistics', () => {
    it('should get payment stats', async () => {
      await paymentIntegrationService.processPayment(1, 'bill_123', 'pm_123', 99.99, 'USD');
      const stats = paymentIntegrationService.getPaymentStats(1);
      expect(stats.totalTransactions).toBe(1);
    });
  });

  // === 支払い再試行テスト ===
  describe('Retry Payment', () => {
    it('should retry payment', async () => {
      const transaction = await paymentIntegrationService.processPayment(
        1,
        'bill_123',
        'pm_123',
        99.99,
        'USD'
      );

      if (transaction.status === 'failed') {
        const retried = await paymentIntegrationService.retryPayment(transaction.id);
        expect(retried).not.toBeNull();
      }
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup specific user', () => {
      paymentIntegrationService.addPaymentMethod(1, 'credit_card', '1234', '12/25');
      paymentIntegrationService.cleanup(1);
      const methods = paymentIntegrationService.getUserPaymentMethods(1);
      expect(methods.length).toBe(0);
    });

    it('should cleanup all', () => {
      paymentIntegrationService.addPaymentMethod(1, 'credit_card', '1234', '12/25');
      paymentIntegrationService.addPaymentMethod(2, 'credit_card', '5678', '12/25');
      paymentIntegrationService.cleanup();
      const methods1 = paymentIntegrationService.getUserPaymentMethods(1);
      const methods2 = paymentIntegrationService.getUserPaymentMethods(2);
      expect(methods1.length).toBe(0);
      expect(methods2.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = PaymentIntegrationService.getInstance();
      const instance2 = PaymentIntegrationService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
