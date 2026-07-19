/**
 * EnvironmentConfigService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { environmentConfigService, EnvironmentConfigService } from './EnvironmentConfigService';

describe('EnvironmentConfigService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    environmentConfigService.cleanup();
    new EnvironmentConfigService();
  });

  afterEach(() => {
    environmentConfigService.cleanup();
  });

  describe('Get Config', () => {
    it('should get development config', () => {
      const config = environmentConfigService.getConfig('development');
      expect(config).not.toBeNull();
      expect(config?.environment).toBe('development');
    });

    it('should get staging config', () => {
      const config = environmentConfigService.getConfig('staging');
      expect(config).not.toBeNull();
      expect(config?.environment).toBe('staging');
    });

    it('should get production config', () => {
      const config = environmentConfigService.getConfig('production');
      expect(config).not.toBeNull();
      expect(config?.environment).toBe('production');
    });

    it('should get all configs', () => {
      const configs = environmentConfigService.getAllConfigs();
      expect(configs.length).toBe(3);
    });
  });

  describe('Update Config', () => {
    it('should update config', () => {
      const updated = environmentConfigService.updateConfig('development', {
        logLevel: 'info',
      });
      expect(updated?.logLevel).toBe('info');
    });

    it('should preserve environment on update', () => {
      const updated = environmentConfigService.updateConfig('development', {
        apiUrl: 'http://newhost:3000',
      });
      expect(updated?.environment).toBe('development');
    });
  });

  describe('Custom Settings', () => {
    it('should set custom setting', () => {
      environmentConfigService.setCustomSetting('development', 'customKey', 'customValue');
      const value = environmentConfigService.getCustomSetting('development', 'customKey');
      expect(value).toBe('customValue');
    });

    it('should set numeric custom setting', () => {
      environmentConfigService.setCustomSetting('development', 'numericKey', 42);
      const value = environmentConfigService.getCustomSetting('development', 'numericKey');
      expect(value).toBe(42);
    });

    it('should set boolean custom setting', () => {
      environmentConfigService.setCustomSetting('development', 'boolKey', true);
      const value = environmentConfigService.getCustomSetting('development', 'boolKey');
      expect(value).toBe(true);
    });
  });

  describe('Validate Config', () => {
    it('should validate valid config', () => {
      const result = environmentConfigService.validateConfig('development');
      expect(result.valid).toBe(true);
    });

    it('should detect invalid config', () => {
      environmentConfigService.updateConfig('development', {
        maxConnections: -1,
      });
      const result = environmentConfigService.validateConfig('development');
      expect(result.valid).toBe(false);
    });

    it('should return errors', () => {
      environmentConfigService.updateConfig('development', {
        apiUrl: '',
        maxConnections: 0,
      });
      const result = environmentConfigService.validateConfig('development');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Reset to Defaults', () => {
    it('should reset to defaults', () => {
      environmentConfigService.updateConfig('development', {
        logLevel: 'error',
      });
      environmentConfigService.resetToDefaults('development');
      const config = environmentConfigService.getConfig('development');
      expect(config?.logLevel).toBe('debug');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      environmentConfigService.cleanup();
      const configs = environmentConfigService.getAllConfigs();
      expect(configs.length).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = EnvironmentConfigService.getInstance();
      const instance2 = EnvironmentConfigService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
