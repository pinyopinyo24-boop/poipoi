import { beforeAll, afterAll, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { scenarios } from '../../scripts/lib/generation-scenarios.mjs';
import { workingExamples } from './fixtures/generation-examples.mjs';

let calls=0, alwaysWrong=false, invalidTypes=false, allPatterns=false, missingModel=false;
const stageCalls: Record<string,number>={};
const server=createServer(async(req,res)=>{
  if(req.url==='/api/tags'){
    res.setHeader('content-type','application/json');
    res.end(JSON.stringify({models:missingModel?[]:[{name:process.env.LOCAL_CODER_MODEL?.trim()||'qwen2.5-coder:7b'}]}));return;
  }
  const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
  const body=JSON.parse(Buffer.concat(chunks).toString());
  let content;
  if(allPatterns) {
    if(body.format?.properties?.accepted) content=JSON.stringify({accepted:true,issues:[]});
    else if(body.format?.properties?.complete) content=JSON.stringify({complete:true,missing:[],issues:[]});
    else {
      const prompt=JSON.stringify(body.messages);
      const scenario=scenarios.find(s=>s.required.some((p:string)=>prompt.includes(p)));
      if(!scenario) throw Error('No scenario matched request');
      stageCalls[scenario.id]=(stageCalls[scenario.id]??0)+1;
      const changes=scenario.preserveExact ? [{path:scenario.required[0],edits:[{oldText:'price + quantity',newText:'price * quantity'}]}] :
        scenario.staged ? [{path:scenario.required[stageCalls[scenario.id]-1],content:workingExamples[scenario.id][stageCalls[scenario.id]-1]}] :
        scenario.required.map((path:string,index:number)=>({path,content:workingExamples[scenario.id][index]}));
      content=JSON.stringify({changes});
    }
  } else content=body.format?.properties?.accepted ? JSON.stringify({accepted:true,issues:[]}) :
    JSON.stringify({changes:[{path:'server/core/CharacterCount.ts',content:++calls===1||alwaysWrong
      ? invalidTypes ? 'export function countCharacters(input){return Array.from(input).length;}' : 'export function countCharacters(input:string){return input.length;}'
      : 'export function countCharacters(input:string){return Array.from(input).length;}'}]});
  res.setHeader('content-type','application/json');res.end(JSON.stringify({message:{role:'assistant',content},done:true}));
});
beforeAll(async()=>{await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));});
afterAll(async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));});
for(const mode of ['recover-behavior','persistent','recover-types'])it(`runs real matrix CLI and corrects or rejects actual acceptance failures: ${mode}`,async()=>{
  const persistent=mode==='persistent';
  const root=mkdtempSync(join(tmpdir(),'matrix-cli-'));calls=0;alwaysWrong=persistent;
  invalidTypes=mode==='recover-types';allPatterns=false;
  writeFileSync(join(root,'package.json'),'{"type":"module","dependencies":{}}');
  symlinkSync(join(process.cwd(),'node_modules'),join(root,'node_modules'),'junction');
  try{
    const child=spawn(process.execPath,['--import','tsx',resolve('scripts/probe-local-code-generation-matrix.mjs'),'--case=unicode'],{
      cwd:root,env:{...process.env,LOCAL_AI_URL:'http://127.0.0.1:'+(server.address() as any).port},stdio:['ignore','pipe','pipe'],
    });
    let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
    const status=await new Promise<number|null>((r,j)=>{child.once('exit',r);child.once('error',j);});
    expect(status,output).toBe(persistent?1:0);expect(calls).toBe(persistent ? 4 : 2);
    const report=output.match(/^REPORT: (.+)$/m)?.[1];expect(report,output).toBeTruthy();
    const summary=JSON.parse(readFileSync(join(report!,'summary.json'),'utf8'));
    expect(summary.results[0].status).toBe(persistent?'failed':'passed');
    const responses=readFileSync(join(report!,'unicode.responses.jsonl'),'utf8').trim().split('\n');expect(responses).toHaveLength(persistent ? 4 : 3); // acceptance precedes AI review; no review on rejected candidates
    const acceptance=JSON.parse(readFileSync(join(report!,'unicode.acceptance.json'),'utf8'));
    expect(acceptance.errors.length===0).toBe(!persistent);
    const first=JSON.parse(readFileSync(join(report!,'unicode.acceptance-1.json'),'utf8'));
    expect(first.errors.join(' ')).toContain(invalidTypes?'TS7006':'character count');
  }finally{rmSync(root,{recursive:true,force:true});}
},20000);

it('runs all eight generation patterns through the actual CLI with controlled model responses',async()=>{
  const root=mkdtempSync(join(tmpdir(),'matrix-all-cli-'));allPatterns=true;
  for(const key of Object.keys(stageCalls))delete stageCalls[key];
  writeFileSync(join(root,'package.json'),'{"type":"module","dependencies":{}}');
  symlinkSync(join(process.cwd(),'node_modules'),join(root,'node_modules'),'junction');
  try {
    const child=spawn(process.execPath,['--import','tsx',resolve('scripts/probe-local-code-generation-matrix.mjs')],{
      cwd:root,env:{...process.env,LOCAL_AI_URL:'http://127.0.0.1:'+(server.address() as any).port},stdio:['ignore','pipe','pipe'],
    });
    let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
    const status=await new Promise<number|null>((r,j)=>{child.once('exit',r);child.once('error',j);});
    expect(status,output).toBe(0);expect(output).toContain('MATRIX RESULT: 8/8');
    const report=output.match(/^REPORT: (.+)$/m)?.[1];
    const summary=JSON.parse(readFileSync(join(report!,'summary.json'),'utf8'));
    expect(summary.results).toHaveLength(8);
    expect(summary.results.every((r:any)=>r.status==='passed')).toBe(true);
    expect(stageCalls['staged-ui-core']).toBe(2);
  } finally {allPatterns=false;rmSync(root,{recursive:true,force:true});}
},40000);

it('stops before any inference when the local model is missing',async()=>{
  const root=mkdtempSync(join(tmpdir(),'matrix-preflight-'));missingModel=true;calls=0;
  symlinkSync(join(process.cwd(),'node_modules'),join(root,'node_modules'),'junction');
  try {
    const child=spawn(process.execPath,['--import','tsx',resolve('scripts/probe-local-code-generation-matrix.mjs'),'--case=unicode'],{
      cwd:root,env:{...process.env,LOCAL_AI_URL:'http://127.0.0.1:'+(server.address() as any).port},stdio:['ignore','pipe','pipe'],
    });
    let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
    const status=await new Promise<number|null>((r,j)=>{child.once('exit',r);child.once('error',j);});
    expect(status,output).toBe(1);expect(calls).toBe(0);expect(output).toContain('MATRIX NOT STARTED:');
    expect(output).not.toContain('CASE PASS:');
  } finally {missingModel=false;rmSync(root,{recursive:true,force:true});}
},10000);
