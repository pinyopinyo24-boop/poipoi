import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import { resolveImageConversationRequest } from './ImageConversationRouter';
import { resolveChatImageRequest } from './ChatImageRequests';
import { groundImageEdit, preserveUneditedPixels, type ImageEditPlan } from './GroundedImageEdit';
vi.mock('./ChatImageStore', async () => ({ ...(await vi.importActual<typeof import('./ChatImageStore')>('./ChatImageStore')), getLocalVisionModel: vi.fn(async () => ({ base: 'http://vision.invalid', model: 'test-vision' })) }));
const imageId='11111111-1111-4111-8111-111111111111.png';
const turn=(role: 'user'|'assistant', content:string, metadata:any={}) => ({ id: Math.random().toString(), userId:'owner', role, content, metadata, timestamp:Date.now() });
const request='アンパンマンの顔・衣装・マント・三頭身を保ったまま、体だけをボディビルのようにムキムキにして';
const plan=():ImageEditPlan=>({ change:['体だけ筋肉質'],preserve:['顔','衣装','三頭身'],prompt:'A three-head-tall superhero with large bodybuilder muscles, original face and costume.',editRegions:[{label:'body',box:[200,250,800,950]}],protectRegions:[{label:'face',box:[300,100,700,400]}],sourceMatchesRequest:'yes',confidence:.95,question:'' });
async function picture() { return (await sharp({create:{width:128,height:128,channels:4,background:'#fff'}}).composite([{input:Buffer.from('<svg width="128" height="128"><rect x="44" y="15" width="40" height="35" fill="#ffcc99"/><rect x="48" y="50" width="32" height="60" fill="#e40000"/></svg>')}]).png().toBuffer()).toString('base64'); }
const vision=(value:any)=>vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({message:{content:JSON.stringify(value)}}),{headers:{'content-type':'application/json'}})));
afterEach(()=>vi.unstubAllGlobals());
describe('image edit request regression',()=>{
 it('retries an uploaded original after a failed edit using its explicit stored instruction',async()=>{
  const original=turn('user',request,{images:[{id:imageId}],imageEditAttempt:{prompt:request,rootPrompt:request,inputImageId:imageId,editInstruction:request,webMode:'off'}});
  for(const attachments of [[],[imageId]]) {const got=await resolveImageConversationRequest('もう一度生成して',[original],attachments);expect(got?.clarification).toBeUndefined();expect(got?.inputImageId).toBe(imageId);expect(got?.editInstruction).toBe(request);expect(got?.retry).toBe(true);}
 });
 it('recovers old failed edits but never guesses an edit from a photo analysis request',async()=>{
  const result=await resolveImageConversationRequest('もう一度生成して',[turn('user',request,{images:[{id:imageId}]})]);expect(result?.inputImageId).toBe(imageId);expect(result?.clarification).toBeUndefined();
  const analyze=await resolveImageConversationRequest('もう一度生成して',[turn('user','この写真について説明して',{images:[{id:imageId}]})]);expect(analyze?.clarification).toBeTruthy();
 });
 it.each(['顔は変えない。体だけをムキムキにして','顔と衣装は変更しないで、体だけをムキムキにして','顔を変えないまま、体をムキムキにして'])('honors local preservation while executing the requested body edit: %s',(text)=>{expect(resolveChatImageRequest(text,[turn('user','写真',{images:[{id:imageId}]})],false)?.inputImageId).toBe(imageId);});
 it('does not execute a global prohibition',()=>{expect(resolveChatImageRequest('画像を生成しないで',[turn('assistant','result',{generated:true,images:[{id:imageId}]})],false)).toBeUndefined();});
 it('does not silently reuse another image or cross a topic change',async()=>{
  const original=turn('user',request,{images:[{id:imageId}]});
  expect((await resolveImageConversationRequest('もう一度生成して',[original,turn('user','ニュースを教えて')]))?.retry).not.toBe(true);
  expect((await resolveImageConversationRequest('もう一度生成して',[original],['22222222-2222-4222-8222-222222222222.png']))?.clarification).toBeTruthy();
 });
});
describe('actual PNG and region processing (controlled vision output)',()=>{
 it('does not mistake a declarative restatement for missing information',async()=>{vision({...plan(),question:'Anpanmanの顔、衣装、マント、3頭身を保ったまま、体だけをボディビルのようにムキムキに変更する'});expect((await groundImageEdit(await picture(),128,128,{request})).plan.question).toBe('');});
 it('returns a genuine information question without requiring invented geometry',async()=>{vision({question:'どの部分を変えますか？'});await expect(groundImageEdit(await picture(),128,128,{request:'これを変更して'})).rejects.toThrow('どの部分');});
 it('rejects invalid and fully protected edit regions',async()=>{
  vision({...plan(),editRegions:[{label:'invalid',box:[800,300,200,900]}]});await expect(groundImageEdit(await picture(),128,128,{request})).rejects.toThrow('不正な編集範囲');
  vision({...plan(),protectRegions:[{label:'all',box:[0,0,1000,1000]}]});await expect(groundImageEdit(await picture(),128,128,{request})).rejects.toThrow('小さすぎ');
 });
 it('restores every protected RGBA pixel even if the engine redraws the entire image',async()=>{
  vision(plan());const edit=await groundImageEdit(await picture(),128,128,{request});const changed=await sharp({create:{width:128,height:128,channels:4,background:'#0000ff'}}).png().toBuffer();
  const output=await preserveUneditedPixels(changed.toString('base64'),edit);const raw=await sharp(Buffer.from(output.base64,'base64')).ensureAlpha().raw().toBuffer();let editableChanged=0;
  for(let i=0;i<edit.maskPixels.length;i++){if(edit.maskPixels[i]===0)expect(raw.subarray(i*4,i*4+4)).toEqual(edit.sourcePixels.subarray(i*4,i*4+4));else if(!raw.subarray(i*4,i*4+4).equals(edit.sourcePixels.subarray(i*4,i*4+4)))editableChanged++;}
  expect(editableChanged).toBeGreaterThan(100);expect(output.changedFraction).toBeGreaterThan(.1);
 });
 it('rejects output dimensions different from the mask rather than corrupting the source',async()=>{vision(plan());const edit=await groundImageEdit(await picture(),128,128,{request});const wrong=await sharp({create:{width:64,height:64,channels:3,background:'white'}}).png().toBuffer();await expect(preserveUneditedPixels(wrong.toString('base64'),edit)).rejects.toThrow('寸法');});
});

