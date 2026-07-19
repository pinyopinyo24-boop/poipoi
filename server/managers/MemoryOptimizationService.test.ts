import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryOptimizationService } from './MemoryOptimizationService';

describe('MemoryOptimizationService', () => {
  let service: MemoryOptimizationService;

  beforeEach(() => {
    service = new MemoryOptimizationService();
  });

  describe('recordMemoryProfile', () => {
    it('should record memory profile', () => {
      const profile = service.recordMemoryProfile(512, 1024, 64, 2048, 128);

      expect(profile).toBeDefined();
      expect(profile.profileId).toMatch(/^MP-/);
      expect(profile.heapUsed).toBe(512);
      expect(profile.status).toBe('optimal');
    });

    it('should set optimal status for low usage', () => {
      const profile = service.recordMemoryProfile(256, 1024, 64, 2048, 128);
      expect(profile.status).toBe('optimal');
    });

    it('should set warning status for high usage', () => {
      const profile = service.recordMemoryProfile(800, 1024, 64, 2048, 128);
      expect(profile.status).toBe('warning');
    });

    it('should set critical status for very high usage', () => {
      const profile = service.recordMemoryProfile(950, 1024, 64, 2048, 128);
      expect(profile.status).toBe('critical');
    });
  });

  describe('getMemoryProfile', () => {
    it('should retrieve memory profile', () => {
      const created = service.recordMemoryProfile(512, 1024, 64, 2048, 128);
      const retrieved = service.getMemoryProfile(created.profileId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.heapUsed).toBe(512);
    });
  });

  describe('getProfilesByStatus', () => {
    it('should retrieve profiles by status', () => {
      service.recordMemoryProfile(256, 1024, 64, 2048, 128);
      service.recordMemoryProfile(512, 1024, 64, 2048, 128);
      service.recordMemoryProfile(950, 1024, 64, 2048, 128);

      const optimalProfiles = service.getProfilesByStatus('optimal');
      expect(optimalProfiles.length).toBe(2);
    });
  });

  describe('getLatestMemoryProfile', () => {
    it('should retrieve latest memory profile', () => {
      service.recordMemoryProfile(256, 1024, 64, 2048, 128);
      service.recordMemoryProfile(512, 1024, 64, 2048, 128);

      const retrieved = service.getLatestMemoryProfile();
      expect(retrieved).toBeDefined();
      expect(retrieved?.profileId).toMatch(/^MP-/);
    });
  });

  describe('recordOptimization', () => {
    it('should record optimization', () => {
      const opt = service.recordOptimization('gc', 'heap', 256, 100, true);

      expect(opt).toBeDefined();
      expect(opt.optimizationId).toMatch(/^MO-/);
      expect(opt.memoryFreed).toBe(256);
    });
  });

  describe('getOptimization', () => {
    it('should retrieve optimization', () => {
      const created = service.recordOptimization('gc', 'heap', 256, 100, true);
      const retrieved = service.getOptimization(created.optimizationId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.optimizationType).toBe('gc');
    });
  });

  describe('getAllOptimizations', () => {
    it('should retrieve all optimizations', () => {
      service.recordOptimization('gc', 'heap', 256, 100, true);
      service.recordOptimization('cache_clear', 'cache', 128, 50, true);

      const all = service.getAllOptimizations();
      expect(all.length).toBe(2);
    });
  });

  describe('detectMemoryLeak', () => {
    it('should detect memory leak', () => {
      const leak = service.detectMemoryLeak('chat_service', 10, 100);

      expect(leak).toBeDefined();
      expect(leak.leakId).toMatch(/^ML-/);
      expect(leak.severity).toBe('medium');
    });

    it('should set low severity for small leak', () => {
      const leak = service.detectMemoryLeak('component', 5, 30);
      expect(leak.severity).toBe('low');
    });

    it('should set high severity for large leak', () => {
      const leak = service.detectMemoryLeak('component', 15, 250);
      expect(leak.severity).toBe('high');
    });

    it('should set critical severity for very large leak', () => {
      const leak = service.detectMemoryLeak('component', 20, 600);
      expect(leak.severity).toBe('critical');
    });
  });

  describe('getMemoryLeak', () => {
    it('should retrieve memory leak', () => {
      const created = service.detectMemoryLeak('component', 10, 100);
      const retrieved = service.getMemoryLeak(created.leakId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.component).toBe('component');
    });
  });

  describe('getLeaksByComponent', () => {
    it('should retrieve leaks by component', () => {
      service.detectMemoryLeak('chat', 10, 100);
      service.detectMemoryLeak('chat', 15, 150);
      service.detectMemoryLeak('analysis', 20, 200);

      const chatLeaks = service.getLeaksByComponent('chat');
      expect(chatLeaks.length).toBe(2);
    });
  });

  describe('fixMemoryLeak', () => {
    it('should fix memory leak', () => {
      const created = service.detectMemoryLeak('component', 10, 100);
      const fixed = service.fixMemoryLeak(created.leakId);

      expect(fixed?.status).toBe('fixed');
    });
  });

  describe('getMemoryStats', () => {
    it('should calculate memory statistics', () => {
      service.recordMemoryProfile(256, 1024, 64, 2048, 128);
      service.recordMemoryProfile(512, 1024, 64, 2048, 128);
      service.recordOptimization('gc', 'heap', 256, 100, true);
      service.detectMemoryLeak('component', 10, 100);

      const stats = service.getMemoryStats();

      expect(stats.totalProfiles).toBe(2);
      expect(stats.totalOptimizations).toBe(1);
      expect(stats.totalLeaks).toBe(1);
      expect(stats.successfulOptimizations).toBe(1);
      expect(stats.totalMemoryFreed).toBe(256);
    });
  });

  describe('deleteMemoryProfile', () => {
    it('should delete memory profile', () => {
      const profile = service.recordMemoryProfile(512, 1024, 64, 2048, 128);
      const result = service.deleteMemoryProfile(profile.profileId);

      expect(result).toBe(true);
      expect(service.getMemoryProfile(profile.profileId)).toBeUndefined();
    });
  });

  describe('deleteMemoryLeak', () => {
    it('should delete memory leak', () => {
      const leak = service.detectMemoryLeak('component', 10, 100);
      const result = service.deleteMemoryLeak(leak.leakId);

      expect(result).toBe(true);
      expect(service.getMemoryLeak(leak.leakId)).toBeUndefined();
    });
  });

  describe('getHighRiskLeaks', () => {
    it('should retrieve high risk leaks', () => {
      service.detectMemoryLeak('component1', 5, 30);
      service.detectMemoryLeak('component2', 15, 250);
      service.detectMemoryLeak('component3', 20, 600);

      const high = service.getHighRiskLeaks();
      expect(high.length).toBeGreaterThan(0);
    });
  });

  describe('getAverageHeapUsage', () => {
    it('should calculate average heap usage', () => {
      service.recordMemoryProfile(256, 1024, 64, 2048, 128);
      service.recordMemoryProfile(512, 1024, 64, 2048, 128);

      const avg = service.getAverageHeapUsage();
      expect(avg).toBeGreaterThan(0);
      expect(avg).toBeLessThanOrEqual(100);
    });
  });

  describe('comprehensive memory optimization workflow', () => {
    it('should support full memory optimization workflow', () => {
      service.recordMemoryProfile(512, 1024, 64, 2048, 128);
      service.recordOptimization('gc', 'heap', 256, 100, true);
      service.detectMemoryLeak('chat_service', 10, 100);
      const leak = service.detectMemoryLeak('analysis_service', 15, 250);
      service.fixMemoryLeak(leak.leakId);

      const stats = service.getMemoryStats();

      expect(stats.totalProfiles).toBe(1);
      expect(stats.totalOptimizations).toBe(1);
      expect(stats.totalLeaks).toBe(2);
      expect(stats.fixedLeaks).toBe(1);
    });
  });
});
