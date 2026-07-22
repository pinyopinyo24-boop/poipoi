/**
 * Production Intelligence Engine - AI-powered manufacturing analysis
 * Analyzes production data, costs, inventory, and generates improvement suggestions
 */

import { MemoryIntegrationService } from './MemoryIntegrationService';
import { SelfImprovementEngine, ImprovementSuggestion } from './SelfImprovementEngine';

export interface ProductionData {
  id: string;
  date: number;
  processName: string;
  plannedQuantity: number;
  actualQuantity: number;
  plannedCost: number;
  actualCost: number;
  plannedHours: number;
  actualHours: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  defectRate: number;
  efficiency: number;
}

export interface CostAnalysis {
  id: string;
  productionDataId: string;
  estimatedCost: number;
  actualCost: number;
  variance: number;
  varianceRate: number;
  materialVariance: number;
  laborVariance: number;
  overheadVariance: number;
  costPerUnit: number;
  chargeAmount: number;
  profitMargin: number;
  recommendations: string[];
}

export interface InventoryAnalysis {
  id: string;
  itemId: string;
  itemName: string;
  currentQuantity: number;
  averageUsage: number;
  turnoverRate: number;
  daysInventory: number;
  stockoutRisk: boolean;
  overstockRisk: boolean;
  recommendations: string[];
}

export interface ProcessAnalysis {
  id: string;
  processName: string;
  plannedTime: number;
  actualTime: number;
  efficiency: number;
  bottleneck: boolean;
  defectRate: number;
  recommendations: string[];
}

export interface ProductionAnalysisResult {
  id: string;
  timestamp: number;
  costAnalysis: CostAnalysis[];
  inventoryAnalysis: InventoryAnalysis[];
  processAnalysis: ProcessAnalysis[];
  overallEfficiency: number;
  costReductionOpportunities: number;
  improvementSuggestions: ImprovementSuggestion[];
}

/**
 * ProductionEngine - Manufacturing AI analysis
 */
export class ProductionEngine {
  private analysisHistory: ProductionAnalysisResult[] = [];
  private costAnalysisCache: Map<string, CostAnalysis> = new Map();
  private inventoryAnalysisCache: Map<string, InventoryAnalysis> = new Map();

  constructor(
    private memoryService: MemoryIntegrationService,
    private improvementEngine: SelfImprovementEngine
  ) {}

