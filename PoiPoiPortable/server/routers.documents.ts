import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  generateExcelWithAI,
  generatePowerPointWithAI,
  generateWordWithAI,
  generateBatchDocuments,
} from "./_core/documentGeneration";

export const documentRouter = router({
  /**
   * AI生成Excel作成
   */
  generateExcel: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "タイトルは必須です"),
        description: z.string().min(1, "説明は必須です"),
        dataType: z.enum(["sales", "analytics", "report", "inventory", "custom"]),
        rows: z.number().optional(),
        columns: z.number().optional(),
        aiPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await generateExcelWithAI(input);
        return {
          success: true,
          data: result,
          message: "Excelファイルを生成しました",
        };
      } catch (error) {
        throw new Error(`Excel生成エラー: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),

  /**
   * AI生成PowerPoint作成
   */
  generatePowerPoint: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "タイトルは必須です"),
        description: z.string().min(1, "説明は必須です"),
        slides: z.number().optional(),
        theme: z.enum(["professional", "creative", "minimal", "colorful"]).optional(),
        aiPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await generatePowerPointWithAI(input);
        return {
          success: true,
          data: result,
          message: "PowerPointファイルを生成しました",
        };
      } catch (error) {
        throw new Error(
          `PowerPoint生成エラー: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * AI生成Word作成
   */
  generateWord: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "タイトルは必須です"),
        description: z.string().min(1, "説明は必須です"),
        sections: z.number().optional(),
        includeTableOfContents: z.boolean().optional(),
        aiPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await generateWordWithAI(input);
        return {
          success: true,
          data: result,
          message: "Wordファイルを生成しました",
        };
      } catch (error) {
        throw new Error(
          `Word生成エラー: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * 複数形式のドキュメント一括生成
   */
  generateBatch: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "タイトルは必須です"),
        description: z.string().min(1, "説明は必須です"),
        formats: z.array(z.enum(["excel", "powerpoint", "word"])).min(1),
        aiPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await generateBatchDocuments(input);
        return {
          success: true,
          data: result,
          message: `${input.formats.length}個のドキュメントを生成しました`,
        };
      } catch (error) {
        throw new Error(
          `バッチ生成エラー: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),
});
