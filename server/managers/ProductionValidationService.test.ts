import { describe, it, expect, beforeEach } from 'vitest';

/**
 * ProductionValidationService
 * 本番環境検証サービス
 */
export interface ValidationRule {
  ruleId: string;
  name: string;
  category: 'performance' | 'stability' | 'security' | 'compatibility';
  threshold: number;
  critical: boolean;
}

export interface ValidationResult {
  resultId: string;
  ruleId: string;
  timestamp: Date;
  passed: boolean;
  actualValue: number;
  threshold: number;
  details: string;
}

export interface ProductionValidation {
  validationId: string;
  version: string;
  platform: 'android' | 'pc' | 'both';
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  results: ValidationResult[];
  overallScore: number;
  criticalFailures: number;
}

export class ProductionValidationService {
  private rules: Map<string, ValidationRule> = new Map();
  private validations: Map<string, ProductionValidation> = new Map();
  private validationHistory: ProductionValidation[] = [];

  /**
   * 検証ルールを追加
   */
  addValidationRule(
    name: string,
    category: ValidationRule['category'],
    threshold: number,
    critical: boolean = false
  ): ValidationRule {
    const ruleId = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const rule: ValidationRule = {
      ruleId,
      name,
      category,
      threshold,
      critical,
    };

    this.rules.set(ruleId, rule);
    return rule;
  }

  /**
   * 本番環境検証を開始
   */
  startValidation(version: string, platform: 'android' | 'pc' | 'both'): ProductionValidation {
    const validationId = `val-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const validation: ProductionValidation = {
      validationId,
      version,
      platform,
      startTime: new Date(),
      status: 'running',
      results: [],
      overallScore: 0,
      criticalFailures: 0,
    };

    this.validations.set(validationId, validation);
    return validation;
  }

  /**
   * 検証結果を記録
   */
  recordValidationResult(
    validationId: string,
    ruleId: string,
    actualValue: number,
    details: string
  ): ValidationResult {
    const validation = this.validations.get(validationId);
    if (!validation) {
      throw new Error('Validation not found');
    }

    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error('Rule not found');
    }

    const passed = actualValue >= rule.threshold;
    const result: ValidationResult = {
      resultId: `result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId,
      timestamp: new Date(),
      passed,
      actualValue,
      threshold: rule.threshold,
      details,
    };

    validation.results.push(result);

    // クリティカル失敗をカウント
    if (!passed && rule.critical) {
      validation.criticalFailures++;
    }

