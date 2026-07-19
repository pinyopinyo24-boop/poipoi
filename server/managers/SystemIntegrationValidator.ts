/**
 * SystemIntegrationValidator - システム統合検証
 */

export type ComponentType = 'chat' | 'ai' | 'database' | 'storage' | 'api' | 'auth' | 'notification';
export type ValidationStatus = 'pending' | 'validating' | 'passed' | 'failed' | 'warning';

export interface ComponentValidation {
  componentId: string;
  componentType: ComponentType;
  name: string;
  status: ValidationStatus;
  checks: ValidationCheck[];
  startedAt?: number;
  completedAt?: number;
  errorMessage?: string;
}

export interface ValidationCheck {
  checkId: string;
  name: string;
  status: ValidationStatus;
  message?: string;
}

export class SystemIntegrationValidator {
  private static instance: SystemIntegrationValidator;
  private validations: Map<string, ComponentValidation> = new Map();
  private validationCounter: number = 0;
  private checkCounter: number = 0;

  private constructor() {}

  static getInstance(): SystemIntegrationValidator {
    if (!SystemIntegrationValidator.instance) {
      SystemIntegrationValidator.instance = new SystemIntegrationValidator();
    }
    return SystemIntegrationValidator.instance;
  }

  /**
   * コンポーネント検証開始
   */
  startComponentValidation(componentType: ComponentType, name: string): ComponentValidation {
    const componentId = `comp_${++this.validationCounter}_${Date.now()}`;

    const validation: ComponentValidation = {
      componentId,
      componentType,
      name,
      status: 'validating',
      checks: [],
      startedAt: Date.now(),
    };

    this.validations.set(componentId, validation);
    return validation;
  }

  /**
   * チェック追加
   */
  addCheck(componentId: string, checkName: string): ValidationCheck {
    const validation = this.validations.get(componentId);
    if (!validation) {
      throw new Error(`Component ${componentId} not found`);
    }

    const checkId = `check_${++this.checkCounter}_${Date.now()}`;
    const check: ValidationCheck = {
      checkId,
      name: checkName,
      status: 'pending',
    };

    validation.checks.push(check);
    return check;
  }

  /**
   * チェック成功
   */
  passCheck(componentId: string, checkId: string, message?: string): ValidationCheck | null {
    const validation = this.validations.get(componentId);
    if (!validation) return null;

    const check = validation.checks.find((c) => c.checkId === checkId);
    if (!check) return null;

    check.status = 'passed';
    check.message = message;
    return check;
  }

  /**
   * チェック失敗
   */
  failCheck(componentId: string, checkId: string, message: string): ValidationCheck | null {
    const validation = this.validations.get(componentId);
    if (!validation) return null;

    const check = validation.checks.find((c) => c.checkId === checkId);
    if (!check) return null;

    check.status = 'failed';
    check.message = message;
    return check;
  }

  /**
   * コンポーネント検証完了
   */
  completeComponentValidation(componentId: string, success: boolean, errorMessage?: string): ComponentValidation | null {
    const validation = this.validations.get(componentId);
    if (!validation) return null;

    validation.status = success ? 'passed' : 'failed';
    validation.completedAt = Date.now();
    if (errorMessage) {
      validation.errorMessage = errorMessage;
    }

    return validation;
  }

  /**
   * コンポーネント検証取得
   */
  getComponentValidation(componentId: string): ComponentValidation | null {
    return this.validations.get(componentId) || null;
  }

  /**
   * 全体検証結果
   */
  getOverallValidationResult(): {
    totalComponents: number;
    passedComponents: number;
    failedComponents: number;
    validatingComponents: number;
    successRate: number;
    allComponentsPassed: boolean;
  } {
    const validationArray = Array.from(this.validations.values());
    const passedComponents = validationArray.filter((v) => v.status === 'passed').length;
    const failedComponents = validationArray.filter((v) => v.status === 'failed').length;
    const validatingComponents = validationArray.filter((v) => v.status === 'validating').length;
    const totalComponents = validationArray.length;

    const successRate = totalComponents > 0 ? (passedComponents / totalComponents) * 100 : 0;

    return {
      totalComponents,
      passedComponents,
      failedComponents,
      validatingComponents,
      successRate,
      allComponentsPassed: failedComponents === 0 && validatingComponents === 0,
    };
  }

  /**
   * コンポーネント別検証結果
   */
  getValidationsByType(componentType: ComponentType): ComponentValidation[] {
    return Array.from(this.validations.values()).filter((v) => v.componentType === componentType);
  }

  /**
   * 失敗したコンポーネント取得
   */
  getFailedComponents(): ComponentValidation[] {
    return Array.from(this.validations.values()).filter((v) => v.status === 'failed');
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.validations.clear();
  }
}

export const systemIntegrationValidator = SystemIntegrationValidator.getInstance();
export default systemIntegrationValidator;
