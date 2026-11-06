import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { CodeChange } from './PoipoiCodeAgent';

const root = path.resolve(process.cwd(), 'data', 'code-previews');
const schema = z.object({
  id: z.string().uuid(), userId: z.string(), expires: z.number(), sessionId: z.string().optional(),
  status: z.enum(['generating', 'pending', 'applying', 'applied', 'failed', 'rejected']),
  updatedAt: z.number().optional(),
  generation: z.object({
    jobId: z.string().uuid(), startedAt: z.number(), finishedAt: z.number().optional(),
    workerPid: z.number().int().positive().optional(), phase: z.string().max(100),
    sourceTask: z.string().min(1).max(65000), request: z.string().min(1).max(60000),
    replyTo: z.string().max(200).optional(), error: z.string().max(4000).optional(),
    reviewWarning: z.string().max(1000).optional(),
    typeChecked: z.boolean().optional(),
  }).optional(),
  application: z.object({
    startedAt: z.number(), finishedAt: z.number().optional(),
    phase: z.string().max(100),
    jobId: z.string().uuid().optional(), workerPid: z.number().int().positive().optional(),
    typeCheckRequested: z.boolean().optional(), resumeWritten: z.boolean().optional(),
    typeChecked: z.boolean().optional(), committed: z.boolean().optional(),
    error: z.string().max(4000).optional(),
  }).optional(),
  changes: z.array(z.object({
    path: z.string(), content: z.string(), baseHash: z.string().nullable(),
    previousContent: z.string().optional(),
  })).max(10),
}).superRefine((preview, ctx) => {
  if (!['generating', 'failed'].includes(preview.status) && !preview.changes.length)
    ctx.addIssue({ code: 'custom', path: ['changes'], message: 'A completed proposal requires source changes' });
  if (preview.status === 'generating' && !preview.generation)
    ctx.addIssue({ code: 'custom', path: ['generation'], message: 'Generation job is required' });
});
export type CodePreview = z.infer<typeof schema>;
function directory(userId: string) {
  return path.join(root, createHash('sha256').update(userId).digest('hex'));
}
function location(userId: string, id: string) {
  return path.join(directory(userId), z.string().uuid().parse(id) + '.json');
}
export async function saveCodePreview(preview: CodePreview) {
  preview.updatedAt = Date.now();
  const target = location(preview.userId, preview.id);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = target + '.' + randomUUID() + '.tmp';
  try {
    await fs.writeFile(temporary, JSON.stringify(schema.parse(preview)), { mode: 0o600 });
    await fs.rename(temporary, target);
  } finally { await fs.rm(temporary, { force: true }); }
}
export async function createCodePreview(userId: string, changes: CodeChange[], sessionId?: string) {
  const preview = schema.parse({ id: randomUUID(), userId, changes, sessionId,
    expires: Date.now() + 24 * 3600000, status: 'pending' });
  await saveCodePreview(preview);
  return preview;
}
export async function readCodePreview(userId: string, id: string) {
  const preview = schema.parse(JSON.parse(await fs.readFile(location(userId, id), 'utf8')));
  if (preview.userId !== userId) throw new Error('Preview ownership mismatch');
  return preview;
}
export async function listCodePreviews(userId: string, options: { includeHistory?: boolean } = {}) {
  const names = await fs.readdir(directory(userId)).catch(error => {
    if (error.code === 'ENOENT') return [] as string[];
    throw error;
  });
  const previews: CodePreview[] = [];
  for (const name of names.filter(name => /^[0-9a-f-]{36}\.json$/.test(name))) {
    let preview = await readCodePreview(userId, name.slice(0, -5));
    if (preview.status === 'generating' && preview.generation) {
      const generation = preview.generation;
      let gone = false;
      if (generation.workerPid) {
        try { process.kill(generation.workerPid, 0); }
        catch (error) { gone = (error as NodeJS.ErrnoException).code !== 'EPERM'; }
      } else gone = generation.startedAt < Date.now() - process.uptime() * 1000 && Date.now() - generation.startedAt > 30000;
      if (gone) {
        preview = await readCodePreview(userId, preview.id);
        if (preview.status === 'generating' && preview.generation?.jobId === generation.jobId) {
          preview.status = 'failed';
          preview.generation = { ...preview.generation, phase: '中断', finishedAt: Date.now(), error: '変更案の生成プロセスが終了しました。変更は適用していません。自動再送はしていません。' };
          await saveCodePreview(preview);
        }
      }
    }
    if ((preview.status === 'pending' && preview.expires > Date.now()) ||
        (options.includeHistory && (preview.status === 'applying' || preview.status === 'generating' ||
          (preview.status !== 'pending' && (preview.updatedAt ?? preview.expires) > Date.now() - 24 * 3600000)))) {
      previews.push(preview);
    }
  }
  if (!options.includeHistory) return previews;
  previews.sort((a, b) => (b.updatedAt ?? b.expires) - (a.updatedAt ?? a.expires));
  const active = previews.filter(preview => preview.status === 'pending' || preview.status === 'applying' || preview.status === 'generating');
  const history = previews.filter(preview => preview.status !== 'pending' && preview.status !== 'applying' && preview.status !== 'generating').slice(0, 20);
  return [...active, ...history];
}
export function isCodeApprovalInterrupted(preview: CodePreview) {
  if (preview.status !== 'applying') return false;
  if (preview.application?.workerPid) {
    try { process.kill(preview.application.workerPid, 0); return false; }
    catch (error) { return (error as NodeJS.ErrnoException).code !== 'EPERM'; }
  }
  return (preview.application?.startedAt ?? preview.updatedAt ?? Infinity) < Date.now() - process.uptime() * 1000;
}
export function canResumeCodeApproval(preview: CodePreview) {
  return isCodeApprovalInterrupted(preview) && preview.application?.phase === 'type-checking' &&
    preview.changes.length === 1 && preview.changes[0].baseHash === null;
}
export function describeCodePreview(preview: CodePreview) {
  return {
    previewId: preview.id, expiresInSeconds: Math.max(0, Math.floor((preview.expires - Date.now()) / 1000)),
    status: preview.status, applied: preview.status === 'applied', tested: false,
    updatedAt: preview.updatedAt, application: preview.application,
    generation: preview.generation ? { startedAt: preview.generation.startedAt, finishedAt: preview.generation.finishedAt,
      phase: preview.generation.phase, request: preview.generation.request, error: preview.generation.error,
      reviewWarning: preview.generation.reviewWarning, typeChecked: preview.generation.typeChecked } : undefined,
    interrupted: isCodeApprovalInterrupted(preview), canResume: canResumeCodeApproval(preview),
    changes: preview.changes.map(change => ({ ...change,
      operation: change.baseHash === null ? 'create' as const : 'modify' as const,
      proposedHash: createHash('sha256').update(change.content).digest('hex'),
    })),
  };
}

