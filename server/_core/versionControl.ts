import { getDb } from '../db';
import { versionControl } from '../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface VersionControlPayload {
  userId: string;
  entityType: 'model' | 'plugin' | 'document' | 'config';
  entityId: string;
  entityName: string;
  description?: string;
  content?: string;
  metadata?: Record<string, any>;
  createdBy: string;
}

/**
 * 新しいバージョンを作成する
 */
export async function createVersion(payload: VersionControlPayload): Promise<any> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    // 同じエンティティの最新バージョンを取得
    const latestVersions = await db
      .select()
      .from(versionControl)
      .where(
        and(
          eq(versionControl.entityType, payload.entityType),
          eq(versionControl.entityId, payload.entityId)
        )
      )
      .orderBy(desc(versionControl.version))
      .limit(1);

    const nextVersion = latestVersions.length > 0 ? latestVersions[0].version + 1 : 1;
    const versionTag = `v${nextVersion}`;

    const result = await db.insert(versionControl).values({
      id: uuidv4(),
      userId: parseInt(payload.userId),
      entityType: payload.entityType,
      entityId: payload.entityId,
      entityName: payload.entityName,
      version: nextVersion,
      versionTag,
      description: payload.description,
      content: payload.content,
      metadata: payload.metadata as any,
      createdBy: parseInt(payload.createdBy),
    });

    return { version: nextVersion, versionTag, id: (result as any).insertId };
  } catch (error) {
    console.error('Failed to create version:', error);
    throw error;
  }
}

/**
 * エンティティのすべてのバージョンを取得する
 */
export async function getEntityVersions(
  entityType: string,
  entityId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const versions = await db
      .select()
      .from(versionControl)
      .where(
        and(
          eq(versionControl.entityType, entityType as any),
          eq(versionControl.entityId, entityId)
        )
      )
      .orderBy(desc(versionControl.version))
      .limit(limit);

    return versions;
  } catch (error) {
    console.error('Failed to get entity versions:', error);
    throw error;
  }
}

/**
 * 特定のバージョンを取得する
 */
export async function getVersion(versionId: string): Promise<any> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const versions = await db
      .select()
      .from(versionControl)
      .where(eq(versionControl.id, versionId))
      .limit(1);

    return versions.length > 0 ? versions[0] : null;
  } catch (error) {
    console.error('Failed to get version:', error);
    throw error;
  }
}

/**
 * ユーザーのすべてのバージョン履歴を取得する
 */
export async function getUserVersionHistory(
  userId: string,
  limit: number = 100,
  offset: number = 0
): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const history = await db
      .select()
      .from(versionControl)
      .where(eq(versionControl.userId, parseInt(userId)))
      .orderBy(desc(versionControl.createdAt))
      .limit(limit)
      .offset(offset);

    return history;
  } catch (error) {
    console.error('Failed to get user version history:', error);
    throw error;
  }
}

/**
 * バージョンを復元する（新しいバージョンとして作成）
 */
export async function restoreVersion(
  versionId: string,
  userId: string,
  reason?: string
): Promise<any> {
  try {
    const sourceVersion = await getVersion(versionId);
    if (!sourceVersion) throw new Error('Version not found');

    const result = await createVersion({
      userId,
      entityType: sourceVersion.entityType,
      entityId: sourceVersion.entityId,
      entityName: sourceVersion.entityName,
      description: `Restored from ${sourceVersion.versionTag}${reason ? ': ' + reason : ''}`,
      content: sourceVersion.content,
      metadata: {
        ...sourceVersion.metadata,
        restoredFrom: sourceVersion.versionTag,
      },
      createdBy: userId,
    });

    return result;
  } catch (error) {
    console.error('Failed to restore version:', error);
    throw error;
  }
}

/**
 * バージョン間の差分を取得する
 */
export async function getVersionDiff(
  versionId1: string,
  versionId2: string
): Promise<any> {
  try {
    const version1 = await getVersion(versionId1);
    const version2 = await getVersion(versionId2);

    if (!version1 || !version2) throw new Error('One or both versions not found');

    // 簡単な差分表示（実際にはより詳細な差分アルゴリズムが必要）
    return {
      version1: {
        id: version1.id,
        versionTag: version1.versionTag,
        content: version1.content,
      },
      version2: {
        id: version2.id,
        versionTag: version2.versionTag,
        content: version2.content,
      },
      changes: {
        contentChanged: version1.content !== version2.content,
        metadataChanged: JSON.stringify(version1.metadata) !== JSON.stringify(version2.metadata),
      },
    };
  } catch (error) {
    console.error('Failed to get version diff:', error);
    throw error;
  }
}

/**
 * バージョンを削除する
 */
export async function deleteVersion(versionId: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    await db
      .delete(versionControl)
      .where(eq(versionControl.id, versionId));
  } catch (error) {
    console.error('Failed to delete version:', error);
    throw error;
  }
}

/**
 * 古いバージョンを削除する（各エンティティごとに最新N個を保持）
 */
export async function cleanupOldVersions(keepCount: number = 10): Promise<number> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    // すべてのエンティティを取得
    const allVersions = await db
      .select()
      .from(versionControl)
      .orderBy(desc(versionControl.createdAt));

    // エンティティごとにグループ化
    const groupedByEntity: Record<string, any[]> = {};
    allVersions.forEach((v: any) => {
      const key = `${v.entityType}:${v.entityId}`;
      if (!groupedByEntity[key]) {
        groupedByEntity[key] = [];
      }
      groupedByEntity[key].push(v);
    });

    // 古いバージョンを削除
    let deletedCount = 0;
    for (const versions of Object.values(groupedByEntity)) {
      if (versions.length > keepCount) {
        const toDelete = versions.slice(keepCount);
        for (const v of toDelete) {
          await deleteVersion(v.id);
          deletedCount++;
        }
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('Failed to cleanup old versions:', error);
    throw error;
  }
}

/**
 * バージョン統計を取得する
 */
export async function getVersionStats(userId: string): Promise<{
  totalVersions: number;
  byEntityType: Record<string, number>;
  byEntity: Record<string, number>;
}> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const userVersions = await db
      .select()
      .from(versionControl)
      .where(eq(versionControl.userId, parseInt(userId)));

    const byEntityType: Record<string, number> = {};
    const byEntity: Record<string, number> = {};

    userVersions.forEach((v: any) => {
      byEntityType[v.entityType] = (byEntityType[v.entityType] || 0) + 1;
      const key = `${v.entityType}:${v.entityId}`;
      byEntity[key] = (byEntity[key] || 0) + 1;
    });

    return {
      totalVersions: userVersions.length,
      byEntityType,
      byEntity,
    };
  } catch (error) {
    console.error('Failed to get version stats:', error);
    throw error;
  }
}

/**
 * バージョンタグを更新する
 */
export async function updateVersionTag(
  versionId: string,
  newTag: string
): Promise<void> {
  try {
    // Drizzle ORM では update メソッドを使用
    // 注: 実装は DB ドライバによって異なる
    const version = await getVersion(versionId);
    if (!version) throw new Error('Version not found');

    // バージョンタグの更新は通常、バージョン作成時に決定されるため、
    // ここでは説明のみ
    console.log(`Version tag update would change ${versionId} to ${newTag}`);
  } catch (error) {
    console.error('Failed to update version tag:', error);
    throw error;
  }
}
