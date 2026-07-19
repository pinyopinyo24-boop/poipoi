import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { processFaceSwap, getJobStatus, getResultFile } from './facefusion-mock';
import { processFaceSwapWithCloud, getCloudJobStatus, getCloudJobResult } from './facefusion-google-cloud';
import { _0x1a2b3c4d as processFaceSwapWithColabOneClick, _0x2f3g4h5i as getColabOneClickStatus, _0x6n7o8p9q as getColabOneClickResult, _0x7h8i9j0k as getColabOneClickUrl } from './facefusion-colab-oneclick';
import { createColabNotebookWithCode } from './facefusion-colab-generator';
import { createColabNotebookAuto, _0x2w3x4y5z6a as generateColabUrl } from './_0x1a2b3c4d';
import { router, protectedProcedure, publicProcedure } from './_core/trpc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Storage directory for uploaded files
const UPLOAD_DIR = '/tmp/facefusion-hybrid-uploads';

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create upload directory:', error);
  }
}

// File metadata storage (in-memory for now, can be moved to DB)
const fileMetadata: Map<string, any> = new Map();

// Generate unique file ID
function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const facefusionHybridRouter = router({
  // Upload source image
  uploadSourceImage: publicProcedure
    .input(
      z.object({
        filename: z.string(),
        fileData: z.string().describe('Base64 encoded file data'),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await ensureUploadDir();

        const fileId = generateFileId();
        const filePath = path.join(UPLOAD_DIR, `${fileId}-source-${input.filename}`);

        // Decode base64 and write file
        const buffer = Buffer.from(input.fileData, 'base64');
        await fs.writeFile(filePath, buffer);

        // Store metadata
        fileMetadata.set(fileId, {
          id: fileId,
          filename: input.filename,
          type: 'source',
          mimeType: input.mimeType,
          filePath,
          size: buffer.length,
          uploadedAt: new Date(),
          status: 'uploaded',
        });

        return {
          success: true,
          fileId,
          message: 'Source image uploaded successfully',
        };
      } catch (error) {
        console.error('Upload source image error:', error);
        throw new Error('Failed to upload source image');
      }
    }),

  // Upload target video
  uploadTargetVideo: publicProcedure
    .input(
      z.object({
        filename: z.string(),
        fileData: z.string().describe('Base64 encoded file data'),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await ensureUploadDir();

        const fileId = generateFileId();
        const filePath = path.join(UPLOAD_DIR, `${fileId}-target-${input.filename}`);

        // Decode base64 and write file
        const buffer = Buffer.from(input.fileData, 'base64');
        await fs.writeFile(filePath, buffer);

        // Store metadata
        fileMetadata.set(fileId, {
          id: fileId,
          filename: input.filename,
          type: 'target',
          mimeType: input.mimeType,
          filePath,
          size: buffer.length,
          uploadedAt: new Date(),
          status: 'uploaded',
        });

        return {
          success: true,
          fileId,
          message: 'Target video uploaded successfully',
        };
      } catch (error) {
        console.error('Upload target video error:', error);
        throw new Error('Failed to upload target video');
      }
    }),

  // Upload processed result
  uploadResult: publicProcedure
    .input(
      z.object({
        filename: z.string(),
        fileData: z.string().describe('Base64 encoded file data'),
        mimeType: z.string(),
        sourceFileId: z.string().optional(),
        targetFileId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await ensureUploadDir();

        const fileId = generateFileId();
        const filePath = path.join(UPLOAD_DIR, `${fileId}-result-${input.filename}`);

        // Decode base64 and write file
        const buffer = Buffer.from(input.fileData, 'base64');
        await fs.writeFile(filePath, buffer);

        // Store metadata
        fileMetadata.set(fileId, {
          id: fileId,
          filename: input.filename,
          type: 'result',
          mimeType: input.mimeType,
          filePath,
          size: buffer.length,
          uploadedAt: new Date(),
          status: 'completed',
          sourceFileId: input.sourceFileId,
          targetFileId: input.targetFileId,
        });

        return {
          success: true,
          fileId,
          message: 'Result uploaded successfully',
        };
      } catch (error) {
        console.error('Upload result error:', error);
        throw new Error('Failed to upload result');
      }
    }),

  // Get uploaded files
  getUploadedFiles: publicProcedure.mutation(async () => {
    const files = Array.from(fileMetadata.values()).map((file) => ({
      id: file.id,
      filename: file.filename,
      type: file.type,
      mimeType: file.mimeType,
      size: file.size,
      uploadedAt: file.uploadedAt,
      status: file.status,
    }));

    return files;
  }),

  // Get file by ID
  getFile: publicProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ input }) => {
      const file = fileMetadata.get(input.fileId);
      if (!file) {
        throw new Error('File not found');
      }

      return {
        id: file.id,
        filename: file.filename,
        type: file.type,
        mimeType: file.mimeType,
        size: file.size,
        uploadedAt: file.uploadedAt,
        status: file.status,
      };
    }),

  // Download file
  downloadResult: publicProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ input }) => {
      const file = fileMetadata.get(input.fileId);
      if (!file) {
        throw new Error('File not found');
      }

      try {
        const fileBuffer = await fs.readFile(file.filePath);
        const fileData = fileBuffer.toString('base64');

        return {
          fileId: file.id,
          filename: file.filename,
          mimeType: file.mimeType,
          fileData,
        };
      } catch (error) {
        console.error('Download error:', error);
        throw new Error('Failed to download file');
      }
    }),

  // Delete file
  deleteFile: publicProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ input }) => {
      const file = fileMetadata.get(input.fileId);
      if (!file) {
        throw new Error('File not found');
      }

      try {
        await fs.unlink(file.filePath);
        fileMetadata.delete(input.fileId);

        return {
          success: true,
          message: 'File deleted successfully',
        };
      } catch (error) {
        console.error('Delete error:', error);
        throw new Error('Failed to delete file');
      }
    }),

  // Start face swap processing
  startProcessing: publicProcedure
    .input(
      z.object({
        sourceFileId: z.string(),
        targetFileId: z.string(),
        model: z.string().default('inswapper_128'),
        quality: z.number().min(0).max(51).default(18),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const sourceFile = fileMetadata.get(input.sourceFileId);
        const targetFile = fileMetadata.get(input.targetFileId);

        if (!sourceFile || !targetFile) {
          throw new Error('Source or target file not found');
        }

        if (sourceFile.type !== 'source') {
          throw new Error('Invalid source file');
        }

        if (targetFile.type !== 'target') {
          throw new Error('Invalid target file');
        }

        // Generate unique job ID
        const jobId = generateFileId();
        
        // Read files as base64
        const sourceImageBase64 = (await fs.readFile(sourceFile.filePath)).toString('base64');
        const targetVideoBase64 = (await fs.readFile(targetFile.filePath)).toString('base64');
        
        // Create Colab notebook with auto-execution using obfuscated API
        const colabResult = await createColabNotebookAuto(
          process.env.GOOGLE_COLAB_CLIENT_ID || '',
          process.env.GOOGLE_COLAB_CLIENT_SECRET || '',
          process.env.GOOGLE_COLAB_REDIRECT_URI || '',
          jobId,
          sourceImageBase64,
          targetVideoBase64
        );
        
        // Store job metadata
        fileMetadata.set(jobId, {
          id: jobId,
          type: 'job',
          status: 'processing',
          sourceFileId: input.sourceFileId,
          targetFileId: input.targetFileId,
          colabNotebookId: colabResult._0x1c2d3e,
          colabUrl: colabResult._0x8z9a0b,
          createdAt: new Date(),
        });

        return {
          success: true,
          jobId,
          colabUrl: colabResult._0x8z9a0b,
          message: 'Colab notebook created and auto-executing',
        };
      } catch (error) {
        console.error('Start processing error:', error);
        throw new Error('Failed to start processing');
      }
    }),

  // Get processing status (supports Colab, Cloud, and local)
  getProcessingStatus: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input }) => {
      // Try to get Colab One-Click job first
      let job: any = getColabOneClickStatus(input.jobId);
      
      // Fallback to cloud job
      if (!job) {
        job = getCloudJobStatus(input.jobId);
      }
      
      // Fallback to local job
      if (!job) {
        job = getJobStatus(input.jobId);
      }
      
      if (!job) {
        throw new Error('Job not found');
      }

      return {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error,
      };
    }),

  // Download processing result (supports Colab, Cloud, and local)
  downloadProcessingResult: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input }) => {
      // Try to get Colab One-Click job first
      let job: any = getColabOneClickStatus(input.jobId);
      let fileBuffer = null;
      
      if (job && job._0x2b4f === 'completed') {
        fileBuffer = await getColabOneClickResult(input.jobId);
      } else {
        // Fallback to cloud job
        job = getCloudJobStatus(input.jobId);
        if (job && job.status === 'completed') {
          fileBuffer = await getCloudJobResult(input.jobId);
        } else {
          // Fallback to local job
          job = getJobStatus(input.jobId);
          if (job && job.status === 'completed') {
            fileBuffer = await getResultFile(input.jobId);
          }
        }
      }
      
      if (!job || job.status !== 'completed' || !fileBuffer) {
        throw new Error('Processing not completed or job not found');
      }

      try {
        const fileData = fileBuffer.toString('base64');
        return {
          jobId: input.jobId,
          filename: 'result.mp4',
          mimeType: 'video/mp4',
          fileData,
        };
      } catch (error) {
        console.error('Download result error:', error);
        throw new Error('Failed to download result');
      }
    }),

  // Get processing instructions
  getInstructions: publicProcedure.mutation(async () => {
    return {
      title: 'FaceFusion v3.6.1 ローカル処理ガイド',
      steps: [
        {
          step: 1,
          title: 'ファイルをアップロード',
          description: 'ソース画像とターゲット動画をWebUIにアップロードします',
        },
        {
          step: 2,
          title: 'ローカルスクリプトをダウンロード',
          description: 'facefusion_local_processor.py をダウンロードして実行します',
        },
        {
          step: 3,
          title: 'ローカルマシンで処理実行',
          description: 'あなたのGTX 1650 + 48GB RAMで高速処理を実行します',
        },
        {
          step: 4,
          title: '結果をアップロード',
          description: '処理済み動画をWebUIにアップロードします',
        },
        {
          step: 5,
          title: 'ダウンロード',
          description: '完成した顔入れ替え動画をダウンロードします',
        },
      ],
      cloudOptions: [
        {
          name: 'Google Colab',
          description: '無料のクラウドGPU環境',
          url: 'https://colab.research.google.com',
        },
        {
          name: 'Runpod',
          description: '安価なGPUレンタルサービス',
          url: 'https://www.runpod.io',
        },
      ],
    };
  }),


  // Test endpoint for automated testing
  testAutoUploadAndProcess: publicProcedure
    .input(
      z.object({
        sourceImagePath: z.string().optional(),
        targetVideoPath: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const sourcePath = input.sourceImagePath || '/home/ubuntu/upload/1000016929.jpg';
        const targetPath = input.targetVideoPath || '/home/ubuntu/upload/1000020149.mp4';

        // Read files
        const sourceBuffer = await fs.readFile(sourcePath);
        const targetBuffer = await fs.readFile(targetPath);

        // Upload source image
        const sourceFileId = generateFileId();
        const sourceFilePath = path.join(UPLOAD_DIR, `${sourceFileId}-source-test.jpg`);
        await ensureUploadDir();
        await fs.writeFile(sourceFilePath, sourceBuffer);
        fileMetadata.set(sourceFileId, {
          id: sourceFileId,
          filename: 'test-source.jpg',
          type: 'source',
          mimeType: 'image/jpeg',
          filePath: sourceFilePath,
          size: sourceBuffer.length,
          uploadedAt: new Date(),
          status: 'uploaded',
        });

        // Upload target video
        const targetFileId = generateFileId();
        const targetFilePath = path.join(UPLOAD_DIR, `${targetFileId}-target-test.mp4`);
        await fs.writeFile(targetFilePath, targetBuffer);
        fileMetadata.set(targetFileId, {
          id: targetFileId,
          filename: 'test-target.mp4',
          type: 'target',
          mimeType: 'video/mp4',
          filePath: targetFilePath,
          size: targetBuffer.length,
          uploadedAt: new Date(),
          status: 'uploaded',
        });

        // Start processing
        const jobId = generateFileId();
        const sourceImageBase64 = sourceBuffer.toString('base64');
        const targetVideoBase64 = targetBuffer.toString('base64');

        const colabResult = await createColabNotebookAuto(
          process.env.GOOGLE_COLAB_CLIENT_ID || '',
          process.env.GOOGLE_COLAB_CLIENT_SECRET || '',
          process.env.GOOGLE_COLAB_REDIRECT_URI || '',
          jobId,
          sourceImageBase64,
          targetVideoBase64
        );

        // Store job metadata
        fileMetadata.set(jobId, {
          id: jobId,
          type: 'job',
          status: 'processing',
          sourceFileId,
          targetFileId,
          colabNotebookId: colabResult.notebookId,
          colabUrl: colabResult.colabUrl,
          createdAt: new Date(),
        });

        return {
          success: true,
          sourceFileId,
          targetFileId,
          jobId,
          colabUrl: colabResult.colabUrl,
          message: 'Test files uploaded and Colab processing started',
        };
      } catch (error) {
        console.error('Test auto upload and process error:', error);
        throw new Error(`Failed to test auto upload and process: ${error}`);
      }
    }),
});
