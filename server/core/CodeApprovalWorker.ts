import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PoipoiCodeAgent, type CodeTaskResult } from './PoipoiCodeAgent';
import { readCodePreview, saveCodePreview, type CodePreview } from './CodePreviewStore';

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const alive = (pid: number) => {
  try { process.kill(pid, 0); return true; }
  catch (error) { return (error as NodeJS.ErrnoException).code === 'EPERM'; }
};

// Across server restarts, only one process may write and commit project source.
export function lockProject(root: string, jobId: string, kind: 'application' | 'generation' = 'application') {
  const directory = path.join(root, 'data', 'code-previews');
  mkdirSync(directory, { recursive: true });
  const file = path.join(directory, '.application.lock');
  // Code generation and code application must not overlap.
  // Both operations share the same exclusive project lock.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const handle = openSync(file, 'wx', 0o600);
      writeFileSync(handle, JSON.stringify({ pid: process.pid, jobId }));
      return () => {
        closeSync(handle);
        if (JSON.parse(readFileSync(file, 'utf8')).jobId === jobId) unlinkSync(file);
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      try {
        const previous = JSON.parse(readFileSync(file, 'utf8'));
        if (!Number.isInteger(previous.pid) || alive(previous.pid)) break;
        renameSync(file, file + '.interrupted-' + randomUUID());
      } catch { break; }
    }
  }
  throw new Error((kind === 'generation' ? '別の変更案の生成' : '別の承認処理') + 'が実行中、またはロックの確認が必要です。再実行していません。');
}

export async function runCodeApprovalWorker(userId: string, id: string, jobId: string) {
  const preview = await readCodePreview(userId, id);
  if (preview.status !== 'applying' || preview.application?.jobId !== jobId)
    throw new Error('Approval job does not match the reserved preview');
  const application = { ...preview.application, workerPid: process.pid };
  preview.application = application;
  await saveCodePreview(preview);
  let release: (() => void) | undefined;
  try {
    release = lockProject(process.cwd(), jobId);
    const result = await PoipoiCodeAgent.getInstance().applyAndTest(preview.changes, {
      typeCheck: application.typeCheckRequested === true,
      resumeWritten: application.resumeWritten === true,
      onProgress: async phase => {
        preview.application = { ...application, phase };
        await saveCodePreview(preview);
      },
    });
    preview.status = result.success ? 'applied' : 'failed';
    preview.application = { ...application, finishedAt: Date.now(),
      phase: result.success ? 'completed' : 'failed', typeChecked: result.typeChecked === true,
      committed: result.committed === true, error: result.error?.slice(0, 4000) };
    await saveCodePreview(preview);
  } catch (error) {
    preview.status = 'failed';
    preview.application = { ...application, finishedAt: Date.now(), phase: 'interrupted',
      error: ('処理が中断しました。完了状態は未確認です: ' + String(error)).slice(0, 4000) };
    await saveCodePreview(preview);
  } finally { release?.(); }
}

export async function applyCodePreviewInWorker(preview: CodePreview, typeCheck: boolean, resumeWritten = false): Promise<CodeTaskResult> {
  const root = process.cwd();
  const jobId = randomUUID();
  preview.application = { startedAt: Date.now(), phase: 'preparing', jobId,
    typeCheckRequested: typeCheck, resumeWritten };
  await saveCodePreview(preview);
  const env = { ...process.env };
  // Do not inherit the watched server's dependency-reporting/IPC channel.
  delete env.NODE_CHANNEL_FD;
  delete env.NODE_CHANNEL_SERIALIZATION_MODE;
  delete env.NODE_WATCH_REPORT_DEPENDENCIES;
  const log = path.join(root, 'data', 'code-previews',
    createHash('sha256').update(preview.userId).digest('hex'), preview.id + '.worker.log');
  const handle = openSync(log, 'a', 0o600);
  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('../../scripts/code-approval-worker.mjs', import.meta.url)),
      preview.userId, preview.id, jobId], { cwd: root, env, detached: true,
      windowsHide: true, stdio: ['ignore', handle, handle] });
    await new Promise<void>((resolve, reject) => {
      child.once('spawn', resolve);
      child.once('error', reject);
    });
    child.unref();
  } catch (error) {
    preview.status = 'failed';
    preview.application = { ...preview.application, phase: 'failed', finishedAt: Date.now(), error: String(error).slice(0, 4000) };
    await saveCodePreview(preview);
    throw error;
  } finally { closeSync(handle); }

  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    const current = await readCodePreview(preview.userId, preview.id);
    if (current.application?.jobId !== jobId) throw new Error('Approval job changed');
    if (current.status !== 'applying') {
      Object.assign(preview, current);
      return { success: current.status === 'applied', changes: current.status === 'applied' ? current.changes : [],
        tested: false, committed: current.application?.committed === true,
        typeChecked: current.application?.typeChecked === true, error: current.application?.error };
    }
    if (child.exitCode !== null || child.signalCode !== null) {
      // Recheck the persisted result after worker exit.
      await pause(500);
      const settled = await readCodePreview(preview.userId, preview.id);
      if (settled.application?.jobId !== jobId)
        throw new Error('Approval job changed');
      if (settled.status !== 'applying') continue;
      current.status = 'failed';
      current.application = { ...current.application!, phase: 'interrupted', finishedAt: Date.now(),
        error: '承認作業プロセスが終了しました。完了状態は未確認です。自動再実行はしていません。' };
      await saveCodePreview(current);
      continue;
    }
    await pause(250);
  }
  throw new Error('承認作業の完了をまだ確認できません。処理状況を確認し、再承認しないでください。');
}
