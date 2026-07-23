/**
 * PromptOptimizationService
 * プロンプト最適化・テンプレート管理・効果測定
 */

export interface PromptTemplate {
  templateId: string;
  timestamp: number;
  name: string;
  description: string;
  category: 'general' | 'technical' | 'creative' | 'analytical' | 'conversational';
  template: string;
  version: number;
  effectiveness: number; // 0-100
  usageCount: number;
  status: 'active' | 'archived' | 'experimental';
}

export interface PromptVariation {
  variationId: string;
  templateId: string;
  timestamp: number;
  originalPrompt: string;
  optimizedPrompt: string;
  improvementType: 'clarity' | 'specificity' | 'structure' | 'context' | 'tone';
  expectedImprovement: number; // 0-100
  actualImprovement: number; // 0-100
  status: 'pending' | 'tested' | 'approved' | 'deployed';
}

export interface PromptPerformance {
  performanceId: string;
  templateId: string;
  timestamp: number;
  responseQuality: number; // 0-100
  relevance: number; // 0-100
  clarity: number; // 0-100
  completeness: number; // 0-100
  averageScore: number; // 0-100
  testCount: number;
  successRate: number; // 0-100
}

export class PromptOptimizationService {
  private templates: Map<string, PromptTemplate> = new Map();
  private variations: Map<string, PromptVariation> = new Map();
  private performances: Map<string, PromptPerformance> = new Map();
  private templatesByCategory: Map<string, string[]> = new Map();
  private variationsByTemplate: Map<string, string[]> = new Map();
  private performancesByTemplate: Map<string, string[]> = new Map();
  private variationsByStatus: Map<string, string[]> = new Map();

  /**
   * プロンプトテンプレートを作成
   */
  createPromptTemplate(
    name: string,
    description: string,
    category: 'general' | 'technical' | 'creative' | 'analytical' | 'conversational',
    template: string
  ): PromptTemplate {
    const templateId = `PT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const promptTemplate: PromptTemplate = {
      templateId,
      timestamp: Date.now(),
      name,
      description,
      category,
      template,
      version: 1,
      effectiveness: 0,
      usageCount: 0,
      status: 'experimental',
    };

    this.templates.set(templateId, promptTemplate);

    if (!this.templatesByCategory.has(category)) {
      this.templatesByCategory.set(category, []);
    }
    this.templatesByCategory.get(category)!.push(templateId);

    return promptTemplate;
  }

  /**
   * テンプレートを取得
   */
  getPromptTemplate(templateId: string): PromptTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * カテゴリ別テンプレートを取得
   */
  getTemplatesByCategory(category: string): PromptTemplate[] {
    const ids = this.templatesByCategory.get(category) || [];
    return ids
      .map(id => this.templates.get(id))
      .filter((t): t is PromptTemplate => t !== undefined);
  }

  /**
   * プロンプト変更を作成
   */
  createPromptVariation(
    templateId: string,
    originalPrompt: string,
    optimizedPrompt: string,
    improvementType: 'clarity' | 'specificity' | 'structure' | 'context' | 'tone',
    expectedImprovement: number
  ): PromptVariation {
    const variationId = `PV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const variation: PromptVariation = {
      variationId,
      templateId,
      timestamp: Date.now(),
      originalPrompt,
      optimizedPrompt,
      improvementType,
      expectedImprovement,
      actualImprovement: 0,
      status: 'pending',
    };

    this.variations.set(variationId, variation);

    if (!this.variationsByTemplate.has(templateId)) {
      this.variationsByTemplate.set(templateId, []);
    }
    this.variationsByTemplate.get(templateId)!.push(variationId);

    if (!this.variationsByStatus.has('pending')) {
      this.variationsByStatus.set('pending', []);
    }
    this.variationsByStatus.get('pending')!.push(variationId);

    return variation;
  }

  /**
   * 変更を取得
   */
  getPromptVariation(variationId: string): PromptVariation | undefined {
    return this.variations.get(variationId);
  }

  /**
   * テンプレート別変更を取得
   */
  getVariationsByTemplate(templateId: string): PromptVariation[] {
    const ids = this.variationsByTemplate.get(templateId) || [];
    return ids
      .map(id => this.variations.get(id))
      .filter((v): v is PromptVariation => v !== undefined);
  }

  /**
   * ステータス別変更を取得
   */
  getVariationsByStatus(status: 'pending' | 'tested' | 'approved' | 'deployed'): PromptVariation[] {
    const ids = this.variationsByStatus.get(status) || [];
    return ids
      .map(id => this.variations.get(id))
      .filter((v): v is PromptVariation => v !== undefined);
  }

  /**
   * 変更をテスト
   */
  testPromptVariation(variationId: string, actualImprovement: number): boolean {
    const variation = this.variations.get(variationId);
    if (!variation) return false;

    const pendingIds = this.variationsByStatus.get('pending') || [];
    const index = pendingIds.indexOf(variationId);
    if (index > -1) {
      pendingIds.splice(index, 1);
    }

    variation.actualImprovement = actualImprovement;
    variation.status = 'tested';

    if (!this.variationsByStatus.has('tested')) {
      this.variationsByStatus.set('tested', []);
    }
    this.variationsByStatus.get('tested')!.push(variationId);

    return true;
  }

  /**
   * 変更を承認
   */
  approvePromptVariation(variationId: string): boolean {
    const variation = this.variations.get(variationId);
    if (!variation) return false;

    const testedIds = this.variationsByStatus.get('tested') || [];
    const index = testedIds.indexOf(variationId);
    if (index > -1) {
      testedIds.splice(index, 1);
    }

    variation.status = 'approved';

    if (!this.variationsByStatus.has('approved')) {
      this.variationsByStatus.set('approved', []);
    }
    this.variationsByStatus.get('approved')!.push(variationId);

    return true;
  }

