import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface FaceFusionOptions {
  sourcePath: string;
  targetPath: string;
  outputPath: string;
  faceMaskType?: 'region' | 'box';
  faceMaskAreas?: number; // 0.0 - 1.0
  faceMaskPaddingTop?: number;
  faceMaskPaddingBottom?: number;
  faceMaskPaddingLeft?: number;
  faceMaskPaddingRight?: number;
  faceSwapperModel?: 'inswapper_128' | 'simswap';
  videoQuality?: number; // 0-51, lower is better quality
  onProgress?: (status: string, progress: number) => void;
}

export class FaceFusionV3Engine {
  private facefusionPath: string;
  private pythonPath: string;

  constructor(facefusionPath?: string) {
    this.facefusionPath = facefusionPath || '/root/facefusion';
    this.pythonPath = 'python3';
  }

  async checkInstallation(): Promise<boolean> {
    try {
      const runPyPath = path.join(this.facefusionPath, 'run.py');
      await fs.access(runPyPath);
      return true;
    } catch {
      return false;
    }
  }

  async install(): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('bash', ['-c', `
        cd ${this.facefusionPath} || exit 1
        pip install -r requirements.txt
        pip install onnxruntime-gpu 2>/dev/null || pip install onnxruntime
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

  async processVideoFaceSwap(options: FaceFusionOptions): Promise<void> {
    const {
      sourcePath,
      targetPath,
      outputPath,
      faceMaskType = 'region',
      faceMaskAreas = 0.7,
      faceMaskPaddingTop = 0,
      faceMaskPaddingBottom = 0,
      faceMaskPaddingLeft = 0,
      faceMaskPaddingRight = 0,
      faceSwapperModel = 'inswapper_128',
      videoQuality = 18,
      onProgress,
    } = options;

    // Validate input files
    try {
      await fs.access(sourcePath);
      await fs.access(targetPath);
    } catch (error) {
      throw new Error(`Input files not found: ${error}`);
    }

    return new Promise((resolve, reject) => {
      const args = [
        'run.py',
        '--source', sourcePath,
        '--target', targetPath,
        '--output', outputPath,
        '--frame-processor', 'face_swapper',
        '--face-swapper-model', faceSwapperModel,
        '--face-mask-type', faceMaskType,
        '--face-mask-areas', faceMaskAreas.toString(),
        '--face-mask-padding-top', faceMaskPaddingTop.toString(),
        '--face-mask-padding-bottom', faceMaskPaddingBottom.toString(),
        '--face-mask-padding-left', faceMaskPaddingLeft.toString(),
        '--face-mask-padding-right', faceMaskPaddingRight.toString(),
        '--video-quality', videoQuality.toString(),
      ];

      const proc = spawn(this.pythonPath, args, {
        cwd: this.facefusionPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      let errorOutput = '';

      proc.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Parse progress from output
        if (onProgress) {
          if (chunk.includes('Processing')) {
            onProgress('Processing frames...', 50);
          } else if (chunk.includes('Complete')) {
            onProgress('Processing complete', 100);
          }
        }
      });

      proc.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
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

  async processImageFaceSwap(options: Omit<FaceFusionOptions, 'videoQuality'>): Promise<void> {
    const {
      sourcePath,
      targetPath,
      outputPath,
      faceMaskType = 'region',
      faceMaskAreas = 0.7,
      faceMaskPaddingTop = 0,
      faceMaskPaddingBottom = 0,
      faceMaskPaddingLeft = 0,
      faceMaskPaddingRight = 0,
      faceSwapperModel = 'inswapper_128',
      onProgress,
    } = options;

    // Validate input files
    try {
      await fs.access(sourcePath);
      await fs.access(targetPath);
    } catch (error) {
      throw new Error(`Input files not found: ${error}`);
    }

    return new Promise((resolve, reject) => {
      const args = [
        'run.py',
        '--source', sourcePath,
        '--target', targetPath,
        '--output', outputPath,
        '--frame-processor', 'face_swapper',
        '--face-swapper-model', faceSwapperModel,
        '--face-mask-type', faceMaskType,
        '--face-mask-areas', faceMaskAreas.toString(),
        '--face-mask-padding-top', faceMaskPaddingTop.toString(),
        '--face-mask-padding-bottom', faceMaskPaddingBottom.toString(),
        '--face-mask-padding-left', faceMaskPaddingLeft.toString(),
        '--face-mask-padding-right', faceMaskPaddingRight.toString(),
      ];

      const proc = spawn(this.pythonPath, args, {
        cwd: this.facefusionPath,
        stdio: ['pipe', 'pipe', 'pipe'],
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

  async validateModels(): Promise<{
    inswapper_128: boolean;
    simswap: boolean;
  }> {
    const modelsPath = path.join(this.facefusionPath, 'models');
    
    try {
      const files = await fs.readdir(modelsPath);
      return {
        inswapper_128: files.some(f => f.includes('inswapper_128')),
        simswap: files.some(f => f.includes('simswap')),
      };
    } catch {
      return {
        inswapper_128: false,
        simswap: false,
      };
    }
  }
}

export default FaceFusionV3Engine;
