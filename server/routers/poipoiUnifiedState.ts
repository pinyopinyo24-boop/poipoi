import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  getUserPoiPoiUnifiedState,
  syncUserPoiPoiUnifiedState,
} from '../core/PoiPoiUnifiedStateStore';

const recordSchema = z.object({
  id: z.string().min(1),
  category: z.enum(['memory', 'learning', 'evolution']),
  value: z.string(),
  updatedAt: z.number().finite(),
  origin: z.enum(['pc', 'android']),
});

const stateSchema = z.object({
  version: z.literal(1),
  records: z.array(recordSchema).max(10000),
});

export const poipoiUnifiedStateRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return getUserPoiPoiUnifiedState(String(ctx.user.id));
  }),

  sync: protectedProcedure
    .input(stateSchema)
    .mutation(async ({ ctx, input }) => {
      return syncUserPoiPoiUnifiedState(String(ctx.user.id), input);
    }),
});