import { measureImageChange } from './ImageEditEvidence';
import { assessImageEdit } from './GroundedImageEdit';
import { generateImage } from '../_core/imageGeneration';
function review(value=plan(),status: 'yes'|'no'|'uncertain'='yes') { return {instructionCoverage:'yes',reason:'条件ごとの見た目を比較したテスト応答です。',checks:[...value.change.map((_,i)=>({id:'c'+i,status,before:'変更前の体',after:'変更後の体',evidence:'テストで制御した変更箇所を比較しました。'})),...value.preserve.map((_,i)=>({id:'p'+i,status:'yes',before:'元の特徴',after:'同じ特徴',evidence:'保護範囲の元の特徴を比較しました。'}))]}; }
describe('independent measurements and criterion coverage',()=>{
 it('does not accept background-only differences as a body change',async()=>{
  vision(plan());const edit=await groundImageEdit(await picture(),128,128,{request});const changed=Buffer.from(edit.sourcePixels);
  for(let i=0;i<edit.maskPixels.length;i++)if(edit.maskPixels[i]>128 && changed[i*4]===255&&changed[i*4+1]===255&&changed[i*4+2]===255){changed[i*4]=0;changed[i*4+1]=0;changed[i*4+2]=255;}
  const evidence=measureImageChange(edit.sourcePixels,changed,edit.maskPixels,128,128,edit.plan.editRegions);expect(evidence.regions[0].changedFraction).toBeGreaterThan(.05);expect(evidence.regions[0].foregroundChangedFraction).toBe(0);expect(evidence.sufficientChange).toBe(false);
 });
 it('does not turn unchanged pixel data into an improvement',async()=>{vision(plan());const edit=await groundImageEdit(await picture(),128,128,{request});expect((await preserveUneditedPixels(edit.source.toString('base64'),edit)).evidence.sufficientChange).toBe(false);});
 it('requires a comparison for every requested condition, not a blanket yes',async()=>{
  vision({changes:'yes',preserved:'yes',instructionCoverage:'yes',reason:'反映しました'});await expect(assessImageEdit(await picture(),await picture(),plan(),{current:request})).rejects.toThrow();
  const incomplete=review();incomplete.checks.pop();vision(incomplete);await expect(assessImageEdit(await picture(),await picture(),plan(),{current:request})).rejects.toThrow('全条件');
 });
 it('rejects duplicated or invented evidence IDs',async()=>{const result=review();result.checks[1].id='c0';vision(result);await expect(assessImageEdit(await picture(),await picture(),plan(),{current:request})).rejects.toThrow('全条件');});
 it('downgrades a yes with identical before/after descriptions',async()=>{const result=review();result.checks[0].after=result.checks[0].before;vision(result);expect((await assessImageEdit(await picture(),await picture(),plan(),{current:request})).changes).toBe('uncertain');});
 it('handles background edits with a protected subject without requiring a changed face',()=>{const source=Buffer.alloc(16*16*4,255),result=Buffer.from(source),mask=Buffer.alloc(256,255);for(let y=4;y<12;y++)for(let x=4;x<12;x++){const i=y*16+x;source[i*4]=result[i*4]=255;source[i*4+1]=result[i*4+1]=0;source[i*4+2]=result[i*4+2]=0;mask[i]=0;}for(let i=0;i<256;i++)if(mask[i]){result[i*4]=0;result[i*4+1]=100;result[i*4+2]=255;}expect(measureImageChange(source,result,mask,16,16,[{label:'background',box:[0,0,1000,1000]}]).sufficientChange).toBe(true);});
});
describe('generation pipeline with real PNGs and controlled engine HTTP',()=>{
 beforeEach(()=>{vi.stubEnv('LOCAL_IMAGE_API_URL','http://engine.invalid');vi.stubEnv('LOCAL_IMAGE_WIDTH','256');vi.stubEnv('LOCAL_IMAGE_HEIGHT','256');});
 afterEach(()=>vi.unstubAllEnvs());
 async function engine(options:{failFirst?:boolean;failSecond?:boolean;unchanged?:boolean;blanketReview?:boolean;preservedFirstNo?:boolean;secondReviewFails?:boolean}={}){
  const posts:any[]=[];let reviews=0;
  const fetcher=vi.fn(async(url:any,init?:RequestInit)=>{
   const address=String(url);if(address.includes('/progress'))return new Response(JSON.stringify({state:{job_count:0}}));
   if(address.includes('vision.invalid')){const body=JSON.parse(String(init?.body));if(body.messages[1].images.length===1)return new Response(JSON.stringify({message:{content:JSON.stringify(plan())}}));const result=review();if(options.preservedFirstNo&&reviews++===0)result.checks[1].status='no';return new Response(JSON.stringify({message:{content:JSON.stringify((options.blanketReview || options.secondReviewFails && posts.length===2)?{changes:'yes',preserved:'yes',instructionCoverage:'yes',reason:'すべて反映しました'}:result)}}));}
   if(address.endsWith('/img2img')){const body=JSON.parse(String(init?.body));posts.push(body);if(options.failFirst||options.failSecond&&posts.length===2)throw new TypeError('simulated disconnected response');
    let bytes=Buffer.from(body.init_images[0],'base64');if(!options.unchanged && (posts.length===2||options.preservedFirstNo)){bytes=await sharp(bytes).composite([{input:Buffer.from('<svg width="256" height="256"><rect x="65" y="120" width="126" height="90" fill="#cc0000"/><rect x="100" y="135" width="56" height="65" fill="#660000"/></svg>')}]).png().toBuffer();}
    return new Response(JSON.stringify({images:[bytes.toString('base64')]}));}
   throw new Error('Unexpected HTTP request '+address);
  });vi.stubGlobal('fetch',fetcher);return {posts,fetcher};
 }
 const options=async()=>({prompt:request,rootPrompt:request,editInstruction:request,referenceImage:{base64:await picture(),mime:'image/png'},editStrength:.62,headToBodyRatio:3,preserveAppearance:true,webMode:'off' as const});
 it('retries an unchanged completed result once from the original, never from its bad output',async()=>{const state=await engine();const result=await generateImage(await options());expect(state.posts).toHaveLength(2);expect(state.posts[1].init_images).toEqual(state.posts[0].init_images);expect(state.posts[1].mask).toBe(state.posts[0].mask);expect(state.posts[1].denoising_strength).toBeGreaterThan(state.posts[0].denoising_strength);expect(result.changeEvidence?.sufficientChange).toBe(true);expect(result.protectedPixelsPreserved).toBe(true);expect(result.attempts).toBe(2);});
 it('stops after two completed but unchanged candidates, regardless of an all-positive vision result',async()=>{const state=await engine({unchanged:true});const result=await generateImage(await options());expect(state.posts).toHaveLength(2);expect(result.changeEvidence?.sufficientChange).toBe(false);expect(result.notes?.join('')).toContain('十分な変化');});
 it('never automatically replays a POST after a disconnected/ambiguous engine response',async()=>{const state=await engine({failFirst:true});await expect(generateImage(await options())).rejects.toThrow('接続');expect(state.posts).toHaveLength(1);});
 it('keeps the first saved candidate if the optional second attempt fails',async()=>{const state=await engine({failSecond:true});const result=await generateImage(await options());expect(state.posts).toHaveLength(2);expect(result.url).toMatch(/^data:image\/png;base64,/);expect(result.notes?.join('')).toContain('前の候補');});
 it('does not use a blanket yes in place of per-condition comparisons',async()=>{await engine({blanketReview:true,unchanged:true});const result=await generateImage(await options());expect(result.assessment).toBeUndefined();expect(result.notes?.join('')).toContain('一括した成功判定では代用');});
 it('does not increase strength on its own for a deliberately subtle edit',async()=>{const state=await engine({unchanged:true});const input=await options();input.editInstruction='体をほんの少しだけ太くして';await generateImage(input);expect(state.posts).toHaveLength(1);});
 it('keeps the genuinely changed second candidate when its optional AI review fails',async()=>{await engine({secondReviewFails:true});const result=await generateImage(await options());expect(result.changeEvidence?.sufficientChange).toBe(true);expect(result.assessment).toBeUndefined();});
 it('reduces strength if completed comparison indicates lost preserved features',async()=>{const state=await engine({preservedFirstNo:true});await generateImage(await options());expect(state.posts).toHaveLength(2);expect(state.posts[1].denoising_strength).toBeLessThan(state.posts[0].denoising_strength);});
});

