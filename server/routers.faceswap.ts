import { z } from "zod";
import { protectedProcedure, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { faceSwapResults, type InsertFaceSwapResult } from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const faceSwapRouter = {
  // Save face swap result
  saveResult: protectedProcedure
    .input(
      z.object({
        sourceFileName: z.string(),
        targetFileName: z.string(),
        resultImageUrl: z.string(),
        resultImageKey: z.string(),
        quality: z.enum(["low", "medium", "high"]),
        processingTime: z.number(),
        metadata: z.record(z.string(), z.any()).optional(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const shareToken = uuidv4();

      const result: InsertFaceSwapResult = {
        id: uuidv4(),
        userId: ctx.user.id,
        sourceFileName: input.sourceFileName,
        targetFileName: input.targetFileName,
        resultImageUrl: input.resultImageUrl,
        resultImageKey: input.resultImageKey,
        quality: input.quality,
        processingTime: input.processingTime,
        metadata: input.metadata,
        isPublic: input.isPublic,
        shareToken: input.isPublic ? shareToken : null,
      };

      await db.insert(faceSwapResults).values(result);

      return {
        id: result.id,
        shareToken: result.shareToken,
        success: true,
      };
    }),

  // Get user's face swap results
  getResults: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
        quality: z.enum(["low", "medium", "high"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [eq(faceSwapResults.userId, ctx.user.id)];
      if (input.quality) {
        conditions.push(eq(faceSwapResults.quality, input.quality));
      }

      const results = await db
        .select()
        .from(faceSwapResults)
        .where(and(...conditions))
        .orderBy(desc(faceSwapResults.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return results;
    }),

  // Get single result
  getResult: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(faceSwapResults)
        .where(
          and(
            eq(faceSwapResults.id, input.id),
            eq(faceSwapResults.userId, ctx.user.id)
          )
        )
        .limit(1);

      return result[0] || null;
    }),

  // Delete result
  deleteResult: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(faceSwapResults)
        .where(
          and(
            eq(faceSwapResults.id, input.id),
            eq(faceSwapResults.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  // Toggle public sharing
  togglePublic: protectedProcedure
    .input(z.object({ id: z.string(), isPublic: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const shareToken = input.isPublic ? uuidv4() : null;

      await db
        .update(faceSwapResults)
        .set({
          isPublic: input.isPublic,
          shareToken: shareToken,
        })
        .where(
          and(
            eq(faceSwapResults.id, input.id),
            eq(faceSwapResults.userId, ctx.user.id)
          )
        );

      return { success: true, shareToken };
    }),

  // Get public result by share token
  getPublicResult: publicProcedure
    .input(z.object({ shareToken: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(faceSwapResults)
        .where(
          and(
            eq(faceSwapResults.shareToken, input.shareToken),
            eq(faceSwapResults.isPublic, true)
          )
        )
        .limit(1);

      return result[0] || null;
    }),

  // Get statistics
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const results = await db
      .select()
      .from(faceSwapResults)
      .where(eq(faceSwapResults.userId, ctx.user.id));

    const totalCount = results.length;
    const totalProcessingTime = results.reduce(
      (sum: number, r: any) => sum + r.processingTime,
      0
    );
    const averageProcessingTime =
      totalCount > 0 ? totalProcessingTime / totalCount : 0;

    const qualityBreakdown = {
      low: results.filter((r: any) => r.quality === "low").length,
      medium: results.filter((r: any) => r.quality === "medium").length,
      high: results.filter((r: any) => r.quality === "high").length,
    };

    const publicCount = results.filter((r: any) => r.isPublic).length;

    return {
      totalCount,
      totalProcessingTime,
      averageProcessingTime,
      qualityBreakdown,
      publicCount,
    };
  }),
};
