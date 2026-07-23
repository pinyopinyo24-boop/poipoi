/**
 * ProductionValidator
 * 本番環境検証・デプロイ前チェック
 */

export interface ValidationRule {
  ruleId: string;
  name: string;
  description: string;
  category: 'code' | 'database' | 'api' | 'security' | 'performance' | 'configuration';
  severity: 'info' | 'warning' | 'error' | 'critical';
  checkFunction: (context: any) => boolean;
}

export interface ValidationResult {
  resultId: string;
  ruleId: string;
  timestamp: number;
  passed: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface ValidationReport {
  reportId: string;
  timestamp: number;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warningRules: number;
  results: ValidationResult[];
  status: 'valid' | 'invalid' | 'warning';
  canDeploy: boolean;
  issues: Array<{
    severity: string;
    message: string;
  }>;
}

export class ProductionValidator {
  private rules: Map<string, ValidationRule> = new Map();
  private results: Map<string, ValidationResult> = new Map();
  private reports: Map<string, ValidationReport> = new Map();
  private rulesByCategory: Map<string, string[]> = new Map();
  private resultsByRule: Map<string, string[]> = new Map();

  /**
   * 検証ルールを登録
   */
  registerRule(
    name: string,
    description: string,
    category: ValidationRule['category'],
    severity: ValidationRule['severity'],
    checkFunction: (context: any) => boolean
  ): ValidationRule {
    const ruleId = `VAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const rule: ValidationRule = {
      ruleId,
      name,
      description,
      category,
      severity,
      checkFunction,
    };

    this.rules.set(ruleId, rule);

    if (!this.rulesByCategory.has(category)) {
      this.rulesByCategory.set(category, []);
    }
    this.rulesByCategory.get(category)!.push(ruleId);

    if (!this.resultsByRule.has(ruleId)) {
      this.resultsByRule.set(ruleId, []);
    }

    return rule;
  }

  /**
   * ルールを取得
   */
  getRule(ruleId: string): ValidationRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * カテゴリ別ルールを取得
   */
  getRulesByCategory(category: ValidationRule['category']): ValidationRule[] {
    const ids = this.rulesByCategory.get(category) || [];
    return ids
      .map(id => this.rules.get(id))
      .filter((r): r is ValidationRule => r !== undefined);
  }

  /**
   * ルールを実行
   */
  executeRule(ruleId: string, context: any): ValidationResult | null {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;

    const resultId = `RES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let passed = false;
    let message = '';

    try {
      passed = rule.checkFunction(context);
      message = passed ? `${rule.name}: PASSED` : `${rule.name}: FAILED`;
    } catch (error) {
      passed = false;
      message = `${rule.name}: ERROR - ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    const result: ValidationResult = {
      resultId,
      ruleId,
      timestamp: Date.now(),
      passed,
      message,
      details: context,
    };

    this.results.set(resultId, result);

    const ruleResults = this.resultsByRule.get(ruleId) || [];
    ruleResults.push(resultId);

    return result;
  }

  /**
   * 検証結果を取得
   */
  getResult(resultId: string): ValidationResult | undefined {
    return this.results.get(resultId);
  }

  /**
   * ルール別検証結果を取得
   */
  getResultsByRule(ruleId: string): ValidationResult[] {
    const ids = this.resultsByRule.get(ruleId) || [];
    return ids
      .map(id => this.results.get(id))
      .filter((r): r is ValidationResult => r !== undefined);
  }

  /**
   * 全ルールを検証
   */
  validateAll(context: any): ValidationReport {
    const reportId = `REP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const results: ValidationResult[] = [];
    const issues: Array<{ severity: string; message: string }> = [];

    let passedCount = 0;
    let failedCount = 0;
    let warningCount = 0;

    for (const rule of Array.from(this.rules.values())) {
      const result = this.executeRule(rule.ruleId, context);
      if (!result) continue;

      results.push(result);

      if (result.passed) {
        passedCount++;
      } else {
        if (rule.severity === 'warning') {
          warningCount++;
        } else {
          failedCount++;
        }

        issues.push({
          severity: rule.severity,
          message: result.message,
        });
      }
    }

    // ステータスを判定
    let status: ValidationReport['status'] = 'valid';
    let canDeploy = true;

    if (failedCount > 0) {
      status = 'invalid';
      canDeploy = false;
    } else if (warningCount > 0) {
      status = 'warning';
    }

    const report: ValidationReport = {
      reportId,
      timestamp: Date.now(),
      totalRules: this.rules.size,
      passedRules: passedCount,
      failedRules: failedCount,
      warningRules: warningCount,
      results,
      status,
      canDeploy,
      issues,
    };

    this.reports.set(reportId, report);
    return report;
  }

  /**
   * レポートを取得
   */
  getReport(reportId: string): ValidationReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * 全レポートを取得
   */
  getAllReports(): ValidationReport[] {
    return Array.from(this.reports.values());
  }

  /**
   * 最新のレポートを取得
   */
  getLatestReport(): ValidationReport | undefined {
    const reports = Array.from(this.reports.values());
    if (reports.length === 0) return undefined;

    return reports.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );
  }

