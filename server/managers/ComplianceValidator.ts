/**
 * ComplianceValidator - コンプライアンス検証
 * 
 * 機能:
 * - コンプライアンス検証
 * - ルール検証
 * - データ検証
 * - 検証結果レポート
 */

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  validator: (data: any) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationResult {
  ruleId: string;
  passed: boolean;
  message: string;
  timestamp: number;
}

export interface ValidationReport {
  reportId: string;
  userId: number;
  timestamp: number;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  passRate: number;
  results: ValidationResult[];
  summary: string;
}

export class ComplianceValidator {
  private static instance: ComplianceValidator;
  private rules: Map<string, ValidationRule> = new Map();
  private results: Map<number, ValidationResult[]> = new Map();
  private ruleCounter: number = 0;
  private reportCounter: number = 0;

  private constructor() {}

  static getInstance(): ComplianceValidator {
    if (!ComplianceValidator.instance) {
      ComplianceValidator.instance = new ComplianceValidator();
    }
    return ComplianceValidator.instance;
  }

  /**
   * ルール追加
   */
  addRule(
    name: string,
    description: string,
    validator: (data: any) => boolean,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): ValidationRule {
    const ruleId = `rule_${++this.ruleCounter}_${Date.now()}`;

    const rule: ValidationRule = {
      id: ruleId,
      name,
      description,
      validator,
      severity,
    };

    this.rules.set(ruleId, rule);
    return rule;
  }

  /**
   * ルール取得
   */
  getRule(ruleId: string): ValidationRule | null {
    return this.rules.get(ruleId) || null;
  }

  /**
   * すべてのルール取得
   */
  getAllRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 検証実行
   */
  validate(userId: number, data: any): ValidationResult[] {
    const results: ValidationResult[] = [];

    this.rules.forEach((rule: ValidationRule) => {
      try {
        const passed = rule.validator(data);
        const result: ValidationResult = {
          ruleId: rule.id,
          passed,
          message: passed ? `${rule.name}は合格しました` : `${rule.name}は不合格です`,
          timestamp: Date.now(),
        };
        results.push(result);
      } catch (error) {
        const result: ValidationResult = {
          ruleId: rule.id,
          passed: false,
          message: `${rule.name}の検証中にエラーが発生しました`,
          timestamp: Date.now(),
        };
        results.push(result);
      }
    });

    if (!this.results.has(userId)) {
      this.results.set(userId, []);
    }

    const userResults = this.results.get(userId);
    if (userResults) {
      userResults.push(...results);
    }

    return results;
  }

  /**
   * ユーザー検証結果取得
   */
  getUserResults(userId: number): ValidationResult[] {
    return this.results.get(userId) || [];
  }

  /**
   * 検証レポート生成
   */
  generateValidationReport(userId: number): ValidationReport {
    const reportId = `report_${++this.reportCounter}_${Date.now()}`;
    const results = this.getUserResults(userId);

    const totalRules = this.rules.size;
    const passedRules = results.filter((r: ValidationResult) => r.passed).length;
    const failedRules = results.filter((r: ValidationResult) => !r.passed).length;
    const passRate = totalRules > 0 ? (passedRules / totalRules) * 100 : 0;

    let summary = '';
    if (passRate === 100) {
      summary = 'すべてのルールが合格しました';
    } else if (passRate >= 80) {
      summary = 'ほとんどのルールが合格しました';
    } else if (passRate >= 60) {
      summary = 'いくつかのルールが不合格です';
    } else {
      summary = '多くのルールが不合格です';
    }

    return {
      reportId,
      userId,
      timestamp: Date.now(),
      totalRules,
      passedRules,
      failedRules,
      passRate,
      results,
      summary,
    };
  }

  /**
   * 検証統計
   */
  getValidationStats(userId: number): {
    totalValidations: number;
    passRate: number;
    failureRate: number;
    criticalFailures: number;
  } {
    const results = this.getUserResults(userId);
    const totalValidations = results.length;
    const passedCount = results.filter((r: ValidationResult) => r.passed).length;
    const failedCount = results.filter((r: ValidationResult) => !r.passed).length;

    let criticalFailures = 0;
    results.forEach((result: ValidationResult) => {
      if (!result.passed) {
        const rule = this.getRule(result.ruleId);
        if (rule && rule.severity === 'critical') {
          criticalFailures++;
        }
      }
    });

    const passRate = totalValidations > 0 ? (passedCount / totalValidations) * 100 : 0;
    const failureRate = totalValidations > 0 ? (failedCount / totalValidations) * 100 : 0;

    return {
      totalValidations,
      passRate,
      failureRate,
      criticalFailures,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(userId?: number): void {
    if (userId) {
      this.results.delete(userId);
    } else {
      this.rules.clear();
      this.results.clear();
    }
  }
}

export const complianceValidator = ComplianceValidator.getInstance();
export default complianceValidator;
