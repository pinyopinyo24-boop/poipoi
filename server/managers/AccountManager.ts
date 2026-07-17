/**
 * AccountManager - ユーザーアカウント管理
 * 
 * 機能:
 * - アカウント作成・削除
 * - アカウント情報管理
 * - アカウント状態管理
 * - アカウント検証
 */

import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { mysqlTable, varchar, int, timestamp, mysqlEnum, json, boolean, index } from 'drizzle-orm/mysql-core';

// Account table definition
export const accounts = mysqlTable(
  'accounts',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: int('userId').notNull(),
    email: varchar('email', { length: 320 }).notNull(),
    username: varchar('username', { length: 128 }).notNull().unique(),
    status: mysqlEnum('status', ['active', 'inactive', 'suspended', 'deleted']).default('active').notNull(),
    accountType: mysqlEnum('accountType', ['personal', 'business', 'enterprise']).default('personal').notNull(),
    subscriptionTier: mysqlEnum('subscriptionTier', ['free', 'pro', 'enterprise']).default('free').notNull(),
    storageUsed: int('storageUsed').default(0).notNull(),
    storageLimit: int('storageLimit').default(5368709120).notNull(),
    lastLoginAt: timestamp('lastLoginAt'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('accounts_userId_idx').on(table.userId),
    statusIdx: index('accounts_status_idx').on(table.status),
  })
);

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

export interface AccountData {
  id: string;
  userId: number;
  email: string;
  username: string;
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
  accountType: 'personal' | 'business' | 'enterprise';
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  storageUsed: number;
  storageLimit: number;
}

export interface CreateAccountRequest {
  email: string;
  username: string;
  accountType: 'personal' | 'business' | 'enterprise';
  subscriptionTier: 'free' | 'pro' | 'enterprise';
}

export class AccountManager {
  private static instance: AccountManager;

  private constructor() {}

  static getInstance(): AccountManager {
    if (!AccountManager.instance) {
      AccountManager.instance = new AccountManager();
    }
    return AccountManager.instance;
  }

  /**
   * アカウント作成
   */
  async createAccount(userId: string | number, request: CreateAccountRequest): Promise<AccountData | null> {
    try {
      const db = await getDb();
      if (!db) return null;

      const accountId = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const result = await db.insert(accounts).values({
        id: accountId,
        userId: typeof userId === 'string' ? parseInt(userId, 10) : userId,
        email: request.email,
        username: request.username,
        status: 'active',
        accountType: request.accountType,
        subscriptionTier: request.subscriptionTier,
        storageUsed: 0,
        storageLimit: this.getStorageLimit(request.subscriptionTier),
      });

      return this.getAccountById(accountId);
    } catch (error) {
      console.error('Failed to create account:', error);
      return null;
    }
  }

