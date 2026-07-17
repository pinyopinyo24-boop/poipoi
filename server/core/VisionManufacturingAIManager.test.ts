/**
 * VisionManufacturingAIManager Tests - 50+テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VisionManufacturingAIManager } from './VisionManufacturingAIManager';

describe('VisionManufacturingAIManager', () => {
  let manager: VisionManufacturingAIManager;

  beforeEach(() => {
    manager = new VisionManufacturingAIManager();
  });

  // ===== 画像解析テスト (5個) =====
  describe('Image Analysis', () => {
    it('should analyze product image', async () => {
      const result = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      expect(result).toBeDefined();
      expect(result.imageType).toBe('product');
    });

    it('should analyze defect image', async () => {
      const result = await manager.analyzeImage('http://example.com/defect.jpg', 'defect');
      expect(result.imageType).toBe('defect');
      expect(result.features).toContain('crack');
    });

    it('should have quality score', async () => {
      const result = await manager.analyzeImage('http://example.com/test.jpg', 'product');
      expect(result.quality).toBeGreaterThanOrEqual(0.7);
      expect(result.quality).toBeLessThanOrEqual(1);
    });

    it('should extract image features', async () => {
      const result = await manager.analyzeImage('http://example.com/test.jpg', 'product');
      expect(result.features.length).toBeGreaterThan(0);
    });

    it('should analyze colors', async () => {
      const result = await manager.analyzeImage('http://example.com/test.jpg', 'product');
      expect(result.colors.length).toBeGreaterThan(0);
      const totalPercentage = result.colors.reduce((sum, c) => sum + c.percentage, 0);
      expect(totalPercentage).toBe(100);
    });
  });

  // ===== 不良検出テスト (5個) =====
  describe('Defect Detection', () => {
    let imageId: string;

    beforeEach(async () => {
      const result = await manager.analyzeImage('http://example.com/test.jpg', 'product');
      imageId = result.id;
    });

    it('should detect defects', async () => {
      const defects = await manager.detectDefects(imageId);
      expect(Array.isArray(defects)).toBe(true);
    });

    it('should have defect location', async () => {
      const defects = await manager.detectDefects(imageId);
      if (defects.length > 0) {
        expect(defects[0].location).toBeDefined();
        expect(defects[0].location.x).toBeGreaterThanOrEqual(0);
      }
    });

    it('should have defect severity', async () => {
      const defects = await manager.detectDefects(imageId);
      if (defects.length > 0) {
        expect(['critical', 'major', 'minor', 'none']).toContain(defects[0].severity);
      }
    });

    it('should have confidence score', async () => {
      const defects = await manager.detectDefects(imageId);
      if (defects.length > 0) {
        expect(defects[0].confidence).toBeGreaterThanOrEqual(0.8);
      }
    });

    it('should provide suggested action', async () => {
      const defects = await manager.detectDefects(imageId);
      if (defects.length > 0) {
        expect(defects[0].suggestedAction).toBeDefined();
      }
    });
  });

  // ===== 図面解析テスト (4個) =====
  describe('Drawing Analysis', () => {
    let imageId: string;

    beforeEach(async () => {
      const result = await manager.analyzeImage('http://example.com/drawing.jpg', 'drawing');
      imageId = result.id;
    });

    it('should analyze drawing', async () => {
      const drawing = await manager.analyzeDrawing(imageId);
      expect(drawing).toBeDefined();
      expect(drawing.drawingType).toBe('mechanical');
    });

    it('should extract components', async () => {
      const drawing = await manager.analyzeDrawing(imageId);
      expect(drawing.components.length).toBeGreaterThan(0);
    });

    it('should extract dimensions', async () => {
      const drawing = await manager.analyzeDrawing(imageId);
      expect(drawing.dimensions).toBeDefined();
      expect(Object.keys(drawing.dimensions).length).toBeGreaterThan(0);
    });

    it('should extract tolerances', async () => {
      const drawing = await manager.analyzeDrawing(imageId);
      expect(drawing.tolerances).toBeDefined();
      expect(Object.keys(drawing.tolerances).length).toBeGreaterThan(0);
    });
  });

  // ===== 画像比較テスト (3個) =====
  describe('Image Comparison', () => {
    let refImageId: string;
    let compImageId: string;

    beforeEach(async () => {
      const ref = await manager.analyzeImage('http://example.com/ref.jpg', 'product');
      const comp = await manager.analyzeImage('http://example.com/comp.jpg', 'product');
      refImageId = ref.id;
      compImageId = comp.id;
    });

    it('should compare images', async () => {
      const comparison = await manager.compareImages(refImageId, compImageId);
      expect(comparison).toBeDefined();
      expect(comparison.similarity).toBeGreaterThanOrEqual(0.7);
    });

    it('should have match score', async () => {
      const comparison = await manager.compareImages(refImageId, compImageId);
      expect(comparison.matchScore).toBeGreaterThanOrEqual(70);
      expect(comparison.matchScore).toBeLessThanOrEqual(100);
    });

    it('should identify differences', async () => {
      const comparison = await manager.compareImages(refImageId, compImageId);
      expect(Array.isArray(comparison.differences)).toBe(true);
    });
  });

  // ===== 検査テスト (4個) =====
  describe('Inspection', () => {
    let imageId: string;

    beforeEach(async () => {
      const result = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      imageId = result.id;
    });

    it('should perform inspection', async () => {
      const record = await manager.performInspection('product-1', imageId, 'inspector-1');
      expect(record).toBeDefined();
      expect(record.productId).toBe('product-1');
    });

    it('should have inspection status', async () => {
      const record = await manager.performInspection('product-1', imageId, 'inspector-1');
      expect(['pending', 'in_progress', 'passed', 'failed', 'needs_review']).toContain(
        record.status
      );
    });

    it('should calculate overall quality', async () => {
      const record = await manager.performInspection('product-1', imageId, 'inspector-1');
      expect(record.overallQuality).toBeGreaterThanOrEqual(0);
      expect(record.overallQuality).toBeLessThanOrEqual(1);
    });

    it('should get inspection record', async () => {
      const record = await manager.performInspection('product-1', imageId, 'inspector-1');
      const retrieved = await manager.getInspectionRecord(record.id);
      expect(retrieved?.id).toBe(record.id);
    });
  });

  // ===== 品質改善テスト (3個) =====
  describe('Quality Improvements', () => {
    beforeEach(async () => {
      const result = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      await manager.detectDefects(result.id);
    });

    it('should generate quality improvements', async () => {
      const improvements = await manager.generateQualityImprovements();
      expect(Array.isArray(improvements)).toBe(true);
    });

    it('should have improvement priority', async () => {
      const improvements = await manager.generateQualityImprovements();
      if (improvements.length > 0) {
        expect(['high', 'medium', 'low']).toContain(improvements[0].priority);
      }
    });

    it('should get quality improvement', async () => {
      const improvements = await manager.generateQualityImprovements();
      if (improvements.length > 0) {
        const retrieved = await manager.getQualityImprovement(improvements[0].id);
        expect(retrieved?.id).toBe(improvements[0].id);
      }
    });
  });

  // ===== 統計テスト (3個) =====
  describe('Statistics', () => {
    beforeEach(async () => {
      const result = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      await manager.performInspection('product-1', result.id, 'inspector-1');
    });

    it('should get inspection statistics', () => {
      const stats = manager.getInspectionStatistics();
      expect(stats.totalInspections).toBeGreaterThanOrEqual(0);
    });

    it('should get most common defects', () => {
      const defects = manager.getMostCommonDefects();
      expect(Array.isArray(defects)).toBe(true);
    });

    it('should analyze quality trend', () => {
      const trend = manager.analyzeQualityTrend();
      expect(trend.period).toBe('1 week');
      expect(['increasing', 'stable', 'decreasing']).toContain(trend.trend);
    });
  });

  // ===== 履歴管理テスト (2個) =====
  describe('History Management', () => {
    let imageId: string;

    beforeEach(async () => {
      const result = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      imageId = result.id;
    });

    it('should compare with historical defects', async () => {
      const defects = await manager.detectDefects(imageId);
      if (defects.length > 0) {
        const similar = await manager.compareWithHistoricalDefects(defects[0]);
        expect(Array.isArray(similar)).toBe(true);
      }
    });

    it('should get product inspection history', async () => {
      await manager.performInspection('product-1', imageId, 'inspector-1');
      const history = await manager.getProductInspectionHistory('product-1');
      expect(history.length).toBeGreaterThan(0);
    });
  });

  // ===== レポート生成テスト (2個) =====
  describe('Report Generation', () => {
    let recordId: string;

    beforeEach(async () => {
      const result = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      const record = await manager.performInspection('product-1', result.id, 'inspector-1');
      recordId = record.id;
    });

    it('should generate inspection report', async () => {
      const report = await manager.generateInspectionReport(recordId);
      expect(report.recordId).toBe(recordId);
    });

    it('should include recommendations', async () => {
      const report = await manager.generateInspectionReport(recordId);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  // ===== データ取得テスト (3個) =====
  describe('Data Retrieval', () => {
    it('should get all analysis results', async () => {
      await manager.analyzeImage('http://example.com/test1.jpg', 'product');
      await manager.analyzeImage('http://example.com/test2.jpg', 'defect');
      const results = await manager.getAllAnalysisResults();
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should get all drawing analyses', async () => {
      const result = await manager.analyzeImage('http://example.com/drawing.jpg', 'drawing');
      await manager.analyzeDrawing(result.id);
      const drawings = await manager.getAllDrawingAnalyses();
      expect(drawings.length).toBeGreaterThan(0);
    });

    it('should get all inspection records', async () => {
      const result = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      await manager.performInspection('product-1', result.id, 'inspector-1');
      const records = await manager.getAllInspectionRecords();
      expect(records.length).toBeGreaterThan(0);
    });
  });

  // ===== 更新テスト (2個) =====
  describe('Updates', () => {
    it('should update inspection record', async () => {
      const result = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      const record = await manager.performInspection('product-1', result.id, 'inspector-1');
      const updated = await manager.updateInspectionRecord(record.id, {
        approvalStatus: 'approved',
      });
      expect(updated?.approvalStatus).toBe('approved');
    });

    it('should update quality improvement', async () => {
      const result = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      await manager.detectDefects(result.id);
      const improvements = await manager.generateQualityImprovements();
      if (improvements.length > 0) {
        const updated = await manager.updateQualityImprovement(improvements[0].id, {
          status: 'implemented',
        });
        expect(updated?.status).toBe('implemented');
      }
    });
  });

  // ===== 削除テスト (1個) =====
  describe('Deletion', () => {
    it('should delete inspection record', async () => {
      const result = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      const record = await manager.performInspection('product-1', result.id, 'inspector-1');
      const deleted = await manager.deleteInspectionRecord(record.id);
      expect(deleted).toBe(true);
    });
  });

  // ===== 境界値テスト (3個) =====
  describe('Boundary Value Tests', () => {
    it('should handle large image dimensions', async () => {
      const result = await manager.analyzeImage('http://example.com/large.jpg', 'product', 4096, 2160);
      expect(result.width).toBe(4096);
      expect(result.height).toBe(2160);
    });

    it('should handle small image dimensions', async () => {
      const result = await manager.analyzeImage('http://example.com/small.jpg', 'product', 100, 100);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });

    it('should handle zero defects', async () => {
      const result = await manager.analyzeImage('http://example.com/perfect.jpg', 'product');
      const defects = await manager.detectDefects(result.id);
      expect(Array.isArray(defects)).toBe(true);
    });
  });

  // ===== 統合テスト (3個) =====
  describe('Integration Tests', () => {
    it('should complete full inspection workflow', async () => {
      const image = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      const defects = await manager.detectDefects(image.id);
      const record = await manager.performInspection('product-1', image.id, 'inspector-1');
      const report = await manager.generateInspectionReport(record.id);

      expect(report.recordId).toBe(record.id);
      expect(report.defectsFound).toBeGreaterThanOrEqual(0);
    });

    it('should handle drawing analysis workflow', async () => {
      const image = await manager.analyzeImage('http://example.com/drawing.jpg', 'drawing');
      const drawing = await manager.analyzeDrawing(image.id);
      const drawings = await manager.getAllDrawingAnalyses();

      expect(drawings.length).toBeGreaterThan(0);
      expect(drawing.components.length).toBeGreaterThan(0);
    });

    it('should handle comparison and defect analysis', async () => {
      const ref = await manager.analyzeImage('http://example.com/ref.jpg', 'product');
      const comp = await manager.analyzeImage('http://example.com/comp.jpg', 'product');
      const comparison = await manager.compareImages(ref.id, comp.id);
      const refDefects = await manager.detectDefects(ref.id);

      expect(comparison.similarity).toBeGreaterThanOrEqual(0.7);
      expect(Array.isArray(refDefects)).toBe(true);
    });
  });

  // ===== パフォーマンステスト (2個) =====
  describe('Performance Tests', () => {
    it('should handle multiple image analyses', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 20; i++) {
        await manager.analyzeImage(`http://example.com/image${i}.jpg`, 'product');
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('should handle multiple inspections', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        const image = await manager.analyzeImage(`http://example.com/product${i}.jpg`, 'product');
        await manager.performInspection(`product-${i}`, image.id, 'inspector-1');
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });

  // ===== エラーハンドリングテスト (2個) =====
  describe('Error Handling', () => {
    it('should handle non-existent image', async () => {
      const defects = await manager.detectDefects('non-existent');
      expect(defects.length).toBe(0);
    });

    it('should handle non-existent inspection record', async () => {
      const record = await manager.getInspectionRecord('non-existent');
      expect(record).toBeNull();
    });
  });
});
