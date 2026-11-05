import { afterEach, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import * as ts from 'typescript';

const responses = vi.hoisted(() => [] as string[]);
vi.mock('../_core/llm', () => ({ invokeLLM: vi.fn(async () => ({
  choices: [{ message: { content: responses.shift() } }],
})) }));
vi.mock('../_core/ai/ConversationModel', () => ({ conversationModel: async () => 'review-model' }));

import { PoipoiCodeAgent, currentCodeRequest, relocateStreamingRouterImports } from '../core/PoipoiCodeAgent';
import { needsStagedGeneration } from '../core/CodeGenerationWorker';

afterEach(() => { responses.length = 0; vi.restoreAllMocks(); });

it('repairs the actual misplaced CD import while preserving the router body', () => {
  const original = readFileSync(join(process.cwd(), 'server/routers.streaming.ts'), 'utf8');
  const marker = '  // STEP53_CACHE_STATUS_API';
  const broken = original.replace(marker, marker + "\nimport { copyCD } from './core/CDOperations';");
  const repaired = relocateStreamingRouterImports(original, broken);
  expect(repaired.indexOf("import { copyCD } from './core/CDOperations';"))
    .toBeLessThan(repaired.indexOf('export const streamingRouter = router({'));
  expect(repaired.replace("import { copyCD } from './core/CDOperations';\n", '')).toBe(original);
  expect(ts.transpileModule(repaired, { fileName: 'server/routers.streaming.ts', reportDiagnostics: true })
    .diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error)).toEqual([]);
});

it('routes a multi-part UI and device request to staged generation', () => {
  const request = 'Windows PC版にCDから別のCDへコピーする機能を新規作成して。CDドライブが1台なら、元CDを読み取った後に空CDへの入れ替えを案内し、書き込み後に照合する。' +
    'チャットで「CDをコピーして」と頼んだときと、チャット画面のリサイクルマーク横に追加するCDマークを押したときに、同じコピー画面を開く。' +
    '進捗とエラーを表示し、既存機能は残して。実際の読み取り・書き込み処理を含む変更案を作成し、適用前に全変更を確認させて。まだ適用しないで。';
  expect(needsStagedGeneration(request)).toBe(true);
  expect(needsStagedGeneration('チャットの文字数を表示して。')).toBe(false);
});

it('keeps a staged model call scoped to its current requirement', () => {
  const hardware = '実際のCD読み取りと書き込みを作る。';
  const all = 'CD画面とボタンも作る。';
  const stage = '現在のユーザー依頼:\n' + hardware + '\n参照する既存の接続箇所: server/routers.streaming.ts' +
    '\n直前の参考会話（実装条件）:\nComplete user goal for compatibility across stages: ' + all;
  expect(currentCodeRequest(stage)).toBe(hardware);
  expect(currentCodeRequest('背景\n' + stage)).toBe(hardware);
  expect(currentCodeRequest(all)).toBe(all);
});