// Serialize approval reservations across server processes, not only within one
// process. A leftover lock after a crash deliberately blocks reapproval until
// the interrupted application has been inspected; never retry it automatically.
const reservations = new Set<string>();
async function reserveExclusively<T>(userId: string, id: string, action: () => Promise<T>): Promise<T> {
  const key = location(userId, id);
  if (reservations.has(key)) throw new Error('コード変更を処理中です');
  reservations.add(key);
  let lock: Awaited<ReturnType<typeof fs.open>> | undefined;
  const lockFile = key + '.reservation.lock';
  try {
    try {
      lock = await fs.open(lockFile, 'wx', 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST')
        throw new Error('別プロセスが承認を処理中か、中断した承認ロックの確認が必要です');
      throw error;
    }
    return await action();
  } finally {
    try {
      if (lock) {
        try {
          await lock.close();
        } finally {
          await fs.rm(lockFile, { force: true });
        }
      }
    } finally {
      reservations.delete(key);
    }
  }
}
export async function reserveCodePreview(userId: string, id: string) {
  return reserveExclusively(userId, id, async () => {
    const preview = await readCodePreview(userId, id);
    if (preview.status !== 'pending' || preview.expires <= Date.now()) throw new Error('Preview expired or already used');
    preview.status = 'applying';
    await saveCodePreview(preview);
    return preview;
  });
}

// Explicit continuation is limited to an interrupted, already-written new file.
export async function reserveInterruptedCodePreview(userId: string, id: string) {
  return reserveExclusively(userId, id, async () => {
    const preview = await readCodePreview(userId, id);
    if (!canResumeCodeApproval(preview)) throw new Error('安全に続行できる中断状態ではありません');
    preview.application = { startedAt: Date.now(), phase: 'preparing', typeCheckRequested: true, resumeWritten: true };
    await saveCodePreview(preview);
    return preview;
  });
}
