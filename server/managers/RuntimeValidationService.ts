/**
 * RuntimeValidationService - ランタイム検証サービス
 */

export type ValidationStatus = 'pending' | 'validating' | 'passed' | 'failed';

export interface RuntimeValidation {
  validationId: string;
  deviceId: string;
  status: ValidationStatus;
  startedAt?: number;
  completedAt?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  batteryUsage?: number;
  frameRate?: number;
  responseTime?: number;
  issues?: string[];
}

export class RuntimeValidationService {
  private static instance: RuntimeValidationService;
  private validations: Map<string, RuntimeValidation> = new Map();
  private validationCounter: number = 0;

  private constructor() {}

  static getInstance(): RuntimeValidationService {
    if (!RuntimeValidationService.instance) {
      RuntimeValidationService.instance = new RuntimeValidationService();
    }
    return RuntimeValidationService.instance;
  }

  /**
   * 検証開始
   */
  startValidation(deviceId: string): RuntimeValidation {
    const validationId = `runtime_val_${++this.validationCounter}_${Date.now()}`;

    const validation: RuntimeValidation = {
      validationId,
      deviceId,
      status: 'validating',
      startedAt: Date.now(),
      issues: [],
    };

    this.validations.set(validationId, validation);
    return validation;
  }

  /**
   * 検証成功
   */
  passValidation(
    validationId: string,
    cpuUsage: number,
    memoryUsage: number,
    batteryUsage: number,
    frameRate: number,
    responseTime: number
  ): RuntimeValidation | null {
    const validation = this.validations.get(validationId);
    if (!validation) return null;

    validation.status = 'passed';
    validation.cpuUsage = cpuUsage;
    validation.memoryUsage = memoryUsage;
    validation.batteryUsage = batteryUsage;
    validation.frameRate = frameRate;
    validation.responseTime = responseTime;
    validation.completedAt = Date.now();

    return validation;
  }

  /**
   * 検証失敗
   */
  failValidation(validationId: string, issues: string[]): RuntimeValidation | null {
    const validation = this.validations.get(validationId);
    if (!validation) return null;

    validation.status = 'failed';
    validation.issues = issues;
    validation.completedAt = Date.now();

    return validation;
  }

  /**
   * 検証取得
   */
  getValidation(validationId: string): RuntimeValidation | null {
    return this.validations.get(validationId) || null;
  }

  /**
   * デバイス別検証取得
   */
  getValidationsByDevice(deviceId: string): RuntimeValidation[] {
    return Array.from(this.validations.values()).filter((v) => v.deviceId === deviceId);
  }

  /**
   * 成功した検証取得
   */
  getPassedValidations(): RuntimeValidation[] {
    return Array.from(this.validations.values()).filter((v) => v.status === 'passed');
  }

  /**
   * 検証統計
   */
  getValidationStatistics(): {
    totalValidations: number;
    passedValidations: number;
    failedValidations: number;
    averageCpuUsage: number;
    averageMemoryUsage: number;
    averageBatteryUsage: number;
    averageFrameRate: number;
    averageResponseTime: number;
  } {
    const validationArray = Array.from(this.validations.values());
    const passedValidations = validationArray.filter((v) => v.status === 'passed');

    let totalCpuUsage = 0;
    let totalMemoryUsage = 0;
    let totalBatteryUsage = 0;
    let totalFrameRate = 0;
    let totalResponseTime = 0;

    passedValidations.forEach((v) => {
      totalCpuUsage += v.cpuUsage || 0;
      totalMemoryUsage += v.memoryUsage || 0;
      totalBatteryUsage += v.batteryUsage || 0;
      totalFrameRate += v.frameRate || 0;
      totalResponseTime += v.responseTime || 0;
    });

    const passedCount = passedValidations.length;

    return {
      totalValidations: validationArray.length,
      passedValidations: passedCount,
      failedValidations: validationArray.filter((v) => v.status === 'failed').length,
      averageCpuUsage: passedCount > 0 ? totalCpuUsage / passedCount : 0,
      averageMemoryUsage: passedCount > 0 ? totalMemoryUsage / passedCount : 0,
      averageBatteryUsage: passedCount > 0 ? totalBatteryUsage / passedCount : 0,
      averageFrameRate: passedCount > 0 ? totalFrameRate / passedCount : 0,
      averageResponseTime: passedCount > 0 ? totalResponseTime / passedCount : 0,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.validations.clear();
  }
}

export const runtimeValidationService = RuntimeValidationService.getInstance();
export default runtimeValidationService;
