import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { createColabNotebookAuto } from './_0x1a2b3c4d';
import { FaceSwapEngine } from './_core/faceSwapEngine';
import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';

// Storage directory for uploaded files
const UPLOAD_DIR = path.join(os.tmpdir(), 'facefusion-hybrid-uploads');
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 64 * 1024 * 1024;
const MAX_RESULT_BYTES = 64 * 1024 * 1024;

type HybridFileType = 'source' | 'target' | 'result' | 'job';
interface HybridFileMetadata {
  id: string;
  ownerId: string;
  type: HybridFileType;
  filename?: string;
  mimeType?: string;
  filePath?: string;
  size?: number;
  uploadedAt?: Date;
  status: string;
  progress?: number;
  error?: string;
  provider?: 'local' | 'colab';
  completedAt?: Date;
  sourceFileId?: string;
  targetFileId?: string;
  colabNotebookId?: string;
  colabUrl?: string;
  callbackTokenHash?: string;
  resultFileId?: string;
  createdAt?: Date;
}

function getUserId(ctx: { user: { id: string | number } }): string {
  return String(ctx.user.id);
}

function decodeUpload(data: string, maxBytes: number): Buffer {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid base64 upload' });
  }
  const buffer = Buffer.from(data, 'base64');
  if (!buffer.length || buffer.length > maxBytes || buffer.toString('base64') !== data) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: `Upload must be between 1 byte and ${maxBytes} bytes` });
  }
  return buffer;
}

function getSafeUploadName(filename: string, allowedExtensions: readonly string[]): { name: string; extension: string } {
  const name = path.posix.basename(filename.replace(/\\/g, '/')).trim();
  const extension = path.extname(name).toLowerCase();
  if (!name || name.length > 255 || name === '.' || name === '..' || !allowedExtensions.includes(extension)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unsupported or invalid filename' });
  }
  return { name, extension };
}

function assertMimeType(extension: string, mimeType: string): void {
  const allowedMimeTypes: Record<string, string[]> = {
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.webp': ['image/webp'],
    '.mp4': ['video/mp4'],
    '.mov': ['video/quicktime'],
    '.webm': ['video/webm'],
    '.mkv': ['video/x-matroska'],
    '.avi': ['video/x-msvideo', 'video/avi'],
  };
  if (!allowedMimeTypes[extension]?.includes(mimeType.toLowerCase())) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'File extension and MIME type do not match' });
  }
}

function getOwnedFile(userId: string, fileId: string, expectedType?: HybridFileType): HybridFileMetadata {
  const file = fileMetadata.get(fileId);
  if (!file || file.ownerId !== userId || (expectedType && file.type !== expectedType)) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
  }
  return file;
}

function getUploadInput() {
  return z.object({
    filename: z.string().min(1).max(255),
    fileData: z.string(),
    mimeType: z.string().min(1).max(100),
  });
}

function hashCallbackToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

function hasValidCallbackToken(job: HybridFileMetadata, token: string): boolean {
  if (!job.callbackTokenHash) return false;
  const expected = Buffer.from(job.callbackTokenHash, 'hex');
  const actual = hashCallbackToken(token);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Ensure upload directory exists
async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true, mode: 0o700 });
}

// File metadata storage (in-memory for now, can be moved to DB)
const fileMetadata = new Map<string, HybridFileMetadata>();
const localFaceSwapEngines = new Map<string, FaceSwapEngine>();

function getLocalFaceSwapEngine(userId: string): FaceSwapEngine {
  let engine = localFaceSwapEngines.get(userId);
  if (!engine) {
    engine = new FaceSwapEngine();
    localFaceSwapEngines.set(userId, engine);
  }
  return engine;
}

// Generate unique file ID
function generateFileId(): string {
  return randomUUID();
}

