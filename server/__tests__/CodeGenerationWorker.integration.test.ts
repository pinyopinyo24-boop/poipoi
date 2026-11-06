import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync, readFileSync, existsSync, symlinkSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';

const fixture = vi.hoisted(() => {
  const source = process.cwd();
  const root = source + '/node_modules/.cache/generation-worker-' + Date.now();
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  return { source, root };
});
import { queueCodeGeneration } from '../core/CodeGenerationWorker';
import { readCodePreview, listCodePreviews } from '../core/CodePreviewStore';
import { streamingRouter } from '../routers.streaming';
import { unifiedToolsRouter } from '../routers/unifiedTools';
import { getSharedChatRepository } from '../repositories/ChatRepository';

let target = '', failModel = false, invalidReview = false;
let release = () => {};
let gate: Promise<void>;
const userId = '881';
const context = { user: { id: 881, role: 'admin', name: 'Worker fixture' }, req: { headers: {} }, res: {} } as any;
const previousURL = process.env.LOCAL_AI_URL;
const server = createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
  await gate;
  res.setHeader('content-type', 'application/json');
  if (failModel) { res.writeHead(500); res.end('{"error":"controlled model failure"}'); return; }
  const content = body.format?.properties?.accepted
    ? JSON.stringify(invalidReview ? { accepted: false, issues: [{ path: 'server/core/Missing.ts',
      requirement: 'missing', problem: 'unsupported', evidence: 'missing' }] } : { accepted: true, issues: [] })
    : JSON.stringify({ changes: [{ path: target, content: 'export const generated = true;\n' }] });
  res.end(JSON.stringify({ message: { role: 'assistant', content }, done: true }));
});
const task = () => 'Create exactly one NEW standalone file ' + target + '. Reference server/core/Reference.ts only.';

beforeAll(async () => {
  mkdirSync(fixture.root + '/server/core', { recursive: true });
  writeFileSync(fixture.root + '/package.json', '{"type":"module","dependencies":{}}');
  writeFileSync(fixture.root + '/server/core/Reference.ts', 'export const reference = true;');
  symlinkSync(fixture.source + '/scripts', fixture.root + '/scripts', 'junction');
  symlinkSync(fixture.source + '/node_modules', fixture.root + '/node_modules', 'junction');
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  process.env.LOCAL_AI_URL = 'http://127.0.0.1:' + (server.address() as any).port;
});
beforeEach(() => {
  failModel = false;
  invalidReview = false;
  gate = new Promise<void>(resolve => { release = resolve; });
  target = 'server/core/Generated_' + randomUUID().replaceAll('-', '') + '.ts';
});
afterAll(async () => {
  release();
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
  if (previousURL === undefined) delete process.env.LOCAL_AI_URL;
  else process.env.LOCAL_AI_URL = previousURL;
  vi.restoreAllMocks();
  rmSync(fixture.root, { recursive: true, force: true });
});

