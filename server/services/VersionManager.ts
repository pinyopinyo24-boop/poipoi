/**
 * VersionManager - バージョン管理とロールバック
 */
export interface Version {
  id: string;
  userId: string;
  description: string;
  data: any;
  timestamp: Date;
  tag?: string;
  checksum?: string;
}

export class VersionManager {
  /**
   * バージョンを作成
   */
  async createVersion(params: {
    userId: string;
    description: string;
    data: any;
    timestamp: Date;
  }): Promise<Version> {
    const version: Version = {
      id: `version_${params.userId}_${Date.now()}`,
      userId: params.userId,
      description: params.description,
      data: params.data,
      timestamp: params.timestamp,
      tag: this.generateTag(params.timestamp),
      checksum: this.calculateChecksum(params.data),
    };

    return version;
  }

  /**
   * バージョンを復元
   */
  async restoreVersion(version: Version): Promise<any> {
    // バージョンのデータを復元
    return {
      ...version.data,
      restoredAt: new Date(),
      restoredFromVersion: version.id,
    };
  }

  /**
   * バージョン差分を計算
   */
  async calculateDiff(version1: Version, version2: Version): Promise<any> {
    const diff: any = {
      added: [],
      removed: [],
      modified: [],
    };

    // 簡単な差分計算
    const keys1 = Object.keys(version1.data);
    const keys2 = Object.keys(version2.data);

    // 追加されたキー
    diff.added = keys2.filter(k => !keys1.includes(k));

    // 削除されたキー
    diff.removed = keys1.filter(k => !keys2.includes(k));

    // 変更されたキー
    diff.modified = keys1.filter(k => {
      return keys2.includes(k) && JSON.stringify(version1.data[k]) !== JSON.stringify(version2.data[k]);
    });

    return diff;
  }

  /**
   * タグを生成
   */
  private generateTag(timestamp: Date): string {
    const date = timestamp.toISOString().split('T')[0];
    const time = timestamp.toISOString().split('T')[1].split('.')[0].replace(/:/g, '');
    return `v${date.replace(/-/g, '')}_${time}`;
  }

  /**
   * チェックサムを計算
   */
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * バージョンの整合性を検証
   */
  async validateVersion(version: Version): Promise<boolean> {
    const currentChecksum = this.calculateChecksum(version.data);
    return currentChecksum === version.checksum;
  }

  /**
   * バージョン履歴を圧縮
   */
  async compressHistory(versions: Version[], keepCount = 10): Promise<Version[]> {
    if (versions.length <= keepCount) {
      return versions;
    }

    // 最新のバージョンを保持し、古いものは削除
    return versions.slice(0, keepCount);
  }

  /**
   * バージョン間の互換性を確認
   */
  async checkCompatibility(version1: Version, version2: Version): Promise<boolean> {
    // 簡単な互換性チェック
    const keys1 = Object.keys(version1.data);
    const keys2 = Object.keys(version2.data);

    // 共通のキーが50%以上あれば互換性があると判定
    const commonKeys = keys1.filter(k => keys2.includes(k));
    const compatibility = commonKeys.length / Math.max(keys1.length, keys2.length);

    return compatibility >= 0.5;
  }

  /**
   * バージョンをマージ
   */
  async mergeVersions(baseVersion: Version, otherVersion: Version): Promise<Version> {
    const mergedData = {
      ...baseVersion.data,
      ...otherVersion.data,
    };

    return {
      id: `merged_${baseVersion.id}_${otherVersion.id}`,
      userId: baseVersion.userId,
      description: `Merged ${baseVersion.description} with ${otherVersion.description}`,
      data: mergedData,
      timestamp: new Date(),
      tag: this.generateTag(new Date()),
      checksum: this.calculateChecksum(mergedData),
    };
  }

  /**
   * バージョン統計を取得
   */
  async getVersionStats(versions: Version[]): Promise<any> {
    if (versions.length === 0) {
      return {
        totalVersions: 0,
        oldestVersion: null,
        newestVersion: null,
        averageDataSize: 0,
      };
    }

    const dataSizes = versions.map(v => JSON.stringify(v.data).length);
    const averageDataSize = dataSizes.reduce((a, b) => a + b, 0) / dataSizes.length;

    return {
      totalVersions: versions.length,
      oldestVersion: versions[versions.length - 1],
      newestVersion: versions[0],
      averageDataSize,
      totalDataSize: dataSizes.reduce((a, b) => a + b, 0),
    };
  }

  /**
   * バージョンをエクスポート
   */
  async exportVersion(version: Version): Promise<string> {
    return JSON.stringify(version, null, 2);
  }

  /**
   * バージョンをインポート
   */
  async importVersion(jsonString: string): Promise<Version> {
    try {
      const version = JSON.parse(jsonString) as Version;
      // バージョンの検証
      if (!version.id || !version.userId || !version.data) {
        throw new Error('Invalid version format');
      }
      return version;
    } catch (error) {
      throw new Error(`Failed to import version: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
