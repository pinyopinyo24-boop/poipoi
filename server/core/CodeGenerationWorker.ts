import { spawn } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { openSync, closeSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PoipoiCodeAgent } from './PoipoiCodeAgent';
import { lockProject } from './CodeApprovalWorker';
import { saveCodePreview, readCodePreview, listCodePreviews, type CodePreview } from './CodePreviewStore';

export async function queueCodeGeneration(userId: string, sourceTask: string, sessionId: string, request: string, replyTo: string) {
  const active = await listCodePreviews(userId, { includeHistory: true });
  const existing = active.find(p => p.sessionId === sessionId && p.generation?.replyTo === replyTo);
  if (existing) return existing;
  if (active.filter(p => ['pending', 'generating'].includes(p.status)).length >= 20) throw new Error('Too many pending previews');
  const jobId = randomUUID();
  const preview: CodePreview = { id: randomUUID(), userId, sessionId, status: 'generating', changes: [],
    expires: Date.now() + 24 * 3600000,
    generation: { jobId, startedAt: Date.now(), phase: '生成準備中', sourceTask, request, replyTo } };
  await saveCodePreview(preview);
  const directory = path.join(process.cwd(), 'data', 'code-previews', createHash('sha256').update(userId).digest('hex'));
  const handle = openSync(path.join(directory, preview.id + '.generation.log'), 'a', 0o600);
  const env = { ...process.env };
  delete env.NODE_CHANNEL_FD;
  delete env.NODE_CHANNEL_SERIALIZATION_MODE;
  delete env.NODE_WATCH_REPORT_DEPENDENCIES;
  try {
    const child = spawn(process.execPath, ['--max-old-space-size=4096', '--import', 'tsx',
      path.join(process.cwd(), 'scripts/code-generation-worker.mjs'), userId, preview.id, jobId],
    { cwd: process.cwd(), env, detached: true, windowsHide: true, stdio: ['ignore', handle, handle] });
    await new Promise<void>((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    child.once('exit', () => { void (async () => {
      const current = await readCodePreview(userId, preview.id);
      if (current.status !== 'generating' || current.generation?.jobId !== jobId) return;
      current.status = 'failed';
      current.generation = { ...current.generation, phase: '中断', finishedAt: Date.now(),
        error: '変更案の生成プロセスが終了しました。変更は適用していません。自動再送はしていません。' };
      await saveCodePreview(current);
    })().catch(error => console.warn('[PoiPoi] Generation status unavailable:', error)); });
    child.unref();
  } catch (error) {
    preview.status = 'failed';
    preview.generation = { ...preview.generation!, phase: '生成失敗', finishedAt: Date.now(), error: String(error).slice(0, 4000) };
    await saveCodePreview(preview);
    throw error;
  } finally { closeSync(handle); }
  return preview;
}

export async function runCodeGenerationWorker(userId: string, id: string, jobId: string) {
  const preview = await readCodePreview(userId, id);
  if (preview.status !== 'generating' || preview.generation?.jobId !== jobId) throw new Error('Generation job mismatch');
  preview.generation.workerPid = process.pid;
  await saveCodePreview(preview);
  let release: (() => void) | undefined;
  try {
    release = lockProject(process.cwd(), jobId, 'generation');
    preview.changes = await PoipoiCodeAgent.getInstance().generate(preview.generation.sourceTask, userId, {
      onProgress: async phase => { preview.generation!.phase = phase; await saveCodePreview(preview); },
      onCandidate: async (changes, errors) => {
        const directory = path.join(process.cwd(), 'data', 'code-previews', createHash('sha256').update(userId).digest('hex'));
        await writeFile(path.join(directory, id + '.generation-candidate.json'),
          JSON.stringify({ jobId, createdAt: Date.now(), errors, changes }), { mode: 0o600 });
      },
    }) as CodePreview['changes'];
    if (!preview.changes.length) throw new Error('No changes generated');
    preview.status = 'pending';
    preview.expires = Date.now() + 24 * 3600000;
    preview.generation.phase = '変更案作成済み・承認待ち';
  } catch (error) {
    preview.status = 'failed';
    preview.changes = [];
    preview.generation.phase = '生成失敗';
    preview.generation.error = String(error instanceof Error ? error.message : error).slice(0, 4000);
  } finally {
    preview.generation.finishedAt = Date.now();
    try { await saveCodePreview(preview); } finally { release?.(); }
  }
}
