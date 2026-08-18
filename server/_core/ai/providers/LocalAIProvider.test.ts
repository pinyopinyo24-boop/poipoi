import { describe, it, expect, vi, afterEach } from 'vitest';
import { LocalAIProvider } from './LocalAIProvider';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LocalAIProvider', () => {
  it('should return local model', async () => {
    const provider = new LocalAIProvider();
    const models = await provider.getModels();

    expect(models).toHaveLength(1);
    expect(models[0].id).toBe('qwen2.5-coder:7b');
    expect(models[0].provider).toBe('local');
  });

  it('should invoke local endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        id: 'local-test',
        choices: [
          {
            message: { content: 'ローカルAIテスト成功' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      }), { status: 200 })
    );

    const provider = new LocalAIProvider('http://localhost:8000');

    const result = await provider.invoke([
      { role: 'user', content: 'テスト' },
    ]);

    expect(result.provider).toBe('local');
    expect(result.content).toBe('ローカルAIテスト成功');
    expect(result.usage?.totalTokens).toBe(30);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/v1/chat/completions',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should report unavailable when local AI is not running', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('connect ECONNREFUSED')
    );

    const provider = new LocalAIProvider('http://localhost:8000');
    const status = await provider.getStatus();

    expect(status.provider).toBe('local');
    expect(status.isAvailable).toBe(false);
    expect(status.modelsAvailable).toBe(0);
  });

  it('should validate local runtime status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 })
    );

    const provider = new LocalAIProvider('http://localhost:8000');

    await expect(provider.validateConfig()).resolves.toBe(true);
  });
});

