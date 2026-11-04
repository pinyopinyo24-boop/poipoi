import { expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';

vi.mock('../_core/llm', () => ({
  invokeLLM: vi.fn(() => { throw new Error('Math chat must use the calculation engine without a model call'); }),
}));

import { streamingRouter } from '../routers.streaming';
import { getSharedChatRepository } from '../repositories/ChatRepository';

it('calculates through the actual PC streaming chat without asking the language model', async () => {
  const conversationId = 'math-chat-' + randomUUID();
  const ctx = { user: { id: 987654321, role: 'admin', name: 'Math test' }, req: { headers: {} }, res: {} } as any;
  try {
    const reply = await streamingRouter.createCaller(ctx).chat({
      conversationId, message: '計算して: mean([2,4,6])', messageId: 'math-query',
    });
    expect(reply.fullText).toBe('mean([2,4,6]) → 4');
    const again = await streamingRouter.createCaller(ctx).chat({
      conversationId, message: '計算して: mean([2,4,6])', messageId: 'math-query',
    });
    expect(again.fullText).toBe(reply.fullText);
    expect((await getSharedChatRepository().getMessages(conversationId, 10))).toHaveLength(2);
  } finally {
    await getSharedChatRepository().deleteSession(conversationId);
  }
});
