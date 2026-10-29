import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { ExcelAnalysisManager } from '../managers/ExcelAnalysisManager';
import { invokeLLM } from '../_core/llm';

export const unifiedToolsRouter = router({
  analyzeCost: protectedProcedure.input(z.object({
    estimated: z.number().finite(),
    actual: z.number().finite(),
    quantity: z.number().positive().finite(),
  })).mutation(({ input }) => {
    const variance = input.actual - input.estimated;
    return { variance, perUnitVariance: variance / input.quantity, favorable: variance < 0 };
  }),
  reason: protectedProcedure.input(z.object({ prompt: z.string().min(1).max(4000) }))
    .mutation(async ({ input }) => {
      const result = await invokeLLM({ messages: [{ role: 'user', content: input.prompt }] });
      return { answer: result.choices[0]?.message?.content ?? '' };
    }),
});
