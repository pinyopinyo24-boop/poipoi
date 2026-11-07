import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { devNull } from 'node:os';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const fixture = vi.hoisted(() => {
  const original = process.cwd();
  const directory = original + '/node_modules/.cache/approval-integration-' + Date.now();
  vi.spyOn(process, 'cwd').mockReturnValue(directory);
  return { original, directory };
});

import { unifiedToolsRouter } from '../routers/unifiedTools';
import { createCodePreview, readCodePreview, listCodePreviews, saveCodePreview, describeCodePreview } from '../core/CodePreviewStore';
import { getSharedChatRepository } from '../repositories/ChatRepository';

const user = { id: 990001, role: 'admin', name: 'Isolated approval test' };
const context = (account = user) => ({ user: account, req: { headers: {} }, res: {} }) as any;
const tools = () => unifiedToolsRouter.createCaller(context());
const git = (...args: string[]) => execFileSync('git', args, {
  cwd: fixture.directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
});
const absolute = (name: string) => path.join(fixture.directory, name);
const hash = (source: string) => createHash('sha256').update(source).digest('hex');
const originalGlobal = process.env.GIT_CONFIG_GLOBAL;
const originalNoSystem = process.env.GIT_CONFIG_NOSYSTEM;

beforeAll(() => {
  mkdirSync(absolute('server/core'), { recursive: true });
  writeFileSync(absolute('.gitignore'), 'data/\nnode_modules\nscripts\n');
  writeFileSync(absolute('package.json'), '{"type":"module","dependencies":{}}');
  symlinkSync(fixture.original + '/node_modules', absolute('node_modules'), 'junction');
  symlinkSync(fixture.original + '/scripts', absolute('scripts'), 'junction');
  writeFileSync(absolute('tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', strict: true, skipLibCheck: true, types: [] }, include: ['server/core/*.ts'] }));
  process.env.GIT_CONFIG_GLOBAL = devNull;
  process.env.GIT_CONFIG_NOSYSTEM = '1';
  git('init', '-q');
  git('config', 'user.name', 'Approval integration');
  git('config', 'user.email', 'approval@example.invalid');
  git('add', '.');
  git('commit', '-qm', 'Isolated fixture');
});

afterAll(() => {
  if (originalGlobal === undefined) delete process.env.GIT_CONFIG_GLOBAL;
  else process.env.GIT_CONFIG_GLOBAL = originalGlobal;
  if (originalNoSystem === undefined) delete process.env.GIT_CONFIG_NOSYSTEM;
  else process.env.GIT_CONFIG_NOSYSTEM = originalNoSystem;
  vi.restoreAllMocks();
  rmSync(fixture.directory, { recursive: true, force: true });
});