  /**
   * デプロイ可能か判定
   */
  canDeploy(): boolean {
    const latest = this.getLatestReport();
    if (!latest) return false;

    return latest.canDeploy;
  }

  /**
   * 検証統計を計算
   */
  getValidationStats(): {
    totalRules: number;
    totalValidations: number;
    passRate: number;
    failureRate: number;
    warningRate: number;
    byCategory: Record<string, { total: number; passed: number }>;
    bySeverity: Record<string, number>;
  } {
    const stats = {
      totalRules: this.rules.size,
      totalValidations: this.results.size,
      passRate: 0,
      failureRate: 0,
      warningRate: 0,
      byCategory: {} as Record<string, { total: number; passed: number }>,
      bySeverity: {} as Record<string, number>,
    };

    let passedCount = 0;
    let failedCount = 0;
    let warningCount = 0;

    for (const result of Array.from(this.results.values())) {
      if (result.passed) {
        passedCount++;
      } else {
        failedCount++;
      }

      const rule = this.rules.get(result.ruleId);
      if (rule) {
        if (!stats.byCategory[rule.category]) {
          stats.byCategory[rule.category] = { total: 0, passed: 0 };
        }
        stats.byCategory[rule.category].total++;
        if (result.passed) {
          stats.byCategory[rule.category].passed++;
        }

        stats.bySeverity[rule.severity] = (stats.bySeverity[rule.severity] || 0) + 1;
      }
    }

    const total = passedCount + failedCount + warningCount;
    if (total > 0) {
      stats.passRate = (passedCount / total) * 100;
      stats.failureRate = (failedCount / total) * 100;
      stats.warningRate = (warningCount / total) * 100;
    }

    return stats;
  }

  /**
   * 全ルールを取得
   */
  getAllRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 全検証結果を取得
   */
  getAllResults(): ValidationResult[] {
    return Array.from(this.results.values());
  }

  /**
   * 失敗した検証を取得
   */
  getFailedValidations(): ValidationResult[] {
    return Array.from(this.results.values()).filter(r => !r.passed);
  }

  /**
   * ルールを削除
   */
  deleteRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    const categoryIds = this.rulesByCategory.get(rule.category) || [];
    const index = categoryIds.indexOf(ruleId);
    if (index > -1) {
      categoryIds.splice(index, 1);
    }

    this.rules.delete(ruleId);
    this.resultsByRule.delete(ruleId);

    return true;
  }

  /**
   * レポートを削除
   */
  deleteReport(reportId: string): boolean {
    return this.reports.delete(reportId);
  }

  /**
   * 検証結果を削除
   */
  deleteResult(resultId: string): boolean {
    const result = this.results.get(resultId);
    if (!result) return false;

    const ruleResults = this.resultsByRule.get(result.ruleId) || [];
    const index = ruleResults.indexOf(resultId);
    if (index > -1) {
      ruleResults.splice(index, 1);
    }

    this.results.delete(resultId);
    return true;
  }

  /**
   * 検証レポートを生成
   */
  generateValidationReport(reportId: string): {
    report: ValidationReport | undefined;
    summary: string;
    failedItems: Array<{ rule: string; message: string }>;
    recommendations: string[];
  } {
    const report = this.reports.get(reportId);
    if (!report) {
      return {
        report: undefined,
        summary: '',
        failedItems: [],
        recommendations: [],
      };
    }

    const failedItems = report.results
      .filter(r => !r.passed)
      .map(r => {
        const rule = this.rules.get(r.ruleId);
        return {
          rule: rule?.name || 'Unknown',
          message: r.message,
        };
      });

    const recommendations: string[] = [];
    if (report.failedRules > 0) {
      recommendations.push('失敗したルールを修正してください');
    }
    if (report.warningRules > 0) {
      recommendations.push('警告を確認し、必要に応じて対応してください');
    }

    const summary = `検証: ${report.passedRules}/${report.totalRules} 成功 (${report.status.toUpperCase()})`;

    return {
      report,
      summary,
      failedItems,
      recommendations,
    };
  }
}
