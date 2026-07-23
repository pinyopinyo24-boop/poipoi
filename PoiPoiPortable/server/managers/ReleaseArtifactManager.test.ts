/**
 * ReleaseArtifactManager Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { releaseArtifactManager, ReleaseArtifactManager } from './ReleaseArtifactManager';

describe('ReleaseArtifactManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    releaseArtifactManager.cleanup();
  });

  afterEach(() => {
    releaseArtifactManager.cleanup();
  });

  describe('Artifact Registration', () => {
    it('should register artifact', () => {
      const artifact = releaseArtifactManager.registerArtifact(
        '1.0.0',
        'apk',
        '/path/to/app.apk',
        50000000,
        'abc123def456'
      );
      expect(artifact.artifactId).toBeDefined();
      expect(artifact.releaseVersion).toBe('1.0.0');
    });

    it('should get artifact', () => {
      const registered = releaseArtifactManager.registerArtifact(
        '1.0.0',
        'apk',
        '/path/to/app.apk',
        50000000,
        'abc123def456'
      );
      const artifact = releaseArtifactManager.getArtifact(registered.artifactId);
      expect(artifact).not.toBeNull();
      expect(artifact?.filePath).toBe('/path/to/app.apk');
    });
  });

  describe('Artifact Queries', () => {
    it('should get artifacts by version', () => {
      releaseArtifactManager.registerArtifact('1.0.0', 'apk', '/path/to/app.apk', 50000000, 'abc123');
      releaseArtifactManager.registerArtifact('1.0.0', 'mapping', '/path/to/mapping.txt', 1000000, 'def456');
      releaseArtifactManager.registerArtifact('1.0.1', 'apk', '/path/to/app2.apk', 55000000, 'ghi789');

      const v1Artifacts = releaseArtifactManager.getArtifactsByVersion('1.0.0');
      expect(v1Artifacts.length).toBe(2);
    });

    it('should get artifacts by type', () => {
      releaseArtifactManager.registerArtifact('1.0.0', 'apk', '/path/to/app.apk', 50000000, 'abc123');
      releaseArtifactManager.registerArtifact('1.0.0', 'apk', '/path/to/app2.apk', 55000000, 'def456');
      releaseArtifactManager.registerArtifact('1.0.0', 'mapping', '/path/to/mapping.txt', 1000000, 'ghi789');

      const apkArtifacts = releaseArtifactManager.getArtifactsByType('apk');
      expect(apkArtifacts.length).toBe(2);
    });

    it('should get all artifacts', () => {
      releaseArtifactManager.registerArtifact('1.0.0', 'apk', '/path/to/app.apk', 50000000, 'abc123');
      releaseArtifactManager.registerArtifact('1.0.0', 'mapping', '/path/to/mapping.txt', 1000000, 'def456');

      const all = releaseArtifactManager.getAllArtifacts();
      expect(all.length).toBe(2);
    });
  });

  describe('Artifact Deletion', () => {
    it('should delete artifact', () => {
      const registered = releaseArtifactManager.registerArtifact(
        '1.0.0',
        'apk',
        '/path/to/app.apk',
        50000000,
        'abc123'
      );
      const deleted = releaseArtifactManager.deleteArtifact(registered.artifactId);
      expect(deleted).toBe(true);
      expect(releaseArtifactManager.getArtifact(registered.artifactId)).toBeNull();
    });
  });

  describe('Artifact Statistics', () => {
    it('should get artifact statistics', () => {
      releaseArtifactManager.registerArtifact('1.0.0', 'apk', '/path/to/app.apk', 50000000, 'abc123');
      releaseArtifactManager.registerArtifact('1.0.0', 'mapping', '/path/to/mapping.txt', 1000000, 'def456');
      releaseArtifactManager.registerArtifact('1.0.0', 'symbols', '/path/to/symbols.zip', 5000000, 'ghi789');

      const stats = releaseArtifactManager.getArtifactStatistics();
      expect(stats.totalArtifacts).toBe(3);
      expect(stats.apkArtifacts).toBe(1);
      expect(stats.mappingArtifacts).toBe(1);
      expect(stats.symbolsArtifacts).toBe(1);
    });

    it('should calculate size statistics', () => {
      releaseArtifactManager.registerArtifact('1.0.0', 'apk', '/path/to/app.apk', 50000000, 'abc123');
      releaseArtifactManager.registerArtifact('1.0.0', 'mapping', '/path/to/mapping.txt', 10000000, 'def456');

      const stats = releaseArtifactManager.getArtifactStatistics();
      expect(stats.totalSize).toBe(60000000);
      expect(stats.averageSize).toBe(30000000);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      releaseArtifactManager.registerArtifact('1.0.0', 'apk', '/path/to/app.apk', 50000000, 'abc123');
      releaseArtifactManager.cleanup();
      const stats = releaseArtifactManager.getArtifactStatistics();
      expect(stats.totalArtifacts).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = ReleaseArtifactManager.getInstance();
      const instance2 = ReleaseArtifactManager.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });

  describe('Artifact Metadata', () => {
    it('should register artifact with metadata', () => {
      const artifact = releaseArtifactManager.registerArtifact(
        '1.0.0',
        'apk',
        '/path/to/app.apk',
        50000000,
        'abc123',
        { buildNumber: '123', buildTime: '2024-01-01' }
      );
      expect(artifact.metadata?.buildNumber).toBe('123');
    });
  });
});
