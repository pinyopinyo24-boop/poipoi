/**
 * ReleaseVersionService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { releaseVersionService, ReleaseVersionService } from './ReleaseVersionService';

describe('ReleaseVersionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    releaseVersionService.cleanup();
  });

  afterEach(() => {
    releaseVersionService.cleanup();
  });

  describe('Version Management', () => {
    it('should get current version', () => {
      const version = releaseVersionService.getCurrentVersion();
      expect(version).not.toBeNull();
      expect(version.major).toBe(1);
    });

    it('should set version', () => {
      const version = releaseVersionService.setVersion('2.0.0');
      expect(version.major).toBe(2);
    });

    it('should increment major version', () => {
      releaseVersionService.incrementMajor();
      const version = releaseVersionService.getCurrentVersion();
      expect(version.major).toBe(2);
    });

    it('should increment minor version', () => {
      releaseVersionService.incrementMinor();
      const version = releaseVersionService.getCurrentVersion();
      expect(version.minor).toBe(1);
    });

    it('should increment patch version', () => {
      releaseVersionService.incrementPatch();
      const version = releaseVersionService.getCurrentVersion();
      expect(version.patch).toBe(1);
    });
  });

  describe('Release History', () => {
    it('should add release history', () => {
      releaseVersionService.addReleaseHistory(
        '1.0.0',
        ['Feature 1'],
        ['Bug fix 1'],
        [],
        [],
        'Initial release'
      );
      const history = releaseVersionService.getReleaseHistory('1.0.0');
      expect(history).not.toBeNull();
    });

    it('should get all release history', () => {
      releaseVersionService.addReleaseHistory('1.0.0', [], [], [], [], 'Release 1');
      releaseVersionService.addReleaseHistory('1.1.0', [], [], [], [], 'Release 2');
      const histories = releaseVersionService.getAllReleaseHistory();
      expect(histories.length).toBe(2);
    });
  });

  describe('Version Comparison', () => {
    it('should compare versions', () => {
      const result = releaseVersionService.compareVersions('1.0.0', '2.0.0');
      expect(result).toBeLessThan(0);
    });

    it('should compare equal versions', () => {
      const result = releaseVersionService.compareVersions('1.0.0', '1.0.0');
      expect(result).toBe(0);
    });

    it('should compare minor versions', () => {
      const result = releaseVersionService.compareVersions('1.0.0', '1.1.0');
      expect(result).toBeLessThan(0);
    });
  });

  describe('Version History', () => {
    it('should get version history', () => {
      releaseVersionService.incrementMajor();
      releaseVersionService.incrementMinor();
      const history = releaseVersionService.getVersionHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should revert to previous version', () => {
      const original = releaseVersionService.getCurrentVersion();
      releaseVersionService.incrementMajor();
      releaseVersionService.revertToPreviousVersion();
      const current = releaseVersionService.getCurrentVersion();
      expect(current.major).toBe(original.major);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      releaseVersionService.addReleaseHistory('1.0.0', [], [], [], [], 'Release');
      releaseVersionService.cleanup();
      const histories = releaseVersionService.getAllReleaseHistory();
      expect(histories.length).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = ReleaseVersionService.getInstance();
      const instance2 = ReleaseVersionService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
