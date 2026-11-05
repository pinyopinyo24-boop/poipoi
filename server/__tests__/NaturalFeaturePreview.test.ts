import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';

const model = vi.hoisted(() => {
  const root = process.cwd() + '/node_modules/.cache/natural-feature-' + Date.now();
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  return { root, replies: [] as Array<string | ((request: any) => string)>, requests: [] as any[] };
});
// Controlled model output tests routing/grounding, not live model capability.
vi.mock('../_core/llm', () => ({
  invokeLLM: vi.fn(async (request: any) => {
    model.requests.push(request);
    const reply = model.replies.shift();
    const content = typeof reply === 'function' ? reply(request) : reply;
    if (content === undefined) throw new Error('Unexpected model invocation');
    return { choices: [{ message: { content } }] };
  }), listLLMModels: vi.fn(async () => ({ data: [] })),
}));
// This suite controls the generation runner to check routing/context. Detached
// execution and persistence are covered by CodeGenerationWorker.integration.test.
vi.mock('../core/CodeGenerationWorker', () => ({ queueCodeGeneration: async (userId: string, task: string, sessionId: string) => {
  const { PoipoiCodeAgent } = await import('../core/PoipoiCodeAgent');
  const { createCodePreview } = await import('../core/CodePreviewStore');
  return createCodePreview(userId, await PoipoiCodeAgent.getInstance().generate(task, userId), sessionId);
} }));
vi.mock('../core/AZWebKnowledge', () => ({
  webResearchQuery: () => '', researchForAZ: vi.fn(), webResearchContext: () => '',
}));
vi.mock('../_core/ai/ConversationModel', () => ({ conversationModel: async () => 'qwen2.5:7b' }));
import { streamingRouter } from '../routers.streaming';
import { PoipoiCodeAgent } from '../core/PoipoiCodeAgent';
import { readCodePreview } from '../core/CodePreviewStore';
import { isCodeImplementationRequest, implementationPrompt } from '../core/AZCapabilityCatalog';
import { understandConversationTurn } from '../core/AZConversationUnderstanding';

const page = 'client/src/pages/StreamingChat.tsx';
const modulePath = 'client/src/components/CharacterCount.tsx';
const imports = 'import { useState } from "react";\nimport { Input } from "@/components/ui/input";';
const input = '<Input value={input} onChange={event => setInput(event.target.value)} />';
const original = imports + '\n' + '// Existing unrelated code and comments remain intact.\n'.repeat(260) +
  '\nexport default function StreamingChat() {\nconst [input, setInput] = useState("");\nreturn (\n<div>\n' + input + '\n</div>\n);\n}\n';
const component = 'export function CharacterCount({ text }: { text: string }) { return <output>{[...text].length}文字</output>; }';
const unconnected = JSON.stringify({ changes: [{ path: modulePath, content: component }] });
const connected = JSON.stringify({ changes: [
  { path: page, edits: [
    { oldText: imports, newText: imports + '\nimport { CharacterCount } from "../components/CharacterCount";' },
    { oldText: input, newText: input + '\n<CharacterCount text={input} />' },
  ] }, { path: modulePath, content: component },
] });
const accepted = JSON.stringify({ accepted: true, issues: [] });
const request = 'AIチャットの入力欄に文字数カウント機能を追加して。入力した文字数を表示して。';
const context = (role = 'admin') => ({ user: { id: 771, role, name: 'Feature fixture' }, req: { headers: {} }, res: {} }) as any;

beforeAll(() => {
  for (const dir of ['client/src/pages', 'client/src/components', 'server/core'])
    mkdirSync(model.root + '/' + dir, { recursive: true });
  writeFileSync(model.root + '/package.json', '{"dependencies":{"react":"19"}}');
  writeFileSync(model.root + '/' + page, original);
  writeFileSync(model.root + '/client/src/App.tsx', 'import StreamingChat from "./pages/StreamingChat";\nexport default function App() { return <StreamingChat />; }');
  writeFileSync(model.root + '/client/src/pages/Home.tsx', 'export default function Home() { return <main>Home</main>; }');
});
beforeEach(() => { model.replies.length = 0; model.requests.length = 0; });
afterAll(() => { vi.restoreAllMocks(); rmSync(model.root, { recursive: true, force: true }); });

