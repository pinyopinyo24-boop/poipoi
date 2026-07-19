import { describe, it, expect, beforeEach } from 'vitest';

/**
 * APKBuildService
 * APK生成・ビルドプロセス管理
 */
export interface BuildStep {
  stepId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  output: string[];
  errorMessage?: string;
}

export interface APKBuildProcess {
  processId: string;
  buildId: string;
  steps: BuildStep[];
  overallStatus: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  apkPath?: string;
  aabPath?: string;
}

export class APKBuildService {
  private processes: Map<string, APKBuildProcess> = new Map();
  private buildHistory: APKBuildProcess[] = [];

  /**
   * ビルドプロセスを初期化
   */
  initializeBuildProcess(buildId: string): APKBuildProcess {
    const processId = `process-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const process: APKBuildProcess = {
      processId,
      buildId,
      steps: [],
      overallStatus: 'pending',
      startTime: new Date(),
    };

    this.processes.set(processId, process);
    return process;
  }

  /**
   * ビルドステップを追加
   */
  addBuildStep(processId: string, stepName: string): BuildStep {
    const process = this.processes.get(processId);
    if (!process) {
      throw new Error('Build process not found');
    }

    const stepId = `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const step: BuildStep = {
      stepId,
      name: stepName,
      status: 'pending',
      output: [],
    };

    process.steps.push(step);
    return step;
  }

  /**
   * ビルドステップを実行
   */
  executeBuildStep(processId: string, stepId: string): boolean {
    const process = this.processes.get(processId);
    if (!process) {
      throw new Error('Build process not found');
    }

    const step = process.steps.find((s) => s.stepId === stepId);
    if (!step) {
      throw new Error('Build step not found');
    }

    step.status = 'running';
    step.startTime = new Date();
    process.overallStatus = 'running';

    return true;
  }

  /**
   * ビルドステップを完了
   */
  completeBuildStep(processId: string, stepId: string, success: boolean, output: string[] = [], errorMessage?: string): boolean {
    const process = this.processes.get(processId);
    if (!process) {
      throw new Error('Build process not found');
    }

    const step = process.steps.find((s) => s.stepId === stepId);
    if (!step) {
      throw new Error('Build step not found');
    }

    step.endTime = new Date();
    step.status = success ? 'completed' : 'failed';
    step.duration = step.endTime.getTime() - (step.startTime?.getTime() || 0);
    step.output = output;
    step.errorMessage = errorMessage;

    if (!success) {
      process.overallStatus = 'failed';
    }

    return true;
  }

  /**
   * ビルドプロセスを完了
   */
  completeBuildProcess(processId: string, success: boolean, apkPath?: string, aabPath?: string): APKBuildProcess {
    const process = this.processes.get(processId);
    if (!process) {
      throw new Error('Build process not found');
    }

    process.endTime = new Date();
    process.totalDuration = process.endTime.getTime() - process.startTime.getTime();
    process.overallStatus = success ? 'completed' : 'failed';
    process.apkPath = apkPath;
    process.aabPath = aabPath;

    if (success) {
      this.buildHistory.push(process);
    }

    return process;
  }

  /**
   * ビルドプロセスを取得
   */
  getBuildProcess(processId: string): APKBuildProcess | undefined {
    return this.processes.get(processId);
  }

  /**
   * ビルド履歴を取得
   */
  getBuildHistory(): APKBuildProcess[] {
    return [...this.buildHistory];
  }

  /**
   * 最新のビルドプロセスを取得
   */
  getLatestBuildProcess(): APKBuildProcess | undefined {
    return this.buildHistory[this.buildHistory.length - 1];
  }

