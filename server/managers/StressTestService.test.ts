import { describe, it, expect, beforeEach } from 'vitest';
import { StressTestService } from './StressTestService';

describe('StressTestService', () => {
  let service: StressTestService;

  beforeEach(() => {
    service = new StressTestService();
  });

  describe('createScenario', () => {
    it('should create a stress test scenario', () => {
      const scenario = service.createScenario(
        'Test',
        'Description',
        'continuous_usage',
        60,
        'high',
        { messageInterval: 100 }
      );

      expect(scenario).toBeDefined();
      expect(scenario.name).toBe('Test');
      expect(scenario.scenarioId).toMatch(/^STR-/);
    });
  });

  describe('getScenario', () => {
    it('should retrieve a scenario', () => {
      const created = service.createScenario(
        'Test',
        'Description',
        'continuous_usage',
        60,
        'high',
        {}
      );
      const retrieved = service.getScenario(created.scenarioId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test');
    });

    it('should return undefined for non-existent scenario', () => {
      expect(service.getScenario('non-existent')).toBeUndefined();
    });
  });

  describe('recordTestResult', () => {
    it('should record a test result', () => {
      const scenario = service.createScenario(
        'Test',
        'Description',
        'continuous_usage',
        60,
        'high',
        {}
      );

      const result = service.recordTestResult(
        scenario.scenarioId,
        'completed',
        1000,
        2000,
        {
          totalRequests: 100,
          successfulRequests: 95,
          failedRequests: 5,
          averageResponseTime: 50,
          maxResponseTime: 200,
          minResponseTime: 10,
          peakMemory: 60,
          averageMemory: 50,
          peakCPU: 70,
          averageCPU: 60,
          errorRate: 5,
          throughput: 50,
        }
      );

      expect(result).toBeDefined();
      expect(result.duration).toBe(1000);
      expect(result.resultId).toMatch(/^RES-/);
    });
  });

  describe('getTestResult', () => {
    it('should retrieve a test result', () => {
      const scenario = service.createScenario(
        'Test',
        'Description',
        'continuous_usage',
        60,
        'high',
        {}
      );

      const created = service.recordTestResult(
        scenario.scenarioId,
        'completed',
        1000,
        2000,
        {
          totalRequests: 100,
          successfulRequests: 95,
          failedRequests: 5,
          averageResponseTime: 50,
          maxResponseTime: 200,
          minResponseTime: 10,
          peakMemory: 60,
          averageMemory: 50,
          peakCPU: 70,
          averageCPU: 60,
          errorRate: 5,
          throughput: 50,
        }
      );

      const retrieved = service.getTestResult(created.resultId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.status).toBe('completed');
    });
  });

  describe('getScenarioResults', () => {
    it('should retrieve results for a scenario', () => {
      const scenario = service.createScenario(
        'Test',
        'Description',
        'continuous_usage',
        60,
        'high',
        {}
      );

      service.recordTestResult(scenario.scenarioId, 'completed', 1000, 2000, {
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5,
        averageResponseTime: 50,
        maxResponseTime: 200,
        minResponseTime: 10,
        peakMemory: 60,
        averageMemory: 50,
        peakCPU: 70,
        averageCPU: 60,
        errorRate: 5,
        throughput: 50,
      });

      const results = service.getScenarioResults(scenario.scenarioId);
      expect(results.length).toBe(1);
    });
  });

  describe('recordLoadProfile', () => {
    it('should record a load profile', () => {
      const profile = service.recordLoadProfile(100, 50, 60, 70, 50, 5);

      expect(profile).toBeDefined();
      expect(profile.requestsPerSecond).toBe(100);
      expect(profile.profileId).toMatch(/^LP-/);
    });
  });

  describe('runContinuousUsageTest', () => {
    it('should create continuous usage test scenario', () => {
      const scenario = service.runContinuousUsageTest(60, 100);

      expect(scenario.testType).toBe('continuous_usage');
      expect(scenario.duration).toBe(60);
    });
  });

  describe('runBulkMessagesTest', () => {
    it('should create bulk messages test scenario', () => {
      const scenario = service.runBulkMessagesTest(1000);

      expect(scenario.testType).toBe('bulk_messages');
      expect(scenario.parameters.messageCount).toBe(1000);
    });
  });

  describe('runBulkFilesTest', () => {
    it('should create bulk files test scenario', () => {
      const scenario = service.runBulkFilesTest(100, 10);

      expect(scenario.testType).toBe('bulk_files');
      expect(scenario.parameters.fileCount).toBe(100);
    });
  });

  describe('runConcurrentUsersTest', () => {
    it('should create concurrent users test scenario', () => {
      const scenario = service.runConcurrentUsersTest(500, 60);

      expect(scenario.testType).toBe('concurrent_users');
      expect(scenario.parameters.userCount).toBe(500);
    });
  });

  describe('isTestPassed', () => {
    it('should return true for good metrics', () => {
      const scenario = service.createScenario(
        'Test',
        'Description',
        'continuous_usage',
        60,
        'high',
        {}
      );

      const result = service.recordTestResult(
        scenario.scenarioId,
        'completed',
        1000,
        2000,
        {
          totalRequests: 100,
          successfulRequests: 99,
          failedRequests: 1,
          averageResponseTime: 100,
          maxResponseTime: 200,
          minResponseTime: 50,
          peakMemory: 70,
          averageMemory: 60,
          peakCPU: 70,
          averageCPU: 60,
          errorRate: 1,
          throughput: 100,
        }
      );

      expect(service.isTestPassed(result)).toBe(true);
    });

    it('should return false for high error rate', () => {
      const scenario = service.createScenario(
        'Test',
        'Description',
        'continuous_usage',
        60,
        'high',
        {}
      );

      const result = service.recordTestResult(
        scenario.scenarioId,
        'completed',
        1000,
        2000,
        {
          totalRequests: 100,
          successfulRequests: 90,
          failedRequests: 10,
          averageResponseTime: 100,
          maxResponseTime: 200,
          minResponseTime: 50,
          peakMemory: 70,
          averageMemory: 60,
          peakCPU: 70,
          averageCPU: 60,
          errorRate: 10,
          throughput: 100,
        }
      );

      expect(service.isTestPassed(result)).toBe(false);
    });
  });

  describe('analyzeTestResult', () => {
    it('should analyze test result', () => {
      const scenario = service.createScenario(
        'Test',
        'Description',
        'continuous_usage',
        60,
        'high',
        {}
      );

      const result = service.recordTestResult(
        scenario.scenarioId,
        'completed',
        1000,
        2000,
        {
          totalRequests: 100,
          successfulRequests: 99,
          failedRequests: 1,
          averageResponseTime: 100,
          maxResponseTime: 200,
          minResponseTime: 50,
          peakMemory: 70,
          averageMemory: 60,
          peakCPU: 70,
          averageCPU: 60,
          errorRate: 1,
          throughput: 100,
        }
      );

      const analysis = service.analyzeTestResult(result);
      expect(analysis.passed).toBe(true);
    });
  });

  describe('getAllScenarios', () => {
    it('should retrieve all scenarios', () => {
      service.createScenario('Test1', 'Desc', 'continuous_usage', 60, 'high', {});
      service.createScenario('Test2', 'Desc', 'bulk_messages', 60, 'high', {});

      const all = service.getAllScenarios();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllResults', () => {
    it('should retrieve all results', () => {
      const scenario = service.createScenario(
        'Test',
        'Description',
        'continuous_usage',
        60,
        'high',
        {}
      );

      service.recordTestResult(scenario.scenarioId, 'completed', 1000, 2000, {
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5,
        averageResponseTime: 50,
        maxResponseTime: 200,
        minResponseTime: 10,
        peakMemory: 60,
        averageMemory: 50,
        peakCPU: 70,
        averageCPU: 60,
        errorRate: 5,
        throughput: 50,
      });

      const all = service.getAllResults();
      expect(all.length).toBe(1);
    });
  });

  describe('getTestStatistics', () => {
    it('should calculate test statistics', () => {
      const scenario = service.createScenario(
        'Test',
        'Description',
        'continuous_usage',
        60,
        'high',
        {}
      );

      service.recordTestResult(scenario.scenarioId, 'completed', 1000, 2000, {
        totalRequests: 100,
        successfulRequests: 99,
        failedRequests: 1,
        averageResponseTime: 100,
        maxResponseTime: 200,
        minResponseTime: 50,
        peakMemory: 70,
        averageMemory: 60,
        peakCPU: 70,
        averageCPU: 60,
        errorRate: 1,
        throughput: 100,
      });

      const stats = service.getTestStatistics();
      expect(stats.totalTests).toBe(1);
      expect(stats.passedTests).toBe(1);
    });
  });

  describe('getLatestResult', () => {
    it('should retrieve latest result', () => {
      const scenario = service.createScenario(
        'Test',
        'Description',
        'continuous_usage',
        60,
        'high',
        {}
      );

      service.recordTestResult(scenario.scenarioId, 'completed', 1000, 2000, {
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5,
        averageResponseTime: 50,
        maxResponseTime: 200,
        minResponseTime: 10,
        peakMemory: 60,
        averageMemory: 50,
        peakCPU: 70,
        averageCPU: 60,
        errorRate: 5,
        throughput: 50,
      });

      const latest = service.getLatestResult();
      expect(latest).toBeDefined();
      expect(latest?.status).toBe('completed');
    });
  });

  describe('getFailedTests', () => {
    it('should retrieve failed tests', () => {
      const scenario = service.createScenario(
        'Test',
        'Description',
        'continuous_usage',
        60,
        'high',
        {}
      );

      service.recordTestResult(scenario.scenarioId, 'failed', 1000, 2000, {
        totalRequests: 100,
        successfulRequests: 80,
        failedRequests: 20,
        averageResponseTime: 3000,
        maxResponseTime: 5000,
        minResponseTime: 1000,
        peakMemory: 90,
        averageMemory: 80,
        peakCPU: 85,
        averageCPU: 75,
        errorRate: 20,
        throughput: 50,
      });

      const failed = service.getFailedTests();
      expect(failed.length).toBeGreaterThan(0);
    });
  });

  describe('deleteScenario', () => {
    it('should delete a scenario', () => {
      const scenario = service.createScenario(
        'Test',
        'Description',
        'continuous_usage',
        60,
        'high',
        {}
      );

      const result = service.deleteScenario(scenario.scenarioId);
      expect(result).toBe(true);
      expect(service.getScenario(scenario.scenarioId)).toBeUndefined();
    });
  });

  describe('deleteResult', () => {
    it('should delete a result', () => {
      const scenario = service.createScenario(
        'Test',
        'Description',
        'continuous_usage',
        60,
        'high',
        {}
      );

      const result = service.recordTestResult(
        scenario.scenarioId,
        'completed',
        1000,
        2000,
        {
          totalRequests: 100,
          successfulRequests: 95,
          failedRequests: 5,
          averageResponseTime: 50,
          maxResponseTime: 200,
          minResponseTime: 10,
          peakMemory: 60,
          averageMemory: 50,
          peakCPU: 70,
          averageCPU: 60,
          errorRate: 5,
          throughput: 50,
        }
      );

      const deleted = service.deleteResult(result.resultId);
      expect(deleted).toBe(true);
      expect(service.getTestResult(result.resultId)).toBeUndefined();
    });
  });
});