    return result;
  }

  /**
   * 検証を完了
   */
  completeValidation(validationId: string): boolean {
    const validation = this.validations.get(validationId);
    if (!validation) {
      throw new Error('Validation not found');
    }

    validation.endTime = new Date();

    // 全体スコアを計算
    if (validation.results.length > 0) {
      const passedCount = validation.results.filter((r) => r.passed).length;
      validation.overallScore = (passedCount / validation.results.length) * 100;
    }

    // ステータスを判定
    if (validation.criticalFailures > 0) {
      validation.status = 'failed';
    } else {
      validation.status = 'completed';
    }

    this.validationHistory.push(validation);
    return validation.status === 'completed';
  }

  /**
   * 検証情報を取得
   */
  getValidation(validationId: string): ProductionValidation | undefined {
    return this.validations.get(validationId);
  }

  /**
   * 検証履歴を取得
   */
  getValidationHistory(): ProductionValidation[] {
    return [...this.validationHistory];
  }

  /**
   * 最新の検証を取得
   */
  getLatestValidation(): ProductionValidation | undefined {
    return this.validationHistory[this.validationHistory.length - 1];
  }

  /**
   * バージョン別検証を取得
   */
  getValidationByVersion(version: string): ProductionValidation[] {
    return this.validationHistory.filter((v) => v.version === version);
  }

  /**
   * プラットフォーム別検証を取得
   */
  getValidationByPlatform(platform: 'android' | 'pc' | 'both'): ProductionValidation[] {
    return this.validationHistory.filter((v) => v.platform === platform);
  }

  /**
   * 検証統計を計算
   */
  calculateValidationStats(): {
    totalValidations: number;
    passedValidations: number;
    failedValidations: number;
    averageScore: number;
    successRate: number;
  } {
    const total = this.validationHistory.length;
    const passed = this.validationHistory.filter((v) => v.status === 'completed').length;
    const failed = this.validationHistory.filter((v) => v.status === 'failed').length;
    const averageScore = total > 0 ? this.validationHistory.reduce((sum, v) => sum + v.overallScore, 0) / total : 0;
    const successRate = total > 0 ? (passed / total) * 100 : 0;

    return {
      totalValidations: total,
      passedValidations: passed,
      failedValidations: failed,
      averageScore,
      successRate,
    };
  }

  /**
   * 検証レポートを生成
   */
  generateValidationReport(validationId: string): string {
    const validation = this.validations.get(validationId);
    if (!validation) {
      throw new Error('Validation not found');
    }

    const duration = validation.endTime
      ? (validation.endTime.getTime() - validation.startTime.getTime()) / 1000
      : 'N/A';

    const report = `
=== Production Validation Report ===
Validation ID: ${validation.validationId}
Version: ${validation.version}
Platform: ${validation.platform}
Status: ${validation.status}
Duration: ${duration}s
Overall Score: ${validation.overallScore.toFixed(2)}%
Critical Failures: ${validation.criticalFailures}

Results:
${validation.results
  .map(
    (r) => `
  Rule: ${this.rules.get(r.ruleId)?.name || 'Unknown'}
  Status: ${r.passed ? 'PASS' : 'FAIL'}
  Value: ${r.actualValue} (Threshold: ${r.threshold})
  Details: ${r.details}
`
  )
  .join('')}
    `;

    return report.trim();
  }

  /**
   * 検証ルール一覧を取得
   */
  getAllRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * カテゴリ別ルールを取得
   */
  getRulesByCategory(category: ValidationRule['category']): ValidationRule[] {
    return Array.from(this.rules.values()).filter((r) => r.category === category);
  }

  /**
   * 検証結果をフィルタ
   */
  getFailedResults(validationId: string): ValidationResult[] {
    const validation = this.validations.get(validationId);
    if (!validation) {
      throw new Error('Validation not found');
    }

    return validation.results.filter((r) => !r.passed);
  }

  /**
   * 検証結果をフィルタ (成功)
   */
  getPassedResults(validationId: string): ValidationResult[] {
    const validation = this.validations.get(validationId);
    if (!validation) {
      throw new Error('Validation not found');
    }

    return validation.results.filter((r) => r.passed);
  }
}

// ============ TESTS ============

