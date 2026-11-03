import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';

const model = vi.hoisted(() => {
  const root = process.cwd() + '/node_modules/.cache/generation-syntax-' + Date.now();
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  return { root, replies: [] as string[], requests: [] as any[] };
});
vi.mock('../_core/llm', () => ({ invokeLLM: vi.fn(async (request: any) => {
  model.requests.push(request);
  const content = model.replies.shift();
  if (content === undefined) throw new Error('Unexpected model call');
  return { choices: [{ message: { content } }] };
}) }));
vi.mock('../core/AZWebKnowledge', () => ({
  webResearchQuery: () => '', researchForAZ: vi.fn(), webResearchContext: () => '',
}));
vi.mock('../core/PoiPoiUnifiedStateStore', () => ({ searchUserPoiPoiMemories: async () => [] }));
import { PoipoiCodeAgent } from '../core/PoipoiCodeAgent';

const target = 'server/core/ApprovalUiVerification.ts';
const original = 'export function identity(input: string): string {\n  return input;\n}';
const addition = '\n\nexport function passThrough(input: string): string {\n  return input;\n}';
// The first edit is the actual failure shape observed from qwen2.5-coder:7b:
// replacing only a declaration's first line leaves its old body at module scope.
const broken = JSON.stringify({ changes: [{ path: target, edits: [{
  oldText: original.split('\n')[0], newText: original + addition,
}] }] });
const repaired = JSON.stringify({ changes: [{ path: target, edits: [{
  oldText: original, newText: original + addition,
}] }] });
const accepted = JSON.stringify({ accepted: true, issues: [] });
const task = target + 'だけを修正して。identity関数を保持しpassThrough関数を追加する。';

beforeAll(() => {
  mkdirSync(model.root + '/server/core', { recursive: true });
  writeFileSync(model.root + '/package.json', '{"dependencies":{}}');
  writeFileSync(model.root + '/' + target, original);
});
beforeEach(() => { model.replies.length = 0; model.requests.length = 0; });
afterAll(() => { vi.restoreAllMocks(); rmSync(model.root, { recursive: true, force: true }); });

describe('syntax validation before saving an AI proposal', () => {
  it('permits a complete small-file proposal while retaining the original source hash', async () => {
    model.replies.push(JSON.stringify({ changes: [{ path: target, content: original + addition }] }), accepted);
    const result = await PoipoiCodeAgent.getInstance().generate(task);
    expect(result[0].content).toBe(original + addition);
    expect(result[0].baseHash).toBe(createHash('sha256').update(original).digest('hex'));
    expect(readFileSync(model.root + '/' + target, 'utf8')).toBe(original);
    expect(JSON.stringify(model.requests[0].messages)).toContain('Small existing files eligible for complete content');
    const item = model.requests[0].response_format.json_schema.schema.properties.changes.items;
    expect(item.required).toEqual(['path', 'content']);
    expect(item.properties.edits).toBeUndefined();
  });

  it('retains exact edits for larger existing files', async () => {
    const file = 'server/core/LargeSource.ts';
    const content = 'export const version = 1;\n' + '// existing context\n'.repeat(700);
    writeFileSync(model.root + '/' + file, content);
    model.replies.push(JSON.stringify({ changes: [{ path: file, edits: [{
      oldText: 'export const version = 1;', newText: 'export const version = 2;',
    }] }] }), accepted);
    const result = await PoipoiCodeAgent.getInstance().generate('Modify ' + file + ' to export version 2.');
    expect(result[0].content).toBe(content.replace('version = 1', 'version = 2'));
    expect(readFileSync(model.root + '/' + file, 'utf8')).toBe(content);
    expect(model.requests[0].response_format.json_schema.schema.properties.changes.items.properties.edits).toBeDefined();
  });

  it('regenerates an incomplete replacement before requirement review without changing the source', async () => {
    model.replies.push(broken, repaired, accepted);
    const result = await PoipoiCodeAgent.getInstance().generate(task);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe(original + addition);
    expect(result[0].previousContent).toBe(original);
    expect(readFileSync(model.root + '/' + target, 'utf8')).toBe(original);
    expect(model.requests).toHaveLength(3);
    const retry = JSON.stringify(model.requests[1].messages);
    expect(retry).toContain('RECONSTRUCTED');
    expect(retry).toContain('TS1128');
    const review = JSON.parse(model.requests[2].messages.at(-1).content);
    expect(review.files[0].resultingSource).toBe(original + addition);
  });

  it('stops after one failed syntax correction and never submits broken code for approval', async () => {
    model.replies.push(broken, broken);
    await expect(PoipoiCodeAgent.getInstance().generate(task)).rejects.toThrow('構文エラーが残っています');
    expect(model.requests).toHaveLength(2);
    expect(readFileSync(model.root + '/' + target, 'utf8')).toBe(original);
    expect(existsSync(model.root + '/data/code-previews')).toBe(false);
  });

  it('also checks a new file without executing its top-level code', async () => {
    const file = 'server/core/NewSyntaxCheck.ts';
    const content = 'throw new Error("must not execute");\nexport const value = 1;';
    model.replies.push(
      JSON.stringify({ changes: [{ path: file, content: 'export const value = ;' }] }),
      JSON.stringify({ changes: [{ path: file, content }] }), accepted,
    );
    const result = await PoipoiCodeAgent.getInstance().generate('Create ' + file + '. Reference ' + target + ' only.');
    expect(result[0].content).toBe(content);
    expect(result[0].baseHash).toBeNull();
    expect(existsSync(model.root + '/' + file)).toBe(false);
  });
});