import { checkImageEngine, readImageEngineJSON } from '../_core/ImageEngineClient';
describe('engine protocol failures',()=>{
 it('blocks generation when another job is running',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({state:{job_count:1}}))));await expect(checkImageEngine('http://engine.invalid')).rejects.toThrow('別の処理');});
 it('reports VRAM exhaustion separately from a connection failure',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>new Response('CUDA out of memory',{status:500})));await expect(readImageEngineJSON('http://engine.invalid',{method:'POST'})).rejects.toThrow('メモリ');});
 it('rejects non-JSON and oversized engine responses',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>new Response('<html>Error</html>')));await expect(readImageEngineJSON('http://engine.invalid')).rejects.toThrow('JSON');vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}',{headers:{'content-length':'1000'}})));await expect(readImageEngineJSON('http://engine.invalid',{},1000,20)).rejects.toThrow('サイズ');});
});

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { saveChatImage } from './ChatImageStore';
describe('PC streaming chat with actual private-image storage and controlled AI/engine',()=>{
 it('records a failed edit, resumes it through chat, persists output and deduplicates completed sends',async()=>{
  const directory=await mkdtemp(tmpdir()+'/poipoi-image-test-');const cwd=vi.spyOn(process,'cwd').mockReturnValue(directory);
  vi.stubEnv('LOCAL_IMAGE_API_URL','http://engine.invalid');vi.stubEnv('LOCAL_IMAGE_WIDTH','256');vi.stubEnv('LOCAL_IMAGE_HEIGHT','256');
  let disconnect=true;const posts:any[]=[];
  vi.stubGlobal('fetch',vi.fn(async(url:any,init?:RequestInit)=>{
   const address=String(url);
   if(address.includes('/progress'))return new Response(JSON.stringify({state:{job_count:0}}));
   if(address.includes('vision.invalid')){const input=JSON.parse(String(init?.body));return new Response(JSON.stringify({message:{content:JSON.stringify(input.messages[1].images.length===1?plan():review())}}));}
   if(address.endsWith('/img2img')){const body=JSON.parse(String(init?.body));posts.push(body);if(disconnect)throw new TypeError('simulated lost connection');const bytes=await sharp(Buffer.from(body.init_images[0],'base64')).composite([{input:Buffer.from('<svg width="256" height="256"><rect x="65" y="120" width="126" height="90" fill="#660000"/></svg>')}]).png().toBuffer();return new Response(JSON.stringify({images:[bytes.toString('base64')]}));}
   throw new Error('Unexpected HTTP request: '+address);
  }));
  try {
   const { streamingRouter }=await import('../routers.streaming');const {getSharedChatRepository}=await import('../repositories/ChatRepository');
   const ctx=(id:number)=>({user:{id,role:'admin',name:'Test'},req:{headers:{}},res:{}} as any);
   const stream=streamingRouter.createCaller(ctx(990001));const photo=await saveChatImage('990001','original.png',await picture());
   await expect(stream.chat({message:request,conversationId:'private-fixture',messageId:'failed-1',images:[photo.id]})).rejects.toThrow('接続');
   expect(posts).toHaveLength(1);
   const stored=await getSharedChatRepository().getMessages('private-fixture',100);expect(stored[0].content).toBe(request);expect(stored[0].metadata.imageEditAttempt.editInstruction).toBe(request.replace('三頭身','3頭身'));
   disconnect=false;const result=await stream.chat({message:'もう一度生成して',conversationId:'private-fixture',messageId:'retry-1'});
   expect(result.fullText).not.toContain('どの処理');expect(result.metadata?.generated).toBe(true);expect(result.metadata?.sourceImageId).toBe(photo.id);
   const count=posts.length;const again=await stream.chat({message:'もう一度生成して',conversationId:'private-fixture',messageId:'retry-1'});expect(posts).toHaveLength(count);expect(again.messageId).toBe(result.messageId);
   await expect(streamingRouter.createCaller(ctx(990002)).chat({message:request,conversationId:'private-fixture',messageId:'foreign'})).rejects.toThrow('別アカウント');
  } finally {cwd.mockRestore();vi.unstubAllEnvs();await rm(directory,{recursive:true,force:true});}
 });
});

