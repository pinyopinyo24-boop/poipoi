import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile, stat, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
const model = vi.hoisted(() => {
  const sourceRoot = process.cwd();
  const fixture = sourceRoot + '/node_modules/.cache/az-pc-test-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  vi.spyOn(process, 'cwd').mockReturnValue(fixture);
  return { replies: [] as string[], requests: [] as any[], sourceRoot, fixture };
});
vi.mock('../_core/llm', () => ({
  invokeLLM: vi.fn(async (request: any) => {
    model.requests.push(structuredClone(request));
    const content = model.replies.shift();
    if (content === undefined) throw new Error('Unplanned AI invocation in verification');
    return { choices: [{ message: { content } }], model: 'controlled-test-model', usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } };
  }),
  listLLMModels: vi.fn(async () => ({ data: [] })),
}));
import { streamingRouter } from '../routers.streaming';
import { chatRouter } from '../routers.chat';
import { unifiedToolsRouter } from '../routers/unifiedTools';
import { getSharedChatRepository } from '../repositories/ChatRepository';
import { PoiPoiIdentity } from '../core/PoiPoiIdentity';
import { searchUserPoiPoiMemories, getUserPoiPoiUnifiedState } from '../core/PoiPoiUnifiedStateStore';
import { readCodePreview } from '../core/CodePreviewStore';
import { createPDFParser } from '../managers/services/PDFParser';
import ExcelJS from 'exceljs';
import { createRequire } from 'node:module';
const requireHere = createRequire(import.meta.url);
const JSZip = createRequire(requireHere.resolve('pptxgenjs'))('jszip');
const ctx = (id: number, role = 'admin') => ({ user: { id, role, name: 'Verification' }, req: { headers: {} }, res: {} } as any);
let user = 800000;
beforeAll(async () => {
  for (const relative of ['server/core/PoipoiEvolutionTestTarget.ts', 'client/src/App.tsx', 'server/routers.ts']) {
    const target = model.fixture + '/' + relative;
    await mkdir(target.slice(0, target.lastIndexOf('/')), { recursive: true });
    await copyFile(model.sourceRoot + '/' + relative, target);
  }
  await writeFile(model.fixture + '/package.json', '{"dependencies":{}}');
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ models: [{ name: 'qwen2.5-coder:7b' }] }) })));
});
afterAll(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await rm(model.fixture, { recursive: true, force: true }); });
beforeEach(() => { model.replies.length = 0; model.requests.length = 0; user++; });
const finish = (answer: string) => JSON.stringify({ type: 'finish', answer, needsInput: false });
const next = (tool: string, args: unknown) => JSON.stringify({ type: 'tool', tool, args });

