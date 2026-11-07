// Controlled test implementations. Never imported by real-model runners.
export const workingExamples = {
  unicode: ['export function countCharacters(input:string) { return Array.from(input).length; }'],
  'weighted-average': [`export function averageMinutes(rows:{quantity:number,minutes:number}[]) {
    if(!rows.length || rows.some(r=>!Number.isFinite(r.quantity)||r.quantity<=0||!Number.isFinite(r.minutes)||r.minutes<0)) throw Error('invalid');
    return rows.reduce((s,r)=>s+r.minutes,0)/rows.reduce((s,r)=>s+r.quantity,0);
  }`],
  'duplicate-registration': [`type Part={sku:string,name:string}; export function registerPart(parts:Part[],part:Part) {
    const sku=part.sku.trim().toUpperCase(),name=part.name.trim();
    if(!sku||!name||parts.some(p=>p.sku.trim().toUpperCase()===sku))throw Error('duplicate or empty');
    return [...parts,{sku,name}];
  }`],
  'multiple-modules': ['export function lineTotal(price:number,quantity:number){return price*quantity;}',
    "import {lineTotal} from './PriceMath'; export function invoiceTotal(rows:{price:number,quantity:number}[]){return rows.reduce((s,r)=>s+lineTotal(r.price,r.quantity),0);}"],
  'react-display': ['export default function CharacterCount({input}:{input:string}) {return <output>{Array.from(input).length}文字</output>;}'],
  'transfer-workflow': [`type Adapter={read():string;write(snapshot:string):void;verify(snapshot:string):boolean};
    export function createTransferFlow(adapter:Adapter) {
      let state={phase:'idle',message:''},snapshot='';
      const fail=(error:unknown)=>{state={phase:'error',message:String(error)};};
      return {getState:()=>state,start(){if(state.phase!=='idle')throw Error('already started');try{snapshot=adapter.read();state={phase:'awaiting-target',message:'Replace source media with target media and confirm'};}catch(e){fail(e);}},
      confirmTarget(){if(state.phase!=='awaiting-target')throw Error('not waiting');try{adapter.write(snapshot);if(!adapter.verify(snapshot))throw Error('verification mismatch');state={phase:'done',message:'complete'};}catch(e){fail(e);}}};
    }`],
  'staged-ui-core': ["export function normalizeSku(sku:string){return sku.trim().toUpperCase();}",
    "import {normalizeSku} from '../../../shared/NormalizeSku'; export default function PartPreview({sku}:{sku:string}){return <output>{normalizeSku(sku)}</output>;}"],
};
