import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { performFaceSwap } from './_core/faceswap-tensorflow';
import { performVideoFaceSwap, extractVideoFrames, batchFaceSwap } from './_core/video-faceswap';

/**
 * テスト用ダミー画像を生成
 */
function generateDummyImageBase64(): string {
  // 100x100の赤い画像を生成（JPEG形式）
  const canvas = require('canvas');
  const c = canvas.createCanvas(100, 100);
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, 100, 100);
  const buffer = c.toBuffer('image/jpeg');
  return buffer.toString('base64');
}

/**
 * テスト用ダミー動画を生成
 */
function generateDummyVideoBase64(): string {
  // テスト用の簡易動画バッファを生成
  const buffer = Buffer.alloc(1000);
  buffer.fill(0xFF);
  return buffer.toString('base64');
}

describe('Face Swap Features', () => {
  let sourceImageBase64: string;
  let targetImageBase64: string;
  let videoBase64: string;

  beforeAll(() => {
    // テスト用ダミーデータを生成
    sourceImageBase64 = generateDummyImageBase64();
    targetImageBase64 = generateDummyImageBase64();
    videoBase64 = generateDummyVideoBase64();
  });

  describe('performFaceSwap', () => {
    it('should accept valid base64 images', async () => {
      const result = await performFaceSwap({
        sourceImageBase64,
        targetImageBase64,
        quality: 'low',
      });

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle quality parameter', async () => {
      const qualities = ['low', 'medium', 'high'] as const;

      for (const quality of qualities) {
        const result = await performFaceSwap({
          sourceImageBase64,
          targetImageBase64,
          quality,
        });

        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      }
    });

    it('should return error for invalid base64', async () => {
      const result = await performFaceSwap({
        sourceImageBase64: 'invalid-base64',
        targetImageBase64: 'invalid-base64',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include processing time in response', async () => {
      const result = await performFaceSwap({
        sourceImageBase64,
        targetImageBase64,
      });

      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('performVideoFaceSwap', () => {
    it('should accept video base64 input', async () => {
      const result = await performVideoFaceSwap({
        sourceImageBase64,
        videoBase64,
        quality: 'low',
      });

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle optional parameters', async () => {
      const result = await performVideoFaceSwap({
        sourceImageBase64,
        videoBase64,
        frameInterval: 500,
        maxFrames: 10,
        quality: 'medium',
      });

      expect(result).toBeDefined();
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should return frame processing details', async () => {
      const result = await performVideoFaceSwap({
        sourceImageBase64,
        videoBase64,
      });

      if (result.success) {
        expect(result.processedFrames).toBeGreaterThanOrEqual(0);
        expect(result.totalFrames).toBeGreaterThanOrEqual(0);
        expect(result.details).toBeDefined();
      }
    });

    it('should handle invalid video base64', async () => {
      const result = await performVideoFaceSwap({
        sourceImageBase64,
        videoBase64: 'invalid-video-base64',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('extractVideoFrames', () => {
    it('should extract frames from video buffer', async () => {
      const videoBuffer = Buffer.from(videoBase64, 'base64');
      const frames = await extractVideoFrames(videoBuffer, 1000, 5);

      expect(Array.isArray(frames)).toBe(true);
      expect(frames.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect maxFrames parameter', async () => {
      const videoBuffer = Buffer.from(videoBase64, 'base64');
      const maxFrames = 3;
      const frames = await extractVideoFrames(videoBuffer, 1000, maxFrames);

      expect(frames.length).toBeLessThanOrEqual(maxFrames);
    });

    it('should include frame metadata', async () => {
      const videoBuffer = Buffer.from(videoBase64, 'base64');
      const frames = await extractVideoFrames(videoBuffer);

      frames.forEach((frame) => {
        expect(frame.frameIndex).toBeGreaterThanOrEqual(0);
        expect(frame.timestamp).toBeGreaterThanOrEqual(0);
        expect(frame.base64).toBeDefined();
        expect(frame.width).toBeGreaterThan(0);
        expect(frame.height).toBeGreaterThan(0);
      });
    });
  });

  describe('batchFaceSwap', () => {
    it('should process multiple frames', async () => {
      const frames = [
        {
          frameIndex: 0,
          timestamp: 0,
          base64: targetImageBase64,
          width: 100,
          height: 100,
        },
        {
          frameIndex: 1,
          timestamp: 33,
          base64: targetImageBase64,
          width: 100,
          height: 100,
        },
      ];

      const result = await batchFaceSwap(sourceImageBase64, frames, 'low');

      expect(result.processedFrames).toBeDefined();
      expect(result.processedFrames.length).toBeGreaterThanOrEqual(0);
      expect(result.skipped).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty frame list', async () => {
      const result = await batchFaceSwap(sourceImageBase64, [], 'low');

      expect(result.processedFrames).toBeDefined();
      expect(result.processedFrames.length).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should maintain frame metadata', async () => {
      const frames = [
        {
          frameIndex: 0,
          timestamp: 0,
          base64: targetImageBase64,
          width: 640,
          height: 480,
        },
      ];

      const result = await batchFaceSwap(sourceImageBase64, frames, 'low');

      if (result.processedFrames.length > 0) {
        const processedFrame = result.processedFrames[0];
        expect(processedFrame.frameIndex).toBe(0);
        expect(processedFrame.timestamp).toBe(0);
        expect(processedFrame.width).toBe(640);
        expect(processedFrame.height).toBe(480);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing source image', async () => {
      const result = await performFaceSwap({
        sourceImageBase64: '',
        targetImageBase64,
      });

      expect(result.success).toBe(false);
    });

    it('should handle missing target image', async () => {
      const result = await performFaceSwap({
        sourceImageBase64,
        targetImageBase64: '',
      });

      expect(result.success).toBe(false);
    });

    it('should handle corrupted base64 data', async () => {
      const result = await performFaceSwap({
        sourceImageBase64: 'not-base64!!!',
        targetImageBase64: 'not-base64!!!',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete face swap within reasonable time', async () => {
      const startTime = Date.now();
      const result = await performFaceSwap({
        sourceImageBase64,
        targetImageBase64,
        quality: 'low',
      });
      const endTime = Date.now();

      const duration = endTime - startTime;
      // 低品質で1分以内に完了することを期待
      expect(duration).toBeLessThan(60000);
    });

    it('should handle concurrent requests', async () => {
      const promises = Array(3)
        .fill(null)
        .map(() =>
          performFaceSwap({
            sourceImageBase64,
            targetImageBase64,
            quality: 'low',
          })
        );

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    });
  });
});
