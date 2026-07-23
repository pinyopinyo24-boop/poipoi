import { describe, it, expect, beforeEach } from 'vitest';
import { StartupOptimizationService } from './StartupOptimizationService';

describe('StartupOptimizationService', () => {
  let service: StartupOptimizationService;

  beforeEach(() => {
    service = new StartupOptimizationService();
  });

  describe('recordStartupMetric', () => {
    it('should record startup metric', () => {
      const metric = service.recordStartupMetric('initialization', 300);

      expect(metric).toBeDefined();
      expect(metric.metricId).toMatch(/^SM-/);
      expect(metric.duration).toBe(300);
      expect(metric.status).toBe('fast');
    });

    it('should set normal status for moderate duration', () => {
      const metric = service.recordStartupMetric('resource_loading', 750);
      expect(metric.status).toBe('normal');
    });

    it('should set slow status for high duration', () => {
      const metric = service.recordStartupMetric('ui_rendering', 1500);
      expect(metric.status).toBe('slow');
    });

    it('should set critical status for very high duration', () => {
      const metric = service.recordStartupMetric('api_connection', 2500);
      expect(metric.status).toBe('critical');
    });
  });

  describe('getStartupMetric', () => {
    it('should retrieve startup metric', () => {
      const created = service.recordStartupMetric('initialization', 300);
      const retrieved = service.getStartupMetric(created.metricId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.duration).toBe(300);
    });
  });

  describe('getMetricsByPhase', () => {
    it('should retrieve metrics by phase', () => {
      service.recordStartupMetric('initialization', 300);
      service.recordStartupMetric('initialization', 400);
      service.recordStartupMetric('resource_loading', 500);

      const initMetrics = service.getMetricsByPhase('initialization');
      expect(initMetrics.length).toBe(2);
    });
  });

  describe('recordOptimization', () => {
    it('should record optimization', () => {
      const opt = service.recordOptimization('lazy_loading', 'initialization', 100, true);

      expect(opt).toBeDefined();
      expect(opt.optimizationId).toMatch(/^SO-/);
      expect(opt.timeSaved).toBe(100);
    });
  });

  describe('getOptimization', () => {
    it('should retrieve optimization', () => {
      const created = service.recordOptimization('code_splitting', 'resource_loading', 150, true);
      const retrieved = service.getOptimization(created.optimizationId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.optimizationType).toBe('code_splitting');
    });
  });

  describe('getAllOptimizations', () => {
    it('should retrieve all optimizations', () => {
      service.recordOptimization('lazy_loading', 'initialization', 100, true);
      service.recordOptimization('code_splitting', 'resource_loading', 150, true);

      const all = service.getAllOptimizations();
      expect(all.length).toBe(2);
    });
  });

  describe('recordResourcePreload', () => {
    it('should record resource preload', () => {
      const preload = service.recordResourcePreload('script', 'main.js', 50000, 'critical', true);

      expect(preload).toBeDefined();
      expect(preload.preloadId).toMatch(/^RP-/);
      expect(preload.resourceName).toBe('main.js');
    });
  });

  describe('getResourcePreload', () => {
    it('should retrieve resource preload', () => {
      const created = service.recordResourcePreload('style', 'main.css', 30000, 'high', true);
      const retrieved = service.getResourcePreload(created.preloadId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.resourceType).toBe('style');
    });
  });

  describe('getPreloadsByType', () => {
    it('should retrieve preloads by type', () => {
      service.recordResourcePreload('script', 'main.js', 50000, 'critical', true);
      service.recordResourcePreload('script', 'utils.js', 30000, 'high', true);
      service.recordResourcePreload('style', 'main.css', 30000, 'high', true);

      const scripts = service.getPreloadsByType('script');
      expect(scripts.length).toBe(2);
    });
  });

  describe('calculateTotalStartupTime', () => {
    it('should calculate total startup time', () => {
      service.recordStartupMetric('initialization', 300);
      service.recordStartupMetric('resource_loading', 500);

      const total = service.calculateTotalStartupTime();
      expect(total).toBe(800);
    });

    it('should return 0 for no metrics', () => {
      expect(service.calculateTotalStartupTime()).toBe(0);
    });
  });

  describe('getStartupStats', () => {
    it('should calculate startup statistics', () => {
      service.recordStartupMetric('initialization', 300);
      service.recordStartupMetric('resource_loading', 1500);
      service.recordOptimization('lazy_loading', 'initialization', 100, true);
      service.recordResourcePreload('script', 'main.js', 50000, 'critical', true);

      const stats = service.getStartupStats();

      expect(stats.totalMetrics).toBe(2);
      expect(stats.totalOptimizations).toBe(1);
      expect(stats.totalPreloads).toBe(1);
      expect(stats.appliedOptimizations).toBe(1);
      expect(stats.totalTimeSaved).toBe(100);
      expect(stats.preloadedResources).toBe(1);
    });
  });

  describe('deleteStartupMetric', () => {
    it('should delete startup metric', () => {
      const metric = service.recordStartupMetric('initialization', 300);
      const result = service.deleteStartupMetric(metric.metricId);

      expect(result).toBe(true);
      expect(service.getStartupMetric(metric.metricId)).toBeUndefined();
    });
  });

  describe('deleteResourcePreload', () => {
    it('should delete resource preload', () => {
      const preload = service.recordResourcePreload('script', 'main.js', 50000, 'critical', true);
      const result = service.deleteResourcePreload(preload.preloadId);

      expect(result).toBe(true);
      expect(service.getResourcePreload(preload.preloadId)).toBeUndefined();
    });
  });

  describe('getSlowPhases', () => {
    it('should retrieve slow phases', () => {
      service.recordStartupMetric('initialization', 300);
      service.recordStartupMetric('resource_loading', 1500);
      service.recordStartupMetric('ui_rendering', 2500);

      const slow = service.getSlowPhases(1000);
      expect(slow.length).toBeGreaterThan(0);
    });
  });

  describe('getHighPriorityResources', () => {
    it('should retrieve high priority resources', () => {
      service.recordResourcePreload('script', 'main.js', 50000, 'critical', true);
      service.recordResourcePreload('style', 'main.css', 30000, 'medium', true);
      service.recordResourcePreload('image', 'logo.png', 10000, 'low', true);

      const high = service.getHighPriorityResources();
      expect(high.length).toBeGreaterThan(0);
    });
  });

  describe('getAllStartupMetrics', () => {
    it('should retrieve all startup metrics', () => {
      service.recordStartupMetric('initialization', 300);
      service.recordStartupMetric('resource_loading', 500);

      const all = service.getAllStartupMetrics();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllResourcePreloads', () => {
    it('should retrieve all resource preloads', () => {
      service.recordResourcePreload('script', 'main.js', 50000, 'critical', true);
      service.recordResourcePreload('style', 'main.css', 30000, 'high', true);

      const all = service.getAllResourcePreloads();
      expect(all.length).toBe(2);
    });
  });

  describe('comprehensive startup optimization workflow', () => {
    it('should support full startup optimization workflow', () => {
      service.recordStartupMetric('initialization', 300);
      service.recordStartupMetric('resource_loading', 500);
      service.recordStartupMetric('ui_rendering', 1500);
      service.recordOptimization('lazy_loading', 'initialization', 100, true);
      service.recordOptimization('code_splitting', 'resource_loading', 150, true);
      service.recordResourcePreload('script', 'main.js', 50000, 'critical', true);
      service.recordResourcePreload('style', 'main.css', 30000, 'high', true);

      const stats = service.getStartupStats();

      expect(stats.totalMetrics).toBe(3);
      expect(stats.totalOptimizations).toBe(2);
      expect(stats.totalPreloads).toBe(2);
      expect(stats.appliedOptimizations).toBe(2);
      expect(stats.totalTimeSaved).toBe(250);
    });
  });
});
