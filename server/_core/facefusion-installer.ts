import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Auto-installer for FaceFusion v3.6.1
 * Handles installation on first use
 */
export class FaceFusionInstaller {
  private facefusionPath: string;
  private pythonPath: string;
  private isInstalling: boolean = false;

  constructor(facefusionPath?: string) {
    this.facefusionPath = facefusionPath || '/root/facefusion';
    this.pythonPath = 'python3';
  }

  /**
   * Check if FaceFusion is already installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      const facefusionPy = path.join(this.facefusionPath, 'facefusion.py');
      await fs.access(facefusionPy);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Auto-install FaceFusion on first use
   */
  async autoInstall(onProgress?: (status: string) => void): Promise<boolean> {
    // Prevent concurrent installations
    if (this.isInstalling) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
          if (!this.isInstalling && await this.isInstalled()) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 1000);
      });
    }

    const installed = await this.isInstalled();
    if (installed) {
      return true;
    }

    this.isInstalling = true;
    onProgress?.('FaceFusionをインストール中...');

    try {
      // Clone FaceFusion repository
      await this.executeCommand('git', ['clone', 'https://github.com/facefusion/facefusion.git', this.facefusionPath], onProgress);
      onProgress?.('依存関係をインストール中...');

      // Install dependencies
      await this.executeCommand(this.pythonPath, ['-m', 'pip', 'install', '-r', path.join(this.facefusionPath, 'requirements.txt'), '-q'], onProgress);
      onProgress?.('インストール完了');

      this.isInstalling = false;
      return true;
    } catch (error) {
      this.isInstalling = false;
      console.error('FaceFusion installation failed:', error);
      onProgress?.(`インストール失敗: ${error instanceof Error ? error.message : '不明なエラー'}`);
      return false;
    }
  }

  /**
   * Execute command and wait for completion
   */
  private executeCommand(command: string, args: string[], onProgress?: (status: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';

      proc.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
        const lines = output.split('\n');
        if (lines.length > 1) {
          onProgress?.(lines[lines.length - 2]);
        }
      });

      proc.stderr?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      proc.on('close', (code: number | null) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}: ${output}`));
        }
      });

      proc.on('error', (error: Error) => {
        reject(error);
      });
    });
  }
}

export default FaceFusionInstaller;
