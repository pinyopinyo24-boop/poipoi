import type { ProductionData, ProcessData, CostData, QualityData } from '../core/ManufacturingIntelligenceAIManager';

export class ManufacturingValidator {
  /**
   * 生産データを検証
   */
  validateProductionData(data: ProductionData[]): boolean {
    if (!Array.isArray(data)) return false;

    return data.every((item) => {
      return (
        typeof item.id === 'string' &&
        typeof item.date === 'number' &&
        typeof item.productId === 'string' &&
        typeof item.plannedQuantity === 'number' &&
        typeof item.actualQuantity === 'number' &&
        typeof item.plannedHours === 'number' &&
        typeof item.actualHours === 'number' &&
        typeof item.defectCount === 'number' &&
        ['planned', 'in_progress', 'completed', 'delayed'].includes(item.status) &&
        item.plannedQuantity >= 0 &&
        item.actualQuantity >= 0 &&
        item.plannedHours >= 0 &&
        item.actualHours >= 0 &&
        item.defectCount >= 0
      );
    });
  }

  /**
   * 工程データを検証
   */
  validateProcessData(data: ProcessData[]): boolean {
    if (!Array.isArray(data)) return false;

    return data.every((item) => {
      return (
        typeof item.id === 'string' &&
        typeof item.processId === 'string' &&
        typeof item.processName === 'string' &&
        typeof item.capacity === 'number' &&
        typeof item.utilization === 'number' &&
        typeof item.bottleneckLevel === 'number' &&
        typeof item.cycleTime === 'number' &&
        typeof item.efficiency === 'number' &&
        item.capacity > 0 &&
        item.utilization >= 0 &&
        item.utilization <= 100 &&
        item.bottleneckLevel >= 0 &&
        item.bottleneckLevel <= 100 &&
        item.cycleTime >= 0 &&
        item.efficiency >= 0 &&
        item.efficiency <= 100
      );
    });
  }

  /**
   * 原価データを検証
   */
  validateCostData(data: CostData[]): boolean {
    if (!Array.isArray(data)) return false;

    return data.every((item) => {
      return (
        typeof item.id === 'string' &&
        typeof item.date === 'number' &&
        typeof item.productId === 'string' &&
        typeof item.plannedCost === 'number' &&
        typeof item.actualCost === 'number' &&
        typeof item.variance === 'number' &&
        typeof item.variancePercentage === 'number' &&
        item.plannedCost >= 0 &&
        item.actualCost >= 0
      );
    });
  }

  /**
   * 品質データを検証
   */
  validateQualityData(data: QualityData[]): boolean {
    if (!Array.isArray(data)) return false;

    return data.every((item) => {
      return (
        typeof item.id === 'string' &&
        typeof item.date === 'number' &&
        typeof item.productId === 'string' &&
        typeof item.totalProduced === 'number' &&
        typeof item.defectCount === 'number' &&
        typeof item.defectRate === 'number' &&
        typeof item.defectTypes === 'object' &&
        item.totalProduced > 0 &&
        item.defectCount >= 0 &&
        item.defectRate >= 0 &&
        item.defectRate <= 100
      );
    });
  }

  /**
   * 生産データの妥当性をチェック
   */
  validateProductionLogic(data: ProductionData[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const item of data) {
      if (item.actualQuantity > item.plannedQuantity * 1.5) {
        errors.push(`Actual quantity exceeds planned by more than 50% for product ${item.productId}`);
      }

      if (item.actualHours > item.plannedHours * 2) {
        errors.push(`Actual hours exceed planned by more than 100% for product ${item.productId}`);
      }

      if (item.defectCount > item.actualQuantity * 0.1) {
        errors.push(`Defect rate exceeds 10% for product ${item.productId}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 原価データの妥当性をチェック
   */
  validateCostLogic(data: CostData[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const item of data) {
      if (item.actualCost > item.plannedCost * 2) {
        errors.push(`Actual cost exceeds planned by more than 100% for product ${item.productId}`);
      }

      const calculatedVariance = item.actualCost - item.plannedCost;
      if (Math.abs(calculatedVariance - item.variance) > 0.01) {
        errors.push(`Variance calculation mismatch for product ${item.productId}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
