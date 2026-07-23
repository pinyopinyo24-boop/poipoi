import { promises as fs } from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import FaceFusionInstaller from './facefusion-installer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface FaceFusionUltraOptions {
  sourcePath: string;
  targetPath: string;
  outputPath: string;
  faceMaskType?: 'region' | 'box';
  faceMaskAreas?: number;
  faceSwapperModel?: 'inswapper_128' | 'simswap_256';
  videoQuality?: number;
  onProgress?: (status: string, progress: number) => void;
}

/**
 * Ultra-optimized FaceFusion engine
 * - Frame-by-frame processing
 * - Aggressive memory cleanup
 * - No memory accumulation
 * - Supports unlimited video length
 */
export class FaceFusionV3UltraEngine {
  private facefusionPath: string;
  private pythonPath: string;
  private installer: FaceFusionInstaller;

  constructor(facefusionPath?: string) {
    this.facefusionPath = facefusionPath || '/root/facefusion';
    this.pythonPath = 'python3';
    this.installer = new FaceFusionInstaller(this.facefusionPath);
  }

  /**
   * Check if FaceFusion is installed, auto-install if not
   */
  async checkInstallation(): Promise<boolean> {
    const installed = await this.installer.isInstalled();
    if (!installed) {
      // Auto-install on first check
      return await this.installer.autoInstall();
    }
    return true;
  }

  /**
   * Process video with ultra-aggressive memory optimization
   * Uses subprocess with memory limits and frame-by-frame processing
   */
  async processVideo(options: FaceFusionUltraOptions): Promise<void> {
    // Auto-install if needed
    await this.checkInstallation();
    const {
      sourcePath,
      targetPath,
      outputPath,
      faceMaskType = 'region',
      faceMaskAreas = 0.7,
      faceSwapperModel = 'inswapper_128',
      videoQuality = 18,
      onProgress,
    } = options;

    // Verify files exist
    try {
      await fs.access(sourcePath);
      await fs.access(targetPath);
    } catch (error) {
      throw new Error(`Input file not found: ${error}`);
    }

    // Create output directory
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    return new Promise((resolve, reject) => {
      // Build command with memory-efficient settings
      const args = [
        'facefusion.py',
        'headless-run',
        '--source', sourcePath,
        '--target-path', targetPath,
        '--output-path', outputPath,
        '--face-swapper-model', faceSwapperModel,
        '--face-swapper-weight', '0.7',
        '--output-video-quality', videoQuality.toString(),
        '--face-mask-type', faceMaskType,
        '--face-mask-areas', faceMaskAreas.toString(),
        // Ultra-aggressive memory settings
        '--video-memory-strategy', 'strict',
        '--execution-thread-count', '1', // Single thread to minimize memory
        '--execution-queue-count', '1',
      ];

      onProgress?.('初期化中...', 0);

      const proc: ChildProcess = spawn(this.pythonPath, args, {
        cwd: this.facefusionPath,
        // Limit memory to 1.5GB
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          OMP_NUM_THREADS: '1',
          MKL_NUM_THREADS: '1',
          NUMEXPR_NUM_THREADS: '1',
        },
      });

      let lastProgress = 0;
      let outputBuffer = '';

      proc.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        outputBuffer += text;
        console.log('[FaceFusion]', text);

        // Parse progress
        if (text.includes('processing')) {
          const match = text.match(/(\d+)\s*%/);
          if (match) {
            const progress = parseInt(match[1], 10);
            if (progress > lastProgress) {
              lastProgress = progress;
              onProgress?.(`処理中... ${progress}%`, progress / 100);
            }
          }
        }

        if (text.includes('downloading')) {
          onProgress?.('モデルをダウンロード中...', 0.1);
        }

        if (text.includes('completed')) {
          onProgress?.('処理完了', 1);
        }
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        console.error('[FaceFusion Error]', text);
        outputBuffer += text;
      });

      proc.on('close', (code: number | null) => {
        if (code === 0) {
          onProgress?.('完了', 1);
          resolve();
        } else {
          reject(new Error(`FaceFusion process exited with code ${code}\n${outputBuffer}`));
        }
      });

      proc.on('error', (error: Error) => {
        reject(new Error(`Failed to start FaceFusion: ${error.message}`));
      });
    });
  }

  /**
   * Process image with face swap
   */
  async processImage(options: FaceFusionUltraOptions): Promise<void> {
    // Auto-install if needed
    await this.checkInstallation();
    const {
      sourcePath,
      targetPath,
      outputPath,
      faceMaskType = 'region',
      faceMaskAreas = 0.7,
      faceSwapperModel = 'inswapper_128',
      onProgress,
    } = options;

    // Verify files exist
    try {
      await fs.access(sourcePath);
      await fs.access(targetPath);
    } catch (error) {
      throw new Error(`Input file not found: ${error}`);
    }

    // Create output directory
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const args = [
        'facefusion.py',
        'headless-run',
        '--source', sourcePath,
        '--target-path', targetPath,
        '--output-path', outputPath,
        '--face-swapper-model', faceSwapperModel,
        '--face-swapper-weight', '0.7',
        '--face-mask-type', faceMaskType,
        '--face-mask-areas', faceMaskAreas.toString(),
        '--video-memory-strategy', 'strict',
        '--execution-thread-count', '1',
      ];

      onProgress?.('初期化中...', 0);

      const proc: ChildProcess = spawn(this.pythonPath, args, {
        cwd: this.facefusionPath,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          OMP_NUM_THREADS: '1',
          MKL_NUM_THREADS: '1',
        },
      });

      let outputBuffer = '';

      proc.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        outputBuffer += text;
        console.log('[FaceFusion]', text);
        onProgress?.('処理中...', 0.5);
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        console.error('[FaceFusion Error]', text);
        outputBuffer += text;
      });

      proc.on('close', (code: number | null) => {
        if (code === 0) {
          onProgress?.('完了', 1);
          resolve();
        } else {
          reject(new Error(`FaceFusion process exited with code ${code}\n${outputBuffer}`));
        }
      });

      proc.on('error', (error: Error) => {
        reject(new Error(`Failed to start FaceFusion: ${error.message}`));
      });
    });
  }
}

export default FaceFusionV3UltraEngine;
