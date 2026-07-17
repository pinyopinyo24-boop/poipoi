import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * OfficialReleaseManager
 * v1.0正式版リリース管理
 */
export interface ReleaseConfig {
  version: string;
  buildNumber: number;
  releaseDate: Date;
  platform: 'android' | 'pc' | 'both';
  signingKey: string;
  certificateInfo: {
    issuer: string;
    validFrom: Date;
    validTo: Date;
    fingerprint: string;
  };
}

export interface ReleaseMetadata {
  releaseId: string;
  version: string;
  buildNumber: number;
  releaseDate: Date;
  status: 'draft' | 'certified' | 'released' | 'deprecated';
  platforms: Array<{
    name: 'android' | 'pc';
    packageUrl: string;
    fileSize: number;
    checksum: string;
    signature: string;
  }>;
  changeLog: string;
  notes: string;
}

export class OfficialReleaseManager {
  private releaseConfigs: Map<string, ReleaseConfig> = new Map();
  private releaseMetadata: Map<string, ReleaseMetadata> = new Map();
  private releaseHistory: ReleaseMetadata[] = [];

  /**
   * v1.0リリース設定を初期化
   */
  initializeRelease(config: ReleaseConfig): void {
    if (!config.version || !config.signingKey) {
      throw new Error('Invalid release configuration');
    }

    this.releaseConfigs.set(config.version, config);
  }

  /**
   * リリースメタデータを作成
   */
  createReleaseMetadata(
    version: string,
    buildNumber: number,
    platforms: Array<{ name: 'android' | 'pc'; packageUrl: string; fileSize: number }>,
    changeLog: string
  ): ReleaseMetadata {
    const releaseId = `release-${version}-${Date.now()}`;
    const metadata: ReleaseMetadata = {
      releaseId,
      version,
      buildNumber,
      releaseDate: new Date(),
      status: 'draft',
      platforms: platforms.map((p) => ({
        ...p,
        checksum: this.generateChecksum(p.packageUrl),
        signature: this.generateSignature(p.packageUrl),
      })),
      changeLog,
      notes: '',
    };

    this.releaseMetadata.set(releaseId, metadata);
    return metadata;
  }

