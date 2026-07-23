import { describe, it, expect, beforeEach } from 'vitest';

/**
 * APKReleaseRepository
 * APK配布・リリース管理
 */
export interface APKRelease {
  releaseId: string;
  version: string;
  buildNumber: number;
  releaseType: 'alpha' | 'beta' | 'release';
  apkPath: string;
  aabPath?: string;
  fileSize: number;
  checksum: string;
  releaseDate: Date;
  downloadCount: number;
  installCount: number;
  crashCount: number;
  rating: number;
  reviews: Review[];
  changelog: string;
  isActive: boolean;
}

export interface Review {
  reviewId: string;
  userId: string;
  rating: number;
  comment: string;
  timestamp: Date;
}

export class APKReleaseRepository {
  private releases: Map<string, APKRelease> = new Map();
  private releaseHistory: APKRelease[] = [];
  private downloadStats: Map<string, number> = new Map();
  private installStats: Map<string, number> = new Map();
  private crashStats: Map<string, number> = new Map();

  /**
   * リリースを作成
   */
  createRelease(
    version: string,
    buildNumber: number,
    releaseType: 'alpha' | 'beta' | 'release',
    apkPath: string,
    fileSize: number,
    checksum: string,
    changelog: string
  ): APKRelease {
    const releaseId = `release-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const release: APKRelease = {
      releaseId,
      version,
      buildNumber,
      releaseType,
      apkPath,
      fileSize,
      checksum,
      releaseDate: new Date(),
      downloadCount: 0,
      installCount: 0,
      crashCount: 0,
      rating: 0,
      reviews: [],
      changelog,
      isActive: true,
    };

    this.releases.set(releaseId, release);
    this.releaseHistory.push(release);
    return release;
  }

  /**
   * ダウンロードを記録
   */
  recordDownload(releaseId: string): boolean {
    const release = this.releases.get(releaseId);
    if (!release) {
      throw new Error('Release not found');
    }

    release.downloadCount++;
    this.downloadStats.set(releaseId, (this.downloadStats.get(releaseId) || 0) + 1);
    return true;
  }

  /**
   * インストールを記録
   */
  recordInstall(releaseId: string): boolean {
    const release = this.releases.get(releaseId);
    if (!release) {
      throw new Error('Release not found');
    }

    release.installCount++;
    this.installStats.set(releaseId, (this.installStats.get(releaseId) || 0) + 1);
    return true;
  }

  /**
   * クラッシュを記録
   */
  recordCrash(releaseId: string): boolean {
    const release = this.releases.get(releaseId);
    if (!release) {
      throw new Error('Release not found');
    }

    release.crashCount++;
    this.crashStats.set(releaseId, (this.crashStats.get(releaseId) || 0) + 1);
    return true;
  }

  /**
   * レビューを追加
   */
  addReview(releaseId: string, userId: string, rating: number, comment: string): Review {
    const release = this.releases.get(releaseId);
    if (!release) {
      throw new Error('Release not found');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const review: Review = {
      reviewId: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      rating,
      comment,
      timestamp: new Date(),
    };

    release.reviews.push(review);

    // Update average rating
    const totalRating = release.reviews.reduce((sum, r) => sum + r.rating, 0);
    release.rating = totalRating / release.reviews.length;

    return review;
  }

  /**
   * リリースを取得
   */
  getRelease(releaseId: string): APKRelease | undefined {
    return this.releases.get(releaseId);
  }

  /**
   * すべてのリリースを取得
   */
  getAllReleases(): APKRelease[] {
    return Array.from(this.releases.values());
  }

  /**
   * アクティブなリリースを取得
   */
  getActiveReleases(): APKRelease[] {
    return Array.from(this.releases.values()).filter((r) => r.isActive);
  }

  /**
   * バージョンでリリースを取得
   */
  getReleaseByVersion(version: string): APKRelease | undefined {
    return Array.from(this.releases.values()).find((r) => r.version === version);
  }

  /**
   * 最新のリリースを取得
   */
  getLatestRelease(): APKRelease | undefined {
    return this.releaseHistory[this.releaseHistory.length - 1];
  }

  /**
   * リリースを無効化
   */
  deactivateRelease(releaseId: string): boolean {
    const release = this.releases.get(releaseId);
    if (!release) {
      throw new Error('Release not found');
    }

    release.isActive = false;
    return true;
  }

  /**
   * リリースを有効化
   */
  activateRelease(releaseId: string): boolean {
    const release = this.releases.get(releaseId);
    if (!release) {
      throw new Error('Release not found');
    }

    release.isActive = true;
    return true;
  }

  /**
   * リリースメトリクスを計算
   */
  calculateMetrics(releaseId: string): {
    downloadCount: number;
    installCount: number;
    crashCount: number;
    installRate: number;
    crashRate: number;
    averageRating: number;
    reviewCount: number;
  } {
    const release = this.releases.get(releaseId);
    if (!release) {
      throw new Error('Release not found');
    }

    const installRate = release.downloadCount > 0 ? (release.installCount / release.downloadCount) * 100 : 0;
    const crashRate = release.installCount > 0 ? (release.crashCount / release.installCount) * 100 : 0;

    return {
      downloadCount: release.downloadCount,
      installCount: release.installCount,
      crashCount: release.crashCount,
      installRate,
      crashRate,
      averageRating: release.rating,
      reviewCount: release.reviews.length,
    };
  }

  /**
   * リリースレポートを生成
   */
  generateReleaseReport(releaseId: string): string {
    const release = this.releases.get(releaseId);
    if (!release) {
      throw new Error('Release not found');
    }

    const metrics = this.calculateMetrics(releaseId);

    let report = `
=== APK Release Report ===
Release ID: ${release.releaseId}
Version: ${release.version}
Build: ${release.buildNumber}
Type: ${release.releaseType}
Status: ${release.isActive ? 'Active' : 'Inactive'}
Release Date: ${release.releaseDate.toISOString()}

File Information:
  APK: ${release.apkPath}
  AAB: ${release.aabPath || 'N/A'}
  Size: ${(release.fileSize / 1024 / 1024).toFixed(2)} MB
  Checksum: ${release.checksum}

Metrics:
  Downloads: ${metrics.downloadCount}
  Installs: ${metrics.installCount}
  Crashes: ${metrics.crashCount}
  Install Rate: ${metrics.installRate.toFixed(2)}%
  Crash Rate: ${metrics.crashRate.toFixed(2)}%
  Average Rating: ${metrics.averageRating.toFixed(2)}/5
  Reviews: ${metrics.reviewCount}

Changelog:
${release.changelog}
    `;

    return report.trim();
  }

  /**
   * リリース統計を計算
   */
  calculateStats(): {
    totalReleases: number;
    activeReleases: number;
    totalDownloads: number;
    totalInstalls: number;
    totalCrashes: number;
    averageRating: number;
  } {
    const releases = Array.from(this.releases.values());
    const activeReleases = releases.filter((r) => r.isActive).length;
    const totalDownloads = releases.reduce((sum, r) => sum + r.downloadCount, 0);
    const totalInstalls = releases.reduce((sum, r) => sum + r.installCount, 0);
    const totalCrashes = releases.reduce((sum, r) => sum + r.crashCount, 0);

    const totalRating = releases.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = releases.length > 0 ? totalRating / releases.length : 0;

    return {
      totalReleases: releases.length,
      activeReleases,
      totalDownloads,
      totalInstalls,
      totalCrashes,
      averageRating,
    };
  }

  /**
   * リリース履歴を取得
   */
  getReleaseHistory(): APKRelease[] {
    return [...this.releaseHistory];
  }
}

// ============ TESTS ============

describe('APKReleaseRepository', () => {
  let repo: APKReleaseRepository;

  beforeEach(() => {
    repo = new APKReleaseRepository();
  });

  describe('createRelease', () => {
    it('should create release', () => {
      const release = repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'Initial release');

      expect(release.version).toBe('1.0.0');
      expect(release.buildNumber).toBe(1);
      expect(release.releaseType).toBe('release');
    });
  });

  describe('recordDownload', () => {
    it('should record download', () => {
      const release = repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'Initial release');

      repo.recordDownload(release.releaseId);
      const updated = repo.getRelease(release.releaseId);

      expect(updated?.downloadCount).toBe(1);
    });
  });

  describe('recordInstall', () => {
    it('should record install', () => {
      const release = repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'Initial release');

      repo.recordInstall(release.releaseId);
      const updated = repo.getRelease(release.releaseId);

      expect(updated?.installCount).toBe(1);
    });
  });

  describe('recordCrash', () => {
    it('should record crash', () => {
      const release = repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'Initial release');

      repo.recordCrash(release.releaseId);
      const updated = repo.getRelease(release.releaseId);

      expect(updated?.crashCount).toBe(1);
    });
  });

  describe('addReview', () => {
    it('should add review', () => {
      const release = repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'Initial release');

      const review = repo.addReview(release.releaseId, 'user-1', 5, 'Great app!');

      expect(review.rating).toBe(5);
      expect(review.comment).toBe('Great app!');
    });

    it('should update average rating', () => {
      const release = repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'Initial release');

      repo.addReview(release.releaseId, 'user-1', 5, 'Great!');
      repo.addReview(release.releaseId, 'user-2', 3, 'OK');

      const updated = repo.getRelease(release.releaseId);
      expect(updated?.rating).toBe(4);
    });

    it('should reject invalid rating', () => {
      const release = repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'Initial release');

      expect(() => repo.addReview(release.releaseId, 'user-1', 6, 'Invalid')).toThrow();
    });
  });

  describe('getRelease', () => {
    it('should return release', () => {
      const release = repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'Initial release');

      const retrieved = repo.getRelease(release.releaseId);
      expect(retrieved).toEqual(release);
    });
  });

  describe('getAllReleases', () => {
    it('should return all releases', () => {
      repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'v1.0.0');
      repo.createRelease('1.0.1', 2, 'release', '/path/to/app.apk', 50000000, 'def456', 'v1.0.1');

      const releases = repo.getAllReleases();
      expect(releases).toHaveLength(2);
    });
  });

  describe('getActiveReleases', () => {
    it('should return active releases', () => {
      const release1 = repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'v1.0.0');
      const release2 = repo.createRelease('1.0.1', 2, 'release', '/path/to/app.apk', 50000000, 'def456', 'v1.0.1');

      repo.deactivateRelease(release1.releaseId);

      const active = repo.getActiveReleases();
      expect(active).toHaveLength(1);
      expect(active[0].version).toBe('1.0.1');
    });
  });

  describe('getReleaseByVersion', () => {
    it('should return release by version', () => {
      repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'v1.0.0');

      const release = repo.getReleaseByVersion('1.0.0');
      expect(release?.version).toBe('1.0.0');
    });
  });

  describe('getLatestRelease', () => {
    it('should return latest release', () => {
      repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'v1.0.0');
      repo.createRelease('1.0.1', 2, 'release', '/path/to/app.apk', 50000000, 'def456', 'v1.0.1');

      const latest = repo.getLatestRelease();
      expect(latest?.version).toBe('1.0.1');
    });
  });

  describe('deactivateRelease', () => {
    it('should deactivate release', () => {
      const release = repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'v1.0.0');

      repo.deactivateRelease(release.releaseId);
      const updated = repo.getRelease(release.releaseId);

      expect(updated?.isActive).toBe(false);
    });
  });

  describe('activateRelease', () => {
    it('should activate release', () => {
      const release = repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'v1.0.0');

      repo.deactivateRelease(release.releaseId);
      repo.activateRelease(release.releaseId);
      const updated = repo.getRelease(release.releaseId);

      expect(updated?.isActive).toBe(true);
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate metrics', () => {
      const release = repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'v1.0.0');

      repo.recordDownload(release.releaseId);
      repo.recordDownload(release.releaseId);
      repo.recordInstall(release.releaseId);
      repo.recordCrash(release.releaseId);

      const metrics = repo.calculateMetrics(release.releaseId);
      expect(metrics.downloadCount).toBe(2);
      expect(metrics.installCount).toBe(1);
      expect(metrics.crashCount).toBe(1);
      expect(metrics.installRate).toBe(50);
    });
  });

  describe('generateReleaseReport', () => {
    it('should generate release report', () => {
      const release = repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'Initial release');

      const report = repo.generateReleaseReport(release.releaseId);
      expect(report).toContain('APK Release Report');
      expect(report).toContain('1.0.0');
      expect(report).toContain('Initial release');
    });
  });

  describe('calculateStats', () => {
    it('should calculate overall statistics', () => {
      repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'v1.0.0');
      repo.createRelease('1.0.1', 2, 'beta', '/path/to/app.apk', 50000000, 'def456', 'v1.0.1');

      const stats = repo.calculateStats();
      expect(stats.totalReleases).toBe(2);
      expect(stats.activeReleases).toBe(2);
    });
  });

  describe('getReleaseHistory', () => {
    it('should return release history', () => {
      repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'v1.0.0');
      repo.createRelease('1.0.1', 2, 'release', '/path/to/app.apk', 50000000, 'def456', 'v1.0.1');

      const history = repo.getReleaseHistory();
      expect(history).toHaveLength(2);
    });
  });

  describe('Complete release workflow', () => {
    it('should handle complete release workflow', () => {
      const release = repo.createRelease('1.0.0', 1, 'release', '/path/to/app.apk', 50000000, 'abc123', 'Initial release');

      repo.recordDownload(release.releaseId);
      repo.recordDownload(release.releaseId);
      repo.recordInstall(release.releaseId);

      repo.addReview(release.releaseId, 'user-1', 5, 'Great!');
      repo.addReview(release.releaseId, 'user-2', 4, 'Good');

      const metrics = repo.calculateMetrics(release.releaseId);
      expect(metrics.downloadCount).toBe(2);
      expect(metrics.installCount).toBe(1);
      expect(metrics.averageRating).toBe(4.5);
    });
  });
});
