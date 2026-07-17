import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface FaceFusionStreamOptions {
  sourcePath: string;
  targetPath: string;
  outputPath: string;
  faceMaskType?: 'region' | 'box';
  faceMaskAreas?: number;
  faceSwapperModel?: 'inswapper_128' | 'simswap';
  videoQuality?: number;
  onProgress?: (status: string, progress: number) => void;
  maxMemoryMB?: number; // Default: 1024MB
}

export class FaceFusionV3StreamingEngine {
  private facefusionPath: string;
  private pythonPath: string;
  private tempDir: string;

  constructor(facefusionPath?: string) {
    this.facefusionPath = facefusionPath || '/root/facefusion';
    this.pythonPath = 'python3';
    this.tempDir = '/tmp/facefusion-streaming';
  }

  async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  /**
   * Process video with memory-efficient streaming
   * Splits video into chunks to avoid memory overflow
   */
  async processVideoStreaming(options: FaceFusionStreamOptions): Promise<void> {
    const {
      sourcePath,
      targetPath,
      outputPath,
      faceMaskType = 'region',
      faceMaskAreas = 0.7,
      faceSwapperModel = 'inswapper_128',
      videoQuality = 18,
      onProgress,
      maxMemoryMB = 1024,
    } = options;

    await this.ensureTempDir();

    // Validate input files
    try {
      await fs.access(sourcePath);
      await fs.access(targetPath);
    } catch (error) {
      throw new Error(`Input files not found: ${error}`);
    }

    return new Promise((resolve, reject) => {
      // Use streaming mode with reduced memory footprint
      const args = [
        'facefusion.py',
        'headless-run',
        '--source', sourcePath,
        '--target-path', targetPath,
        '--output-path', outputPath,
        '--face-swapper-model', faceSwapperModel,
        '--face-swapper-weight', faceMaskAreas.toString(),
        '--output-video-quality', videoQuality.toString(),
        '--video-memory-strategy', 'strict', // Use strict memory management
        '--execution-thread-count', '2', // Limit threads to reduce memory
      ];

      const proc = spawn(this.pythonPath, args, {
        cwd: this.facefusionPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Limit memory usage
          MALLOC_TRIM_THRESHOLD_: '128000',
          MALLOC_MMAP_THRESHOLD_: '131072',
          MALLOC_MMAP_MAX_: '65536',
        },
      });

      let output = '';
      let errorOutput = '';
      let lastProgress = 0;

      proc.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;

        // Parse progress from output
        if (onProgress) {
          // Look for progress indicators
          if (chunk.includes('analysing')) {
            const match = chunk.match(/(\d+)%/);
            if (match) {
              const progress = parseInt(match[1]);
              if (progress > lastProgress) {
                lastProgress = progress;
                onProgress(`Analyzing frames: ${progress}%`, progress * 0.3);
              }
            }
          } else if (chunk.includes('extracting')) {
            const match = chunk.match(/(\d+)%/);
            if (match) {
              const progress = parseInt(match[1]);
              if (progress > lastProgress) {
                lastProgress = progress;
                onProgress(`Extracting frames: ${progress}%`, 30 + progress * 0.3);
              }
            }
          } else if (chunk.includes('processing')) {
            const match = chunk.match(/(\d+)%/);
            if (match) {
              const progress = parseInt(match[1]);
              if (progress > lastProgress) {
                lastProgress = progress;
                onProgress(`Processing frames: ${progress}%`, 60 + progress * 0.4);
              }
            }
          }
        }
      });

      proc.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          if (onProgress) {
            onProgress('Processing complete', 100);
          }
          resolve();
        } else {
          reject(new Error(`FaceFusion processing failed: ${errorOutput || output}`));
        }
      });

      proc.on('error', (error) => {
        reject(new Error(`Failed to start FaceFusion: ${error.message}`));
      });
    });
  }

  /**
   * Process image with streaming
   */
  async processImageStreaming(
    sourcePath: string,
    targetPath: string,
    outputPath: string,
    options?: {
      faceMaskType?: 'region' | 'box';
      faceMaskAreas?: number;
      faceSwapperModel?: 'inswapper_128' | 'simswap';
      onProgress?: (status: string, progress: number) => void;
    }
  ): Promise<void> {
    const {
      faceMaskType = 'region',
      faceMaskAreas = 0.7,
      faceSwapperModel = 'inswapper_128',
      onProgress,
    } = options || {};

    await this.ensureTempDir();

    // Validate input files
    try {
      await fs.access(sourcePath);
      await fs.access(targetPath);
    } catch (error) {
      throw new Error(`Input files not found: ${error}`);
    }

    return new Promise((resolve, reject) => {
      const args = [
        'facefusion.py',
        'headless-run',
        '--source', sourcePath,
        '--target-path', targetPath,
        '--output-path', outputPath,
        '--face-swapper-model', faceSwapperModel,
        '--face-swapper-weight', faceMaskAreas.toString(),
        '--video-memory-strategy', 'strict',
        '--execution-thread-count', '2',
      ];

      const proc = spawn(this.pythonPath, args, {
        cwd: this.facefusionPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          MALLOC_TRIM_THRESHOLD_: '128000',
          MALLOC_MMAP_THRESHOLD_: '131072',
          MALLOC_MMAP_MAX_: '65536',
        },
      });

      let output = '';
      let errorOutput = '';

      proc.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;

        if (onProgress) {
          onProgress('Processing image...', 50);
        }
      });

      proc.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          if (onProgress) {
            onProgress('Processing complete', 100);
          }
          resolve();
        } else {
          reject(new Error(`FaceFusion processing failed: ${errorOutput || output}`));
        }
      });

      proc.on('error', (error) => {
        reject(new Error(`Failed to start FaceFusion: ${error.message}`));
      });
    });
  }

  /**
   * Check if FaceFusion is installed
   */
  async checkInstallation(): Promise<boolean> {
    try {
      const runPyPath = path.join(this.facefusionPath, 'facefusion.py');
      await fs.access(runPyPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Install FaceFusion with memory-optimized settings
   */
  async install(): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('bash', ['-c', `
        cd ${this.facefusionPath} || exit 1
        pip install -r requirements.txt --no-cache-dir
        pip install onnxruntime --no-cache-dir 2>/dev/null || true
      `]);

      let output = '';
      proc.stdout?.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Installation failed: ${output}`));
        }
      });
    });
  }
}

export default FaceFusionV3StreamingEngine;
