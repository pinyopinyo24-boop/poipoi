import { z } from 'zod';
import { mergePoiPoiState } from '../core/PoiPoiUnifiedState';
import { PoiPoiIdentity } from '../core/PoiPoiIdentity';
import { protectedProcedure, router } from '../_core/trpc';
import {
  getUserPoiPoiUnifiedState,
  syncUserPoiPoiUnifiedState,
  getPoiPoiUnifiedState,
  syncPoiPoiUnifiedState,
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

// An explicitly configured owner may bridge the PC's existing local AI memory.
// Never expose global PC state to arbitrary authenticated accounts.
const isOwner = (id: string) =>
  !!process.env.POIPOI_OWNER_USER_ID && process.env.POIPOI_OWNER_USER_ID === id;

export const poipoiUnifiedStateRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const id = String(ctx.user.id);
    await PoiPoiIdentity.syncAccountIdentity(id);
    const personal = await getUserPoiPoiUnifiedState(id);
    if (!isOwner(id)) return personal;
    return mergePoiPoiState(personal, await getPoiPoiUnifiedState());
  }),

  sync: protectedProcedure
    .input(stateSchema)
    .mutation(async ({ ctx, input }) => {
      const id = String(ctx.user.id);
      const personal = await syncUserPoiPoiUnifiedState(id, input);
      await PoiPoiIdentity.syncAccountIdentity(id);
      if (!isOwner(id)) return personal;
      const global = await syncPoiPoiUnifiedState(personal);
      return syncUserPoiPoiUnifiedState(id, global);
    }),
});