describe('detached generation with a controlled local HTTP model', () => {
  it('returns an acceptance response before generation finishes, then reports a real stored preview once', async () => {
    const sessionId = randomUUID();
    const message = target + 'を新規作成する変更案を生成して。参考はserver/core/Reference.tsだけ。';
    const response = await streamingRouter.createCaller(context).chat({ message, messageId: randomUUID(), conversationId: sessionId });
    expect(response.fullText).toContain('作成を受け付けました');
    const id = (response.metadata as any).codePreview.previewId;
    expect((await readCodePreview(userId, id)).status).toBe('generating');
    expect(existsSync(fixture.root + '/' + target)).toBe(false);
    release();
    const preview = await waitFor(id, p => p.status !== 'generating');
    expect(preview.status).toBe('pending');
    expect(preview.changes[0].path).toBe(target);
    const diagnostic = JSON.parse(readFileSync(fixture.root + '/data/code-previews/' +
      createHash('sha256').update(userId).digest('hex') + '/' + id + '.generation-candidate.json', 'utf8'));
    expect(diagnostic.changes).toEqual(preview.changes);
    expect(diagnostic.errors).toEqual([]);
    const responseLog = JSON.parse(readFileSync(fixture.root + '/data/code-previews/' +
      createHash('sha256').update(userId).digest('hex') + '/' + id + '.generation-response.json', 'utf8'));
    expect(responseLog.jobId).toBe(preview.generation?.jobId);
    expect(responseLog.content).toBeTruthy();
    expect(responseLog.finishReason).toBe('stop');
    expect(existsSync(fixture.root + '/' + target)).toBe(false);
    await unifiedToolsRouter.createCaller(context).listCodePreviews({ accountId: userId, includeHistory: true });
    await unifiedToolsRouter.createCaller(context).listCodePreviews({ accountId: userId, includeHistory: true });
    const messages = await getSharedChatRepository().getMessages(sessionId, 100);
    expect(messages.filter(m => m.id === 'code-generation-' + id)).toHaveLength(1);
  });

  it('finishes generation after the requesting parent process exits', async () => {
    const code = `const {queueCodeGeneration}=await import(${JSON.stringify(fixture.source + '/server/core/CodeGenerationWorker.ts')});
      const p=await queueCodeGeneration(${JSON.stringify(userId)},${JSON.stringify(task())},'detached',${JSON.stringify(task())},'parent-request');
      console.log(p.id);`;
    const parent = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', code], {
      cwd: fixture.root, env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    parent.stdout.on('data', chunk => { output += chunk; });
    const exited = await new Promise<number | null>(resolve => parent.once('exit', resolve));
    expect(exited).toBe(0);
    const id = output.trim();
    await waitFor(id, p => Boolean(p.generation?.workerPid));
    expect((await readCodePreview(userId, id)).status).toBe('generating');
    release();
    expect((await waitFor(id, p => p.status !== 'generating')).status).toBe('pending');
    expect(existsSync(fixture.root + '/' + target)).toBe(false);
  });

  it('persists model failures without applying source or leaving a generating record', async () => {
    failModel = true;
    const preview = await queueCodeGeneration(userId, task(), randomUUID(), task(), randomUUID());
    release();
    const failed = await waitFor(preview.id, p => p.status !== 'generating');
    expect(failed.status).toBe('failed');
    expect(failed.generation?.error).toBeTruthy();
    expect(failed.changes).toHaveLength(0);
    expect(existsSync(fixture.root + '/' + target)).toBe(false);
  });

  it('persists an inconclusive reviewer warning in a human-approval-only preview and chat', async () => {
    invalidReview = true;
    const sessionId = randomUUID();
    const message = target + 'を新規作成する変更案を生成して。参考はserver/core/Reference.tsだけ。';
    const response = await streamingRouter.createCaller(context).chat({ message,
      messageId: randomUUID(), conversationId: sessionId });
    const id = (response.metadata as any).codePreview.previewId;
    release();
    const preview = await waitFor(id, p => p.status !== 'generating');
    expect(preview.status).toBe('pending');
    expect(preview.generation?.reviewWarning).toContain('機能の正しさは未確認');
    expect(existsSync(fixture.root + '/' + target)).toBe(false);
    const summaries = await unifiedToolsRouter.createCaller(context).listCodePreviews({ accountId: userId, includeHistory: true });
    expect(summaries.find(p => p.previewId === id)?.generation?.reviewWarning).toBe(preview.generation?.reviewWarning);
    const messages = await getSharedChatRepository().getMessages(sessionId, 100);
    expect(messages.find(m => m.id === 'code-generation-' + id)?.content).toContain('要件照合は未確認');
  });

  it('detects a dead generation worker instead of displaying it as running forever', async () => {
    const preview = await queueCodeGeneration(userId, task(), randomUUID(), task(), randomUUID());
    const active = await waitFor(preview.id, p => Boolean(p.generation?.workerPid));
    process.kill(active.generation!.workerPid!, 'SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 150));
    await listCodePreviews(userId, { includeHistory: true });
    expect((await waitFor(preview.id, p => p.status !== 'generating')).status).toBe('failed');
    release();
  });
});

async function waitFor(id: string, predicate: (p: Awaited<ReturnType<typeof readCodePreview>>) => boolean) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const record = await readCodePreview(userId, id);
    if (predicate(record)) return record;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Generation state not reached');
}
