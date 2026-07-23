/**
 * Analysis Router
 * Excel/PDF 解析 API
 */

import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { ExcelAnalysisManager } from './managers/ExcelAnalysisManager';
import { PDFAnalysisManager } from './managers/PDFAnalysisManager';
import { AnalysisEngine } from './managers/AnalysisEngine';

const excelManager = new ExcelAnalysisManager();
const pdfManager = new PDFAnalysisManager();
const analysisEngine = new AnalysisEngine();

export const analysisRouter = router({
  /**
   * Excel ファイルを解析
   */
  excel: publicProcedure
    .input(
      z.object({
        filePath: z.string(),
      })
    )
    .query(({ input }) => {
      const result = excelManager.parseExcel(input.filePath);
      if (!result) {
        throw new Error('Failed to parse Excel file');
      }
      return excelManager.toObject(result);
    }),

  /**
   * PDF ファイルを解析
   */
  pdf: publicProcedure
    .input(
      z.object({
        filePath: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await pdfManager.parsePDF(input.filePath);
      if (!result) {
        throw new Error('Failed to parse PDF file');
      }
      return pdfManager.toObject(result);
    }),

  /**
   * Excel データから改善報告資料を生成
   */
  generateReportFromExcel: publicProcedure
    .input(
      z.object({
        filePath: z.string(),
      })
    )
    .query(({ input }) => {
      const excelResult = excelManager.parseExcel(input.filePath);
      if (!excelResult) {
        throw new Error('Failed to parse Excel file');
      }

      const analysis = analysisEngine.analyzeExcel(excelResult);
      const presentationData = analysisEngine.generatePresentationData(analysis);

      return {
        analysis,
        presentationData,
      };
    }),

  /**
   * PDF データから改善報告資料を生成
   */
  generateReportFromPDF: publicProcedure
    .input(
      z.object({
        filePath: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const pdfResult = await pdfManager.parsePDF(input.filePath);
      if (!pdfResult) {
        throw new Error('Failed to parse PDF file');
      }

      const analysis = await analysisEngine.analyzePDF(pdfResult);
      const presentationData = analysisEngine.generatePresentationData(analysis);

      return {
        analysis,
        presentationData,
      };
    }),

  /**
   * 分析結果の統計情報を取得
   */
  getStats: publicProcedure.query(() => {
    return {
      supportedFormats: ['xlsx', 'pdf'],
      maxFileSize: '100MB',
      analysisTypes: ['Excel', 'PDF'],
    };
  }),
});
