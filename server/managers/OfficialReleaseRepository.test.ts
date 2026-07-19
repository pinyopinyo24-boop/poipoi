import { describe, it, expect, beforeEach } from 'vitest';

/**
 * OfficialReleaseRepository
 * 正式版リリース・データ永続化層
 */
export interface ReleaseRecord {
  recordId: string;
  version: string;
  releaseDate: Date;
  status: 'draft' | 'certified' | 'released' | 'deprecated';
  platforms: string[];
  downloadCount: number;
  installCount: number;
  crashCount: number;
  userRating: number;
  reviews: number;
  metadata: Record<string, unknown>;
}

export interface ReleaseMetrics {
  version: string;
  downloadCount: number;
  installCount: number;
  crashCount: number;
  activeUsers: number;
  userRating: number;
  reviews: number;
  releaseDate: Date;
}

export class OfficialReleaseRepository {
  private releases: Map<string, ReleaseRecord> = new Map();
  private releasesByVersion: Map<string, ReleaseRecord> = new Map();
  private releaseMetrics: Map<string, ReleaseMetrics> = new Map();
  private releaseHistory: ReleaseRecord[] = [];

  /**
   * リリースレコードを保存
   */
  saveRelease(
    version: string,
    status: ReleaseRecord['status'],
    platforms: string[],
    metadata: Record<string, unknown> = {}
  ): ReleaseRecord {
    const recordId = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const record: ReleaseRecord = {
      recordId,
      version,
      releaseDate: new Date(),
      status,
      platforms,
      downloadCount: 0,
      installCount: 0,
      crashCount: 0,
      userRating: 0,
      reviews: 0,
      metadata,
    };

    this.releases.set(recordId, record);
    this.releasesByVersion.set(version, record);

    if (status === 'released') {
      this.releaseHistory.push(record);
    }

    return record;
  }

  /**
   * ダウンロード数を記録
   */
  recordDownload(recordId: string, count: number = 1): boolean {
    const record = this.releases.get(recordId);
    if (!record) {
      throw new Error('Release record not found');
    }

    record.downloadCount += count;
    this.updateMetrics(record);
    return true;
  }

  /**
   * インストール数を記録
   */
  recordInstall(recordId: string, count: number = 1): boolean {
    const record = this.releases.get(recordId);
    if (!record) {
      throw new Error('Release record not found');
    }

    record.installCount += count;
    this.updateMetrics(record);
    return true;
  }

  /**
   * クラッシュ数を記録
   */
  recordCrash(recordId: string, count: number = 1): boolean {
    const record = this.releases.get(recordId);
    if (!record) {
      throw new Error('Release record not found');
    }

    record.crashCount += count;
    this.updateMetrics(record);
    return true;
  }

  /**
   * ユーザーレーティングを記録
   */
  recordRating(recordId: string, rating: number, review: string = ''): boolean {
    const record = this.releases.get(recordId);
    if (!record) {
      throw new Error('Release record not found');
    }

    // 平均レーティングを計算
    const totalRating = record.userRating * record.reviews + rating;
    record.reviews++;
    record.userRating = totalRating / record.reviews;

    this.updateMetrics(record);
    return true;
  }

  /**
   * メトリクスを更新
   */
  private updateMetrics(record: ReleaseRecord): void {
    const metrics: ReleaseMetrics = {
      version: record.version,
      downloadCount: record.downloadCount,
      installCount: record.installCount,
      crashCount: record.crashCount,
      activeUsers: Math.max(0, record.installCount - record.crashCount),
      userRating: record.userRating,
      reviews: record.reviews,
      releaseDate: record.releaseDate,
    };

    this.releaseMetrics.set(record.version, metrics);
  }

  /**
   * リリースレコードを取得
   */
  getRelease(recordId: string): ReleaseRecord | undefined {
    return this.releases.get(recordId);
  }

  /**
   * バージョン別リリースを取得
   */
  getReleaseByVersion(version: string): ReleaseRecord | undefined {
    return this.releasesByVersion.get(version);
  }