  /**
   * Analyze production data
   */
  async analyzeProduction(productionData: ProductionData[]): Promise<ProductionAnalysisResult> {
    const analysisId = `prod-analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Analyze costs
    const costAnalysis = this.analyzeCosts(productionData);

    // Analyze inventory
    const inventoryAnalysis = this.analyzeInventory(productionData);

    // Analyze processes
    const processAnalysis = this.analyzeProcesses(productionData);

    // Calculate overall efficiency
    const overallEfficiency = this.calculateOverallEfficiency(
      costAnalysis,
      inventoryAnalysis,
      processAnalysis
    );

    // Count cost reduction opportunities
    const costReductionOpportunities = costAnalysis.filter((c) => c.variance > 0).length;

    // Generate improvement suggestions
    const improvementSuggestions = await this.generateImprovementSuggestions(
      costAnalysis,
      inventoryAnalysis,
      processAnalysis
    );

    const result: ProductionAnalysisResult = {
      id: analysisId,
      timestamp: Date.now(),
      costAnalysis,
      inventoryAnalysis,
      processAnalysis,
      overallEfficiency,
      costReductionOpportunities,
      improvementSuggestions,
    };

    this.analysisHistory.push(result);

    // Save to memory
    await this.saveToMemory(result);

    return result;
  }

  /**
   * Analyze costs
   */
  private analyzeCosts(productionData: ProductionData[]): CostAnalysis[] {
    const costAnalyses: CostAnalysis[] = [];

    for (const data of productionData) {
      const variance = data.actualCost - data.plannedCost;
      const varianceRate = data.plannedCost > 0 ? (variance / data.plannedCost) * 100 : 0;

      const materialVariance = data.materialCost - (data.plannedCost * 0.4);
      const laborVariance = data.laborCost - (data.plannedCost * 0.35);
      const overheadVariance = data.overheadCost - (data.plannedCost * 0.25);

      const costPerUnit = data.actualQuantity > 0 ? data.actualCost / data.actualQuantity : 0;
      const chargeAmount = costPerUnit * 1.3; // 30% markup
      const profitMargin = ((chargeAmount - costPerUnit) / chargeAmount) * 100;

      const recommendations: string[] = [];

      if (varianceRate > 10) {
        recommendations.push('原価が計画を大幅に超過しています。コスト削減対策が必要です。');
      }

      if (materialVariance > 0) {
        recommendations.push('材料費が予算超過。仕入先の見直しや材料の効率化を検討してください。');
      }

      if (laborVariance > 0) {
        recommendations.push('労務費が予算超過。工程の効率化や作業時間の短縮を検討してください。');
      }

      if (profitMargin < 20) {
        recommendations.push('利益率が低い。価格設定の見直しまたはコスト削減が必要です。');
      }

      const analysis: CostAnalysis = {
        id: `cost-${data.id}`,
        productionDataId: data.id,
        estimatedCost: data.plannedCost,
        actualCost: data.actualCost,
        variance,
        varianceRate,
        materialVariance,
        laborVariance,
        overheadVariance,
        costPerUnit,
        chargeAmount,
        profitMargin,
        recommendations,
      };

      costAnalyses.push(analysis);
      this.costAnalysisCache.set(data.id, analysis);
    }

    return costAnalyses;
  }

  /**
   * Analyze inventory
   */
  private analyzeInventory(productionData: ProductionData[]): InventoryAnalysis[] {
    const inventoryAnalyses: InventoryAnalysis[] = [];

    // Simulate inventory data from production
    for (let i = 0; i < productionData.length; i++) {
      const data = productionData[i];
      const currentQuantity = data.actualQuantity;
      const averageUsage = data.actualQuantity / 30; // Monthly average
      const turnoverRate = (data.actualQuantity * 12) / (currentQuantity + 1);
      const daysInventory = 365 / (turnoverRate + 1);

      const stockoutRisk = daysInventory < 7;
      const overstockRisk = daysInventory > 90;

      const recommendations: string[] = [];

      if (stockoutRisk) {
        recommendations.push('在庫が不足するリスクがあります。発注量を増やしてください。');
      }

      if (overstockRisk) {
        recommendations.push('過剰在庫が発生しています。発注量を削減してください。');
      }

      if (turnoverRate < 2) {
        recommendations.push('在庫回転率が低い。販売促進またはセール実施を検討してください。');
      }

      const analysis: InventoryAnalysis = {
        id: `inv-${data.id}`,
        itemId: data.id,
        itemName: data.processName,
        currentQuantity,
        averageUsage,
        turnoverRate,
        daysInventory,
        stockoutRisk,
        overstockRisk,
        recommendations,
      };

      inventoryAnalyses.push(analysis);
      this.inventoryAnalysisCache.set(data.id, analysis);
    }

    return inventoryAnalyses;
  }

  /**
   * Analyze processes
   */
  private analyzeProcesses(productionData: ProductionData[]): ProcessAnalysis[] {
    const processAnalyses: ProcessAnalysis[] = [];

    for (const data of productionData) {
      const efficiency = data.actualHours > 0 ? (data.plannedHours / data.actualHours) * 100 : 0;
      const bottleneck = efficiency < 80;

      const recommendations: string[] = [];

      if (efficiency < 80) {
        recommendations.push(`${data.processName}の効率が低い (${efficiency.toFixed(1)}%)。工程改善が必要です。`);
      }

      if (data.defectRate > 5) {
        recommendations.push(`${data.processName}の不良率が高い (${data.defectRate}%)。品質管理を強化してください。`);
      }

      if (bottleneck) {
        recommendations.push(`${data.processName}がボトルネックになっています。並列化や自動化を検討してください。`);
      }

      const analysis: ProcessAnalysis = {
        id: `proc-${data.id}`,
        processName: data.processName,
        plannedTime: data.plannedHours,
        actualTime: data.actualHours,
        efficiency,
        bottleneck,
        defectRate: data.defectRate,
        recommendations,
      };

      processAnalyses.push(analysis);
    }

    return processAnalyses;
  }

  /**
   * Calculate overall efficiency
   */
  private calculateOverallEfficiency(
    costAnalysis: CostAnalysis[],
    inventoryAnalysis: InventoryAnalysis[],
    processAnalysis: ProcessAnalysis[]
  ): number {
    let totalEfficiency = 0;

    // Cost efficiency (0-100)
    const avgVarianceRate = costAnalysis.reduce((sum, c) => sum + Math.abs(c.varianceRate), 0) / costAnalysis.length;
    const costEfficiency = Math.max(0, 100 - avgVarianceRate);

    // Inventory efficiency (0-100)
    const overstock = inventoryAnalysis.filter((i) => i.overstockRisk).length;
    const stockout = inventoryAnalysis.filter((i) => i.stockoutRisk).length;
    const inventoryEfficiency = 100 - (overstock + stockout) * 5;

    // Process efficiency (0-100)
    const avgProcessEfficiency = processAnalysis.reduce((sum, p) => sum + p.efficiency, 0) / processAnalysis.length;

    totalEfficiency = (costEfficiency + inventoryEfficiency + avgProcessEfficiency) / 3;

    return Math.min(100, Math.max(0, totalEfficiency));
  }

  /**
   * Generate improvement suggestions
   */
  private async generateImprovementSuggestions(
    costAnalysis: CostAnalysis[],
    inventoryAnalysis: InventoryAnalysis[],
    processAnalysis: ProcessAnalysis[]
  ): Promise<ImprovementSuggestion[]> {
    const suggestions: ImprovementSuggestion[] = [];

    // Cost reduction suggestions
    const highVarianceCosts = costAnalysis.filter((c) => c.varianceRate > 15);
    if (highVarianceCosts.length > 0) {
      const suggestion: ImprovementSuggestion = {
        id: `sugg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workflowId: 'production-analysis',
        type: 'workflow_optimization',
        category: 'cost_reduction',
        suggestion: '原価削減対策を実施してください',
        reason: `${highVarianceCosts.length}件の工程で原価が計画を大幅に超過しています。`,
        confidence: 85,
        priority: 'high',
        estimatedImpact: 30,
        actionItems: [
          '仕入先の見直し',
          '材料の効率化',
          '工程の最適化',
          'コスト削減目標の設定',
        ],
        createdAt: Date.now(),
      };

