import { describe, it, expect, beforeEach } from 'vitest';
import { ChatQualityService } from './ChatQualityService';

describe('ChatQualityService', () => {
  let service: ChatQualityService;

  beforeEach(() => {
    service = new ChatQualityService();
  });

  describe('recordChatQualityMetric', () => {
    it('should record chat quality metric', () => {
      const metric = service.recordChatQualityMetric('msg1', 'user1', 800, 85, 90, 88, 85);

      expect(metric).toBeDefined();
      expect(metric.metricId).toMatch(/^CQM-/);
      expect(metric.overallQuality).toBe('excellent');
    });

    it('should set good quality for moderate scores', () => {
      const metric = service.recordChatQualityMetric('msg2', 'user2', 1200, 75, 72, 70, 70);
      expect(metric.overallQuality).toBe('good');
    });

    it('should set fair quality for low scores', () => {
      const metric = service.recordChatQualityMetric('msg3', 'user3', 1500, 60, 58, 55, 50);
      expect(metric.overallQuality).toBe('fair');
    });

    it('should set poor quality for very low scores', () => {
      const metric = service.recordChatQualityMetric('msg4', 'user4', 2000, 40, 35, 30, 20);
      expect(metric.overallQuality).toBe('poor');
    });
  });

  describe('getChatQualityMetric', () => {
    it('should retrieve chat quality metric', () => {
      const created = service.recordChatQualityMetric('msg1', 'user1', 800, 85, 90, 88, 85);
      const retrieved = service.getChatQualityMetric(created.metricId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.responseTime).toBe(800);
    });
  });

  describe('getMetricsByUser', () => {
    it('should retrieve metrics by user', () => {
      service.recordChatQualityMetric('msg1', 'user1', 800, 85, 90, 88, 85);
      service.recordChatQualityMetric('msg2', 'user1', 900, 80, 85, 82, 80);
      service.recordChatQualityMetric('msg3', 'user2', 1000, 75, 70, 72, 70);

      const user1Metrics = service.getMetricsByUser('user1');
      expect(user1Metrics.length).toBe(2);
    });
  });

  describe('recordConversationAnalysis', () => {
    it('should record conversation analysis', () => {
      const analysis = service.recordConversationAnalysis('conv1', 10, 800, 85, 90, 88);

      expect(analysis).toBeDefined();
      expect(analysis.analysisId).toMatch(/^CA-/);
      expect(analysis.overallScore).toBeGreaterThan(0);
    });
  });

  describe('getConversationAnalysis', () => {
    it('should retrieve conversation analysis', () => {
      const created = service.recordConversationAnalysis('conv1', 10, 800, 85, 90, 88);
      const retrieved = service.getConversationAnalysis(created.analysisId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.messageCount).toBe(10);
    });
  });

  describe('reportChatIssue', () => {
    it('should report chat issue', () => {
      const issue = service.reportChatIssue('msg1', 'slow_response', 'Response took too long');

      expect(issue).toBeDefined();
      expect(issue.issueId).toMatch(/^CI-/);
      expect(issue.severity).toBe('high');
      expect(issue.resolved).toBe(false);
    });

    it('should set critical severity for errors', () => {
      const issue = service.reportChatIssue('msg2', 'error', 'Error occurred');
      expect(issue.severity).toBe('critical');
    });

    it('should set high severity for irrelevant responses', () => {
      const issue = service.reportChatIssue('msg3', 'irrelevant', 'Response was irrelevant');
      expect(issue.severity).toBe('high');
    });

    it('should set medium severity for unclear responses', () => {
      const issue = service.reportChatIssue('msg4', 'unclear', 'Response was unclear');
      expect(issue.severity).toBe('medium');
    });
  });

  describe('getChatIssue', () => {
    it('should retrieve chat issue', () => {
      const created = service.reportChatIssue('msg1', 'slow_response', 'Response took too long');
      const retrieved = service.getChatIssue(created.issueId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.issueType).toBe('slow_response');
    });
  });

  describe('getIssuesByType', () => {
    it('should retrieve issues by type', () => {
      service.reportChatIssue('msg1', 'slow_response', 'Response took too long');
      service.reportChatIssue('msg2', 'slow_response', 'Response took too long');
      service.reportChatIssue('msg3', 'irrelevant', 'Response was irrelevant');

      const slowIssues = service.getIssuesByType('slow_response');
      expect(slowIssues.length).toBe(2);
    });
  });

  describe('resolveIssue', () => {
    it('should resolve issue', () => {
      const created = service.reportChatIssue('msg1', 'slow_response', 'Response took too long');
      const resolved = service.resolveIssue(created.issueId);

      expect(resolved?.resolved).toBe(true);
    });
  });

  describe('getAllChatQualityMetrics', () => {
    it('should retrieve all chat quality metrics', () => {
      service.recordChatQualityMetric('msg1', 'user1', 800, 85, 90, 88, 85);
      service.recordChatQualityMetric('msg2', 'user2', 900, 80, 85, 82, 80);

      const all = service.getAllChatQualityMetrics();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllConversationAnalyses', () => {
    it('should retrieve all conversation analyses', () => {
      service.recordConversationAnalysis('conv1', 10, 800, 85, 90, 88);
      service.recordConversationAnalysis('conv2', 15, 900, 80, 85, 82);

      const all = service.getAllConversationAnalyses();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllChatIssues', () => {
    it('should retrieve all chat issues', () => {
      service.reportChatIssue('msg1', 'slow_response', 'Response took too long');
      service.reportChatIssue('msg2', 'irrelevant', 'Response was irrelevant');

      const all = service.getAllChatIssues();
      expect(all.length).toBe(2);
    });
  });

  describe('getChatQualityStats', () => {
    it('should calculate chat quality statistics', () => {
      service.recordChatQualityMetric('msg1', 'user1', 800, 85, 90, 88, 85);
      service.recordChatQualityMetric('msg2', 'user2', 900, 75, 72, 70, 70);
      service.recordConversationAnalysis('conv1', 10, 800, 85, 90, 88);
      service.reportChatIssue('msg3', 'slow_response', 'Response took too long');

      const stats = service.getChatQualityStats();

      expect(stats.totalMetrics).toBe(2);
      expect(stats.totalAnalyses).toBe(1);
      expect(stats.totalIssues).toBe(1);
      expect(stats.unresolvedIssues).toBe(1);
    });
  });

  describe('getLowQualityMessages', () => {
    it('should retrieve low quality messages', () => {
      service.recordChatQualityMetric('msg1', 'user1', 800, 85, 90, 88, 85);
      service.recordChatQualityMetric('msg2', 'user2', 900, 75, 72, 70, 50);
      service.recordChatQualityMetric('msg3', 'user3', 1000, 40, 35, 30, 20);

      const low = service.getLowQualityMessages(60);
      expect(low.length).toBeGreaterThan(0);
    });
  });

  describe('getFastResponseMessages', () => {
    it('should retrieve fast response messages', () => {
      service.recordChatQualityMetric('msg1', 'user1', 500, 85, 90, 88, 85);
      service.recordChatQualityMetric('msg2', 'user2', 800, 80, 85, 82, 80);
      service.recordChatQualityMetric('msg3', 'user3', 1500, 75, 70, 72, 70);

      const fast = service.getFastResponseMessages(1000);
      expect(fast.length).toBe(2);
    });
  });

  describe('deleteChatQualityMetric', () => {
    it('should delete chat quality metric', () => {
      const metric = service.recordChatQualityMetric('msg1', 'user1', 800, 85, 90, 88, 85);
      const result = service.deleteChatQualityMetric(metric.metricId);

      expect(result).toBe(true);
      expect(service.getChatQualityMetric(metric.metricId)).toBeUndefined();
    });
  });

  describe('deleteChatIssue', () => {
    it('should delete chat issue', () => {
      const issue = service.reportChatIssue('msg1', 'slow_response', 'Response took too long');
      const result = service.deleteChatIssue(issue.issueId);

      expect(result).toBe(true);
      expect(service.getChatIssue(issue.issueId)).toBeUndefined();
    });
  });

  describe('comprehensive chat quality workflow', () => {
    it('should support full chat quality workflow', () => {
      service.recordChatQualityMetric('msg1', 'user1', 800, 85, 90, 88, 85);
      service.recordChatQualityMetric('msg2', 'user1', 900, 75, 72, 70, 70);
      service.recordConversationAnalysis('conv1', 10, 800, 85, 90, 88);
      const issue = service.reportChatIssue('msg3', 'slow_response', 'Response took too long');
      service.resolveIssue(issue.issueId);

      const stats = service.getChatQualityStats();

      expect(stats.totalMetrics).toBe(2);
      expect(stats.totalAnalyses).toBe(1);
      expect(stats.totalIssues).toBe(1);
      expect(stats.unresolvedIssues).toBe(0);
    });
  });
});