it('combines staged source changes without writing an intermediate change to the real project', async () => {
  const root = mkdtempSync(join(tmpdir(), 'poipoi-stage-test-'));
  const file = 'server/core/Feature.ts';
  const original = 'export const oldValue = 1;\n';
  mkdirSync(join(root, 'server/core'), { recursive: true });
  writeFileSync(join(root, file), original);
  writeFileSync(join(root, 'package.json'), '{"dependencies":{}}');
  const agent = new (PoipoiCodeAgent as any)(root) as PoipoiCodeAgent;
  responses.push(JSON.stringify({ complete: true, missing: [] }));
  let calls = 0;
  vi.spyOn(PoipoiCodeAgent.prototype, 'generate').mockImplementation(async function () {
    calls++;
    if (calls === 1) return [{ path: file, content: original + 'export const backend = 2;\n', baseHash: 'draft' }];
    return [{ path: file, content: readFileSync(join((this as any).root, file), 'utf8') + 'export const ui = backend;\n', baseHash: 'draft' }];
  });
  try {
    const changes = await agent.generateStaged('新機能を作る。保存処理を追加する。画面から操作できるようにする。', '1');
    expect(calls).toBe(2);
    expect(changes).toHaveLength(1);
    expect(changes[0].baseHash).toBe(createHash('sha256').update(original).digest('hex'));
    expect(changes[0].content).toContain('export const backend = 2;');
    expect(changes[0].content).toContain('export const ui = backend;');
    expect(readFileSync(join(root, file), 'utf8')).toBe(original);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

it('assigns every CD copy requirement once without asking the model to plan', async () => {
  const root = mkdtempSync(join(tmpdir(), 'poipoi-stage-cd-test-'));
  const file = 'server/core/Feature.ts';
  mkdirSync(join(root, 'server/core'), { recursive: true });
  mkdirSync(join(root, 'client/src/pages'), { recursive: true });
  writeFileSync(join(root, file), 'export const value = 0;\n');
  writeFileSync(join(root, 'server/routers.streaming.ts'), 'export const streaming = true;\n');
  writeFileSync(join(root, 'server/core/AZConversationUnderstanding.ts'), 'export const understand = true;\n');
  writeFileSync(join(root, 'client/src/pages/StreamingChat.tsx'), 'export default function Chat() { return <div />; }\n');
  writeFileSync(join(root, 'package.json'), '{"dependencies":{}}');
  const agent = new (PoipoiCodeAgent as any)(root) as PoipoiCodeAgent;
  const clauses = [
    'Windows PC版にCDから別のCDへコピーする機能を新規作成して。',
    'CDドライブが1台なら、元CDを読み取った後に空CDへの入れ替えを案内し、書き込み後に照合する。',
    'チャットで「CDをコピーして」と頼んだときと、チャット画面のリサイクルマーク横に追加するCDマークを押したときに、同じコピー画面を開く。',
    '進捗とエラーを表示し、既存機能は残して。',
    '実際の読み取り・書き込み処理を含む変更案を作成し、適用前に全変更を確認させて。',
    'まだ適用しないで。',
  ];
  const stageTasks: string[] = [];
  responses.push(JSON.stringify({ complete: true, missing: [] }));
  vi.spyOn(PoipoiCodeAgent.prototype, 'generate').mockImplementation(async function (task) {
    stageTasks.push(task);
    return [{ path: file, content: `export const value = ${stageTasks.length};\n` }];
  });
  try {
    await agent.generateStaged(clauses.join(''), '1');
    expect(stageTasks).toHaveLength(3);
    expect(stageTasks[0]).toContain(clauses[4]);
    expect(stageTasks[1]).toContain(clauses[1]);
    expect(stageTasks[2]).toContain(clauses[2]);
    expect(stageTasks[0]).toContain('learn.microsoft.com/en-us/windows/win32/imapi/burning-a-disc');
    expect(stageTasks[0]).toContain('Use no Unix dd, cdrecord, /dev/null or dummy');
    expect(stageTasks[0].split('\n直前の参考会話')[0]).toContain('server/routers.streaming.ts');
    expect(stageTasks[2].split('\n直前の参考会話')[0]).toContain('client/src/pages/StreamingChat.tsx');
    expect(stageTasks[2].split('\n直前の参考会話')[0]).toContain('server/core/AZConversationUnderstanding.ts');
    for (const clause of clauses) {
      expect(stageTasks.filter(task => task.split('\n直前の参考会話')[0].includes(clause))).toHaveLength(1);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

it('retains a failed stage candidate for diagnosis without changing the project', async () => {
  const root = mkdtempSync(join(tmpdir(), 'poipoi-stage-error-test-'));
  const file = 'server/core/Feature.ts';
  const original = 'export const value = 0;\n';
  mkdirSync(join(root, 'server/core'), { recursive: true });
  writeFileSync(join(root, file), original);
  writeFileSync(join(root, 'package.json'), '{"dependencies":{}}');
  const agent = new (PoipoiCodeAgent as any)(root) as PoipoiCodeAgent;
  const onCandidate = vi.fn();
  vi.spyOn(PoipoiCodeAgent.prototype, 'generate').mockImplementation(async (_task, _userId, options) => {
    await options.onCandidate?.([{ path: file, content: 'invalid source' }], ['TS1005: syntax error']);
    throw new Error('生成コードの構文エラー');
  });
  try {
    await expect(agent.generateStaged('機能を作る。処理を追加する。画面を追加する。', '1', { onCandidate }))
      .rejects.toThrow('生成コードの構文エラー');
    expect(onCandidate).toHaveBeenCalledWith(
      [{ path: file, content: 'invalid source' }], ['TS1005: syntax error']);
    expect(readFileSync(join(root, file), 'utf8')).toBe(original);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
