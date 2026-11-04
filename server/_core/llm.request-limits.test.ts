import { afterEach, describe, expect, it, vi } from 'vitest';
import { invokeLLM, type LLMRequest } from './llm';
const request: LLMRequest = {
  userId: 'request-limits-test',
  model: 'qwen2.5-coder:7b',
  messages: [{ role: 'user', content: 'Return a JSON object.' }],
  response_format: { type: 'json_schema', json_schema: { name: 'limits', schema: { type: 'object' } } },
};
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('local model request limits', () => {
  it('disables hidden thinking for structured Qwen 3.5 intent responses', async () => {
    const fetch = vi.fn(async () => ({ ok: true, text: async () => JSON.stringify({ message: { content: '{}' } }) }));
    vi.stubGlobal('fetch', fetch);
    await invokeLLM({ ...request, model: 'qwen3.5:9b' });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.model).toBe('qwen3.5:9b');
    expect(body.think).toBe(false);
  });
  it('sends code-worker instructions without unrelated chat persona or arithmetic examples', async () => {
    const fetch = vi.fn(async () => ({ ok: true, text: async () => JSON.stringify({ message: { content: '{}' } }) }));
    vi.stubGlobal('fetch', fetch);
    await invokeLLM({ ...request, purpose: 'code' });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.messages).toEqual(request.messages);
    expect(body.format).toEqual(request.response_format!.json_schema.schema);
  });

  it('passes a per-request context size to Ollama without changing the global default', async () => {
    const fetch = vi.fn(async () => ({ ok: true, text: async () => JSON.stringify({ message: { content: '{}' } }) }));
    vi.stubGlobal('fetch', fetch);
    await invokeLLM({ ...request, contextWindow: 8192, timeoutMs: 300000 });
    expect(JSON.parse(fetch.mock.calls[0][1].body).options.num_ctx).toBe(8192);
  });
  for (const [label, timeoutMs] of [['coder', 300000], ['default', undefined]] as const) {
    it(`keeps the ${label} deadline bounded and aborts at its own limit`, async () => {
      vi.useFakeTimers();
      let started!: () => void;
      const ready = new Promise<void>(resolve => { started = resolve; });
      let signal!: AbortSignal;
      vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => {
        signal = options.signal!;
        started();
        return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true }));
      }));
      const result = invokeLLM({ ...request, timeoutMs }).then(value => ({ value, error: undefined }), error => ({ value: undefined, error }));
      await ready;
      const limit = timeoutMs ?? 120000;
      await vi.advanceTimersByTimeAsync(limit - 1);
      expect(signal.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect((await result).error).toMatchObject({ name: 'TimeoutError', message: `Local AI request timed out after ${limit / 1000} seconds` });
      expect(vi.getTimerCount()).toBe(0);
    });
  }
});