  /**
   * リリース履歴を取得
   */
  getReleaseHistory(): ReleaseRecord[] {
    return [...this.releaseHistory];
  }

  /**
   * メトリクスを取得
   */
  getMetrics(version: string): ReleaseMetrics | undefined {
    return this.releaseMetrics.get(version);
  }

  /**
   * 全メトリクスを取得
   */
  getAllMetrics(): ReleaseMetrics[] {
    return Array.from(this.releaseMetrics.values());
  }

  /**
   * ステータス別リリースを取得
   */
  getReleasesByStatus(status: ReleaseRecord['status']): ReleaseRecord[] {
    return Array.from(this.releases.values()).filter((r) => r.status === status);
  }

  /**
   * プラットフォーム別リリースを取得
   */
  getReleasesByPlatform(platform: string): ReleaseRecord[] {
    return Array.from(this.releases.values()).filter((r) => r.platforms.includes(platform));
  }

  /**
   * リリースを更新
   */
  updateRelease(recordId: string, updates: Partial<ReleaseRecord>): boolean {
    const record = this.releases.get(recordId);
    if (!record) {
      throw new Error('Release record not found');
    }

    Object.assign(record, updates);
    this.updateMetrics(record);
    return true;
  }

  /**
   * リリースを削除
   */
  deleteRelease(recordId: string): boolean {
    const record = this.releases.get(recordId);
    if (!record) {
      throw new Error('Release record not found');
    }

    this.releases.delete(recordId);
    this.releasesByVersion.delete(record.version);
    this.releaseMetrics.delete(record.version);

    return true;
  }

  /**
   * 統計を計算
   */
  calculateStats(): {
    totalReleases: number;
    totalDownloads: number;
    totalInstalls: number;
    totalCrashes: number;
    averageRating: number;
    crashRate: number;
  } {
    const records = Array.from(this.releases.values());
    const totalReleases = records.length;
    const totalDownloads = records.reduce((sum, r) => sum + r.downloadCount, 0);
    const totalInstalls = records.reduce((sum, r) => sum + r.installCount, 0);
    const totalCrashes = records.reduce((sum, r) => sum + r.crashCount, 0);
    const averageRating = records.length > 0 ? records.reduce((sum, r) => sum + r.userRating, 0) / records.length : 0;
    const crashRate = totalInstalls > 0 ? (totalCrashes / totalInstalls) * 100 : 0;

    return {
      totalReleases,
      totalDownloads,
      totalInstalls,
      totalCrashes,
      averageRating,
      crashRate,
    };
  }

  /**
   * 最新リリースを取得
   */
  getLatestRelease(): ReleaseRecord | undefined {
    return this.releaseHistory[this.releaseHistory.length - 1];
  }

  /**
   * リリースレポートを生成
   */
  generateReleaseReport(recordId: string): string {
    const record = this.releases.get(recordId);
    if (!record) {
      throw new Error('Release record not found');
    }

    const crashRate = record.installCount > 0 ? (record.crashCount / record.installCount) * 100 : 0;
    const installRate = record.downloadCount > 0 ? (record.installCount / record.downloadCount) * 100 : 0;

    const report = `
=== Official Release Report ===
Version: ${record.version}
Status: ${record.status}
Release Date: ${record.releaseDate.toISOString()}
Platforms: ${record.platforms.join(', ')}

Metrics:
  Downloads: ${record.downloadCount}
  Installs: ${record.installCount}
  Install Rate: ${installRate.toFixed(2)}%
  Crashes: ${record.crashCount}
  Crash Rate: ${crashRate.toFixed(2)}%
  User Rating: ${record.userRating.toFixed(2)}/5.0
  Reviews: ${record.reviews}

Metadata:
${Object.entries(record.metadata)
  .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
  .join('\n')}
    `;

    return report.trim();
  }
}

// ============ TESTS ============