  /**
   * ビルドログを取得
   */
  getBuildLog(processId: string): string {
    const process = this.processes.get(processId);
    if (!process) {
      throw new Error('Build process not found');
    }

    let log = `=== Build Log: ${process.processId} ===\n`;
    log += `Build ID: ${process.buildId}\n`;
    log += `Status: ${process.overallStatus}\n`;
    log += `Duration: ${process.totalDuration ? (process.totalDuration / 1000).toFixed(2) + 's' : 'N/A'}\n\n`;

    process.steps.forEach((step) => {
      log += `[${step.status.toUpperCase()}] ${step.name}\n`;
      if (step.duration) {
        log += `  Duration: ${(step.duration / 1000).toFixed(2)}s\n`;
      }
      if (step.output.length > 0) {
        log += `  Output:\n`;
        step.output.forEach((line) => {
          log += `    ${line}\n`;
        });
      }
      if (step.errorMessage) {
        log += `  Error: ${step.errorMessage}\n`;
      }
    });

    return log;
  }

  /**
   * ビルド統計を計算
   */
  calculateBuildStats(): {
    totalBuilds: number;
    successfulBuilds: number;
    failedBuilds: number;
    successRate: number;
    averageBuildTime: number;
    totalSteps: number;
    averageStepsPerBuild: number;
  } {
    const total = this.buildHistory.length;
    const successful = this.buildHistory.filter((p) => p.overallStatus === 'completed').length;
    const failed = this.buildHistory.filter((p) => p.overallStatus === 'failed').length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    let totalTime = 0;
    let totalSteps = 0;

    this.buildHistory.forEach((p) => {
      if (p.totalDuration) {
        totalTime += p.totalDuration;
      }
      totalSteps += p.steps.length;
    });

    const averageBuildTime = total > 0 ? totalTime / total : 0;
    const averageStepsPerBuild = total > 0 ? totalSteps / total : 0;

    return {
      totalBuilds: total,
      successfulBuilds: successful,
      failedBuilds: failed,
      successRate,
      averageBuildTime,
      totalSteps,
      averageStepsPerBuild,
    };
  }

  /**
   * ビルドレポートを生成
   */
  generateBuildReport(processId: string): string {
    const process = this.processes.get(processId);
    if (!process) {
      throw new Error('Build process not found');
    }

    const report = `
=== APK Build Report ===
Process ID: ${process.processId}
Build ID: ${process.buildId}
Status: ${process.overallStatus}
Total Duration: ${process.totalDuration ? (process.totalDuration / 1000).toFixed(2) + 's' : 'N/A'}

Steps: ${process.steps.length}
${process.steps
  .map(
    (s) => `
  ${s.name}
    Status: ${s.status}
    Duration: ${s.duration ? (s.duration / 1000).toFixed(2) + 's' : 'N/A'}
    Output Lines: ${s.output.length}
    ${s.errorMessage ? `Error: ${s.errorMessage}` : ''}
  `
  )
  .join('\n')}

Artifacts:
  APK: ${process.apkPath || 'N/A'}
  AAB: ${process.aabPath || 'N/A'}
    `;

    return report.trim();
  }

  /**
   * ビルドプロセスをリセット
   */
  resetBuildProcess(processId: string): boolean {
    const process = this.processes.get(processId);
    if (!process) {
      throw new Error('Build process not found');
    }

    process.steps = [];
    process.overallStatus = 'pending';
    process.startTime = new Date();
    process.endTime = undefined;
    process.totalDuration = undefined;
    process.apkPath = undefined;
    process.aabPath = undefined;

    return true;
  }

  /**
   * ビルドステップの進捗を取得
   */
  getBuildProgress(processId: string): { completed: number; total: number; percentage: number } {
    const process = this.processes.get(processId);
    if (!process) {
      throw new Error('Build process not found');
    }

    const total = process.steps.length;
    const completed = process.steps.filter((s) => s.status === 'completed').length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return { completed, total, percentage };
  }
}

// ============ TESTS ============