describe('flat-color subject shape growth',()=>{
 it('recognizes connected subject-colored expansion even when old flat pixels stay the same',()=>{
  const width=16,height=16,source=Buffer.alloc(width*height*4,255),output=Buffer.from(source),mask=Buffer.alloc(width*height,255);
  for(let y=4;y<12;y++)for(let x=6;x<10;x++){const o=(y*width+x)*4;source[o]=output[o]=228;source[o+1]=output[o+1]=0;source[o+2]=output[o+2]=0;}
  for(let y=4;y<12;y++)for(let x=4;x<12;x++){const o=(y*width+x)*4;output[o]=228;output[o+1]=0;output[o+2]=0;}
  const evidence=measureImageChange(source,output,mask,width,height,[{label:'body',box:[0,0,1000,1000]}]);
  expect(evidence.regions[0].foregroundChangedFraction).toBe(0);expect(evidence.regions[0].foregroundExpansionPixels).toBe(32);expect(evidence.sufficientChange).toBe(true);
 });
});

describe('transparent source evidence',()=>{
 it('does not mistake transparent background pixels for the original subject',()=>{
  const source=Buffer.alloc(16*16*4),output=Buffer.from(source),mask=Buffer.alloc(256,255);
  for(let y=4;y<12;y++)for(let x=6;x<10;x++){const o=(y*16+x)*4;source[o]=output[o]=228;source[o+3]=output[o+3]=255;}
  for(let i=0;i<256;i++)if(source[i*4+3]===0){output[i*4+2]=255;output[i*4+3]=255;}
  const evidence=measureImageChange(source,output,mask,16,16,[{label:'body',box:[0,0,1000,1000]}]);
  expect(evidence.regions[0].foregroundPixels).toBe(32);expect(evidence.regions[0].changedForegroundPixels).toBe(0);expect(evidence.sufficientChange).toBe(false);
 });
});