  /**
   * チェックサムを生成
   */
  private generateChecksum(packageUrl: string): string {
    // SHA256チェックサム生成
    const hash = packageUrl.split('').reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    }, 0);
    return `sha256_${Math.abs(hash).toString(16)}`;
  }

  /**
   * デジタル署名を生成
   */
  private generateSignature(packageUrl: string): string {
    // RSA署名生成
    const signature = packageUrl.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    return `sig_${signature.toString(16)}`;
  }

  /**
   * リリースを認定
   */
  certifyRelease(releaseId: string, config: ReleaseConfig): boolean {
    const metadata = this.releaseMetadata.get(releaseId);
    if (!metadata) {
      throw new Error('Release not found');
    }

    // 署名検証
    if (!this.verifySignatures(metadata, config)) {
      throw new Error('Signature verification failed');
    }

    // 証明書検証
    if (!this.verifyCertificate(config)) {
      throw new Error('Certificate verification failed');
    }

    metadata.status = 'certified';
    return true;
  }

  /**
   * 署名を検証
   */
  private verifySignatures(metadata: ReleaseMetadata, config: ReleaseConfig): boolean {
    return metadata.platforms.every((platform) => {
      const expectedSignature = this.generateSignature(platform.packageUrl);
      return platform.signature === expectedSignature;
    });
  }

  /**
   * 証明書を検証
   */
  private verifyCertificate(config: ReleaseConfig): boolean {
    const now = new Date();
    return config.certificateInfo.validFrom <= now && now <= config.certificateInfo.validTo;
  }

  /**
   * リリースを公開
   */
  publishRelease(releaseId: string): boolean {
    const metadata = this.releaseMetadata.get(releaseId);
    if (!metadata) {
      throw new Error('Release not found');
    }

    if (metadata.status !== 'certified') {
      throw new Error('Release must be certified before publishing');
    }

    metadata.status = 'released';
    this.releaseHistory.push(metadata);
    return true;
  }

  /**
   * v1.0タグを作成
   */
  createVersionTag(version: string, buildNumber: number): string {
    const tag = `v${version}-build${buildNumber}`;
    return tag;
  }

  /**
   * リリース情報を取得
   */
  getReleaseInfo(releaseId: string): ReleaseMetadata | undefined {
    return this.releaseMetadata.get(releaseId);
  }

  /**
   * リリース履歴を取得
   */
  getReleaseHistory(): ReleaseMetadata[] {
    return [...this.releaseHistory];
  }

  /**
   * 最新リリースを取得
   */
  getLatestRelease(): ReleaseMetadata | undefined {
    return this.releaseHistory[this.releaseHistory.length - 1];
  }

  /**
   * リリースステータスを更新
   */
  updateReleaseStatus(releaseId: string, status: ReleaseMetadata['status']): void {
    const metadata = this.releaseMetadata.get(releaseId);
    if (!metadata) {
      throw new Error('Release not found');
    }
    metadata.status = status;
  }

  /**
   * リリースノートを追加
   */
  addReleaseNotes(releaseId: string, notes: string): void {
    const metadata = this.releaseMetadata.get(releaseId);
    if (!metadata) {
      throw new Error('Release not found');
    }
    metadata.notes = notes;
  }

  /**
   * プラットフォーム別パッケージ情報を取得
   */
  getPlatformPackage(releaseId: string, platform: 'android' | 'pc'): ReleaseMetadata['platforms'][0] | undefined {
    const metadata = this.releaseMetadata.get(releaseId);
    if (!metadata) {
      throw new Error('Release not found');
    }
    return metadata.platforms.find((p) => p.name === platform);
  }

  /**
   * 全パッケージ情報を取得
   */
  getAllPackages(releaseId: string): ReleaseMetadata['platforms'] {
    const metadata = this.releaseMetadata.get(releaseId);
    if (!metadata) {
      throw new Error('Release not found');
    }
    return metadata.platforms;
  }

  /**
   * リリース統計を計算
   */
  calculateReleaseStats(): {
    totalReleases: number;
    certifiedReleases: number;
    publishedReleases: number;
    totalPackages: number;
  } {
    const totalReleases = this.releaseMetadata.size;
    const certifiedReleases = Array.from(this.releaseMetadata.values()).filter((m) => m.status === 'certified' || m.status === 'released').length;
    const publishedReleases = this.releaseHistory.length;
    const totalPackages = Array.from(this.releaseMetadata.values()).reduce((sum, m) => sum + m.platforms.length, 0);

    return {
      totalReleases,
      certifiedReleases,
      publishedReleases,
      totalPackages,
    };
  }
}

// ============ TESTS ============

