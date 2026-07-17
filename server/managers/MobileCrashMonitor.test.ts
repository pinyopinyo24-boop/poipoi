/**
 * MobileCrashMonitor Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mobileCrashMonitor, MobileCrashMonitor } from './MobileCrashMonitor';

describe('MobileCrashMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mobileCrashMonitor.cleanup();
  });

  afterEach(() => {
    mobileCrashMonitor.cleanup();
  });

  describe('Crash Reporting', () => {
    it('should report critical crash', () => {
      const crash = mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'NullPointerException in ChatScreen',
        'at ChatScreen.onMessage()',
        'ChatScreen'
      );
      expect(crash.severity).toBe('critical');
      expect(crash.resolved).toBe(false);
    });

    it('should report high severity crash', () => {
      const crash = mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'Network timeout',
        'at APIClient.request()',
        'ChatScreen'
      );
      expect(crash.severity).toBe('high');
    });

    it('should report medium severity crash', () => {
      const crash = mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'JSON Parse error',
        'at Parser.parse()',
        'ChatScreen'
      );
      expect(crash.severity).toBe('medium');
    });

    it('should report low severity crash', () => {
      const crash = mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'UI rendering issue',
        'at View.render()',
        'ChatScreen'
      );
      expect(crash.severity).toBe('low');
    });
  });

  describe('Crash Queries', () => {
    it('should get crashes by device', () => {
      mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'Error 1',
        'Stack 1',
        'Screen1'
      );
      mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'Error 2',
        'Stack 2',
        'Screen2'
      );
      mobileCrashMonitor.reportCrash(
        'device456',
        '1.0.0',
        '12.0',
        'Error 3',
        'Stack 3',
        'Screen1'
      );

      const device123Crashes = mobileCrashMonitor.getCrashesByDevice('device123');
      expect(device123Crashes.length).toBe(2);
    });

    it('should get crashes by severity', () => {
      mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'NullPointerException',
        'Stack',
        'Screen'
      );
      mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'Network timeout',
        'Stack',
        'Screen'
      );
      mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'UI error',
        'Stack',
        'Screen'
      );

      const criticalCrashes = mobileCrashMonitor.getCrashesBySeverity('critical');
      expect(criticalCrashes.length).toBe(1);
    });

    it('should get unresolved crashes', () => {
      const crash1 = mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'Error 1',
        'Stack 1'
      );
      const crash2 = mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'Error 2',
        'Stack 2'
      );

      mobileCrashMonitor.resolveCrash(crash1.crashId);

      const unresolved = mobileCrashMonitor.getUnresolvedCrashes();
      expect(unresolved.length).toBe(1);
    });
  });

  describe('Crash Resolution', () => {
    it('should resolve crash', () => {
      const crash = mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'Error',
        'Stack'
      );
      const resolved = mobileCrashMonitor.resolveCrash(crash.crashId);
      expect(resolved?.resolved).toBe(true);
    });
  });

  describe('Crash Statistics', () => {
    it('should get crash statistics', () => {
      mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'NullPointerException',
        'Stack'
      );
      mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'Network timeout',
        'Stack'
      );

      const stats = mobileCrashMonitor.getCrashStatistics();
      expect(stats.totalCrashes).toBe(2);
      expect(stats.criticalCrashes).toBe(1);
      expect(stats.highCrashes).toBe(1);
    });

    it('should calculate crash rate', () => {
      const crash1 = mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'Error 1',
        'Stack 1'
      );
      mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'Error 2',
        'Stack 2'
      );

      mobileCrashMonitor.resolveCrash(crash1.crashId);

      const stats = mobileCrashMonitor.getCrashStatistics();
      expect(stats.crashRate).toBe(50);
    });
  });

  describe('Version Statistics', () => {
    it('should get crash statistics by version', () => {
      mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'NullPointerException',
        'Stack'
      );
      mobileCrashMonitor.reportCrash(
        'device123',
        '1.0.0',
        '12.0',
        'Error 2',
        'Stack 2'
      );
      mobileCrashMonitor.reportCrash(
        'device123',
        '1.1.0',
        '12.0',
        'Error 3',
        'Stack 3'
      );

      const stats = mobileCrashMonitor.getCrashStatisticsByVersion('1.0.0');
      expect(stats.totalCrashes).toBe(2);
      expect(stats.criticalCrashes).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      mobileCrashMonitor.reportCrash('device123', '1.0.0', '12.0', 'Error', 'Stack');
      mobileCrashMonitor.cleanup();
      const stats = mobileCrashMonitor.getCrashStatistics();
      expect(stats.totalCrashes).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = MobileCrashMonitor.getInstance();
      const instance2 = MobileCrashMonitor.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
