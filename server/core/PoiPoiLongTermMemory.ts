import fs from "node:fs";
import path from "node:path";
const dir=path.resolve(process.cwd(),"data","memory");
const file=path.join(dir,"conversations.jsonl");
type Turn={conversationId:string;question:string;answer:string;timestamp:string};
 // STEP41_MEMORY_CACHE
let cachedTurns:Turn[]|null=null;
let cachedMtime=-1;
let cachedSize=-1;
function read():Turn[]{try{const stat=fs.existsSync(file)?fs.statSync(file):null;if(cachedTurns && stat && cachedMtime===stat.mtimeMs && cachedSize===stat.size)return cachedTurns;if(!fs.existsSync(file))return [];const turns=fs.readFileSync(file,"utf8").split("\n").flatMap(line=>{try{const x=JSON.parse(line);return typeof x.conversationId==="string"&&typeof x.question==="string"&&typeof x.answer==="string"?[x as Turn]:[]}catch{return []}});cachedTurns=turns;cachedMtime=stat!.mtimeMs;cachedSize=stat!.size;return turns}catch(e){console.error("[PoiPoiMemory]",e);return []}}
export function appendPoiPoiMemory(id:string,q:string,a:string):void{try{fs.mkdirSync(dir,{recursive:true});fs.appendFileSync(file,JSON.stringify({conversationId:id,question:q,answer:a,timestamp:new Date().toISOString()})+"\n","utf8");cachedTurns=null;cachedMtime=-1;cachedSize=-1}catch(e){console.error("[PoiPoiMemory]",e)}}
export function getPoiPoiMemoryHistory(id:string){return read().filter(x=>x.conversationId===id).slice(-10).flatMap(x=>[{role:"user" as const,content:x.question},{role:"assistant" as const,content:x.answer}])}
// STEP42_RECENT_MEMORY
export function getRecentPoiPoiMemory(limit=50,conversationId?:string){
  const max=Math.max(1,Math.min(limit,500));
  const turns=read();
  const result:Turn[]=[];
  for(let i=turns.length-1;i>=0 && result.length<max;i--){
    const item=turns[i];
    if(!conversationId || item.conversationId===conversationId){
      result.push(item);
    }
  }
  return result;
}
export function searchPoiPoiMemory(q:string,limit=20,id?:string){const words=q.toLowerCase().trim().split(/\s+/).filter(Boolean);return words.length?read().filter(x=>(!id||x.conversationId===id)&&words.every(w=>(x.question+" "+x.answer).toLowerCase().includes(w))).slice(-limit).reverse():[]}