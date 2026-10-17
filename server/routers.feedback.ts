import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { feedback } from "../drizzle/schema";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";

export const feedbackRouter = router({
  /**
   * ユーザーフィードバック送信
   */
  submit: publicProcedure
    .input(
      z.object({
        type: z.enum(["bug", "feature", "suggestion", "other"]),
        title: z.string().min(1).max(200),
        message: z.string().min(1).max(5000),
        email: z.string().email().optional(),
      })
    )
      .mutation(async ({ input, ctx }) => {
        try {
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          
          await db.insert(feedback).values({
            id: uuidv4(),
            type: input.type,
            title: input.title,
            message: input.message,
            email: input.email || null,
            userId: ctx.user?.id || null,
            status: "new",
          });

        return {
          success: true,
          message: "フィードバックを送信しました",
        };
      } catch (error) {
        console.error("[Feedback] エラーが発生しました:", error);
        throw new Error("フィードバックの送信に失敗しました");
      }
    }),

  /**
   * フィードバック一覧取得（管理者用）
   */
  list: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
        type: z.enum(["bug", "feature", "suggestion", "other"]).optional(),
        status: z.enum(["new", "reviewing", "resolved"]).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const allFeedbacks = (await db.select().from(feedback)).sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
        );
        const filteredFeedbacks = allFeedbacks.filter((entry) =>
          (!input.type || entry.type === input.type) &&
          (!input.status || entry.status === input.status)
        );
        const feedbacks = filteredFeedbacks.slice(input.offset, input.offset + input.limit);

        return {
          success: true,
          data: feedbacks,
          total: filteredFeedbacks.length,
        };
      } catch (error) {
        console.error("[Feedback] 取得エラー:", error);
        throw new Error("フィードバックの取得に失敗しました");
      }
    }),

  /**
   * フィードバック詳細取得
   */
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const feedbackData = await db
          .select()
          .from(feedback)
          .where(eq(feedback.id, input.id))
          .limit(1);

        if (!feedbackData.length) {
          throw new Error("フィードバックが見つかりません");
        }

        return {
          success: true,
          data: feedbackData[0],
        };
      } catch (error) {
        console.error("[Feedback] 詳細取得エラー:", error);
        throw new Error("フィードバックの取得に失敗しました");
      }
    }),

  /**
   * フィードバックステータス更新（管理者用）
   */
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["new", "reviewing", "resolved"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db
          .update(feedback)
          .set({ status: input.status })
          .where(eq(feedback.id, input.id));

        return {
          success: true,
          message: "ステータスを更新しました",
        };
      } catch (error) {
        console.error("[Feedback] 更新エラー:", error);
        throw new Error("ステータスの更新に失敗しました");
      }
    }),

  /**
   * フィードバック統計取得
   */
  getStats: adminProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const allFeedbacks = await db.select().from(feedback);

      const stats = {
        total: allFeedbacks.length,
        byType: {
          bug: allFeedbacks.filter((f: any) => f.type === "bug").length,
          feature: allFeedbacks.filter((f: any) => f.type === "feature").length,
          suggestion: allFeedbacks.filter((f: any) => f.type === "suggestion").length,
          other: allFeedbacks.filter((f: any) => f.type === "other").length,
        },
        byStatus: {
          new: allFeedbacks.filter((f: any) => f.status === "new").length,
          reviewing: allFeedbacks.filter((f: any) => f.status === "reviewing").length,
          resolved: allFeedbacks.filter((f: any) => f.status === "resolved").length,
        },
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error("[Feedback] 統計取得エラー:", error);
      throw new Error("統計の取得に失敗しました");
    }
  }),
});