describe('new feature requests without source paths through the actual PC chat route', () => {
  it('rejects the observed function-header replacement before it strands the original ownership checks', async () => {
    const target = 'server/core/UploadCopy.ts';
    const header = 'async function resolveUpload(file: string, userId: string): Promise<string> {';
    const source = header + '\n  if (userId !== file) throw new Error("Not owned");\n  return file;\n}\n';
    const addition = 'export function copyCD() { return "draft"; }\n';
    writeFileSync(model.root + '/' + target, source);
    model.replies.push(JSON.stringify({ changes: [{ path: target, edits: [{ oldText: header,
      newText: header + '\n  return file;\n}\n' + addition }] }] }), call => {
        expect(call.messages.at(-1).content).toContain('Partial function declaration edit is forbidden');
        return JSON.stringify({ changes: [{ path: target, edits: [{ oldText: source, newText: source + addition }] }] });
      }, accepted);
    try {
      const candidate = vi.fn();
      const changes = await PoipoiCodeAgent.getInstance().generate(target + 'に関数を追加して。既存機能は残して。', '771', { onCandidate: candidate });
      expect(changes[0].content).toBe(source + addition);
      expect(candidate).toHaveBeenCalledTimes(1);
      expect(candidate.mock.calls[0][1]).toEqual([]);
      expect(readFileSync(model.root + '/' + target, 'utf8')).toBe(source);
    } finally { rmSync(model.root + '/' + target, { force: true }); }
  });
  it('repairs a malformed new module without regenerating its valid UI integration', async () => {
    const malformed = JSON.parse(connected);
    malformed.changes[1].content = component + '\n}';
    model.replies.push(JSON.stringify(malformed), JSON.stringify({ edits: [{ oldText: '\n}', newText: '' }] }), accepted);
    const changes = await PoipoiCodeAgent.getInstance().generate(request, '771');
    expect(changes.find(change => change.path === modulePath)?.content).toBe(component);
    expect(changes.find(change => change.path === page)?.content).toContain('<CharacterCount text={input} />');
    expect(model.requests).toHaveLength(3);
    expect(model.requests[1].messages[0].content).toContain('Fix ONLY the reported TypeScript syntax errors');
    expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(original);
    expect(existsSync(model.root + '/' + modulePath)).toBe(false);
  });
  it('repairs syntax only within an introduced span of an existing file', async () => {
    const target = 'server/core/ExistingCopy.ts';
    const source = 'export const current = 1;\n';
    const addition = 'export function copy() { return true; }\n}\n';
    writeFileSync(model.root + '/' + target, source);
    model.replies.push(JSON.stringify({ changes: [{ path: target, content: source + addition }] }),
      JSON.stringify({ edits: [{ oldText: '\n}\n', newText: '\n' }] }), accepted);
    try {
      const changes = await PoipoiCodeAgent.getInstance().generate(target + 'にcopy関数を追加して', '771');
      expect(changes[0].content).toBe(source + 'export function copy() { return true; }\n');
      expect(model.requests).toHaveLength(3);
      expect(JSON.parse(model.requests[1].messages[1].content).introducedSource).toContain('}\n');
      expect(readFileSync(model.root + '/' + target, 'utf8')).toBe(source);
    } finally { rmSync(model.root + '/' + target, { force: true }); }
  });
  it('reads an existing integration file before regenerating a proposed edit to it', async () => {
    const target = 'server/core/AZConversationUnderstanding.ts';
    writeFileSync(model.root + '/' + target, 'export const value = 1;\n');
    const draft = JSON.stringify({ changes: [{ path: target, edits: [{ oldText: 'export const value = 1;', newText: 'export const value = 2;' }] }] });
    model.replies.push(draft, draft, accepted);
    try {
      const changes = await PoipoiCodeAgent.getInstance().generate('値を更新して', '771');
      expect(changes).toMatchObject([{ path: target, content: 'export const value = 2;\n' }]);
      expect(JSON.stringify(model.requests[0].messages)).not.toContain('Existing source: ' + target);
      expect(JSON.stringify(model.requests[1].messages)).toContain('Existing source: ' + target);
      expect(readFileSync(model.root + '/' + target, 'utf8')).toBe('export const value = 1;\n');
    } finally { rmSync(model.root + '/' + target, { force: true }); }
  });
  it('shows an omitted existing source range before regenerating its edit', async () => {
    const target = 'server/core/AZConversationUnderstanding.ts';
    const marker = 'export const answer = 1;';
    const originalSource = 'export const start = true;\n' + '// contextual source padding\n'.repeat(650) + marker + '\n';
    writeFileSync(model.root + '/' + target, originalSource);
    const draft = JSON.stringify({ changes: [{ path: target, edits: [
      { oldText: marker, newText: 'export const answer = 2;' },
    ] }] });
    model.replies.push(draft, draft, accepted);
    try {
      const changes = await PoipoiCodeAgent.getInstance().generate(target + ' の値を更新して', '771');
      expect(changes[0].content).toBe(originalSource.replace(marker, 'export const answer = 2;'));
      expect(JSON.stringify(model.requests[0].messages)).not.toContain(marker);
      expect(JSON.stringify(model.requests[1].messages)).toContain(marker);
      expect(model.requests).toHaveLength(3);
      expect(readFileSync(model.root + '/' + target, 'utf8')).toBe(originalSource);
    } finally { rmSync(model.root + '/' + target, { force: true }); }
  });
  it('bounds requirement review and reports an inconclusive result without applying code', async () => {
    model.replies.push(connected, () => { throw new Error('Local AI request timed out'); });
    const onReviewWarning = vi.fn();
    const changes = await PoipoiCodeAgent.getInstance().generate(request, '771', { onReviewWarning });
    expect(changes).toHaveLength(2);
    expect(model.requests[1].timeoutMs).toBe(180000);
    expect(model.requests[1].model).toBe('qwen2.5-coder:7b');
    expect(onReviewWarning).toHaveBeenCalledWith(expect.stringContaining('正しさは未確認'));
    expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(original);
    expect(existsSync(model.root + '/' + modulePath)).toBe(false);
  });
  it('grounds a new screen in the application route and home instead of the chat page', async () => {
    const newScreenRequest = '新しい部品登録画面を作って。品番と名前を入力して保存し、同じ品番は重複登録しない。';
    model.replies.push(unconnected, unconnected);
    await expect(PoipoiCodeAgent.getInstance().generate(newScreenRequest))
      .rejects.toThrow('組み込まれていません');
    const first = JSON.stringify(model.requests[0].messages);
    expect(first).toContain('Existing source: client/src/App.tsx');
    expect(first).toContain('Existing source: client/src/pages/Home.tsx');
    expect(first).not.toContain('Existing source: client/src/pages/StreamingChat.tsx');
    expect(first).toContain('implement the actual storage path');
    expect(JSON.stringify(model.requests[1].messages)).toContain('register its route');
    expect(model.requests).toHaveLength(2);
  });
  it('routes an explicit application creation request to a code preview without waiting for intent classification', async () => {
    const result = await understandConversationTurn('771', 'new-app', '新しいアプリを作って。', []);
    expect(result).toMatchObject({ domain: 'code', execute: true, resolvedRequest: '新しいアプリを作って。' });
    expect(model.requests).toHaveLength(0);
  });
  it('keeps an action request actionable when the last sentence only states a constraint', async () => {
    model.replies.push(JSON.stringify({ domain: 'code', act: 'request', newTask: true, target: -1,
      goal: '新しい計算器を作る', conditions: ['既存結果は残す'], replaceConditions: [], question: '', confidence: 0.95 }));
    const request = '新しい計算器を作って。既存の計算結果は残して。';
    const result = await understandConversationTurn('771', 'screen-with-constraint', request, []);
    expect(result).toMatchObject({ domain: 'code', execute: true, resolvedRequest: request });
    expect(model.requests).toHaveLength(1);
  });
  it('treats a local negative rule as a requirement rather than canceling the entire creation request', async () => {
    const request = '新しい部品登録画面を作って。品番と名前を入力して保存し、同じ品番は重複登録しない。';
    const result = await understandConversationTurn('771', 'new-form', request, []);
    expect(result).toMatchObject({ domain: 'code', execute: true, readOnly: false, resolvedRequest: request });
    expect(model.requests).toHaveLength(0);
    expect(isCodeImplementationRequest('画面の画像を作って。')).toBe(false);
    expect(isCodeImplementationRequest('アプリを作れる？')).toBe(false);
  });
  it('resolves a follow-up code change against the earlier task and preserves its constraints', async () => {
    const earlier = 'チャットの検索機能を追加して。' + '検索対象の詳細。'.repeat(450) + '最後の検索条件を残す。';
    const turns = [
      { id: 'u1', userId: '771', role: 'user' as const, content: earlier, timestamp: 1 },
      { id: 'a1', userId: '771', role: 'assistant' as const, content: '変更案を作成しました。', timestamp: 2,
        metadata: { understanding: { domain: 'code', goal: earlier.slice(0, 1000), constraints: ['既存履歴は残す'] },
          codePreview: { request: earlier } } },
    ];
    const result = await understandConversationTurn('771', 'follow-up', 'その機能にタイトル検索も追加して。', turns);
    expect(result).toMatchObject({ domain: 'code', newTask: false, execute: true, targetMessageIds: ['a1'] });
    expect(result.resolvedRequest).toContain(earlier);
    expect(result.resolvedRequest).toContain('最後の検索条件を残す。');
    expect(result.resolvedRequest).toContain('その機能にタイトル検索も追加して。');
    expect(model.requests).toHaveLength(0);
  });
  it('does not reuse a code proposal after an unrelated task intervenes', async () => {
    const turns = [
      { id: 'a1', userId: '771', role: 'assistant' as const, content: '変更案を作成しました。', timestamp: 1,
        metadata: { codePreview: { request: 'チャット履歴を検索する機能を追加して。' }, understanding: { domain: 'code' } } },
      { id: 'a2', userId: '771', role: 'assistant' as const, content: '予定を確認しました。', timestamp: 2,
        metadata: { understanding: { domain: 'schedule', goal: '予定確認', constraints: [] } } },
    ];
    model.replies.push(JSON.stringify({ domain: 'code', act: 'question', newTask: true, target: -1,
      goal: '対象の機能を確認する', conditions: [], replaceConditions: [], question: 'どの機能を変更しますか？', confidence: 0.6 }));
    const result = await understandConversationTurn('771', 'ambiguous-follow-up', 'その機能に検索を追加して。', turns);
    expect(result.needsClarification).toBe(true);
    expect(result.resolvedRequest).not.toContain('チャット履歴を検索する機能');
    expect(model.requests).toHaveLength(1);
  });
  it('passes a long natural-language code request to the existing segmented generator', async () => {
    const request = '新しい機能を追加して。' + '詳しい動作と制約。'.repeat(450) + '機能を追加して。';
    const result = await understandConversationTurn('771', 'long-request', request, []);
    expect(result).toMatchObject({ domain: 'code', act: 'request', execute: true, needsClarification: false });
    expect(result.resolvedRequest).toBe(request);
    expect(implementationPrompt(result.resolvedRequest, [])).toContain(request);
    expect(model.requests).toHaveLength(0);
  });
  it('reports the real storage limit before starting a code job', async () => {
    const request = '新しい機能を追加して。' + '仕様'.repeat(30000) + '機能を追加して。';
    const result = await understandConversationTurn('771', 'oversized-request', request, []);
    expect(result.needsClarification).toBe(true);
    expect(result.question).toContain('60000文字');
    expect(model.requests).toHaveLength(0);
  });
  it('stores a long feature request and sends verified smaller requirement segments before code generation', async () => {
    const target = 'server/core/LongFeature.ts';
    const leading = `Create exactly one NEW standalone file ${target}. Reference client/src/App.tsx only.`;
    const trailing = 'Export identity(input: string) returning the same input.';
    const request = leading + ' '.repeat(3300) + trailing;
    const warning = vi.fn();
    model.replies.push(
      JSON.stringify({ requirements: [leading] }),
      JSON.stringify({ requirements: [trailing] }),
      JSON.stringify({ changes: [{ path: target, content: 'export const identity = (input: string) => input;' }] }),
      accepted,
    );
    const changes = await PoipoiCodeAgent.getInstance().generate(implementationPrompt(request, []), 'system', { onReviewWarning: warning });
    expect(changes).toHaveLength(1);
    expect(changes[0].path).toBe(target);
    expect(model.requests).toHaveLength(4);
    expect(model.requests.map(call => call.model)).toEqual([
      'qwen2.5:7b', 'qwen2.5:7b', 'qwen2.5-coder:7b', 'qwen2.5-coder:7b',
    ]);
    expect(model.requests[0].messages.at(-1).content).toContain(leading);
    expect(model.requests[1].messages.at(-1).content).toContain(trailing);
    expect(model.requests[2].messages.at(-1).content).toContain(trailing);
    expect(JSON.stringify(model.requests[2].messages).length).toBeLessThan(20000);
    expect(warning).toHaveBeenCalledOnce();
    expect(existsSync(model.root + '/' + target)).toBe(false);
  });
  it('does not generate or apply from a long request when a segment cannot be tied to its original text', async () => {
    const request = 'Create a standalone program. Reference client/src/App.tsx. ' + ' '.repeat(3100) + 'Export a function.';
    model.replies.push(JSON.stringify({ requirements: ['A requirement not in the request'] }));
    await expect(PoipoiCodeAgent.getInstance().generate(implementationPrompt(request, [])))
      .rejects.toThrow('原文と照合できませんでした');
    expect(model.requests).toHaveLength(1);
  });
  it('keeps a large reviewed source bounded and lets the coder request more ranges without losing the full file for reconstruction', async () => {
    const file = 'server/core/LargeFeature.ts';
    const lines = Array.from({ length: 650 }, (_, index) => `export const item${index} = ${index};`);
    const originalLarge = lines.join('\n') + '\n';
    writeFileSync(model.root + '/' + file, originalLarge);
    try {
      model.replies.push(
        JSON.stringify({ changes: [], readFiles: [{ path: file, startLine: 500, endLine: 505 }] }),
        JSON.stringify({ changes: [], readFiles: [{ path: file, startLine: 600, endLine: 605 }] }),
        JSON.stringify({ changes: [{ path: file, edits: [{ oldText: 'export const item600 = 600;', newText: 'export const item600 = 601;' }] }] }),
        accepted,
      );
      const changes = await PoipoiCodeAgent.getInstance().generate(`Modify ${file} after reviewing item600. Preserve all other exports.`);
      expect(changes[0].content).toBe(originalLarge.replace('export const item600 = 600;', 'export const item600 = 601;'));
      expect(model.requests[0].messages.at(-1).content).toContain('Omitted source ranges');
      expect(model.requests[2].messages.at(-1).content).toContain('export const item600 = 600;');
      expect(model.requests.slice(0, 3).every(call => JSON.stringify(call.messages).length < 20000)).toBe(true);
      expect(readFileSync(model.root + '/' + file, 'utf8')).toBe(originalLarge);
    } finally { rmSync(model.root + '/' + file, { force: true }); }
  });
  it('grounds a different natural UI feature in the existing page without a character-count shortcut', async () => {
    const actual = readFileSync(new URL('../../client/src/pages/StreamingChat.tsx', import.meta.url), 'utf8');
    writeFileSync(model.root + '/' + page, actual);
    const anchor = '<span>チャット履歴</span>';
    const id = 'a' + createHash('sha256').update(page + '\n' + anchor).digest('hex').slice(0, 12);
    const addition = '<span>履歴の表示件数</span>';
    try {
      model.replies.push(JSON.stringify({ changes: [{ path: page, edits: [
        { anchorId: id, operation: 'insertAfter', newText: addition },
      ] }] }), accepted);
      const changes = await PoipoiCodeAgent.getInstance().generate('チャット画面の履歴の横に表示件数を追加して。既存機能は残して。');
      expect(changes).toHaveLength(1);
      expect(changes[0].content).toBe(actual.replace(anchor, anchor + '\n' + addition));
      const proposal = model.requests[0];
      expect(proposal.messages.at(-1).content).toContain(anchor);
      expect(JSON.stringify(proposal.messages).length).toBeLessThan(20000);
      expect(proposal.contextWindow).toBe(8192);
      expect(proposal.max_tokens).toBe(2048);
      expect(proposal.response_format.json_schema.schema.properties.changes.items.oneOf[0]
        .properties.edits.items.oneOf.some((item: any) => item.properties.anchorId.enum.includes(id))).toBe(true);
      expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(actual);
    } finally { writeFileSync(model.root + '/' + page, original); }
  });
  it('anchors the quoted history target and never offers an insertion inside the unrelated zero-results expression', async () => {
    const actual = readFileSync(new URL('../../client/src/pages/StreamingChat.tsx', import.meta.url), 'utf8');
    writeFileSync(model.root + '/' + page, actual);
    const history = '<span>チャット履歴</span>';
    const historyId = 'a' + createHash('sha256').update(page + '\n' + history).digest('hex').slice(0, 12);
    const unrelated = '<p>検索結果は0件です</p>';
    const unrelatedId = 'a' + createHash('sha256').update(page + '\n' + unrelated).digest('hex').slice(0, 12);
    try {
      model.replies.push(JSON.stringify({ changes: [{ path: page, edits: [
        { anchorId: historyId, operation: 'insertAfter', newText: '<span>{conversations.length}件</span>' },
      ] }] }), accepted);
      const changes = await PoipoiCodeAgent.getInstance().generate(
        'チャット画面の「チャット履歴」の見出しの横に、保存済み会話の件数を表示する新機能を追加して。0件なら「0件」と表示して。既存機能は残して。');
      const prompt = model.requests[0].messages.at(-1).content;
      const grammar = model.requests[0].response_format.json_schema.schema.properties.changes.items.oneOf[0];
      const ids = grammar.properties.edits.items.oneOf.flatMap((item: any) => item.properties.anchorId.enum);
      expect(prompt).toContain(history);
      expect(ids).toContain(historyId);
      expect(ids).not.toContain(unrelatedId);
      expect(changes[0].content).toContain(history + '\n<span>{conversations.length}件</span>');
      expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(actual);
    } finally { writeFileSync(model.root + '/' + page, original); }
  });
  it('grounds the recycle icon even when an earlier quoted phrase is a chat command', async () => {
    const actual = readFileSync(new URL('../../client/src/pages/StreamingChat.tsx', import.meta.url), 'utf8');
    writeFileSync(model.root + '/' + page, actual);
    const icon = actual.indexOf('♻️');
    const source = actual.slice(actual.lastIndexOf('<button', icon), actual.indexOf('</button>', icon) + '</button>'.length).trim();
    const id = 'a' + createHash('sha256').update(page + '\n' + source).digest('hex').slice(0, 12);
    try {
      model.replies.push(JSON.stringify({ changes: [{ path: page, edits: [
        { anchorId: id, operation: 'insertAfter', newText: '<button type="button">CD</button>' },
      ] }] }), accepted);
      const request = 'チャットで「CDをコピーして」と頼んだときと、リサイクルマーク横にCDマークを追加して同じ画面を開く。';
      const changes = await PoipoiCodeAgent.getInstance().generate(request);
      const prompt = model.requests[0].messages.at(-1).content;
      expect(prompt).toContain(source);
      expect(changes[0].content).toContain(source + '\n<button type="button">CD</button>');
      expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(actual);
    } finally { writeFileSync(model.root + '/' + page, original); }
  });
  it('places a generated CD state hook inside the component and its button beside recycle', async () => {
    const actual = readFileSync(new URL('../../client/src/pages/StreamingChat.tsx', import.meta.url), 'utf8');
    writeFileSync(model.root + '/' + page, actual);
    const importSource = actual.match(/^import .+;$/m)![0];
    const moduleId = 'a' + createHash('sha256').update(page + '\n' + importSource).digest('hex').slice(0, 12);
    const hook = 'const [cdOpen, setCdOpen] = useState(false);';
    const button = '<button type="button" onClick={() => setCdOpen(true)}>CD</button>';
    try {
      model.replies.push(JSON.stringify({ changes: [{ path: page, edits: [
        { anchorId: moduleId, operation: 'insertAfter', newText: hook },
        { anchorId: moduleId, operation: 'insertAfter', newText: button },
      ] }] }), accepted);
      const changes = await PoipoiCodeAgent.getInstance().generate(
        'リサイクルマーク横にCDボタンを追加し、クリックでCD画面を開く。', 'system');
      const source = changes[0].content;
      expect(source.indexOf(hook)).toBeGreaterThan(source.indexOf('export default function StreamingChat()'));
      expect(source.indexOf(hook)).toBeLessThan(source.indexOf('  return ('));
      expect(source.indexOf(button)).toBeGreaterThan(source.indexOf('♻️'));
      expect(source.indexOf(button)).toBeLessThan(source.indexOf('⚙️'));
      expect(model.requests).toHaveLength(2);
      expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(actual);
    } finally { writeFileSync(model.root + '/' + page, original); }
  });
  it('rejects JSX placed after a module import and requests a JSX child anchor', async () => {
    const importSource = 'import { useState } from "react";';
    const moduleId = 'a' + createHash('sha256').update(page + '\n' + importSource).digest('hex').slice(0, 12);
    const inputId = 'a' + createHash('sha256').update(page + '\n' + input).digest('hex').slice(0, 12);
    const misplaced = '<button type="button">CD</button>';
    model.replies.push(
      JSON.stringify({ changes: [{ path: page, edits: [{ anchorId: moduleId, operation: 'insertAfter', newText: misplaced }] }] }),
      JSON.stringify({ changes: [{ path: page, edits: [{ anchorId: inputId, operation: 'insertAfter', newText: misplaced }] }] }),
      accepted,
    );
    const onCandidate = vi.fn();
    const changes = await PoipoiCodeAgent.getInstance().generate('チャットの入力欄の横にCDボタンを追加して。', 'system', { onCandidate });
    expect(onCandidate.mock.calls[0][1].join(' ')).toContain('module anchors accept imports or declarations, not JSX');
    expect(model.requests[1].messages.at(-1).content).toContain('Insert visible controls at a jsxChildren anchor');
    expect(changes[0].content).toContain(input + '\n' + misplaced);
    expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(original);
  });
  it('keeps the real chat composer context bounded without including auxiliary editors', async () => {
    const actual = readFileSync(new URL('../../client/src/pages/StreamingChat.tsx', import.meta.url), 'utf8');
    const control = actual.match(/<Input\b[\s\S]*?\/>/)![0];
    writeFileSync(model.root + '/' + page, actual);
    try {
      const anchorId = 'a' + createHash('sha256').update(page + '\n' + control).digest('hex').slice(0, 12);
      model.replies.push(JSON.stringify({ changes: [{ path: page, edits: [{ anchorId, operation: 'insertAfter',
        newText: '<output>{[...input].length}文字</output>' }] }] }), accepted);
      const task = implementationPrompt(request, [{ role: 'assistant', content: 'Previous discussion. '.repeat(220) }] as any);
      const changes = await PoipoiCodeAgent.getInstance().generate(task);
      const call = model.requests[0];
      const prompt = call.messages.at(-1).content;
      console.log('REAL PAGE CONTEXT:', { characters: JSON.stringify(call.messages).length, contextWindow: call.contextWindow });
      expect(JSON.stringify(call.messages).length).toBeLessThan(30000);
      expect(call.contextWindow).toBeLessThanOrEqual(16384);
      const grammar = call.response_format.json_schema.schema.properties.changes.items.oneOf[0];
      const jsx = grammar.properties.edits.items.oneOf.find((item: any) => item.properties.anchorId.enum.includes(anchorId));
      expect(jsx.required).toEqual(['anchorId', 'operation', 'newText']);
      expect(new RegExp(jsx.properties.newText.pattern).test('const handler = () => {};')).toBe(false);
      expect(new RegExp(jsx.properties.newText.pattern).test('<output>{input}</output>')).toBe(true);
      expect(grammar.properties.content).toBeUndefined();
      expect(prompt).toContain(control);
      expect(prompt).toContain('const [input, setInput] = useState("")');
      expect(prompt).toContain('const handleSendMessage = async');
      expect(prompt).toContain('setInput("")');
      expect(prompt).not.toContain('value={programRequirements}');
      expect(prompt).not.toContain('value={memoryQuery}');
      expect(prompt).not.toContain('Existing source: client/src/App.tsx');
      expect(changes[0].content).toBe(actual.replace(control, control + '\n<output>{[...input].length}文字</output>'));
      const review = JSON.parse(model.requests[1].messages.at(-1).content);
      expect(review.files[0].exactEdits[0].oldText).toBe(control);
      expect(review.files[0].exactEdits[0].newText).toContain(control);
      expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(actual);
    } finally { writeFileSync(model.root + '/' + page, original); }
  });

  it('rejects an invented source anchor before saving or modifying the page', async () => {
    model.replies.push(JSON.stringify({ changes: [{ path: page, edits: [{ anchorId: 'invented',
      operation: 'insertAfter', newText: '<output>unused</output>' }] }] }));
    await expect(PoipoiCodeAgent.getInstance().generate(request)).rejects.toThrow('Invalid source anchor');
    expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(original);
    expect(model.requests).toHaveLength(1);
  });

  it('makes additionally requested source units available as anchors', async () => {
    const helper = 'export function helper() { return 1; }';
    const source = original + '\n' + helper;
    writeFileSync(model.root + '/' + page, source);
    try {
      const line = source.slice(0, source.indexOf(helper)).split('\n').length;
      const anchorId = 'a' + createHash('sha256').update(page + '\n' + helper).digest('hex').slice(0, 12);
      model.replies.push(JSON.stringify({ changes: [], readFiles: [{ path: page, startLine: line, endLine: line }] }),
        JSON.stringify({ changes: [{ path: page, edits: [{ anchorId, operation: 'replace',
          newText: 'export function helper() { return 2; }' }] }] }), accepted);
      const changes = await PoipoiCodeAgent.getInstance().generate(request);
      const grammar = model.requests[1].response_format.json_schema.schema.properties.changes.items.oneOf[0];
      expect(grammar.properties.edits.items.oneOf.some((item: any) => item.properties.anchorId.enum.includes(anchorId))).toBe(true);
      expect(changes[0].content).toBe(source.replace('return 1;', 'return 2;'));
      expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(source);
    } finally { writeFileSync(model.root + '/' + page, original); }
  });

  it.each(['insertAfter', 'insertBefore'] as const)('preserves array order for repeated %s edits at the same source unit', async operation => {
    const anchorId = 'a' + createHash('sha256').update(page + '\n' + input).digest('hex').slice(0, 12);
    const inserted = ['<span>first</span>', '<span>second</span>', '<span>third</span>'];
    model.replies.push(JSON.stringify({ changes: [{ path: page,
      edits: inserted.map(newText => ({ anchorId, operation, newText })) }] }), accepted);
    const changes = await PoipoiCodeAgent.getInstance().generate(request);
    const replacement = operation === 'insertAfter' ? [input, ...inserted].join('\n') : [...inserted, input].join('\n');
    expect(changes[0].content).toBe(original.replace(input, replacement));
    expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(original);
    expect(model.requests).toHaveLength(2);
  });

  it('rejects the observed function-in-JSX shape and repairs it before approval', async () => {
    const anchorId = 'a' + createHash('sha256').update(page + '\n' + input).digest('hex').slice(0, 12);
    const invalid = 'const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {\nsetInput(event.target.value);\n};';
    const valid = '<output>{[...input].length}文字</output>';
    model.replies.push(JSON.stringify({ changes: [{ path: page, edits: [{ anchorId, operation: 'insertAfter', newText: invalid }] }] }),
      JSON.stringify({ changes: [{ path: page, edits: [{ anchorId, operation: 'insertAfter', newText: valid }] }] }), accepted);
    const onCandidate = vi.fn();
    const changes = await PoipoiCodeAgent.getInstance().generate(request, 'system', { onCandidate });
    expect(onCandidate.mock.calls[0][1].join(' ')).toContain('JSX anchors accept only JSX');
    expect(onCandidate.mock.calls[1][1]).toEqual([]);
    expect(model.requests[1].messages.at(-1).content).toContain('componentBody');
    expect(changes[0].content).toBe(original.replace(input, input + '\n' + valid));
    expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(original);
    expect(model.requests).toHaveLength(3);
  });

  it.each([
    ['入力中の文字数', 'Array.from(input).length'],
    ['入力の大文字', 'input.toUpperCase()'],
  ])('generates an independent %s view and integrates it without rewriting the real composer', async (display, expression) => {
    const actual = readFileSync(new URL('../../client/src/pages/StreamingChat.tsx', import.meta.url), 'utf8');
    writeFileSync(model.root + '/' + page, actual);
    try {
      const source = 'export default function View({ input }: { input: string }) { return <output>{' + expression + '}</output>; }';
      model.replies.push(call => JSON.stringify({ changes: [{
        path: call.response_format.json_schema.schema.properties.changes.items.properties.path.const, content: source,
      }] }), accepted);
      const changes = await PoipoiCodeAgent.getInstance().generate('AIチャットの入力欄の近くに、' + display + 'を表示する機能を追加して。既存機能は残して。');
      expect(changes).toHaveLength(2);
      const added = changes[0];
      const name = added.path.split('/').at(-1)!.replace('.tsx', '');
      expect(added.content).toBe(source);
      expect(added.baseHash).toBeNull();
      const importText = 'import ' + name + ' from "@/components/generated/' + name + '";';
      const mount = '<' + name + ' input={input} />';
      expect(changes[1].path).toBe(page);
      expect(changes[1].content.replace('\n' + importText, '').replace('\n' + mount, '')).toBe(actual);
      expect(changes[1].content).toContain('setInput("")');
      expect(model.requests[0].contextWindow).toBe(8192);
      expect(JSON.stringify(model.requests[0].messages).length).toBeLessThan(6000);
      expect(model.requests[0].messages.at(-1).content).not.toContain('Existing source:');
      expect(model.requests[1].contextWindow).toBe(8192);
      expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(actual);
      expect(existsSync(model.root + '/' + added.path)).toBe(false);
      expect(model.requests).toHaveLength(2);
    } finally { writeFileSync(model.root + '/' + page, original); }
  });

  it('corrects an invalid generated component while retaining the same host integration', async () => {
    const actual = readFileSync(new URL('../../client/src/pages/StreamingChat.tsx', import.meta.url), 'utf8');
    writeFileSync(model.root + '/' + page, actual);
    try {
      const good = 'export default function View({input}:{input:string}) { return <output>{Array.from(input).length}</output>; }';
      const response = (content: string) => (call: any) => JSON.stringify({ changes: [{
        path: call.response_format.json_schema.schema.properties.changes.items.properties.path.const, content,
      }] });
      model.replies.push(response('export default function View() { return <output>; }'), response(good), accepted);
      const onCandidate = vi.fn();
      const changes = await PoipoiCodeAgent.getInstance().generate('入力欄の近くに文字数表示の機能を追加して。送信後は0文字に戻る。', 'system', { onCandidate });
      expect(onCandidate.mock.calls[0][1].length).toBeGreaterThan(0);
      expect(onCandidate.mock.calls[1][1]).toEqual([]);
      expect(changes[0].content).toBe(good);
      expect(changes[1].previousContent).toBe(actual);
      expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(actual);
    } finally { writeFileSync(model.root + '/' + page, original); }
  });

  it.each(['wrong expected value', 'host import allegation', 'passing example allegation'])(
    'rechecks the same component without regenerating it for a %s', async kind => {
    const actual = readFileSync(new URL('../../client/src/pages/StreamingChat.tsx', import.meta.url), 'utf8');
    writeFileSync(model.root + '/' + page, actual);
    const task = 'AIチャットの入力欄の近くに文字数表示を追加して。空欄は0文字、「あいう」は3文字、「😀」は1文字。送信後は0文字に戻す。';
    const checks = [{ exampleIndex: 0, expected: 0, actual: 0 }, { exampleIndex: 1, expected: 3, actual: 3 }, { exampleIndex: 2, expected: 1, actual: 1 }];
    try {
      model.replies.push(call => JSON.stringify({ changes: [{
        path: call.response_format.json_schema.schema.properties.changes.items.properties.path.const,
        content: 'export default function View({input}:{input:string}) { return <output>{Array.from(input).length}文字</output>; }',
      }] }), call => {
        const path = JSON.parse(call.messages.at(-1).content.split('\nReview only')[0]).files[0].path;
        const exampleChecks = checks.map(item => ({ ...item }));
        if (kind === 'wrong expected value') exampleChecks[1].expected = 1;
        return JSON.stringify({ accepted: false, exampleChecks, issues: [{
          path: kind === 'host import allegation' ? page : path,
          exampleIndex: 1, requirement: '「あいう」は3文字',
          problem: "あいうは3文字ですが1文字であるべきです。", evidence: 'Array.from(input).length',
        }] });
      }, JSON.stringify({ accepted: true, issues: [], exampleChecks: checks }));
      const changes = await PoipoiCodeAgent.getInstance().generate(task);
      expect(changes).toHaveLength(2);
      expect(model.requests).toHaveLength(3);
      expect(model.requests[1].response_format.json_schema.schema.properties.issues.items.properties.path.enum).toEqual([changes[0].path]);
      expect(model.requests[1].messages.at(-1).content).not.toContain('"path":"' + page + '"');
      expect(model.requests[2].messages.at(-1).content).toContain('SAME candidate');
      expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(actual);
    } finally { writeFileSync(model.root + '/' + page, original); }
  });

  it.each(['literal replacements', 'UTF-16 length'])('corrects %s while retaining requirement checks and approval', async kind => {
    const actual = readFileSync(new URL('../../client/src/pages/StreamingChat.tsx', import.meta.url), 'utf8');
    writeFileSync(model.root + '/' + page, actual);
    const task = 'AIチャットの入力欄の近くに文字数表示を追加して。空欄は0文字、「あいう」は3文字、「😀」は1文字。送信後は0文字に戻す。';
    const checks = [{ exampleIndex: 0, expected: 0, actual: 0 }, { exampleIndex: 1, expected: 3, actual: 3 }, { exampleIndex: 2, expected: 1, actual: 1 }];
    const response = (expression: string) => (call: any) => JSON.stringify({ changes: [{
      path: call.response_format.json_schema.schema.properties.changes.items.properties.path.const,
      content: 'export default function View({input}:{input:string}) { return <output>{' + expression + '}文字</output>; }',
    }] });
    try {
      model.replies.push(response(kind === 'literal replacements' ? "input.replace(/あいう/g,'a').replace(/😀/g,'a').length" : 'input.length'));
      model.replies.push(response('Array.from(input).length'), JSON.stringify({ accepted: true, issues: [], exampleChecks: checks }));
      const onCandidate = vi.fn();
      const changes = await PoipoiCodeAgent.getInstance().generate(task, 'system', { onCandidate });
      expect(changes[0].content).toContain('Array.from(input).length');
      if (kind === 'literal replacements') expect(onCandidate.mock.calls[0][1].join(' ')).toContain('special-case request examples');
      if (kind === 'UTF-16 length') {
        expect(onCandidate.mock.calls[0][1].join(' ')).toContain('input.length counts UTF-16 code units');
        expect(model.requests[1].messages.at(-1).content).toContain('Count Unicode code points');
      }
      expect(model.requests).toHaveLength(3);
      expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(actual);
      expect(existsSync(model.root + '/' + changes[0].path)).toBe(false);
    } finally { writeFileSync(model.root + '/' + page, original); }
  });

  it('does not send the observed wrong emoji count to the AI reviewer or approval when correction repeats it', async () => {
    const actual = readFileSync(new URL('../../client/src/pages/StreamingChat.tsx', import.meta.url), 'utf8');
    writeFileSync(model.root + '/' + page, actual);
    const wrong = (call: any) => JSON.stringify({ changes: [{
      path: call.response_format.json_schema.schema.properties.changes.items.properties.path.const,
      content: 'export default function View({input}:{input:string}) { const charCount = input.length; return <div>{charCount}文字</div>; }',
    }] });
    try {
      model.replies.push(wrong, wrong);
      await expect(PoipoiCodeAgent.getInstance().generate(
        'AIチャットの入力欄の近くに文字数表示を追加して。空欄は0文字、「あいう」は3文字、「😀」は1文字。送信後は0文字に戻す。',
      )).rejects.toThrow('input.length counts UTF-16 code units');
      expect(model.requests).toHaveLength(2);
      expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(actual);
    } finally { writeFileSync(model.root + '/' + page, original); }
  });

  it('keeps a valid preview for explicit human review when the AI reviewer twice invents unsupported defects', async () => {
    const actual = readFileSync(new URL('../../client/src/pages/StreamingChat.tsx', import.meta.url), 'utf8');
    writeFileSync(model.root + '/' + page, actual);
    const warning = vi.fn();
    try {
      model.replies.push(call => JSON.stringify({ changes: [{
        path: call.response_format.json_schema.schema.properties.changes.items.properties.path.const,
        content: 'export default function View({input}:{input:string}) { return <output>{Array.from(input).length}文字</output>; }',
      }] }), JSON.stringify({ accepted: false, issues: [{ path: page, requirement: 'missing', problem: 'invented', evidence: 'invented' }] }),
      JSON.stringify({ accepted: false, issues: [{ path: page, requirement: 'missing', problem: 'invented', evidence: 'invented' }] }));
      const changes = await PoipoiCodeAgent.getInstance().generate(
        'AIチャットの入力欄の近くに文字数表示を追加して。空欄は0文字、「あいう」は3文字、「😀」は1文字。送信後は0文字に戻す。',
        'system', { onReviewWarning: warning });
      expect(changes).toHaveLength(2);
      expect(warning).toHaveBeenCalledOnce();
      expect(warning.mock.calls[0][0]).toContain('機能の正しさは未確認');
      expect(model.requests).toHaveLength(3);
      expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(actual);
      expect(existsSync(model.root + '/' + changes[0].path)).toBe(false);
    } finally { writeFileSync(model.root + '/' + page, original); }
  });

  it('creates a connected preview from a natural request and includes the actual UI controls beyond line 150', async () => {
    model.replies.push(connected, accepted);
    const result = await streamingRouter.createCaller(context()).chat({ message: request, messageId: randomUUID(), conversationId: randomUUID() });
    expect(result.fullText).toContain('まだ適用していません');
    const preview = await readCodePreview('771', (result.metadata as any).codePreview.previewId);
    expect(preview.status).toBe('pending');
    expect(preview.changes.map(change => change.path)).toEqual([page, modulePath]);
    expect(preview.changes[0].content).toContain('<CharacterCount text={input} />');
    expect(preview.changes[0].previousContent).toBe(original);
    const prompt = JSON.stringify(model.requests[0].messages);
    expect(prompt).toContain('Existing source: ' + page);
    expect(prompt).toContain(input.replaceAll('"', '\\"'));
    expect(prompt).not.toContain('Existing source: server/core/AZLiveInformation.ts');
    expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(original);
    expect(existsSync(model.root + '/' + modulePath)).toBe(false);
    expect(model.requests).toHaveLength(2);
  });

  it('requests one correction when a feature proposal only creates disconnected files', async () => {
    model.replies.push(unconnected, connected, accepted);
    const changes = await PoipoiCodeAgent.getInstance().generate(request);
    expect(changes.map(change => change.path)).toEqual([page, modulePath]);
    expect(JSON.stringify(model.requests[1].messages)).toContain('feature is not connected');
    expect(model.requests).toHaveLength(3);
    expect(existsSync(model.root + '/' + modulePath)).toBe(false);
  });

  it('does not save or apply a disconnected feature after the bounded correction also fails', async () => {
    model.replies.push(unconnected, unconnected);
    const result = await streamingRouter.createCaller(context()).chat({ message: request, messageId: randomUUID(), conversationId: randomUUID() });
    expect(result.fullText).toContain('組み込まれていません');
    expect((result.metadata as any).codePreview.previewId).toBeUndefined();
    expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(original);
    expect(existsSync(model.root + '/' + modulePath)).toBe(false);
  });

  it('still allows explicitly requested standalone new modules', async () => {
    model.replies.push(unconnected, accepted);
    const changes = await PoipoiCodeAgent.getInstance().generate('Create a standalone file ' + modulePath + '. Reference client/src/App.tsx only.');
    expect(changes).toHaveLength(1);
    expect(changes[0].baseHash).toBeNull();
  });

  it('respects a path-free standalone request that forbids existing-file changes', async () => {
    model.replies.push(unconnected, accepted);
    const changes = await PoipoiCodeAgent.getInstance().generate('文字数を数える機能の単独モジュールを新規作成して。既存ファイルは変更しない。');
    expect(changes).toHaveLength(1);
    expect(changes[0].baseHash).toBeNull();
    expect(readFileSync(model.root + '/' + page, 'utf8')).toBe(original);
  });

  it('rejects a non-admin feature request before asking the coder', async () => {
    await expect(streamingRouter.createCaller(context('user')).chat({ message: request, conversationId: randomUUID() })).rejects.toThrow('管理者');
    expect(model.requests).toHaveLength(0);
  });

  it.each(['文字数カウント機能は追加できますか？', '機能追加しないで。説明だけして。'])('does not classify a question/prohibition as implementation: %s', value => {
    expect(isCodeImplementationRequest(value)).toBe(false);
  });
});
