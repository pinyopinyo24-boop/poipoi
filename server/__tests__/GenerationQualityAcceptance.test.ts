import { expect, it } from 'vitest';
import { qualityScenarios } from '../../scripts/lib/generation-quality-scenarios.mjs';
import { verifyScenario } from '../../scripts/lib/verify-generation-scenario.mjs';
import { initialFiles } from '../../scripts/lib/generation-scenarios.mjs';

// Acceptance-machinery controls only. Never supplied to the model runner.
const controls: Record<string, { good:string; bad:string }> = {
  'react-gauge': {
    good: 'export default function Gauge({value}:{value:number}) {return <meter min={0} max={100} value={Number.isFinite(value)?Math.max(0,Math.min(100,value)):0}/>;}',
    bad: 'export default function Gauge({input}:{input:string}) {return <output>{input.length}</output>;}',
  },
  'inventory-adjustment': {
    good: 'export function adjustStock(stock:{sku:string,quantity:number},delta:number):{sku:string,quantity:number}{const quantity=stock.quantity+delta;if(!Number.isFinite(stock.quantity)||stock.quantity<0||!Number.isFinite(delta)||!Number.isFinite(quantity)||quantity<0)throw Error("invalid");return {...stock,quantity};}',
    bad: 'export function adjustStock(stock:any,delta:number){stock.quantity+=delta;return stock;}',
  },
  'typed-quantity-result': {
    good: 'export function parseQuantity(input:string):{ok:true,quantity:number}|{ok:false,error:string}{const value=input.trim(),quantity=Number(value);return /^\\d+$/.test(value)&&Number.isSafeInteger(quantity)?{ok:true,quantity}:{ok:false,error:"invalid quantity"};}',
    bad: 'export function parseQuantity(input:string){return {ok:true,quantity:Number(input)};}',
  },
  'existing-business-validation': {
    good: 'export function batchCost(price: number, quantity: number): number { const result=price*quantity;if(!Number.isFinite(price)||price<0||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(result))throw Error("invalid");return result; }',
    bad: 'export function batchCost(price: number, quantity: number): number { return price * quantity; }',
  },
};

for (const scenario of qualityScenarios) it('enforces additional behavior: '+scenario.id, () => {
  const wrap = (content:string) => scenario.editableRegion
    ? initialFiles(scenario)[scenario.required[0]].replace(scenario.editableRegion.oldText,content) : content;
  const change = (content:string) => [{path:scenario.required[0],content:wrap(content)}];
  expect(verifyScenario(scenario,change(controls[scenario.id].good))).toEqual([]);
  expect(verifyScenario(scenario,change(controls[scenario.id].bad)).length).toBeGreaterThan(0);
});

it('rejects a working business function when unrelated source was rewritten', () => {
  const scenario=qualityScenarios.find(s=>s.id==='existing-business-validation')!;
  const content=initialFiles(scenario)[scenario.required[0]]
    .replace(scenario.editableRegion.oldText,controls[scenario.id].good)
    .replace('Existing public API and comments must survive.','rewritten comment');
  expect(verifyScenario(scenario,[{path:scenario.required[0],content}]).join(' ')).toContain('outside the requested function');
});