describe('APKBuildService', () => {
  let service: APKBuildService;

  beforeEach(() => {
    service = new APKBuildService();
  });

  describe('initializeBuildProcess', () => {
    it('should initialize build process', () => {
      const process = service.initializeBuildProcess('build-123');
      expect(process.buildId).toBe('build-123');
      expect(process.overallStatus).toBe('pending');
      expect(process.steps).toHaveLength(0);
    });

    it('should generate unique process IDs', () => {
      const process1 = service.initializeBuildProcess('build-1');
      const process2 = service.initializeBuildProcess('build-2');
      expect(process1.processId).not.toBe(process2.processId);
    });
  });

  describe('addBuildStep', () => {
    it('should add build step', () => {
      const process = service.initializeBuildProcess('build-123');
      const step = service.addBuildStep(process.processId, 'Compile');

      expect(step.name).toBe('Compile');
      expect(step.status).toBe('pending');
    });

    it('should add multiple steps', () => {
      const process = service.initializeBuildProcess('build-123');
      service.addBuildStep(process.processId, 'Compile');
      service.addBuildStep(process.processId, 'Package');
      service.addBuildStep(process.processId, 'Sign');

      const updated = service.getBuildProcess(process.processId);
      expect(updated?.steps).toHaveLength(3);
    });

    it('should throw error for non-existent process', () => {
      expect(() => service.addBuildStep('non-existent', 'Compile')).toThrow();
    });
  });

  describe('executeBuildStep', () => {
    it('should execute build step', () => {
      const process = service.initializeBuildProcess('build-123');
      const step = service.addBuildStep(process.processId, 'Compile');

      service.executeBuildStep(process.processId, step.stepId);
      const updated = service.getBuildProcess(process.processId);
      const updatedStep = updated?.steps[0];

      expect(updatedStep?.status).toBe('running');
      expect(updated?.overallStatus).toBe('running');
    });
  });

  describe('completeBuildStep', () => {
    it('should complete successful step', () => {
      const process = service.initializeBuildProcess('build-123');
      const step = service.addBuildStep(process.processId, 'Compile');

      service.executeBuildStep(process.processId, step.stepId);
      service.completeBuildStep(process.processId, step.stepId, true, ['Compiled successfully']);

      const updated = service.getBuildProcess(process.processId);
      const updatedStep = updated?.steps[0];

      expect(updatedStep?.status).toBe('completed');
      expect(updatedStep?.output).toContain('Compiled successfully');
    });

    it('should complete failed step', () => {
      const process = service.initializeBuildProcess('build-123');
      const step = service.addBuildStep(process.processId, 'Compile');

      service.executeBuildStep(process.processId, step.stepId);
      service.completeBuildStep(process.processId, step.stepId, false, [], 'Compilation failed');

      const updated = service.getBuildProcess(process.processId);
      expect(updated?.overallStatus).toBe('failed');
    });
  });

  describe('completeBuildProcess', () => {
    it('should complete successful process', () => {
      const process = service.initializeBuildProcess('build-123');
      const completed = service.completeBuildProcess(
        process.processId,
        true,
        '/path/to/app.apk',
        '/path/to/app.aab'
      );

      expect(completed.overallStatus).toBe('completed');
      expect(completed.apkPath).toBe('/path/to/app.apk');
      expect(completed.aabPath).toBe('/path/to/app.aab');
    });

    it('should add to history on success', () => {
      const process = service.initializeBuildProcess('build-123');
      service.completeBuildProcess(process.processId, true, '/path/to/app.apk');

      const history = service.getBuildHistory();
      expect(history).toHaveLength(1);
    });

    it('should not add to history on failure', () => {
      const process = service.initializeBuildProcess('build-123');
      service.completeBuildProcess(process.processId, false);

      const history = service.getBuildHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('getBuildProcess', () => {
    it('should return build process', () => {
      const process = service.initializeBuildProcess('build-123');
      const retrieved = service.getBuildProcess(process.processId);
      expect(retrieved).toEqual(process);
    });

    it('should return undefined for non-existent process', () => {
      const retrieved = service.getBuildProcess('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getBuildHistory', () => {
    it('should return empty array initially', () => {
      const history = service.getBuildHistory();
      expect(history).toHaveLength(0);
    });

    it('should return successful builds', () => {
      const process1 = service.initializeBuildProcess('build-1');
      service.completeBuildProcess(process1.processId, true, '/path/to/app1.apk');

      const process2 = service.initializeBuildProcess('build-2');
      service.completeBuildProcess(process2.processId, true, '/path/to/app2.apk');

      const history = service.getBuildHistory();
      expect(history).toHaveLength(2);
    });
  });

  describe('getLatestBuildProcess', () => {
    it('should return latest build process', () => {
      const process1 = service.initializeBuildProcess('build-1');
      service.completeBuildProcess(process1.processId, true, '/path/to/app1.apk');

      const process2 = service.initializeBuildProcess('build-2');
      service.completeBuildProcess(process2.processId, true, '/path/to/app2.apk');

      const latest = service.getLatestBuildProcess();
      expect(latest?.buildId).toBe('build-2');
    });
  });

  describe('getBuildLog', () => {
    it('should generate build log', () => {
      const process = service.initializeBuildProcess('build-123');
      const step = service.addBuildStep(process.processId, 'Compile');

      service.executeBuildStep(process.processId, step.stepId);
      service.completeBuildStep(process.processId, step.stepId, true, ['Compiled successfully']);

      const log = service.getBuildLog(process.processId);
      expect(log).toContain('Build Log');
      expect(log).toContain('Compile');
      expect(log).toContain('Compiled successfully');
    });
  });

  describe('calculateBuildStats', () => {
    it('should calculate statistics', () => {
      const process1 = service.initializeBuildProcess('build-1');
      service.completeBuildProcess(process1.processId, true, '/path/to/app1.apk');

      const process2 = service.initializeBuildProcess('build-2');
      service.completeBuildProcess(process2.processId, false);

      const stats = service.calculateBuildStats();
      expect(stats.totalBuilds).toBe(1); // Only successful
      expect(stats.successfulBuilds).toBe(1);
      expect(stats.failedBuilds).toBe(0);
      expect(stats.successRate).toBe(100);
    });
  });

  describe('generateBuildReport', () => {
    it('should generate build report', () => {
      const process = service.initializeBuildProcess('build-123');
      const step = service.addBuildStep(process.processId, 'Compile');

      service.executeBuildStep(process.processId, step.stepId);
      service.completeBuildStep(process.processId, step.stepId, true, ['Compiled']);

      service.completeBuildProcess(process.processId, true, '/path/to/app.apk');

      const report = service.generateBuildReport(process.processId);
      expect(report).toContain('APK Build Report');
      expect(report).toContain('Compile');
    });
  });

  describe('resetBuildProcess', () => {
    it('should reset build process', () => {
      const process = service.initializeBuildProcess('build-123');
      service.addBuildStep(process.processId, 'Compile');
      service.resetBuildProcess(process.processId);

      const updated = service.getBuildProcess(process.processId);
      expect(updated?.steps).toHaveLength(0);
      expect(updated?.overallStatus).toBe('pending');
    });
  });

  describe('getBuildProgress', () => {
    it('should calculate build progress', () => {
      const process = service.initializeBuildProcess('build-123');
      const step1 = service.addBuildStep(process.processId, 'Compile');
      const step2 = service.addBuildStep(process.processId, 'Package');

      service.executeBuildStep(process.processId, step1.stepId);
      service.completeBuildStep(process.processId, step1.stepId, true);

      const progress = service.getBuildProgress(process.processId);
      expect(progress.completed).toBe(1);
      expect(progress.total).toBe(2);
      expect(progress.percentage).toBe(50);
    });
  });

  describe('Complete build workflow', () => {
    it('should handle complete build process', () => {
      const process = service.initializeBuildProcess('build-123');

      const compileStep = service.addBuildStep(process.processId, 'Compile');
      service.executeBuildStep(process.processId, compileStep.stepId);
      service.completeBuildStep(process.processId, compileStep.stepId, true, ['Compiled']);

      const packageStep = service.addBuildStep(process.processId, 'Package');
      service.executeBuildStep(process.processId, packageStep.stepId);
      service.completeBuildStep(process.processId, packageStep.stepId, true, ['Packaged']);

      const signStep = service.addBuildStep(process.processId, 'Sign');
      service.executeBuildStep(process.processId, signStep.stepId);
      service.completeBuildStep(process.processId, signStep.stepId, true, ['Signed']);

      service.completeBuildProcess(process.processId, true, '/path/to/app.apk', '/path/to/app.aab');

      const history = service.getBuildHistory();
      expect(history).toHaveLength(1);
      expect(history[0].steps).toHaveLength(3);
    });
  });
});
