import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { adminProcedure, router } from './_core/trpc';

const MAX_TRANSFER_BYTES = 20 * 1024 * 1024;
const TRANSFER_TIMEOUT_MS = 120_000;
type Transfer = {
  id: string;
  ownerId: number;
  direction: 'upload' | 'download';
  status: 'running' | 'completed' | 'failed';
  bytesTransferred: number;
  totalBytes: number;
  startedAt: number;
  completedAt?: number;
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  resultBase64?: string;
  error?: string;
};

const transfers = new Map<string, Transfer>();

function driveClient() {
  const { GOOGLE_COLAB_CLIENT_ID, GOOGLE_COLAB_CLIENT_SECRET, GOOGLE_COLAB_REDIRECT_URI, GOOGLE_COLAB_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_COLAB_CLIENT_ID || !GOOGLE_COLAB_CLIENT_SECRET || !GOOGLE_COLAB_REDIRECT_URI || !GOOGLE_COLAB_REFRESH_TOKEN) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Google Drive OAuth is not configured' });
  }
  const oauth = new OAuth2Client(GOOGLE_COLAB_CLIENT_ID, GOOGLE_COLAB_CLIENT_SECRET, GOOGLE_COLAB_REDIRECT_URI);
  oauth.setCredentials({ refresh_token: GOOGLE_COLAB_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth: oauth as any });
}

function startTransfer(ownerId: number, direction: Transfer['direction'], totalBytes: number): Transfer {
  const now = Date.now();
  for (const [id, transfer] of transfers) {
    if (transfer.completedAt && now - transfer.completedAt > 10 * 60 * 1000) transfers.delete(id);
  }
  if ([...transfers.values()].filter((transfer) => transfer.status === 'running').length >= 3) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Google Drive transfers are busy; retry after one completes' });
  }
  while (transfers.size >= 8) {
    const oldest = [...transfers.values()].filter((transfer) => transfer.completedAt).sort((a, b) => a.completedAt! - b.completedAt!)[0];
    if (!oldest) throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Google Drive transfer storage is full' });
    transfers.delete(oldest.id);
  }
  const transfer: Transfer = {
    id: `drive_${randomUUID()}`,
    ownerId, direction, status: 'running', bytesTransferred: 0, totalBytes, startedAt: now,
  };
  transfers.set(transfer.id, transfer);
  return transfer;
}

function failTransfer(transfer: Transfer, error: unknown) {
  transfer.status = 'failed';
  transfer.error = error instanceof Error ? error.message.slice(0, 500) : 'Google Drive transfer failed';
  transfer.completedAt = Date.now();
}

