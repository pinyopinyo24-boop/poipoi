/**
 * Inventory Router
 * 在庫分析 + プレゼンテーション自動生成
 */

import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { AnalysisEngine } from './managers/AnalysisEngine';
import { PresentationAIManager } from './managers/PresentationAIManager';
import { PresentationRepository } from './managers/PresentationRepository';

// Types
export interface InventoryData {
  itemId: string;
  itemName: string;
  quantity: number;
  reorderLevel: number;
  maxLevel: number;
  unitCost: number;
  totalValue: number;
  turnoverRate: number;
  status: 'optimal' | 'low' | 'high' | 'critical';
}

// Managers
const analysisEngine = new AnalysisEngine();
const presentationRepository = new PresentationRepository();
const presentationManager = new PresentationAIManager(presentationRepository);

// In-memory storage
const inventoryStore: Map<string, InventoryData> = new Map();

/**
 * Inventory Router
 */
export const inventoryRouter = router({
  /**
   * 在庫アイテムを記録
   */
  recordInventory: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        itemName: z.string(),
        quantity: z.number(),
        reorderLevel: z.number(),
        maxLevel: z.number(),
        unitCost: z.number(),
        turnoverRate: z.number(),
      })
    )
    .mutation(({ input }) => {
      const totalValue = input.quantity * input.unitCost;
      const status: 'optimal' | 'low' | 'high' | 'critical' = 
        input.quantity < input.reorderLevel ? 'critical' :
        input.quantity < input.reorderLevel * 1.5 ? 'low' :
        input.quantity > input.maxLevel ? 'high' : 'optimal';

      const inventoryData: InventoryData = {
        itemId: input.itemId,
        itemName: input.itemName,
        quantity: input.quantity,
        reorderLevel: input.reorderLevel,
        maxLevel: input.maxLevel,
        unitCost: input.unitCost,
        totalValue,
        turnoverRate: input.turnoverRate,
        status,
      };

      inventoryStore.set(input.itemId, inventoryData);
      return { success: true, itemId: input.itemId };
    }),

  /**
   * 在庫を分析
   */
  analyzeInventory: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(['1w', '1m', '3m', '1y']).optional(),
      })
    )
    .mutation(({ input }) => {
      const allInventory: InventoryData[] = [];
      inventoryStore.forEach(item => {
        allInventory.push(item);
      });

      if (allInventory.length === 0) {
        return {
          success: false,
          error: 'No inventory data available',
        };
      }

      // Convert to numerical data
      const numericalData: Record<string, any> = {
        quantity: {
          sum: 0,
          average: 0,
          max: 0,
          min: Infinity,
          count: allInventory.length,
        },
        totalValue: {
          sum: 0,
          average: 0,
          max: 0,
          min: Infinity,
          count: allInventory.length,
        },
        turnoverRate: {
          sum: 0,
          average: 0,
          max: 0,
          min: Infinity,
          count: allInventory.length,
        },
      };

      // Calculate statistics
      for (const item of allInventory) {
        numericalData.quantity.sum += item.quantity;
        numericalData.quantity.max = Math.max(numericalData.quantity.max, item.quantity);
        numericalData.quantity.min = Math.min(numericalData.quantity.min, item.quantity);

        numericalData.totalValue.sum += item.totalValue;
        numericalData.totalValue.max = Math.max(numericalData.totalValue.max, item.totalValue);
        numericalData.totalValue.min = Math.min(numericalData.totalValue.min, item.totalValue);

        numericalData.turnoverRate.sum += item.turnoverRate;
        numericalData.turnoverRate.max = Math.max(numericalData.turnoverRate.max, item.turnoverRate);
        numericalData.turnoverRate.min = Math.min(numericalData.turnoverRate.min, item.turnoverRate);
      }

      // Calculate averages
      for (const key in numericalData) {
        numericalData[key].average = numericalData[key].sum / numericalData[key].count;
      }

      // Analyze
      const excelResult = {
        fileName: 'inventory-analysis.xlsx',
        sheets: [{ name: 'Inventory', data: [], headers: [] }],
        numericalData,
        statistics: {
          sheetCount: 1,
          totalRows: allInventory.length,
          totalColumns: 3,
        },
      };

      const analysis = analysisEngine.analyzeExcel(excelResult);

      return {
        success: true,
        analysis,
        itemCount: allInventory.length,
        totalValue: numericalData.totalValue.sum,
      };
    }),

  /**
   * 在庫分析からプレゼンテーションを生成
   */
  generateInventoryPresentation: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const allInventory: InventoryData[] = [];
      inventoryStore.forEach(item => {
        allInventory.push(item);
      });

      if (allInventory.length === 0) {
        return {
          success: false,
          error: 'No inventory data available',
        };
      }

      // Calculate statistics
      const numericalData: Record<string, any> = {
        quantity: { sum: 0, average: 0, max: 0, min: Infinity, count: allInventory.length },
        totalValue: { sum: 0, average: 0, max: 0, min: Infinity, count: allInventory.length },
        turnoverRate: { sum: 0, average: 0, max: 0, min: Infinity, count: allInventory.length },
      };

      for (const item of allInventory) {
        numericalData.quantity.sum += item.quantity;
        numericalData.quantity.max = Math.max(numericalData.quantity.max, item.quantity);
        numericalData.quantity.min = Math.min(numericalData.quantity.min, item.quantity);

        numericalData.totalValue.sum += item.totalValue;
        numericalData.totalValue.max = Math.max(numericalData.totalValue.max, item.totalValue);
        numericalData.totalValue.min = Math.min(numericalData.totalValue.min, item.totalValue);

        numericalData.turnoverRate.sum += item.turnoverRate;
        numericalData.turnoverRate.max = Math.max(numericalData.turnoverRate.max, item.turnoverRate);
        numericalData.turnoverRate.min = Math.min(numericalData.turnoverRate.min, item.turnoverRate);
      }

      for (const key in numericalData) {
        numericalData[key].average = numericalData[key].sum / numericalData[key].count;
      }

      // Analyze
      const excelResult = {
        fileName: 'inventory-analysis.xlsx',
        sheets: [{ name: 'Inventory', data: [], headers: [] }],
        numericalData,
        statistics: {
          sheetCount: 1,
          totalRows: allInventory.length,
          totalColumns: 3,
        },
      };

      const analysis = analysisEngine.analyzeExcel(excelResult);
      const presentationData = analysisEngine.generatePresentationData(analysis);

      // Create presentation
      const presentation = presentationManager.createPresentation(
        input.title || presentationData.title,
        'Inventory Analysis Report'
      );

      // Add slides
      for (const slideData of presentationData.slides) {
        presentationManager.addSlide(presentation.id, {
          title: slideData.title,
          content: slideData.content,
          layout: (slideData.layout || 'content') as 'title' | 'content' | 'two-column' | 'image-text' | 'chart' | 'table',
          elements: [],
        });
      }

      return {
        success: true,
        presentationId: presentation.id,
        title: presentation.title,
        slideCount: presentation.slides.length,
        totalValue: numericalData.totalValue.sum,
      };
    }),

  /**
   * 低在庫アイテムを取得
   */
  getLowStockItems: protectedProcedure
    .input(z.object({}).optional())
    .query(() => {
      const allInventory: InventoryData[] = [];
      inventoryStore.forEach(item => {
        allInventory.push(item);
      });

      const lowStockItems = allInventory.filter(
        item => item.status === 'low' || item.status === 'critical'
      );

      return {
        items: lowStockItems,
        count: lowStockItems.length,
        criticalCount: lowStockItems.filter(i => i.status === 'critical').length,
      };
    }),

  /**
   * 過剰在庫アイテムを取得
   */
  getOverstockItems: protectedProcedure
    .input(z.object({}).optional())
    .query(() => {
      const allInventory: InventoryData[] = [];
      inventoryStore.forEach(item => {
        allInventory.push(item);
      });

      const overstockItems = allInventory.filter(item => item.status === 'high');

      return {
        items: overstockItems,
        count: overstockItems.length,
        totalExcessValue: overstockItems.reduce((sum, i) => sum + i.totalValue, 0),
      };
    }),

  /**
   * 在庫回転率を分析
   */
  analyzeTurnoverRate: protectedProcedure
    .input(z.object({}).optional())
    .query(() => {
      const allInventory: InventoryData[] = [];
      inventoryStore.forEach(item => {
        allInventory.push(item);
      });

      if (allInventory.length === 0) {
        return {
          success: false,
          error: 'No inventory data available',
        };
      }

      const fastMoving = allInventory.filter(i => i.turnoverRate > 10);
      const slowMoving = allInventory.filter(i => i.turnoverRate < 2);
      const averageTurnover = allInventory.reduce((sum, i) => sum + i.turnoverRate, 0) / allInventory.length;

      return {
        success: true,
        averageTurnover,
        fastMovingCount: fastMoving.length,
        slowMovingCount: slowMoving.length,
        fastMovingItems: fastMoving,
        slowMovingItems: slowMoving,
      };
    }),

  /**
   * 在庫価値を計算
   */
  calculateInventoryValue: protectedProcedure
    .input(z.object({}).optional())
    .query(() => {
      const allInventory: InventoryData[] = [];
      inventoryStore.forEach(item => {
        allInventory.push(item);
      });

      const totalValue = allInventory.reduce((sum, i) => sum + i.totalValue, 0);
      const averageItemValue = allInventory.length > 0 ? totalValue / allInventory.length : 0;
      const maxValue = Math.max(...allInventory.map(i => i.totalValue), 0);
      const minValue = Math.min(...allInventory.map(i => i.totalValue), Infinity);

      return {
        totalValue,
        averageItemValue,
        maxValue,
        minValue,
        itemCount: allInventory.length,
      };
    }),

  /**
   * アイテム別在庫取得
   */
  getInventoryByItem: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
      })
    )
    .query(({ input }) => {
      const item = inventoryStore.get(input.itemId);
      
      if (!item) {
        return {
          success: false,
          error: 'Item not found',
        };
      }

      return {
        success: true,
        item,
      };
    }),

  /**
   * ステータス別在庫取得
   */
  getInventoryByStatus: protectedProcedure
    .input(
      z.object({
        status: z.enum(['optimal', 'low', 'high', 'critical']),
      })
    )
    .query(({ input }) => {
      const allInventory: InventoryData[] = [];
      inventoryStore.forEach(item => {
        allInventory.push(item);
      });

      const items = allInventory.filter(i => i.status === input.status);

      return {
        status: input.status,
        items,
        count: items.length,
      };
    }),
});