// Only the model is controlled. Persistence, routing, tools and file parsers are real.
describe('AZ PC integration with controlled model responses', () => {
  it('routes PC streaming through AZ with real conversation history and one stored copy per message ID', async () => {
    const stream = streamingRouter.createCaller(ctx(user)); const conversationId = 'verify-' + randomUUID();
    model.replies.push('最初の回答', '続きの回答');
    await stream.chat({ message: '合言葉は青空です', messageId: 'first', conversationId });
    const response = await stream.chat({ message: 'それは？', messageId: 'second', conversationId });
    expect(response.fullText).toBe('続きの回答');
    expect(model.requests[1].messages.some((m: any) => m.content === '合言葉は青空です')).toBe(true);
    expect(model.requests[1].messages.some((m: any) => m.content === '最初の回答')).toBe(true);
    expect(model.requests[1].messages.some((m: any) => m.role === 'system' && m.content.includes('AIコアAZ'))).toBe(true);
    const duplicate = await stream.chat({ message: 'それは？', messageId: 'second', conversationId });
    expect(duplicate.fullText).toBe('続きの回答');
    expect(model.requests).toHaveLength(2);
    expect(await getSharedChatRepository().getMessages(conversationId, 100)).toHaveLength(4);
  });
  it('persists user and AI names separately and reads them through the normal PC path', async () => {
    const stream = streamingRouter.createCaller(ctx(user)); const conversationId = 'verify-' + randomUUID();
    await stream.chat({ message: '私の名前は太郎です', conversationId });
    await stream.chat({ message: 'あなたの名前を葉月にして', conversationId });
    expect((await stream.chat({ message: '私の名前は？', conversationId })).fullText).toContain('太郎');
    expect((await stream.chat({ message: 'あなたの名前は？', conversationId })).fullText).toContain('葉月');
    expect(PoiPoiIdentity.getSystemPrompt(String(user))).toContain('葉月');
    expect(PoiPoiIdentity.getSystemPrompt(String(user))).toContain('太郎');
  });
  it('keeps a name-recall request from overwriting the stored user name', async () => {
    const stream = streamingRouter.createCaller(ctx(user)); const conversationId = 'verify-' + randomUUID();
    await stream.chat({ message: '私の名前は太郎です', conversationId });
    model.replies.push('あなたの名前は太郎です');
    const response = await stream.chat({ message: '私の名前を教えて', conversationId });
    expect(response.fullText).toContain('太郎');
    expect(PoiPoiIdentity.getUserName(String(user))).toBe('太郎');
  });
  it('stores explicit corrections, prefers them on recall and isolates accounts', async () => {
    const stream = streamingRouter.createCaller(ctx(user)); const conversationId = 'verify-' + randomUUID();
    model.replies.push('棚番号はBです', '訂正を記憶しました');
    await stream.chat({ message: '倉庫の棚番号について', conversationId });
    await stream.chat({ message: '正しくは、倉庫の棚番号はAです', conversationId });
    const found = await searchUserPoiPoiMemories(String(user), '倉庫の棚番号について', 10);
    expect(found[0].id).toMatch(/^correction-/);
    expect(found[0].value).toContain('棚番号はA');
    expect(await searchUserPoiPoiMemories(String(user + 900), '倉庫の棚番号', 10)).toHaveLength(0);
    model.replies.push('Aです');
    await stream.chat({ message: '倉庫の棚番号をもう一度', conversationId: 'verify-' + randomUUID() });
    expect(JSON.stringify(model.requests.at(-1).messages)).toContain('棚番号はA');
  });
  it('runs multiple real business tools and carries the first result to the next model decision', async () => {
    const stream = streamingRouter.createCaller(ctx(user));
    model.replies.push(
      next('saveManufacturing', { itemId: 'verification-part', estimatedUnitCost: 100, actualUnitCost: 120, quantity: 10 }),
      next('listManufacturing', {}),
      next('analyzeManufacturing', { estimatedUnitCost: 100, actualUnitCost: 120, quantity: 10 }),
      finish('製造記録を保存し、総差異200円の不利差異を確認しました'),
    );
    const response = await stream.chat({ message: '製造記録を登録して、一覧を確認し、原価差異も計算して', conversationId: 'verify-' + randomUUID() });
    const task = (response as any).metadata.task;
    expect(task.status).toBe('completed');
    expect(task.steps.map((s: any) => s.status)).toEqual(['completed', 'completed', 'completed']);
    expect(task.steps[2].result.totalVariance).toBe(200);
    expect(task.steps[2].result.varianceType).toBe('unfavorable');
    expect(model.requests[1].messages.some((message: any) => message.content.includes('"saved":true'))).toBe(true);
    expect((await getUserPoiPoiUnifiedState(String(user))).records.some(r => r.id.startsWith('manufacturing-'))).toBe(true);
  });
  it('enforces read-only requests even if the model tries to save a record', async () => {
    const stream = streamingRouter.createCaller(ctx(user));
    model.replies.push(next('saveManufacturing', { itemId: 'forbidden', estimatedUnitCost: 1, actualUnitCost: 2, quantity: 3 }), JSON.stringify({ type: 'finish', answer: '保存せず確認しました', needsInput: true }));
    await stream.chat({ message: '製造の確認だけ。保存しない', conversationId: 'verify-' + randomUUID() });
    expect((await getUserPoiPoiUnifiedState(String(user))).records.some(r => r.id.startsWith('manufacturing-'))).toBe(false);
  });
  it('distinguishes unit prices from totals in deterministic cost calculations', async () => {
    const tools = unifiedToolsRouter.createCaller(ctx(user));
    expect(await tools.analyzeCost({ estimated: 100, actual: 120, quantity: 10 })).toMatchObject({ totalVariance: 200, perUnitVariance: 20, inputBasis: 'unit' });
    expect(await tools.analyzeCost({ estimated: 1000, actual: 1200, quantity: 10, inputBasis: 'total' })).toMatchObject({ totalVariance: 200, perUnitVariance: 20 });
  });
  it('creates, downloads, reopens and analyzes a real Excel file while preserving its source', async () => {
    const tools = unifiedToolsRouter.createCaller(ctx(user));
    const created = await tools.createWorkbook({ title: 'verification', sheets: [{ name: '原価', cells: [
      { address: 'A1', value: '品番' }, { address: 'B1', value: '数量' }, { address: 'A2', value: 'P1' }, { address: 'B2', value: 10 },
    ] }] });
    const original = await tools.exportDocument({ file: created.file, type: 'xlsx' });
    const modified = await tools.createWorkbook({ title: 'copy', sourceFile: created.file, sheets: [{ name: '原価', cells: [{ address: 'B2', value: 20 }] }] });
    expect(modified.file).not.toBe(created.file);
    expect((await tools.exportDocument({ file: created.file, type: 'xlsx' })).base64).toBe(original.base64);
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from((await tools.exportDocument({ file: modified.file, type: 'xlsx' })).base64, 'base64'));
    expect(workbook.getWorksheet('原価')!.getCell('B2').value).toBe(20);
    expect((await tools.excel({ file: modified.file })).sheets[0].rows).toBe(1);
    await expect(unifiedToolsRouter.createCaller(ctx(user + 900)).exportDocument({ file: created.file, type: 'xlsx' })).rejects.toThrow();
  });
  it('creates a real Japanese PDF that the configured PDF parser can read', async () => {
    const tools = unifiedToolsRouter.createCaller(ctx(user));
    const result = await tools.createPDFReport({ title: '原価報告', paragraphs: ['総差異200円。不利差異です。', '次の対応を検討します。'] });
    const output = await tools.exportDocument({ file: result.file, type: 'pdf' });
    const parser = createPDFParser(new Uint8Array(Buffer.from(output.base64, 'base64')));
    try { const text = await parser.getText(); expect(text.total).toBe(1); expect(text.text).toContain('原価報告'); expect(text.text).toContain('総差異200円');
      expect((await tools.pdf({ file: result.file })).text).toContain('総差異200円');
    }
    finally { await parser.destroy(); }
  });
  it('creates a real PPTX, checks its ZIP contents and downloads the owned artifact', async () => {
    const tools = unifiedToolsRouter.createCaller(ctx(user));
    model.replies.push(JSON.stringify({ slides: [{ title: '原価差異', content: '不利差異200円。見積り条件を検討する。' }] }));
    const result = await tools.createPresentationFromAnalysis({ title: '検証', analysis: '見積単価100円、実際単価120円、数量10個。不利差異200円。' });
    const bytes = Buffer.from((await tools.exportPresentation({ id: result.id })).base64, 'base64');
    const zip = await JSZip.loadAsync(bytes);
    const slide = await zip.file('ppt/slides/slide1.xml')!.async('string');
    expect(slide).toContain('原価差異'); expect(slide).toContain('200円');
    await expect(unifiedToolsRouter.createCaller(ctx(user + 900)).exportPresentation({ id: result.id })).rejects.toThrow();
  });
  it('generates and persists a new-source preview without creating or applying the source file', async () => {
    const tools = unifiedToolsRouter.createCaller(ctx(user));
    const sourcePath = 'server/core/AZVerificationFeature.ts';
    model.replies.push('新規関数を追加する変更案', JSON.stringify({ changes: [{ path: sourcePath, content: 'export const verificationFeature = 1;\n' }] }));
    const preview = await tools.codePreview({ request: 'プログラムの機能として検証用関数を新規作成して' });
    expect(preview.applied).toBe(false); expect(preview.tested).toBe(false);
    expect(preview.changes[0]).toMatchObject({ operation: 'create', baseHash: null, path: sourcePath });
    expect((await readCodePreview(String(user), preview.previewId)).changes[0].content).toContain('verificationFeature');
    await expect(stat(model.fixture + '/' + sourcePath)).rejects.toThrow();
    await expect(unifiedToolsRouter.createCaller(ctx(user + 900)).getCodePreview({ previewId: preview.previewId })).rejects.toThrow();
    await tools.rejectCodePreview({ previewId: preview.previewId });
    await expect(tools.applyCodePreview({ previewId: preview.previewId, confirm: 'APPLY_ONLY' })).rejects.toThrow();
    await expect(stat(model.fixture + '/' + sourcePath)).rejects.toThrow();
  });
  it('keeps an explicit one-file reference small and gives coder requests their own bounded timeout', async () => {
    const tools = unifiedToolsRouter.createCaller(ctx(user));
    const target = 'server/core/CompactPreview.ts';
    model.replies.push('Create only the requested standalone module.', JSON.stringify({ changes: [{ path: target, content: 'export const compact = 1;\n' }] }));
    const preview = await tools.codePreview({ request: 'Using server/core/PoipoiEvolutionTestTarget.ts as reference, create only ' + target + '. Do not modify existing files.' });
    expect(preview.changes[0].path).toBe(target);
    expect(model.requests[0]).toMatchObject({ timeoutMs: 300000, contextWindow: 8192, max_tokens: 256 });
    expect(model.requests[1]).toMatchObject({ timeoutMs: 300000, contextWindow: 8192 });
    const prompt = model.requests[1].messages.find((message: any) => message.role === 'user').content;
    expect(prompt.length).toBeLessThan(6000);
    expect(prompt).toContain('Existing source: server/core/PoipoiEvolutionTestTarget.ts');
    expect(prompt).not.toContain('Existing source: client/src/App.tsx');
    expect(prompt).not.toContain('Existing source: server/routers.ts');
    expect(await readFile(model.fixture + '/server/core/PoipoiEvolutionTestTarget.ts', 'utf8')).not.toContain('compact');
    await tools.rejectCodePreview({ previewId: preview.previewId });
  });
  it('reserves context for returning a complete existing source file', async () => {
    const tools = unifiedToolsRouter.createCaller(ctx(user));
    const target = 'server/core/LargePreview.ts';
    const source = 'export const large = 1;\n' + '// source context line\n'.repeat(1000);
    await writeFile(model.fixture + '/' + target, source);
    model.replies.push('Preserve the source and add one comment.', JSON.stringify({ changes: [{ path: target, content: source + '\n// proposed only\n' }] }));
    const preview = await tools.codePreview({ request: 'Modify ' + target + ' by adding a comment, preserving its complete existing content.' });
    expect(model.requests[1].contextWindow).toBe(32768);
    expect(preview.changes[0].previousContent).toBe(source);
    expect(await readFile(model.fixture + '/' + target, 'utf8')).toBe(source);
    await tools.rejectCodePreview({ previewId: preview.previewId });
  });
  it('returns actual before/after text and a matching source hash for an existing-file preview', async () => {
    const tools = unifiedToolsRouter.createCaller(ctx(user)); const sourcePath = 'server/core/PoipoiEvolutionTestTarget.ts';
    const source = await readFile(model.fixture + '/' + sourcePath, 'utf8');
    model.replies.push('最小変更案', JSON.stringify({ changes: [{ path: sourcePath, content: source + '\n// verification proposal only\n' }] }));
    const preview = await tools.codePreview({ request: sourcePath + ' のプログラムにコメントを追加する変更案' });
    expect(preview.changes[0].baseHash).toBe(createHash('sha256').update(source).digest('hex'));
    expect(preview.changes[0].previousContent).toBe(source);
    expect(await readFile(model.fixture + '/' + sourcePath, 'utf8')).toBe(source);
    await tools.rejectCodePreview({ previewId: preview.previewId });
  });
  it('rejects unauthenticated tools and a non-admin source preview', async () => {
    await expect(unifiedToolsRouter.createCaller({ ...ctx(user), user: null }).analyzeCost({ estimated: 1, actual: 2, quantity: 1 })).rejects.toThrow();
    await expect(unifiedToolsRouter.createCaller(ctx(user, 'user')).codePreview({ request: 'プログラム修正' })).rejects.toThrow('Administrator');
  });
  it('requires explicit confirmation and removes an owned conversation and messages', async () => {
    const caller = chatRouter.createCaller(ctx(user));
    const session = await caller.createSession({ userId: String(user), title: 'Delete fixture' });
    const repository = getSharedChatRepository();
    await repository.saveMessage({ id: randomUUID(), userId: String(user), role: 'user', content: 'temporary', timestamp: Date.now() }, session.id);
    await expect(caller.deleteSession({ userId: String(user), sessionId: session.id })).rejects.toThrow('not approved');
    expect(await repository.getSession(session.id)).not.toBeNull();
    await expect(chatRouter.createCaller(ctx(user + 900)).deleteSession({ userId: String(user), sessionId: session.id, confirm: 'DELETE_SESSION' })).rejects.toThrow();
    expect(await repository.getSession(session.id)).not.toBeNull();
    expect(await caller.deleteSession({ userId: String(user), sessionId: session.id, confirm: 'DELETE_SESSION' })).toEqual({ success: true });
    expect(await repository.getSession(session.id)).toBeNull();
    expect(await repository.getMessages(session.id)).toEqual([]);
    expect(await caller.deleteSession({ userId: String(user), sessionId: session.id, confirm: 'DELETE_SESSION' })).toEqual({ success: true });
  });
  it('cleans up an anonymous verification conversation only after explicit confirmation', async () => {
    const guest = chatRouter.createCaller({ ...ctx(user), user: null });
    const session = await guest.createSession({ userId: 'mobile', title: 'Verification fixture' });
    expect(await guest.deleteSession({ userId: 'mobile', sessionId: session.id, confirm: 'DELETE_SESSION' })).toEqual({ success: true });
    expect(await getSharedChatRepository().getSession(session.id)).toBeNull();
  });
  it('blocks reading another account conversation via the PC bridge', async () => {
    const id = 'verify-' + randomUUID();
    await streamingRouter.createCaller(ctx(user)).chat({ conversationId: id, message: '私の名前は太郎です' });
    await expect(streamingRouter.createCaller(ctx(user + 900)).chat({ conversationId: id, message: '続き' })).rejects.toThrow('別アカウント');
  });
});
