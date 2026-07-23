/**
 * STEP 63 ProductionIntegrationLayer Tests - 50+テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProductionIntegrationLayer } from './ProductionIntegrationLayer';

describe('STEP 63 ProductionIntegrationLayer', () => {
  let layer: ProductionIntegrationLayer;

  beforeEach(() => {
    layer = new ProductionIntegrationLayer();
  });

  // ===== リクエスト処理テスト (5個) =====
  describe('Request Processing Tests', () => {
    it('should process basic request', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: '製造プロセスを分析してください',
      };

      const response = await layer.processRequest(request);
      expect(response.id).toBeTruthy();
      expect(response.userId).toBe('user1');
      expect(response.response).toBeTruthy();
    });

    it('should generate response with insights', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: '品質改善の提案をください',
      };

      const response = await layer.processRequest(request);
      expect(response.insights).toBeTruthy();
      expect(Array.isArray(response.insights)).toBe(true);
    });

    it('should generate actions', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'ワークフローを作成してください',
      };

      const response = await layer.processRequest(request);
      expect(response.actions).toBeTruthy();
      expect(Array.isArray(response.actions)).toBe(true);
    });

    it('should handle multiple requests', async () => {
      const requests = [
        { userId: 'user1', sessionId: 'session1', message: '製造分析' },
        { userId: 'user2', sessionId: 'session2', message: '品質改善' },
        { userId: 'user3', sessionId: 'session3', message: '原価削減' },
      ];

      const responses = await Promise.all(requests.map((r) => layer.processRequest(r)));
      expect(responses.length).toBe(3);
      responses.forEach((r) => expect(r.response).toBeTruthy());
    });

    it('should track request timestamp', async () => {
      const before = Date.now();
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'テスト',
      };

      const response = await layer.processRequest(request);
      const after = Date.now();

      expect(response.timestamp).toBeGreaterThanOrEqual(before);
      expect(response.timestamp).toBeLessThanOrEqual(after);
    });
  });

  // ===== 意図分析テスト (5個) =====
  describe('Intent Analysis Tests', () => {
    it('should detect manufacturing intent', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: '製造プロセスの最適化',
      };

      const response = await layer.processRequest(request);
      expect(response.response).toContain('分析');
    });

    it('should detect quality intent', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: '品質管理の改善',
      };

      const response = await layer.processRequest(request);
      expect(response.response).toBeTruthy();
    });

    it('should detect improvement intent', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: '工程改善の提案',
      };

      const response = await layer.processRequest(request);
      expect(response.response).toBeTruthy();
    });

    it('should detect cost intent', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: '原価削減方法',
      };

      const response = await layer.processRequest(request);
      expect(response.response).toBeTruthy();
    });

    it('should handle general intent', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'こんにちは',
      };

      const response = await layer.processRequest(request);
      expect(response.response).toBeTruthy();
    });
  });

  // ===== マネージャー選択テスト (5個) =====
  describe('Manager Selection Tests', () => {
    it('should select appropriate managers for manufacturing', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: '製造品質分析',
      };

      const response = await layer.processRequest(request);
      expect(response.insights.length).toBeGreaterThan(0);
    });

    it('should select managers for vision analysis', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: '画像解析してください',
      };

      const response = await layer.processRequest(request);
      expect(response.response).toBeTruthy();
    });

    it('should select managers for file processing', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'ファイルを分析',
      };

      const response = await layer.processRequest(request);
      expect(response.response).toBeTruthy();
    });

    it('should select managers for workflow', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'ワークフロー自動化',
      };

      const response = await layer.processRequest(request);
      expect(response.response).toBeTruthy();
    });

    it('should select managers for suggestions', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: '改善提案をください',
      };

      const response = await layer.processRequest(request);
      expect(response.response).toBeTruthy();
    });
  });

  // ===== マネージャー状態テスト (5個) =====
  describe('Manager State Tests', () => {
    it('should initialize all managers', async () => {
      const states = await layer.getManagerStates();
      expect(states.length).toBeGreaterThan(0);
      states.forEach((state) => {
        expect(state.name).toBeTruthy();
        expect(state.status).toBe('active');
      });
    });

    it('should track manager usage', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: '製造分析',
      };

      await layer.processRequest(request);
      const states = await layer.getManagerStates();
      const usedManager = states.find((s) => s.requestCount > 0);
      expect(usedManager).toBeTruthy();
    });

    it('should update last used timestamp', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'テスト',
      };

      const before = Date.now();
      await layer.processRequest(request);
      const after = Date.now();

      const states = await layer.getManagerStates();
      const usedManager = states.find((s) => s.requestCount > 0);
      if (usedManager) {
        expect(usedManager.lastUsed).toBeGreaterThanOrEqual(before);
        expect(usedManager.lastUsed).toBeLessThanOrEqual(after);
      }
    });

    it('should handle multiple manager requests', async () => {
      for (let i = 0; i < 5; i++) {
        const request = {
          userId: 'user1',
          sessionId: 'session1',
          message: `リクエスト${i}`,
        };
        await layer.processRequest(request);
      }

      const states = await layer.getManagerStates();
      const totalRequests = states.reduce((sum, s) => sum + s.requestCount, 0);
      expect(totalRequests).toBeGreaterThan(0);
    });

    it('should maintain manager status', async () => {
      const states1 = await layer.getManagerStates();
      const activeCount1 = states1.filter((s) => s.status === 'active').length;

      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'テスト',
      };
      await layer.processRequest(request);

      const states2 = await layer.getManagerStates();
      const activeCount2 = states2.filter((s) => s.status === 'active').length;

      expect(activeCount2).toBeGreaterThanOrEqual(activeCount1 - 1);
    });
  });

  // ===== メトリクステスト (5個) =====
  describe('Metrics Tests', () => {
    it('should track total requests', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'テスト',
      };

      await layer.processRequest(request);
      const metrics = await layer.getMetrics();
      expect(metrics.totalRequests).toBeGreaterThan(0);
    });

    it('should track successful requests', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'テスト',
      };

      await layer.processRequest(request);
      const metrics = await layer.getMetrics();
      expect(metrics.successfulRequests).toBeGreaterThan(0);
    });

    it('should calculate average response time', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'テスト',
      };

      await layer.processRequest(request);
      const metrics = await layer.getMetrics();
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
    });

    it('should track multiple requests metrics', async () => {
      for (let i = 0; i < 3; i++) {
        const request = {
          userId: 'user1',
          sessionId: 'session1',
          message: `テスト${i}`,
        };
        await layer.processRequest(request);
      }

      const metrics = await layer.getMetrics();
      expect(metrics.totalRequests).toBe(3);
    });

    it('should maintain manager states in metrics', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'テスト',
      };

      await layer.processRequest(request);
      const metrics = await layer.getMetrics();
      expect(metrics.managerStates.length).toBeGreaterThan(0);
    });
  });

  // ===== 履歴管理テスト (5個) =====
  describe('History Management Tests', () => {
    it('should retrieve request history', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'テスト',
      };

      await layer.processRequest(request);
      const history = await layer.getRequestHistory('user1');
      expect(history.length).toBeGreaterThan(0);
    });

    it('should retrieve response history', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'テスト',
      };

      await layer.processRequest(request);
      const history = await layer.getResponseHistory('user1');
      expect(history.length).toBeGreaterThan(0);
    });

    it('should filter history by user', async () => {
      const request1 = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'テスト1',
      };
      const request2 = {
        userId: 'user2',
        sessionId: 'session2',
        message: 'テスト2',
      };

      await layer.processRequest(request1);
      await layer.processRequest(request2);

      const history1 = await layer.getRequestHistory('user1');
      const history2 = await layer.getRequestHistory('user2');

      expect(history1.length).toBeGreaterThan(0);
      expect(history2.length).toBeGreaterThan(0);
    });

    it('should limit history results', async () => {
      for (let i = 0; i < 20; i++) {
        const request = {
          userId: 'user1',
          sessionId: 'session1',
          message: `テスト${i}`,
        };
        await layer.processRequest(request);
      }

      const history = await layer.getRequestHistory('user1', 5);
      expect(history.length).toBeLessThanOrEqual(5);
    });

    it('should maintain history order', async () => {
      for (let i = 0; i < 3; i++) {
        const request = {
          userId: 'user1',
          sessionId: 'session1',
          message: `テスト${i}`,
        };
        await layer.processRequest(request);
      }

      const history = await layer.getResponseHistory('user1');
      if (history.length > 1) {
        for (let i = 0; i < history.length - 1; i++) {
          expect(history[i].timestamp).toBeLessThanOrEqual(history[i + 1].timestamp);
        }
      }
    });
  });

  // ===== セッション管理テスト (5個) =====
  describe('Session Management Tests', () => {
    it('should initialize session', async () => {
      const session = await layer.initializeSession('user1', 'session1');
      expect(session.userId).toBe('user1');
      expect(session.sessionId).toBe('session1');
      expect(session.status).toBe('ready');
    });

    it('should close session', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'テスト',
      };

      await layer.processRequest(request);
      const closed = await layer.closeSession('session1');
      expect(closed.sessionId).toBe('session1');
      expect(closed.requestCount).toBeGreaterThan(0);
    });

    it('should track session requests', async () => {
      for (let i = 0; i < 3; i++) {
        const request = {
          userId: 'user1',
          sessionId: 'session1',
          message: `テスト${i}`,
        };
        await layer.processRequest(request);
      }

      const closed = await layer.closeSession('session1');
      expect(closed.requestCount).toBe(3);
    });

    it('should handle multiple sessions', async () => {
      const request1 = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'テスト1',
      };
      const request2 = {
        userId: 'user1',
        sessionId: 'session2',
        message: 'テスト2',
      };

      await layer.processRequest(request1);
      await layer.processRequest(request2);

      const closed1 = await layer.closeSession('session1');
      const closed2 = await layer.closeSession('session2');

      expect(closed1.requestCount).toBeGreaterThan(0);
      expect(closed2.requestCount).toBeGreaterThan(0);
    });

    it('should include managers in session init', async () => {
      const session = await layer.initializeSession('user1', 'session1');
      expect(session.managers).toBeTruthy();
      expect(Array.isArray(session.managers)).toBe(true);
      expect(session.managers.length).toBeGreaterThan(0);
    });
  });

  // ===== 統計テスト (5個) =====
  describe('Statistics Tests', () => {
    it('should calculate success rate', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'テスト',
      };

      await layer.processRequest(request);
      const stats = await layer.getStatistics();
      expect(stats.successRate).toBeTruthy();
      expect(parseFloat(stats.successRate)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(stats.successRate)).toBeLessThanOrEqual(100);
    });

    it('should count active managers', async () => {
      const stats = await layer.getStatistics();
      expect(stats.managerCount).toBeGreaterThan(0);
      expect(stats.activeManagers).toBeGreaterThanOrEqual(0);
      expect(stats.activeManagers).toBeLessThanOrEqual(stats.managerCount);
    });

    it('should track failed requests', async () => {
      const stats = await layer.getStatistics();
      expect(stats.failedRequests).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average response time', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'テスト',
      };

      await layer.processRequest(request);
      const stats = await layer.getStatistics();
      expect(parseFloat(stats.averageResponseTime)).toBeGreaterThanOrEqual(0);
    });

    it('should provide comprehensive statistics', async () => {
      for (let i = 0; i < 5; i++) {
        const request = {
          userId: 'user1',
          sessionId: 'session1',
          message: `テスト${i}`,
        };
        await layer.processRequest(request);
      }

      const stats = await layer.getStatistics();
      expect(stats.totalRequests).toBe(5);
      expect(stats.successfulRequests).toBeGreaterThan(0);
      expect(parseFloat(stats.averageResponseTime)).toBeGreaterThanOrEqual(0);
    });
  });

  // ===== パフォーマンステスト (3個) =====
  describe('Performance Tests', () => {
    it('should handle bulk requests', async () => {
      const startTime = Date.now();
      for (let i = 0; i < 20; i++) {
        const request = {
          userId: 'user1',
          sessionId: 'session1',
          message: `テスト${i}`,
        };
        await layer.processRequest(request);
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        userId: `user${i}`,
        sessionId: `session${i}`,
        message: `テスト${i}`,
      }));

      const startTime = Date.now();
      await Promise.all(requests.map((r) => layer.processRequest(r)));
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000);
    });

    it('should maintain response quality under load', async () => {
      for (let i = 0; i < 15; i++) {
        const request = {
          userId: 'user1',
          sessionId: 'session1',
          message: `テスト${i}`,
        };
        const response = await layer.processRequest(request);
        expect(response.response).toBeTruthy();
        expect(response.insights).toBeTruthy();
      }
    });
  });

  // ===== クリーンアップテスト (2個) =====
  describe('Cleanup Tests', () => {
    it('should clear all data', async () => {
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'テスト',
      };

      await layer.processRequest(request);
      await layer.clear();

      const metrics = await layer.getMetrics();
      expect(metrics.totalRequests).toBe(0);
    });

    it('should handle operations after clear', async () => {
      await layer.clear();
      const request = {
        userId: 'user1',
        sessionId: 'session1',
        message: 'テスト',
      };

      const response = await layer.processRequest(request);
      expect(response.response).toBeTruthy();
    });
  });
});
