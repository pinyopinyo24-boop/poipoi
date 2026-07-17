import { describe, it, expect, beforeEach } from 'vitest';
import { ManufacturingIntelligenceAIManager, type ProductionData, type ProcessData, type CostData, type QualityData } from '../core/ManufacturingIntelligenceAIManager';
import { ProductionAnalysisService } from '../services/ProductionAnalysisService';
import { ProcessOptimizationService } from '../services/ProcessOptimizationService';
import { CostAnalysisService } from '../services/CostAnalysisService';
import { QualityAnalysisService } from '../services/QualityAnalysisService';
import { ProductionForecastService } from '../services/ProductionForecastService';
import { ManufacturingValidator } from '../services/ManufacturingValidator';
import { ManufacturingIntelligenceRepository } from '../repositories/ManufacturingIntelligenceRepository';

describe('ManufacturingIntelligenceAIManager', () => {
  let manager: ManufacturingIntelligenceAIManager;
  let productionService: ProductionAnalysisService;
  let processService: ProcessOptimizationService;
  let costService: CostAnalysisService;
  let qualityService: QualityAnalysisService;
  let forecastService: ProductionForecastService;
  let validator: ManufacturingValidator;
  let repository: ManufacturingIntelligenceRepository;

  beforeEach(() => {
    productionService = new ProductionAnalysisService();
    processService = new ProcessOptimizationService();
    costService = new CostAnalysisService();
    qualityService = new QualityAnalysisService();
    forecastService = new ProductionForecastService();
    validator = new ManufacturingValidator();
    repository = new ManufacturingIntelligenceRepository();

    manager = new ManufacturingIntelligenceAIManager(
      productionService,
      processService,
      costService,
      qualityService,
      forecastService,
      validator,
      repository
    );
  });

  describe('① 生産実績分析', () => {
    it('should analyze production performance', async () => {
      const data: ProductionData[] = [
        {
          id: 'prod1',
          date: Date.now(),
          productId: 'P001',
          plannedQuantity: 100,
          actualQuantity: 98,
          plannedHours: 10,
          actualHours: 10.2,
          defectCount: 2,
          status: 'completed',
        },
      ];

      const result = await manager.analyzeProduction(data);
      expect(result.type).toBe('production');
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle empty production data', async () => {
      const data: ProductionData[] = [];
      const result = await manager.analyzeProduction(data);
      expect(result.insights[0]).toBe('No production data available');
    });

    it('should detect high defect rates', async () => {
      const data: ProductionData[] = [
        {
          id: 'prod1',
          date: Date.now(),
          productId: 'P001',
          plannedQuantity: 100,
          actualQuantity: 100,
          plannedHours: 10,
          actualHours: 10,
          defectCount: 10,
          status: 'completed',
        },
      ];

      const result = await manager.analyzeProduction(data);
      expect(result.insights.some((i) => i.includes('defect'))).toBe(true);
    });
  });

  describe('② 工程負荷分析', () => {
    it('should optimize process flow', async () => {
      const processes: ProcessData[] = [
        {
          id: 'proc1',
          processId: 'P001',
          processName: 'Assembly',
          capacity: 100,
          utilization: 75,
          bottleneckLevel: 30,
          cycleTime: 5,
          efficiency: 85,
        },
      ];

      const result = await manager.optimizeProcess(processes);
      expect(result.type).toBe('process');
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should detect bottlenecks', async () => {
      const processes: ProcessData[] = [
        {
          id: 'proc1',
          processId: 'P001',
          processName: 'Bottleneck Process',
          capacity: 100,
          utilization: 95,
          bottleneckLevel: 85,
          cycleTime: 10,
          efficiency: 60,
        },
      ];

      const result = await manager.optimizeProcess(processes);
      expect(result.bottlenecks.length).toBeGreaterThan(0);
    });
  });

  describe('③ 工数分析', () => {
    it('should calculate utilization correctly', () => {
      const data: ProductionData[] = [
        {
          id: 'prod1',
          date: Date.now(),
          productId: 'P001',
          plannedQuantity: 100,
          actualQuantity: 95,
          plannedHours: 10,
          actualHours: 9.5,
          defectCount: 0,
          status: 'completed',
        },
      ];

      const utilization = productionService.calculateUtilization(data);
      expect(utilization).toBe(95);
    });
  });

  describe('④ 稼働率分析', () => {
    it('should analyze capacity', () => {
      const data: ProductionData[] = [
        {
          id: 'prod1',
          date: Date.now(),
          productId: 'P001',
          plannedQuantity: 100,
          actualQuantity: 90,
          plannedHours: 10,
          actualHours: 9,
          defectCount: 0,
          status: 'completed',
        },
      ];

      const capacity = productionService.analyzeCapacity(data);
      expect(capacity.utilizationRate).toBe(90);
      expect(capacity.currentCapacity).toBe(90);
    });
  });

  describe('⑤ 生産能力分析', () => {
    it('should analyze production capacity', () => {
      const data: ProductionData[] = [
        {
          id: 'prod1',
          date: Date.now(),
          productId: 'P001',
          plannedQuantity: 100,
          actualQuantity: 100,
          plannedHours: 10,
          actualHours: 10,
          defectCount: 0,
          status: 'completed',
        },
      ];

      const capacity = productionService.analyzeCapacity(data);
      expect(capacity.currentCapacity).toBe(100);
    });
  });

  describe('⑥ 生産予測', () => {
    it('should forecast production', async () => {
      const data: ProductionData[] = [
        {
          id: 'prod1',
          date: Date.now() - 7 * 24 * 60 * 60 * 1000,
          productId: 'P001',
          plannedQuantity: 100,
          actualQuantity: 95,
          plannedHours: 10,
          actualHours: 10,
          defectCount: 1,
          status: 'completed',
        },
        {
          id: 'prod2',
          date: Date.now(),
          productId: 'P001',
          plannedQuantity: 100,
          actualQuantity: 98,
          plannedHours: 10,
          actualHours: 10,
          defectCount: 1,
          status: 'completed',
        },
      ];

      const result = await manager.forecastProduction(data);
      expect(result.type).toBe('forecast');
      expect(result.data).toBeDefined();
    });
  });

  describe('⑦ 工程改善提案', () => {
    it('should provide process improvement recommendations', async () => {
      const processes: ProcessData[] = [
        {
          id: 'proc1',
          processId: 'P001',
          processName: 'Inefficient Process',
          capacity: 100,
          utilization: 60,
          bottleneckLevel: 20,
          cycleTime: 8,
          efficiency: 65,
        },
      ];

      const result = await manager.optimizeProcess(processes);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('⑧ 原価差異分析', () => {
    it('should analyze cost variance', async () => {
      const costs: CostData[] = [
        {
          id: 'cost1',
          date: Date.now(),
          productId: 'P001',
          plannedCost: 1000,
          actualCost: 1050,
          variance: 50,
          variancePercentage: 5,
        },
      ];

      const result = await manager.analyzeCost(costs);
      expect(result.type).toBe('cost');
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should detect cost overruns', async () => {
      const costs: CostData[] = [
        {
          id: 'cost1',
          date: Date.now(),
          productId: 'P001',
          plannedCost: 1000,
          actualCost: 1200,
          variance: 200,
          variancePercentage: 20,
        },
      ];

      const result = await manager.analyzeCost(costs);
      expect(result.insights.some((i) => i.includes('overrun'))).toBe(true);
    });
  });

  describe('⑨ 品質傾向分析', () => {
    it('should analyze quality trends', async () => {
      const quality: QualityData[] = [
        {
          id: 'qual1',
          date: Date.now(),
          productId: 'P001',
          totalProduced: 100,
          defectCount: 2,
          defectRate: 2,
          defectTypes: { 'Type A': 1, 'Type B': 1 },
        },
      ];

      const result = await manager.analyzeQuality(quality);
      expect(result.type).toBe('quality');
      expect(result.insights.length).toBeGreaterThan(0);
    });
  });

  describe('⑩ 不良原因分析', () => {
    it('should analyze defect causes', () => {
      const quality: QualityData[] = [
        {
          id: 'qual1',
          date: Date.now() - 7 * 24 * 60 * 60 * 1000,
          productId: 'P001',
          totalProduced: 100,
          defectCount: 5,
          defectRate: 5,
          defectTypes: { 'Type A': 3, 'Type B': 2 },
        },
        {
          id: 'qual2',
          date: Date.now(),
          productId: 'P001',
          totalProduced: 100,
          defectCount: 3,
          defectRate: 3,
          defectTypes: { 'Type A': 2, 'Type B': 1 },
        },
      ];

      const analysis = qualityService.analyzeDefectCauses(quality);
      expect(analysis.primaryCauses.length).toBeGreaterThan(0);
      expect(analysis.trend).toBe('improving');
    });
  });

  describe('⑪ 改善効果予測', () => {
    it('should predict improvement effects', () => {
      const data: ProductionData[] = [
        {
          id: 'prod1',
          date: Date.now(),
          productId: 'P001',
          plannedQuantity: 100,
          actualQuantity: 85,
          plannedHours: 10,
          actualHours: 10,
          defectCount: 2,
          status: 'completed',
        },
      ];

      const prediction = forecastService.predictImprovementEffect(data, 10);
      expect(prediction.currentPerformance).toBe(85);
      expect(prediction.projectedPerformance).toBe(95);
      expect(prediction.expectedImprovement).toBe(10);
    });
  });

  describe('⑫ 包括的分析', () => {
    it('should perform comprehensive analysis', async () => {
      const production: ProductionData[] = [
        {
          id: 'prod1',
          date: Date.now(),
          productId: 'P001',
          plannedQuantity: 100,
          actualQuantity: 95,
          plannedHours: 10,
          actualHours: 10,
          defectCount: 1,
          status: 'completed',
        },
      ];

      const processes: ProcessData[] = [
        {
          id: 'proc1',
          processId: 'P001',
          processName: 'Assembly',
          capacity: 100,
          utilization: 75,
          bottleneckLevel: 30,
          cycleTime: 5,
          efficiency: 85,
        },
      ];

      const costs: CostData[] = [
        {
          id: 'cost1',
          date: Date.now(),
          productId: 'P001',
          plannedCost: 1000,
          actualCost: 1050,
          variance: 50,
          variancePercentage: 5,
        },
      ];

      const quality: QualityData[] = [
        {
          id: 'qual1',
          date: Date.now(),
          productId: 'P001',
          totalProduced: 100,
          defectCount: 2,
          defectRate: 2,
          defectTypes: { 'Type A': 1, 'Type B': 1 },
        },
      ];

      const results = await manager.comprehensiveAnalysis(production, processes, costs, quality);
      expect(results.length).toBe(4);
      expect(results[0].type).toBe('production');
      expect(results[1].type).toBe('process');
      expect(results[2].type).toBe('cost');
      expect(results[3].type).toBe('quality');
    });
  });

  describe('分析履歴管理', () => {
    it('should retrieve analysis history', async () => {
      const data: ProductionData[] = [
        {
          id: 'prod1',
          date: Date.now(),
          productId: 'P001',
          plannedQuantity: 100,
          actualQuantity: 95,
          plannedHours: 10,
          actualHours: 10,
          defectCount: 1,
          status: 'completed',
        },
      ];

      await manager.analyzeProduction(data);
      const history = await manager.getAnalysisHistory();

      expect(history.length).toBeGreaterThan(0);
    });

    it('should get manufacturing statistics', async () => {
      const data: ProductionData[] = [
        {
          id: 'prod1',
          date: Date.now(),
          productId: 'P001',
          plannedQuantity: 100,
          actualQuantity: 95,
          plannedHours: 10,
          actualHours: 10,
          defectCount: 1,
          status: 'completed',
        },
      ];

      await manager.analyzeProduction(data);
      const stats = await manager.getManufacturingStats();

      expect(stats.totalAnalyses).toBeGreaterThan(0);
      expect(stats.averageConfidence).toBeGreaterThan(0);
    });
  });

  describe('バリデーション', () => {
    it('should validate production data', () => {
      const validData: ProductionData[] = [
        {
          id: 'prod1',
          date: Date.now(),
          productId: 'P001',
          plannedQuantity: 100,
          actualQuantity: 95,
          plannedHours: 10,
          actualHours: 10,
          defectCount: 1,
          status: 'completed',
        },
      ];

      expect(validator.validateProductionData(validData)).toBe(true);
    });

    it('should reject invalid production data', () => {
      const invalidData = [
        {
          id: 'prod1',
          date: Date.now(),
          productId: 'P001',
          plannedQuantity: -100,
          actualQuantity: 95,
          plannedHours: 10,
          actualHours: 10,
          defectCount: 1,
          status: 'completed',
        },
      ];

      expect(validator.validateProductionData(invalidData as ProductionData[])).toBe(false);
    });

    it('should validate cost data', () => {
      const validData: CostData[] = [
        {
          id: 'cost1',
          date: Date.now(),
          productId: 'P001',
          plannedCost: 1000,
          actualCost: 1050,
          variance: 50,
          variancePercentage: 5,
        },
      ];

      expect(validator.validateCostData(validData)).toBe(true);
    });

    it('should validate quality data', () => {
      const validData: QualityData[] = [
        {
          id: 'qual1',
          date: Date.now(),
          productId: 'P001',
          totalProduced: 100,
          defectCount: 2,
          defectRate: 2,
          defectTypes: { 'Type A': 1, 'Type B': 1 },
        },
      ];

      expect(validator.validateQualityData(validData)).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle invalid production data', async () => {
      const invalidData: ProductionData[] = [
        {
          id: 'prod1',
          date: Date.now(),
          productId: 'P001',
          plannedQuantity: -100,
          actualQuantity: 95,
          plannedHours: 10,
          actualHours: 10,
          defectCount: 1,
          status: 'completed',
        },
      ];

      await expect(manager.analyzeProduction(invalidData)).rejects.toThrow('Invalid production data');
    });

    it('should handle invalid cost data', async () => {
      const invalidData: CostData[] = [
        {
          id: 'cost1',
          date: Date.now(),
          productId: 'P001',
          plannedCost: -1000,
          actualCost: 1050,
          variance: 50,
          variancePercentage: 5,
        },
      ];

      await expect(manager.analyzeCost(invalidData)).rejects.toThrow('Invalid cost data');
    });
  });

  describe('統計分析', () => {
    it('should calculate process efficiency', () => {
      const processes: ProcessData[] = [
        {
          id: 'proc1',
          processId: 'P001',
          processName: 'Process 1',
          capacity: 100,
          utilization: 75,
          bottleneckLevel: 30,
          cycleTime: 5,
          efficiency: 85,
        },
        {
          id: 'proc2',
          processId: 'P002',
          processName: 'Process 2',
          capacity: 100,
          utilization: 80,
          bottleneckLevel: 35,
          cycleTime: 6,
          efficiency: 90,
        },
      ];

      const efficiency = processService.calculateProcessEfficiency(processes);
      expect(efficiency).toBe(87.5);
    });

    it('should calculate quality score', () => {
      const quality: QualityData[] = [
        {
          id: 'qual1',
          date: Date.now(),
          productId: 'P001',
          totalProduced: 100,
          defectCount: 2,
          defectRate: 2,
          defectTypes: { 'Type A': 1, 'Type B': 1 },
        },
      ];

      const score = qualityService.calculateQualityScore(quality);
      expect(score).toBe(80);
    });

    it('should calculate cost reduction potential', () => {
      const costs: CostData[] = [
        {
          id: 'cost1',
          date: Date.now(),
          productId: 'P001',
          plannedCost: 1000,
          actualCost: 1100,
          variance: 100,
          variancePercentage: 10,
        },
      ];

      const potential = costService.calculateCostReductionPotential(costs);
      expect(potential.currentTotalCost).toBe(1100);
      expect(potential.potentialSavings).toBeGreaterThan(0);
    });
  });

  describe('⑫ Advanced Manufacturing Features', () => {
    it('should handle multiple production lines', async () => {
      const data: ProductionData[] = [
        {
          id: 'line1',
          date: Date.now(),
          productId: 'prod1',
          plannedQuantity: 100,
          actualQuantity: 95,
          plannedHours: 8,
          actualHours: 8.5,
          defectCount: 2,
          status: 'completed',
        },
        {
          id: 'line2',
          date: Date.now(),
          productId: 'prod2',
          plannedQuantity: 80,
          actualQuantity: 78,
          plannedHours: 8,
          actualHours: 8.2,
          defectCount: 1,
          status: 'completed',
        },
      ];
      const result = await manager.analyzeProduction(data);
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should detect quality trends', async () => {
      const data: QualityData[] = [
        {
          id: 'q1',
          date: Date.now() - 7 * 24 * 60 * 60 * 1000,
          productId: 'prod1',
          totalProduced: 1000,
          defectCount: 50,
          defectRate: 5,
          defectTypes: { scratch: 30, dent: 20 },
        },
        {
          id: 'q2',
          date: Date.now(),
          productId: 'prod1',
          totalProduced: 1000,
          defectCount: 30,
          defectRate: 3,
          defectTypes: { scratch: 20, dent: 10 },
        },
      ];
      const result = await manager.analyzeQuality(data);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should forecast production accurately', async () => {
      const data: ProductionData[] = [
        {
          id: 'p1',
          date: Date.now() - 30 * 24 * 60 * 60 * 1000,
          productId: 'prod1',
          plannedQuantity: 100,
          actualQuantity: 95,
          plannedHours: 8,
          actualHours: 8.5,
          defectCount: 2,
          status: 'completed',
        },
        {
          id: 'p2',
          date: Date.now(),
          productId: 'prod1',
          plannedQuantity: 100,
          actualQuantity: 98,
          plannedHours: 8,
          actualHours: 8.1,
          defectCount: 1,
          status: 'completed',
        },
      ];
      const result = await manager.forecastProduction(data);
      expect(result.type).toBe('forecast');
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should identify cost optimization opportunities', async () => {
      const data: CostData[] = [
        {
          id: 'c1',
          date: Date.now(),
          productId: 'prod1',
          plannedCost: 1000,
          actualCost: 1200,
          variance: 200,
          variancePercentage: 20,
        },
      ];
      const result = await manager.analyzeCost(data);
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate production efficiency', async () => {
      const data: ProductionData[] = [
        {
          id: 'p1',
          date: Date.now(),
          productId: 'prod1',
          plannedQuantity: 100,
          actualQuantity: 95,
          plannedHours: 8,
          actualHours: 8.5,
          defectCount: 2,
          status: 'completed',
        },
      ];
      const result = await manager.analyzeProduction(data);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle process optimization with multiple bottlenecks', async () => {
      const processes: ProcessData[] = [
        {
          id: 'p1',
          processId: 'proc1',
          processName: 'Assembly',
          capacity: 100,
          utilization: 90,
          bottleneckLevel: 85,
          cycleTime: 10,
          efficiency: 75,
        },
        {
          id: 'p2',
          processId: 'proc2',
          processName: 'Testing',
          capacity: 80,
          utilization: 95,
          bottleneckLevel: 90,
          cycleTime: 15,
          efficiency: 70,
        },
      ];
      const result = await manager.optimizeProcess(processes);
      expect(result.bottlenecks.length).toBeGreaterThan(0);
    });

    it('should generate improvement recommendations', async () => {
      const data: ProductionData[] = [
        {
          id: 'p1',
          date: Date.now(),
          productId: 'prod1',
          plannedQuantity: 100,
          actualQuantity: 70,
          plannedHours: 8,
          actualHours: 12,
          defectCount: 5,
          status: 'delayed',
        },
      ];
      const result = await manager.analyzeProduction(data);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should validate manufacturing data correctly', async () => {
      const invalidData: ProductionData[] = [];
      try {
        await manager.analyzeProduction(invalidData);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should save and retrieve analysis results', async () => {
      const data: ProductionData[] = [
        {
          id: 'p1',
          date: Date.now(),
          productId: 'prod1',
          plannedQuantity: 100,
          actualQuantity: 95,
          plannedHours: 8,
          actualHours: 8.5,
          defectCount: 2,
          status: 'completed',
        },
      ];
      const result = await manager.analyzeProduction(data);
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should calculate cost variance accurately', async () => {
      const data: CostData[] = [
        {
          id: 'c1',
          date: Date.now(),
          productId: 'prod1',
          plannedCost: 1000,
          actualCost: 1100,
          variance: 100,
          variancePercentage: 10,
        },
      ];
      const result = await manager.analyzeCost(data);
      expect(result.type).toBe('cost');
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should detect defect patterns', async () => {
      const data: QualityData[] = [
        {
          id: 'q1',
          date: Date.now(),
          productId: 'prod1',
          totalProduced: 1000,
          defectCount: 100,
          defectRate: 10,
          defectTypes: { scratch: 60, dent: 40 },
        },
      ];
      const result = await manager.analyzeQuality(data);
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should handle concurrent analysis requests', async () => {
      const prodData: ProductionData[] = [
        {
          id: 'p1',
          date: Date.now(),
          productId: 'prod1',
          plannedQuantity: 100,
          actualQuantity: 95,
          plannedHours: 8,
          actualHours: 8.5,
          defectCount: 2,
          status: 'completed',
        },
      ];

      const costData: CostData[] = [
        {
          id: 'c1',
          date: Date.now(),
          productId: 'prod1',
          plannedCost: 1000,
          actualCost: 1100,
          variance: 100,
          variancePercentage: 10,
        },
      ];

      const [prodResult, costResult] = await Promise.all([
        manager.analyzeProduction(prodData),
        manager.analyzeCost(costData),
      ]);

      expect(prodResult.type).toBe('production');
      expect(costResult.type).toBe('cost');
    });

    it('should calculate production metrics', async () => {
      const data: ProductionData[] = [
        {
          id: 'p1',
          date: Date.now(),
          productId: 'prod1',
          plannedQuantity: 100,
          actualQuantity: 95,
          plannedHours: 8,
          actualHours: 8.5,
          defectCount: 2,
          status: 'completed',
        },
      ];
      const result = await manager.analyzeProduction(data);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should identify process inefficiencies', async () => {
      const processes: ProcessData[] = [
        {
          id: 'p1',
          processId: 'proc1',
          processName: 'Assembly',
          capacity: 100,
          utilization: 50,
          bottleneckLevel: 30,
          cycleTime: 10,
          efficiency: 50,
        },
      ];
      const result = await manager.optimizeProcess(processes);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate forecast with confidence level', async () => {
      const data: ProductionData[] = [
        {
          id: 'p1',
          date: Date.now() - 30 * 24 * 60 * 60 * 1000,
          productId: 'prod1',
          plannedQuantity: 100,
          actualQuantity: 95,
          plannedHours: 8,
          actualHours: 8.5,
          defectCount: 2,
          status: 'completed',
        },
      ];
      const result = await manager.forecastProduction(data);
      expect(result.type).toBe('forecast');
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should handle edge case with zero production', async () => {
      const data: ProductionData[] = [
        {
          id: 'p1',
          date: Date.now(),
          productId: 'prod1',
          plannedQuantity: 0,
          actualQuantity: 0,
          plannedHours: 0,
          actualHours: 0,
          defectCount: 0,
          status: 'planned',
        },
      ];
      const result = await manager.analyzeProduction(data);
      expect(result.type).toBe('production');
    });

    it('should aggregate multiple quality metrics', async () => {
      const data: QualityData[] = [
        {
          id: 'q1',
          date: Date.now() - 24 * 60 * 60 * 1000,
          productId: 'prod1',
          totalProduced: 500,
          defectCount: 25,
          defectRate: 5,
          defectTypes: { scratch: 15, dent: 10 },
        },
        {
          id: 'q2',
          date: Date.now(),
          productId: 'prod1',
          totalProduced: 500,
          defectCount: 20,
          defectRate: 4,
          defectTypes: { scratch: 12, dent: 8 },
        },
      ];
      const result = await manager.analyzeQuality(data);
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should provide actionable recommendations', async () => {
      const data: ProductionData[] = [
        {
          id: 'p1',
          date: Date.now(),
          productId: 'prod1',
          plannedQuantity: 100,
          actualQuantity: 50,
          plannedHours: 8,
          actualHours: 16,
          defectCount: 10,
          status: 'delayed',
        },
      ];
      const result = await manager.analyzeProduction(data);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0]).toBeTruthy();
    });

    it('should calculate efficiency metrics correctly', async () => {
      const processes: ProcessData[] = [
        {
          id: 'p1',
          processId: 'proc1',
          processName: 'Assembly',
          capacity: 100,
          utilization: 80,
          bottleneckLevel: 60,
          cycleTime: 10,
          efficiency: 85,
        },
      ];
      const result = await manager.optimizeProcess(processes);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle cost analysis with variance', async () => {
      const data: CostData[] = [
        {
          id: 'c1',
          date: Date.now(),
          productId: 'prod1',
          plannedCost: 1000,
          actualCost: 900,
          variance: -100,
          variancePercentage: -10,
        },
      ];
      const result = await manager.analyzeCost(data);
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should forecast with historical data', async () => {
      const data: ProductionData[] = Array.from({ length: 10 }, (_, i) => ({
        id: `p${i}`,
        date: Date.now() - (10 - i) * 24 * 60 * 60 * 1000,
        productId: 'prod1',
        plannedQuantity: 100,
        actualQuantity: Math.max(80, 90 + i),
        plannedHours: 8,
        actualHours: Math.max(7, 8.5 - i * 0.1),
        defectCount: Math.max(0, 5 - i),
        status: 'completed' as const,
      }));
      const result = await manager.forecastProduction(data);
      expect(result.type).toBe('forecast');
    });
  });
});
