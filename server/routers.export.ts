import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { exportHistory } from "../drizzle/schema";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";

export const exportRouter = router({
  /**
   * チャット履歴をエクスポート
   */
  chatHistory: protectedProcedure
    .input(
      z.object({
        format: z.enum(["csv", "json"]),
        limit: z.number().default(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Generate mock chat data (in real app, fetch from database)
        const chatData = [
          { id: 1, message: "こんにちは", timestamp: new Date().toISOString(), role: "user" },
          { id: 2, message: "こんにちは！何かお手伝いできることはありますか？", timestamp: new Date().toISOString(), role: "assistant" },
        ];

        let fileContent: string;
        let fileName: string;

        if (input.format === "csv") {
          // Convert to CSV
          const headers = ["ID", "メッセージ", "タイムスタンプ", "ロール"];
          const rows = chatData.map((item) =>
            [item.id, `"${item.message}"`, item.timestamp, item.role].join(",")
          );
          fileContent = [headers.join(","), ...rows].join("\n");
          fileName = `chat-history-${Date.now()}.csv`;
        } else {
          // Convert to JSON
          fileContent = JSON.stringify(chatData, null, 2);
          fileName = `chat-history-${Date.now()}.json`;
        }

        // Save export history
        const db = await getDb();
        if (db) {
          await db.insert(exportHistory).values({
            id: uuidv4(),
            userId: ctx.user.id,
            exportType: "collaboration",
            format: input.format,
            fileName,
            fileSize: Buffer.byteLength(fileContent),
            status: "completed",
          });
        }

        return {
          success: true,
          fileName,
          content: fileContent,
          format: input.format,
        };
      } catch (error) {
        console.error("[Export] チャット履歴エクスポートエラー:", error);
        throw new Error("チャット履歴のエクスポートに失敗しました");
      }
    }),

  /**
   * API統計をエクスポート
   */
  apiStatistics: protectedProcedure
    .input(
      z.object({
        format: z.enum(["csv", "json"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Generate mock API stats
        const apiStats = {
          totalRequests: 1234,
          successRate: 99.8,
          averageResponseTime: 245,
          endpoints: [
            { name: "/trpc/agent.execute", requests: 456, avgTime: 250 },
            { name: "/trpc/agent.analyzeTask", requests: 234, avgTime: 180 },
            { name: "/trpc/faceswap.swap", requests: 123, avgTime: 2500 },
            { name: "/trpc/streaming.chat", requests: 421, avgTime: 150 },
          ],
        };

        let fileContent: string;
        let fileName: string;

        if (input.format === "csv") {
          const headers = ["エンドポイント", "リクエスト数", "平均応答時間(ms)"];
          const rows = apiStats.endpoints.map((ep) =>
            [ep.name, ep.requests, ep.avgTime].join(",")
          );
          fileContent = [
            `総リクエスト数,${apiStats.totalRequests}`,
            `成功率,${apiStats.successRate}%`,
            `平均応答時間,${apiStats.averageResponseTime}ms`,
            "",
            headers.join(","),
            ...rows,
          ].join("\n");
          fileName = `api-stats-${Date.now()}.csv`;
        } else {
          fileContent = JSON.stringify(apiStats, null, 2);
          fileName = `api-stats-${Date.now()}.json`;
        }

        // Save export history
        const db = await getDb();
        if (db) {
          await db.insert(exportHistory).values({
            id: uuidv4(),
            userId: ctx.user.id,
            exportType: "api-config",
            format: input.format,
            fileName,
            fileSize: Buffer.byteLength(fileContent),
            status: "completed",
          });
        }

        return {
          success: true,
          fileName,
          content: fileContent,
          format: input.format,
        };
      } catch (error) {
        console.error("[Export] API統計エクスポートエラー:", error);
        throw new Error("API統計のエクスポートに失敗しました");
      }
    }),

  /**
   * 分析結果をエクスポート
   */
  analysisResults: protectedProcedure
    .input(
      z.object({
        format: z.enum(["csv", "json"]),
        analysisId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Generate mock analysis data
        const analysisData = {
          id: input.analysisId || uuidv4(),
          title: "タスク分析結果",
          timestamp: new Date().toISOString(),
          results: {
            complexity: "高",
            estimatedTime: "2-3時間",
            requiredTools: ["テキスト処理", "データ分析", "コード生成"],
            steps: [
              { step: 1, description: "要件分析", status: "完了" },
              { step: 2, description: "設計", status: "進行中" },
              { step: 3, description: "実装", status: "未開始" },
            ],
          },
        };

        let fileContent: string;
        let fileName: string;

        if (input.format === "csv") {
          const headers = ["ステップ", "説明", "ステータス"];
          const rows = analysisData.results.steps.map((s) =>
            [s.step, `"${s.description}"`, s.status].join(",")
          );
          fileContent = [
            `分析ID,${analysisData.id}`,
            `タイトル,${analysisData.title}`,
            `複雑度,${analysisData.results.complexity}`,
            `推定時間,${analysisData.results.estimatedTime}`,
            `必要なツール,"${analysisData.results.requiredTools.join(", ")}"`,
            "",
            headers.join(","),
            ...rows,
          ].join("\n");
          fileName = `analysis-${Date.now()}.csv`;
        } else {
          fileContent = JSON.stringify(analysisData, null, 2);
          fileName = `analysis-${Date.now()}.json`;
        }

        // Save export history
        const db = await getDb();
        if (db) {
          await db.insert(exportHistory).values({
            id: uuidv4(),
            userId: ctx.user.id,
            exportType: "analytics",
            format: input.format,
            fileName,
            fileSize: Buffer.byteLength(fileContent),
            status: "completed",
          });
        }

        return {
          success: true,
          fileName,
          content: fileContent,
          format: input.format,
        };
      } catch (error) {
        console.error("[Export] 分析結果エクスポートエラー:", error);
        throw new Error("分析結果のエクスポートに失敗しました");
      }
    }),

  /**
   * エクスポート履歴取得
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const history = await db
          .select()
          .from(exportHistory)
          .limit(input.limit)
          .offset(input.offset);

        return {
          success: true,
          data: history,
          total: history.length,
        };
      } catch (error) {
        console.error("[Export] 履歴取得エラー:", error);
        throw new Error("エクスポート履歴の取得に失敗しました");
      }
    }),
});