describe('OfficialReleaseRepository', () => {
  let repo: OfficialReleaseRepository;

  beforeEach(() => {
    repo = new OfficialReleaseRepository();
  });

  describe('saveRelease', () => {
    it('should save release record', () => {
      const record = repo.saveRelease('1.0.0', 'released', ['android', 'pc']);
      expect(record.version).toBe('1.0.0');
      expect(record.status).toBe('released');
      expect(record.platforms).toHaveLength(2);
    });

    it('should add to history if released', () => {
      repo.saveRelease('1.0.0', 'released', ['android']);
      const history = repo.getReleaseHistory();
      expect(history).toHaveLength(1);
    });

    it('should not add to history if not released', () => {
      repo.saveRelease('1.0.0', 'draft', ['android']);
      const history = repo.getReleaseHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('recordDownload', () => {
    it('should record download', () => {
      const record = repo.saveRelease('1.0.0', 'released', ['android']);
      repo.recordDownload(record.recordId);

      const updated = repo.getRelease(record.recordId);
      expect(updated?.downloadCount).toBe(1);
    });

    it('should record multiple downloads', () => {
      const record = repo.saveRelease('1.0.0', 'released', ['android']);
      repo.recordDownload(record.recordId, 100);

      const updated = repo.getRelease(record.recordId);
      expect(updated?.downloadCount).toBe(100);
    });
  });

  describe('recordInstall', () => {
    it('should record install', () => {
      const record = repo.saveRelease('1.0.0', 'released', ['android']);
      repo.recordInstall(record.recordId);

      const updated = repo.getRelease(record.recordId);
      expect(updated?.installCount).toBe(1);
    });
  });

  describe('recordCrash', () => {
    it('should record crash', () => {
      const record = repo.saveRelease('1.0.0', 'released', ['android']);
      repo.recordCrash(record.recordId);

      const updated = repo.getRelease(record.recordId);
      expect(updated?.crashCount).toBe(1);
    });
  });

  describe('recordRating', () => {
    it('should record rating', () => {
      const record = repo.saveRelease('1.0.0', 'released', ['android']);
      repo.recordRating(record.recordId, 5);

      const updated = repo.getRelease(record.recordId);
      expect(updated?.userRating).toBe(5);
      expect(updated?.reviews).toBe(1);
    });

    it('should calculate average rating', () => {
      const record = repo.saveRelease('1.0.0', 'released', ['android']);
      repo.recordRating(record.recordId, 5);
      repo.recordRating(record.recordId, 3);

      const updated = repo.getRelease(record.recordId);
      expect(updated?.userRating).toBe(4);
      expect(updated?.reviews).toBe(2);
    });
  });

  describe('getRelease', () => {
    it('should return release record', () => {
      const record = repo.saveRelease('1.0.0', 'released', ['android']);
      const retrieved = repo.getRelease(record.recordId);
      expect(retrieved).toEqual(record);
    });

    it('should return undefined for non-existent record', () => {
      const retrieved = repo.getRelease('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getReleaseByVersion', () => {
    it('should return release by version', () => {
      const record = repo.saveRelease('1.0.0', 'released', ['android']);
      const retrieved = repo.getReleaseByVersion('1.0.0');
      expect(retrieved).toEqual(record);
    });
  });

  describe('getReleaseHistory', () => {
    it('should return release history', () => {
      repo.saveRelease('1.0.0', 'released', ['android']);
      repo.saveRelease('1.0.1', 'released', ['android']);

      const history = repo.getReleaseHistory();
      expect(history).toHaveLength(2);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics', () => {
      const record = repo.saveRelease('1.0.0', 'released', ['android']);
      repo.recordDownload(record.recordId, 100);
      repo.recordInstall(record.recordId, 80);

      const metrics = repo.getMetrics('1.0.0');
      expect(metrics?.downloadCount).toBe(100);
      expect(metrics?.installCount).toBe(80);
    });
  });

  describe('getReleasesByStatus', () => {
    it('should return releases by status', () => {
      repo.saveRelease('1.0.0', 'released', ['android']);
      repo.saveRelease('1.0.1', 'draft', ['android']);

      const released = repo.getReleasesByStatus('released');
      expect(released).toHaveLength(1);
      expect(released[0].version).toBe('1.0.0');
    });
  });

  describe('getReleasesByPlatform', () => {
    it('should return releases by platform', () => {
      repo.saveRelease('1.0.0', 'released', ['android', 'pc']);
      repo.saveRelease('1.0.1', 'released', ['android']);

      const android = repo.getReleasesByPlatform('android');
      expect(android).toHaveLength(2);

      const pc = repo.getReleasesByPlatform('pc');
      expect(pc).toHaveLength(1);
    });
  });

  describe('updateRelease', () => {
    it('should update release record', () => {
      const record = repo.saveRelease('1.0.0', 'draft', ['android']);
      repo.updateRelease(record.recordId, { status: 'released' });

      const updated = repo.getRelease(record.recordId);
      expect(updated?.status).toBe('released');
    });
  });

  describe('deleteRelease', () => {
    it('should delete release record', () => {
      const record = repo.saveRelease('1.0.0', 'released', ['android']);
      repo.deleteRelease(record.recordId);

      const retrieved = repo.getRelease(record.recordId);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('calculateStats', () => {
    it('should calculate statistics', () => {
      const record = repo.saveRelease('1.0.0', 'released', ['android']);
      repo.recordDownload(record.recordId, 100);
      repo.recordInstall(record.recordId, 80);
      repo.recordCrash(record.recordId, 2);
      repo.recordRating(record.recordId, 5);

      const stats = repo.calculateStats();
      expect(stats.totalReleases).toBe(1);
      expect(stats.totalDownloads).toBe(100);
      expect(stats.totalInstalls).toBe(80);
      expect(stats.totalCrashes).toBe(2);
      expect(stats.averageRating).toBe(5);
    });
  });

  describe('getLatestRelease', () => {
    it('should return latest release', () => {
      repo.saveRelease('1.0.0', 'released', ['android']);
      repo.saveRelease('1.0.1', 'released', ['android']);

      const latest = repo.getLatestRelease();
      expect(latest?.version).toBe('1.0.1');
    });
  });

  describe('generateReleaseReport', () => {
    it('should generate release report', () => {
      const record = repo.saveRelease('1.0.0', 'released', ['android', 'pc']);
      repo.recordDownload(record.recordId, 100);
      repo.recordInstall(record.recordId, 80);
      repo.recordCrash(record.recordId, 2);
      repo.recordRating(record.recordId, 4.5);

      const report = repo.generateReleaseReport(record.recordId);
      expect(report).toContain('Official Release Report');
      expect(report).toContain('1.0.0');
      expect(report).toContain('100');
      expect(report).toContain('80');
    });
  });

  describe('Complete release lifecycle', () => {
    it('should track complete lifecycle', () => {
      // Create release
      const record = repo.saveRelease('1.0.0', 'released', ['android', 'pc']);

      // Track downloads
      for (let i = 0; i < 1000; i++) {
        repo.recordDownload(record.recordId);
      }

      // Track installs
      for (let i = 0; i < 800; i++) {
        repo.recordInstall(record.recordId);
      }

      // Track crashes
      for (let i = 0; i < 5; i++) {
        repo.recordCrash(record.recordId);
      }

      // Track ratings
      for (let i = 0; i < 100; i++) {
        repo.recordRating(record.recordId, 4.5);
      }

      const metrics = repo.getMetrics('1.0.0');
      expect(metrics?.downloadCount).toBe(1000);
      expect(metrics?.installCount).toBe(800);
      expect(metrics?.crashCount).toBe(5);
      expect(metrics?.reviews).toBe(100);
    });
  });

  describe('Multi-version tracking', () => {
    it('should track multiple versions', () => {
      const v1 = repo.saveRelease('1.0.0', 'released', ['android']);
      const v2 = repo.saveRelease('1.0.1', 'released', ['android']);
      const v3 = repo.saveRelease('1.1.0', 'released', ['android']);

      repo.recordDownload(v1.recordId, 1000);
      repo.recordDownload(v2.recordId, 500);
      repo.recordDownload(v3.recordId, 100);

      const stats = repo.calculateStats();
      expect(stats.totalReleases).toBe(3);
      expect(stats.totalDownloads).toBe(1600);
    });
  });
});
