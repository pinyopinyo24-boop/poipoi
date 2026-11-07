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
  anchorId: 'b' + createHash('sha256').update(target + '\n' + original).digest('hex').slice(0, 12), operation: 'insertAfter', newText: addition.trim(),
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
  it('repairs a last-attempt distinct failed proposal using verified exact edits', async () => {
    const file='server/core/StrictMean.ts';
    const candidates=[
      'export function mean(rows: {quantity:number,minutes:number}[]) { return rows.length; }',
      'export function mean(rows: {quantity:number,minutes:number}[]) { return rows.reduce((s,r)=>s+r.minutes,0); }',
      'export function mean(rows: {quantity:number,minutes:number}[]) { return rows.reduce((s,r)=>s+r.minutes,0)/rows.length; }',
      'export function mean(rows: {quantity:number,minutes:number}[]) { return rows.reduce((s,r)=>s+r.minutes,0)/rows.reduce((s,r)=>s+r.quantity,0)+1; }',
    ];
    const good=candidates[3].replace(')+1;', ');');
    model.replies.push(...candidates.map(content=>JSON.stringify({changes:[{path:file,content}]})),
      JSON.stringify({edits:[{oldText:')+1;',newText:');'}]}), accepted);
    const validateGenerated=vi.fn(changes=>changes[0].content===good?[]:['Expected the weighted time/quantity mean for all rows']);
    const changes=await PoipoiCodeAgent.getInstance().generate(
      'Create new server/core/StrictMean.ts exporting mean(rows) computing sum(minutes)/sum(quantity), not average batches.',
      'system',{validateGenerated});
    expect(changes[0].content).toBe(good);
    expect(validateGenerated).toHaveBeenCalledTimes(5);
    expect(model.requests).toHaveLength(6);
    expect(model.requests[4].messages.at(-1).content).toContain('weighted time/quantity mean');
    const reviewContext=JSON.parse(model.requests[5].messages.at(-1).content);
    expect(reviewContext.priorExecutableAcceptance).toContain('Passed on the exact resulting source');
    expect(reviewContext.reviewerCaution).toContain('Unicode code points');
    expect(existsSync(model.root+'/'+file)).toBe(false);
  });

  it('repairs a repeated rejected new module with exact edits and independently reruns acceptance', async () => {
    const file = 'server/core/CountCodepoints.ts';
    const wrong = 'export function codepoints(input: string) { return input.length; }';
    const right = 'export function codepoints(input: string) { return Array.from(input).length; }';
    const bad = JSON.stringify({ changes: [{ path: file, content: wrong }] });
    const patch = JSON.stringify({ edits: [{ oldText: 'input.length', newText: 'Array.from(input).length' }] });
    model.replies.push(bad, bad, bad, bad, patch, accepted);
    const validateGenerated = vi.fn(changes => changes[0].content === right ? [] : ['Unicode emoji count is wrong: expected 1, got 2']);
    const changes = await PoipoiCodeAgent.getInstance().generate(
      'Create NEW server/core/CountCodepoints.ts exporting codepoints(input: string) as Unicode code point length.',
      'system', { validateGenerated },
    );
    expect(changes[0].content).toBe(right);
    expect(validateGenerated).toHaveBeenCalledTimes(3);
    expect(model.requests).toHaveLength(6);
    const fixRequest = model.requests[4];
    expect(fixRequest.messages.at(-1).content).toContain('expected 1, got 2');
    expect(fixRequest.messages.at(-1).content).toContain('input.length');
    expect(readFileSync(model.root + '/' + target, 'utf8')).toBe(original);
    expect(existsSync(model.root + '/' + file)).toBe(false);
  });

  it('recovers from TS18046 unknown catch variables with type-narrowing guidance', async () => {
    const file = 'server/core/ReportError.ts';
    const bad = "export function reportError() { try { throw Error('read failure'); } catch (error) { return error.message; } }";
    const good = "export function reportError() { try { throw Error('read failure'); } catch (error) { return error instanceof Error ? error.message : String(error); } }";
    model.replies.push(
      JSON.stringify({ changes: [{ path: file, content: bad }] }),
      JSON.stringify({ changes: [{ path: file, content: good }] }),
      accepted,
    );
    const validateGenerated = vi.fn(changes => changes[0].content === good ? [] : [
      "server/core/ReportError.ts:1:102 TS18046: 'error' is of type 'unknown'.",
    ]);
    const changes = await PoipoiCodeAgent.getInstance().generate(
      'Create new server/core/ReportError.ts with reportError() preserving messages of caught read errors and compiling under TypeScript strict.',
      'system', { validateGenerated },
    );
    expect(validateGenerated).toHaveBeenCalledTimes(2);
    expect(changes[0].content).toBe(good);
    expect(model.requests).toHaveLength(3);
    expect(JSON.stringify(model.requests[1].messages)).toContain('TS18046');
    expect(JSON.stringify(model.requests[1].messages)).toContain('error instanceof Error');
    expect(existsSync(model.root + '/' + file)).toBe(false);
  });
  it('recovers from a repeated failed candidate by changing implementation rather than applying it', async () => {
    const file = 'server/core/CountItems.ts';
    const bad = 'export function countItems(input: string) { return input.length; }';
    const good = 'export function countItems(input: string) { return Array.from(input).length; }';
    model.replies.push(
      JSON.stringify({ changes: [{ path: file, content: bad }] }),
      JSON.stringify({ changes: [{ path: file, content: bad }] }),
      JSON.stringify({ changes: [{ path: file, content: good }] }),
      accepted,
    );
    const validateGenerated = vi.fn(changes =>
      changes[0].content === good ? [] : ['Unicode code points: input a😀い must count 3']);
    const changes = await PoipoiCodeAgent.getInstance().generate(
      'Create NEW server/core/CountItems.ts with exported countItems(input: string). Count Unicode code points for arbitrary input.',
      'system', { validateGenerated },
    );
    expect(changes[0].content).toBe(good);
    expect(existsSync(model.root + '/' + file)).toBe(false);
    expect(validateGenerated).toHaveBeenCalledTimes(2);
    expect(model.requests).toHaveLength(4);
    expect(model.requests[0].temperature).toBe(0.1);
    expect(model.requests[1].temperature).toBeGreaterThan(model.requests[0].temperature);
    expect(model.requests[2].temperature).toBeGreaterThan(model.requests[1].temperature);
    expect(JSON.stringify(model.requests[2].messages)).toContain('BYTE-FOR-BYTE IDENTICAL');
    expect(JSON.stringify(model.requests[2].messages)).toContain('Unicode code points');
  });
  it('supplies the current stage scope to the actual requirement-review request', async () => {
    model.replies.push(JSON.stringify({changes:[{path:target,content:original+addition}]}),accepted);
    const stageContext={focus:'Implement one-drive exchange and verification',deferredRequirements:['Create the visible CD button in the following stage.']};
    await PoipoiCodeAgent.getInstance().generate(task,'system',{stageContext});
    const review=JSON.parse(model.requests.at(-1).messages.at(-1).content);
    expect(review.implementationStage).toEqual(stageContext);
    expect(review.reviewScope).toContain('Require every CURRENT requirement');
    expect(review.request).not.toContain(stageContext.deferredRequirements[0]);
  });
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
    const grammar = model.requests[0].response_format.json_schema.schema.properties.changes.items;
    expect(grammar.properties).toBeUndefined();
    expect(grammar.oneOf[0].required).toEqual(['path', 'content']);
    expect(grammar.oneOf[1].required).toEqual(['path', 'edits']);
    expect(grammar.oneOf[1].properties.edits).toBeDefined();
    expect(grammar.oneOf[0].properties.path.enum).not.toContain(file);
    expect(grammar.oneOf[0].properties.path.not).toBeUndefined();
    expect(grammar.oneOf[0].properties.path.enum.every((name: string) => !existsSync(model.root + '/' + name))).toBe(true);
    expect(grammar.oneOf[1].properties.path.enum).toContain(file);
    expect(grammar.oneOf[1].properties.path.enum).not.toContain('server/core/NewFile.ts');
  });

  it('regenerates an incomplete replacement before requirement review without changing the source', async () => {
    model.replies.push(broken, repaired, accepted);
    const onCandidate = vi.fn();
    const result = await PoipoiCodeAgent.getInstance().generate(task, 'system', { onCandidate });
    expect(onCandidate).toHaveBeenCalledTimes(1);
    expect(onCandidate.mock.calls[0][1]).toEqual([]);
    expect(onCandidate.mock.calls[0][0][0].content).not.toBe(original);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe(original + '\n' + addition.trim());
    expect(result[0].previousContent).toBe(original);
    expect(readFileSync(model.root + '/' + target, 'utf8')).toBe(original);
    expect(model.requests).toHaveLength(3);
    const retry = JSON.stringify(model.requests[1].messages);
    expect(retry).toContain('Partial function declaration edit is forbidden');
    const review = JSON.parse(model.requests[2].messages.at(-1).content);
    expect(review.files[0].resultingSource).toBe(original + '\n' + addition.trim());
  });
  it('rejects a whole-file response for excerpted source and regenerates a preserving edit', async () => {
    const file = 'server/core/ExcerptedRouter.ts';
    const source = 'export const version = 1;\n' + '// existing checks must remain\n'.repeat(700);
    writeFileSync(model.root + '/' + file, source);
    model.replies.push(JSON.stringify({ changes: [{ path: file, content: 'export const version = 2;' }] }),
      JSON.stringify({ changes: [{ path: file, edits: [{ oldText: 'export const version = 1;', newText: 'export const version = 2;' }] }] }), accepted);
    const onCandidate = vi.fn();
    const result = await PoipoiCodeAgent.getInstance().generate('Modify ' + file + ' to export version 2.', 'system', { onCandidate });
    expect(JSON.stringify(model.requests[1].messages)).toContain('全文置換を拒否');
    expect(result[0].content).toBe(source.replace('version = 1', 'version = 2'));
    expect(onCandidate).toHaveBeenCalledTimes(1);
    expect(readFileSync(model.root + '/' + file, 'utf8')).toBe(source);
  });

  it('stops after one failed syntax correction and never submits broken code for approval', async () => {
    model.replies.push(broken, broken);
    await expect(PoipoiCodeAgent.getInstance().generate(task)).rejects.toThrow('Backend recovery requires insertion');
    expect(model.requests).toHaveLength(2);
    expect(readFileSync(model.root + '/' + target, 'utf8')).toBe(original);
    expect(existsSync(model.root + '/data/code-previews')).toBe(false);
  });

  it('also checks a new file without executing its top-level code', async () => {
    const file = 'server/core/NewSyntaxCheck.ts';
    const content = 'throw new Error("must not execute");\nexport const value = 1;';
    model.replies.push(
      JSON.stringify({ changes: [{ path: file, content: 'export const value = ;' }] }),
      JSON.stringify({ edits: [{ oldText: 'export const value = ;', newText: content }] }), accepted,
    );
    const result = await PoipoiCodeAgent.getInstance().generate('Create ' + file + '. Reference ' + target + ' only.');
    expect(result[0].content).toBe(content);
    expect(result[0].baseHash).toBeNull();
    expect(existsSync(model.root + '/' + file)).toBe(false);
  });


  it('retries an incorrect named export before model review and preserves the original source', async () => {
    const file = 'server/core/RequestedExport.ts';
    const wrong = 'export function wrongName():number { return 1; }';
    const right = 'export function requiredName():number { return 1; }';
    model.replies.push(
      JSON.stringify({changes:[{path:file,content:wrong}]}),
      JSON.stringify({changes:[{path:file,content:right}]}),
      accepted,
    );
    const validateGenerated = vi.fn(() => []);
    const result = await PoipoiCodeAgent.getInstance().generate(
      'server/core/RequestedExport.tsを新規作成して。requiredName():numberをexportする。参考はserver/core/ApprovalUiVerification.tsだけ。',
      'system', {validateGenerated}
    );
    expect(result[0].content).toBe(right);
    expect(existsSync(model.root + '/' + file)).toBe(false);
    expect(validateGenerated).toHaveBeenCalledTimes(2);
    expect(model.requests).toHaveLength(3);
    expect(model.requests[1].messages.at(-1).content).toContain('Required named export missing');
  });


  it('supplies a complete large-page composer and send handler, then repairs malformed JSX from original source', async () => {
    const file = 'client/src/pages/StreamingChat.tsx';
    mkdirSync(model.root + '/client/src/pages', { recursive: true });
    const input = '<Input value={input} onChange={event => setInput(event.target.value)} />';
    const handler = 'const handleSendMessage = () => {\n  setInput("");\n};';
    const composer = '<div data-composer="original">\n' +
      '{/* kept composer context */}\n'.repeat(30) +
      input + '\n<button onClick={handleSendMessage}>Send</button>\n</div>';
    const source = 'export default function StreamingChat() {\nconst [input, setInput] = useState("");\n' +
      '// Keep unrelated behavior and all existing source.\n'.repeat(300) + handler + '\n' +
      '// More existing page behavior.\n'.repeat(160) + 'return (\n<main>\n' + composer + '\n</main>\n);\n}';
    writeFileSync(model.root + '/' + file, source);
    const malformed = JSON.stringify({ changes: [{ path: file, edits: [{
      oldText: '<div data-composer="original">', newText: '<div data-composer="original"><div>',
    }] }] });
    const repaired = JSON.stringify({ changes: [{ path: file, edits: [{
      oldText: input, newText: input + '\n<output>{[...input].length}文字</output>',
    }] }] });
    model.replies.push(malformed, repaired, accepted);
    const result = await PoipoiCodeAgent.getInstance().generate('AIチャットの入力欄の近くに文字数を表示する機能を追加して。送信後は0文字に戻す。');
    const prompt = model.requests[0].messages.at(-1).content;
    expect(prompt).toContain(composer);
    expect(prompt).toContain(handler);
    const correction = model.requests[1].messages.at(-1).content;
    expect(correction).toContain('JSX編集が完全な構文単位ではありません');
    expect(correction).toContain('original');
    expect(result[0].content).toBe(source.replace(input, input + '\n<output>{[...input].length}文字</output>'));
    expect(readFileSync(model.root + '/' + file, 'utf8')).toBe(source);
    expect(model.requests).toHaveLength(3);
  });
});
