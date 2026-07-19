import { ProductionAnalysisService } from '../services/ProductionAnalysisService';
import { ProcessOptimizationService } from '../services/ProcessOptimizationService';
import { CostAnalysisService } from '../services/CostAnalysisService';
import { QualityAnalysisService } from '../services/QualityAnalysisService';
import { ProductionForecastService } from '../services/ProductionForecastService';
import { ManufacturingValidator } from '../services/ManufacturingValidator';
import { ManufacturingIntelligenceRepository } from '../repositories/ManufacturingIntelligenceRepository';

export interface ProductionData {
  id: string;
  date: number;
  productId: string;
  plannedQuantity: number;
  actualQuantity: number;
  plannedHours: number;
  actualHours: number;
  defectCount: number;
  status: 'planned' | 'in_progress' | 'completed' | 'delayed';
}

export interface ProcessData {
  id: string;
  processId: string;
  processName: string;
  capacity: number;
  utilization: number;
  bottleneckLevel: number;
  cycleTime: number;
  efficiency: number;
}

export interface CostData {
  id: string;
  date: number;
  productId: string;
  plannedCost: number;
  actualCost: number;
  variance: number;
  variancePercentage: number;
}

export interface QualityData {
  id: string;
  date: number;
  productId: string;
  totalProduced: number;
  defectCount: number;
  defectRate: number;
  defectTypes: Record<string, number>;
}

export interface ManufacturingAnalysis {
  id: string;
  type: 'production' | 'process' | 'cost' | 'quality' | 'forecast';
  timestamp: number;
  data: unknown;
  insights: string[];
  recommendations: string[];
  confidence: number;
}

export class ManufacturingIntelligenceAIManager {
  private productionService: ProductionAnalysisService;
  private processService: ProcessOptimizationService;
  private costService: CostAnalysisService;
  private qualityService: QualityAnalysisService;
  private forecastService: ProductionForecastService;
  private validator: ManufacturingValidator;
  private repository: ManufacturingIntelligenceRepository;

  constructor(
    productionService: ProductionAnalysisService,
    processService: ProcessOptimizationService,
    costService: CostAnalysisService,
    qualityService: QualityAnalysisService,
    forecastService: ProductionForecastService,
    validator: ManufacturingValidator,
    repository: ManufacturingIntelligenceRepository
  ) {
    this.productionService = productionService;
    this.processService = processService;
    this.costService = costService;
    this.qualityService = qualityService;
    this.forecastService = forecastService;
    this.validator = validator;
    this.repository = repository;
  }

  /**
   * 生産実績分析
   */
  async analyzeProduction(data: ProductionData[]): Promise<ManufacturingAnalysis> {
    if (!this.validator.validateProductionData(data)) {
      throw new Error('Invalid production data');
    }

    const analysis = await this.productionService.analyzeProductionPerformance(data);
    const result: ManufacturingAnalysis = {
      id: `prod_${Date.now()}`,
      type: 'production',
      timestamp: Date.now(),
      data,
      insights: analysis.insights,
      recommendations: analysis.recommendations,
      confidence: analysis.confidence,
    };

    await this.repository.saveAnalysis(result);
    return result;
  }

  /**
   * 工程最適化分析
   */
  async optimizeProcess(processes: ProcessData[]): Promise<ManufacturingAnalysis & { bottlenecks: string[] }> {
    if (!this.validator.validateProcessData(processes)) {
      throw new Error('Invalid process data');
    }

    const optimization = await this.processService.optimizeProcessFlow(processes);
    const result: ManufacturingAnalysis & { bottlenecks: string[] } = {
      id: `proc_${Date.now()}`,
      type: 'process',
      timestamp: Date.now(),
      data: processes,
      insights: optimization.insights,
      recommendations: optimization.recommendations,
      confidence: optimization.confidence,
      bottlenecks: optimization.bottlenecks,
    };

    await this.repository.saveAnalysis(result);
    return result;
  }

  /**
   * 原価分析
   */
  async analyzeCost(costs: CostData[]): Promise<ManufacturingAnalysis> {
    if (!this.validator.validateCostData(costs)) {
      throw new Error('Invalid cost data');
    }

    const analysis = await this.costService.analyzeCostVariance(costs);
    const result: ManufacturingAnalysis = {
      id: `cost_${Date.now()}`,
      type: 'cost',
      timestamp: Date.now(),
      data: costs,
      insights: analysis.insights,
      recommendations: analysis.recommendations,
      confidence: analysis.confidence,
    };

    await this.repository.saveAnalysis(result);
    return result;
  }

  /**
   * 品質分析
   */
  async analyzeQuality(quality: QualityData[]): Promise<ManufacturingAnalysis> {
    if (!this.validator.validateQualityData(quality)) {
      throw new Error('Invalid quality data');
    }

    const analysis = await this.qualityService.analyzeQualityTrends(quality);
    const result: ManufacturingAnalysis = {
      id: `qual_${Date.now()}`,
      type: 'quality',
      timestamp: Date.now(),
      data: quality,
      insights: analysis.insights,
      recommendations: analysis.recommendations,
      confidence: analysis.confidence,
    };

    await this.repository.saveAnalysis(result);
    return result;
  }

  /**
   * 生産予測
   */
  async forecastProduction(historicalData: ProductionData[]): Promise<ManufacturingAnalysis> {
    if (!this.validator.validateProductionData(historicalData)) {
      throw new Error('Invalid historical data');
    }

    const forecast = await this.forecastService.forecastProduction(historicalData);
    const result: ManufacturingAnalysis = {
      id: `fcst_${Date.now()}`,
      type: 'forecast',
      timestamp: Date.now(),
      data: forecast.predictions,
      insights: forecast.insights,
      recommendations: forecast.recommendations,
      confidence: forecast.confidence,
    };

    await this.repository.saveAnalysis(result);
    return result;
  }

  /**
   * 包括的な製造インテリジェンス分析
   */
  async comprehensiveAnalysis(
    production: ProductionData[],
    processes: ProcessData[],
    costs: CostData[],
    quality: QualityData[]
  ): Promise<ManufacturingAnalysis[]> {
    const analyses: ManufacturingAnalysis[] = [];

    analyses.push(await this.analyzeProduction(production));
    analyses.push(await this.optimizeProcess(processes));
    analyses.push(await this.analyzeCost(costs));
    analyses.push(await this.analyzeQuality(quality));

    return analyses;
  }

  /**
   * 分析履歴取得
   */
  async getAnalysisHistory(type?: string, limit: number = 10): Promise<ManufacturingAnalysis[]> {
    return this.repository.getAnalysisHistory(type, limit);
  }

  /**
   * 統計情報取得
   */
  async getManufacturingStats(): Promise<{
    totalAnalyses: number;
    productionAnalyses: number;
    processAnalyses: number;
    costAnalyses: number;
    qualityAnalyses: number;
    forecastAnalyses: number;
    averageConfidence: number;
  }> {
    return this.repository.getManufacturingStats();
  }
}
