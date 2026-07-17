import { describe, it, expect, beforeEach } from 'vitest';
import { OfficialReleaseManager, ReleaseConfig, ReleaseMetadata } from './OfficialReleaseManager';

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

  describe('Multiple releases workflow', () => {
    it('should handle multiple releases', () => {
      manager.initializeRelease(releaseConfig);

      // Release 1
      const platforms1 = [{ name: 'android' as const, packageUrl: 'https://example.com/app-v1.apk', fileSize: 50000000 }];
      const metadata1 = manager.createReleaseMetadata('1.0.0', 100, platforms1, 'v1.0.0 release');
      manager.certifyRelease(metadata1.releaseId, releaseConfig);
      manager.publishRelease(metadata1.releaseId);

      // Release 2
      const platforms2 = [{ name: 'android' as const, packageUrl: 'https://example.com/app-v2.apk', fileSize: 52000000 }];
      const metadata2 = manager.createReleaseMetadata('1.0.1', 101, platforms2, 'v1.0.1 hotfix');
      manager.certifyRelease(metadata2.releaseId, releaseConfig);
      manager.publishRelease(metadata2.releaseId);

      const history = manager.getReleaseHistory();
      expect(history).toHaveLength(2);
      expect(history[1].version).toBe('1.0.1');
    });
  });

  describe('Platform-specific operations', () => {
    it('should handle android-only release', () => {
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Android release');

      expect(metadata.platforms).toHaveLength(1);
      expect(metadata.platforms[0].name).toBe('android');
    });

    it('should handle pc-only release', () => {
      const platforms = [{ name: 'pc' as const, packageUrl: 'https://example.com/app.exe', fileSize: 100000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'PC release');

      expect(metadata.platforms).toHaveLength(1);
      expect(metadata.platforms[0].name).toBe('pc');
    });

    it('should handle both platform release', () => {
      const platforms = [
        { name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 },
        { name: 'pc' as const, packageUrl: 'https://example.com/app.exe', fileSize: 100000000 },
      ];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Full release');

      expect(metadata.platforms).toHaveLength(2);
    });
  });

  describe('Release state transitions', () => {
    it('should transition from draft to certified to released', () => {
      manager.initializeRelease(releaseConfig);
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Initial release');

      expect(metadata.status).toBe('draft');

      manager.certifyRelease(metadata.releaseId, releaseConfig);
      let updated = manager.getReleaseInfo(metadata.releaseId);
      expect(updated?.status).toBe('certified');

      manager.publishRelease(metadata.releaseId);
      updated = manager.getReleaseInfo(metadata.releaseId);
      expect(updated?.status).toBe('released');
    });
  });

  describe('Package integrity', () => {
    it('should generate consistent checksums', () => {
      const platforms = [{ name: 'android' as const, packageUrl: 'https://example.com/app.apk', fileSize: 50000000 }];
      const metadata1 = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Release 1');
      const metadata2 = manager.createReleaseMetadata('1.0.0', 100, platforms, 'Release 2');

      expect(metadata1.platforms[0].checksum).toBe(metadata2.platforms[0].checksum);
    });

    it('should generate different checksums for different packages', () => {
      const platforms1 = [{ name: 'android' as const, packageUrl: 'https://example.com/app-v1.apk', fileSize: 50000000 }];
      const platforms2 = [{ name: 'android' as const, packageUrl: 'https://example.com/app-v2.apk', fileSize: 50000000 }];
      const metadata1 = manager.createReleaseMetadata('1.0.0', 100, platforms1, 'Release 1');
      const metadata2 = manager.createReleaseMetadata('1.0.0', 100, platforms2, 'Release 2');

      expect(metadata1.platforms[0].checksum).not.toBe(metadata2.platforms[0].checksum);
    });
  });
});
