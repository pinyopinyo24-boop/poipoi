/**
 * PersonalizationAIManager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PersonalizationAIManager, Interaction } from './PersonalizationAIManager';

describe('PersonalizationAIManager', () => {
  let manager: PersonalizationAIManager;

  beforeEach(() => {
    manager = new PersonalizationAIManager();
  });

  describe('User Profile Initialization', () => {
    it('should initialize user profile', async () => {
      const profile = await manager.initializeUserProfile('user-1');

      expect(profile).toBeDefined();
      expect(profile.userId).toBe('user-1');
      expect(profile.preferences).toBeDefined();
      expect(profile.behaviorPatterns).toEqual([]);
      expect(profile.interactionHistory).toEqual([]);
    });

    it('should set default preferences', async () => {
      const profile = await manager.initializeUserProfile('user-1');

      expect(profile.preferences.responseLength).toBe('medium');
      expect(profile.preferences.communicationStyle).toBe('casual');
      expect(profile.preferences.languages).toContain('ja');
    });

    it('should create default personalization settings', async () => {
      await manager.initializeUserProfile('user-1');
      const settings = await manager.getPersonalizationSettings('user-1');

      expect(settings).toBeDefined();
      expect(settings?.adaptiveUI).toBe(true);
      expect(settings?.learningMode).toBe('active');
    });

    it('should set initial learning score to 0', async () => {
      const profile = await manager.initializeUserProfile('user-1');

      expect(profile.learningScore).toBe(0);
    });
  });

  describe('Interaction Recording', () => {
    it('should record interaction', async () => {
      await manager.initializeUserProfile('user-1');

      const interaction = await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'query',
        topic: 'manufacturing',
        duration: 5000,
        satisfaction: 0.8,
        outcome: 'success',
      });

      expect(interaction).toBeDefined();
      expect(interaction.id).toBeDefined();
      expect(interaction.type).toBe('query');
    });

    it('should update interaction history', async () => {
      await manager.initializeUserProfile('user-1');

      await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'query',
        topic: 'manufacturing',
        duration: 5000,
        satisfaction: 0.8,
        outcome: 'success',
      });

      const profile = await manager.getUserProfile('user-1');
      expect(profile?.interactionHistory.length).toBe(1);
    });

    it('should limit interaction history to 100', async () => {
      await manager.initializeUserProfile('user-1');

      for (let i = 0; i < 150; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'query',
          topic: 'test',
          duration: 1000,
          satisfaction: 0.5,
          outcome: 'success',
        });
      }

      const profile = await manager.getUserProfile('user-1');
      expect(profile?.interactionHistory.length).toBeLessThanOrEqual(100);
    });

    it('should update learning score on interaction', async () => {
      await manager.initializeUserProfile('user-1');

      const profile1 = await manager.getUserProfile('user-1');
      expect(profile1?.learningScore).toBe(0);

      await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'query',
        topic: 'manufacturing',
        duration: 5000,
        satisfaction: 0.8,
        outcome: 'success',
      });

      const profile2 = await manager.getUserProfile('user-1');
      expect(profile2?.learningScore).toBeGreaterThan(0);
    });
  });

  describe('Behavior Pattern Analysis', () => {
    it('should analyze behavior patterns', async () => {
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
      expect(profile?.behaviorPatterns.length).toBeGreaterThan(0);
    });

    it('should track pattern frequency', async () => {
      await manager.initializeUserProfile('user-1');

      for (let i = 0; i < 3; i++) {
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
      const pattern = profile?.behaviorPatterns[0];
      expect(pattern?.frequency).toBe(3);
    });

    it('should increase pattern confidence', async () => {
      await manager.initializeUserProfile('user-1');

      const confidences: number[] = [];

      for (let i = 0; i < 10; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'query',
          topic: 'manufacturing',
          duration: 5000,
          satisfaction: 0.8,
          outcome: 'success',
        });

        const profile = await manager.getUserProfile('user-1');
        if (profile?.behaviorPatterns[0]) {
          confidences.push(profile.behaviorPatterns[0].confidence);
        }
      }

      // 信頼度が増加していることを確認
      for (let i = 1; i < confidences.length; i++) {
        expect(confidences[i]).toBeGreaterThanOrEqual(confidences[i - 1]);
      }
    });

    it('should limit patterns to 20', async () => {
      await manager.initializeUserProfile('user-1');

      for (let i = 0; i < 30; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: `query-${i}`,
          topic: `topic-${i}`,
          duration: 5000,
          satisfaction: 0.8,
          outcome: 'success',
        });
      }

      const profile = await manager.getUserProfile('user-1');
      expect(profile?.behaviorPatterns.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate recommendations', async () => {
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

      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should include relevance score', async () => {
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

      recommendations.forEach((rec) => {
        expect(rec.relevance).toBeGreaterThanOrEqual(0);
        expect(rec.relevance).toBeLessThanOrEqual(1);
      });
    });

    it('should limit recommendations to 5', async () => {
      await manager.initializeUserProfile('user-1');

      for (let i = 0; i < 10; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'query',
          topic: `topic-${i}`,
          duration: 5000,
          satisfaction: 0.8,
          outcome: 'success',
        });
      }

      const recommendations = await manager.generateRecommendations('user-1');

      expect(recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should sort by relevance', async () => {
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

      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i - 1].relevance).toBeGreaterThanOrEqual(
          recommendations[i].relevance
        );
      }
    });
  });

  describe('Preference Management', () => {
    it('should update preferences', async () => {
      await manager.initializeUserProfile('user-1');

      const updated = await manager.updatePreferences('user-1', {
        responseLength: 'long',
        communicationStyle: 'technical',
      });

      expect(updated?.preferences.responseLength).toBe('long');
      expect(updated?.preferences.communicationStyle).toBe('technical');
    });

    it('should preserve other preferences', async () => {
      await manager.initializeUserProfile('user-1');

      await manager.updatePreferences('user-1', {
        responseLength: 'long',
      });

      const profile = await manager.getUserProfile('user-1');
      expect(profile?.preferences.communicationStyle).toBe('casual');
    });

    it('should update topics', async () => {
      await manager.initializeUserProfile('user-1');

      await manager.updatePreferences('user-1', {
        topics: ['manufacturing', 'creative'],
      });

      const profile = await manager.getUserProfile('user-1');
      expect(profile?.preferences.topics).toContain('manufacturing');
      expect(profile?.preferences.topics).toContain('creative');
    });
  });

  describe('Personalization Settings', () => {
    it('should update personalization settings', async () => {
      await manager.initializeUserProfile('user-1');

      await manager.updatePersonalizationSettings('user-1', {
        adaptiveUI: false,
        learningMode: 'passive',
      });

      const settings = await manager.getPersonalizationSettings('user-1');
      expect(settings?.adaptiveUI).toBe(false);
      expect(settings?.learningMode).toBe('passive');
    });

    it('should preserve other settings', async () => {
      await manager.initializeUserProfile('user-1');

      await manager.updatePersonalizationSettings('user-1', {
        adaptiveUI: false,
      });

      const settings = await manager.getPersonalizationSettings('user-1');
      expect(settings?.contentFiltering).toBe(true);
    });
  });

  describe('Behavior Analysis', () => {
    it('should analyze behavior patterns', async () => {
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

      expect(analysis.topPatterns).toBeDefined();
      expect(analysis.insights).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
    });

    it('should generate insights', async () => {
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

      expect(analysis.insights.length).toBeGreaterThan(0);
    });
  });

  describe('Adaptive UI Recommendations', () => {
    it('should get adaptive UI recommendations', async () => {
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

      const recommendations = await manager.getAdaptiveUIRecommendations('user-1');

      expect(recommendations).toBeDefined();
      expect(recommendations.layout).toBeDefined();
      expect(recommendations.colorScheme).toBeDefined();
      expect(recommendations.fontSize).toBeDefined();
      expect(recommendations.contentDensity).toBeDefined();
    });

    it('should recommend layout based on patterns', async () => {
      await manager.initializeUserProfile('user-1');

      for (let i = 0; i < 10; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: `query-${i}`,
          topic: `topic-${i}`,
          duration: 5000,
          satisfaction: 0.8,
          outcome: 'success',
        });
      }

      const recommendations = await manager.getAdaptiveUIRecommendations('user-1');

      expect(['compact', 'standard']).toContain(recommendations.layout);
    });
  });

  describe('User Satisfaction', () => {
    it('should calculate user satisfaction', async () => {
      await manager.initializeUserProfile('user-1');

      await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'query',
        topic: 'manufacturing',
        duration: 5000,
        satisfaction: 0.8,
        outcome: 'success',
      });

      const satisfaction = await manager.calculateUserSatisfaction('user-1');

      expect(satisfaction).toBe(0.8);
    });

    it('should average multiple satisfactions', async () => {
      await manager.initializeUserProfile('user-1');

      await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'query',
        topic: 'test',
        duration: 5000,
        satisfaction: 0.6,
        outcome: 'success',
      });

      await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'query',
        topic: 'test',
        duration: 5000,
        satisfaction: 1.0,
        outcome: 'success',
      });

      const satisfaction = await manager.calculateUserSatisfaction('user-1');

      expect(satisfaction).toBe(0.8);
    });
  });

  describe('User Segmentation', () => {
    it('should segment users by engagement', async () => {
      await manager.initializeUserProfile('user-1');
      await manager.initializeUserProfile('user-2');
      await manager.initializeUserProfile('user-3');

      // High engagement user
      for (let i = 0; i < 20; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'query',
          topic: 'manufacturing',
          duration: 5000,
          satisfaction: 0.9,
          outcome: 'success',
        });
      }

      // Low engagement user
      await manager.recordInteraction('user-3', {
        timestamp: Date.now(),
        type: 'query',
        topic: 'test',
        duration: 1000,
        satisfaction: 0.3,
        outcome: 'failure',
      });

      const segments = await manager.segmentUsers();

      expect(segments.highEngagement).toContain('user-1');
      expect(segments.lowEngagement).toContain('user-3');
    });
  });

  describe('Statistics', () => {
    it('should get statistics', async () => {
      await manager.initializeUserProfile('user-1');

      const stats = manager.getStatistics();

      expect(stats.totalUsers).toBe(1);
      expect(stats.totalInteractions).toBe(0);
    });

    it('should track total interactions', async () => {
      await manager.initializeUserProfile('user-1');

      await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'query',
        topic: 'test',
        duration: 5000,
        satisfaction: 0.8,
        outcome: 'success',
      });

      const stats = manager.getStatistics();

      expect(stats.totalInteractions).toBe(1);
    });
  });

  describe('Profile Clearing', () => {
    it('should clear user profile', async () => {
      await manager.initializeUserProfile('user-1');

      await manager.recordInteraction('user-1', {
        timestamp: Date.now(),
        type: 'query',
        topic: 'test',
        duration: 5000,
        satisfaction: 0.8,
        outcome: 'success',
      });

      await manager.clearUserProfile('user-1');

      const profile = await manager.getUserProfile('user-1');
      expect(profile).toBeNull();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete personalization workflow', async () => {
      // Initialize
      const profile = await manager.initializeUserProfile('user-1');
      expect(profile).toBeDefined();

      // Record interactions
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

      // Update preferences
      await manager.updatePreferences('user-1', {
        responseLength: 'long',
      });

      // Generate recommendations
      const recommendations = await manager.generateRecommendations('user-1');
      expect(recommendations.length).toBeGreaterThan(0);

      // Analyze behavior
      const analysis = await manager.analyzeBehaviorPatterns('user-1');
      expect(analysis.topPatterns.length).toBeGreaterThan(0);

      // Get adaptive UI
      const ui = await manager.getAdaptiveUIRecommendations('user-1');
      expect(ui.layout).toBeDefined();

      // Calculate satisfaction
      const satisfaction = await manager.calculateUserSatisfaction('user-1');
      expect(satisfaction).toBeGreaterThan(0);
    });

    it('should handle multiple users', async () => {
      for (let i = 1; i <= 5; i++) {
        await manager.initializeUserProfile(`user-${i}`);

        for (let j = 0; j < 3; j++) {
          await manager.recordInteraction(`user-${i}`, {
            timestamp: Date.now(),
            type: 'query',
            topic: 'test',
            duration: 5000,
            satisfaction: 0.7,
            outcome: 'success',
          });
        }
      }

      const stats = manager.getStatistics();
      expect(stats.totalUsers).toBe(5);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large interaction history', async () => {
      await manager.initializeUserProfile('user-1');

      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'query',
          topic: `topic-${i % 10}`,
          duration: 5000,
          satisfaction: Math.random(),
          outcome: 'success',
        });
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('should generate recommendations quickly', async () => {
      await manager.initializeUserProfile('user-1');

      for (let i = 0; i < 50; i++) {
        await manager.recordInteraction('user-1', {
          timestamp: Date.now(),
          type: 'query',
          topic: `topic-${i % 5}`,
          duration: 5000,
          satisfaction: 0.8,
          outcome: 'success',
        });
      }

      const startTime = Date.now();
      await manager.generateRecommendations('user-1');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent user', async () => {
      const profile = await manager.getUserProfile('non-existent');
      expect(profile).toBeNull();
    });

    it('should handle empty interaction history', async () => {
      await manager.initializeUserProfile('user-1');

      const satisfaction = await manager.calculateUserSatisfaction('user-1');
      expect(satisfaction).toBe(0);
    });

    it('should handle clearing non-existent user', async () => {
      await expect(
        manager.clearUserProfile('non-existent')
      ).resolves.not.toThrow();
    });
  });
});
