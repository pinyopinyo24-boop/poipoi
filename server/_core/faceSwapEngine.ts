/**
 * Face Swap Engine - 高品質顔入れ替え動画生成
 * Facefusion完全実装：記事の3ステップ
 * 1. 動画を1フレームずつ分解
 * 2. 各フレームで顔入れ替え処理（高度なブレンディング）
 * 3. 処理後のフレームを動画に再結合
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

export interface FaceSwapOptions {
  sourceImagePath: string;
  targetVideoPath: string;
  outputPath: string;
  quality?: 'low' | 'medium' | 'high';
  gpuAcceleration?: boolean;
}

export interface FaceSwapProgress {
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export class FaceSwapEngine {
  private tempDir: string;
  private currentProgress: FaceSwapProgress = {
    status: 'idle',
    progress: 0,
    message: 'Ready',
  };
  private progressBuffer = '';

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'poipoi-faceswap');
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      console.log('[FaceSwap] Engine initialized');
    } catch (error) {
      console.error('[FaceSwap] Initialization error:', error);
      throw error;
    }
  }

  async processFaceSwap(options: FaceSwapOptions): Promise<string> {
    if (this.currentProgress.status === 'processing') {
      throw new Error('A face swap job is already processing for this user');
    }
    try {
      this.currentProgress = {
        status: 'processing',
        progress: 0,
        message: 'Starting face swap process...',
      };
      this.progressBuffer = '';

      // Validate input files
      await this.validateInputFiles(options.sourceImagePath, options.targetVideoPath);

      // Run complete Facefusion implementation (3 steps)
      await this.runCompleteFacefusion(options);

      // Verify output
      await this.verifyOutput(options.outputPath);

      this.currentProgress = {
        status: 'completed',
        progress: 100,
        message: 'Face swap completed successfully',
      };

      return options.outputPath;
    } catch (error) {
      this.currentProgress = {
        status: 'error',
        progress: 0,
        message: 'Face swap failed',
        error: error instanceof Error ? error.message : String(error),
      };
      throw error;
    }
  }

  private async validateInputFiles(sourcePath: string, targetPath: string): Promise<void> {
    try {
      await fs.access(sourcePath);
      await fs.access(targetPath);
      console.log('[FaceSwap] Input files validated');
    } catch (error) {
      throw new Error(`Input file validation failed: ${error}`);
    }
  }

  private async runCompleteFacefusion(options: FaceSwapOptions): Promise<void> {
    // Use Python script to run the complete implementation
    return new Promise((resolve, reject) => {
      const scriptPath = path.resolve(process.cwd(), 'server/facefusion_complete.py');
      const pythonExecutable = process.env.PYTHON_EXECUTABLE || (process.platform === 'win32' ? 'python' : 'python3');
      const workDir = path.join(path.dirname(options.outputPath), `.faceswap-work-${randomUUID()}`);
      
      const args = [
        '-u',
        scriptPath,
        '--work-dir', workDir,
        '--source', options.sourceImagePath,
        '--target', options.targetVideoPath,
        '--output', options.outputPath,
        '--quality', options.quality || 'high',
      ];
      if (options.gpuAcceleration) args.push('--gpu');

      const child = spawn(pythonExecutable, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 600000, // 10 minutes timeout
      });

      let errorOutput = '';

      child.stdout?.on('data', (data) => {
        this.parseProgress(data.toString());
      });

      child.stderr?.on('data', (data) => {
        errorOutput = `${errorOutput}${data.toString()}`.slice(-20000);
        console.error('[FaceSwap] Error:', data.toString());
      });

      child.on('close', (code) => {
        void fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined).then(() => {
          if (code === 0) {
            console.log('[FaceSwap] Process completed successfully');
            resolve();
          } else {
            reject(new Error(`Face swap process failed with code ${code}: ${errorOutput}`));
          }
        });
      });

      child.on('error', (error) => {
        void fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined).then(() => {
          reject(new Error(`Failed to start face swap: ${error.message}`));
        });
      });
    });
  }

  private parseProgress(chunk: string): void {
    const lines = `${this.progressBuffer}${chunk}`.split(/\r?\n/);
    this.progressBuffer = lines.pop()?.slice(-2000) || '';
    const output = lines.join('\n');
    // Parse progress from output
    const progressMatch = output.match(/(\d+)%/);
    if (progressMatch) {
      this.currentProgress.progress = parseInt(progressMatch[1], 10);
      this.currentProgress.message = `Processing: ${this.currentProgress.progress}%`;
    }

    if (output.includes('ステップ1')) {
      this.currentProgress.message = 'Step 1: Decomposing video to frames...';
      this.currentProgress.progress = 20;
    }

    if (output.includes('ステップ2')) {
      this.currentProgress.message = 'Step 2: Processing face swap with advanced blending...';
      this.currentProgress.progress = 50;
    }

    if (output.includes('ステップ3')) {
      this.currentProgress.message = 'Step 3: Recomposing frames to video...';
      this.currentProgress.progress = 80;
    }

    if (output.includes('完成')) {
      this.currentProgress.progress = 100;
      this.currentProgress.message = 'Finalizing...';
    }

    const swapFrames = output.match(/処理中:\s*(\d+)\/(\d+)フレーム/);
    if (swapFrames) {
      const completed = Number(swapFrames[1]);
      const total = Number(swapFrames[2]);
      if (total > 0) {
        this.currentProgress.progress = 20 + Math.floor((completed / total) * 60);
        this.currentProgress.message = `顔入れ替え処理中: ${completed}/${total}フレーム`;
      }
    }

    const mergedFrames = output.match(/結合中:\s*(\d+)\/(\d+)フレーム/);
    if (mergedFrames) {
      const completed = Number(mergedFrames[1]);
      const total = Number(mergedFrames[2]);
      if (total > 0) {
        this.currentProgress.progress = 80 + Math.floor((completed / total) * 19);
        this.currentProgress.message = `動画を再構成中: ${completed}/${total}フレーム`;
      }
    }
  }

  private async verifyOutput(outputPath: string): Promise<void> {
    try {
      const stats = await fs.stat(outputPath);
      if (stats.size === 0) {
        throw new Error('Output file is empty');
      }
      console.log(`[FaceSwap] Output verified: ${stats.size} bytes`);
    } catch (error) {
      throw new Error(`Output verification failed: ${error}`);
    }
  }

  getProgress(): FaceSwapProgress {
    return this.currentProgress;
  }

  async cleanup(userTempDir?: string): Promise<void> {
    try {
      if (!userTempDir) {
        throw new Error('A user-scoped temporary directory is required');
      }
      const root = path.resolve(this.tempDir);
      const target = path.resolve(userTempDir);
      if (target === root || !target.startsWith(`${root}${path.sep}`)) {
        throw new Error('Refusing to clean a directory outside the user-scoped temporary root');
      }
      await fs.rm(target, { recursive: true, force: true });
      console.log('[FaceSwap] Cleanup completed');
    } catch (error) {
      console.error('[FaceSwap] Cleanup error:', error);
      throw error;
    }
  }

}

// Export singleton instance
export const faceSwapEngine = new FaceSwapEngine();

export default FaceSwapEngine;
