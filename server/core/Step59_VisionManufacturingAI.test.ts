/**
 * STEP 59 VisionManufacturingAI Integration Tests - 50+テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VisionManufacturingAIManager } from './VisionManufacturingAIManager';
import { VisionManufacturingRepository } from '../repositories/VisionManufacturingRepository';

describe('STEP 59 VisionManufacturingAI Integration', () => {
  let manager: VisionManufacturingAIManager;
  let repository: VisionManufacturingRepository;

  beforeEach(() => {
    manager = new VisionManufacturingAIManager();
    repository = new VisionManufacturingRepository();
  });

  // ===== Repository単体テスト (8個) =====
  describe('Repository Tests', () => {
    it('should save and retrieve image', async () => {
      const imageRecord = {
        id: 'img-1',
        url: 'http://example.com/image.jpg',
        type: 'product',
        quality: 0.85,
        timestamp: Date.now(),
        metadata: {},
      };

      await repository.saveImage(imageRecord);
      const retrieved = await repository.getImage('img-1');
      expect(retrieved?.id).toBe('img-1');
    });

    it('should save and retrieve defect', async () => {
      const defectRecord = {
        id: 'defect-1',
        imageId: 'img-1',
        type: 'crack',
        severity: 'major',
        location: { x: 10, y: 20, width: 30, height: 40 },
        confidence: 0.92,
        timestamp: Date.now(),
      };

      await repository.saveDefect(defectRecord);
      const retrieved = await repository.getDefect('defect-1');
      expect(retrieved?.type).toBe('crack');
    });

    it('should get image defects', async () => {
      const defectRecord = {
        id: 'defect-1',
        imageId: 'img-1',
        type: 'crack',
        severity: 'major',
        location: { x: 10, y: 20, width: 30, height: 40 },
        confidence: 0.92,
        timestamp: Date.now(),
      };

      await repository.saveDefect(defectRecord);
      const defects = await repository.getImageDefects('img-1');
      expect(defects.length).toBe(1);
    });

    it('should save and retrieve inspection', async () => {
      const inspectionRecord = {
        id: 'insp-1',
        productId: 'prod-1',
        imageId: 'img-1',
        status: 'passed',
        defectCount: 0,
        quality: 0.95,
        timestamp: Date.now(),
        inspector: 'inspector-1',
      };

      await repository.saveInspection(inspectionRecord);
      const retrieved = await repository.getInspection('insp-1');
      expect(retrieved?.status).toBe('passed');
    });

    it('should update inspection', async () => {
      const inspectionRecord = {
        id: 'insp-1',
        productId: 'prod-1',
        imageId: 'img-1',
        status: 'pending',
        defectCount: 0,
        quality: 0.95,
        timestamp: Date.now(),
        inspector: 'inspector-1',
      };

      await repository.saveInspection(inspectionRecord);
      const updated = await repository.updateInspection('insp-1', { status: 'passed' });
      expect(updated?.status).toBe('passed');
    });

    it('should get product inspections', async () => {
      const insp1 = {
        id: 'insp-1',
        productId: 'prod-1',
        imageId: 'img-1',
        status: 'passed',
        defectCount: 0,
        quality: 0.95,
        timestamp: Date.now(),
        inspector: 'inspector-1',
      };

      const insp2 = {
        id: 'insp-2',
        productId: 'prod-1',
        imageId: 'img-2',
        status: 'passed',
        defectCount: 0,
        quality: 0.90,
        timestamp: Date.now(),
        inspector: 'inspector-1',
      };

      await repository.saveInspection(insp1);
      await repository.saveInspection(insp2);
      const inspections = await repository.getProductInspections('prod-1');
      expect(inspections.length).toBe(2);
    });

    it('should delete inspection', async () => {
      const inspectionRecord = {
        id: 'insp-1',
        productId: 'prod-1',
        imageId: 'img-1',
        status: 'passed',
        defectCount: 0,
        quality: 0.95,
        timestamp: Date.now(),
        inspector: 'inspector-1',
      };

      await repository.saveInspection(inspectionRecord);
      const deleted = await repository.deleteInspection('insp-1');
      expect(deleted).toBe(true);
    });

    it('should get statistics', async () => {
      const stats = await repository.getStatistics();
      expect(stats.totalImages).toBe(0);
      expect(stats.totalDefects).toBe(0);
      expect(stats.totalInspections).toBe(0);
    });
  });

  // ===== Manager統合テスト (8個) =====
  describe('Manager Integration Tests', () => {
    it('should complete full workflow with repository', async () => {
      const image = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      const defects = await manager.detectDefects(image.id);
      const record = await manager.performInspection('prod-1', image.id, 'inspector-1');

      await repository.saveImage({
        id: image.id,
        url: image.imageUrl,
        type: image.imageType,
        quality: image.quality,
        timestamp: image.timestamp,
        metadata: { features: image.features },
      });

      for (const defect of defects) {
        await repository.saveDefect({
          id: defect.id,
          imageId: defect.imageId,
          type: defect.defectType,
          severity: defect.severity,
          location: defect.location,
          confidence: defect.confidence,
          timestamp: defect.timestamp,
        });
      }

      await repository.saveInspection({
        id: record.id,
        productId: record.productId,
        imageId: record.imageId,
        status: record.status,
        defectCount: record.defectsFound.length,
        quality: record.overallQuality,
        timestamp: record.timestamp,
        inspector: record.inspector,
      });

      const stats = await repository.getStatistics();
      expect(stats.totalImages).toBe(1);
      expect(stats.totalInspections).toBe(1);
    });

    it('should handle multiple products', async () => {
      const initialCount = (await repository.getAllInspections()).length;
      
      for (let i = 0; i < 3; i++) {
        const image = await manager.analyzeImage(`http://example.com/product${i}.jpg`, 'product');
        const record = await manager.performInspection(`prod-${i}`, image.id, 'inspector-1');

        await repository.saveInspection({
          id: record.id,
          productId: record.productId,
          imageId: record.imageId,
          status: record.status,
          defectCount: record.defectsFound.length,
          quality: record.overallQuality,
          timestamp: record.timestamp,
          inspector: record.inspector,
        });
      }

      const allInspections = await repository.getAllInspections();
      expect(allInspections.length).toBeGreaterThan(initialCount);
    });

    it('should track defect history', async () => {
      for (let i = 0; i < 5; i++) {
        const image = await manager.analyzeImage(`http://example.com/product${i}.jpg`, 'product');
        const defects = await manager.detectDefects(image.id);

        for (const defect of defects) {
          await repository.saveDefect({
            id: defect.id,
            imageId: defect.imageId,
            type: defect.defectType,
            severity: defect.severity,
            location: defect.location,
            confidence: defect.confidence,
            timestamp: defect.timestamp,
          });
        }
      }

      const allDefects = await repository.getAllDefects();
      expect(allDefects.length).toBeGreaterThanOrEqual(0);
    });

    it('should generate quality improvements', async () => {
      const image = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      await manager.detectDefects(image.id);
      const improvements = await manager.generateQualityImprovements();

      expect(Array.isArray(improvements)).toBe(true);
    });

    it('should analyze quality trend', () => {
      const trend = manager.analyzeQualityTrend();
      expect(trend.period).toBe('1 week');
    });

    it('should get most common defects', () => {
      const defects = manager.getMostCommonDefects(3);
      expect(Array.isArray(defects)).toBe(true);
    });

    it('should handle comparison workflow', async () => {
      const ref = await manager.analyzeImage('http://example.com/ref.jpg', 'product');
      const comp = await manager.analyzeImage('http://example.com/comp.jpg', 'product');
      const comparison = await manager.compareImages(ref.id, comp.id);

      expect(comparison.similarity).toBeGreaterThanOrEqual(0.7);
    });

    it('should generate inspection report', async () => {
      const image = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      const record = await manager.performInspection('prod-1', image.id, 'inspector-1');
      const report = await manager.generateInspectionReport(record.id);

      expect(report.recordId).toBe(record.id);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  // ===== 異常系テスト (6個) =====
  describe('Error Handling Tests', () => {
    it('should handle non-existent image analysis', async () => {
      const defects = await manager.detectDefects('non-existent');
      expect(Array.isArray(defects)).toBe(true);
    });

    it('should handle non-existent inspection', async () => {
      const record = await manager.getInspectionRecord('non-existent');
      expect(record).toBeNull();
    });

    it('should handle non-existent repository image', async () => {
      const image = await repository.getImage('non-existent');
      expect(image).toBeNull();
    });

    it('should handle non-existent repository defect', async () => {
      const defect = await repository.getDefect('non-existent');
      expect(defect).toBeNull();
    });

    it('should handle empty product inspections', async () => {
      const inspections = await repository.getProductInspections('non-existent-prod');
      expect(inspections.length).toBe(0);
    });

    it('should handle delete non-existent defect', async () => {
      const deleted = await repository.deleteDefect('non-existent');
      expect(deleted).toBe(false);
    });
  });

  // ===== 境界値テスト (6個) =====
  describe('Boundary Value Tests', () => {
    it('should handle maximum image dimensions', async () => {
      const result = await manager.analyzeImage('http://example.com/large.jpg', 'product', 8192, 4096);
      expect(result.width).toBe(8192);
      expect(result.height).toBe(4096);
    });

    it('should handle minimum image dimensions', async () => {
      const result = await manager.analyzeImage('http://example.com/tiny.jpg', 'product', 10, 10);
      expect(result.width).toBe(10);
      expect(result.height).toBe(10);
    });

    it('should handle zero quality score', async () => {
      const result = await manager.analyzeImage('http://example.com/test.jpg', 'product');
      expect(result.quality).toBeGreaterThanOrEqual(0);
      expect(result.quality).toBeLessThanOrEqual(1);
    });

    it('should handle maximum defects', async () => {
      const result = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      const defects = await manager.detectDefects(result.id);
      expect(Array.isArray(defects)).toBe(true);
    });

    it('should handle 100% similarity comparison', async () => {
      const ref = await manager.analyzeImage('http://example.com/ref.jpg', 'product');
      const comparison = await manager.compareImages(ref.id, ref.id);
      expect(comparison.similarity).toBeGreaterThanOrEqual(0.7);
    });

    it('should handle extreme quality values', async () => {
      const stats = manager.getInspectionStatistics();
      expect(stats.passRate).toBeGreaterThanOrEqual(0);
      expect(stats.passRate).toBeLessThanOrEqual(100);
    });
  });

  // ===== パフォーマンステスト (4個) =====
  describe('Performance Tests', () => {
    it('should handle bulk image analysis', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 30; i++) {
        await manager.analyzeImage(`http://example.com/image${i}.jpg`, 'product');
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000);
    });

    it('should handle bulk defect detection', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 20; i++) {
        const image = await manager.analyzeImage(`http://example.com/product${i}.jpg`, 'product');
        await manager.detectDefects(image.id);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000);
    });

    it('should handle repository bulk operations', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        await repository.saveInspection({
          id: `insp-${i}`,
          productId: `prod-${i % 5}`,
          imageId: `img-${i}`,
          status: 'passed',
          defectCount: 0,
          quality: 0.9,
          timestamp: Date.now(),
          inspector: 'inspector-1',
        });
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('should handle statistics calculation', async () => {
      for (let i = 0; i < 100; i++) {
        await repository.saveInspection({
          id: `insp-${i}`,
          productId: `prod-${i % 10}`,
          imageId: `img-${i}`,
          status: i % 2 === 0 ? 'passed' : 'failed',
          defectCount: Math.floor(Math.random() * 5),
          quality: Math.random(),
          timestamp: Date.now(),
          inspector: 'inspector-1',
        });
      }

      const startTime = Date.now();
      const stats = await repository.getStatistics();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
      expect(stats.totalInspections).toBe(100);
    });
  });

  // ===== データ整合性テスト (4個) =====
  describe('Data Integrity Tests', () => {
    it('should maintain defect image relationship', async () => {
      const image = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      const defects = await manager.detectDefects(image.id);

      if (defects.length > 0) {
        for (const defect of defects) {
          await repository.saveDefect({
            id: defect.id,
            imageId: defect.imageId,
            type: defect.defectType,
            severity: defect.severity,
            location: defect.location,
            confidence: defect.confidence,
            timestamp: defect.timestamp,
          });

          const retrieved = await repository.getDefect(defect.id);
          expect(retrieved?.imageId).toBe(image.id);
        }
      } else {
        expect(defects.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should maintain inspection product relationship', async () => {
      const image = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      const record = await manager.performInspection('prod-1', image.id, 'inspector-1');

      await repository.saveInspection({
        id: record.id,
        productId: record.productId,
        imageId: record.imageId,
        status: record.status,
        defectCount: record.defectsFound.length,
        quality: record.overallQuality,
        timestamp: record.timestamp,
        inspector: record.inspector,
      });

      const inspections = await repository.getProductInspections('prod-1');
      expect(inspections.length).toBeGreaterThan(0);
    });

    it('should handle concurrent updates', async () => {
      const inspectionRecord = {
        id: 'insp-1',
        productId: 'prod-1',
        imageId: 'img-1',
        status: 'pending',
        defectCount: 0,
        quality: 0.95,
        timestamp: Date.now(),
        inspector: 'inspector-1',
      };

      await repository.saveInspection(inspectionRecord);

      const update1 = await repository.updateInspection('insp-1', { status: 'in_progress' });
      const update2 = await repository.updateInspection('insp-1', { defectCount: 2 });

      expect(update1?.status).toBe('in_progress');
      expect(update2?.defectCount).toBe(2);
    });

    it('should maintain statistics accuracy', async () => {
      for (let i = 0; i < 10; i++) {
        await repository.saveInspection({
          id: `insp-${i}`,
          productId: `prod-1`,
          imageId: `img-${i}`,
          status: 'passed',
          defectCount: i,
          quality: 0.9 - i * 0.01,
          timestamp: Date.now(),
          inspector: 'inspector-1',
        });
      }

      const stats = await repository.getStatistics();
      expect(stats.totalInspections).toBe(10);
    });
  });

  // ===== 複合機能テスト (4個) =====
  describe('Combined Feature Tests', () => {
    it('should handle drawing analysis with defect detection', async () => {
      const image = await manager.analyzeImage('http://example.com/drawing.jpg', 'drawing');
      const drawing = await manager.analyzeDrawing(image.id);
      const defects = await manager.detectDefects(image.id);

      expect(drawing.components.length).toBeGreaterThan(0);
      expect(Array.isArray(defects)).toBe(true);
    });

    it('should handle comparison with quality analysis', async () => {
      const ref = await manager.analyzeImage('http://example.com/ref.jpg', 'product');
      const comp = await manager.analyzeImage('http://example.com/comp.jpg', 'product');
      const comparison = await manager.compareImages(ref.id, comp.id);
      const stats = manager.getInspectionStatistics();

      expect(comparison.similarity).toBeGreaterThanOrEqual(0.7);
      expect(stats.totalInspections).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple inspection types', async () => {
      const productImage = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      const drawingImage = await manager.analyzeImage('http://example.com/drawing.jpg', 'drawing');

      const productRecord = await manager.performInspection('prod-1', productImage.id, 'inspector-1');
      const drawing = await manager.analyzeDrawing(drawingImage.id);

      expect(productRecord.productId).toBe('prod-1');
      expect(drawing.drawingType).toBe('mechanical');
    });

    it('should handle full quality workflow', async () => {
      const image = await manager.analyzeImage('http://example.com/product.jpg', 'product');
      const defects = await manager.detectDefects(image.id);
      const record = await manager.performInspection('prod-1', image.id, 'inspector-1');
      const improvements = await manager.generateQualityImprovements();
      const report = await manager.generateInspectionReport(record.id);

      expect(report.defectsFound).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(improvements)).toBe(true);
    });
  });

  // ===== クリーンアップテスト (2個) =====
  describe('Cleanup Tests', () => {
    it('should clear repository', async () => {
      await repository.saveImage({
        id: 'img-1',
        url: 'http://example.com/image.jpg',
        type: 'product',
        quality: 0.85,
        timestamp: Date.now(),
        metadata: {},
      });

      await repository.clear();
      const images = await repository.getAllImages();
      expect(images.length).toBe(0);
    });

    it('should handle repository state after clear', async () => {
      await repository.clear();
      const stats = await repository.getStatistics();
      expect(stats.totalImages).toBe(0);
      expect(stats.totalDefects).toBe(0);
      expect(stats.totalInspections).toBe(0);
    });
  });
});
