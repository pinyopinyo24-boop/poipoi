import { afterEach, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const responses = vi.hoisted(() => [] as string[]);
vi.mock('../_core/llm', () => ({ invokeLLM: vi.fn(async () => ({
  choices: [{ message: { content: responses.shift() } }],
})) }));
vi.mock('../_core/ai/ConversationModel', () => ({ conversationModel: async () => 'review-model' }));

import { PoipoiCodeAgent } from '../core/PoipoiCodeAgent';
import { needsStagedGeneration } from '../core/CodeGenerationWorker';

afterEach(() => { responses.length = 0; vi.restoreAllMocks(); });

it('routes a multi-part UI and device request to staged generation', () => {
  const request = 'Windows PC版にCDから別のCDへコピーする機能を新規作成して。CDドライブが1台なら、元CDを読み取った後に空CDへの入れ替えを案内し、書き込み後に照合する。' +
    'チャットで「CDをコピーして」と頼んだときと、チャット画面のリサイクルマーク横に追加するCDマークを押したときに、同じコピー画面を開く。' +
    '進捗とエラーを表示し、既存機能は残して。実際の読み取り・書き込み処理を含む変更案を作成し、適用前に全変更を確認させて。まだ適用しないで。';
  expect(needsStagedGeneration(request)).toBe(true);
  expect(needsStagedGeneration('チャットの文字数を表示して。')).toBe(false);
});

it('combines staged source changes without writing an intermediate change to the real project', async () => {
  const root = mkdtempSync(join(tmpdir(), 'poipoi-stage-test-'));
  const file = 'server/core/Feature.ts';
  const original = 'export const oldValue = 1;\n';
  mkdirSync(join(root, 'server/core'), { recursive: true });
  writeFileSync(join(root, file), original);
  writeFileSync(join(root, 'package.json'), '{"dependencies":{}}');
  const agent = new (PoipoiCodeAgent as any)(root) as PoipoiCodeAgent;
  responses.push(
    JSON.stringify({ steps: [
      { clauses: [0, 1], focus: 'backend' },
      { clauses: [2], focus: 'UI integration' },
    ] }),
    JSON.stringify({ complete: true, missing: [] }),
  );
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
