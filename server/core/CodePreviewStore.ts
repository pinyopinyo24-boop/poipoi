import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { CodeChange } from './PoipoiCodeAgent';

const root = path.resolve(process.cwd(), 'data', 'code-previews');
const schema = z.object({
  id: z.string().uuid(), userId: z.string(), expires: z.number(), sessionId: z.string().optional(),
  status: z.enum(['pending', 'applying', 'applied', 'failed', 'rejected']),
  changes: z.array(z.object({
    path: z.string(), content: z.string(), baseHash: z.string().nullable(),
    previousContent: z.string().optional(),
  })).min(1).max(5),
});
export type CodePreview = z.infer<typeof schema>;
function directory(userId: string) {
  return path.join(root, createHash('sha256').update(userId).digest('hex'));
}
function location(userId: string, id: string) {
  return path.join(directory(userId), z.string().uuid().parse(id) + '.json');
}
export async function saveCodePreview(preview: CodePreview) {
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
export async function listCodePreviews(userId: string) {
  const names = await fs.readdir(directory(userId)).catch(error => {
    if (error.code === 'ENOENT') return [] as string[];
    throw error;
  });
  const previews: CodePreview[] = [];
  for (const name of names.filter(name => /^[0-9a-f-]{36}\.json$/.test(name))) {
    const preview = await readCodePreview(userId, name.slice(0, -5));
    if (preview.status === 'pending' && preview.expires > Date.now()) previews.push(preview);
  }
  return previews;
}
export function describeCodePreview(preview: CodePreview) {
  return {
    previewId: preview.id, expiresInSeconds: Math.max(0, Math.floor((preview.expires - Date.now()) / 1000)),
    status: preview.status, applied: preview.status === 'applied', tested: false,
    changes: preview.changes.map(change => ({ ...change,
      operation: change.baseHash === null ? 'create' as const : 'modify' as const,
      proposedHash: createHash('sha256').update(change.content).digest('hex'),
    })),
  };
}

// Reserve synchronously before any I/O; two requests cannot apply the same preview.
const reservations = new Set<string>();
export async function reserveCodePreview(userId: string, id: string) {
  const key = location(userId, id);
  if (reservations.has(key)) throw new Error('コード変更を適用中です');
  reservations.add(key);
  try {
    const preview = await readCodePreview(userId, id);
    if (preview.status !== 'pending' || preview.expires <= Date.now()) throw new Error('Preview expired or already used');
    preview.status = 'applying';
    await saveCodePreview(preview);
    return preview;
  } finally { reservations.delete(key); }
}
