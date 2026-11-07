import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { scenarios } from '../../scripts/lib/generation-scenarios.mjs';
import { qualityScenarios } from '../../scripts/lib/generation-quality-scenarios.mjs';
import { verifyScenario } from '../../scripts/lib/verify-generation-scenario.mjs';

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
  it('preserves an explicitly requested existing display element without requiring a runtime callback', async () => {
    const file='client/src/components/ExistingOutput.tsx';
    const original='export default function ExistingOutput({input}:{input:string}) { return <output>{input}</output>; }';
    const good=original.replace('{input}</output>','{input.trim()}</output>');
    const bad=good.replaceAll('output','div');
    mkdirSync(model.root+'/client/src/components',{recursive:true});writeFileSync(model.root+'/'+file,original);
    try {
      model.replies.push(JSON.stringify({changes:[{path:file,content:bad}]}),JSON.stringify({changes:[{path:file,content:good}]}),accepted);
      const result=await PoipoiCodeAgent.getInstance().generate(
        file+'を変更し、inputの前後空白を除いた結果だけをoutputに表示する。既存のdefault exportとpropsのinputは保持して。','system');
      expect(result[0].content).toBe(good);
      expect(model.requests[1].messages.at(-1).content).toContain('Requested JSX element <output> was removed');
      expect(readFileSync(model.root+'/'+file,'utf8')).toBe(original);
    } finally {rmSync(model.root+'/'+file,{force:true});}
  });

  it('allows an explicitly requested element replacement instead of imposing the old tag', async () => {
    const file='client/src/components/ExistingOutput.tsx';
    const original='export default function ExistingOutput({input}:{input:string}) { return <output>{input}</output>; }';
    const next=original.replaceAll('output','span');
    mkdirSync(model.root+'/client/src/components',{recursive:true});writeFileSync(model.root+'/'+file,original);
    try {
      model.replies.push(JSON.stringify({changes:[{path:file,content:next}]}),accepted);
      const result=await PoipoiCodeAgent.getInstance().generate(
        'Modify '+file+': return a span element instead of the old output element. Keep current props and default export.','system');
      expect(result[0].content).toBe(next);
      expect(readFileSync(model.root+'/'+file,'utf8')).toBe(original);
    } finally {rmSync(model.root+'/'+file,{force:true});}
  });

  it('does not turn a negated Japanese display instruction into a preservation requirement', async () => {
    const file='client/src/components/ExistingOutput.tsx';
    const original='export default function ExistingOutput({input}:{input:string}) { return <output>{input}</output>; }';
    const next=original.replaceAll('output','span');
    mkdirSync(model.root+'/client/src/components',{recursive:true});writeFileSync(model.root+'/'+file,original);
    try {
      model.replies.push(JSON.stringify({changes:[{path:file,content:next}]}),accepted);
      const result=await PoipoiCodeAgent.getInstance().generate(
        file+'を変更し、outputに表示しないで、spanに表示する。既存のpropsとdefault exportを保持して。','system');
      expect(result[0].content).toBe(next);
      expect(model.requests[0].messages.at(-1).content).toContain('explicitly requires <span>');
      expect(model.requests).toHaveLength(2);
      expect(readFileSync(model.root+'/'+file,'utf8')).toBe(original);
    } finally {rmSync(model.root+'/'+file,{force:true});}
  });

  it('repairs the complete forbidden hook call rather than leaving its callback and dependency array behind', async () => {
    const scenario=qualityScenarios.find(s=>s.id==='react-gauge')!;
    const file=scenario.required[0];
    const hook='React.useMemo(()=>{if(isNaN(value)||value<0)return 0;if(value>100)return 100;return value;},[value])';
    const bad='export default function Gauge({value}:{value:number}){const clampedValue='+hook+';return <meter min={0} max={100} value={clampedValue}/>;}';
    const expression='Number.isFinite(value)?Math.max(0,Math.min(100,value)):0';
    model.replies.push(...Array(2).fill(JSON.stringify({changes:[{path:file,content:bad}]})),
      JSON.stringify({edits:[{oldText:hook,newText:expression}]}),accepted);
    const result=await PoipoiCodeAgent.getInstance().generate(
      scenario.request+' Using server/core/ApprovalUiVerification.ts as reference.', 'system',
      {validateGenerated:changes=>verifyScenario(scenario,changes)});
    expect(result[0].content).toBe(bad.replace(hook,expression));
    const repair=model.requests[2];
    const anchors=repair.response_format.json_schema.schema.properties.edits.items.properties.oldText.enum;
    expect(anchors).toEqual([hook]);
    expect(repair.messages.at(-1).content).toContain('COMPLETE hook invocation');
    expect(model.requests[0].messages.at(-1).content).toContain('explicitly forbids React hooks');
    expect(model.requests[0].messages.at(-1).content).toContain('Number.isFinite');
    expect(existsSync(model.root+'/'+file)).toBe(false);
  });

  it('repairs the actual rejected JSX tag instead of changing a passing code-point calculation', async () => {
    const scenario=scenarios.find(s=>s.id==='react-display')!;
    const file=scenario.required[0];
    const bad='const CharacterCount=({input}:{input:string})=>{const count=Array.from(input).length;return <span>{count}文字</span>;}; export default CharacterCount;';
    const good=bad.replace('<span>','<output>').replace('</span>','</output>');
    model.replies.push(
      JSON.stringify({changes:[{path:file,content:'export '+bad}]}),
      ...Array(2).fill(JSON.stringify({changes:[{path:file,content:bad}]})),
      JSON.stringify({edits:[{oldText:'<span>',newText:'<output>'},{oldText:'</span>',newText:'</output>'}]}),accepted);
    const check=vi.fn(changes=>verifyScenario(scenario,changes));
    const result=await PoipoiCodeAgent.getInstance().generate(
      scenario.request+' Using server/core/ApprovalUiVerification.ts as reference.', 'system',{validateGenerated:check});
    expect(result[0].content).toBe(good);
    expect(check).toHaveBeenCalledTimes(4);
    const repair=model.requests[3];
    const anchors=repair.response_format.json_schema.schema.properties.edits.items.properties.oldText.enum;
    expect(anchors).toContain('<span>');expect(anchors).toContain('</span>');
    expect(anchors).not.toContain('Array.from(input).length');
    expect(repair.messages.at(-1).content).toContain('preserving current props and calculations');
    expect(existsSync(model.root+'/'+file)).toBe(false);
  });

  it('rejects an unrelated expression patch when the runtime failure concerns the JSX tag', async () => {
    const scenario=scenarios.find(s=>s.id==='react-display')!;
    const file=scenario.required[0];
    const bad='export default function CharacterCount({input}:{input:string}) { return <span>{Array.from(input).length}文字</span>; }';
    model.replies.push(...Array(2).fill(JSON.stringify({changes:[{path:file,content:bad}]})),
      JSON.stringify({edits:[{oldText:'Array.from(input).length',newText:'[...input].length'}]}));
    await expect(PoipoiCodeAgent.getInstance().generate(
      scenario.request+' Using server/core/ApprovalUiVerification.ts as reference.', 'system',
      {validateGenerated:changes=>verifyScenario(scenario,changes)})).rejects.toThrow('previously rejected');
    expect(model.requests).toHaveLength(3);
    expect(existsSync(model.root+'/'+file)).toBe(false);
  });

  it('uses the same JSX repair mechanism for a different element and different props', async () => {
    const scenario=qualityScenarios.find(s=>s.id==='react-gauge')!;
    const file=scenario.required[0];
    const wrongElement='<output>{value}</output>';
    const bad='export default function Gauge({value}:{value:number}) { return '+wrongElement+'; }';
    const meter='<meter min={0} max={100} value={Number.isFinite(value)?Math.max(0,Math.min(100,value)):0}/>';
    model.replies.push(...Array(2).fill(JSON.stringify({changes:[{path:file,content:bad}]})),
      JSON.stringify({edits:[{oldText:wrongElement,newText:meter}]}),accepted);
    const result=await PoipoiCodeAgent.getInstance().generate(
      scenario.request+' Using server/core/ApprovalUiVerification.ts as reference.', 'system',
      {validateGenerated:changes=>verifyScenario(scenario,changes)});
    expect(result[0].content).toBe(bad.replace(wrongElement,meter));
    expect(model.requests[0].messages.at(-1).content).toContain('explicitly requires <meter>');
    expect(existsSync(model.root+'/'+file)).toBe(false);
  });

  it('does not prescribe a React default export when repairing a missing ordinary function export', async () => {
    const file='server/core/ProductionAverage.ts';
    const wrong='export function calculateProductionAverage(rows:{quantity:number,minutes:number}[]) { return rows.reduce((s,r)=>s+r.minutes*r.quantity,0)/rows.reduce((s,r)=>s+r.quantity,0); }';
    const right=wrong.replace('calculateProductionAverage','averageMinutes').replace('r.minutes*r.quantity','r.minutes');
    const proposal=JSON.stringify({changes:[{path:file,content:wrong}]});
    model.replies.push(proposal,proposal,JSON.stringify({edits:[
      {oldText:'calculateProductionAverage',newText:'averageMinutes'},
      {oldText:'r.minutes*r.quantity',newText:'r.minutes'},
    ]}),accepted);
    const check=vi.fn(changes=>changes[0].content===right?[]:['Runtime acceptance failed: TypeError: f is not a function']);
    const result=await PoipoiCodeAgent.getInstance().generate(
      'Create NEW server/core/ProductionAverage.ts exporting averageMinutes(rows:{quantity:number,minutes:number}[]):number. Divide total minutes by total quantity.',
      'system',{validateGenerated:check});
    expect(result[0].content).toBe(right);
    const repair=JSON.parse(model.requests[2].messages.at(-1).content);
    expect(repair.request).toContain('averageMinutes');
    expect(repair.repairGuidance.join(' ')).not.toContain('component');
    expect(repair.repairGuidance.join(' ')).not.toContain('default export');
    expect(check).toHaveBeenCalledTimes(3);
    expect(existsSync(model.root+'/'+file)).toBe(false);
  });

  it('enforces callable React exports even without a test-only runtime validator', async () => {
    const file='client/src/components/Status.tsx';
    const wrong='export default {type:"output"};';
    const right='export default function Status({value}:{value:string}) { return <output>{value}</output>; }';
    model.replies.push(JSON.stringify({changes:[{path:file,content:wrong}]}),JSON.stringify({changes:[{path:file,content:right}]}),accepted);
    const result=await PoipoiCodeAgent.getInstance().generate(
      'Using server/core/ApprovalUiVerification.ts as reference, create client/src/components/Status.tsx as a NEW standalone React component with default export Status({value}:{value:string}). Return an output element showing the value.', 'system');
    expect(result[0].content).toBe(right);
    expect(model.requests[1].messages.at(-1).content).toContain('directly callable');
    expect(existsSync(model.root+'/'+file)).toBe(false);
  });

  it('keeps standalone React generation tied to the requested props and element', async () => {
    const file = 'client/src/components/Gauge.tsx';
    const source = 'export default function Gauge({value}:{value:number}) { return <meter min={0} max={100} value={Math.max(0,Math.min(100,value))} />; }';
    model.replies.push(JSON.stringify({changes:[{path:file,content:source}]}), accepted);
    const result = await PoipoiCodeAgent.getInstance().generate(
      'Using server/core/ApprovalUiVerification.ts as reference, create client/src/components/Gauge.tsx as a NEW standalone React component with default export Gauge({value}:{value:number}). Return a meter element with min 0, max 100 and value clamped to that range.',
      'system', {validateGenerated: () => []});
    expect(result[0].content).toBe(source);
    const prompt = model.requests[0].messages.at(-1).content;
    expect(prompt).toContain('exact component name, props and rendered element requested');
    expect(prompt).not.toContain('Render a real output element from current props');
    expect(prompt).not.toContain('calculate text from input');
    expect(existsSync(model.root+'/'+file)).toBe(false);
  });

  it('rejects nonexistent input.codePointCount before runtime and generates an actual string-codepoint implementation', async () => {
    const file='client/src/components/CharacterCount.tsx';
    const wrong='export default function CharacterCount({input}: {input:string}) { return <output>{input.codePointCount()}文字</output>; }';
    const right='export default function CharacterCount({input}: {input:string}) { return <output>{Array.from(input).length}文字</output>; }';
    model.replies.push(
      JSON.stringify({changes:[{path:file,content:wrong}]}),
      JSON.stringify({changes:[{path:file,content:right}]}),
      accepted,
    );
    const check=vi.fn(()=>[]);
    const changes=await PoipoiCodeAgent.getInstance().generate(
      'Using server/core/ApprovalUiVerification.ts as reference, create client/src/components/CharacterCount.tsx as a NEW standalone React display component with default export CharacterCount({input}:{input:string}). Render an output element with Unicode code point count.',
      'system',{validateGenerated:check});
    expect(changes[0].content).toBe(right);
    expect(check).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(model.requests[1].messages)).toContain('codePointCount');
    expect(JSON.stringify(model.requests[1].messages)).toContain('not a JavaScript String method');
    expect(existsSync(model.root+'/'+file)).toBe(false);
  });

  it('rejects a non-callable default React export even when a permissive runtime callback says passed', async () => {
    const file='client/src/components/CharacterCount.tsx';
    const bad='const view = { type: "output" }; export default view;';
    const good='export default function CharacterCount({input}: {input:string}) { return {type:"output",props:{children:Array.from(input).length+"文字"}}; }';
    model.replies.push(
      JSON.stringify({changes:[{path:file,content:bad}]}),
      JSON.stringify({changes:[{path:file,content:good}]}),accepted,
    );
    const check=vi.fn(()=>[]);
    const result=await PoipoiCodeAgent.getInstance().generate(
      'Using server/core/ApprovalUiVerification.ts as reference, create client/src/components/CharacterCount.tsx as a NEW standalone React display component with default export CharacterCount({input}:{input:string}). Render an output element showing Unicode code point count.',
      'system',{validateGenerated:check});
    expect(result[0].content).toBe(good);
    expect(check).toHaveBeenCalledTimes(1);
    const retry=JSON.stringify(model.requests[1].messages);
    expect(retry).toContain('directly callable React component function');
    expect(retry).toContain('Do not export JSX');
    expect(model.requests[0].messages.at(-1).content).toContain('export a directly callable function');
    expect(existsSync(model.root+'/'+file)).toBe(false);
  });

  it('gives part-registry corrective patches preservation guidance and retains executable acceptance', async () => {
    const file='server/core/PartRegistry.ts';
    const bad='export function registerPart(parts: {sku:string,name:string}[], part: {sku:string,name:string}) { return [...parts.map(row=>({...row,sku:row.sku.trim().toUpperCase()})),part]; }';
    const good=bad.replace('parts.map(row=>({...row,sku:row.sku.trim().toUpperCase()}))','parts');
    model.replies.push(
      ...Array(2).fill(JSON.stringify({changes:[{path:file,content:bad}]})),
      JSON.stringify({edits:[{oldText:'parts.map(row=>({...row,sku:row.sku.trim().toUpperCase()}))',newText:'parts'}]}),
      accepted
    );
    const check=vi.fn(changes=>changes[0].content===good ? [] : ['Runtime acceptance failed: Error: preserve existing records']);
    const result=await PoipoiCodeAgent.getInstance().generate(
      'Create new server/core/PartRegistry.ts exporting registerPart(parts,part) while preserving existing records unchanged.',
      'system',{validateGenerated:check});
    expect(result[0].content).toBe(good);
    expect(check).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(model.requests[2].messages)).toContain('Normalize existing SKU temporarily only for comparison');
    expect(existsSync(model.root+'/'+file)).toBe(false);
  });

  it('does not discard a runtime-passing Unicode codepoint implementation because a reviewer mistakes Array.from length for String.length', async () => {
    const file='server/core/CharacterCount.ts';
    const source='export function countCharacters(input: string): number { return Array.from(input).length; }';
    const requirement='Unicodeコードポイントで数え、空欄は0文字、「あいう」は3文字、「😀」は1文字にする。';
    const negativeReview=JSON.stringify({accepted:false,issues:[{
      path:file,requirement,
      problem:'JavaScriptのString.lengthはUTF-16コード単位を数えます。',
      evidence:'Array.from(input).length',
    }]});
    model.replies.push(JSON.stringify({changes:[{path:file,content:source}]}),negativeReview);
    const check=vi.fn(changes=>changes[0].content===source ? [] : ['emoji count mismatch']);
    const warn=vi.fn();
    const changes=await PoipoiCodeAgent.getInstance().generate(
      '文字数を数える独立した関数をserver/core/CharacterCount.tsに新規作成して。countCharacters(input:string):numberをexportする。'+requirement,
      'system',{validateGenerated:check,onReviewWarning:warn});
    expect(changes[0].content).toBe(source);
    expect(check).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).toContain('Unicode');
    expect(model.requests).toHaveLength(2);
    expect(existsSync(model.root+'/'+file)).toBe(false);
  });

  it('passes actionable weighted-average failure information without changing acceptance contracts', async () => {
    const path='server/core/WeightedMinutes.ts';
    const bad='export function weightedMinutes(rows: {quantity:number,minutes:number}[]) { return rows.reduce((n,r)=>n+r.minutes,0)/rows.length; }';
    const good='export function weightedMinutes(rows: {quantity:number,minutes:number}[]) { return rows.reduce((n,r)=>n+r.minutes,0)/rows.reduce((n,r)=>n+r.quantity,0); }';
    model.replies.push(
      JSON.stringify({changes:[{path,content:bad}]}),
      JSON.stringify({changes:[{path,content:good}]}), accepted,
    );
    const check=vi.fn(changes=>changes[0].content===good ? [] : ['Runtime acceptance failed: Error: weighted average']);
    const result=await PoipoiCodeAgent.getInstance().generate(
      'Create NEW server/core/WeightedMinutes.ts: sum minutes divided by sum quantity for production.',
      'system',{validateGenerated:check});
    expect(result[0].content).toBe(good);
    expect(check).toHaveBeenCalledTimes(2);
    const retry=JSON.stringify(model.requests[1].messages);
    expect(retry).toContain('sum the minutes');
    expect(retry).toContain('sum of quantities');
    expect(existsSync(model.root+'/'+path)).toBe(false);
  });

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
    model.replies.push(bad, bad, patch, accepted);
    const validateGenerated = vi.fn(changes => changes[0].content === right ? [] : ['Unicode emoji count is wrong: expected 1, got 2']);
    const changes = await PoipoiCodeAgent.getInstance().generate(
      'Create NEW server/core/CountCodepoints.ts exporting codepoints(input: string) as Unicode code point length.',
      'system', { validateGenerated },
    );
    expect(changes[0].content).toBe(right);
    expect(validateGenerated).toHaveBeenCalledTimes(3);
    expect(model.requests).toHaveLength(4);
    const fixRequest = model.requests[2];
    expect(fixRequest.messages.at(-1).content).toContain('expected 1, got 2');
    expect(fixRequest.messages.at(-1).content).toContain('input.length');
    expect(fixRequest.messages.at(-1).content).toContain('Replace only the offending implementation');
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
      JSON.stringify({ edits: [{ oldText: 'input.length', newText: 'Array.from(input).length' }] }),
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
    expect(validateGenerated).toHaveBeenCalledTimes(3);
    expect(model.requests).toHaveLength(4);
    expect(model.requests[0].temperature).toBe(0.1);
    expect(model.requests[1].temperature).toBeGreaterThan(model.requests[0].temperature);
    expect(model.requests[2].response_format.json_schema.name).toBe('poipoi_failed_acceptance_patch');
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
