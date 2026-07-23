/**
 * InstallationValidationService - インストール検証サービス
 */

export type ValidationStatus = 'pending' | 'validating' | 'passed' | 'failed';

export interface InstallationValidation {
  validationId: string;
  deviceId: string;
  apkPath: string;
  status: ValidationStatus;
  startedAt?: number;
  completedAt?: number;
  appInstalled?: boolean;
  appRunning?: boolean;
  errorMessage?: string;
  validationResults?: Record<string, unknown>;
}

export class InstallationValidationService {
  private static instance: InstallationValidationService;
  private validations: Map<string, InstallationValidation> = new Map();
  private validationCounter: number = 0;

  private constructor() {}

  static getInstance(): InstallationValidationService {
    if (!InstallationValidationService.instance) {
      InstallationValidationService.instance = new InstallationValidationService();
    }
    return InstallationValidationService.instance;
  }

  /**
   * 検証開始
   */
  startValidation(deviceId: string, apkPath: string): InstallationValidation {
    const validationId = `validation_${++this.validationCounter}_${Date.now()}`;

    const validation: InstallationValidation = {
      validationId,
      deviceId,
      apkPath,
      status: 'validating',
      startedAt: Date.now(),
    };

    this.validations.set(validationId, validation);
    return validation;
  }

  /**
   * 検証成功
   */
  passValidation(
    validationId: string,
    appInstalled: boolean,
    appRunning: boolean,
    validationResults?: Record<string, unknown>
  ): InstallationValidation | null {
    const validation = this.validations.get(validationId);
    if (!validation) return null;

    validation.status = 'passed';
    validation.appInstalled = appInstalled;
    validation.appRunning = appRunning;
    validation.validationResults = validationResults;
    validation.completedAt = Date.now();

    return validation;
  }

  /**
   * 検証失敗
   */
  failValidation(validationId: string, errorMessage: string): InstallationValidation | null {
    const validation = this.validations.get(validationId);
    if (!validation) return null;

    validation.status = 'failed';
    validation.errorMessage = errorMessage;
    validation.completedAt = Date.now();

    return validation;
  }

  /**
   * 検証取得
   */
  getValidation(validationId: string): InstallationValidation | null {
    return this.validations.get(validationId) || null;
  }

  /**
   * デバイス別検証取得
   */
  getValidationsByDevice(deviceId: string): InstallationValidation[] {
    return Array.from(this.validations.values()).filter((v) => v.deviceId === deviceId);
  }

  /**
   * 成功した検証取得
   */
  getPassedValidations(): InstallationValidation[] {
    return Array.from(this.validations.values()).filter((v) => v.status === 'passed');
  }

  /**
   * 失敗した検証取得
   */
  getFailedValidations(): InstallationValidation[] {
    return Array.from(this.validations.values()).filter((v) => v.status === 'failed');
  }

  /**
   * 検証統計
   */
  getValidationStatistics(): {
    totalValidations: number;
    passedValidations: number;
    failedValidations: number;
    validatingValidations: number;
    successRate: number;
  } {
    const validationArray = Array.from(this.validations.values());
    const passedValidations = validationArray.filter((v) => v.status === 'passed').length;
    const failedValidations = validationArray.filter((v) => v.status === 'failed').length;
    const validatingValidations = validationArray.filter((v) => v.status === 'validating').length;
    const totalValidations = validationArray.length;

    const successRate = totalValidations > 0 ? (passedValidations / totalValidations) * 100 : 0;

    return {
      totalValidations,
      passedValidations,
      failedValidations,
      validatingValidations,
      successRate,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.validations.clear();
  }
}

export const installationValidationService = InstallationValidationService.getInstance();
export default installationValidationService;
