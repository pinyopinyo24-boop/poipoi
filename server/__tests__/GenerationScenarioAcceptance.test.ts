import { afterAll, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { scenarios, initialFiles } from '../../scripts/lib/generation-scenarios.mjs';
import { verifyScenario } from '../../scripts/lib/verify-generation-scenario.mjs';
import { checkCodeProposalTypes } from '../core/CodeProposalTypeCheck';

// Controlled implementations test the acceptance machinery, not Ollama ability.
// The real model runner sends only requests and acceptance feedback, never these.
import { workingExamples as valid } from './fixtures/generation-examples.mjs';

const bad: Record<string, string[]> = {
  unicode: ['export function countCharacters(input:string){return input.length;}'],
  'weighted-average': ['export function averageMinutes(rows:{quantity:number,minutes:number}[]){return rows.reduce((s,r)=>s+r.minutes/r.quantity,0)/rows.length;}'],
  'duplicate-registration': ['export function registerPart(parts:any[],part:any){parts.push(part);return parts;}'],
  'large-existing-edit': ['export function total(price:number,quantity:number){return price*quantity;}'],
  'multiple-modules': ['export function lineTotal(p:number,q:number){return p*q;}', "import {lineTotal} from './Missing'; export const invoiceTotal=()=>0;"],
  'react-display': ['export default function CharacterCount({input}:{input:string}) {return <output>{input.length}文字</output>;}'],
  'transfer-workflow': ['export function createTransferFlow(adapter:any){return {start(){adapter.write(adapter.read());},confirmTarget(){},getState:()=>({phase:"done",message:"done"})};}'],
  'staged-ui-core': ["export function normalizeSku(sku:string){return sku.trim().toUpperCase();}",
    "export default function PartPreview({sku}:{sku:string}){return <output>{sku}</output>;}"],
};
const roots: string[] = [];
afterAll(() => { for(const root of roots) rmSync(root,{recursive:true,force:true}); });
for (const scenario of scenarios) {
  it('accepts working behavior and rejects a counterexample: ' + scenario.id, () => {
    const baseline=initialFiles(scenario);
    const contents=scenario.preserveExact ? [baseline['server/core/LargeExisting.ts'].replace('price + quantity','price * quantity')] : valid[scenario.id];
    const changes=scenario.required.map((path:string,index:number)=>({path,content:contents[index]}));
    expect(verifyScenario(scenario,changes)).toEqual([]);
    expect(verifyScenario(scenario,scenario.required.map((path:string,index:number)=>({path,content:bad[scenario.id][index]}))).length).toBeGreaterThan(0);
    const root=mkdtempSync(join(tmpdir(),'scenario-types-')); roots.push(root);
    for(const [file,content] of Object.entries(baseline)){mkdirSync(dirname(join(root,file)),{recursive:true});writeFileSync(join(root,file),content as string);}
    symlinkSync(join(process.cwd(),'node_modules'),join(root,'node_modules'),'junction');
    writeFileSync(join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,types:[],module:'ESNext',moduleResolution:'bundler',target:'ES2022',jsx:'react-jsx',skipLibCheck:true},include:['**/*.ts','**/*.tsx']}));
    expect(checkCodeProposalTypes(root,changes)).toEqual({checked:true,errors:[]});
  },15000);
}

it('rejects an unused integration import even when copied logic returns the correct value', () => {
  const scenario=scenarios.find(s=>s.id==='multiple-modules')!;
  const changes=scenario.required.map((path:string,index:number)=>({path,content:index===0 ? valid['multiple-modules'][0] :
    "import {lineTotal} from './PriceMath';export function invoiceTotal(rows:{price:number,quantity:number}[]){return rows.reduce((s,r)=>s+r.price*r.quantity,0);}"}));
  expect(verifyScenario(scenario,changes).join(' ')).toContain('must call the imported helper');
});

it('stops infinite generated loops and does not expose Node process or filesystem APIs', () => {
  const scenario=scenarios.find(s=>s.id==='unicode')!;
  for(const content of ['export function countCharacters(){while(true){}}',
    'export function countCharacters(){return process.env.SECRET;}',
    "import fs from 'node:fs';export function countCharacters(){return fs.readFileSync('secret');}"]) {
    expect(verifyScenario(scenario,[{path:scenario.required[0],content}]).length).toBeGreaterThan(0);
  }
},10000);

it('returns actionable failed assertion source for generated calculations', () => {
  const scenario = scenarios.find(s => s.id === 'weighted-average')!;
  const changes = [{path: scenario.required[0], content:
    'export function averageMinutes(rows:{quantity:number,minutes:number}[]){return rows.reduce((s,r)=>s+r.quantity*r.minutes,0)/rows.reduce((s,r)=>s+r.quantity,0);}' }];
  const failures = verifyScenario(scenario, changes);
  expect(failures.join(' ')).toContain('Runtime acceptance failed');
  expect(failures.join(' ')).toContain('Failed assertion source:');
  expect(failures.join(' ')).toContain('612/145');
});

it('returns the matching assertion for dynamically constructed Unicode labels', () => {
  const scenario = scenarios.find(s => s.id === 'unicode')!;
  const changes = [{path: scenario.required[0], content:
    'export function countCharacters(input:string){return input.length;}' }];
  const failures = verifyScenario(scenario, changes);
  expect(failures.join(' ')).toContain('Failed assertion source:');
  expect(failures.join(' ')).toContain('character count');
});