  /**
   * 変更をデプロイ
   */
  deployPromptVariation(variationId: string): boolean {
    const variation = this.variations.get(variationId);
    if (!variation) return false;

    const approvedIds = this.variationsByStatus.get('approved') || [];
    const index = approvedIds.indexOf(variationId);
    if (index > -1) {
      approvedIds.splice(index, 1);
    }

    variation.status = 'deployed';

    if (!this.variationsByStatus.has('deployed')) {
      this.variationsByStatus.set('deployed', []);
    }
    this.variationsByStatus.get('deployed')!.push(variationId);

    // テンプレートを更新
    const template = this.templates.get(variation.templateId);
    if (template) {
      template.template = variation.optimizedPrompt;
      template.version += 1;
      template.effectiveness = Math.max(template.effectiveness, variation.actualImprovement);
    }

    return true;
  }

  /**
   * パフォーマンスを記録
   */
  recordPromptPerformance(
    templateId: string,
    responseQuality: number,
    relevance: number,
    clarity: number,
    completeness: number,
    successRate: number
  ): PromptPerformance {
    const performanceId = `PP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const averageScore = (responseQuality + relevance + clarity + completeness) / 4;

    const performance: PromptPerformance = {
      performanceId,
      templateId,
      timestamp: Date.now(),
      responseQuality,
      relevance,
      clarity,
      completeness,
      averageScore,
      testCount: 1,
      successRate,
    };

    this.performances.set(performanceId, performance);

    if (!this.performancesByTemplate.has(templateId)) {
      this.performancesByTemplate.set(templateId, []);
    }
    this.performancesByTemplate.get(templateId)!.push(performanceId);

    return performance;
  }

  /**
   * パフォーマンスを取得
   */
  getPromptPerformance(performanceId: string): PromptPerformance | undefined {
    return this.performances.get(performanceId);
  }

  /**
   * テンプレート別パフォーマンスを取得
   */
  getPerformancesByTemplate(templateId: string): PromptPerformance[] {
    const ids = this.performancesByTemplate.get(templateId) || [];
    return ids
      .map(id => this.performances.get(id))
      .filter((p): p is PromptPerformance => p !== undefined);
  }

  /**
   * 全テンプレートを取得
   */
  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 全変更を取得
   */
  getAllVariations(): PromptVariation[] {
    return Array.from(this.variations.values());
  }

  /**
   * 全パフォーマンスを取得
   */
  getAllPerformances(): PromptPerformance[] {
    return Array.from(this.performances.values());
  }

  /**
   * 最適化統計を計算
   */
  getOptimizationStats(): {
    totalTemplates: number;
    activeTemplates: number;
    totalVariations: number;
    deployedVariations: number;
    averageEffectiveness: number;
    totalPerformances: number;
    averageSuccessRate: number;
    averageResponseQuality: number;
  } {
    const allTemplates = Array.from(this.templates.values());
    const allVariations = Array.from(this.variations.values());
    const allPerformances = Array.from(this.performances.values());

    let totalEffectiveness = 0;
    let totalSuccessRate = 0;
    let totalQuality = 0;

    for (const template of allTemplates) {
      totalEffectiveness += template.effectiveness;
    }

    for (const performance of allPerformances) {
      totalSuccessRate += performance.successRate;
      totalQuality += performance.responseQuality;
    }

    return {
      totalTemplates: allTemplates.length,
      activeTemplates: allTemplates.filter(t => t.status === 'active').length,
      totalVariations: allVariations.length,
      deployedVariations: allVariations.filter(v => v.status === 'deployed').length,
      averageEffectiveness: allTemplates.length > 0 ? totalEffectiveness / allTemplates.length : 0,
      totalPerformances: allPerformances.length,
      averageSuccessRate: allPerformances.length > 0 ? totalSuccessRate / allPerformances.length : 0,
      averageResponseQuality: allPerformances.length > 0 ? totalQuality / allPerformances.length : 0,
    };
  }

  /**
   * テンプレートを削除
   */
  deleteTemplate(templateId: string): boolean {
    const template = this.templates.get(templateId);
    if (!template) return false;

    const categoryIds = this.templatesByCategory.get(template.category) || [];
    const index = categoryIds.indexOf(templateId);
    if (index > -1) {
      categoryIds.splice(index, 1);
    }

    this.templates.delete(templateId);
    return true;
  }

  /**
   * 変更を削除
   */
  deleteVariation(variationId: string): boolean {
    const variation = this.variations.get(variationId);
    if (!variation) return false;

    const templateIds = this.variationsByTemplate.get(variation.templateId) || [];
    const templateIndex = templateIds.indexOf(variationId);
    if (templateIndex > -1) {
      templateIds.splice(templateIndex, 1);
    }

    const statusIds = this.variationsByStatus.get(variation.status) || [];
    const statusIndex = statusIds.indexOf(variationId);
    if (statusIndex > -1) {
      statusIds.splice(statusIndex, 1);
    }

    this.variations.delete(variationId);
    return true;
  }

  /**
   * パフォーマンスを削除
   */
  deletePerformance(performanceId: string): boolean {
    const performance = this.performances.get(performanceId);
    if (!performance) return false;

    const templateIds = this.performancesByTemplate.get(performance.templateId) || [];
    const index = templateIds.indexOf(performanceId);
    if (index > -1) {
      templateIds.splice(index, 1);
    }

    this.performances.delete(performanceId);
    return true;
  }
}
