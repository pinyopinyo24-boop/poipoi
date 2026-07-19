/**
 * APKGenerationService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apkGenerationService, APKGenerationService } from './APKGenerationService';

describe('APKGenerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apkGenerationService.cleanup();
  });

  afterEach(() => {
    apkGenerationService.cleanup();
  });

  describe('APK Generation', () => {
    it('should start generation', () => {
      const generation = apkGenerationService.startGeneration('1.0.0', 21, 33);
      expect(generation.generationId).toBeDefined();
      expect(generation.status).toBe('generating');
    });

    it('should get generation', () => {
      const started = apkGenerationService.startGeneration('1.0.0', 21, 33);
      const generation = apkGenerationService.getGeneration(started.generationId);
      expect(generation).not.toBeNull();
      expect(generation?.version).toBe('1.0.0');
    });

    it('should start optimization', () => {
      const started = apkGenerationService.startGeneration('1.0.0', 21, 33);
      const optimizing = apkGenerationService.startOptimization(started.generationId);
      expect(optimizing?.status).toBe('optimizing');
    });
  });

  describe('Generation Execution', () => {
    it('should complete generation', () => {
      const started = apkGenerationService.startGeneration('1.0.0', 21, 33);
      const completed = apkGenerationService.completeGeneration(
        started.generationId,
        '/path/to/app.apk',
        50000000
      );
      expect(completed?.status).toBe('completed');
      expect(completed?.apkPath).toBe('/path/to/app.apk');
    });

    it('should fail generation', () => {
      const started = apkGenerationService.startGeneration('1.0.0', 21, 33);
      const failed = apkGenerationService.failGeneration(started.generationId, 'Generation error');
      expect(failed?.status).toBe('failed');
      expect(failed?.errorMessage).toBe('Generation error');
    });
  });

  describe('Generation Queries', () => {
    it('should get completed generations', () => {
      const gen1 = apkGenerationService.startGeneration('1.0.0', 21, 33);
      const gen2 = apkGenerationService.startGeneration('1.0.1', 21, 33);

      apkGenerationService.completeGeneration(gen1.generationId, '/path/to/app1.apk', 50000000);
      apkGenerationService.failGeneration(gen2.generationId, 'Failed');

      const completed = apkGenerationService.getCompletedGenerations();
      expect(completed.length).toBe(1);
    });

    it('should get failed generations', () => {
      const gen1 = apkGenerationService.startGeneration('1.0.0', 21, 33);
      const gen2 = apkGenerationService.startGeneration('1.0.1', 21, 33);

      apkGenerationService.completeGeneration(gen1.generationId, '/path/to/app1.apk', 50000000);
      apkGenerationService.failGeneration(gen2.generationId, 'Failed');

      const failed = apkGenerationService.getFailedGenerations();
      expect(failed.length).toBe(1);
    });
  });

  describe('Generation Statistics', () => {
    it('should get generation statistics', () => {
      const gen1 = apkGenerationService.startGeneration('1.0.0', 21, 33);
      const gen2 = apkGenerationService.startGeneration('1.0.1', 21, 33);

      apkGenerationService.completeGeneration(gen1.generationId, '/path/to/app1.apk', 50000000);
      apkGenerationService.completeGeneration(gen2.generationId, '/path/to/app2.apk', 60000000);

      const stats = apkGenerationService.getGenerationStatistics();
      expect(stats.totalGenerations).toBe(2);
      expect(stats.completedGenerations).toBe(2);
      expect(stats.successRate).toBe(100);
    });

    it('should calculate APK size statistics', () => {
      const gen1 = apkGenerationService.startGeneration('1.0.0', 21, 33);
      const gen2 = apkGenerationService.startGeneration('1.0.1', 21, 33);

      apkGenerationService.completeGeneration(gen1.generationId, '/path/to/app1.apk', 50000000);
      apkGenerationService.completeGeneration(gen2.generationId, '/path/to/app2.apk', 60000000);

      const stats = apkGenerationService.getGenerationStatistics();
      expect(stats.totalAPKSize).toBe(110000000);
      expect(stats.averageAPKSize).toBe(55000000);
    });

    it('should calculate success rate with failures', () => {
      const gen1 = apkGenerationService.startGeneration('1.0.0', 21, 33);
      const gen2 = apkGenerationService.startGeneration('1.0.1', 21, 33);

      apkGenerationService.completeGeneration(gen1.generationId, '/path/to/app1.apk', 50000000);
      apkGenerationService.failGeneration(gen2.generationId, 'Failed');

      const stats = apkGenerationService.getGenerationStatistics();
      expect(stats.successRate).toBe(50);
      expect(stats.failedGenerations).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      apkGenerationService.startGeneration('1.0.0', 21, 33);
      apkGenerationService.cleanup();
      const stats = apkGenerationService.getGenerationStatistics();
      expect(stats.totalGenerations).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = APKGenerationService.getInstance();
      const instance2 = APKGenerationService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
