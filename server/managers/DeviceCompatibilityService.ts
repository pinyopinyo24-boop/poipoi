/**
 * DeviceCompatibilityService - デバイス互換性サービス
 */

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  osVersion: number;
  manufacturer: string;
  model: string;
  ram: number;
  storage: number;
}

export interface CompatibilityCheck {
  checkId: string;
  deviceId: string;
  minSdkVersion: number;
  targetSdkVersion: number;
  isCompatible: boolean;
  issues: string[];
  checkedAt: number;
}

export class DeviceCompatibilityService {
  private static instance: DeviceCompatibilityService;
  private devices: Map<string, DeviceInfo> = new Map();
  private checks: Map<string, CompatibilityCheck> = new Map();
  private checkCounter: number = 0;

  private constructor() {}

  static getInstance(): DeviceCompatibilityService {
    if (!DeviceCompatibilityService.instance) {
      DeviceCompatibilityService.instance = new DeviceCompatibilityService();
    }
    return DeviceCompatibilityService.instance;
  }

  /**
   * デバイス登録
   */
  registerDevice(
    deviceId: string,
    deviceName: string,
    osVersion: number,
    manufacturer: string,
    model: string,
    ram: number,
    storage: number
  ): DeviceInfo {
    const device: DeviceInfo = {
      deviceId,
      deviceName,
      osVersion,
      manufacturer,
      model,
      ram,
      storage,
    };

    this.devices.set(deviceId, device);
    return device;
  }

  /**
   * デバイス取得
   */
  getDevice(deviceId: string): DeviceInfo | null {
    return this.devices.get(deviceId) || null;
  }

  /**
   * 互換性チェック
   */
  checkCompatibility(deviceId: string, minSdkVersion: number, targetSdkVersion: number): CompatibilityCheck {
    const checkId = `compat_check_${++this.checkCounter}_${Date.now()}`;
    const device = this.devices.get(deviceId);
    const issues: string[] = [];
    let isCompatible = true;

    if (!device) {
      isCompatible = false;
      issues.push('Device not found');
    } else {
      if (device.osVersion < minSdkVersion) {
        isCompatible = false;
        issues.push(`OS version ${device.osVersion} is below minimum required ${minSdkVersion}`);
      }

      if (device.ram < 1024) {
        issues.push('Insufficient RAM (less than 1GB)');
      }

      if (device.storage < 100) {
        issues.push('Insufficient storage (less than 100MB)');
      }
    }

    const check: CompatibilityCheck = {
      checkId,
      deviceId,
      minSdkVersion,
      targetSdkVersion,
      isCompatible,
      issues,
      checkedAt: Date.now(),
    };

    this.checks.set(checkId, check);
    return check;
  }

  /**
   * 互換性チェック取得
   */
  getCompatibilityCheck(checkId: string): CompatibilityCheck | null {
    return this.checks.get(checkId) || null;
  }

  /**
   * デバイス別互換性チェック取得
   */
  getCompatibilityChecksByDevice(deviceId: string): CompatibilityCheck[] {
    return Array.from(this.checks.values()).filter((c) => c.deviceId === deviceId);
  }

  /**
   * 互換性のあるデバイス取得
   */
  getCompatibleDevices(minSdkVersion: number, targetSdkVersion: number): DeviceInfo[] {
    return Array.from(this.devices.values()).filter((device) => device.osVersion >= minSdkVersion);
  }

  /**
   * 互換性統計
   */
  getCompatibilityStatistics(): {
    totalDevices: number;
    totalChecks: number;
    compatibleChecks: number;
    incompatibleChecks: number;
    compatibilityRate: number;
  } {
    const deviceArray = Array.from(this.devices.values());
    const checkArray = Array.from(this.checks.values());
    const compatibleChecks = checkArray.filter((c) => c.isCompatible).length;
    const incompatibleChecks = checkArray.filter((c) => !c.isCompatible).length;

    const compatibilityRate = checkArray.length > 0 ? (compatibleChecks / checkArray.length) * 100 : 0;

    return {
      totalDevices: deviceArray.length,
      totalChecks: checkArray.length,
      compatibleChecks,
      incompatibleChecks,
      compatibilityRate,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.devices.clear();
    this.checks.clear();
  }
}

export const deviceCompatibilityService = DeviceCompatibilityService.getInstance();
export default deviceCompatibilityService;
