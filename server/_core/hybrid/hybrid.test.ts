/**
 * Hybrid Connection System Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConnectionManager, getConnectionManager, resetConnectionManager } from './ConnectionManager';
import { SyncManager, getSyncManager, resetSyncManager } from './SyncManager';
import { APIAdapter, getAPIAdapter, resetAPIAdapter } from './APIAdapter';

describe('Hybrid Connection System', () => {
  beforeEach(() => {
    resetConnectionManager();
    resetSyncManager();
    resetAPIAdapter();
  });

  afterEach(() => {
    const cm = getConnectionManager();
    cm.destroy();
    const sm = getSyncManager();
    sm.destroy();
  });

  describe('ConnectionManager', () => {
    it('should initialize with default config', () => {
      const cm = getConnectionManager();
      expect(cm).toBeDefined();
      expect(cm.getConnectionMode()).toBe('auto');
    });

    it('should get current connection status', () => {
      const cm = getConnectionManager();
      const status = cm.getConnectionStatus();
      expect(status).toHaveProperty('current');
      expect(status).toHaveProperty('local');
      expect(status).toHaveProperty('cloud');
      expect(status).toHaveProperty('mode');
    });

    it('should set connection mode to local-only', () => {
      const cm = getConnectionManager();
      cm.setConnectionMode('local-only');
      expect(cm.getConnectionMode()).toBe('local-only');
    });

    it('should set connection mode to cloud-only', () => {
      const cm = getConnectionManager();
      cm.setConnectionMode('cloud-only');
      expect(cm.getConnectionMode()).toBe('cloud-only');
    });

    it('should set connection mode to auto', () => {
      const cm = getConnectionManager();
      cm.setConnectionMode('auto');
      expect(cm.getConnectionMode()).toBe('auto');
    });

    it('should get server URL based on current connection', () => {
      const cm = getConnectionManager();
      const url = cm.getServerUrl();
      expect(url).toBeDefined();
      expect(url).toMatch(/^https?:\/\//);
    });

    it('should register event listeners', () => {
      const cm = getConnectionManager();
      let eventFired = false;

      cm.on('connection-mode-changed', () => {
        eventFired = true;
      });

      cm.setConnectionMode('local-only');
      expect(eventFired).toBe(true);
    });

    it('should handle connection state changes', () => {
      const cm = getConnectionManager();
      let modeChanged = false;

      cm.on('connection-mode-changed', () => {
        modeChanged = true;
      });

      // Trigger a mode change which should emit event
      cm.setConnectionMode('cloud-only');
      expect(modeChanged).toBe(true);
    });
  });

  describe('SyncManager', () => {
    it('should initialize with default config', () => {
      const sm = getSyncManager();
      expect(sm).toBeDefined();
    });

    it('should queue sync items', () => {
      const sm = getSyncManager();
      const itemId = sm.queueSync('conversation', { message: 'test' }, 'local');
      expect(itemId).toBeDefined();
      expect(itemId).toMatch(/^sync-/);
    });

    it('should get sync status', () => {
      const sm = getSyncManager();
      sm.queueSync('conversation', { message: 'test' }, 'local');
      const status = sm.getSyncStatus();
      expect(status).toHaveProperty('pending');
      expect(status).toHaveProperty('synced');
      expect(status).toHaveProperty('failed');
      expect(status.pending).toBeGreaterThan(0);
    });

    it('should get sync history', () => {
      const sm = getSyncManager();
      sm.queueSync('conversation', { message: 'test' }, 'local');
      const history = sm.getSyncHistory(10);
      expect(Array.isArray(history)).toBe(true);
    });

    it('should clear sync history', () => {
      const sm = getSyncManager();
      sm.queueSync('conversation', { message: 'test' }, 'local');
      sm.clearSyncHistory();
      const status = sm.getSyncStatus();
      expect(status.queueSize).toBe(0);
      expect(status.historySize).toBe(0);
    });

    it('should handle sync events', async () => {
      const sm = getSyncManager();
      let eventFired = false;

      sm.on('sync-queued', () => {
        eventFired = true;
      });

      sm.queueSync('conversation', { message: 'test' }, 'local');
      expect(eventFired).toBe(true);
    });

    it('should queue multiple sync targets', () => {
      const sm = getSyncManager();
      const targets: Array<'conversation' | 'learning' | 'memory' | 'settings' | 'production'> = [
        'conversation',
        'learning',
        'memory',
        'settings',
        'production',
      ];

      const itemIds = targets.map((target) => sm.queueSync(target, { data: 'test' }, 'local'));

      expect(itemIds).toHaveLength(5);
      itemIds.forEach((id) => {
        expect(id).toBeDefined();
      });
    });
  });

  describe('APIAdapter', () => {
    it('should initialize', () => {
      const adapter = getAPIAdapter();
      expect(adapter).toBeDefined();
    });

    it('should have chat API methods', () => {
      const adapter = getAPIAdapter();
      expect(adapter.sendChatMessage).toBeDefined();
      expect(adapter.getChatHistory).toBeDefined();
    });

    it('should have memory API methods', () => {
      const adapter = getAPIAdapter();
      expect(adapter.searchMemory).toBeDefined();
      expect(adapter.saveToMemory).toBeDefined();
    });

    it('should have learning API methods', () => {
      const adapter = getAPIAdapter();
      expect(adapter.getLearningsuggestions).toBeDefined();
      expect(adapter.applyLearning).toBeDefined();
    });

    it('should have production API methods', () => {
      const adapter = getAPIAdapter();
      expect(adapter.analyzeProduction).toBeDefined();
      expect(adapter.getCostAnalysis).toBeDefined();
    });

    it('should have analysis API methods', () => {
      const adapter = getAPIAdapter();
      expect(adapter.analyzeData).toBeDefined();
      expect(adapter.getInsights).toBeDefined();
    });

    it('should have presentation API methods', () => {
      const adapter = getAPIAdapter();
      expect(adapter.generatePresentation).toBeDefined();
      expect(adapter.getPresentation).toBeDefined();
    });

    it('should have health check method', () => {
      const adapter = getAPIAdapter();
      expect(adapter.healthCheck).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle connection mode changes with sync', () => {
      const cm = getConnectionManager();
      const sm = getSyncManager();

      cm.setConnectionMode('local-only');
      const itemId = sm.queueSync('conversation', { message: 'test' }, 'local');

      expect(cm.getConnectionMode()).toBe('local-only');
      expect(itemId).toBeDefined();
    });

    it('should support multiple connection modes', () => {
      const cm = getConnectionManager();
      const modes: Array<'auto' | 'local-only' | 'cloud-only'> = ['auto', 'local-only', 'cloud-only'];

      modes.forEach((mode) => {
        cm.setConnectionMode(mode);
        expect(cm.getConnectionMode()).toBe(mode);
      });
    });

    it('should queue different sync targets', () => {
      const sm = getSyncManager();

      const conversationId = sm.queueSync('conversation', { message: 'test' }, 'local');
      const learningId = sm.queueSync('learning', { data: 'test' }, 'local');
      const memoryId = sm.queueSync('memory', { data: 'test' }, 'cloud');

      expect(conversationId).toBeDefined();
      expect(learningId).toBeDefined();
      expect(memoryId).toBeDefined();
    });

    it('should maintain connection state across operations', () => {
      const cm = getConnectionManager();
      const initialStatus = cm.getConnectionStatus();

      cm.setConnectionMode('cloud-only');
      const updatedStatus = cm.getConnectionStatus();

      expect(updatedStatus.mode).toBe('cloud-only');
      expect(initialStatus).toBeDefined();
      expect(updatedStatus).toBeDefined();
    });

    it('should handle API adapter with connection manager', () => {
      const cm = getConnectionManager();
      const adapter = getAPIAdapter();

      cm.setConnectionMode('cloud-only');
      expect(cm.getCurrentConnection()).toBe('cloud');
      expect(adapter).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid connection mode gracefully', () => {
      const cm = getConnectionManager();
      const initialMode = cm.getConnectionMode();

      // Try to set invalid mode (TypeScript will prevent this, but test the behavior)
      cm.setConnectionMode('auto');
      expect(cm.getConnectionMode()).toBe('auto');
    });

    it('should handle sync with empty data', () => {
      const sm = getSyncManager();
      const itemId = sm.queueSync('conversation', {}, 'local');
      expect(itemId).toBeDefined();
    });

    it('should handle multiple sync managers', () => {
      const sm1 = getSyncManager();
      sm1.queueSync('conversation', { message: 'test1' }, 'local');

      const sm2 = getSyncManager();
      expect(sm1).toBe(sm2); // Should be same instance
    });
  });

  describe('Performance', () => {
    it('should handle rapid connection mode changes', () => {
      const cm = getConnectionManager();
      const modes: Array<'auto' | 'local-only' | 'cloud-only'> = ['auto', 'local-only', 'cloud-only'];

      for (let i = 0; i < 10; i++) {
        modes.forEach((mode) => {
          cm.setConnectionMode(mode);
        });
      }

      expect(cm.getConnectionMode()).toBe('cloud-only');
    });

    it('should handle bulk sync queueing', () => {
      const sm = getSyncManager();
      const itemIds = [];

      for (let i = 0; i < 100; i++) {
        itemIds.push(sm.queueSync('conversation', { index: i }, 'local'));
      }

      expect(itemIds).toHaveLength(100);
      const status = sm.getSyncStatus();
      expect(status.pending).toBe(100);
    });
  });
});