export const driveTransferRouter = router({
  listFiles: adminProcedure
    .input(z.object({ pageToken: z.string().max(2048).optional(), pageSize: z.number().int().min(1).max(100).default(25) }).optional())
    .query(async ({ input }) => {
      const drive = driveClient();
      const response = await drive.files.list({
        pageSize: input?.pageSize ?? 25,
        pageToken: input?.pageToken,
        q: "trashed = false",
        fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime)',
        orderBy: 'modifiedTime desc',
      }, { timeout: 30_000 });
      return { files: response.data.files ?? [], nextPageToken: response.data.nextPageToken ?? null };
    }),

  startUpload: adminProcedure
    .input(z.object({
      fileName: z.string().trim().min(1).max(180),
      mimeType: z.string().regex(/^[\w.+-]+\/[\w.+-]+$/).max(120),
      fileBase64: z.string().max(Math.ceil(MAX_TRANSFER_BYTES / 3) * 4 + 256),
      parentId: z.string().min(1).max(256).optional(),
    }))
    .mutation(({ input, ctx }) => {
      const encoded = input.fileBase64.replace(/^data:[^,]+;base64,/i, '');
      if (!encoded || encoded.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'File data must be valid base64' });
      }
      const buffer = Buffer.from(encoded, 'base64');
      if (!buffer.length || buffer.length > MAX_TRANSFER_BYTES || buffer.toString('base64') !== encoded) {
        throw new TRPCError({ code: 'PAYLOAD_TOO_LARGE', message: 'Files must be between 1 byte and 20 MiB' });
      }
      const transfer = startTransfer(ctx.user.id, 'upload', buffer.length);
      void (async () => {
        try {
          const drive = driveClient();
          async function* uploadChunks() {
            for (let offset = 0; offset < buffer.length; offset += 64 * 1024) {
              const chunk = buffer.subarray(offset, Math.min(offset + 64 * 1024, buffer.length));
              transfer.bytesTransferred = Math.min(buffer.length, offset + chunk.length);
              yield chunk;
            }
          }
          const response = await drive.files.create({
            requestBody: { name: input.fileName, mimeType: input.mimeType, ...(input.parentId ? { parents: [input.parentId] } : {}) },
            media: { mimeType: input.mimeType, body: Readable.from(uploadChunks()) },
            fields: 'id,name,mimeType,size',
          }, { timeout: TRANSFER_TIMEOUT_MS, signal: AbortSignal.timeout(TRANSFER_TIMEOUT_MS), retry: false });
          if (!response.data.id) throw new Error('Google Drive did not return a file id');
          transfer.fileId = response.data.id;
          transfer.fileName = response.data.name ?? input.fileName;
          transfer.mimeType = response.data.mimeType ?? input.mimeType;
          transfer.status = 'completed';
          transfer.completedAt = Date.now();
        } catch (error) { failTransfer(transfer, error); }
      })();
      return { transferId: transfer.id, status: transfer.status, progress: 0, timeoutMs: TRANSFER_TIMEOUT_MS };
    }),

  startDownload: adminProcedure
    .input(z.object({ fileId: z.string().min(1).max(256) }))
    .mutation(async ({ input, ctx }) => {
      const drive = driveClient();
      const metadata = await drive.files.get({ fileId: input.fileId, fields: 'id,name,mimeType,size' }, { timeout: 30_000 });
      const totalBytes = Number(metadata.data.size ?? 0);
      if (!Number.isSafeInteger(totalBytes) || totalBytes <= 0 || totalBytes > MAX_TRANSFER_BYTES) {
        throw new TRPCError({ code: 'PAYLOAD_TOO_LARGE', message: 'Google Drive file must be between 1 byte and 20 MiB' });
      }
      const transfer = startTransfer(ctx.user.id, 'download', totalBytes);
      transfer.fileId = input.fileId;
      transfer.fileName = metadata.data.name ?? input.fileId;
      transfer.mimeType = metadata.data.mimeType ?? 'application/octet-stream';
      void (async () => {
        try {
          const response = await drive.files.get({ fileId: input.fileId, alt: 'media' }, {
            responseType: 'stream', timeout: TRANSFER_TIMEOUT_MS, signal: AbortSignal.timeout(TRANSFER_TIMEOUT_MS),
          }) as unknown as { data: AsyncIterable<Uint8Array> };
          const chunks: Buffer[] = [];
          for await (const chunk of response.data) {
            const bytes = Buffer.from(chunk);
            transfer.bytesTransferred += bytes.length;
            if (transfer.bytesTransferred > MAX_TRANSFER_BYTES) throw new Error('Downloaded file exceeds the 20 MiB limit');
            chunks.push(bytes);
          }
          if (transfer.bytesTransferred !== totalBytes) throw new Error('Downloaded file size did not match Drive metadata');
          transfer.resultBase64 = Buffer.concat(chunks).toString('base64');
          transfer.status = 'completed';
          transfer.completedAt = Date.now();
        } catch (error) { failTransfer(transfer, error); }
      })();
      return { transferId: transfer.id, status: transfer.status, progress: 0, timeoutMs: TRANSFER_TIMEOUT_MS };
    }),

  getTransfer: adminProcedure
    .input(z.object({ transferId: z.string().min(1).max(100) }))
    .query(({ input, ctx }) => {
      const transfer = transfers.get(input.transferId);
      if (!transfer || transfer.ownerId !== ctx.user.id) throw new TRPCError({ code: 'NOT_FOUND', message: 'Transfer not found' });
      return {
        id: transfer.id, direction: transfer.direction, status: transfer.status,
        bytesTransferred: transfer.bytesTransferred, totalBytes: transfer.totalBytes,
        progress: transfer.status === 'completed' ? 100 : Math.min(99, Math.floor(transfer.bytesTransferred / transfer.totalBytes * 100)),
        fileId: transfer.fileId, fileName: transfer.fileName, mimeType: transfer.mimeType,
        resultBase64: transfer.status === 'completed' && transfer.direction === 'download' ? transfer.resultBase64 : undefined,
        error: transfer.error, startedAt: transfer.startedAt, completedAt: transfer.completedAt,
      };
    }),
});
