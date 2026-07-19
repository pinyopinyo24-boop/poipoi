/**
 * QualityGateManager Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { qualityGateManager, QualityGateManager } from './QualityGateManager';

describe('QualityGateManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    qualityGateManager.cleanup();
  });

  afterEach(() => {
    qualityGateManager.cleanup();
  });

  // === 品質ゲート実行テスト ===
  describe('Execute Quality Gate', () => {
    it('should execute quality gate', () => {
      const gate = qualityGateManager.executeQualityGate('1.0.0', 85, 90, 88, 82, []);
      expect(gate).not.toBeNull();
      expect(gate.status).toBe('passed');
    });

    it('should detect failed gate', () => {
      const gate = qualityGateManager.executeQualityGate('1.0.0', 50, 60, 70, 75, []);
      expect(gate.status).toBe('failed');
    });

    it('should detect warning gate', () => {
      const gate = qualityGateManager.executeQualityGate('1.0.0', 75, 75, 75, 75, []);
      expect(gate.status).toBe('warning');
    });
  });

  // === 品質ゲート取得テスト ===
  describe('Get Quality Gate', () => {
    it('should get quality gate', () => {
      const created = qualityGateManager.executeQualityGate('1.0.0', 85, 90, 88, 82, []);
      const retrieved = qualityGateManager.getQualityGate(created.gateId);
      expect(retrieved).not.toBeNull();
    });

    it('should get all quality gates', () => {
      qualityGateManager.executeQualityGate('1.0.0', 85, 90, 88, 82, []);
      qualityGateManager.executeQualityGate('1.1.0', 88, 92, 90, 85, []);
      const gates = qualityGateManager.getAllQualityGates();
      expect(gates.length).toBe(2);
    });

    it('should get latest quality gate', () => {
      qualityGateManager.executeQualityGate('1.0.0', 85, 90, 88, 82, []);
      const latest = qualityGateManager.getLatestQualityGate('1.0.0');
      expect(latest).not.toBeNull();
    });
  });

  // === デプロイ判定テスト ===
  describe('Deployment Decision', () => {
    it('should allow deployment for passed gate', () => {
      qualityGateManager.executeQualityGate('1.0.0', 85, 90, 88, 82, []);
      const canDeploy = qualityGateManager.canDeploy('1.0.0');
      expect(canDeploy).toBe(true);
    });

    it('should prevent deployment for failed gate', () => {
      qualityGateManager.executeQualityGate('1.0.0', 50, 60, 70, 75, []);
      const canDeploy = qualityGateManager.canDeploy('1.0.0');
      expect(canDeploy).toBe(false);
    });
  });

  // === 品質問題検出テスト ===
  describe('Quality Issue Detection', () => {
    it('should detect quality issues', () => {
      const issues = [
        {
          issueId: 'issue_1',
          type: 'code_quality' as const,
          severity: 'high' as const,
          description: 'Complex function',
        },
      ];
      qualityGateManager.executeQualityGate('1.0.0', 75, 80, 85, 80, issues);
      const detected = qualityGateManager.detectQualityIssues('1.0.0');
      expect(detected.length).toBe(1);
    });
  });

  // === 品質統計テスト ===
  describe('Quality Statistics', () => {
    it('should get quality statistics', () => {
      qualityGateManager.executeQualityGate('1.0.0', 85, 90, 88, 82, []);
      qualityGateManager.executeQualityGate('1.1.0', 88, 92, 90, 85, []);
      const stats = qualityGateManager.getQualityStatistics();
      expect(stats.totalGates).toBe(2);
    });

    it('should calculate average scores', () => {
      qualityGateManager.executeQualityGate('1.0.0', 80, 85, 90, 75, []);
      qualityGateManager.executeQualityGate('1.1.0', 90, 95, 85, 90, []);
      const stats = qualityGateManager.getQualityStatistics();
      expect(stats.averageCodeQuality).toBe(85);
    });

    it('should count gate statuses', () => {
      qualityGateManager.executeQualityGate('1.0.0', 85, 90, 88, 82, []);
      qualityGateManager.executeQualityGate('1.1.0', 50, 60, 70, 75, []);
      const stats = qualityGateManager.getQualityStatistics();
      expect(stats.passedGates).toBe(1);
      expect(stats.failedGates).toBe(1);
    });
  });

  // === クリーンアップテスト ===
  describe('Cleanup', () => {
    it('should cleanup', () => {
      qualityGateManager.executeQualityGate('1.0.0', 85, 90, 88, 82, []);
      qualityGateManager.cleanup();
      const gates = qualityGateManager.getAllQualityGates();
      expect(gates.length).toBe(0);
    });
  });

  // === シングルトン確認テスト ===
  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = QualityGateManager.getInstance();
      const instance2 = QualityGateManager.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
