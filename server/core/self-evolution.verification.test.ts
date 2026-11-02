import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';
const fixture=vi.hoisted(()=>{const sourceRoot=process.cwd();const root=sourceRoot+'/node_modules/.cache/az-evolution-real-ops-'+Date.now()+'-'+Math.random().toString(36).slice(2);vi.spyOn(process,'cwd').mockReturnValue(root);return {root,sourceRoot,replies:[] as string[]};});
vi.mock('../_core/llm',()=>({invokeLLM:vi.fn(async()=>{const content=fixture.replies.shift();if(content===undefined)throw new Error('Unplanned model invocation');return {choices:[{message:{content}}]};}),listLLMModels:vi.fn(async()=>({data:[]}))}));
import { unifiedToolsRouter } from '../routers/unifiedTools';
import { readCodePreview } from './CodePreviewStore';
import { SelfEvolutionWorkflow } from './SelfEvolutionWorkflow';
const git=(...args:string[])=>execFileSync('git',args,{cwd:fixture.root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const ctx=(id=910001,role='admin')=>({user:{id,role,name:'Fixture'},req:{headers:{}},res:{}} as any);
const tools=()=>unifiedToolsRouter.createCaller(ctx());
const base='server/core/EvolutionReference.ts';
async function preview(path:string,content:string){fixture.replies.push('Create a bounded source-only change. Preserve all existing exports.',JSON.stringify({changes:[{path,content}]}));return tools().codePreview({request:'Using '+base+' as reference, '+(path===base?'modify ':'create only ')+path+'. Keep all existing features.'});}
beforeAll(async()=>{
 await mkdir(fixture.root+'/server/core',{recursive:true});await writeFile(fixture.root+'/'+base,'export const value: number = 1;\n');
 await writeFile(fixture.root+'/package.json',JSON.stringify({name:'isolated-poipoi-evolution-verification',version:'1.0.0',type:'module',private:true}));
 await writeFile(fixture.root+'/tsconfig.json',JSON.stringify({compilerOptions:{target:'ES2022',module:'ESNext',strict:true,noEmit:true,skipLibCheck:true},include:['server/core/*.ts']}));
 await writeFile(fixture.root+'/.gitignore','node_modules/\ndata/\n');await writeFile(fixture.root+'/unrelated.txt','original\n');
 await symlink(fixture.sourceRoot+'/node_modules',fixture.root+'/node_modules','junction');
 git('init','--quiet');git('config','user.name','PoiPoi Verification');git('config','user.email','verification@example.invalid');git('add','.');git('-c','core.hooksPath='+(process.platform==='win32'?'NUL':'/dev/null'),'commit','--quiet','-m','Verification fixture');
 vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('External inference/network is not part of this controlled-model test');}));
});
beforeEach(()=>{fixture.replies.length=0;});
afterAll(async()=>{vi.unstubAllGlobals();vi.restoreAllMocks();await rm(fixture.root,{recursive:true,force:true});});
describe('approved self-evolution with actual source/Git/type-check operations',()=>{
 it('creates a preview without writing source, then applies and commits the approved new program',async()=>{
  const path='server/core/GeneratedAddition.ts',head=git('rev-parse','HEAD');const content='export function add(a: number, b: number): number { return a + b; }\n';
  const proposal=await preview(path,content);expect(existsSync(fixture.root+'/'+path)).toBe(false);expect(git('rev-parse','HEAD')).toBe(head);
  expect((await readCodePreview('910001',proposal.previewId)).status).toBe('pending');
  const outcome=await tools().applyCodePreview({previewId:proposal.previewId,confirm:'APPLY_AND_VERIFY'});expect(outcome.success).toBe(true);expect(outcome.committed).toBe(true);expect(outcome.typeChecked).toBe(true);expect(outcome.tested).toBe(false);
  expect(await readFile(fixture.root+'/'+path,'utf8')).toBe(content);expect(git('rev-parse','HEAD')).not.toBe(head);expect(git('show','--pretty=format:','--name-only','HEAD')).toBe(path);
  const exports:any={};vm.runInNewContext(ts.transpileModule(await readFile(fixture.root+'/'+path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports});expect(exports.add(2,3)).toBe(5);expect(exports.add(-3,1)).toBe(-2);
  expect((await readCodePreview('910001',proposal.previewId)).status).toBe('applied');await expect(tools().applyCodePreview({previewId:proposal.previewId,confirm:'APPLY_ONLY'})).rejects.toThrow('already used');
 },120000);
 it('modifies existing source, verifies types and preserves unrelated uncommitted work',async()=>{
  await writeFile(fixture.root+'/unrelated.txt','user local work\n');const content='export const value: number = 2;\nexport const evolved = true;\n';const proposal=await preview(base,content);
  const result=await tools().applyCodePreview({previewId:proposal.previewId,confirm:'APPLY_AND_VERIFY'});expect(result.success).toBe(true);expect(await readFile(fixture.root+'/'+base,'utf8')).toBe(content);expect(await readFile(fixture.root+'/unrelated.txt','utf8')).toBe('user local work\n');expect(git('show','--pretty=format:','--name-only','HEAD')).toBe(base);
  await writeFile(fixture.root+'/unrelated.txt','original\n');
 },120000);
 it('rolls back a real TypeScript failure without committing the invalid proposal',async()=>{
  const original=await readFile(fixture.root+'/'+base,'utf8'),head=git('rev-parse','HEAD');const proposal=await preview(base,'export const value: number = "type error";\nexport const evolved = true;\n');
  const result=await tools().applyCodePreview({previewId:proposal.previewId,confirm:'APPLY_AND_VERIFY'});expect(result.success).toBe(false);expect(await readFile(fixture.root+'/'+base,'utf8')).toBe(original);expect(git('rev-parse','HEAD')).toBe(head);expect(git('diff','--cached','--name-only')).toBe('');expect((await readCodePreview('910001',proposal.previewId)).status).toBe('failed');
 },120000);
 it('refuses an existing-source hash conflict and preserves the user edit',async()=>{
  const original=await readFile(fixture.root+'/'+base,'utf8');const proposal=await preview(base,original+'export const proposalOnly = 1;\n');await writeFile(fixture.root+'/'+base,original+'// new user edit\n');
  const result=await tools().applyCodePreview({previewId:proposal.previewId,confirm:'APPLY_ONLY'});expect(result.success).toBe(false);expect(result.error).toContain('Source changed');expect(await readFile(fixture.root+'/'+base,'utf8')).toContain('new user edit');await writeFile(fixture.root+'/'+base,original);
 });
 it('does not include pre-staged unrelated files in an evolution commit',async()=>{
  const original=await readFile(fixture.root+'/'+base,'utf8'),head=git('rev-parse','HEAD');const proposal=await preview(base,original+'export const stagingTest = 1;\n');await writeFile(fixture.root+'/unrelated.txt','staged work\n');git('add','unrelated.txt');
  const result=await tools().applyCodePreview({previewId:proposal.previewId,confirm:'APPLY_ONLY'});expect(result.success).toBe(false);expect(result.error).toContain('staged');expect(git('rev-parse','HEAD')).toBe(head);expect(git('diff','--cached','--name-only')).toBe('unrelated.txt');git('reset','--quiet','--','unrelated.txt');await writeFile(fixture.root+'/unrelated.txt','original\n');
 });
 it('requires explicit approval, admin rights and ownership',async()=>{
  const path='server/core/ApprovalGuard.ts';const proposal=await preview(path,'export const guarded = true;\n');
  await expect(tools().applyCodePreview({previewId:proposal.previewId} as any)).rejects.toThrow();
  await expect(unifiedToolsRouter.createCaller(ctx(910001,'user')).applyCodePreview({previewId:proposal.previewId,confirm:'APPLY_ONLY'})).rejects.toThrow('Administrator');
  await expect(unifiedToolsRouter.createCaller(ctx(910002)).applyCodePreview({previewId:proposal.previewId,confirm:'APPLY_ONLY'})).rejects.toThrow();expect(existsSync(fixture.root+'/'+path)).toBe(false);expect((await readCodePreview('910001',proposal.previewId)).status).toBe('pending');await tools().rejectCodePreview({previewId:proposal.previewId});
 });
 it('confirms the old execution workflow remains a simulation and does not commit source',async()=>{
  const workflow=SelfEvolutionWorkflow.getInstance(),user='legacy-fixture',head=git('rev-parse','HEAD');const simulation=await workflow.runSimulation(user);const before=await readFile(fixture.root+'/'+base,'utf8');simulation.approvedCandidates=[{id:'controlled-program-change',source:'diagnosis',title:'Change fixture source',description:'Change '+base+' value to 99',priority:'low',estimatedImpact:10,createdAt:Date.now()}];await expect(workflow.runExecution(user,simulation)).rejects.toThrow('approval');workflow.approveExecution(user,simulation.workflowId);const result=await workflow.runExecution(user,simulation);expect(result.simulationOnly).toBe(true);expect(result.codeApplied).toBe(false);expect(result.execution.succeeded).toBe(1);expect(result.execution.results[0].simulated).toBe(true);expect(await readFile(fixture.root+'/'+base,'utf8')).toBe(before);expect(git('rev-parse','HEAD')).toBe(head);
 },120000);
});
