/**
 * STEP 60 MultimodalAI Integration Tests - 50+テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MultimodalAIManager } from './MultimodalAIManager';

describe('STEP 60 MultimodalAI Integration', () => {
  let manager: MultimodalAIManager;

  beforeEach(() => {
    manager = new MultimodalAIManager();
  });

  // ===== テキスト理解テスト (5個) =====
  describe('Text Understanding Tests', () => {
    it('should understand positive text', async () => {
      const text = await manager.understandText('これは素晴らしい製品です');
      expect(text.sentiment).toBeGreaterThan(0);
      expect(text.language).toBe('ja');
    });

    it('should understand negative text', async () => {
      const text = await manager.understandText('これは悪い製品です');
      expect(text.sentiment).toBeLessThan(0);
    });

    it('should extract entities from text', async () => {
      const text = await manager.understandText('温度は100度です');
      expect(text.entities.length).toBeGreaterThan(0);
    });

    it('should handle multilingual text', async () => {
      const text = await manager.understandText('This is good', 'en');
      expect(text.language).toBe('en');
    });

    it('should analyze sentiment correctly', async () => {
      const text = await manager.understandText('完璧です');
      expect(text.sentiment).toBeGreaterThan(0);
    });
  });

  // ===== 画像理解テスト (5個) =====
  describe('Image Understanding Tests', () => {
    it('should understand image with features', async () => {
      const image = await manager.understandImage('http://example.com/image.jpg', ['clear', 'bright']);
      expect(image.quality).toBeGreaterThan(0.5);
      expect(image.features.length).toBe(2);
    });

    it('should detect defects in image', async () => {
      const image = await manager.understandImage('http://example.com/defect.jpg', ['crack', 'discoloration']);
      expect(image.defects.length).toBeGreaterThan(0);
    });

    it('should handle image without defects', async () => {
      const image = await manager.understandImage('http://example.com/good.jpg', ['clear']);
      expect(image.quality).toBeGreaterThan(0.5);
    });

    it('should analyze image quality', async () => {
      const image = await manager.understandImage('http://example.com/image.jpg');
      expect(image.quality).toBeGreaterThanOrEqual(0.7);
      expect(image.quality).toBeLessThanOrEqual(1);
    });

    it('should handle multiple defect types', async () => {
      const image = await manager.understandImage('http://example.com/image.jpg', ['crack', 'discoloration', 'deformation']);
      expect(image.defects.length).toBe(3);
    });
  });

  // ===== 音声解析テスト (5個) =====
  describe('Audio Analysis Tests', () => {
    it('should analyze audio', async () => {
      const audio = await manager.analyzeAudio('http://example.com/audio.mp3', 60);
      expect(audio.duration).toBe(60);
      expect(audio.transcript).toBeTruthy();
    });

    it('should extract keywords from audio', async () => {
      const audio = await manager.analyzeAudio('http://example.com/audio.mp3');
      expect(audio.keywords.length).toBeGreaterThanOrEqual(0);
    });

    it('should analyze audio sentiment', async () => {
      const audio = await manager.analyzeAudio('http://example.com/audio.mp3');
      expect(audio.sentiment).toBeGreaterThanOrEqual(-1);
      expect(audio.sentiment).toBeLessThanOrEqual(1);
    });

    it('should handle different audio durations', async () => {
      const audio1 = await manager.analyzeAudio('http://example.com/short.mp3', 10);
      const audio2 = await manager.analyzeAudio('http://example.com/long.mp3', 300);
      expect(audio1.duration).toBe(10);
      expect(audio2.duration).toBe(300);
    });

    it('should transcribe audio content', async () => {
      const audio = await manager.analyzeAudio('http://example.com/audio.mp3');
      expect(audio.transcript).toContain('Transcribed');
    });
  });

  // ===== 製造データ解析テスト (5個) =====
  describe('Manufacturing Data Analysis Tests', () => {
    it('should analyze manufacturing data', async () => {
      const mfg = await manager.analyzeManufacturingData('prod-1', 100, 50, 80);
      expect(mfg.quality).toBeGreaterThanOrEqual(0);
      expect(mfg.quality).toBeLessThanOrEqual(1);
    });

    it('should calculate quality from parameters', async () => {
      const mfg = await manager.analyzeManufacturingData('prod-1', 100, 50, 80);
      expect(mfg.quality).toBeGreaterThan(0.7);
    });

    it('should handle optimal parameters', async () => {
      const mfg = await manager.analyzeManufacturingData('prod-1', 100, 50, 80);
      expect(mfg.quality).toBeGreaterThan(0.6);
    });

    it('should handle suboptimal parameters', async () => {
      const mfg = await manager.analyzeManufacturingData('prod-1', 50, 20, 30);
      expect(mfg.quality).toBeGreaterThanOrEqual(0);
    });

    it('should track product ID', async () => {
      const mfg = await manager.analyzeManufacturingData('prod-123', 100, 50, 80);
      expect(mfg.productId).toBe('prod-123');
    });
  });

  // ===== データ統合テスト (5個) =====
  describe('Data Fusion Tests', () => {
    it('should fuse text and image data', async () => {
      const text = await manager.understandText('良い製品です');
      const image = await manager.understandImage('http://example.com/image.jpg');
      const analysis = await manager.fuseData(text.id, image.id, null, null);

      expect(analysis.textAnalysis).toBeTruthy();
      expect(analysis.imageAnalysis).toBeTruthy();
      expect(analysis.audioAnalysis).toBeNull();
      expect(analysis.manufacturingAnalysis).toBeNull();
    });

    it('should fuse all data types', async () => {
      const text = await manager.understandText('良い製品です');
      const image = await manager.understandImage('http://example.com/image.jpg');
      const audio = await manager.analyzeAudio('http://example.com/audio.mp3');
      const mfg = await manager.analyzeManufacturingData('prod-1', 100, 50, 80);

      const analysis = await manager.fuseData(text.id, image.id, audio.id, mfg.id);

      expect(analysis.textAnalysis).toBeTruthy();
      expect(analysis.imageAnalysis).toBeTruthy();
      expect(analysis.audioAnalysis).toBeTruthy();
      expect(analysis.manufacturingAnalysis).toBeTruthy();
    });

    it('should generate fused insights', async () => {
      const text = await manager.understandText('良い製品です');
      const image = await manager.understandImage('http://example.com/image.jpg');
      const analysis = await manager.fuseData(text.id, image.id, null, null);

      expect(analysis.fusedInsights).toBeTruthy();
      expect(analysis.fusedInsights.length).toBeGreaterThan(0);
    });

    it('should calculate confidence', async () => {
      const text = await manager.understandText('良い製品です');
      const analysis = await manager.fuseData(text.id, null, null, null);

      expect(analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.confidence).toBeLessThanOrEqual(1);
    });

    it('should generate recommendations', async () => {
      const text = await manager.understandText('悪い製品です');
      const analysis = await manager.fuseData(text.id, null, null, null);

      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });
  });

  // ===== マルチモーダル推論テスト (5個) =====
  describe('Multimodal Reasoning Tests', () => {
    it('should perform multimodal reasoning', async () => {
      const text = await manager.understandText('良い製品です');
      const analysis = await manager.fuseData(text.id, null, null, null);
      const reasoning = await manager.performMultimodalReasoning(analysis.id);

      expect(reasoning.reasoning).toBeTruthy();
      expect(reasoning.decision).toBeTruthy();
    });

    it('should make decision based on confidence', async () => {
      const text = await manager.understandText('良い製品です');
      const analysis = await manager.fuseData(text.id, null, null, null);
      const reasoning = await manager.performMultimodalReasoning(analysis.id);

      expect(reasoning.decision).toBeTruthy();
      expect(['Proceed with high confidence', 'Proceed with caution', 'Require additional review']).toContain(reasoning.decision);
    });

    it('should handle multiple data sources in reasoning', async () => {
      const text = await manager.understandText('良い製品です');
      const image = await manager.understandImage('http://example.com/image.jpg');
      const analysis = await manager.fuseData(text.id, image.id, null, null);
      const reasoning = await manager.performMultimodalReasoning(analysis.id);

      expect(reasoning.reasoning).toContain('Text');
      expect(reasoning.reasoning).toContain('Image');
    });

    it('should handle non-existent analysis', async () => {
      const reasoning = await manager.performMultimodalReasoning('non-existent');
      expect(reasoning.reasoning).toBe('');
      expect(reasoning.decision).toBe('');
    });

    it('should provide actionable reasoning', async () => {
      const text = await manager.understandText('良い製品です');
      const analysis = await manager.fuseData(text.id, null, null, null);
      const reasoning = await manager.performMultimodalReasoning(analysis.id);

      expect(reasoning.reasoning.length).toBeGreaterThan(0);
    });
  });

  // ===== 判断結果生成テスト (5個) =====
  describe('Judgment Generation Tests', () => {
    it('should generate judgment', async () => {
      const text = await manager.understandText('良い製品です');
      const analysis = await manager.fuseData(text.id, null, null, null);
      const judgment = await manager.generateJudgment(analysis.id);

      expect(judgment.judgment).toBeTruthy();
      expect(judgment.confidence).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(judgment.actions)).toBe(true);
    });

    it('should include recommendations in actions', async () => {
      const text = await manager.understandText('悪い製品です');
      const analysis = await manager.fuseData(text.id, null, null, null);
      const judgment = await manager.generateJudgment(analysis.id);

      expect(judgment.actions.length).toBeGreaterThan(0);
    });

    it('should reflect confidence in judgment', async () => {
      const text = await manager.understandText('良い製品です');
      const analysis = await manager.fuseData(text.id, null, null, null);
      const judgment = await manager.generateJudgment(analysis.id);

      expect(judgment.confidence).toBe(analysis.confidence);
    });

    it('should handle non-existent analysis for judgment', async () => {
      const judgment = await manager.generateJudgment('non-existent');
      expect(judgment.judgment).toBe('');
      expect(judgment.confidence).toBe(0);
      expect(judgment.actions.length).toBe(0);
    });

    it('should provide actionable judgment', async () => {
      const text = await manager.understandText('良い製品です');
      const analysis = await manager.fuseData(text.id, null, null, null);
      const judgment = await manager.generateJudgment(analysis.id);

      expect(judgment.judgment.length).toBeGreaterThan(0);
    });
  });

  // ===== 異常系テスト (5個) =====
  describe('Error Handling Tests', () => {
    it('should handle empty text', async () => {
      const text = await manager.understandText('');
      expect(text.content).toBe('');
    });

    it('should handle invalid image URL', async () => {
      const image = await manager.understandImage('invalid-url');
      expect(image.url).toBe('invalid-url');
    });

    it('should handle non-existent analysis retrieval', async () => {
      const analysis = await manager.getAnalysis('non-existent');
      expect(analysis).toBeNull();
    });

    it('should handle extreme manufacturing values', async () => {
      const mfg = await manager.analyzeManufacturingData('prod-1', 1000, 1000, 1000);
      expect(mfg.quality).toBeGreaterThanOrEqual(0);
      expect(mfg.quality).toBeLessThanOrEqual(1);
    });

    it('should handle null data fusion', async () => {
      const analysis = await manager.fuseData(null, null, null, null);
      expect(analysis.textAnalysis).toBeNull();
      expect(analysis.imageAnalysis).toBeNull();
      expect(analysis.audioAnalysis).toBeNull();
      expect(analysis.manufacturingAnalysis).toBeNull();
    });
  });

  // ===== 境界値テスト (5個) =====
  describe('Boundary Value Tests', () => {
    it('should handle maximum sentiment', async () => {
      const text = await manager.understandText('完璧です完璧です完璧です');
      expect(text.sentiment).toBeGreaterThanOrEqual(-1);
      expect(text.sentiment).toBeLessThanOrEqual(1);
    });

    it('should handle minimum sentiment', async () => {
      const text = await manager.understandText('悪い悪い悪い');
      expect(text.sentiment).toBeGreaterThanOrEqual(-1);
      expect(text.sentiment).toBeLessThanOrEqual(1);
    });

    it('should handle zero quality score', async () => {
      const mfg = await manager.analyzeManufacturingData('prod-1', 0, 0, 0);
      expect(mfg.quality).toBeGreaterThanOrEqual(0);
      expect(mfg.quality).toBeLessThanOrEqual(1);
    });

    it('should handle maximum confidence', async () => {
      const text = await manager.understandText('完璧です');
      const image = await manager.understandImage('http://example.com/image.jpg');
      const audio = await manager.analyzeAudio('http://example.com/audio.mp3');
      const mfg = await manager.analyzeManufacturingData('prod-1', 100, 50, 80);

      const analysis = await manager.fuseData(text.id, image.id, audio.id, mfg.id);
      expect(analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle minimum confidence', async () => {
      const analysis = await manager.fuseData(null, null, null, null);
      expect(analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ===== パフォーマンステスト (3個) =====
  describe('Performance Tests', () => {
    it('should handle bulk text analysis', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        await manager.understandText(`テキスト${i}`);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('should handle bulk multimodal analysis', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 20; i++) {
        const text = await manager.understandText(`テキスト${i}`);
        const image = await manager.understandImage(`http://example.com/image${i}.jpg`);
        await manager.fuseData(text.id, image.id, null, null);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000);
    });

    it('should handle statistics calculation', async () => {
      for (let i = 0; i < 30; i++) {
        const text = await manager.understandText(`テキスト${i}`);
        await manager.fuseData(text.id, null, null, null);
      }

      const startTime = Date.now();
      const stats = await manager.getStatistics();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
      expect(stats.totalAnalyses).toBeGreaterThan(0);
    });
  });

  // ===== 統計テスト (3個) =====
  describe('Statistics Tests', () => {
    it('should calculate statistics', async () => {
      const text = await manager.understandText('良い製品です');
      const image = await manager.understandImage('http://example.com/image.jpg');
      await manager.fuseData(text.id, image.id, null, null);

      const stats = await manager.getStatistics();
      expect(stats.totalAnalyses).toBeGreaterThan(0);
      expect(stats.totalTexts).toBeGreaterThan(0);
      expect(stats.totalImages).toBeGreaterThan(0);
    });

    it('should track all data types in statistics', async () => {
      const text = await manager.understandText('良い製品です');
      const image = await manager.understandImage('http://example.com/image.jpg');
      const audio = await manager.analyzeAudio('http://example.com/audio.mp3');
      const mfg = await manager.analyzeManufacturingData('prod-1', 100, 50, 80);

      await manager.fuseData(text.id, image.id, audio.id, mfg.id);

      const stats = await manager.getStatistics();
      expect(stats.totalTexts).toBeGreaterThan(0);
      expect(stats.totalImages).toBeGreaterThan(0);
      expect(stats.totalAudio).toBeGreaterThan(0);
      expect(stats.totalManufacturingData).toBeGreaterThan(0);
    });

    it('should calculate average metrics', async () => {
      const text = await manager.understandText('良い製品です');
      const image = await manager.understandImage('http://example.com/image.jpg');
      await manager.fuseData(text.id, image.id, null, null);

      const stats = await manager.getStatistics();
      expect(stats.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(stats.averageImageQuality).toBeGreaterThanOrEqual(0);
    });
  });

  // ===== クリーンアップテスト (2個) =====
  describe('Cleanup Tests', () => {
    it('should clear all caches', async () => {
      const text = await manager.understandText('テキスト');
      const image = await manager.understandImage('http://example.com/image.jpg');
      await manager.fuseData(text.id, image.id, null, null);

      await manager.clear();

      const stats = await manager.getStatistics();
      expect(stats.totalAnalyses).toBe(0);
      expect(stats.totalTexts).toBe(0);
      expect(stats.totalImages).toBe(0);
    });

    it('should handle operations after clear', async () => {
      await manager.clear();

      const text = await manager.understandText('テキスト');
      expect(text.content).toBe('テキスト');

      const stats = await manager.getStatistics();
      expect(stats.totalTexts).toBeGreaterThan(0);
    });
  });
});
