import fs from "node:fs";
import path from "node:path";
const dir=path.resolve(process.cwd(),"data","memory");
const file=path.join(dir,"conversations.jsonl");
type Turn={conversationId:string;question:string;answer:string;timestamp:string};
function read():Turn[]{try{if(!fs.existsSync(file))return [];return fs.readFileSync(file,"utf8").split("\n").flatMap(line=>{try{const x=JSON.parse(line);return typeof x.conversationId==="string"&&typeof x.question==="string"&&typeof x.answer==="string"?[x as Turn]:[]}catch{return []}})}catch(e){console.error("[PoiPoiMemory]",e);return []}}
export function appendPoiPoiMemory(id:string,q:string,a:string):void{try{fs.mkdirSync(dir,{recursive:true});fs.appendFileSync(file,JSON.stringify({conversationId:id,question:q,answer:a,timestamp:new Date().toISOString()})+"\n","utf8")}catch(e){console.error("[PoiPoiMemory]",e)}}
export function getPoiPoiMemoryHistory(id:string){return read().filter(x=>x.conversationId===id).slice(-10).flatMap(x=>[{role:"user" as const,content:x.question},{role:"assistant" as const,content:x.answer}])}
export function searchPoiPoiMemory(q:string,limit=20,id?:string){const words=q.toLowerCase().trim().split(/\s+/).filter(Boolean);return words.length?read().filter(x=>(!id||x.conversationId===id)&&words.every(w=>(x.question+" "+x.answer).toLowerCase().includes(w))).slice(-limit).reverse():[]}