export const facefusionHybridRouter = router({
  // Upload source image
  uploadSourceImage: protectedProcedure
    .input(getUploadInput().extend({ fileData: z.string().max(Math.ceil(MAX_SOURCE_BYTES / 3) * 4) }))
    .mutation(async ({ input, ctx }) => {
      try {
        await ensureUploadDir();

        const fileId = generateFileId();
        const { name, extension } = getSafeUploadName(input.filename, ['.jpg', '.jpeg', '.png', '.webp']);
        assertMimeType(extension, input.mimeType);
        const filePath = path.join(UPLOAD_DIR, `${fileId}-source${extension}`);
        const buffer = decodeUpload(input.fileData, MAX_SOURCE_BYTES);
        await fs.writeFile(filePath, buffer, { mode: 0o600, flag: 'wx' });

        // Store metadata
        fileMetadata.set(fileId, {
          id: fileId,
          ownerId: getUserId(ctx),
          filename: name,
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
  uploadTargetVideo: protectedProcedure
    .input(getUploadInput().extend({ fileData: z.string().max(Math.ceil(MAX_VIDEO_BYTES / 3) * 4) }))
    .mutation(async ({ input, ctx }) => {
      try {
        await ensureUploadDir();

        const fileId = generateFileId();
        const { name, extension } = getSafeUploadName(input.filename, ['.mp4', '.mov', '.webm', '.mkv', '.avi']);
        assertMimeType(extension, input.mimeType);
        const filePath = path.join(UPLOAD_DIR, `${fileId}-target${extension}`);
        const buffer = decodeUpload(input.fileData, MAX_VIDEO_BYTES);
        await fs.writeFile(filePath, buffer, { mode: 0o600, flag: 'wx' });

        // Store metadata
        fileMetadata.set(fileId, {
          id: fileId,
          ownerId: getUserId(ctx),
          filename: name,
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

  // Colab callback: the one-time token grants access to one job only.
  uploadResult: publicProcedure
    .input(
      z.object({
        jobId: z.string().uuid(),
        callbackToken: z.string().uuid(),
        status: z.literal('completed'),
        result: z.string().max(Math.ceil(MAX_RESULT_BYTES / 3) * 4),
        filename: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ input }) => {
      const job = fileMetadata.get(input.jobId);
      if (!job || job.type !== 'job' || job.status !== 'processing' || !hasValidCallbackToken(job, input.callbackToken)) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
      }

      const { name, extension } = getSafeUploadName(input.filename, ['.mp4', '.webm', '.mov']);
      const buffer = decodeUpload(input.result, MAX_RESULT_BYTES);
      const fileId = generateFileId();
      const filePath = path.join(UPLOAD_DIR, `${fileId}-result${extension}`);
      job.status = 'receiving-result';
      try {
        await ensureUploadDir();
        await fs.writeFile(filePath, buffer, { mode: 0o600, flag: 'wx' });
      } catch (error) {
        job.status = 'processing';
        throw error;
      }

      fileMetadata.set(fileId, {
        id: fileId,
        ownerId: job.ownerId,
        filename: name,
        type: 'result',
        mimeType: extension === '.webm' ? 'video/webm' : extension === '.mov' ? 'video/quicktime' : 'video/mp4',
        filePath,
        size: buffer.length,
        uploadedAt: new Date(),
        status: 'completed',
        sourceFileId: job.sourceFileId,
        targetFileId: job.targetFileId,
      });
      job.status = 'completed';
      job.resultFileId = fileId;
      delete job.callbackTokenHash;

      return { success: true, fileId, message: 'Result uploaded successfully' };
    }),

  // Get uploaded files
  getUploadedFiles: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = getUserId(ctx);
    const files = Array.from(fileMetadata.values())
      .filter((file) => file.ownerId === userId && file.type !== 'job')
      .map((file) => ({
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
  getFile: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const file = getOwnedFile(getUserId(ctx), input.fileId);

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
  downloadResult: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const file = getOwnedFile(getUserId(ctx), input.fileId, 'result');
      if (!file.filePath || !file.filename || !file.mimeType) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });
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
  deleteFile: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = getUserId(ctx);
      const file = getOwnedFile(userId, input.fileId);
      if (!file.filePath) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This file cannot be deleted here' });
      if (file.type === 'source' || file.type === 'target') {
        const isInUse = Array.from(fileMetadata.values()).some(
          (job) => job.ownerId === userId && job.type === 'job' && job.status === 'processing' &&
            (job.sourceFileId === file.id || job.targetFileId === file.id)
        );
        if (isInUse) throw new TRPCError({ code: 'CONFLICT', message: 'This file is used by an active job' });
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
  startProcessing: protectedProcedure
    .input(
      z.object({
        sourceFileId: z.string(),
        targetFileId: z.string(),
        mode: z.enum(['local', 'colab']).default('local'),
        model: z.enum(['inswapper_128', 'inswapper_128_fp16']).default('inswapper_128'),
        quality: z.number().min(0).max(51).default(18),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let jobId: string | undefined;
      try {
        const ownerId = getUserId(ctx);
        const sourceFile = getOwnedFile(ownerId, input.sourceFileId, 'source');
        const targetFile = getOwnedFile(ownerId, input.targetFileId, 'target');
        if (!sourceFile.filePath || !targetFile.filePath) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Source or target file not found' });
        }
        if (input.mode === 'local' && Array.from(fileMetadata.values()).some(
          (file) => file.ownerId === ownerId && file.type === 'job' && file.provider === 'local' && file.status === 'processing'
        )) {
          throw new TRPCError({ code: 'CONFLICT', message: 'A local face-swap job is already running for this user' });
        }

        // Generate unique job ID
        jobId = generateFileId();
        const callbackToken = input.mode === 'colab' ? randomUUID() : undefined;
        const job: HybridFileMetadata = {
          id: jobId,
          ownerId,
          type: 'job',
          status: 'processing',
          progress: 0,
          provider: input.mode,
          sourceFileId: input.sourceFileId,
          targetFileId: input.targetFileId,
          callbackTokenHash: callbackToken ? hashCallbackToken(callbackToken).toString('hex') : undefined,
          createdAt: new Date(),
        };
        fileMetadata.set(jobId, job);

        if (input.mode === 'local') {
          const engine = getLocalFaceSwapEngine(ownerId);
          await engine.initialize();
          const outputPath = path.join(UPLOAD_DIR, `${jobId}-result.mp4`);
          const engineQuality = input.quality <= 17 ? 'high' : input.quality <= 28 ? 'medium' : 'low';
          void engine.processFaceSwap({
            sourceImagePath: sourceFile.filePath,
            targetVideoPath: targetFile.filePath,
            outputPath,
            quality: engineQuality,
            gpuAcceleration: false,
          }).then(async (resultPath) => {
            const stat = await fs.stat(resultPath);
            if (stat.size === 0 || stat.size > MAX_RESULT_BYTES) {
              await fs.rm(resultPath, { force: true });
              throw new Error(`Processed video exceeds the ${MAX_RESULT_BYTES}-byte result limit`);
            }
            const resultFileId = generateFileId();
            fileMetadata.set(resultFileId, {
              id: resultFileId,
              ownerId,
              filename: 'face-swap-result.mp4',
              type: 'result',
              mimeType: 'video/mp4',
              filePath: resultPath,
              size: stat.size,
              uploadedAt: new Date(),
              status: 'completed',
              sourceFileId: input.sourceFileId,
              targetFileId: input.targetFileId,
            });
            job.resultFileId = resultFileId;
            job.status = 'completed';
            job.progress = 100;
            job.completedAt = new Date();
          }).catch(async (error: unknown) => {
            await fs.rm(outputPath, { force: true }).catch(() => undefined);
            job.status = 'failed';
            job.error = error instanceof Error ? error.message : String(error);
          });

          return { success: true, jobId, message: 'Local face-swap processing started.' };
        }

        if (!callbackToken || !process.env.GOOGLE_COLAB_CLIENT_ID || !process.env.GOOGLE_COLAB_CLIENT_SECRET || !process.env.GOOGLE_COLAB_REDIRECT_URI || !process.env.GOOGLE_COLAB_REFRESH_TOKEN) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Google Colab OAuth credentials are not configured' });
        }
        const sourceImageBase64 = (await fs.readFile(sourceFile.filePath)).toString('base64');
        const targetVideoBase64 = (await fs.readFile(targetFile.filePath)).toString('base64');
        const colabResult = await createColabNotebookAuto(
          process.env.GOOGLE_COLAB_CLIENT_ID,
          process.env.GOOGLE_COLAB_CLIENT_SECRET,
          process.env.GOOGLE_COLAB_REDIRECT_URI,
          jobId,
          sourceImageBase64,
          targetVideoBase64,
          callbackToken,
          input.model,
          input.quality
        );
        job.colabNotebookId = colabResult.notebookId;
        job.colabUrl = colabResult.colabUrl;

        return {
          success: true,
          jobId,
          colabUrl: colabResult.colabUrl,
          message: 'Colab notebook created. Open it and run the processing cell to complete the job.',
        };
      } catch (error) {
        if (jobId) fileMetadata.delete(jobId);
        console.error('Start processing error:', error);
        if (error instanceof TRPCError) throw error;
        throw new Error('Failed to start processing');
      }
    }),

  // Get processing status
  getProcessingStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const ownedJob = getOwnedFile(getUserId(ctx), input.jobId, 'job');
      if (ownedJob.provider === 'local' && ownedJob.status === 'processing') {
        const progress = localFaceSwapEngines.get(ownedJob.ownerId)?.getProgress();
        if (progress) {
          ownedJob.progress = progress.progress;
          if (progress.status === 'error') {
            ownedJob.status = 'failed';
            ownedJob.error = progress.error;
          }
        }
      }
      return {
        jobId: ownedJob.id,
        status: ownedJob.status,
        progress: ownedJob.progress ?? (ownedJob.status === 'completed' ? 100 : 0),
        startedAt: ownedJob.createdAt,
        completedAt: ownedJob.completedAt,
        error: ownedJob.error,
      };
    }),

  // Download processing result
  downloadProcessingResult: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const ownedJob = getOwnedFile(getUserId(ctx), input.jobId, 'job');
      if (ownedJob.status !== 'completed' || !ownedJob.resultFileId) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Processing is not complete' });
      }
      const result = getOwnedFile(getUserId(ctx), ownedJob.resultFileId, 'result');
      if (!result.filePath || !result.filename || !result.mimeType) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Result not found' });
      }
      const resultBuffer = await fs.readFile(result.filePath);
      return { jobId: input.jobId, filename: result.filename, mimeType: result.mimeType, fileData: resultBuffer.toString('base64') };
    }),

  // Get processing instructions
  getInstructions: publicProcedure.mutation(async () => {
    return {
      title: '動画の顔入れ替え処理',
      steps: [
        {
          step: 1,
          title: 'ファイルをアップロード',
          description: 'ソース画像とターゲット動画をPoiPoiにアップロードします',
        },
        {
          step: 2,
          title: '処理方法を選択',
          description: 'PoiPoiサーバーでローカル処理するか、Google Colab用ノートブックを作成します',
        },
        {
          step: 3,
          title: '処理を実行',
          description: 'ローカル処理はPoiPoiサーバー上で実行されます。Colabはノートブックを開いて実行してください',
        },
        {
          step: 4,
          title: '処理済み動画をダウンロード',
          description: '処理が完了した動画をPoiPoiからダウンロードします',
        },
      ],
      cloudOptions: [
        {
          name: 'Google Colab',
          description: '無料のクラウドGPU環境',
          url: 'https://colab.research.google.com',
        },
      ],
    };
  }),
});