describe('ProductionValidationService', () => {
  let service: ProductionValidationService;

  beforeEach(() => {
    service = new ProductionValidationService();
  });

  describe('addValidationRule', () => {
    it('should add validation rule', () => {
      const rule = service.addValidationRule('Response Time', 'performance', 200, true);
      expect(rule.name).toBe('Response Time');
      expect(rule.category).toBe('performance');
      expect(rule.critical).toBe(true);
    });

    it('should generate unique rule IDs', () => {
      const rule1 = service.addValidationRule('Rule 1', 'performance', 100);
      const rule2 = service.addValidationRule('Rule 2', 'performance', 100);
      expect(rule1.ruleId).not.toBe(rule2.ruleId);
    });
  });

  describe('startValidation', () => {
    it('should start validation', () => {
      const validation = service.startValidation('1.0.0', 'both');
      expect(validation.status).toBe('running');
      expect(validation.version).toBe('1.0.0');
      expect(validation.platform).toBe('both');
    });

    it('should set start time', () => {
      const before = new Date();
      const validation = service.startValidation('1.0.0', 'both');
      const after = new Date();
      expect(validation.startTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(validation.startTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('recordValidationResult', () => {
    it('should record validation result', () => {
      const rule = service.addValidationRule('Response Time', 'performance', 100);
      const validation = service.startValidation('1.0.0', 'both');

      const result = service.recordValidationResult(validation.validationId, rule.ruleId, 150, 'Response time OK');
      expect(result.passed).toBe(true);
      expect(result.actualValue).toBe(150);
    });

    it('should mark result as failed when below threshold', () => {
      const rule = service.addValidationRule('Response Time', 'performance', 200);
      const validation = service.startValidation('1.0.0', 'both');

      const result = service.recordValidationResult(validation.validationId, rule.ruleId, 150, 'Response time too high');
      expect(result.passed).toBe(false);
    });

    it('should count critical failures', () => {
      const rule = service.addValidationRule('Critical Check', 'security', 100, true);
      const validation = service.startValidation('1.0.0', 'both');

      service.recordValidationResult(validation.validationId, rule.ruleId, 50, 'Critical failure');
      const updated = service.getValidation(validation.validationId);
      expect(updated?.criticalFailures).toBe(1);
    });

    it('should throw error for non-existent validation', () => {
      const rule = service.addValidationRule('Rule', 'performance', 100);
      expect(() => service.recordValidationResult('non-existent', rule.ruleId, 100, 'Details')).toThrow();
    });

    it('should throw error for non-existent rule', () => {
      const validation = service.startValidation('1.0.0', 'both');
      expect(() => service.recordValidationResult(validation.validationId, 'non-existent', 100, 'Details')).toThrow();
    });
  });

  describe('completeValidation', () => {
    it('should complete validation', () => {
      const rule = service.addValidationRule('Rule', 'performance', 100);
      const validation = service.startValidation('1.0.0', 'both');
      service.recordValidationResult(validation.validationId, rule.ruleId, 150, 'Details');

      const result = service.completeValidation(validation.validationId);
      expect(result).toBe(true);
    });

    it('should set end time', () => {
      const rule = service.addValidationRule('Rule', 'performance', 100);
      const validation = service.startValidation('1.0.0', 'both');
      service.recordValidationResult(validation.validationId, rule.ruleId, 150, 'Details');

      service.completeValidation(validation.validationId);
      const updated = service.getValidation(validation.validationId);
      expect(updated?.endTime).toBeDefined();
    });

    it('should calculate overall score', () => {
      const rule1 = service.addValidationRule('Rule 1', 'performance', 100);
      const rule2 = service.addValidationRule('Rule 2', 'performance', 100);
      const validation = service.startValidation('1.0.0', 'both');

      service.recordValidationResult(validation.validationId, rule1.ruleId, 150, 'Pass');
      service.recordValidationResult(validation.validationId, rule2.ruleId, 50, 'Fail');

      service.completeValidation(validation.validationId);
      const updated = service.getValidation(validation.validationId);
      expect(updated?.overallScore).toBe(50);
    });

    it('should set status to completed for passing validation', () => {
      const rule = service.addValidationRule('Rule', 'performance', 100);
      const validation = service.startValidation('1.0.0', 'both');
      service.recordValidationResult(validation.validationId, rule.ruleId, 150, 'Pass');

      service.completeValidation(validation.validationId);
      const updated = service.getValidation(validation.validationId);
      expect(updated?.status).toBe('completed');
    });

    it('should set status to failed for critical failures', () => {
      const rule = service.addValidationRule('Critical', 'security', 100, true);
      const validation = service.startValidation('1.0.0', 'both');
      service.recordValidationResult(validation.validationId, rule.ruleId, 50, 'Critical failure');

      service.completeValidation(validation.validationId);
      const updated = service.getValidation(validation.validationId);
      expect(updated?.status).toBe('failed');
    });
  });

  describe('getValidation', () => {
    it('should return validation', () => {
      const validation = service.startValidation('1.0.0', 'both');
      const retrieved = service.getValidation(validation.validationId);
      expect(retrieved).toEqual(validation);
    });

    it('should return undefined for non-existent validation', () => {
      const retrieved = service.getValidation('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getValidationHistory', () => {
    it('should return empty array initially', () => {
      const history = service.getValidationHistory();
      expect(history).toHaveLength(0);
    });

    it('should return completed validations', () => {
      const rule = service.addValidationRule('Rule', 'performance', 100);
      const validation = service.startValidation('1.0.0', 'both');
      service.recordValidationResult(validation.validationId, rule.ruleId, 150, 'Pass');
      service.completeValidation(validation.validationId);

      const history = service.getValidationHistory();
      expect(history).toHaveLength(1);
    });
  });

  describe('getLatestValidation', () => {
    it('should return latest validation', () => {
      const rule = service.addValidationRule('Rule', 'performance', 100);
      const validation1 = service.startValidation('1.0.0', 'both');
      service.recordValidationResult(validation1.validationId, rule.ruleId, 150, 'Pass');
      service.completeValidation(validation1.validationId);

      const validation2 = service.startValidation('1.0.1', 'both');
      service.recordValidationResult(validation2.validationId, rule.ruleId, 150, 'Pass');
      service.completeValidation(validation2.validationId);

      const latest = service.getLatestValidation();
      expect(latest?.version).toBe('1.0.1');
    });
  });

  describe('getValidationByVersion', () => {
    it('should return validations for specific version', () => {
      const rule = service.addValidationRule('Rule', 'performance', 100);
      const validation1 = service.startValidation('1.0.0', 'both');
      service.recordValidationResult(validation1.validationId, rule.ruleId, 150, 'Pass');
      service.completeValidation(validation1.validationId);

      const validation2 = service.startValidation('1.0.1', 'both');
      service.recordValidationResult(validation2.validationId, rule.ruleId, 150, 'Pass');
      service.completeValidation(validation2.validationId);

      const v1 = service.getValidationByVersion('1.0.0');
      expect(v1).toHaveLength(1);
      expect(v1[0].version).toBe('1.0.0');
    });
  });

  describe('getValidationByPlatform', () => {
    it('should return validations for specific platform', () => {
      const rule = service.addValidationRule('Rule', 'performance', 100);
      const validation1 = service.startValidation('1.0.0', 'android');
      service.recordValidationResult(validation1.validationId, rule.ruleId, 150, 'Pass');
      service.completeValidation(validation1.validationId);

      const validation2 = service.startValidation('1.0.0', 'pc');
      service.recordValidationResult(validation2.validationId, rule.ruleId, 150, 'Pass');
      service.completeValidation(validation2.validationId);

      const android = service.getValidationByPlatform('android');
      expect(android).toHaveLength(1);
      expect(android[0].platform).toBe('android');
    });
  });

  describe('calculateValidationStats', () => {
    it('should calculate statistics', () => {
      const rule = service.addValidationRule('Rule', 'performance', 100);
      const validation = service.startValidation('1.0.0', 'both');
      service.recordValidationResult(validation.validationId, rule.ruleId, 150, 'Pass');
      service.completeValidation(validation.validationId);

      const stats = service.calculateValidationStats();
      expect(stats.totalValidations).toBe(1);
      expect(stats.passedValidations).toBe(1);
      expect(stats.failedValidations).toBe(0);
      expect(stats.successRate).toBe(100);
    });

    it('should calculate average score', () => {
      const rule = service.addValidationRule('Rule', 'performance', 100);
      const validation1 = service.startValidation('1.0.0', 'both');
      service.recordValidationResult(validation1.validationId, rule.ruleId, 150, 'Pass');
      service.completeValidation(validation1.validationId);

      const validation2 = service.startValidation('1.0.1', 'both');
      service.recordValidationResult(validation2.validationId, rule.ruleId, 50, 'Fail');
      service.completeValidation(validation2.validationId);

      const stats = service.calculateValidationStats();
      expect(stats.averageScore).toBe(50);
    });
  });

  describe('generateValidationReport', () => {
    it('should generate validation report', () => {
      const rule = service.addValidationRule('Response Time', 'performance', 200);
      const validation = service.startValidation('1.0.0', 'both');
      service.recordValidationResult(validation.validationId, rule.ruleId, 150, 'Response time OK');
      service.completeValidation(validation.validationId);

      const report = service.generateValidationReport(validation.validationId);
      expect(report).toContain('Production Validation Report');
      expect(report).toContain('1.0.0');
      expect(report).toContain('Response Time');
    });
  });

  describe('getAllRules', () => {
    it('should return all rules', () => {
      service.addValidationRule('Rule 1', 'performance', 100);
      service.addValidationRule('Rule 2', 'security', 100);

      const rules = service.getAllRules();
      expect(rules).toHaveLength(2);
    });
  });

  describe('getRulesByCategory', () => {
    it('should return rules by category', () => {
      service.addValidationRule('Rule 1', 'performance', 100);
      service.addValidationRule('Rule 2', 'performance', 100);
      service.addValidationRule('Rule 3', 'security', 100);

      const performanceRules = service.getRulesByCategory('performance');
      expect(performanceRules).toHaveLength(2);
    });
  });

  describe('getFailedResults', () => {
    it('should return only failed results', () => {
      const rule1 = service.addValidationRule('Rule 1', 'performance', 100);
      const rule2 = service.addValidationRule('Rule 2', 'performance', 100);
      const validation = service.startValidation('1.0.0', 'both');

      service.recordValidationResult(validation.validationId, rule1.ruleId, 150, 'Pass');
      service.recordValidationResult(validation.validationId, rule2.ruleId, 50, 'Fail');

      const failed = service.getFailedResults(validation.validationId);
      expect(failed).toHaveLength(1);
      expect(failed[0].passed).toBe(false);
    });
  });

  describe('getPassedResults', () => {
    it('should return only passed results', () => {
      const rule1 = service.addValidationRule('Rule 1', 'performance', 100);
      const rule2 = service.addValidationRule('Rule 2', 'performance', 100);
      const validation = service.startValidation('1.0.0', 'both');

      service.recordValidationResult(validation.validationId, rule1.ruleId, 150, 'Pass');
      service.recordValidationResult(validation.validationId, rule2.ruleId, 50, 'Fail');

      const passed = service.getPassedResults(validation.validationId);
      expect(passed).toHaveLength(1);
      expect(passed[0].passed).toBe(true);
    });
  });

  describe('Multiple validations workflow', () => {
    it('should handle multiple validations for different versions', () => {
      const rule = service.addValidationRule('Rule', 'performance', 100);

      const v1 = service.startValidation('1.0.0', 'both');
      service.recordValidationResult(v1.validationId, rule.ruleId, 150, 'Pass');
      service.completeValidation(v1.validationId);

      const v2 = service.startValidation('1.0.1', 'both');
      service.recordValidationResult(v2.validationId, rule.ruleId, 150, 'Pass');
      service.completeValidation(v2.validationId);

      const history = service.getValidationHistory();
      expect(history).toHaveLength(2);
      expect(history[0].version).toBe('1.0.0');
      expect(history[1].version).toBe('1.0.1');
    });
  });

  describe('Platform-specific validations', () => {
    it('should validate android platform', () => {
      const rule = service.addValidationRule('Android Rule', 'compatibility', 100);
      const validation = service.startValidation('1.0.0', 'android');
      service.recordValidationResult(validation.validationId, rule.ruleId, 150, 'Android OK');
      service.completeValidation(validation.validationId);

      const android = service.getValidationByPlatform('android');
      expect(android).toHaveLength(1);
      expect(android[0].status).toBe('completed');
    });

    it('should validate pc platform', () => {
      const rule = service.addValidationRule('PC Rule', 'compatibility', 100);
      const validation = service.startValidation('1.0.0', 'pc');
      service.recordValidationResult(validation.validationId, rule.ruleId, 150, 'PC OK');
      service.completeValidation(validation.validationId);

      const pc = service.getValidationByPlatform('pc');
      expect(pc).toHaveLength(1);
      expect(pc[0].status).toBe('completed');
    });
  });
});
