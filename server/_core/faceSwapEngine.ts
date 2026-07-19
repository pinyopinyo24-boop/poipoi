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

export interface FaceSwapOptions {
  sourceImagePath: string;
  targetVideoPath: string;
  outputPath: string;
  quality?: 'low' | 'medium' | 'high';
  enableEnhancer?: boolean;
  gpuAcceleration?: boolean;
}

export interface FaceSwapProgress {
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}

class FaceSwapEngine {
  private tempDir: string;
  private currentProgress: FaceSwapProgress = {
    status: 'idle',
    progress: 0,
    message: 'Ready',
  };

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
    try {
      this.currentProgress = {
        status: 'processing',
        progress: 0,
        message: 'Starting face swap process...',
      };

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
      const scriptPath = path.join(__dirname, '../../facefusion_complete.py');
      
      const args = [
        scriptPath,
        '--source', options.sourceImagePath,
        '--target', options.targetVideoPath,
        '--output', options.outputPath,
        '--quality', options.quality || 'high',
      ];

      if (options.enableEnhancer) {
        args.push('--enable-enhancer');
      }

      if (options.gpuAcceleration) {
        args.push('--gpu');
      }

      const process = spawn('python3', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 600000, // 10 minutes timeout
      });

      let output = '';
      let errorOutput = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
        this.parseProgress(data.toString());
      });

      process.stderr?.on('data', (data) => {
        errorOutput += data.toString();
        console.error('[FaceSwap] Error:', data.toString());
      });

      process.on('close', (code) => {
        if (code === 0) {
          console.log('[FaceSwap] Process completed successfully');
          resolve();
        } else {
          reject(new Error(`Face swap process failed with code ${code}: ${errorOutput}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start face swap: ${error.message}`));
      });
    });
  }

  private parseProgress(output: string): void {
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

  async cleanup(): Promise<void> {
    try {
      // Clean up temporary files
      const files = await fs.readdir(this.tempDir);
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
          // Recursively remove directories
          await this.removeDirectory(filePath);
        } else {
          await fs.unlink(filePath);
        }
      }
      console.log('[FaceSwap] Cleanup completed');
    } catch (error) {
      console.error('[FaceSwap] Cleanup error:', error);
    }
  }

  private async removeDirectory(dirPath: string): Promise<void> {
    try {
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
          await this.removeDirectory(filePath);
        } else {
          await fs.unlink(filePath);
        }
      }
      await fs.rmdir(dirPath);
    } catch (error) {
      console.error(`[FaceSwap] Error removing directory ${dirPath}:`, error);
    }
  }
}

// Export singleton instance
export const faceSwapEngine = new FaceSwapEngine();

export default FaceSwapEngine;
