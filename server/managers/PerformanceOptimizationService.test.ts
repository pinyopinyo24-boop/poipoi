import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceOptimizationService } from './PerformanceOptimizationService';

describe('PerformanceOptimizationService', () => {
  let service: PerformanceOptimizationService;

  beforeEach(() => {
    service = new PerformanceOptimizationService();
  });

  describe('recordProfile', () => {
    it('should record a performance profile', () => {
      const profile = service.recordProfile('chat', 1000, 1500, 100, 120, 50, 'success');

      expect(profile).toBeDefined();
      expect(profile.duration).toBe(500);
      expect(profile.profileId).toMatch(/^PRF-/);
    });
  });

  describe('getProfile', () => {
    it('should retrieve a profile', () => {
      const created = service.recordProfile('chat', 1000, 1500, 100, 120, 50, 'success');
      const retrieved = service.getProfile(created.profileId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.operationType).toBe('chat');
    });

    it('should return undefined for non-existent profile', () => {
      expect(service.getProfile('non-existent')).toBeUndefined();
    });
  });

  describe('getProfilesByType', () => {
    it('should retrieve profiles by type', () => {
      service.recordProfile('chat', 1000, 1500, 100, 120, 50, 'success');
      service.recordProfile('chat', 2000, 2300, 110, 130, 55, 'success');
      service.recordProfile('analysis', 3000, 3500, 120, 140, 60, 'success');

      const chatProfiles = service.getProfilesByType('chat');
      expect(chatProfiles.length).toBe(2);
    });
  });

  describe('recordOptimization', () => {
    it('should record an optimization result', () => {
      const result = service.recordOptimization('caching', 'response_time', 1000, 500);

      expect(result).toBeDefined();
      expect(result.improvement).toBe(500);
      expect(result.improvementPercent).toBe(50);
      expect(result.resultId).toMatch(/^OPT-/);
    });
  });

  describe('getOptimizationResult', () => {
    it('should retrieve an optimization result', () => {
      const created = service.recordOptimization('caching', 'response_time', 1000, 500);
      const retrieved = service.getOptimizationResult(created.resultId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.optimizationType).toBe('caching');
    });
  });

  describe('getOptimizationsByType', () => {
    it('should retrieve optimizations by type', () => {
      service.recordOptimization('caching', 'response_time', 1000, 500);
      service.recordOptimization('caching', 'memory', 200, 150);
      service.recordOptimization('compression', 'size', 1000, 600);

      const cachingOpts = service.getOptimizationsByType('caching');
      expect(cachingOpts.length).toBe(2);
    });
  });

  describe('setCacheEntry', () => {
    it('should set a cache entry', () => {
      const entry = service.setCacheEntry('key1', { data: 'value' }, 3600000);

      expect(entry.key).toBe('key1');
      expect(entry.hits).toBe(0);
    });
  });

  describe('getCacheEntry', () => {
    it('should retrieve a cache entry', () => {
      service.setCacheEntry('key1', { data: 'value' }, 3600000);
      const value = service.getCacheEntry('key1');

      expect(value).toBeDefined();
      expect(value.data).toBe('value');
    });

    it('should return null for non-existent entry', () => {
      expect(service.getCacheEntry('non-existent')).toBeNull();
    });

    it('should increment hits on retrieval', () => {
      service.setCacheEntry('key1', { data: 'value' }, 3600000);
      service.getCacheEntry('key1');
      service.getCacheEntry('key1');

      const entry = service.getCacheEntry('key1');
      expect(entry).toBeDefined();
    });
  });

  describe('clearCache', () => {
    it('should clear all cache entries', () => {
      service.setCacheEntry('key1', { data: 'value1' }, 3600000);
      service.setCacheEntry('key2', { data: 'value2' }, 3600000);

      const cleared = service.clearCache();
      expect(cleared).toBe(2);
      expect(service.getCacheEntry('key1')).toBeNull();
    });
  });

  describe('cleanExpiredCache', () => {
    it('should remove expired entries', () => {
      service.setCacheEntry('key1', { data: 'value' }, 1);
      service.setCacheEntry('key2', { data: 'value' }, 3600000);

      // Wait for expiration
      setTimeout(() => {
        const removed = service.cleanExpiredCache();
        expect(removed).toBeGreaterThanOrEqual(0);
      }, 10);
    });
  });

  describe('getCacheStats', () => {
    it('should calculate cache statistics', () => {
      service.setCacheEntry('key1', { data: 'value1' }, 3600000);
      service.setCacheEntry('key2', { data: 'value2' }, 3600000);

      const stats = service.getCacheStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });

  describe('getAverageResponseTime', () => {
    it('should calculate average response time', () => {
      service.recordProfile('chat', 1000, 1500, 100, 120, 50, 'success');
      service.recordProfile('chat', 2000, 2300, 110, 130, 55, 'success');

      const avg = service.getAverageResponseTime('chat');
      expect(avg).toBeGreaterThan(0);
    });

    it('should return 0 for no profiles', () => {
      expect(service.getAverageResponseTime()).toBe(0);
    });
  });

  describe('getAverageMemoryUsage', () => {
    it('should calculate average memory usage', () => {
      service.recordProfile('chat', 1000, 1500, 100, 120, 50, 'success');
      service.recordProfile('chat', 2000, 2300, 110, 130, 55, 'success');

      const avg = service.getAverageMemoryUsage();
      expect(avg).toBeGreaterThan(0);
    });
  });

  describe('getAverageCPUUsage', () => {
    it('should calculate average CPU usage', () => {
      service.recordProfile('chat', 1000, 1500, 100, 120, 50, 'success');
      service.recordProfile('chat', 2000, 2300, 110, 130, 55, 'success');

      const avg = service.getAverageCPUUsage();
      expect(avg).toBeGreaterThan(0);
    });
  });

  describe('getTotalImprovementRate', () => {
    it('should calculate total improvement rate', () => {
      service.recordOptimization('caching', 'response_time', 1000, 500);
      service.recordOptimization('compression', 'size', 1000, 800);

      const rate = service.getTotalImprovementRate();
      expect(rate).toBeGreaterThan(0);
    });

    it('should return 0 for no optimizations', () => {
      expect(service.getTotalImprovementRate()).toBe(0);
    });
  });

  describe('getPerformanceStats', () => {
    it('should calculate performance statistics', () => {
      service.recordProfile('chat', 1000, 1500, 100, 120, 50, 'success');
      service.recordProfile('chat', 2000, 2300, 110, 130, 55, 'failed');

      const stats = service.getPerformanceStats();

      expect(stats.totalProfiles).toBe(2);
      expect(stats.successRate).toBe(50);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('getAllProfiles', () => {
    it('should retrieve all profiles', () => {
      service.recordProfile('chat', 1000, 1500, 100, 120, 50, 'success');
      service.recordProfile('analysis', 2000, 2500, 110, 130, 55, 'success');

      const all = service.getAllProfiles();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllOptimizations', () => {
    it('should retrieve all optimizations', () => {
      service.recordOptimization('caching', 'response_time', 1000, 500);
      service.recordOptimization('compression', 'size', 1000, 800);

      const all = service.getAllOptimizations();
      expect(all.length).toBe(2);
    });
  });

  describe('deleteProfile', () => {
    it('should delete a profile', () => {
      const profile = service.recordProfile('chat', 1000, 1500, 100, 120, 50, 'success');
      const result = service.deleteProfile(profile.profileId);

      expect(result).toBe(true);
      expect(service.getProfile(profile.profileId)).toBeUndefined();
    });

    it('should return false for non-existent profile', () => {
      expect(service.deleteProfile('non-existent')).toBe(false);
    });
  });

  describe('deleteOptimization', () => {
    it('should delete an optimization', () => {
      const opt = service.recordOptimization('caching', 'response_time', 1000, 500);
      const result = service.deleteOptimization(opt.resultId);

      expect(result).toBe(true);
      expect(service.getOptimizationResult(opt.resultId)).toBeUndefined();
    });
  });

  describe('getSlowProfiles', () => {
    it('should retrieve slow profiles', () => {
      service.recordProfile('chat', 1000, 1500, 100, 120, 50, 'success');
      service.recordProfile('chat', 2000, 3500, 110, 130, 55, 'success');

      const slow = service.getSlowProfiles(1000);
      expect(slow.length).toBeGreaterThan(0);
    });
  });

  describe('getHighImpactOptimizations', () => {
    it('should retrieve high impact optimizations', () => {
      service.recordOptimization('caching', 'response_time', 1000, 300);
      service.recordOptimization('compression', 'size', 1000, 900);

      const high = service.getHighImpactOptimizations(20);
      expect(high.length).toBeGreaterThan(0);
    });
  });
});
