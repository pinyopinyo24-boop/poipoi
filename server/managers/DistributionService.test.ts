import { describe, it, expect, beforeEach } from 'vitest';

/**
 * DistributionService
 * v1.0配布・配信サービス
 */
export interface DistributionChannel {
  channelId: string;
  name: string;
  type: 'app_store' | 'play_store' | 'direct' | 'beta';
  status: 'active' | 'inactive' | 'maintenance';
}

export interface DistributionPackage {
  packageId: string;
  version: string;
  platform: 'android' | 'pc' | 'both';
  channelId: string;
  releaseDate: Date;
  downloadUrl: string;
  fileSize: number;
  checksum: string;
  downloadCount: number;
  installCount: number;
  crashCount: number;
}

export interface DistributionMetrics {
  totalDownloads: number;
  totalInstalls: number;
  totalCrashes: number;
  installRate: number;
  crashRate: number;
  activeUsers: number;
}

export class DistributionService {
  private channels: Map<string, DistributionChannel> = new Map();
  private packages: Map<string, DistributionPackage> = new Map();
  private distributionHistory: DistributionPackage[] = [];

  /**
   * 配布チャネルを追加
   */
  addDistributionChannel(
    name: string,
    type: DistributionChannel['type']
  ): DistributionChannel {
    const channelId = `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const channel: DistributionChannel = {
      channelId,
      name,
      type,
      status: 'active',
    };

    this.channels.set(channelId, channel);
    return channel;
  }

  /**
   * 配布パッケージを作成
   */
  createDistributionPackage(
    version: string,
    platform: 'android' | 'pc' | 'both',
    channelId: string,
    downloadUrl: string,
    fileSize: number,
    checksum: string
  ): DistributionPackage {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const packageId = `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const pkg: DistributionPackage = {
      packageId,
      version,
      platform,
      channelId,
      releaseDate: new Date(),
      downloadUrl,
      fileSize,
      checksum,
      downloadCount: 0,
      installCount: 0,
      crashCount: 0,
    };

    this.packages.set(packageId, pkg);
    return pkg;
  }

  /**
   * ダウンロードをカウント
   */
  recordDownload(packageId: string): boolean {
    const pkg = this.packages.get(packageId);
    if (!pkg) {
      throw new Error('Package not found');
    }

    pkg.downloadCount++;
    return true;
  }

  /**
   * インストールをカウント
   */
  recordInstall(packageId: string): boolean {
    const pkg = this.packages.get(packageId);
    if (!pkg) {
      throw new Error('Package not found');
    }

    pkg.installCount++;
    return true;
  }

  /**
   * クラッシュをカウント
   */
  recordCrash(packageId: string): boolean {
    const pkg = this.packages.get(packageId);
    if (!pkg) {
      throw new Error('Package not found');
    }

    pkg.crashCount++;
    return true;
  }

  /**
   * 配布を公開
   */
  publishDistribution(packageId: string): boolean {
    const pkg = this.packages.get(packageId);
    if (!pkg) {
      throw new Error('Package not found');
    }

    this.distributionHistory.push(pkg);
    return true;
  }

