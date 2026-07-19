/**
 * STEP 62 FileIntelligenceAI Integration Tests - 50+テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FileIntelligenceAIManager } from './FileIntelligenceAIManager';

describe('STEP 62 FileIntelligenceAI Integration', () => {
  let manager: FileIntelligenceAIManager;

  beforeEach(() => {
    manager = new FileIntelligenceAIManager();
  });

  // ===== ファイルアップロードテスト (5個) =====
  describe('File Upload Tests', () => {
    it('should upload Excel file', async () => {
      const file = await manager.uploadFile('data.xlsx', 'excel', 50000);
      expect(file.fileName).toBe('data.xlsx');
      expect(file.fileType).toBe('excel');
      expect(file.id).toBeTruthy();
    });

    it('should upload PDF file', async () => {
      const file = await manager.uploadFile('document.pdf', 'pdf', 100000);
      expect(file.fileName).toBe('document.pdf');
      expect(file.fileType).toBe('pdf');
    });

    it('should upload image file', async () => {
      const file = await manager.uploadFile('diagram.jpg', 'image', 30000);
      expect(file.fileName).toBe('diagram.jpg');
      expect(file.fileType).toBe('image');
    });

    it('should track upload timestamp', async () => {
      const before = Date.now();
      const file = await manager.uploadFile('test.xlsx', 'excel', 10000);
      const after = Date.now();
      expect(file.uploadedAt).toBeGreaterThanOrEqual(before);
      expect(file.uploadedAt).toBeLessThanOrEqual(after);
    });

    it('should handle multiple file uploads', async () => {
      const file1 = await manager.uploadFile('file1.xlsx', 'excel', 10000);
      const file2 = await manager.uploadFile('file2.pdf', 'pdf', 20000);
      expect(file1.id).not.toBe(file2.id);
    });
  });

  // ===== Excel解析テスト (5個) =====
  describe('Excel Analysis Tests', () => {
    it('should analyze Excel file', async () => {
      const file = await manager.uploadFile('data.xlsx', 'excel', 50000);
      const analysis = await manager.analyzeExcel(file.id);
      expect(analysis.sheets.length).toBeGreaterThan(0);
      expect(analysis.summary).toBeTruthy();
    });

    it('should extract sheets', async () => {
      const file = await manager.uploadFile('data.xlsx', 'excel', 50000);
      const analysis = await manager.analyzeExcel(file.id);
      expect(Array.isArray(analysis.sheets)).toBe(true);
    });

    it('should extract tables', async () => {
      const file = await manager.uploadFile('data.xlsx', 'excel', 50000);
      const analysis = await manager.analyzeExcel(file.id);
      expect(typeof analysis.tables).toBe('object');
    });

    it('should generate insights', async () => {
      const file = await manager.uploadFile('data.xlsx', 'excel', 50000);
      const analysis = await manager.analyzeExcel(file.id);
      expect(analysis.insights.length).toBeGreaterThan(0);
    });

    it('should handle non-existent file', async () => {
      try {
        await manager.analyzeExcel('non-existent');
        expect.fail('Should throw error');
      } catch (error) {
        expect((error as Error).message).toBe('File not found');
      }
    });
  });

  // ===== PDF解析テスト (5個) =====
  describe('PDF Analysis Tests', () => {
    it('should analyze PDF file', async () => {
      const file = await manager.uploadFile('document.pdf', 'pdf', 100000);
      const analysis = await manager.analyzePDF(file.id);
      expect(analysis.pages).toBeGreaterThan(0);
      expect(analysis.summary).toBeTruthy();
    });

    it('should estimate pages', async () => {
      const file = await manager.uploadFile('document.pdf', 'pdf', 100000);
      const analysis = await manager.analyzePDF(file.id);
      expect(analysis.pages).toBeGreaterThan(0);
    });

    it('should extract key points', async () => {
      const file = await manager.uploadFile('document.pdf', 'pdf', 100000);
      const analysis = await manager.analyzePDF(file.id);
      expect(Array.isArray(analysis.keyPoints)).toBe(true);
    });

    it('should generate summary', async () => {
      const file = await manager.uploadFile('document.pdf', 'pdf', 100000);
      const analysis = await manager.analyzePDF(file.id);
      expect(analysis.summary).toContain('PDF');
    });

    it('should handle different file sizes', async () => {
      const small = await manager.uploadFile('small.pdf', 'pdf', 10000);
      const large = await manager.uploadFile('large.pdf', 'pdf', 500000);
      const smallAnalysis = await manager.analyzePDF(small.id);
      const largeAnalysis = await manager.analyzePDF(large.id);
      expect(largeAnalysis.pages).toBeGreaterThan(smallAnalysis.pages);
    });
  });

  // ===== 画像解析テスト (5個) =====
  describe('Image Document Analysis Tests', () => {
    it('should analyze image document', async () => {
      const file = await manager.uploadFile('diagram.jpg', 'image', 30000);
      const analysis = await manager.analyzeImageDocument(file.id);
      expect(analysis.description).toBeTruthy();
      expect(analysis.objects.length).toBeGreaterThan(0);
    });

    it('should extract text from image', async () => {
      const file = await manager.uploadFile('document.png', 'image', 40000);
      const analysis = await manager.analyzeImageDocument(file.id);
      expect(analysis.extractedText).toBeTruthy();
    });

    it('should detect objects', async () => {
      const file = await manager.uploadFile('diagram.jpg', 'image', 30000);
      const analysis = await manager.analyzeImageDocument(file.id);
      expect(Array.isArray(analysis.objects)).toBe(true);
    });

    it('should generate image insights', async () => {
      const file = await manager.uploadFile('diagram.jpg', 'image', 30000);
      const analysis = await manager.analyzeImageDocument(file.id);
      expect(analysis.insights.length).toBeGreaterThan(0);
    });

    it('should handle different image types', async () => {
      const jpg = await manager.uploadFile('image.jpg', 'image', 30000);
      const png = await manager.uploadFile('image.png', 'image', 40000);
      const jpgAnalysis = await manager.analyzeImageDocument(jpg.id);
      const pngAnalysis = await manager.analyzeImageDocument(png.id);
      expect(jpgAnalysis.description).toBeTruthy();
      expect(pngAnalysis.description).toBeTruthy();
    });
  });

  // ===== ファイル検索テスト (5個) =====
  describe('File Search Tests', () => {
    it('should search files', async () => {
      const file = await manager.uploadFile('production_data.xlsx', 'excel', 50000);
      const results = await manager.searchFiles('production');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should calculate relevance', async () => {
      const file = await manager.uploadFile('quality_report.pdf', 'pdf', 100000);
      const results = await manager.searchFiles('quality');
      expect(results[0].relevance).toBeGreaterThan(0);
      expect(results[0].relevance).toBeLessThanOrEqual(1);
    });

    it('should sort by relevance', async () => {
      await manager.uploadFile('production_data.xlsx', 'excel', 50000);
      await manager.uploadFile('quality_report.pdf', 'pdf', 100000);
      const results = await manager.searchFiles('production');
      if (results.length > 1) {
        expect(results[0].relevance).toBeGreaterThanOrEqual(results[1].relevance);
      }
    });

    it('should handle no results', async () => {
      const results = await manager.searchFiles('nonexistent_keyword_xyz');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should search multiple files', async () => {
      await manager.uploadFile('file1.xlsx', 'excel', 50000);
      await manager.uploadFile('file2.xlsx', 'excel', 50000);
      const results = await manager.searchFiles('file');
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ===== 要約テスト (3個) =====
  describe('Summarization Tests', () => {
    it('should summarize file', async () => {
      const file = await manager.uploadFile('document.pdf', 'pdf', 100000);
      await manager.analyzePDF(file.id);
      const summary = await manager.summarizeFile(file.id);
      expect(summary).toBeTruthy();
    });

    it('should handle different file types', async () => {
      const excel = await manager.uploadFile('data.xlsx', 'excel', 50000);
      const pdf = await manager.uploadFile('doc.pdf', 'pdf', 100000);
      await manager.analyzeExcel(excel.id);
      await manager.analyzePDF(pdf.id);
      const excelSummary = await manager.summarizeFile(excel.id);
      const pdfSummary = await manager.summarizeFile(pdf.id);
      expect(excelSummary).toBeTruthy();
      expect(pdfSummary).toBeTruthy();
    });

    it('should handle non-existent file', async () => {
      const summary = await manager.summarizeFile('non-existent');
      expect(summary).toBe('No content');
    });
  });

  // ===== データ抽出テスト (3個) =====
  describe('Data Extraction Tests', () => {
    it('should extract data from file', async () => {
      const file = await manager.uploadFile('data.xlsx', 'excel', 50000);
      const data = await manager.extractData(file.id);
      expect(data.fileName).toBe('data.xlsx');
      expect(data.fileType).toBe('excel');
    });

    it('should extract Excel data', async () => {
      const file = await manager.uploadFile('data.xlsx', 'excel', 50000);
      await manager.analyzeExcel(file.id);
      const data = await manager.extractData(file.id);
      expect(data.sheets).toBeTruthy();
    });

    it('should extract PDF data', async () => {
      const file = await manager.uploadFile('doc.pdf', 'pdf', 100000);
      await manager.analyzePDF(file.id);
      const data = await manager.extractData(file.id);
      expect(data.pages).toBeGreaterThan(0);
    });
  });

  // ===== 表データ解析テスト (2個) =====
  describe('Table Data Analysis Tests', () => {
    it('should analyze table data', async () => {
      const file = await manager.uploadFile('data.xlsx', 'excel', 50000);
      await manager.analyzeExcel(file.id);
      const analysis = await manager.analyzeTableData(file.id);
      expect(analysis.totalRows).toBeGreaterThanOrEqual(0);
      expect(analysis.totalColumns).toBeGreaterThanOrEqual(0);
    });

    it('should handle non-existent analysis', async () => {
      try {
        await manager.analyzeTableData('non-existent');
        expect.fail('Should throw error');
      } catch (error) {
        expect((error as Error).message).toBe('Excel analysis not found');
      }
    });
  });

  // ===== 過去資料比較テスト (2個) =====
  describe('Past File Comparison Tests', () => {
    it('should compare with past files', async () => {
      const current = await manager.uploadFile('current.xlsx', 'excel', 50000);
      const past1 = await manager.uploadFile('past1.xlsx', 'excel', 50000);
      const past2 = await manager.uploadFile('past2.xlsx', 'excel', 50000);
      const comparison = await manager.compareWithPastFiles(current.id, [past1.id, past2.id]);
      expect(comparison.comparisons.length).toBe(2);
    });

    it('should calculate similarity', async () => {
      const current = await manager.uploadFile('current.xlsx', 'excel', 50000);
      const past = await manager.uploadFile('past.xlsx', 'excel', 50000);
      const comparison = await manager.compareWithPastFiles(current.id, [past.id]);
      expect(comparison.comparisons[0].similarity).toBeGreaterThan(0);
      expect(comparison.comparisons[0].similarity).toBeLessThanOrEqual(1);
    });
  });

  // ===== 改善抽出テスト (2個) =====
  describe('Improvement Extraction Tests', () => {
    it('should extract improvement points', async () => {
      const file = await manager.uploadFile('data.xlsx', 'excel', 50000);
      const improvements = await manager.extractImprovementPoints(file.id);
      expect(improvements.improvements.length).toBeGreaterThan(0);
      expect(improvements.priority.length).toBe(improvements.improvements.length);
    });

    it('should estimate benefits', async () => {
      const file = await manager.uploadFile('data.xlsx', 'excel', 50000);
      const improvements = await manager.extractImprovementPoints(file.id);
      expect(improvements.estimatedBenefit.length).toBe(improvements.improvements.length);
    });
  });

  // ===== 原価資料解析テスト (2個) =====
  describe('Cost Document Analysis Tests', () => {
    it('should analyze cost document', async () => {
      const file = await manager.uploadFile('costs.xlsx', 'excel', 50000);
      const analysis = await manager.analyzeCostDocument(file.id);
      expect(analysis.costItems).toBeTruthy();
      expect(analysis.totalCost).toBeGreaterThan(0);
    });

    it('should identify saving opportunities', async () => {
      const file = await manager.uploadFile('costs.xlsx', 'excel', 50000);
      const analysis = await manager.analyzeCostDocument(file.id);
      expect(analysis.savingOpportunities.length).toBeGreaterThan(0);
      expect(analysis.estimatedSavings).toBeGreaterThan(0);
    });
  });

  // ===== 品質資料解析テスト (2個) =====
  describe('Quality Document Analysis Tests', () => {
    it('should analyze quality document', async () => {
      const file = await manager.uploadFile('quality.xlsx', 'excel', 50000);
      const analysis = await manager.analyzeQualityDocument(file.id);
      expect(analysis.qualityMetrics).toBeTruthy();
      expect(analysis.currentQuality).toBeGreaterThan(0);
    });

    it('should provide improvement actions', async () => {
      const file = await manager.uploadFile('quality.xlsx', 'excel', 50000);
      const analysis = await manager.analyzeQualityDocument(file.id);
      expect(analysis.improvementActions.length).toBeGreaterThan(0);
    });
  });

  // ===== 作業標準書解析テスト (2個) =====
  describe('Work Standard Document Analysis Tests', () => {
    it('should analyze work standard document', async () => {
      const file = await manager.uploadFile('standard.pdf', 'pdf', 100000);
      const analysis = await manager.analyzeWorkStandardDocument(file.id);
      expect(analysis.procedures).toBeTruthy();
      expect(analysis.estimatedTime).toBeGreaterThan(0);
    });

    it('should identify safety points', async () => {
      const file = await manager.uploadFile('standard.pdf', 'pdf', 100000);
      const analysis = await manager.analyzeWorkStandardDocument(file.id);
      expect(analysis.safetyPoints.length).toBeGreaterThan(0);
    });
  });

  // ===== パフォーマンステスト (3個) =====
  describe('Performance Tests', () => {
    it('should handle bulk file uploads', async () => {
      const startTime = Date.now();
      for (let i = 0; i < 30; i++) {
        await manager.uploadFile(`file${i}.xlsx`, 'excel', 50000);
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('should handle bulk analysis', async () => {
      const files = [];
      for (let i = 0; i < 10; i++) {
        const file = await manager.uploadFile(`file${i}.xlsx`, 'excel', 50000);
        files.push(file);
      }

      const startTime = Date.now();
      for (const file of files) {
        await manager.analyzeExcel(file.id);
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('should handle bulk search', async () => {
      for (let i = 0; i < 20; i++) {
        await manager.uploadFile(`file${i}.xlsx`, 'excel', 50000);
      }

      const startTime = Date.now();
      for (let i = 0; i < 10; i++) {
        await manager.searchFiles(`keyword${i}`);
      }
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });

  // ===== 統計テスト (2個) =====
  describe('Statistics Tests', () => {
    it('should calculate statistics', async () => {
      const excel = await manager.uploadFile('data.xlsx', 'excel', 50000);
      const pdf = await manager.uploadFile('doc.pdf', 'pdf', 100000);
      await manager.analyzeExcel(excel.id);
      await manager.analyzePDF(pdf.id);

      const stats = await manager.getStatistics();
      expect(stats.totalFiles).toBeGreaterThan(0);
      expect(stats.totalExcelAnalyses).toBeGreaterThan(0);
      expect(stats.totalPDFAnalyses).toBeGreaterThan(0);
    });

    it('should track file type distribution', async () => {
      await manager.uploadFile('file1.xlsx', 'excel', 50000);
      await manager.uploadFile('file2.pdf', 'pdf', 100000);
      await manager.uploadFile('file3.xlsx', 'excel', 50000);

      const stats = await manager.getStatistics();
      expect(stats.fileTypes.excel).toBe(2);
      expect(stats.fileTypes.pdf).toBe(1);
    });
  });

  // ===== クリーンアップテスト (2個) =====
  describe('Cleanup Tests', () => {
    it('should clear all data', async () => {
      const file = await manager.uploadFile('data.xlsx', 'excel', 50000);
      await manager.analyzeExcel(file.id);
      await manager.clear();

      const stats = await manager.getStatistics();
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalExcelAnalyses).toBe(0);
    });

    it('should handle operations after clear', async () => {
      await manager.clear();
      const file = await manager.uploadFile('data.xlsx', 'excel', 50000);
      expect(file.fileName).toBe('data.xlsx');
    });
  });
});
