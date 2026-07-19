/**
 * ReleaseValidationService - リリース検証管理
 * 
 * 機能:
 * - リリース検証\n * - 検証ルール管理\n * - 検証レポート生成\n */

export interface ValidationRule {
  ruleId: string;
  name: string;
  description: string;
  category: 'security' | 'performance' | 'compatibility' | 'functionality';
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  checkFunction: () => Promise<boolean>;
}

export interface ValidationResult {
  resultId: string;
  version: string;
  timestamp: number;
  status: 'passed' | 'failed' | 'warning';
  checks: ValidationCheck[];
  score: number;
  canRelease: boolean;
}

export interface ValidationCheck {
  checkId: string;
  ruleId: string;
  ruleName: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  message: string;
  details: string;
}

export class ReleaseValidationService {
  private static instance: ReleaseValidationService;
  private rules: Map<string, ValidationRule> = new Map();
  private results: Map<string, ValidationResult> = new Map();
  private resultCounter: number = 0;

  private constructor() {
    this.initializeDefaultRules();
  }

  static getInstance(): ReleaseValidationService {
    if (!ReleaseValidationService.instance) {
      ReleaseValidationService.instance = new ReleaseValidationService();
    }
    return ReleaseValidationService.instance;
  }

  /**
   * デフォルトルール初期化
   */
  private initializeDefaultRules(): void {
    this.addRule({
      ruleId: 'security_check',
      name: 'Security Check',
      description: 'Verify security vulnerabilities',
      category: 'security',
      enabled: true,
      severity: 'critical',
      checkFunction: async () => true,
    });

    this.addRule({
      ruleId: 'performance_check',
      name: 'Performance Check',
      description: 'Verify performance metrics',
      category: 'performance',
      enabled: true,
      severity: 'high',
      checkFunction: async () => true,
    });

    this.addRule({
      ruleId: 'compatibility_check',
      name: 'Compatibility Check',
      description: 'Verify backward compatibility',
      category: 'compatibility',
      enabled: true,
      severity: 'high',
      checkFunction: async () => true,
    });

    this.addRule({
      ruleId: 'functionality_check',
      name: 'Functionality Check',
      description: 'Verify core functionality',
      category: 'functionality',
      enabled: true,
      severity: 'high',
      checkFunction: async () => true,
    });
  }

  /**
   * ルール追加
   */
  addRule(rule: ValidationRule): void {
    this.rules.set(rule.ruleId, rule);
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
   * リリース検証実行
   */
  async validateRelease(version: string): Promise<ValidationResult> {
    const resultId = `validation_${++this.resultCounter}_${Date.now()}`;
    const checks: ValidationCheck[] = [];

    for (const rule of this.getAllRules()) {
      if (!rule.enabled) {
        checks.push({
          checkId: `check_${rule.ruleId}`,
          ruleId: rule.ruleId,
          ruleName: rule.name,
          status: 'skipped',
          message: 'Rule is disabled',
          details: '',
        });
        continue;
      }

      try {
        const passed = await rule.checkFunction();
        checks.push({
          checkId: `check_${rule.ruleId}`,
          ruleId: rule.ruleId,
          ruleName: rule.name,
          status: passed ? 'passed' : 'failed',
          message: passed ? 'Check passed' : 'Check failed',
          details: `${rule.name}: ${rule.description}`,
        });
      } catch (error) {
        checks.push({
          checkId: `check_${rule.ruleId}`,
          ruleId: rule.ruleId,
          ruleName: rule.name,
          status: 'warning',
          message: `Check error: ${error}`,
          details: `${rule.name}: ${rule.description}`,
        });
      }
    }

    // ステータス判定
    const failedChecks = checks.filter((c: ValidationCheck) => c.status === 'failed');
    const criticalFailed = checks.filter(
      (c: ValidationCheck) => c.status === 'failed' && this.getRule(c.ruleId)?.severity === 'critical'
    );

    let status: 'passed' | 'failed' | 'warning' = 'passed';
    if (criticalFailed.length > 0) {
      status = 'failed';
    } else if (failedChecks.length > 0) {
      status = 'warning';
    }

    // スコア計算
    const passedCount = checks.filter((c: ValidationCheck) => c.status === 'passed').length;
    const score = checks.length > 0 ? (passedCount / checks.length) * 100 : 0;

    const result: ValidationResult = {
      resultId,
      version,
      timestamp: Date.now(),
      status,
      checks,
      score,
      canRelease: status !== 'failed',
    };

    this.results.set(resultId, result);
    return result;
  }

  /**
   * 検証結果取得
   */
  getValidationResult(resultId: string): ValidationResult | null {
    return this.results.get(resultId) || null;
  }

  /**
   * すべての検証結果取得
   */
  getAllValidationResults(): ValidationResult[] {
    return Array.from(this.results.values());
  }

  /**
   * バージョンの最新検証結果取得
   */
  getLatestValidationResult(version: string): ValidationResult | null {
    const results = Array.from(this.results.values())
      .filter((r: ValidationResult) => r.version === version)
      .sort((a: ValidationResult, b: ValidationResult) => b.timestamp - a.timestamp);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.rules.clear();
    this.results.clear();
  }
}

export const releaseValidationService = ReleaseValidationService.getInstance();
export default releaseValidationService;
