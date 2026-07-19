/**
 * DeploymentPipelineService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { deploymentPipelineService, DeploymentPipelineService } from './DeploymentPipelineService';

describe('DeploymentPipelineService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deploymentPipelineService.cleanup();
    new DeploymentPipelineService();
  });

  afterEach(() => {
    deploymentPipelineService.cleanup();
  });

  describe('Pipeline Management', () => {
    it('should get default pipeline', () => {
      const pipeline = deploymentPipelineService.getPipeline('default');
      expect(pipeline).not.toBeNull();
      expect(pipeline?.length).toBeGreaterThan(0);
    });

    it('should create custom pipeline', () => {
      const stages = [
        {
          stage: 'build' as const,
          enabled: true,
          timeout: 600000,
          retryOnFailure: true,
          maxRetries: 2,
          dependencies: [] as const[],
        },
      ];
      deploymentPipelineService.createPipeline('custom', stages);
      const pipeline = deploymentPipelineService.getPipeline('custom');
      expect(pipeline).not.toBeNull();
    });
  });

  describe('Pipeline Execution', () => {
    it('should start pipeline execution', () => {
      const execution = deploymentPipelineService.startPipelineExecution('default');
      expect(execution).not.toBeNull();
      expect(execution?.status).toBe('running');
    });

    it('should get pipeline execution', () => {
      const started = deploymentPipelineService.startPipelineExecution('default');
      if (started) {
        const retrieved = deploymentPipelineService.getPipelineExecution(started.executionId);
        expect(retrieved).not.toBeNull();
      }
    });

    it('should get all pipeline executions', () => {
      deploymentPipelineService.startPipelineExecution('default');
      deploymentPipelineService.startPipelineExecution('default');
      const executions = deploymentPipelineService.getAllPipelineExecutions();
      expect(executions.length).toBe(2);
    });
  });

  describe('Stage Execution', () => {
    it('should start stage execution', () => {
      const execution = deploymentPipelineService.startPipelineExecution('default');
      if (execution) {
        deploymentPipelineService.startStageExecution(execution.executionId, 'build');
        const retrieved = deploymentPipelineService.getPipelineExecution(execution.executionId);
        const buildStage = retrieved?.stages.find((s) => s.stage === 'build');
        expect(buildStage?.status).toBe('running');
      }
    });

    it('should complete stage execution', () => {
      const execution = deploymentPipelineService.startPipelineExecution('default');
      if (execution) {
        deploymentPipelineService.startStageExecution(execution.executionId, 'build');
        deploymentPipelineService.completeStageExecution(execution.executionId, 'build', 'Build successful');
        const retrieved = deploymentPipelineService.getPipelineExecution(execution.executionId);
        const buildStage = retrieved?.stages.find((s) => s.stage === 'build');
        expect(buildStage?.status).toBe('success');
      }
    });

    it('should fail stage execution', () => {
      const execution = deploymentPipelineService.startPipelineExecution('default');
      if (execution) {
        deploymentPipelineService.startStageExecution(execution.executionId, 'build');
        deploymentPipelineService.failStageExecution(execution.executionId, 'build', 'Build failed');
        const retrieved = deploymentPipelineService.getPipelineExecution(execution.executionId);
        const buildStage = retrieved?.stages.find((s) => s.stage === 'build');
        expect(buildStage?.status).toBe('failed');
      }
    });
  });

  describe('Pipeline Completion', () => {
    it('should complete pipeline execution', () => {
      const execution = deploymentPipelineService.startPipelineExecution('default');
      if (execution) {
        const completed = deploymentPipelineService.completePipelineExecution(execution.executionId);
        expect(completed?.status).toBe('running' || 'success' || 'failed');
      }
    });

    it('should mark as success when all stages succeed', () => {
      const execution = deploymentPipelineService.startPipelineExecution('default');
      if (execution) {
        for (const stage of execution.stages) {
          deploymentPipelineService.completeStageExecution(execution.executionId, stage.stage, 'Success');
        }
        const completed = deploymentPipelineService.completePipelineExecution(execution.executionId);
        expect(completed?.status).toBe('success');
      }
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      deploymentPipelineService.startPipelineExecution('default');
      deploymentPipelineService.cleanup();
      const executions = deploymentPipelineService.getAllPipelineExecutions();
      expect(executions.length).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = DeploymentPipelineService.getInstance();
      const instance2 = DeploymentPipelineService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});