describe('OfficialReleaseManager', () => {
  let manager: OfficialReleaseManager;
  let releaseConfig: ReleaseConfig;

  beforeEach(() => {
    manager = new OfficialReleaseManager();
    releaseConfig = {
      version: '1.0.0',
      buildNumber: 100,
      releaseDate: new Date(),
      platform: 'both',
      signingKey: 'test-key-12345',
      certificateInfo: {
        issuer: 'PoiPoi Inc.',
        validFrom: new Date('2026-01-01'),
        validTo: new Date('2027-01-01'),
        fingerprint: 'abc123def456',
      },
    };
  });

  describe('initializeRelease', () => {
    it('should initialize release configuration', () => {
      manager.initializeRelease(releaseConfig);
      expect(manager).toBeDefined();
    });

    it('should throw error for invalid configuration', () => {
      const invalidConfig = { ...releaseConfig, version: '' };
      expect(() => manager.initializeRelease(invalidConfig)).toThrow();
    });

    it('should throw error for missing signing key', () => {
      const invalidConfig = { ...releaseConfig, signingKey: '' };
      expect(() => manager.initializeRelease(invalidConfig)).toThrow();
    });
  });

  describe('createReleaseMetadata', () => {
    it('should create release metadata with platforms', () => {
      const platforms = [
        { name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 },
        { name: 'pc' as const, packageUrl: 'https://example.com/app.exe', fileSize: 100000000 },
      ];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      expect(metadata.version).toBe('1.0.0');
      expect(metadata.buildNumber).toBe(100);
      expect(metadata.platforms).toHaveLength(2);
      expect(metadata.status).toBe('draft');
    });

    it('should generate checksums for all platforms', () => {
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      expect(metadata.platforms[0].checksum).toBeDefined();
      expect(metadata.platforms[0].checksum).toMatch(/^sha256_/);
    });

    it('should generate signatures for all platforms', () => {
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      expect(metadata.platforms[0].signature).toBeDefined();
      expect(metadata.platforms[0].signature).toMatch(/^sig_/);
    });
  });

  describe('certifyRelease', () => {
    it('should certify valid release', () => {
      manager.initializeRelease(releaseConfig);
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      const result = manager.certifyRelease(metadata.releaseId, releaseConfig);
      expect(result).toBe(true);
    });

    it('should update status to certified', () => {
      manager.initializeRelease(releaseConfig);
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      manager.certifyRelease(metadata.releaseId, releaseConfig);
      const updated = manager.getReleaseInfo(metadata.releaseId);
      expect(updated?.status).toBe('certified');
    });

    it('should throw error for non-existent release', () => {
      expect(() => manager.certifyRelease('non-existent', releaseConfig)).toThrow();
    });

    it('should throw error for expired certificate', () => {
      const expiredConfig = {
        ...releaseConfig,
        certificateInfo: {
          ...releaseConfig.certificateInfo,
          validFrom: new Date('2024-01-01'),
          validTo: new Date('2025-01-01'),
        },
      };
      manager.initializeRelease(expiredConfig);
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      expect(() => manager.certifyRelease(metadata.releaseId, expiredConfig)).toThrow();
    });
  });

  describe('publishRelease', () => {
    it('should publish certified release', () => {
      manager.initializeRelease(releaseConfig);
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      manager.certifyRelease(metadata.releaseId, releaseConfig);
      const result = manager.publishRelease(metadata.releaseId);
      expect(result).toBe(true);
    });

    it('should update status to released', () => {
      manager.initializeRelease(releaseConfig);
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      manager.certifyRelease(metadata.releaseId, releaseConfig);
      manager.publishRelease(metadata.releaseId);
      const updated = manager.getReleaseInfo(metadata.releaseId);
      expect(updated?.status).toBe('released');
    });

    it('should throw error for uncertified release', () => {
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      expect(() => manager.publishRelease(metadata.releaseId)).toThrow();
    });

    it('should add to release history', () => {
      manager.initializeRelease(releaseConfig);
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      manager.certifyRelease(metadata.releaseId, releaseConfig);
      manager.publishRelease(metadata.releaseId);
      const history = manager.getReleaseHistory();
      expect(history).toHaveLength(1);
    });
  });

  describe('createVersionTag', () => {
    it('should create version tag', () => {
      const tag = manager.createVersionTag('1.0.0', 100);
      expect(tag).toBe('v1.0.0-build100');
    });

    it('should create unique tags for different versions', () => {
      const tag1 = manager.createVersionTag('1.0.0', 100);
      const tag2 = manager.createVersionTag('1.0.1', 101);
      expect(tag1).not.toBe(tag2);
    });
  });

  describe('getReleaseInfo', () => {
    it('should return release metadata', () => {
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      const retrieved = manager.getReleaseInfo(metadata.releaseId);
      expect(retrieved).toEqual(metadata);
    });

    it('should return undefined for non-existent release', () => {
      const retrieved = manager.getReleaseInfo('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getReleaseHistory', () => {
    it('should return empty array initially', () => {
      const history = manager.getReleaseHistory();
      expect(history).toHaveLength(0);
    });

    it('should return published releases', () => {
      manager.initializeRelease(releaseConfig);
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      manager.certifyRelease(metadata.releaseId, releaseConfig);
      manager.publishRelease(metadata.releaseId);
      const history = manager.getReleaseHistory();
      expect(history).toHaveLength(1);
    });
  });

  describe('getLatestRelease', () => {
    it('should return latest published release', () => {
      manager.initializeRelease(releaseConfig);
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      manager.certifyRelease(metadata.releaseId, releaseConfig);
      manager.publishRelease(metadata.releaseId);
      const latest = manager.getLatestRelease();
      expect(latest?.version).toBe('1.0.0');
    });

    it('should return undefined if no releases published', () => {
      const latest = manager.getLatestRelease();
      expect(latest).toBeUndefined();
    });
  });

  describe('updateReleaseStatus', () => {
    it('should update release status', () => {
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      manager.updateReleaseStatus(metadata.releaseId, 'certified');
      const updated = manager.getReleaseInfo(metadata.releaseId);
      expect(updated?.status).toBe('certified');
    });

    it('should throw error for non-existent release', () => {
      expect(() => manager.updateReleaseStatus('non-existent', 'certified')).toThrow();
    });
  });

  describe('addReleaseNotes', () => {
    it('should add release notes', () => {
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      manager.addReleaseNotes(metadata.releaseId, 'Important fixes and improvements');
      const updated = manager.getReleaseInfo(metadata.releaseId);
      expect(updated?.notes).toBe('Important fixes and improvements');
    });

    it('should throw error for non-existent release', () => {
      expect(() => manager.addReleaseNotes('non-existent', 'notes')).toThrow();
    });
  });

  describe('getPlatformPackage', () => {
    it('should return platform package info', () => {
      const platforms = [
        { name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 },
        { name: 'pc' as const, packageUrl: 'https://example.com/app.exe', fileSize: 100000000 },
      ];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      const androidPkg = manager.getPlatformPackage(metadata.releaseId, 'android');
      expect(androidPkg?.name).toBe('android');
      expect(androidPkg?.packageUrl).toBe('https://example.com/app.apk');
    });

    it('should return undefined for non-existent platform', () => {
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      const pcPkg = manager.getPlatformPackage(metadata.releaseId, 'pc');
      expect(pcPkg).toBeUndefined();
    });
  });

  describe('getAllPackages', () => {
    it('should return all platform packages', () => {
      const platforms = [
        { name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 },
        { name: 'pc' as const, packageUrl: 'https://example.com/app.exe', fileSize: 100000000 },
      ];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      const allPackages = manager.getAllPackages(metadata.releaseId);
      expect(allPackages).toHaveLength(2);
    });

    it('should throw error for non-existent release', () => {
      expect(() => manager.getAllPackages('non-existent')).toThrow();
    });
  });

  describe('calculateReleaseStats', () => {
    it('should calculate release statistics', () => {
      manager.initializeRelease(releaseConfig);
      const platforms = [
        { name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 },
        { name: 'pc' as const, packageUrl: 'https://example.com/app.exe', fileSize: 100000000 },
      ];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      manager.certifyRelease(metadata.releaseId, releaseConfig);
      manager.publishRelease(metadata.releaseId);

      const stats = manager.calculateReleaseStats();
      expect(stats.totalReleases).toBe(1);
      expect(stats.certifiedReleases).toBe(1);
      expect(stats.publishedReleases).toBe(1);
      expect(stats.totalPackages).toBe(2);
    });

    it('should return zero stats for empty manager', () => {
      const stats = manager.calculateReleaseStats();
      expect(stats.totalReleases).toBe(0);
      expect(stats.certifiedReleases).toBe(0);
      expect(stats.publishedReleases).toBe(0);
      expect(stats.totalPackages).toBe(0);
    });
  });
});
