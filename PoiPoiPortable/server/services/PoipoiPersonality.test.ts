/**
 * PoipoiPersonality Tests - ポイポイ人格テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PoipoiPersonality, getPoipoiPersonality } from '../core/PoipoiPersonality';

describe('PoipoiPersonality', () => {
  let personality: PoipoiPersonality;

  beforeEach(() => {
    personality = new PoipoiPersonality();
  });

  describe('Configuration', () => {
    it('should have correct name', () => {
      const config = personality.getConfig();
      expect(config.name).toBe('ポイポイ');
    });

    it('should have description', () => {
      const config = personality.getConfig();
      expect(config.description).toBeDefined();
      expect(config.description.length).toBeGreaterThan(0);
    });

    it('should have traits', () => {
      const config = personality.getConfig();
      expect(config.traits).toBeDefined();
      expect(config.traits.length).toBeGreaterThan(0);
      expect(config.traits).toContain('プロフェッショナル');
    });

    it('should have emoji', () => {
      const config = personality.getConfig();
      expect(config.emoji).toBe('🦝');
    });

    it('should have color', () => {
      const config = personality.getConfig();
      expect(config.color).toBeDefined();
    });
  });

  describe('System Prompt', () => {
    it('should generate system prompt', () => {
      const prompt = personality.getSystemPrompt();
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should include personality name in prompt', () => {
      const prompt = personality.getSystemPrompt();
      expect(prompt).toContain('ポイポイ');
    });

    it('should include traits in prompt', () => {
      const prompt = personality.getSystemPrompt();
      expect(prompt).toContain('特性');
    });

    it('should include response style in prompt', () => {
      const prompt = personality.getSystemPrompt();
      expect(prompt).toContain('応答スタイル');
    });
  });

  describe('Contextual Prompts', () => {
    it('should generate contextual prompt for manufacturing', () => {
      const prompt = personality.getContextualPrompt('manufacturing', 'テストメッセージ');
      expect(prompt).toBeDefined();
      expect(prompt).toContain('生産管理');
    });

    it('should generate contextual prompt for creative', () => {
      const prompt = personality.getContextualPrompt('creative', 'テストメッセージ');
      expect(prompt).toBeDefined();
      expect(prompt).toContain('クリエイティブ');
    });

    it('should generate contextual prompt for technical', () => {
      const prompt = personality.getContextualPrompt('technical', 'テストメッセージ');
      expect(prompt).toBeDefined();
      expect(prompt).toContain('技術');
    });

    it('should generate contextual prompt for analysis', () => {
      const prompt = personality.getContextualPrompt('analysis', 'テストメッセージ');
      expect(prompt).toBeDefined();
      expect(prompt).toContain('分析');
    });

    it('should generate contextual prompt for collaboration', () => {
      const prompt = personality.getContextualPrompt('collaboration', 'テストメッセージ');
      expect(prompt).toBeDefined();
      expect(prompt).toContain('チーム');
    });

    it('should include user message in contextual prompt', () => {
      const userMessage = 'これは特別なテストメッセージです';
      const prompt = personality.getContextualPrompt('manufacturing', userMessage);
      expect(prompt).toContain(userMessage);
    });
  });

  describe('Greetings', () => {
    it('should generate greeting message', () => {
      const greeting = personality.getGreeting();
      expect(greeting).toBeDefined();
      expect(greeting.length).toBeGreaterThan(0);
    });

    it('should include emoji in greeting', () => {
      const greeting = personality.getGreeting();
      expect(greeting).toContain('🦝');
    });

    it('should include name in greeting', () => {
      const greeting = personality.getGreeting();
      expect(greeting).toContain('ポイポイ');
    });

    it('should generate different greetings', () => {
      const greetings = new Set();
      for (let i = 0; i < 10; i++) {
        greetings.add(personality.getGreeting());
      }
      expect(greetings.size).toBeGreaterThan(1);
    });
  });

  describe('Farewells', () => {
    it('should generate farewell message', () => {
      const farewell = personality.getFarewell();
      expect(farewell).toBeDefined();
      expect(farewell.length).toBeGreaterThan(0);
    });

    it('should include emoji in farewell', () => {
      const farewell = personality.getFarewell();
      expect(farewell).toContain('🦝');
    });

    it('should generate different farewells', () => {
      const farewells = new Set();
      for (let i = 0; i < 10; i++) {
        farewells.add(personality.getFarewell());
      }
      expect(farewells.size).toBeGreaterThan(1);
    });
  });

  describe('Response Enhancement', () => {
    it('should enhance response with emoji', () => {
      const response = 'これはテスト応答です';
      const enhanced = personality.enhanceResponse(response);
      expect(enhanced).toContain('🦝');
    });

    it('should not duplicate emoji', () => {
      const response = 'これはテスト応答です 🦝';
      const enhanced = personality.enhanceResponse(response);
      const emojiCount = (enhanced.match(/🦝/g) || []).length;
      expect(emojiCount).toBeLessThanOrEqual(1);
    });
  });

  describe('Response Formatting', () => {
    it('should format response with title and content', () => {
      const formatted = personality.formatResponse('テストタイトル', 'テスト内容');
      expect(formatted).toContain('テストタイトル');
      expect(formatted).toContain('テスト内容');
    });

    it('should format response with details', () => {
      const details = ['詳細1', '詳細2', '詳細3'];
      const formatted = personality.formatResponse('タイトル', '内容', details);
      expect(formatted).toContain('詳細1');
      expect(formatted).toContain('詳細2');
      expect(formatted).toContain('詳細3');
    });

    it('should include details section when provided', () => {
      const formatted = personality.formatResponse('タイトル', '内容', ['詳細']);
      expect(formatted).toContain('詳細:');
    });
  });

  describe('Mood', () => {
    it('should generate mood message', () => {
      const mood = personality.getMood();
      expect(mood).toBeDefined();
      expect(mood.length).toBeGreaterThan(0);
    });

    it('should include emoji in mood', () => {
      const mood = personality.getMood();
      expect(mood).toMatch(/[😊🎯💡🚀🤝]/);
    });

    it('should generate different moods', () => {
      const moods = new Set();
      for (let i = 0; i < 20; i++) {
        moods.add(personality.getMood());
      }
      expect(moods.size).toBeGreaterThan(1);
    });
  });

  describe('Status Message', () => {
    it('should generate status message', () => {
      const status = personality.getStatusMessage();
      expect(status).toBeDefined();
      expect(status.length).toBeGreaterThan(0);
    });

    it('should include emoji in status', () => {
      const status = personality.getStatusMessage();
      expect(status).toContain('🦝');
    });

    it('should indicate readiness', () => {
      const status = personality.getStatusMessage();
      expect(status).toContain('準備');
    });
  });

  describe('Multi-Context Response', () => {
    it('should generate multi-context response', () => {
      const prompt = personality.getMultiContextResponse(
        'manufacturing',
        ['technical', 'analysis'],
        'テストメッセージ'
      );
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should include primary context', () => {
      const prompt = personality.getMultiContextResponse(
        'manufacturing',
        ['technical'],
        'テスト'
      );
      expect(prompt).toContain('生産管理');
    });

    it('should include secondary contexts', () => {
      const prompt = personality.getMultiContextResponse(
        'manufacturing',
        ['technical', 'analysis'],
        'テスト'
      );
      expect(prompt).toContain('追加コンテキスト');
    });

    it('should handle empty secondary contexts', () => {
      const prompt = personality.getMultiContextResponse('manufacturing', [], 'テスト');
      expect(prompt).toBeDefined();
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = getPoipoiPersonality();
      const instance2 = getPoipoiPersonality();
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across calls', () => {
      const instance1 = getPoipoiPersonality();
      const config1 = instance1.getConfig();
      const instance2 = getPoipoiPersonality();
      const config2 = instance2.getConfig();
      expect(config1).toEqual(config2);
    });
  });

  describe('Integration Tests', () => {
    it('should provide complete personality profile', () => {
      const config = personality.getConfig();
      expect(config.name).toBeDefined();
      expect(config.description).toBeDefined();
      expect(config.traits.length).toBeGreaterThan(0);
      expect(config.tone).toBeDefined();
      expect(config.responseStyle).toBeDefined();
      expect(config.systemPrompt).toBeDefined();
      expect(config.emoji).toBeDefined();
      expect(config.color).toBeDefined();
    });

    it('should support all conversation contexts', () => {
      const contexts = ['manufacturing', 'creative', 'technical', 'analysis', 'collaboration'];
      contexts.forEach((context) => {
        const prompt = personality.getContextualPrompt(context, 'テスト');
        expect(prompt).toBeDefined();
        expect(prompt.length).toBeGreaterThan(0);
      });
    });

    it('should generate consistent personality across methods', () => {
      const config = personality.getConfig();
      const greeting = personality.getGreeting();
      const status = personality.getStatusMessage();

      expect(greeting).toContain(config.emoji);
      expect(status).toContain(config.emoji);
      expect(greeting).toContain(config.name);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown context gracefully', () => {
      const prompt = personality.getContextualPrompt('unknown_context', 'テスト');
      expect(prompt).toBeDefined();
      expect(prompt).toContain('ポイポイ');
    });

    it('should handle empty message', () => {
      const prompt = personality.getContextualPrompt('manufacturing', '');
      expect(prompt).toBeDefined();
    });

    it('should handle very long message', () => {
      const longMessage = 'a'.repeat(10000);
      const prompt = personality.getContextualPrompt('manufacturing', longMessage);
      expect(prompt).toBeDefined();
    });
  });
});
