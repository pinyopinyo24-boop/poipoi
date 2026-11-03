import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';

const model = vi.hoisted(() => {
  const root = process.cwd() + '/node_modules/.cache/natural-feature-' + Date.now();
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  return { root, replies: [] as string[], requests: [] as any[] };
});
// Controlled model output tests routing/grounding, not live model capability.
vi.mock('../_core/llm', () => ({
  invokeLLM: vi.fn(async (request: any) => {
    model.requests.push(request);
    const content = model.replies.shift();
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
import { streamingRouter } from '../routers.streaming';
import { PoipoiCodeAgent } from '../core/PoipoiCodeAgent';
import { readCodePreview } from '../core/CodePreviewStore';
import { isCodeImplementationRequest, implementationPrompt } from '../core/AZCapabilityCatalog';

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
});
beforeEach(() => { model.replies.length = 0; model.requests.length = 0; });
afterAll(() => { vi.restoreAllMocks(); rmSync(model.root, { recursive: true, force: true }); });

describe('new feature requests without source paths through the actual PC chat route', () => {
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
