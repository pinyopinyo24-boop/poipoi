import { afterEach, describe, expect, it, vi } from 'vitest';
import { conversationModel } from './ConversationModel';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('conversation model selection', () => {
  it('prefers an installed Qwen 3.5 model for chat while leaving code selection separate', async () => {
    vi.stubEnv('LOCAL_CHAT_MODEL', '');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ models: [
      { name: 'qwen2.5-coder:7b' }, { name: 'qwen2.5:7b' }, { name: 'qwen3.5:9b' },
    ] }))));
    expect(await conversationModel('http://model-selection-test:11434')).toBe('qwen3.5:9b');
  });

  it('respects an explicitly selected chat model', async () => {
    vi.stubEnv('LOCAL_CHAT_MODEL', 'qwen2.5:7b');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(await conversationModel('http://explicit-model-test:11434')).toBe('qwen2.5:7b');
    expect(fetch).not.toHaveBeenCalled();
  });
});
