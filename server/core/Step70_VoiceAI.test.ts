import { describe, it, expect, beforeEach } from 'vitest';
import { VoiceAIManager } from './VoiceAIManager';

describe('VoiceAIManager', () => {
  let voice: VoiceAIManager;

  beforeEach(() => {
    voice = new VoiceAIManager();
  });

  describe('Voice Sessions', () => {
    it('should create voice session', () => {
      const sessionId = voice.createSession('user-1', 'ja');
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/session-\d+-[a-z0-9]{9}/);
    });

    it('should get session', () => {
      const sessionId = voice.createSession('user-1', 'ja');
      const session = voice.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session?.userId).toBe('user-1');
      expect(session?.status).toBe('active');
    });

    it('should end session', () => {
      const sessionId = voice.createSession('user-1', 'ja');
      const ended = voice.endSession(sessionId);

      expect(ended).toBe(true);

      const session = voice.getSession(sessionId);
      expect(session?.status).toBe('ended');
      expect(session?.endTime).toBeDefined();
    });

    it('should get active sessions', () => {
      voice.createSession('user-1', 'ja');
      voice.createSession('user-2', 'ja');

      const active = voice.getActiveSessions();
      expect(active.length).toBe(2);
    });
  });

  describe('Voice Messages', () => {
    it('should record voice message', () => {
      const sessionId = voice.createSession('user-1', 'ja');
      const msgId = voice.recordVoiceMessage(sessionId, 'user', 'こんにちは', 0.95);

      expect(msgId).toBeDefined();
      expect(msgId).toMatch(/msg-\d+-[a-z0-9]{9}/);
    });

    it('should record user and assistant messages', () => {
      const sessionId = voice.createSession('user-1', 'ja');

      voice.recordVoiceMessage(sessionId, 'user', 'こんにちは', 0.95);
      voice.recordVoiceMessage(sessionId, 'assistant', 'こんにちは、ポイポイです', 0.98);

      const history = voice.getConversationHistory(sessionId, 10);
      expect(history.length).toBe(2);
      expect(history[0].type).toBe('user');
      expect(history[1].type).toBe('assistant');
    });

    it('should get voice messages', () => {
      const sessionId = voice.createSession('user-1', 'ja');

      for (let i = 0; i < 5; i++) {
        voice.recordVoiceMessage(sessionId, 'user', `メッセージ${i}`, 0.9);
      }

      const messages = voice.getVoiceMessages(sessionId, 10);
      expect(messages.length).toBe(5);
    });

    it('should record message with audio URL', () => {
      const sessionId = voice.createSession('user-1', 'ja');
      const msgId = voice.recordVoiceMessage(
        sessionId,
        'user',
        'テスト',
        0.95,
        'https://example.com/audio.wav',
        2500
      );

      const messages = voice.getVoiceMessages(sessionId, 1);
      expect(messages[0].audioUrl).toBe('https://example.com/audio.wav');
      expect(messages[0].duration).toBe(2500);
    });
  });

  describe('Voice Commands', () => {
    it('should parse voice command', () => {
      const command = voice.parseVoiceCommand('製造データを表示してください');

      expect(command).toBeDefined();
      expect(command.intent).toBe('manufacturing');
      expect(command.confidence).toBeGreaterThan(0.8);
    });

    it('should recognize different intents', () => {
      const intents = [
        { text: '品質情報', expected: 'quality' },
        { text: '原価を計算', expected: 'cost' },
        { text: '在庫確認', expected: 'inventory' },
        { text: '改善提案', expected: 'improvement' },
        { text: '検索してください', expected: 'search' },
        { text: '報告書作成', expected: 'report' },
      ];

      intents.forEach(({ text, expected }) => {
        const command = voice.parseVoiceCommand(text);
        expect(command.intent).toBe(expected);
      });
    });

    it('should get command history', () => {
      voice.parseVoiceCommand('製造データ');
      voice.parseVoiceCommand('品質情報');
      voice.parseVoiceCommand('原価計算');

      const history = voice.getCommandHistory(10);
      expect(history.length).toBe(3);
    });

    it('should get intent statistics', () => {
      voice.parseVoiceCommand('製造データ');
      voice.parseVoiceCommand('製造情報');
      voice.parseVoiceCommand('品質情報');

      const stats = voice.getIntentStatistics();
      expect(stats['manufacturing']).toBe(2);
      expect(stats['quality']).toBe(1);
    });
  });

  describe('Audio Metrics', () => {
    it('should record audio metrics', () => {
      const sessionId = voice.createSession('user-1', 'ja');

      voice.recordAudioMetrics(sessionId, {
        duration: 5000,
        sampleRate: 16000,
        channels: 1,
        bitRate: 128000,
        noiseLevel: 0.2,
      });

      const metrics = voice.getAudioMetrics(sessionId);
      expect(metrics).toBeDefined();
      expect(metrics?.sampleRate).toBe(16000);
    });

    it('should calculate clarity from noise level', () => {
      const sessionId = voice.createSession('user-1', 'ja');

      voice.recordAudioMetrics(sessionId, {
        duration: 5000,
        sampleRate: 16000,
        channels: 1,
        bitRate: 128000,
        noiseLevel: 0.1,
      });

      const metrics = voice.getAudioMetrics(sessionId);
      expect(metrics?.clarity).toBeGreaterThan(90);
    });

    it('should analyze noise level', () => {
      const audioData = [0.1, 0.2, 0.15, 0.12, 0.18];
      const noiseLevel = voice.analyzeNoiseLevel(audioData);

      expect(noiseLevel).toBeGreaterThanOrEqual(0);
      expect(noiseLevel).toBeLessThanOrEqual(1);
    });
  });

  describe('Voice Preferences', () => {
    it('should set voice preference', () => {
      voice.setVoicePreference('user-1', {
        language: 'ja',
        speed: 1.0,
        volume: 0.8,
      });

      const pref = voice.getVoicePreference('user-1');
      expect(pref?.language).toBe('ja');
    });

    it('should retrieve voice preference', () => {
      const preferences = {
        language: 'ja',
        speed: 0.9,
        volume: 0.7,
      };

      voice.setVoicePreference('user-1', preferences);
      const retrieved = voice.getVoicePreference('user-1');

      expect(retrieved).toEqual(preferences);
    });
  });

  describe('Command Validation', () => {
    it('should validate command with high confidence', () => {
      const command = voice.parseVoiceCommand('製造データ');
      const result = voice.validateVoiceCommand(command);

      expect(result.valid).toBe(true);
    });

    it('should reject command with low confidence', () => {
      const command = voice.parseVoiceCommand('不明なコマンド');
      command.confidence = 0.5;

      const result = voice.validateVoiceCommand(command);
      expect(result.valid).toBe(false);
    });

    it('should reject unknown intent', () => {
      const command = voice.parseVoiceCommand('何か不明な指示');
      const result = voice.validateVoiceCommand(command);

      expect(result.valid).toBe(false);
    });
  });

  describe('Session Statistics', () => {
    it('should calculate session statistics', () => {
      const sessionId = voice.createSession('user-1', 'ja');

      voice.recordVoiceMessage(sessionId, 'user', 'こんにちは', 0.95);
      voice.recordVoiceMessage(sessionId, 'assistant', 'こんにちは', 0.98);

      const stats = voice.getSessionStatistics(sessionId);

      expect(stats.messageCount).toBe(2);
      expect(stats.userMessages).toBe(1);
      expect(stats.assistantMessages).toBe(1);
      expect(stats.averageConfidence).toBeGreaterThan(0.9);
    });

    it('should calculate recognition accuracy', () => {
      const sessionId = voice.createSession('user-1', 'ja');

      voice.recordVoiceMessage(sessionId, 'user', 'メッセージ1', 0.95);
      voice.recordVoiceMessage(sessionId, 'user', 'メッセージ2', 0.85);

      const accuracy = voice.calculateRecognitionAccuracy();
      expect(accuracy).toBeCloseTo(0.9, 5);
    });
  });

  describe('Voice Report', () => {
    it('should generate voice report', () => {
      const sessionId = voice.createSession('user-1', 'ja');

      voice.recordVoiceMessage(sessionId, 'user', 'こんにちは', 0.95);
      voice.parseVoiceCommand('製造データ');

      const report = voice.generateVoiceReport(sessionId);

      expect(report.sessionId).toBe(sessionId);
      expect(report.messageCount).toBe(1);
      expect(report.commandCount).toBeGreaterThanOrEqual(0);
    });

    it('should include recommendations in report', () => {
      const sessionId = voice.createSession('user-1', 'ja');

      const report = voice.generateVoiceReport(sessionId);

      expect(report.recommendations).toBeDefined();
    });
  });

  describe('Data Management', () => {
    it('should export data', () => {
      const sessionId = voice.createSession('user-1', 'ja');
      voice.recordVoiceMessage(sessionId, 'user', 'テスト', 0.95);

      const exported = voice.export();

      expect(exported.sessions.length).toBe(1);
      expect(exported.messages.length).toBe(1);
    });

    it('should import data', () => {
      const voice1 = new VoiceAIManager();
      const sessionId = voice1.createSession('user-1', 'ja');
      voice1.recordVoiceMessage(sessionId, 'user', 'テスト', 0.95);

      const exported = voice1.export();

      const voice2 = new VoiceAIManager();
      voice2.import(exported);

      const session = voice2.getSession(sessionId);
      expect(session).toBeDefined();
    });

    it('should clear data', () => {
      const sessionId = voice.createSession('user-1', 'ja');
      voice.recordVoiceMessage(sessionId, 'user', 'テスト', 0.95);

      voice.clear();

      const session = voice.getSession(sessionId);
      expect(session).toBeUndefined();
    });
  });

  describe('Integration', () => {
    it('should handle complete voice workflow', () => {
      // Create session
      const sessionId = voice.createSession('user-1', 'ja');

      // Record messages
      voice.recordVoiceMessage(sessionId, 'user', '製造データを表示', 0.95);
      voice.recordVoiceMessage(sessionId, 'assistant', 'データを表示します', 0.98);

      // Parse command
      const command = voice.parseVoiceCommand('製造データを表示');
      const valid = voice.validateVoiceCommand(command);

      expect(valid.valid).toBe(true);

      // Get statistics
      const stats = voice.getSessionStatistics(sessionId);
      expect(stats.messageCount).toBe(2);

      // Generate report
      const report = voice.generateVoiceReport(sessionId);
      expect(report.messageCount).toBe(2);
    });

    it('should track multiple sessions', () => {
      const session1 = voice.createSession('user-1', 'ja');
      const session2 = voice.createSession('user-2', 'ja');

      voice.recordVoiceMessage(session1, 'user', 'メッセージ1', 0.95);
      voice.recordVoiceMessage(session2, 'user', 'メッセージ2', 0.95);

      const active = voice.getActiveSessions();
      expect(active.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty session statistics', () => {
      const stats = voice.getSessionStatistics('non-existent');

      expect(stats.duration).toBe(0);
      expect(stats.messageCount).toBe(0);
    });

    it('should handle empty audio data', () => {
      const noiseLevel = voice.analyzeNoiseLevel([]);
      expect(noiseLevel).toBe(0);
    });

    it('should handle unknown command intent', () => {
      const command = voice.parseVoiceCommand('何か不明な指示です');
      expect(command.intent).toBe('unknown');
    });

    it('should handle missing preference', () => {
      const pref = voice.getVoicePreference('non-existent');
      expect(pref).toBeUndefined();
    });
  });
});
