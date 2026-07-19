/**
 * DeviceCompatibilityService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { deviceCompatibilityService, DeviceCompatibilityService } from './DeviceCompatibilityService';

describe('DeviceCompatibilityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deviceCompatibilityService.cleanup();
  });

  afterEach(() => {
    deviceCompatibilityService.cleanup();
  });

  describe('Device Registration', () => {
    it('should register device', () => {
      const device = deviceCompatibilityService.registerDevice(
        'device123',
        'Samsung Galaxy S21',
        33,
        'Samsung',
        'SM-G991B',
        8192,
        256000
      );
      expect(device.deviceId).toBe('device123');
      expect(device.osVersion).toBe(33);
    });

    it('should get device', () => {
      deviceCompatibilityService.registerDevice(
        'device123',
        'Samsung Galaxy S21',
        33,
        'Samsung',
        'SM-G991B',
        8192,
        256000
      );
      const device = deviceCompatibilityService.getDevice('device123');
      expect(device).not.toBeNull();
      expect(device?.deviceName).toBe('Samsung Galaxy S21');
    });
  });

  describe('Compatibility Checks', () => {
    it('should check compatibility - compatible device', () => {
      deviceCompatibilityService.registerDevice(
        'device123',
        'Samsung Galaxy S21',
        33,
        'Samsung',
        'SM-G991B',
        8192,
        256000
      );
      const check = deviceCompatibilityService.checkCompatibility('device123', 21, 33);
      expect(check.isCompatible).toBe(true);
      expect(check.issues.length).toBe(0);
    });

    it('should check compatibility - incompatible device', () => {
      deviceCompatibilityService.registerDevice(
        'device123',
        'Old Device',
        19,
        'Samsung',
        'SM-G900F',
        1024,
        16000
      );
      const check = deviceCompatibilityService.checkCompatibility('device123', 21, 33);
      expect(check.isCompatible).toBe(false);
      expect(check.issues.length).toBeGreaterThan(0);
    });

    it('should detect insufficient RAM', () => {
      deviceCompatibilityService.registerDevice('device123', 'Low RAM Device', 33, 'Samsung', 'SM-G991B', 512, 256000);
      const check = deviceCompatibilityService.checkCompatibility('device123', 21, 33);
      expect(check.issues.some((issue) => issue.includes('RAM'))).toBe(true);
    });

    it('should detect insufficient storage', () => {
      deviceCompatibilityService.registerDevice(
        'device123',
        'Low Storage Device',
        33,
        'Samsung',
        'SM-G991B',
        8192,
        50
      );
      const check = deviceCompatibilityService.checkCompatibility('device123', 21, 33);
      expect(check.issues.some((issue) => issue.includes('storage'))).toBe(true);
    });
  });

  describe('Compatibility Queries', () => {
    it('should get compatibility checks by device', () => {
      deviceCompatibilityService.registerDevice(
        'device123',
        'Samsung Galaxy S21',
        33,
        'Samsung',
        'SM-G991B',
        8192,
        256000
      );
      deviceCompatibilityService.checkCompatibility('device123', 21, 33);
      deviceCompatibilityService.checkCompatibility('device123', 24, 33);

      const checks = deviceCompatibilityService.getCompatibilityChecksByDevice('device123');
      expect(checks.length).toBe(2);
    });

    it('should get compatible devices', () => {
      deviceCompatibilityService.registerDevice(
        'device123',
        'Samsung Galaxy S21',
        33,
        'Samsung',
        'SM-G991B',
        8192,
        256000
      );
      deviceCompatibilityService.registerDevice('device456', 'Old Device', 19, 'Samsung', 'SM-G900F', 1024, 16000);

      const compatible = deviceCompatibilityService.getCompatibleDevices(21, 33);
      expect(compatible.length).toBe(1);
    });
  });

  describe('Compatibility Statistics', () => {
    it('should get compatibility statistics', () => {
      deviceCompatibilityService.registerDevice(
        'device123',
        'Samsung Galaxy S21',
        33,
        'Samsung',
        'SM-G991B',
        8192,
        256000
      );
      deviceCompatibilityService.registerDevice(
        'device456',
        'Samsung Galaxy S20',
        31,
        'Samsung',
        'SM-G980F',
        8192,
        256000
      );

      deviceCompatibilityService.checkCompatibility('device123', 21, 33);
      deviceCompatibilityService.checkCompatibility('device456', 21, 33);

      const stats = deviceCompatibilityService.getCompatibilityStatistics();
      expect(stats.totalDevices).toBe(2);
      expect(stats.totalChecks).toBe(2);
      expect(stats.compatibilityRate).toBe(100);
    });

    it('should calculate compatibility rate with incompatible devices', () => {
      deviceCompatibilityService.registerDevice(
        'device123',
        'Samsung Galaxy S21',
        33,
        'Samsung',
        'SM-G991B',
        8192,
        256000
      );
      deviceCompatibilityService.registerDevice('device456', 'Old Device', 19, 'Samsung', 'SM-G900F', 1024, 16000);

      deviceCompatibilityService.checkCompatibility('device123', 21, 33);
      deviceCompatibilityService.checkCompatibility('device456', 21, 33);

      const stats = deviceCompatibilityService.getCompatibilityStatistics();
      expect(stats.compatibilityRate).toBe(50);
      expect(stats.incompatibleChecks).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      deviceCompatibilityService.registerDevice(
        'device123',
        'Samsung Galaxy S21',
        33,
        'Samsung',
        'SM-G991B',
        8192,
        256000
      );
      deviceCompatibilityService.checkCompatibility('device123', 21, 33);
      deviceCompatibilityService.cleanup();
      const stats = deviceCompatibilityService.getCompatibilityStatistics();
      expect(stats.totalDevices).toBe(0);
      expect(stats.totalChecks).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = DeviceCompatibilityService.getInstance();
      const instance2 = DeviceCompatibilityService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