  /**
   * アカウント取得
   */
  async getAccountById(accountId: string): Promise<AccountData | null> {
    try {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);

      return result.length > 0 ? (result[0] as any as AccountData) : null;
    } catch (error) {
      console.error('Failed to get account:', error);
      return null;
    }
  }

  /**
   * ユーザーのアカウント取得
   */
  async getAccountByUserId(userId: string | number): Promise<AccountData | null> {
    try {
      const db = await getDb();
      if (!db) return null;

      const numUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      const result = await db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, numUserId))
        .limit(1);

      return result.length > 0 ? (result[0] as any as AccountData) : null;
    } catch (error) {
      console.error('Failed to get account by user ID:', error);
      return null;
    }
  }

  /**
   * アカウント情報更新
   */
  async updateAccount(accountId: string, updates: Partial<AccountData>): Promise<AccountData | null> {
    try {
      const db = await getDb();
      if (!db) return null;

      const updateData = {
        ...updates,
      };

      await db
        .update(accounts)
        .set(updateData)
        .where(eq(accounts.id, accountId));

      return this.getAccountById(accountId);
    } catch (error) {
      console.error('Failed to update account:', error);
      return null;
    }
  }

  /**
   * アカウント状態更新
   */
  async updateAccountStatus(
    accountId: string,
    status: 'active' | 'inactive' | 'suspended' | 'deleted'
  ): Promise<boolean> {
    try {
      const db = await getDb();
      if (!db) return false;

      await db
        .update(accounts)
        .set({
          status,
        })
        .where(eq(accounts.id, accountId));

      return true;
    } catch (error) {
      console.error('Failed to update account status:', error);
      return false;
    }
  }

  /**
   * 最終ログイン時刻更新
   */
  async updateLastLogin(accountId: string): Promise<boolean> {
    try {
      const db = await getDb();
      if (!db) return false;

      await db
        .update(accounts)
        .set({
          lastLoginAt: new Date(),
        })
        .where(eq(accounts.id, accountId));

      return true;
    } catch (error) {
      console.error('Failed to update last login:', error);
      return false;
    }
  }

  /**
   * ストレージ使用量更新
   */
  async updateStorageUsed(accountId: string, usedBytes: number): Promise<boolean> {
    try {
      const db = await getDb();
      if (!db) return false;

      const account = await this.getAccountById(accountId);
      if (!account) return false;

      if (usedBytes > account.storageLimit) {
        console.warn(`Storage limit exceeded for account ${accountId}`);
        return false;
      }

      await db
        .update(accounts)
        .set({
          storageUsed: usedBytes,
        })
        .where(eq(accounts.id, accountId));

      return true;
    } catch (error) {
      console.error('Failed to update storage used:', error);
      return false;
    }
  }

  /**
   * サブスクリプション更新
   */
  async upgradeSubscription(
    accountId: string,
    tier: 'free' | 'pro' | 'enterprise'
  ): Promise<AccountData | null> {
    try {
      const db = await getDb();
      if (!db) return null;

      await db
        .update(accounts)
        .set({
          subscriptionTier: tier,
          storageLimit: this.getStorageLimit(tier),
        })
        .where(eq(accounts.id, accountId));

      return this.getAccountById(accountId);
    } catch (error) {
      console.error('Failed to upgrade subscription:', error);
      return null;
    }
  }

  /**
   * アカウント削除
   */
  async deleteAccount(accountId: string): Promise<boolean> {
    try {
      const db = await getDb();
      if (!db) return false;

      // ソフトデリート
      await db
        .update(accounts)
        .set({
          status: 'deleted',
        })
        .where(eq(accounts.id, accountId));

      return true;
    } catch (error) {
      console.error('Failed to delete account:', error);
      return false;
    }
  }

  /**
   * アカウント存在確認
   */
  async accountExists(accountId: string): Promise<boolean> {
    try {
      const db = await getDb();
      if (!db) return false;

      const result = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);

      return result.length > 0;
    } catch (error) {
      console.error('Failed to check account existence:', error);
      return false;
    }
  }

  /**
   * ストレージ制限取得
   */
  private getStorageLimit(tier: 'free' | 'pro' | 'enterprise'): number {
    const limits: Record<string, number> = {
      free: 5 * 1024 * 1024 * 1024, // 5GB
      pro: 100 * 1024 * 1024 * 1024, // 100GB
      enterprise: 1024 * 1024 * 1024 * 1024, // 1TB
    };
    return limits[tier] || limits.free;
  }

  /**
   * アカウント統計取得
   */
  async getAccountStats(accountId: string): Promise<{
    totalSize: number;
    usedSize: number;
    remainingSize: number;
    usagePercent: number;
  } | null> {
    try {
      const account = await this.getAccountById(accountId);
      if (!account) return null;

      const remainingSize = account.storageLimit - account.storageUsed;
      const usagePercent = (account.storageUsed / account.storageLimit) * 100;

      return {
        totalSize: account.storageLimit,
        usedSize: account.storageUsed,
        remainingSize,
        usagePercent,
      };
    } catch (error) {
      console.error('Failed to get account stats:', error);
      return null;
    }
  }

  /**
   * アクティブなアカウント一覧取得
   */
  async getActiveAccounts(): Promise<AccountData[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      const result = await db
        .select()
        .from(accounts)
        .where(eq(accounts.status, 'active'));

      return result as any as AccountData[];
    } catch (error) {
      console.error('Failed to get active accounts:', error);
      return [];
    }
  }

  /**
   * アカウント検証
   */
  async validateAccount(accountId: string): Promise<{
    isValid: boolean;
    reason?: string;
  }> {
    try {
      const account = await this.getAccountById(accountId);

      if (!account) {
        return { isValid: false, reason: 'Account not found' };
      }

      if (account.status === 'deleted') {
        return { isValid: false, reason: 'Account is deleted' };
      }

      if (account.status === 'suspended') {
        return { isValid: false, reason: 'Account is suspended' };
      }

      if (account.storageUsed > account.storageLimit) {
        return { isValid: false, reason: 'Storage limit exceeded' };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Failed to validate account:', error);
      return { isValid: false, reason: 'Validation error' };
    }
  }
}

export const accountManager = AccountManager.getInstance();
export default accountManager;
