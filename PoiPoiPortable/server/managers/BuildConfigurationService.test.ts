/**
 * BuildConfigurationService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildConfigurationService, BuildConfigurationService } from './BuildConfigurationService';

describe('BuildConfigurationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildConfigurationService.cleanup();
  });

  afterEach(() => {
    buildConfigurationService.cleanup();
  });

  describe('Configuration Management', () => {
    it('should create configuration', () => {
      const config = buildConfigurationService.createConfiguration(
        'release',
        'com.poipoi.app',
        '1.0.0',
        1,
        21,
        33,
        33
      );
      expect(config.configId).toBeDefined();
      expect(config.variant).toBe('release');
    });

    it('should get configuration', () => {
      const created = buildConfigurationService.createConfiguration(
        'release',
        'com.poipoi.app',
        '1.0.0',
        1,
        21,
        33,
        33
      );
      const config = buildConfigurationService.getConfiguration(created.configId);
      expect(config).not.toBeNull();
      expect(config?.applicationId).toBe('com.poipoi.app');
    });

    it('should get configurations by variant', () => {
      buildConfigurationService.createConfiguration('debug', 'com.poipoi.app', '1.0.0', 1, 21, 33, 33);
      buildConfigurationService.createConfiguration('release', 'com.poipoi.app', '1.0.0', 1, 21, 33, 33);
      buildConfigurationService.createConfiguration('release', 'com.poipoi.app', '1.0.1', 2, 21, 33, 33);

      const releaseConfigs = buildConfigurationService.getConfigurationsByVariant('release');
      expect(releaseConfigs.length).toBe(2);
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration', () => {
      const created = buildConfigurationService.createConfiguration(
        'release',
        'com.poipoi.app',
        '1.0.0',
        1,
        21,
        33,
        33
      );
      const updated = buildConfigurationService.updateConfiguration(created.configId, {
        versionName: '1.0.1',
        versionCode: 2,
      });
      expect(updated?.versionName).toBe('1.0.1');
      expect(updated?.versionCode).toBe(2);
    });

    it('should delete configuration', () => {
      const created = buildConfigurationService.createConfiguration(
        'release',
        'com.poipoi.app',
        '1.0.0',
        1,
        21,
        33,
        33
      );
      const deleted = buildConfigurationService.deleteConfiguration(created.configId);
      expect(deleted).toBe(true);
      expect(buildConfigurationService.getConfiguration(created.configId)).toBeNull();
    });
  });

  describe('Configuration Queries', () => {
    it('should get all configurations', () => {
      buildConfigurationService.createConfiguration('debug', 'com.poipoi.app', '1.0.0', 1, 21, 33, 33);
      buildConfigurationService.createConfiguration('release', 'com.poipoi.app', '1.0.0', 1, 21, 33, 33);

      const all = buildConfigurationService.getAllConfigurations();
      expect(all.length).toBe(2);
    });
  });

  describe('Configuration Statistics', () => {
    it('should get configuration statistics', () => {
      buildConfigurationService.createConfiguration('debug', 'com.poipoi.app', '1.0.0', 1, 21, 33, 33);
      buildConfigurationService.createConfiguration('release', 'com.poipoi.app', '1.0.0', 1, 21, 33, 33);
      buildConfigurationService.createConfiguration('staging', 'com.poipoi.app', '1.0.0', 1, 21, 33, 33);

      const stats = buildConfigurationService.getConfigurationStatistics();
      expect(stats.totalConfigurations).toBe(3);
      expect(stats.debugConfigurations).toBe(1);
      expect(stats.releaseConfigurations).toBe(1);
      expect(stats.stagingConfigurations).toBe(1);
    });

    it('should count proguard enabled configurations', () => {
      buildConfigurationService.createConfiguration('debug', 'com.poipoi.app', '1.0.0', 1, 21, 33, 33);
      buildConfigurationService.createConfiguration('release', 'com.poipoi.app', '1.0.0', 1, 21, 33, 33);

      const stats = buildConfigurationService.getConfigurationStatistics();
      expect(stats.proguardEnabledCount).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      buildConfigurationService.createConfiguration('release', 'com.poipoi.app', '1.0.0', 1, 21, 33, 33);
      buildConfigurationService.cleanup();
      const stats = buildConfigurationService.getConfigurationStatistics();
      expect(stats.totalConfigurations).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = BuildConfigurationService.getInstance();
      const instance2 = BuildConfigurationService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });

  describe('Debug Configuration', () => {
    it('should set debuggable for debug variant', () => {
      const config = buildConfigurationService.createConfiguration(
        'debug',
        'com.poipoi.app',
        '1.0.0',
        1,
        21,
        33,
        33
      );
      expect(config.debuggable).toBe(true);
    });

    it('should not set debuggable for release variant', () => {
      const config = buildConfigurationService.createConfiguration(
        'release',
        'com.poipoi.app',
        '1.0.0',
        1,
        21,
        33,
        33
      );
      expect(config.debuggable).toBe(false);
    });
  });
});