  /**
   * チャネルステータスを更新
   */
  updateChannelStatus(channelId: string, status: DistributionChannel['status']): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    channel.status = status;
    return true;
  }

  /**
   * パッケージ情報を取得
   */
  getPackage(packageId: string): DistributionPackage | undefined {
    return this.packages.get(packageId);
  }

  /**
   * チャネル情報を取得
   */
  getChannel(channelId: string): DistributionChannel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * 配布履歴を取得
   */
  getDistributionHistory(): DistributionPackage[] {
    return [...this.distributionHistory];
  }

  /**
   * バージョン別パッケージを取得
   */
  getPackagesByVersion(version: string): DistributionPackage[] {
    return Array.from(this.packages.values()).filter((p) => p.version === version);
  }

  /**
   * プラットフォーム別パッケージを取得
   */
  getPackagesByPlatform(platform: 'android' | 'pc' | 'both'): DistributionPackage[] {
    return Array.from(this.packages.values()).filter((p) => p.platform === platform);
  }

  /**
   * チャネル別パッケージを取得
   */
  getPackagesByChannel(channelId: string): DistributionPackage[] {
    return Array.from(this.packages.values()).filter((p) => p.channelId === channelId);
  }

  /**
   * 配布メトリクスを計算
   */
  calculateDistributionMetrics(): DistributionMetrics {
    const packages = Array.from(this.packages.values());
    const totalDownloads = packages.reduce((sum, p) => sum + p.downloadCount, 0);
    const totalInstalls = packages.reduce((sum, p) => sum + p.installCount, 0);
    const totalCrashes = packages.reduce((sum, p) => sum + p.crashCount, 0);
    const installRate = totalDownloads > 0 ? (totalInstalls / totalDownloads) * 100 : 0;
    const crashRate = totalInstalls > 0 ? (totalCrashes / totalInstalls) * 100 : 0;

    return {
      totalDownloads,
      totalInstalls,
      totalCrashes,
      installRate,
      crashRate,
      activeUsers: totalInstalls,
    };
  }

  /**
   * 配布レポートを生成
   */
  generateDistributionReport(packageId: string): string {
    const pkg = this.packages.get(packageId);
    if (!pkg) {
      throw new Error('Package not found');
    }

    const channel = this.channels.get(pkg.channelId);
    const installRate = pkg.downloadCount > 0 ? (pkg.installCount / pkg.downloadCount) * 100 : 0;
    const crashRate = pkg.installCount > 0 ? (pkg.crashCount / pkg.installCount) * 100 : 0;

    const report = `
=== Distribution Report ===
Package ID: ${pkg.packageId}
Version: ${pkg.version}
Platform: ${pkg.platform}
Channel: ${channel?.name || 'Unknown'}
Release Date: ${pkg.releaseDate.toISOString()}
File Size: ${(pkg.fileSize / 1024 / 1024).toFixed(2)} MB

Metrics:
  Downloads: ${pkg.downloadCount}
  Installs: ${pkg.installCount}
  Install Rate: ${installRate.toFixed(2)}%
  Crashes: ${pkg.crashCount}
  Crash Rate: ${crashRate.toFixed(2)}%

Package Info:
  URL: ${pkg.downloadUrl}
  Checksum: ${pkg.checksum}
    `;

    return report.trim();
  }

  /**
   * 全チャネルを取得
   */
  getAllChannels(): DistributionChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * 全パッケージを取得
   */
  getAllPackages(): DistributionPackage[] {
    return Array.from(this.packages.values());
  }

  /**
   * アクティブなチャネルを取得
   */
  getActiveChannels(): DistributionChannel[] {
    return Array.from(this.channels.values()).filter((c) => c.status === 'active');
  }
}

// ============ TESTS ============