      suggestions.push(suggestion);
    }

    // Inventory optimization suggestions
    const problematicInventory = inventoryAnalysis.filter((i) => i.stockoutRisk || i.overstockRisk);
    if (problematicInventory.length > 0) {
      const suggestion: ImprovementSuggestion = {
        id: `sugg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workflowId: 'production-analysis',
        type: 'efficiency_improvement',
        category: 'inventory_optimization',
        suggestion: '在庫管理を最適化してください',
        reason: `${problematicInventory.length}件の品目で在庫リスクが検出されました。`,
        confidence: 80,
        priority: 'medium',
        estimatedImpact: 20,
        actionItems: [
          '発注量の見直し',
          'ABC分析の実施',
          '需要予測の改善',
          '在庫回転率の監視',
        ],
        createdAt: Date.now(),
      };

      suggestions.push(suggestion);
    }

    // Process efficiency suggestions
    const lowEfficiencyProcesses = processAnalysis.filter((p) => p.efficiency < 80);
    if (lowEfficiencyProcesses.length > 0) {
      const suggestion: ImprovementSuggestion = {
        id: `sugg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workflowId: 'production-analysis',
        type: 'agent_performance',
        category: 'process_efficiency',
        suggestion: '工程効率を改善してください',
        reason: `${lowEfficiencyProcesses.length}件の工程で効率が80%未満です。`,
        confidence: 90,
        priority: 'high',
        estimatedImpact: 25,
        actionItems: [
          '工程の詳細分析',
          'ボトルネック特定',
          '自動化の検討',
          'スタッフ教育の実施',
        ],
        createdAt: Date.now(),
      };

      suggestions.push(suggestion);
    }

    return suggestions;
  }

  /**
   * Save analysis to memory
   */
  private async saveToMemory(result: ProductionAnalysisResult): Promise<void> {
    const memory = {
      id: `memory_${result.id}`,
      timestamp: new Date().toISOString(),
      type: 'production_analysis',
      content: JSON.stringify({
        analysisId: result.id,
        overallEfficiency: result.overallEfficiency,
        costReductionOpportunities: result.costReductionOpportunities,
        suggestionCount: result.improvementSuggestions.length,
      }),
      importance: result.overallEfficiency < 70 ? 'high' : 'medium',
      tags: [
        'production_analysis',
        'manufacturing',
        `efficiency_${Math.floor(result.overallEfficiency / 10) * 10}`,
      ],
      metadata: {
        analysisId: result.id,
        source: 'ProductionEngine',
      },
    };

    console.log('[ProductionEngine] Analysis saved to memory:', result.id);
  }

  /**
   * Get cost analysis for a production item
   */
  getCostAnalysis(productionDataId: string): CostAnalysis | undefined {
    return this.costAnalysisCache.get(productionDataId);
  }

  /**
   * Get inventory analysis for an item
   */
  getInventoryAnalysis(itemId: string): InventoryAnalysis | undefined {
    return this.inventoryAnalysisCache.get(itemId);
  }

  /**
   * Get analysis history
   */
  getAnalysisHistory(limit: number = 10): ProductionAnalysisResult[] {
    return this.analysisHistory.slice(-limit).reverse();
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalAnalyzed: number;
    averageEfficiency: number;
    costReductionOpportunities: number;
    inventoryIssues: number;
  } {
    const avgEfficiency =
      this.analysisHistory.length > 0
        ? this.analysisHistory.reduce((sum, a) => sum + a.overallEfficiency, 0) / this.analysisHistory.length
        : 0;

    const costOpportunities = this.analysisHistory.reduce((sum, a) => sum + a.costReductionOpportunities, 0);

    const inventoryIssues = this.analysisHistory.reduce(
      (sum, a) => sum + a.inventoryAnalysis.filter((i) => i.stockoutRisk || i.overstockRisk).length,
      0
    );

    return {
      totalAnalyzed: this.analysisHistory.length,
      averageEfficiency: avgEfficiency,
      costReductionOpportunities: costOpportunities,
      inventoryIssues,
    };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.analysisHistory = [];
    this.costAnalysisCache.clear();
    this.inventoryAnalysisCache.clear();
  }
}
