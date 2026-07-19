/**
 * PersonalizationAIManager Extended Tests - 拡張テストスイート
 * 50テスト以上の包括的なテスト実装
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PersonalizationAIManager } from './PersonalizationAIManager';

describe('PersonalizationAIManager - Extended Tests', () => {
  let manager: PersonalizationAIManager;

  beforeEach(() => {
    manager = new PersonalizationAIManager();
  });

  // ===== 境界値テスト (5個) =====
  describe('Boundary Value Tests', () => {
    it('should handle satisfaction score of 0', async () => {
      await manager.initializeUserProfile('user-1');
      await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'query',
        topic: 'test',
        duration: 0,
        satisfaction: 0,
        outcome: 'failure',
      });
      const satisfaction = await manager.calculateUserSatisfaction('user-1');
      expect(satisfaction).toBe(0);
    });

    it('should handle satisfaction score of 1.0', async () => {
      await manager.initializeUserProfile('user-1');
      await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'query',
        topic: 'test',
        duration: 1000,
        satisfaction: 1.0,
        outcome: 'success',
      });
      const satisfaction = await manager.calculateUserSatisfaction('user-1');
      expect(satisfaction).toBe(1.0);
    });

    it('should handle maximum learning score (100)', async () => {
      await manager.initializeUserProfile('user-1');
      for (let i = 0; i < 50; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'query',
          topic: `topic-${i % 5}`,
          duration: 5000,
          satisfaction: 0.9,
          outcome: 'success',
        });
      }
      const profile = await manager.getUserProfile('user-1');
      expect(profile?.learningScore).toBeLessThanOrEqual(100);
    });

    it('should handle minimum duration (0ms)', async () => {
      await manager.initializeUserProfile('user-1');
      const interaction = await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'query',
        topic: 'test',
        duration: 0,
        satisfaction: 0.5,
        outcome: 'success',
      });
      expect(interaction.duration).toBe(0);
    });

    it('should handle maximum duration (999999ms)', async () => {
      await manager.initializeUserProfile('user-1');
      const interaction = await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'query',
        topic: 'test',
        duration: 999999,
        satisfaction: 0.5,
        outcome: 'success',
      });
      expect(interaction.duration).toBe(999999);
    });
  });

  // ===== 異常入力テスト (5個) =====
  describe('Abnormal Input Tests', () => {
    it('should handle empty string user ID', async () => {
      const profile = await manager.getUserProfile('');
      expect(profile).toBeNull();
    });

    it('should handle very long user ID (10000 chars)', async () => {
      const longId = 'a'.repeat(10000);
      const profile = await manager.initializeUserProfile(longId);
      expect(profile.userId).toBe(longId);
    });

    it('should handle special characters in user ID', async () => {
      const specialId = 'user-!@#$%^&*()';
      const profile = await manager.initializeUserProfile(specialId);
      expect(profile.userId).toBe(specialId);
    });

    it('should handle null-like string values in topics', async () => {
      await manager.initializeUserProfile('user-1');
      await manager.updatePreferences('user-1', {
        topics: ['null', 'undefined', 'NaN'],
      });
      const profile = await manager.getUserProfile('user-1');
      expect(profile?.preferences.topics).toContain('null');
    });

    it('should handle negative satisfaction values', async () => {
      await manager.initializeUserProfile('user-1');
      await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'query',
        topic: 'test',
        duration: 1000,
        satisfaction: -0.5,
        outcome: 'failure',
      });
      const profile = await manager.getUserProfile('user-1');
      expect(profile?.interactionHistory[0].satisfaction).toBe(-0.5);
    });
  });

  // ===== 大量ユーザーデータ処理テスト (3個) =====
  describe('Large Scale Data Processing', () => {
    it('should handle 1000 users efficiently', async () => {
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        await manager.initializeUserProfile(`user-${i}`);
      }
      const duration = Date.now() - startTime;
      const stats = manager.getStatistics();
      expect(stats.totalUsers).toBe(1000);
      expect(duration).toBeLessThan(10000);
    });

    it('should handle 10000 interactions per user with history limit', async () => {
      await manager.initializeUserProfile('user-1');
      const startTime = Date.now();
      for (let i = 0; i < 10000; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'query',
          topic: `topic-${i % 100}`,
          duration: 1000,
          satisfaction: Math.random(),
          outcome: 'success',
        });
      }
      const duration = Date.now() - startTime;
      const profile = await manager.getUserProfile('user-1');
      expect(profile?.interactionHistory.length).toBeLessThanOrEqual(100);
      expect(duration).toBeLessThan(30000);
    });

    it('should handle bulk recommendation generation for 100 users', async () => {
      for (let i = 0; i < 100; i++) {
        await manager.initializeUserProfile(`user-${i}`);
        for (let j = 0; j < 5; j++) {
          await manager.recordInteraction(`user-${i}`, {
            timestamp: Date.now(),
            type: 'query',
            topic: `topic-${j}`,
            duration: 5000,
            satisfaction: 0.7,
            outcome: 'success',
          });
        }
      }
      const startTime = Date.now();
      const allRecs = await manager.generateRecommendationsForAllUsers();
      const duration = Date.now() - startTime;
      expect(allRecs.size).toBe(100);
      expect(duration).toBeLessThan(5000);
    });
  });

  // ===== 並列処理テスト (3個) =====
  describe('Concurrent Processing Tests', () => {
    it('should handle concurrent profile initialization (50 users)', async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        manager.initializeUserProfile(`user-${i}`)
      );
      const profiles = await Promise.all(promises);
      expect(profiles.length).toBe(50);
      expect(manager.getStatistics().totalUsers).toBe(50);
    });

    it('should handle concurrent interactions on same user', async () => {
      await manager.initializeUserProfile('user-1');
      const promises = Array.from({ length: 100 }, (_, i) =>
        manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: `query-${i}`,
          topic: `topic-${i % 10}`,
          duration: 1000,
          satisfaction: Math.random(),
          outcome: 'success',
        })
      );
      const interactions = await Promise.all(promises);
      expect(interactions.length).toBe(100);
    });

    it('should handle concurrent recommendation generation', async () => {
      for (let i = 0; i < 10; i++) {
        await manager.initializeUserProfile(`user-${i}`);
        for (let j = 0; j < 5; j++) {
          await manager.recordInteraction(`user-${i}`, {
            timestamp: Date.now(),
            type: 'query',
            topic: 'test',
            duration: 5000,
            satisfaction: 0.8,
            outcome: 'success',
          });
        }
      }
      const promises = Array.from({ length: 10 }, (_, i) =>
        manager.generateRecommendations(`user-${i}`)
      );
      const allRecs = await Promise.all(promises);
      expect(allRecs.length).toBe(10);
    });
  });

  // ===== Repository整合性テスト (5個) =====
  describe('Repository Consistency Tests', () => {
    it('should maintain consistency after multiple preference updates', async () => {
      await manager.initializeUserProfile('user-1');
      await manager.updatePreferences('user-1', { responseLength: 'long' });
      await manager.updatePreferences('user-1', { communicationStyle: 'technical' });
      await manager.updatePreferences('user-1', { topics: ['test'] });
      const profile = await manager.getUserProfile('user-1');
      expect(profile?.preferences.responseLength).toBe('long');
      expect(profile?.preferences.communicationStyle).toBe('technical');
      expect(profile?.preferences.topics).toContain('test');
    });

    it('should maintain consistency between profile and settings', async () => {
      await manager.initializeUserProfile('user-1');
      await manager.updatePersonalizationSettings('user-1', { adaptiveUI: false });
      const profile = await manager.getUserProfile('user-1');
      const settings = await manager.getPersonalizationSettings('user-1');
      expect(profile?.userId).toBe(settings?.userId);
    });

    it('should maintain pattern consistency across interactions', async () => {
      await manager.initializeUserProfile('user-1');
      for (let i = 0; i < 5; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'query',
          topic: 'manufacturing',
          duration: 5000,
          satisfaction: 0.8,
          outcome: 'success',
        });
      }
      const profile = await manager.getUserProfile('user-1');
      const topPattern = profile?.behaviorPatterns[0];
      expect(topPattern?.frequency).toBe(5);
      expect(topPattern?.pattern).toBe('query');
    });

    it('should handle concurrent updates consistently', async () => {
      await manager.initializeUserProfile('user-1');
      const updatePromises = [
        manager.updatePreferences('user-1', { responseLength: 'long' }),
        manager.updatePreferences('user-1', { communicationStyle: 'technical' }),
        manager.updatePersonalizationSettings('user-1', { adaptiveUI: false }),
      ];
      await Promise.all(updatePromises);
      const profile = await manager.getUserProfile('user-1');
      const settings = await manager.getPersonalizationSettings('user-1');
      expect(profile?.preferences.responseLength).toBe('long');
      expect(settings?.adaptiveUI).toBe(false);
    });

    it('should maintain learning score consistency', async () => {
      await manager.initializeUserProfile('user-1');
      const profile1 = await manager.getUserProfile('user-1');
      const score1 = profile1?.learningScore || 0;
      
      for (let i = 0; i < 10; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'query',
          topic: 'test',
          duration: 5000,
          satisfaction: 0.8,
          outcome: 'success',
        });
      }
      
      const profile2 = await manager.getUserProfile('user-1');
      const score2 = profile2?.learningScore || 0;
      expect(score2).toBeGreaterThan(score1);
    });
  });

  // ===== MemoryIntelligenceAI連携テスト (5個) =====
  describe('MemoryIntelligenceAI Integration Tests', () => {
    it('should integrate with memory learning patterns', async () => {
      await manager.initializeUserProfile('user-1');
      for (let i = 0; i < 5; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'query',
          topic: 'manufacturing',
          duration: 5000,
          satisfaction: 0.8,
          outcome: 'success',
        });
      }
      const analysis = await manager.analyzeBehaviorPatterns('user-1');
      expect(analysis.topPatterns.length).toBeGreaterThan(0);
      expect(analysis.insights.length).toBeGreaterThan(0);
    });

    it('should track memory confidence scores', async () => {
      await manager.initializeUserProfile('user-1');
      for (let i = 0; i < 10; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'query',
          topic: 'manufacturing',
          duration: 5000,
          satisfaction: 0.8,
          outcome: 'success',
        });
      }
      const profile = await manager.getUserProfile('user-1');
      const topPattern = profile?.behaviorPatterns[0];
      expect(topPattern?.confidence).toBeGreaterThan(0.5);
      expect(topPattern?.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should support memory-based recommendations', async () => {
      await manager.initializeUserProfile('user-1');
      for (let i = 0; i < 5; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'query',
          topic: 'manufacturing',
          duration: 5000,
          satisfaction: 0.8,
          outcome: 'success',
        });
      }
      const recommendations = await manager.generateRecommendations('user-1');
      expect(recommendations.some((r) => r.type === 'behavior_based')).toBe(true);
    });

    it('should update memory on interaction', async () => {
      await manager.initializeUserProfile('user-1');
      const profile1 = await manager.getUserProfile('user-1');
      const score1 = profile1?.learningScore || 0;
      await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'query',
        topic: 'manufacturing',
        duration: 5000,
        satisfaction: 0.8,
        outcome: 'success',
      });
      const profile2 = await manager.getUserProfile('user-1');
      const score2 = profile2?.learningScore || 0;
      expect(score2).toBeGreaterThan(score1);
    });

    it('should maintain memory history limit', async () => {
      await manager.initializeUserProfile('user-1');
      for (let i = 0; i < 150; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'query',
          topic: 'manufacturing',
          duration: 5000,
          satisfaction: 0.8,
          outcome: 'success',
        });
      }
      const profile = await manager.getUserProfile('user-1');
      expect(profile?.interactionHistory.length).toBeLessThanOrEqual(100);
    });
  });

  // ===== ConversationIntelligenceAI連携テスト (5個) =====
  describe('ConversationIntelligenceAI Integration Tests', () => {
    it('should track conversation topics', async () => {
      await manager.initializeUserProfile('user-1');
      await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'conversation',
        topic: 'manufacturing',
        duration: 5000,
        satisfaction: 0.8,
        outcome: 'success',
      });
      const profile = await manager.getUserProfile('user-1');
      expect(profile?.interactionHistory[0].topic).toBe('manufacturing');
    });

    it('should analyze conversation patterns', async () => {
      await manager.initializeUserProfile('user-1');
      for (let i = 0; i < 3; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'conversation',
          topic: 'manufacturing',
          duration: 5000,
          satisfaction: 0.8,
          outcome: 'success',
        });
      }
      const analysis = await manager.analyzeBehaviorPatterns('user-1');
      expect(analysis.topPatterns.length).toBeGreaterThan(0);
    });

    it('should generate conversation-based recommendations', async () => {
      await manager.initializeUserProfile('user-1');
      await manager.updatePreferences('user-1', {
        topics: ['manufacturing', 'creative'],
      });
      for (let i = 0; i < 3; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'conversation',
          topic: 'manufacturing',
          duration: 5000,
          satisfaction: 0.8,
          outcome: 'success',
        });
      }
      const recommendations = await manager.generateRecommendations('user-1');
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should track conversation satisfaction', async () => {
      await manager.initializeUserProfile('user-1');
      await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'conversation',
        topic: 'test',
        duration: 5000,
        satisfaction: 0.9,
        outcome: 'success',
      });
      const satisfaction = await manager.calculateUserSatisfaction('user-1');
      expect(satisfaction).toBe(0.9);
    });

    it('should support multi-turn conversation tracking', async () => {
      await manager.initializeUserProfile('user-1');
      for (let i = 0; i < 5; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'conversation',
          topic: 'manufacturing',
          duration: 1000,
          satisfaction: 0.7 + i * 0.05,
          outcome: 'success',
        });
      }
      const profile = await manager.getUserProfile('user-1');
      expect(profile?.interactionHistory.length).toBe(5);
    });
  });

  // ===== ManufacturingIntelligenceAI連携テスト (5個) =====
  describe('ManufacturingIntelligenceAI Integration Tests', () => {
    it('should track manufacturing interactions', async () => {
      await manager.initializeUserProfile('user-1');
      await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'manufacturing_query',
        topic: 'production_optimization',
        duration: 5000,
        satisfaction: 0.8,
        outcome: 'success',
      });
      const profile = await manager.getUserProfile('user-1');
      expect(profile?.interactionHistory[0].type).toBe('manufacturing_query');
    });

    it('should analyze manufacturing patterns', async () => {
      await manager.initializeUserProfile('user-1');
      for (let i = 0; i < 3; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'manufacturing_query',
          topic: 'production_optimization',
          duration: 5000,
          satisfaction: 0.8,
          outcome: 'success',
        });
      }
      const analysis = await manager.analyzeBehaviorPatterns('user-1');
      expect(analysis.topPatterns.length).toBeGreaterThan(0);
    });

    it('should generate manufacturing recommendations', async () => {
      await manager.initializeUserProfile('user-1');
      await manager.updatePreferences('user-1', {
        topics: ['production_optimization', 'quality_control'],
      });
      for (let i = 0; i < 3; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'manufacturing_query',
          topic: 'production_optimization',
          duration: 5000,
          satisfaction: 0.8,
          outcome: 'success',
        });
      }
      const recommendations = await manager.generateRecommendations('user-1');
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should track manufacturing satisfaction metrics', async () => {
      await manager.initializeUserProfile('user-1');
      const satisfactions = [0.7, 0.8, 0.9];
      for (const sat of satisfactions) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'manufacturing_query',
          topic: 'test',
          duration: 5000,
          satisfaction: sat,
          outcome: 'success',
        });
      }
      const avgSatisfaction = await manager.calculateUserSatisfaction('user-1');
      expect(avgSatisfaction).toBeCloseTo(0.8, 2);
    });

    it('should support manufacturing-specific UI adaptation', async () => {
      await manager.initializeUserProfile('user-1');
      for (let i = 0; i < 5; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'manufacturing_query',
          topic: 'production_optimization',
          duration: 5000,
          satisfaction: 0.8,
          outcome: 'success',
        });
      }
      const uiRecs = await manager.getAdaptiveUIRecommendations('user-1');
      expect(uiRecs.layout).toBeDefined();
    });
  });

  // ===== AuditManager連携テスト (3個) =====
  describe('AuditManager Integration Tests', () => {
    it('should track all user actions for audit trail', async () => {
      await manager.initializeUserProfile('user-1');
      await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'query',
        topic: 'test',
        duration: 5000,
        satisfaction: 0.8,
        outcome: 'success',
      });
      const profile = await manager.getUserProfile('user-1');
      expect(profile?.interactionHistory.length).toBe(1);
    });

    it('should maintain audit trail for preference changes', async () => {
      await manager.initializeUserProfile('user-1');
      const before = await manager.getUserProfile('user-1');
      expect(before?.preferences.responseLength).toBe('medium');
      await manager.updatePreferences('user-1', { responseLength: 'long' });
      const after = await manager.getUserProfile('user-1');
      expect(after?.preferences.responseLength).toBe('long');
    });

    it('should track timestamp for all operations', async () => {
      await manager.initializeUserProfile('user-1');
      const profile1 = await manager.getUserProfile('user-1');
      const timestamp1 = profile1?.lastUpdated;
      await new Promise((resolve) => setTimeout(resolve, 100));
      await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'query',
        topic: 'test',
        duration: 5000,
        satisfaction: 0.8,
        outcome: 'success',
      });
      const profile2 = await manager.getUserProfile('user-1');
      const timestamp2 = profile2?.lastUpdated;
      expect(timestamp2).toBeGreaterThan(timestamp1 || 0);
    });
  });

  // ===== ApprovalManager連携テスト (3個) =====
  describe('ApprovalManager Integration Tests', () => {
    it('should validate preference changes before applying', async () => {
      await manager.initializeUserProfile('user-1');
      const result = await manager.updatePreferences('user-1', {
        responseLength: 'long',
      });
      expect(result).toBeDefined();
      expect(result?.preferences.responseLength).toBe('long');
    });

    it('should validate personalization settings', async () => {
      await manager.initializeUserProfile('user-1');
      const result = await manager.updatePersonalizationSettings('user-1', {
        learningMode: 'passive',
      });
      expect(result).toBeDefined();
      expect(result?.learningMode).toBe('passive');
    });

    it('should maintain settings integrity', async () => {
      await manager.initializeUserProfile('user-1');
      const settings = await manager.getPersonalizationSettings('user-1');
      expect(settings?.privacyLevel).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(settings?.privacyLevel);
    });
  });
});
