import { getDb } from '../db';
import { sql, eq } from 'drizzle-orm';
import type { LongTermMemory } from '../../drizzle/schema';
import { longTermMemory } from '../../drizzle/schema';

export type MemoryType = 'preference' | 'context' | 'learning' | 'relationship' | 'skill';

export interface Memory {
  id: string;
  userId: number;
  memoryType: MemoryType;
  key: string;
  value: string;
  importance: number;
  metadata?: Record<string, any>;
  lastAccessed: Date;
  accessCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class LongTermMemoryManager {
  /**
   * メモリを保存または更新
   */
  async saveMemory(
    userId: number,
    memoryType: MemoryType,
    key: string,
    value: string,
    importance: number = 5,
    metadata?: Record<string, any>
  ): Promise<Memory> {
    const db = await getDb();
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!db) {
      throw new Error('Database not available');
    }

    try {
      const now = new Date();

      // 既存のメモリを確認
      const existing = await db
        .select()
        .from(longTermMemory)
        .where(
          sql`${longTermMemory.userId} = ${userId} AND ${longTermMemory.memoryType} = ${memoryType} AND ${longTermMemory.key} = ${key}`
        );

      if (existing.length > 0) {
        // 既存のメモリを更新
        await db
          .update(longTermMemory)
          .set({
            value,
            importance,
            metadata: JSON.stringify(metadata || {}),
            lastAccessed: now,
            accessCount: existing[0].accessCount + 1,
            updatedAt: now,
          })
          .where(sql`${longTermMemory.id} = ${existing[0].id}`);

        return {
          id: existing[0].id,
          userId,
          memoryType,
          key,
          value,
          importance,
          metadata,
          lastAccessed: now,
          accessCount: existing[0].accessCount + 1,
          createdAt: existing[0].createdAt,
          updatedAt: now,
        };
      } else {
        // 新しいメモリを作成
        await db.insert(longTermMemory).values({
          id,
          userId,
          memoryType,
          key,
          value,
          importance,
          metadata: JSON.stringify(metadata || {}),
          lastAccessed: now,
          accessCount: 1,
          createdAt: now,
          updatedAt: now,
        });

        return {
          id,
          userId,
          memoryType,
          key,
          value,
          importance,
          metadata,
          lastAccessed: now,
          accessCount: 1,
          createdAt: now,
          updatedAt: now,
        };
      }
    } catch (error) {
      console.error('Failed to save memory:', error);
      throw error;
    }
  }

  /**
   * メモリを取得
   */
  async getMemory(userId: number, memoryType: MemoryType, key: string): Promise<Memory | null> {
    const db = await getDb();

    if (!db) {
      return null;
    }

    try {
      const result = await db
        .select()
        .from(longTermMemory)
        .where(
          sql`${longTermMemory.userId} = ${userId} AND ${longTermMemory.memoryType} = ${memoryType} AND ${longTermMemory.key} = ${key}`
        );

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        id: row.id,
        userId: row.userId,
        memoryType: row.memoryType,
        key: row.key,
        value: row.value,
        importance: row.importance,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
        lastAccessed: row.lastAccessed,
        accessCount: row.accessCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    } catch (error) {
      console.error('Failed to get memory:', error);
      return null;
    }
  }

  /**
   * ユーザーのすべてのメモリを取得
   */
  async getUserMemories(userId: number, memoryType?: MemoryType): Promise<Memory[]> {
    const db = await getDb();

    if (!db) {
      return [];
    }

    try {
      let whereConditions: any[] = [eq(longTermMemory.userId, userId)];

      if (memoryType) {
        whereConditions.push(eq(longTermMemory.memoryType, memoryType));
      }

      const results = await db
        .select()
        .from(longTermMemory)
        .where(
          memoryType
            ? sql`${longTermMemory.userId} = ${userId} AND ${longTermMemory.memoryType} = ${memoryType}`
            : sql`${longTermMemory.userId} = ${userId}`
        )
        .orderBy(sql`${longTermMemory.importance} DESC, ${longTermMemory.lastAccessed} DESC`);

      return results.map(row => ({
        id: row.id,
        userId: row.userId,
        memoryType: row.memoryType,
        key: row.key,
        value: row.value,
        importance: row.importance,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
        lastAccessed: row.lastAccessed,
        accessCount: row.accessCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
    } catch (error) {
      console.error('Failed to get user memories:', error);
      return [];
    }
  }

  /**
   * メモリを削除
   */
  async deleteMemory(id: string, userId: number): Promise<boolean> {
    const db = await getDb();

    if (!db) {
      return false;
    }

    try {
      await db.delete(longTermMemory).where(
        sql`${longTermMemory.id} = ${id} AND ${longTermMemory.userId} = ${userId}`
      );

      return true;
    } catch (error) {
      console.error('Failed to delete memory:', error);
      return false;
    }
  }

  /**
   * メモリの重要度を更新
   */
  async updateImportance(id: string, userId: number, importance: number): Promise<boolean> {
    const db = await getDb();

    if (!db) {
      return false;
    }

    try {
      await db
        .update(longTermMemory)
        .set({
          importance: Math.max(1, Math.min(10, importance)),
          updatedAt: new Date(),
        })
        .where(sql`${longTermMemory.id} = ${id} AND ${longTermMemory.userId} = ${userId}`);

      return true;
    } catch (error) {
      console.error('Failed to update memory importance:', error);
      return false;
    }
  }

  /**
   * 関連するメモリを検索
   */
  async searchMemories(userId: number, query: string, memoryType?: MemoryType): Promise<Memory[]> {
    const db = await getDb();

    if (!db) {
      return [];
    }

    try {
      const results = await db
        .select()
        .from(longTermMemory)
        .where(
          sql`${longTermMemory.userId} = ${userId} AND (${longTermMemory.key} LIKE ${'%' + query + '%'} OR ${longTermMemory.value} LIKE ${'%' + query + '%'})${memoryType ? sql` AND ${longTermMemory.memoryType} = ${memoryType}` : sql``}`
        )
        .orderBy(sql`${longTermMemory.importance} DESC`);

      return results.map(row => ({
        id: row.id,
        userId: row.userId,
        memoryType: row.memoryType,
        key: row.key,
        value: row.value,
        importance: row.importance,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
        lastAccessed: row.lastAccessed,
        accessCount: row.accessCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
    } catch (error) {
      console.error('Failed to search memories:', error);
      return [];
    }
  }

  /**
   * 最も重要なメモリを取得（コンテキスト用）
   */
  async getTopMemories(userId: number, limit: number = 10): Promise<Memory[]> {
    const db = await getDb();

    if (!db) {
      return [];
    }

    try {
      const results = await db
        .select()
        .from(longTermMemory)
        .where(eq(longTermMemory.userId, userId))
        .orderBy(sql`${longTermMemory.importance} DESC, ${longTermMemory.lastAccessed} DESC`)
        .limit(limit);

      return results.map(row => ({
        id: row.id,
        userId: row.userId,
        memoryType: row.memoryType,
        key: row.key,
        value: row.value,
        importance: row.importance,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : {},
        lastAccessed: row.lastAccessed,
        accessCount: row.accessCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
    } catch (error) {
      console.error('Failed to get top memories:', error);
      return [];
    }
  }
}

export const longTermMemoryManager = new LongTermMemoryManager();
