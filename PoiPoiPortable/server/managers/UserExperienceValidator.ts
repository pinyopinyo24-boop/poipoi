/**
 * UserExperienceValidator - ユーザーエクスペリエンス検証
 */

export type UXMetric = 'responsiveness' | 'stability' | 'usability' | 'accessibility' | 'performance';
export type UXScore = 'excellent' | 'good' | 'acceptable' | 'poor';

export interface UXValidation {
  validationId: string;
  deviceId: string;
  metric: UXMetric;
  score: UXScore;
  timestamp: number;
  value: number;
  issues?: string[];
}

export class UserExperienceValidator {
  private static instance: UserExperienceValidator;
  private validations: Map<string, UXValidation> = new Map();
  private validationCounter: number = 0;

  private constructor() {}

  static getInstance(): UserExperienceValidator {
    if (!UserExperienceValidator.instance) {
      UserExperienceValidator.instance = new UserExperienceValidator();
    }
    return UserExperienceValidator.instance;
  }

  /**
   * UX検証実行
   */
  validateUX(deviceId: string, metric: UXMetric, value: number, issues?: string[]): UXValidation {
    const validationId = `ux_val_${++this.validationCounter}_${Date.now()}`;

    // スコア判定
    let score: UXScore = 'excellent';
    if (value >= 90) {
      score = 'excellent';
    } else if (value >= 75) {
      score = 'good';
    } else if (value >= 60) {
      score = 'acceptable';
    } else {
      score = 'poor';
    }

    const validation: UXValidation = {
      validationId,
      deviceId,
      metric,
      score,
      timestamp: Date.now(),
      value,
      issues: issues || [],
    };

    this.validations.set(validationId, validation);
    return validation;
  }

  /**
   * 検証取得
   */
  getValidation(validationId: string): UXValidation | null {
    return this.validations.get(validationId) || null;
  }

  /**
   * デバイス別検証取得
   */
  getValidationsByDevice(deviceId: string): UXValidation[] {
    return Array.from(this.validations.values()).filter((v) => v.deviceId === deviceId);
  }

  /**
   * メトリクス別検証取得
   */
  getValidationsByMetric(metric: UXMetric): UXValidation[] {
    return Array.from(this.validations.values()).filter((v) => v.metric === metric);
  }

  /**
   * 優秀な検証取得
   */
  getExcellentValidations(): UXValidation[] {
    return Array.from(this.validations.values()).filter((v) => v.score === 'excellent');
  }

  /**
   * 不良な検証取得
   */
  getPoorValidations(): UXValidation[] {
    return Array.from(this.validations.values()).filter((v) => v.score === 'poor');
  }

  /**
   * UX統計
   */
  getUXStatistics(): {
    totalValidations: number;
    excellentValidations: number;
    goodValidations: number;
    acceptableValidations: number;
    poorValidations: number;
    averageScore: number;
    responsivenesScore: number;
    stabilityScore: number;
    usabilityScore: number;
    accessibilityScore: number;
    performanceScore: number;
  } {
    const validationArray = Array.from(this.validations.values());

    let totalScore = 0;
    let responsivenesCount = 0;
    let responsivenesTotal = 0;
    let stabilityCount = 0;
    let stabilityTotal = 0;
    let usabilityCount = 0;
    let usabilityTotal = 0;
    let accessibilityCount = 0;
    let accessibilityTotal = 0;
    let performanceCount = 0;
    let performanceTotal = 0;

    validationArray.forEach((v) => {
      totalScore += v.value;

      if (v.metric === 'responsiveness') {
        responsivenesCount++;
        responsivenesTotal += v.value;
      } else if (v.metric === 'stability') {
        stabilityCount++;
        stabilityTotal += v.value;
      } else if (v.metric === 'usability') {
        usabilityCount++;
        usabilityTotal += v.value;
      } else if (v.metric === 'accessibility') {
        accessibilityCount++;
        accessibilityTotal += v.value;
      } else if (v.metric === 'performance') {
        performanceCount++;
        performanceTotal += v.value;
      }
    });

    return {
      totalValidations: validationArray.length,
      excellentValidations: validationArray.filter((v) => v.score === 'excellent').length,
      goodValidations: validationArray.filter((v) => v.score === 'good').length,
      acceptableValidations: validationArray.filter((v) => v.score === 'acceptable').length,
      poorValidations: validationArray.filter((v) => v.score === 'poor').length,
      averageScore: validationArray.length > 0 ? totalScore / validationArray.length : 0,
      responsivenesScore: responsivenesCount > 0 ? responsivenesTotal / responsivenesCount : 0,
      stabilityScore: stabilityCount > 0 ? stabilityTotal / stabilityCount : 0,
      usabilityScore: usabilityCount > 0 ? usabilityTotal / usabilityCount : 0,
      accessibilityScore: accessibilityCount > 0 ? accessibilityTotal / accessibilityCount : 0,
      performanceScore: performanceCount > 0 ? performanceTotal / performanceCount : 0,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.validations.clear();
  }
}

export const userExperienceValidator = UserExperienceValidator.getInstance();
export default userExperienceValidator;
