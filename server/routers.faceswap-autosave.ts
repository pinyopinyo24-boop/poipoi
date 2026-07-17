/**
 * 顔入れ替え結果の自動保存ルーター
 * 処理完了時に結果を自動的にギャラリーに保存
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { faceSwapResults } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const faceSwapAutoSaveRouter = router({
  /**
   * 処理結果を自動保存
   */
  autoSaveResult: protectedProcedure
    .input(
      z.object({
        sourceFileName: z.string(),
        targetFileName: z.string(),
        resultImageUrl: z.string(),
        resultImageKey: z.string(),
        processingTime: z.number(),
        quality: z.enum(["low", "medium", "high"]),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        const id = Math.random().toString(36).substring(2, 15);
        const now = new Date();

        // 結果をデータベースに保存
        await db.insert(faceSwapResults).values({
          id,
          userId: ctx.user.id,
          sourceFileName: input.sourceFileName,
          targetFileName: input.targetFileName,
          resultImageUrl: input.resultImageUrl,
          resultImageKey: input.resultImageKey,
          processingTime: Math.round(input.processingTime),
          quality: input.quality,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
          createdAt: now,
          updatedAt: now,
          isPublic: false,
        } as any);

        console.log(
          `[AutoSave] 顔入れ替え結果を保存しました (ID: ${id}, ユーザー: ${ctx.user.id})`
        );

        return {
          success: true,
          resultId: id,
          message: "処理結果を自動保存しました",
        };
      } catch (error) {
        console.error("[AutoSave] 保存エラー:", error);
        return {
          success: false,
          error: "処理結果の保存に失敗しました",
        };
      }
    }),

  /**
   * 最近の保存結果を取得
   */
  getRecentResults: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        const results = await db
          .select()
          .from(faceSwapResults)
          .where(eq(faceSwapResults.userId, ctx.user.id))
          .limit(input.limit);

        return {
          success: true,
          results: results.map((r) => ({
            ...r,
            metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : null,
          })),
        };
      } catch (error) {
        console.error("[AutoSave] 取得エラー:", error);
        return {
          success: false,
          results: [],
          error: "保存結果の取得に失敗しました",
        };
      }
    }),

  /**
   * 保存結果を削除
   */
  deleteResult: protectedProcedure
    .input(
      z.object({
        resultId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        // ユーザーの所有確認
        const results = await db
          .select()
          .from(faceSwapResults)
          .where(eq(faceSwapResults.id, input.resultId));

        if (!results[0] || results[0].userId !== ctx.user.id) {
          return {
            success: false,
            error: "削除権限がありません",
          };
        }

        // 削除実行
        await db
          .delete(faceSwapResults)
          .where(eq(faceSwapResults.id, input.resultId));

        console.log(
          `[AutoSave] 顔入れ替え結果を削除しました (ID: ${input.resultId})`
        );

        return {
          success: true,
          message: "処理結果を削除しました",
        };
      } catch (error) {
        console.error("[AutoSave] 削除エラー:", error);
        return {
          success: false,
          error: "処理結果の削除に失敗しました",
        };
      }
    }),

  /**
   * 結果を公開/非公開に設定
   */
  setPublic: protectedProcedure
    .input(
      z.object({
        resultId: z.string(),
        isPublic: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        // ユーザーの所有確認
        const results = await db
          .select()
          .from(faceSwapResults)
          .where(eq(faceSwapResults.id, input.resultId));

        if (!results[0] || results[0].userId !== ctx.user.id) {
          return {
            success: false,
            error: "変更権限がありません",
          };
        }

        // 公開設定を更新
        await db
          .update(faceSwapResults)
          .set({
            isPublic: input.isPublic,
            updatedAt: new Date(),
          })
          .where(eq(faceSwapResults.id, input.resultId));

        console.log(
          `[AutoSave] 公開設定を変更しました (ID: ${input.resultId}, 公開: ${input.isPublic})`
        );

        return {
          success: true,
          message: input.isPublic ? "公開に設定しました" : "非公開に設定しました",
        };
      } catch (error) {
        console.error("[AutoSave] 設定変更エラー:", error);
        return {
          success: false,
          error: "設定の変更に失敗しました",
        };
      }
    }),
});
