/**
 * SecurityValidationService - セキュリティ検証サービス
 */

export type SecurityCheck = 'authentication' | 'authorization' | 'encryption' | 'audit' | 'dataLeakage';

export interface SecurityValidation {
  validationId: string;
  checkType: SecurityCheck;
  checkName: string;
  status: 'pending' | 'validating' | 'passed' | 'failed' | 'warning';
  startedAt?: number;
  completedAt?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  errorMessage?: string;
  recommendation?: string;
}

export class SecurityValidationService {
  private static instance: SecurityValidationService;
  private validations: Map<string, SecurityValidation> = new Map();
  private validationCounter: number = 0;

  private constructor() {}

  static getInstance(): SecurityValidationService {
    if (!SecurityValidationService.instance) {
      SecurityValidationService.instance = new SecurityValidationService();
    }
    return SecurityValidationService.instance;
  }

  /**
   * セキュリティ検証登録
   */
  registerSecurityValidation(
    checkType: SecurityCheck,
    checkName: string,
    severity: 'critical' | 'high' | 'medium' | 'low'
  ): SecurityValidation {
    const validationId = `sec_val_${++this.validationCounter}_${Date.now()}`;

    const validation: SecurityValidation = {
      validationId,
      checkType,
      checkName,
      status: 'pending',
      severity,
    };

    this.validations.set(validationId, validation);
    return validation;
  }

  /**
   * 検証開始
   */
  startValidation(validationId: string): SecurityValidation | null {
    const validation = this.validations.get(validationId);
    if (!validation) return null;

    validation.status = 'validating';
    validation.startedAt = Date.now();
    return validation;
  }

  /**
   * 検証成功
   */
  passValidation(validationId: string, recommendation?: string): SecurityValidation | null {
    const validation = this.validations.get(validationId);
    if (!validation) return null;

    validation.status = 'passed';
    validation.completedAt = Date.now();
    if (recommendation) {
      validation.recommendation = recommendation;
    }
    return validation;
  }

  /**
   * 検証失敗
   */
  failValidation(validationId: string, errorMessage: string, recommendation?: string): SecurityValidation | null {
    const validation = this.validations.get(validationId);
    if (!validation) return null;

    validation.status = 'failed';
    validation.errorMessage = errorMessage;
    validation.completedAt = Date.now();
    if (recommendation) {
      validation.recommendation = recommendation;
    }
    return validation;
  }

  /**
   * 検証警告
   */
  warnValidation(validationId: string, errorMessage: string, recommendation?: string): SecurityValidation | null {
    const validation = this.validations.get(validationId);
    if (!validation) return null;

    validation.status = 'warning';
    validation.errorMessage = errorMessage;
    validation.completedAt = Date.now();
    if (recommendation) {
      validation.recommendation = recommendation;
    }
    return validation;
  }

  /**
   * 検証取得
   */
  getValidation(validationId: string): SecurityValidation | null {
    return this.validations.get(validationId) || null;
  }

  /**
   * チェック別検証取得
   */
  getValidationsByCheckType(checkType: SecurityCheck): SecurityValidation[] {
    return Array.from(this.validations.values()).filter((v) => v.checkType === checkType);
  }

  /**
   * 失敗した検証取得
   */
  getFailedValidations(): SecurityValidation[] {
    return Array.from(this.validations.values()).filter((v) => v.status === 'failed');
  }

  /**
   * 警告検証取得
   */
  getWarningValidations(): SecurityValidation[] {
    return Array.from(this.validations.values()).filter((v) => v.status === 'warning');
  }

  /**
   * セキュリティ検証統計
   */
  getSecurityStatistics(): {
    totalValidations: number;
    passedValidations: number;
    failedValidations: number;
    warningValidations: number;
    criticalIssues: number;
    highIssues: number;
    successRate: number;
    isSecure: boolean;
  } {
    const validationArray = Array.from(this.validations.values());
    const passedValidations = validationArray.filter((v) => v.status === 'passed').length;
    const failedValidations = validationArray.filter((v) => v.status === 'failed').length;
    const warningValidations = validationArray.filter((v) => v.status === 'warning').length;
    const totalValidations = validationArray.length;

    const criticalIssues = validationArray.filter((v) => v.severity === 'critical' && v.status === 'failed').length;
    const highIssues = validationArray.filter((v) => v.severity === 'high' && v.status === 'failed').length;

    const successRate = totalValidations > 0 ? (passedValidations / totalValidations) * 100 : 0;
    const isSecure = failedValidations === 0 && criticalIssues === 0;

    return {
      totalValidations,
      passedValidations,
      failedValidations,
      warningValidations,
      criticalIssues,
      highIssues,
      successRate,
      isSecure,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.validations.clear();
  }
}

export const securityValidationService = SecurityValidationService.getInstance();
export default securityValidationService;
