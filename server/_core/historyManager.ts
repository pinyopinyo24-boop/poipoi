import { getDb } from '../db';
import { sql, eq } from 'drizzle-orm';
import type { History } from '../../drizzle/schema';
import { history } from '../../drizzle/schema';

export type HistoryEntry = History;

export class HistoryManager {
  /**
   * 履歴エントリを保存
   */
  async saveEntry(
    userId: number,
    type: string,
    title: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<HistoryEntry> {
    const db = await getDb();
    const id = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!db) {
      throw new Error('Database not available');
    }

    try {
      const now = new Date();
      await db.insert(history).values({
        id,
        userId,
        type: type as any,
        title,
        content,
        metadata: JSON.stringify(metadata || {}),
        createdAt: now,
      });

      return {
        id,
        userId,
        type: type as any,
        title,
        content,
        metadata,
        createdAt: now,
      };
    } catch (error) {
      console.error('Failed to save history entry:', error);
      throw error;
    }
  }

  /**
   * ユーザーの履歴を取得
   */
  async getUserHistory(userId: number, limit: number = 50): Promise<HistoryEntry[]> {
    const db = await getDb();

    if (!db) {
      return [];
    }

    try {
      const results = await db
        .select()
        .from(history)
        .where(eq(history.userId, userId))
        .orderBy(sql`${history.createdAt} DESC`)
        .limit(limit);

      return results.map(row => ({
        id: row.id,
        userId: row.userId,
        type: row.type,
        title: row.title,
        content: row.content,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
        createdAt: row.createdAt,
      }));
    } catch (error) {
      console.error('Failed to get user history:', error);
      return [];
    }
  }

  /**
   * 履歴エントリを削除
   */
  async deleteEntry(id: string, userId: number): Promise<boolean> {
    const db = await getDb();

    if (!db) {
      return false;
    }

    try {
      await db.delete(history).where(
        sql`${history.id} = ${id} AND ${history.userId} = ${userId}`
      );

      return true;
    } catch (error) {
      console.error('Failed to delete history entry:', error);
      return false;
    }
  }

  /**
   * 履歴を検索
   */
  async searchHistory(userId: number, query: string): Promise<HistoryEntry[]> {
    const db = await getDb();

    if (!db) {
      return [];
    }

    try {
      const results = await db
        .select()
        .from(history)
        .where(
          sql`${history.userId} = ${userId} AND (${history.title} LIKE ${'%' + query + '%'} OR ${history.content} LIKE ${'%' + query + '%'})`
        )
        .orderBy(sql`${history.createdAt} DESC`);

      return results.map(row => ({
        id: row.id,
        userId: row.userId,
        type: row.type,
        title: row.title,
        content: row.content,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
        createdAt: row.createdAt,
      }));
    } catch (error) {
      console.error('Failed to search history:', error);
      return [];
    }
  }
}

export const historyManager = new HistoryManager();