describe('DistributionService', () => {
  let service: DistributionService;

  beforeEach(() => {
    service = new DistributionService();
  });

  describe('addDistributionChannel', () => {
    it('should add distribution channel', () => {
      const channel = service.addDistributionChannel('Google Play Store', 'play_store');
      expect(channel.name).toBe('Google Play Store');
      expect(channel.type).toBe('play_store');
      expect(channel.status).toBe('active');
    });

    it('should generate unique channel IDs', () => {
      const channel1 = service.addDistributionChannel('Channel 1', 'play_store');
      const channel2 = service.addDistributionChannel('Channel 2', 'app_store');
      expect(channel1.channelId).not.toBe(channel2.channelId);
    });
  });

  describe('createDistributionPackage', () => {
    it('should create distribution package', () => {
      const channel = service.addDistributionChannel('Google Play Store', 'play_store');
      const pkg = service.createDistributionPackage(
        '1.0.0',
        'android',
        channel.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );

      expect(pkg.version).toBe('1.0.0');
      expect(pkg.platform).toBe('android');
      expect(pkg.downloadCount).toBe(0);
    });

    it('should throw error for non-existent channel', () => {
      expect(() =>
        service.createDistributionPackage(
          '1.0.0',
          'android',
          'non-existent',
          'https://example.com/app.apk',
          50000000,
          'sha256_abc123'
        )
      ).toThrow();
    });
  });

  describe('recordDownload', () => {
    it('should record download', () => {
      const channel = service.addDistributionChannel('Google Play Store', 'play_store');
      const pkg = service.createDistributionPackage(
        '1.0.0',
        'android',
        channel.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );

      service.recordDownload(pkg.packageId);
      const updated = service.getPackage(pkg.packageId);
      expect(updated?.downloadCount).toBe(1);
    });

    it('should increment download count', () => {
      const channel = service.addDistributionChannel('Google Play Store', 'play_store');
      const pkg = service.createDistributionPackage(
        '1.0.0',
        'android',
        channel.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );

      service.recordDownload(pkg.packageId);
      service.recordDownload(pkg.packageId);
      service.recordDownload(pkg.packageId);
      const updated = service.getPackage(pkg.packageId);
      expect(updated?.downloadCount).toBe(3);
    });
  });

  describe('recordInstall', () => {
    it('should record install', () => {
      const channel = service.addDistributionChannel('Google Play Store', 'play_store');
      const pkg = service.createDistributionPackage(
        '1.0.0',
        'android',
        channel.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );

      service.recordInstall(pkg.packageId);
      const updated = service.getPackage(pkg.packageId);
      expect(updated?.installCount).toBe(1);
    });
  });

  describe('recordCrash', () => {
    it('should record crash', () => {
      const channel = service.addDistributionChannel('Google Play Store', 'play_store');
      const pkg = service.createDistributionPackage(
        '1.0.0',
        'android',
        channel.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );

      service.recordCrash(pkg.packageId);
      const updated = service.getPackage(pkg.packageId);
      expect(updated?.crashCount).toBe(1);
    });
  });

  describe('publishDistribution', () => {
    it('should publish distribution', () => {
      const channel = service.addDistributionChannel('Google Play Store', 'play_store');
      const pkg = service.createDistributionPackage(
        '1.0.0',
        'android',
        channel.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );

      const result = service.publishDistribution(pkg.packageId);
      expect(result).toBe(true);
    });

    it('should add to distribution history', () => {
      const channel = service.addDistributionChannel('Google Play Store', 'play_store');
      const pkg = service.createDistributionPackage(
        '1.0.0',
        'android',
        channel.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );

      service.publishDistribution(pkg.packageId);
      const history = service.getDistributionHistory();
      expect(history).toHaveLength(1);
    });
  });

  describe('updateChannelStatus', () => {
    it('should update channel status', () => {
      const channel = service.addDistributionChannel('Google Play Store', 'play_store');
      service.updateChannelStatus(channel.channelId, 'maintenance');
      const updated = service.getChannel(channel.channelId);
      expect(updated?.status).toBe('maintenance');
    });
  });

  describe('getPackage', () => {
    it('should return package', () => {
      const channel = service.addDistributionChannel('Google Play Store', 'play_store');
      const pkg = service.createDistributionPackage(
        '1.0.0',
        'android',
        channel.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );

      const retrieved = service.getPackage(pkg.packageId);
      expect(retrieved).toEqual(pkg);
    });

    it('should return undefined for non-existent package', () => {
      const retrieved = service.getPackage('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getPackagesByVersion', () => {
    it('should return packages by version', () => {
      const channel = service.addDistributionChannel('Google Play Store', 'play_store');
      service.createDistributionPackage(
        '1.0.0',
        'android',
        channel.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );
      service.createDistributionPackage(
        '1.0.1',
        'android',
        channel.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );

      const v1 = service.getPackagesByVersion('1.0.0');
      expect(v1).toHaveLength(1);
      expect(v1[0].version).toBe('1.0.0');
    });
  });

  describe('getPackagesByPlatform', () => {
    it('should return packages by platform', () => {
      const channel = service.addDistributionChannel('Google Play Store', 'play_store');
      service.createDistributionPackage(
        '1.0.0',
        'android',
        channel.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );
      service.createDistributionPackage(
        '1.0.0',
        'pc',
        channel.channelId,
        'https://example.com/app.exe',
        100000000,
        'sha256_def456'
      );

      const android = service.getPackagesByPlatform('android');
      expect(android).toHaveLength(1);
      expect(android[0].platform).toBe('android');
    });
  });

  describe('getPackagesByChannel', () => {
    it('should return packages by channel', () => {
      const channel1 = service.addDistributionChannel('Google Play Store', 'play_store');
      const channel2 = service.addDistributionChannel('App Store', 'app_store');

      service.createDistributionPackage(
        '1.0.0',
        'android',
        channel1.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );
      service.createDistributionPackage(
        '1.0.0',
        'pc',
        channel2.channelId,
        'https://example.com/app.exe',
        100000000,
        'sha256_def456'
      );

      const channel1Pkgs = service.getPackagesByChannel(channel1.channelId);
      expect(channel1Pkgs).toHaveLength(1);
    });
  });

  describe('calculateDistributionMetrics', () => {
    it('should calculate distribution metrics', () => {
      const channel = service.addDistributionChannel('Google Play Store', 'play_store');
      const pkg = service.createDistributionPackage(
        '1.0.0',
        'android',
        channel.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );

      service.recordDownload(pkg.packageId);
      service.recordDownload(pkg.packageId);
      service.recordInstall(pkg.packageId);
      service.recordCrash(pkg.packageId);

      const metrics = service.calculateDistributionMetrics();
      expect(metrics.totalDownloads).toBe(2);
      expect(metrics.totalInstalls).toBe(1);
      expect(metrics.totalCrashes).toBe(1);
      expect(metrics.installRate).toBe(50);
    });
  });

  describe('generateDistributionReport', () => {
    it('should generate distribution report', () => {
      const channel = service.addDistributionChannel('Google Play Store', 'play_store');
      const pkg = service.createDistributionPackage(
        '1.0.0',
        'android',
        channel.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );

      service.recordDownload(pkg.packageId);
      service.recordInstall(pkg.packageId);

      const report = service.generateDistributionReport(pkg.packageId);
      expect(report).toContain('Distribution Report');
      expect(report).toContain('1.0.0');
      expect(report).toContain('Google Play Store');
    });
  });

  describe('getAllChannels', () => {
    it('should return all channels', () => {
      service.addDistributionChannel('Channel 1', 'play_store');
      service.addDistributionChannel('Channel 2', 'app_store');

      const channels = service.getAllChannels();
      expect(channels).toHaveLength(2);
    });
  });

  describe('getAllPackages', () => {
    it('should return all packages', () => {
      const channel = service.addDistributionChannel('Google Play Store', 'play_store');
      service.createDistributionPackage(
        '1.0.0',
        'android',
        channel.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );
      service.createDistributionPackage(
        '1.0.1',
        'android',
        channel.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );

      const packages = service.getAllPackages();
      expect(packages).toHaveLength(2);
    });
  });

  describe('getActiveChannels', () => {
    it('should return only active channels', () => {
      const channel1 = service.addDistributionChannel('Channel 1', 'play_store');
      const channel2 = service.addDistributionChannel('Channel 2', 'app_store');

      service.updateChannelStatus(channel2.channelId, 'maintenance');

      const active = service.getActiveChannels();
      expect(active).toHaveLength(1);
      expect(active[0].channelId).toBe(channel1.channelId);
    });
  });

  describe('Multi-channel distribution', () => {
    it('should handle distribution across multiple channels', () => {
      const playStore = service.addDistributionChannel('Google Play Store', 'play_store');
      const appStore = service.addDistributionChannel('App Store', 'app_store');

      const androidPkg = service.createDistributionPackage(
        '1.0.0',
        'android',
        playStore.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );

      const pcPkg = service.createDistributionPackage(
        '1.0.0',
        'pc',
        appStore.channelId,
        'https://example.com/app.exe',
        100000000,
        'sha256_def456'
      );

      service.recordDownload(androidPkg.packageId);
      service.recordDownload(pcPkg.packageId);

      const metrics = service.calculateDistributionMetrics();
      expect(metrics.totalDownloads).toBe(2);
    });
  });

  describe('Distribution lifecycle', () => {
    it('should track complete distribution lifecycle', () => {
      const channel = service.addDistributionChannel('Google Play Store', 'play_store');
      const pkg = service.createDistributionPackage(
        '1.0.0',
        'android',
        channel.channelId,
        'https://example.com/app.apk',
        50000000,
        'sha256_abc123'
      );

      // Downloads
      for (let i = 0; i < 100; i++) {
        service.recordDownload(pkg.packageId);
      }

      // Installs
      for (let i = 0; i < 80; i++) {
        service.recordInstall(pkg.packageId);
      }

      // Crashes
      for (let i = 0; i < 2; i++) {
        service.recordCrash(pkg.packageId);
      }

      service.publishDistribution(pkg.packageId);

      const updated = service.getPackage(pkg.packageId);
      expect(updated?.downloadCount).toBe(100);
      expect(updated?.installCount).toBe(80);
      expect(updated?.crashCount).toBe(2);

      const history = service.getDistributionHistory();
      expect(history).toHaveLength(1);
    });
  });
});
