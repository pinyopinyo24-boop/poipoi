import { expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';

const stored = vi.hoisted(() => ({
  sessions: new Map<string, any>(), messages: new Map<string, any[]>(),
}));

vi.mock('../repositories/ChatRepository', () => ({
  getSharedChatRepository: () => ({
    getSession: async (id: string) => stored.sessions.get(id),
    saveSession: async (session: any) => { stored.sessions.set(session.id, session); },
    getMessages: async (id: string, limit: number) => (stored.messages.get(id) ?? []).slice(-limit),
    saveMessage: async (message: any, id: string) => {
      const items = stored.messages.get(id) ?? [];
      if (!items.some(item => item.id === message.id)) items.push(message);
      stored.messages.set(id, items);
    },
    deleteSession: async (id: string) => { stored.sessions.delete(id); stored.messages.delete(id); },
  }),
}));

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
    const arithmetic = await streamingRouter.createCaller(ctx).chat({
      conversationId, message: '計算して: (3+5)*2', messageId: 'arithmetic-query',
    });
    expect(arithmetic.fullText).toBe('(3+5)*2 → 16');
  } finally {
    await getSharedChatRepository().deleteSession(conversationId);
  }
});
