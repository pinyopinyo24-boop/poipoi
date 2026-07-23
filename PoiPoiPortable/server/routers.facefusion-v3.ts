import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { FaceFusionV3UltraEngine } from './_core/facefusion-v3-ultra';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Temporary storage for processing
const TEMP_DIR = '/tmp/facefusion-v3-processing';

// Initialize ultra-optimized engine
const engine = new FaceFusionV3UltraEngine();

// Ensure temp directory exists
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create temp directory:', error);
  }
}

// Save base64 to file
async function saveBase64ToFile(base64: string, filename: string): Promise<string> {
  await ensureTempDir();
  const filePath = path.join(TEMP_DIR, filename);
  const buffer = Buffer.from(base64, 'base64');
  await fs.writeFile(filePath, buffer);
  return filePath;
}

// Read file as base64
async function readFileAsBase64(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return buffer.toString('base64');
}

export const facefusionV3Router = router({
  // Check if FaceFusion is installed
  checkInstallation: publicProcedure.query(async () => {
    const installed = await engine.checkInstallation();
    return {
      installed,
      memoryOptimized: true,
      ultraOptimized: true,
    };
  }),

  // Process video face swap
  swapVideoFaceSwap: publicProcedure
    .input(
      z.object({
        sourceBase64: z.string().describe('Source face image in base64'),
        targetBase64: z.string().describe('Target video in base64'),
        faceMaskType: z.enum(['region', 'box']).default('region'),
        faceMaskAreas: z.number().min(0).max(1).default(0.7),
        faceSwapperModel: z.enum(['inswapper_128', 'simswap_256']).default('inswapper_128'),
        videoQuality: z.number().min(0).max(51).default(18),
      })
    )
    .mutation(async ({ input }) => {
      const {
        sourceBase64,
        targetBase64,
        faceMaskType,
        faceMaskAreas,
        faceSwapperModel,
        videoQuality,
      } = input;

      const sessionId = Date.now().toString();
      
      try {
        // Save input files
        const sourcePath = await saveBase64ToFile(sourceBase64, `source_${sessionId}.jpg`);
        const targetPath = await saveBase64ToFile(targetBase64, `target_${sessionId}.mp4`);
        const outputPath = path.join(TEMP_DIR, `output_${sessionId}.mp4`);

        // Process with ultra-optimized FaceFusion
        await engine.processVideo({
          sourcePath,
          targetPath,
          outputPath,
          faceMaskType,
          faceMaskAreas,
          faceSwapperModel,
          videoQuality,
          onProgress: (status, progress) => {
            console.log(`[FaceFusion] ${status} (${Math.round(progress * 100)}%)`);
          },
        });

        // Read output as base64
        const resultBase64 = await readFileAsBase64(outputPath);

        // Cleanup
        await Promise.all([
          fs.unlink(sourcePath).catch(() => {}),
          fs.unlink(targetPath).catch(() => {}),
          fs.unlink(outputPath).catch(() => {}),
        ]);

        return {
          success: true,
          resultBase64,
          message: 'ビデオ顔入れ替え完了',
        };
      } catch (error) {
        // Cleanup on error
        const sourcePath = path.join(TEMP_DIR, `source_${sessionId}.jpg`);
        const targetPath = path.join(TEMP_DIR, `target_${sessionId}.mp4`);
        const outputPath = path.join(TEMP_DIR, `output_${sessionId}.mp4`);
        
        await Promise.all([
          fs.unlink(sourcePath).catch(() => {}),
          fs.unlink(targetPath).catch(() => {}),
          fs.unlink(outputPath).catch(() => {}),
        ]);

        return {
          success: false,
          message: `顔入れ替え失敗: ${error instanceof Error ? error.message : '不明なエラー'}`,
        };
      }
    }),

  // Process image face swap
  swapImageFaceSwap: publicProcedure
    .input(
      z.object({
        sourceBase64: z.string().describe('Source face image in base64'),
        targetBase64: z.string().describe('Target image in base64'),
        faceMaskType: z.enum(['region', 'box']).default('region'),
        faceMaskAreas: z.number().min(0).max(1).default(0.7),
        faceSwapperModel: z.enum(['inswapper_128', 'simswap_256']).default('inswapper_128'),
      })
    )
    .mutation(async ({ input }) => {
      const {
        sourceBase64,
        targetBase64,
        faceMaskType,
        faceMaskAreas,
        faceSwapperModel,
      } = input;

      const sessionId = Date.now().toString();
      
      try {
        // Save input files
        const sourcePath = await saveBase64ToFile(sourceBase64, `source_${sessionId}.jpg`);
        const targetPath = await saveBase64ToFile(targetBase64, `target_${sessionId}.jpg`);
        const outputPath = path.join(TEMP_DIR, `output_${sessionId}.jpg`);

        // Process with ultra-optimized FaceFusion
        await engine.processImage({
          sourcePath,
          targetPath,
          outputPath,
          faceMaskType,
          faceMaskAreas,
          faceSwapperModel,
          onProgress: (status, progress) => {
            console.log(`[FaceFusion] ${status} (${Math.round(progress * 100)}%)`);
          },
        });

        // Read output as base64
        const resultBase64 = await readFileAsBase64(outputPath);

        // Cleanup
        await Promise.all([
          fs.unlink(sourcePath).catch(() => {}),
          fs.unlink(targetPath).catch(() => {}),
          fs.unlink(outputPath).catch(() => {}),
        ]);

        return {
          success: true,
          resultBase64,
          message: '画像顔入れ替え完了',
        };
      } catch (error) {
        // Cleanup on error
        const sourcePath = path.join(TEMP_DIR, `source_${sessionId}.jpg`);
        const targetPath = path.join(TEMP_DIR, `target_${sessionId}.jpg`);
        const outputPath = path.join(TEMP_DIR, `output_${sessionId}.jpg`);
        
        await Promise.all([
          fs.unlink(sourcePath).catch(() => {}),
          fs.unlink(targetPath).catch(() => {}),
          fs.unlink(outputPath).catch(() => {}),
        ]);

        return {
          success: false,
          message: `顔入れ替え失敗: ${error instanceof Error ? error.message : '不明なエラー'}`,
        };
      }
    }),

  // Get processing status
  getStatus: publicProcedure.query(async () => {
    try {
      const installed = await engine.checkInstallation();
      
      return {
        installed,
        ready: installed,
        memoryOptimized: true,
        ultraOptimized: true,
        message: installed ? '顔入れ替え処理準備完了' : 'FaceFusionがインストールされていません',
      };
    } catch (error) {
      return {
        installed: false,
        ready: false,
        memoryOptimized: true,
        ultraOptimized: true,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }),
});

// Cleanup temporary files periodically (every 10 minutes)
setInterval(async () => {
  try {
    const tempDir = '/tmp/facefusion-v3-processing';
    const files = await fs.readdir(tempDir).catch(() => []);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stat = await fs.stat(filePath).catch(() => null);
      
      // Delete files older than 1 hour to free up disk space
      if (stat && now - stat.mtimeMs > 3600000) {
        await fs.unlink(filePath).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}, 600000);

export default facefusionV3Router;