describe('approved code changes through the real API, store and Git', () => {
  it('creates then modifies a file only after approval, records both commits, and reports once in the owned conversation', async () => {
    const repository = getSharedChatRepository();
    const sessionId = 'isolated-approval-session';
    await repository.saveSession({ id: sessionId, userId: String(user.id), title: 'Approval test', createdAt: Date.now(), updatedAt: Date.now(), messageCount: 0 });
    const target = 'server/core/ApprovedFeature.ts';
    const first = 'export function identity(value: string): string { return value; }\n';
    const preview = await createCodePreview(String(user.id), [{ path: target, content: first, baseHash: null, previousContent: '' }], sessionId);
    const before = git('rev-parse', 'HEAD');
    expect(existsSync(absolute(target))).toBe(false);
    expect((await readCodePreview(String(user.id), preview.id)).status).toBe('pending');
    const created = await tools().applyCodePreview({ previewId: preview.id, confirm: 'APPLY_ONLY' });
    expect(created).toMatchObject({ success: true, committed: true, tested: false, typeChecked: false });
    expect(readFileSync(absolute(target), 'utf8')).toBe(first);
    expect(git('show', 'HEAD:' + target)).toBe(first);
    expect(git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').trim()).toBe(target);
    expect(git('rev-parse', 'HEAD')).not.toBe(before);
    expect((await readCodePreview(String(user.id), preview.id))).toMatchObject({ status: 'applied', application: { phase: 'completed', committed: true, typeChecked: false } });
    const report = (await repository.getMessages(sessionId, 100)).filter(message => message.id === 'code-approval-' + preview.id);
    expect(report).toHaveLength(1);
    expect(report[0].content).toContain('適用・Gitコミット');
    const firstCommit = git('rev-parse', 'HEAD');
    await expect(tools().applyCodePreview({ previewId: preview.id, confirm: 'APPLY_ONLY' })).rejects.toThrow();
    expect(git('rev-parse', 'HEAD')).toBe(firstCommit);
    expect((await repository.getMessages(sessionId, 100)).filter(message => message.id === report[0].id)).toHaveLength(1);

    const second = first + 'export function passThrough(value: string): string { return value; }\n';
    const modification = await createCodePreview(String(user.id), [{ path: target, content: second, baseHash: hash(first), previousContent: first }], sessionId);
    expect(readFileSync(absolute(target), 'utf8')).toBe(first);
    const changed = await tools().applyCodePreview({ previewId: modification.id, confirm: 'APPLY_ONLY' });
    expect(changed).toMatchObject({ success: true, committed: true, tested: false, typeChecked: false });
    expect(readFileSync(absolute(target), 'utf8')).toBe(second);
    expect(git('show', 'HEAD:' + target)).toBe(second);
    expect(git('rev-parse', 'HEAD')).not.toBe(firstCommit);
    expect((await repository.getMessages(sessionId, 100)).filter(message => message.id.startsWith('code-approval-'))).toHaveLength(2);
    const history = await listCodePreviews(String(user.id), { includeHistory: true });
    expect(history.filter(item => item.status === 'applied')).toHaveLength(2);
  });

  it('does not apply rejected previews or previews owned by another account', async () => {
    const target = 'server/core/RejectedFeature.ts';
    const preview = await createCodePreview(String(user.id), [{ path: target, content: 'export const rejected = 1;', baseHash: null }]);
    const before = git('rev-parse', 'HEAD');
    await expect(unifiedToolsRouter.createCaller(context({ ...user, id: user.id + 1 })).applyCodePreview({ previewId: preview.id, confirm: 'APPLY_ONLY' })).rejects.toThrow();
    await expect(unifiedToolsRouter.createCaller(context({ ...user, role: 'user' })).applyCodePreview({ previewId: preview.id, confirm: 'APPLY_ONLY' })).rejects.toThrow('Administrator');
    await tools().rejectCodePreview({ previewId: preview.id });
    await expect(tools().applyCodePreview({ previewId: preview.id, confirm: 'APPLY_ONLY' })).rejects.toThrow();
    expect(existsSync(absolute(target))).toBe(false);
    expect(git('rev-parse', 'HEAD')).toBe(before);
  });

  it('allows only one of two simultaneous approvals to commit', async () => {
    const target = 'server/core/ConcurrentFeature.ts';
    const preview = await createCodePreview(String(user.id), [{ path: target, content: 'export const concurrent = 1;\n', baseHash: null }]);
    const before = git('rev-list', '--count', 'HEAD');
    const results = await Promise.allSettled([1, 2].map(() => tools().applyCodePreview({ previewId: preview.id, confirm: 'APPLY_ONLY' })));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(Number(git('rev-list', '--count', 'HEAD'))).toBe(Number(before) + 1);
    expect((await readCodePreview(String(user.id), preview.id)).status).toBe('applied');
  });

  it('preserves edits made after preview generation and persists the failure reason', async () => {
    const target = 'server/core/ApprovedFeature.ts';
    const source = readFileSync(absolute(target), 'utf8');
    const preview = await createCodePreview(String(user.id), [{ path: target, content: source + '// proposed\n', baseHash: hash(source), previousContent: source }]);
    const localEdit = source + '// user edit\n';
    writeFileSync(absolute(target), localEdit);
    const before = git('rev-parse', 'HEAD');
    const outcome = await tools().applyCodePreview({ previewId: preview.id, confirm: 'APPLY_ONLY' });
    expect(outcome.success).toBe(false);
    expect(readFileSync(absolute(target), 'utf8')).toBe(localEdit);
    expect(git('rev-parse', 'HEAD')).toBe(before);
    const saved = await readCodePreview(String(user.id), preview.id);
    expect(saved).toMatchObject({ status: 'failed', application: { phase: 'failed', committed: false } });
    expect(saved.application?.error).toContain('Source changed after generation');
    writeFileSync(absolute(target), source);
  });

  it('does not include unrelated staged changes', async () => {
    const target = 'server/core/UnstagedFeature.ts';
    const preview = await createCodePreview(String(user.id), [{ path: target, content: 'export const next = 1;', baseHash: null }]);
    writeFileSync(absolute('user-notes.txt'), 'preserve staged data');
    git('add', 'user-notes.txt');
    const before = git('rev-parse', 'HEAD');
    const outcome = await tools().applyCodePreview({ previewId: preview.id, confirm: 'APPLY_ONLY' });
    expect(outcome.success).toBe(false);
    expect(existsSync(absolute(target))).toBe(false);
    expect(git('diff', '--cached', '--name-only').trim()).toBe('user-notes.txt');
    expect(git('rev-parse', 'HEAD')).toBe(before);
    git('reset', '--quiet', '--', 'user-notes.txt');
  });

  it('rolls back a new file if Git cannot create the commit', async () => {
    const target = 'server/core/RollbackFeature.ts';
    const preview = await createCodePreview(String(user.id), [{ path: target, content: 'export const rollback = 1;', baseHash: null }]);
    const before = git('rev-parse', 'HEAD');
    git('config', 'user.useConfigOnly', 'true');
    git('config', '--unset', 'user.name');
    git('config', '--unset', 'user.email');
    try {
      const outcome = await tools().applyCodePreview({ previewId: preview.id, confirm: 'APPLY_ONLY' });
      expect(outcome.success).toBe(false);
      expect(existsSync(absolute(target))).toBe(false);
      expect(git('diff', '--cached', '--name-only').trim()).toBe('');
      expect(git('rev-parse', 'HEAD')).toBe(before);
      expect((await readCodePreview(String(user.id), preview.id)).status).toBe('failed');
    } finally {
      git('config', 'user.name', 'Approval integration');
      git('config', 'user.email', 'approval@example.invalid');
    }
  });

  it('continues in its independent worker after the requesting server process exits', async () => {
    const target = 'server/core/DetachedFeature.ts';
    const sessionId = 'detached-session';
    const repository = getSharedChatRepository();
    await repository.saveSession({ id: sessionId, userId: String(user.id), title: 'Detached approval', createdAt: Date.now(), updatedAt: Date.now(), messageCount: 0 });
    const preview = await createCodePreview(String(user.id), [{ path: target, content: 'export const detached = true;\n', baseHash: null }], sessionId);
    const code = `
      const {reserveCodePreview}=await import(${JSON.stringify(fixture.original + '/server/core/CodePreviewStore.ts')});
      const {applyCodePreviewInWorker}=await import(${JSON.stringify(fixture.original + '/server/core/CodeApprovalWorker.ts')});
      await applyCodePreviewInWorker(await reserveCodePreview(${JSON.stringify(String(user.id))},${JSON.stringify(preview.id)}),true);
    `;
    const parent = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', code], {
      cwd: fixture.directory, env: { ...process.env }, stdio: 'ignore',
    });
    try {
      const active = await waitForPreview(preview.id, record => record.application?.phase === 'type-checking');
      expect(active.application?.workerPid).not.toBe(parent.pid);
      parent.kill('SIGTERM');
      const completed = await waitForPreview(preview.id, record => record.status !== 'applying');
      expect(completed).toMatchObject({ status: 'applied', application: { committed: true, typeChecked: true } });
      expect(git('show', 'HEAD:' + target)).toBe(preview.changes[0].content);
      expect((await repository.getMessages(sessionId, 100))).toHaveLength(0);
      await tools().listCodePreviews({ accountId: String(user.id), includeHistory: true });
      await tools().listCodePreviews({ accountId: String(user.id), includeHistory: true });
      expect((await repository.getMessages(sessionId, 100)).filter(row => row.id === 'code-approval-' + preview.id)).toHaveLength(1);
    } finally { parent.kill('SIGTERM'); }
  });

  it('continues an interrupted approved new file with real type checking and no duplicate writes', async () => {
    const target = 'server/core/ResumedFeature.ts';
    const content = 'export function identity(input: string): string { return input; }\n';
    const preview = await interruptedPreview(target, content);
    expect(describeCodePreview(preview)).toMatchObject({ interrupted: true, canResume: true });
    const outcome = await tools().applyCodePreview({ previewId: preview.id, confirm: 'APPLY_AND_VERIFY', resume: true });
    expect(outcome).toMatchObject({ success: true, typeChecked: true, committed: true });
    expect(readFileSync(absolute(target), 'utf8')).toBe(content);
    expect(git('show', 'HEAD:' + target)).toBe(content);
    expect(describeCodePreview(await readCodePreview(String(user.id), preview.id))).toMatchObject({ interrupted: false, canResume: false });
  });

  it('preserves user changes to an interrupted file and refuses continuation', async () => {
    const target = 'server/core/ChangedInterruptedFeature.ts';
    const preview = await interruptedPreview(target, 'export const value = 1;\n');
    const changed = 'export const value = 2;\n';
    writeFileSync(absolute(target), changed);
    const head = git('rev-parse', 'HEAD');
    const outcome = await tools().applyCodePreview({ previewId: preview.id, confirm: 'APPLY_AND_VERIFY', resume: true });
    expect(outcome.success).toBe(false);
    expect(readFileSync(absolute(target), 'utf8')).toBe(changed);
    expect(git('rev-parse', 'HEAD')).toBe(head);
  });

  it('requires type-check approval when continuing an interrupted application', async () => {
    const preview = await interruptedPreview('server/core/VerifyRequired.ts', 'export const verify = true;\n');
    await expect(tools().applyCodePreview({ previewId: preview.id, confirm: 'APPLY_ONLY', resume: true })).rejects.toThrow('型チェック');
    expect((await readCodePreview(String(user.id), preview.id)).application?.phase).toBe('type-checking');
  });

  it('preserves a user edit made while asynchronous type checking is running', async () => {
    const target = 'server/core/EditedDuringCheck.ts';
    const preview = await createCodePreview(String(user.id), [{ path: target, content: 'export const value = 1;\n', baseHash: null }]);
    const head = git('rev-parse', 'HEAD');
    const applying = tools().applyCodePreview({ previewId: preview.id, confirm: 'APPLY_AND_VERIFY' });
    await waitForPreview(preview.id, record => record.application?.phase === 'type-checking');
    const edit = 'export const value = 2; // user edit\n';
    writeFileSync(absolute(target), edit);
    const outcome = await applying;
    expect(outcome.success).toBe(false);
    expect(readFileSync(absolute(target), 'utf8')).toBe(edit);
    expect(git('rev-parse', 'HEAD')).toBe(head);
    expect(git('diff', '--cached', '--name-only').trim()).toBe('');
  });

  it('retains an interrupted file without committing if its type check fails', async () => {
    const target = 'server/core/TypeErrorFeature.ts';
    const content = 'export const invalid: string = 123;\n';
    const preview = await interruptedPreview(target, content);
    const head = git('rev-parse', 'HEAD');
    const outcome = await tools().applyCodePreview({ previewId: preview.id, confirm: 'APPLY_AND_VERIFY', resume: true });
    expect(outcome.success).toBe(false);
    expect(outcome.error).toContain('Type check failed');
    expect(readFileSync(absolute(target), 'utf8')).toBe(content);
    expect(git('rev-parse', 'HEAD')).toBe(head);
    expect((await readCodePreview(String(user.id), preview.id)).status).toBe('failed');
  });

});

async function interruptedPreview(target: string, content: string) {
  const preview = await createCodePreview(String(user.id), [{ path: target, content, baseHash: null }]);
  writeFileSync(absolute(target), content);
  preview.status = 'applying';
  preview.application = { startedAt: 1, phase: 'type-checking' };
  await saveCodePreview(preview);
  return preview;
}
async function waitForPreview(id: string, predicate: (preview: Awaited<ReturnType<typeof readCodePreview>>) => boolean) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const record = await readCodePreview(String(user.id), id);
    if (predicate(record)) return record;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Expected approval state was not reached');
}
