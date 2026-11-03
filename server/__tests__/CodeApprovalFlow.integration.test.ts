import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { devNull } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const fixture = vi.hoisted(() => {
  const original = process.cwd();
  const directory = original + '/node_modules/.cache/approval-integration-' + Date.now();
  vi.spyOn(process, 'cwd').mockReturnValue(directory);
  return { original, directory };
});

import { unifiedToolsRouter } from '../routers/unifiedTools';
import { createCodePreview, readCodePreview, listCodePreviews } from '../core/CodePreviewStore';
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

beforeAll(() => {
  mkdirSync(absolute('server/core'), { recursive: true });
  writeFileSync(absolute('.gitignore'), 'data/\n');
  writeFileSync(absolute('package.json'), '{"type":"module","dependencies":{}}');
  process.env.GIT_CONFIG_GLOBAL = devNull;
  git('init', '-q');
  git('config', 'user.name', 'Approval integration');
  git('config', 'user.email', 'approval@example.invalid');
  git('add', '.');
  git('commit', '-qm', 'Isolated fixture');
});

afterAll(() => {
  if (originalGlobal === undefined) delete process.env.GIT_CONFIG_GLOBAL;
  else process.env.GIT_CONFIG_GLOBAL = originalGlobal;
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
});
